import { useState } from 'react'
import { fetchSHAP } from '../api/client'
import { FlaskConical, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const TooltipStyle = {
  contentStyle: { background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 12 },
}

export default function ExplainabilityPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shapOpen, setShapOpen] = useState(false)
  const modelId = localStorage.getItem('model_id') ?? ''

  const load = async () => {
    if (!modelId) { setError('No trained model found. Train a model first.'); return }
    setLoading(true); setError('')
    try {
      const r = await fetchSHAP(modelId)
      setData(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'SHAP computation failed')
    } finally { setLoading(false) }
  }

  const COLORS = ['#22d3ee','#6366f1','#10b981','#f59e0b','#f43f5e',
                  '#8b5cf6','#06b6d4','#84cc16','#fb923c','#ec4899',
                  '#14b8a6','#a78bfa','#34d399','#fbbf24','#60a5fa',
                  '#c084fc','#4ade80','#facc15','#38bdf8','#fb7185']

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><FlaskConical size={16} color="var(--cyan)" /></div>
          Explainability
        </h1>
        <p className="section-desc">SHAP feature importance analysis for the trained model</p>
      </div>

      <div className="flex items-center gap-12 mb-24">
        <button className="btn btn-primary" onClick={load} disabled={loading || !modelId}>
          {loading ? <><span className="spinner" style={{width:14,height:14}} /> Computing…</> : <><RefreshCw size={14} /> Compute SHAP</>}
        </button>
        {!modelId && <span className="text-sm text-muted">Train a model first</span>}
      </div>

      {/* What is SHAP? collapsible */}
      <div className="glass-card mb-24">
        <div className="collapsible-trigger" onClick={() => setShapOpen(o => !o)}>
          <span>📘 What is SHAP?</span>
          {shapOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
        {shapOpen && (
          <div className="mt-12" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p><strong style={{ color: 'var(--cyan)' }}>SHAP</strong> (SHapley Additive exPlanations) is a method from game theory that explains the output of any machine learning model.</p>
            <p className="mt-8">Each feature receives a SHAP value representing its <em>average marginal contribution</em> to the model's predictions. Larger absolute values mean the feature has more influence.</p>
            <p className="mt-8"><strong style={{ color: 'var(--violet)' }}>Mean |SHAP|</strong> — The chart shows the mean absolute SHAP value per feature across the test set. This ranks features by overall importance regardless of direction.</p>
          </div>
        )}
      </div>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {data && data.feature_importances?.length > 0 && (
        <>
          <div className="glass-card mb-24">
            <div className="card-title mb-4">
              Top {data.feature_importances.length} Feature Importances
            </div>
            <div className="text-sm text-muted mb-16">Target: <span className="text-cyan">{data.target}</span></div>
            <ResponsiveContainer width="100%" height={data.feature_importances.length * 32 + 40}>
              <BarChart
                data={[...data.feature_importances].reverse()}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 160 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis dataKey="feature" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={160} />
                <Tooltip {...TooltipStyle} formatter={(v: any) => [Number(v).toFixed(6), 'Mean |SHAP|']} />
                <Bar dataKey="importance" radius={[0,4,4,0]}>
                  {[...data.feature_importances].reverse().map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card">
            <div className="card-title mb-12">Feature Importance Table</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Feature</th>
                    <th>Mean |SHAP|</th>
                    <th>Relative Importance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.feature_importances.map((f: any, i: number) => {
                    const maxVal = data.feature_importances[0].importance
                    const pct = (f.importance / maxVal * 100).toFixed(1)
                    return (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>{i+1}</td>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace', color: COLORS[i % COLORS.length] }}>{f.feature}</td>
                        <td>{f.importance.toFixed(6)}</td>
                        <td>
                          <div className="flex items-center gap-8">
                            <div className="progress-bar-wrap" style={{ flex: 1 }}>
                              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-muted">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-muted mt-8">{data.note}</div>
          </div>
        </>
      )}
    </div>
  )
}
