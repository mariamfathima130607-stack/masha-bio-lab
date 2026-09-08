import { useState } from 'react'
import { fetchAnalytics } from '../api/client'
import { BarChart2, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts'

const CHART_BG = '#131c2e'
const CYAN     = '#22d3ee'
const VIOLET   = '#6366f1'
const EMERALD  = '#10b981'
const AMBER    = '#f59e0b'

const TooltipStyle = {
  contentStyle: { background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const datasetId = localStorage.getItem('dataset_id') ?? ''

  const load = async () => {
    if (!datasetId) { setError('No dataset uploaded.'); return }
    setLoading(true); setError('')
    try {
      const r = await fetchAnalytics(datasetId)
      setData(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Analytics failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><BarChart2 size={16} color="var(--cyan)" /></div>
          Analytics
        </h1>
        <p className="section-desc">Visual exploratory data analysis of your drug–cell dataset</p>
      </div>

      <div className="flex items-center gap-12 mb-24">
        <button className="btn btn-primary" onClick={load} disabled={loading || !datasetId}>
          {loading ? <><span className="spinner" style={{width:14,height:14}} /> Loading…</> : <><RefreshCw size={14} /> Load Analytics</>}
        </button>
        {!datasetId && <span className="text-sm text-muted">Upload a dataset first</span>}
      </div>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {data && (
        <>
          {/* Summary Stats */}
          <div className="stat-grid mb-24">
            <div className="glass-card">
              <div className="card-title">Total Rows</div>
              <div className="card-value">{data.rows.toLocaleString()}</div>
            </div>
            <div className="glass-card">
              <div className="card-title">Columns</div>
              <div className="card-value">{data.columns}</div>
            </div>
            {Object.entries(data.numeric_summary).slice(0, 2).map(([col, stats]: any) => (
              <div key={col} className="glass-card">
                <div className="card-title">{col} — Mean</div>
                <div className="card-value">{stats.mean}</div>
                <div className="card-sub">Median: {stats.median} · Std: {stats.std}</div>
              </div>
            ))}
          </div>

          <div className="grid-2 mb-24">
            {/* IC50 Histogram */}
            {data.ic50_distribution?.length > 0 && (
              <div className="glass-card">
                <div className="card-title mb-16">IC50 Distribution</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ic50_distribution} style={{ background: CHART_BG }} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="bin" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(1)} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'Count']} />
                    <Bar dataKey="count" fill={CYAN} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AUC Boxplot-like */}
            {data.auc_boxplot?.median !== undefined && (
              <div className="glass-card">
                <div className="card-title mb-16">AUC Statistics</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
                  {[
                    { label: 'Min', value: data.auc_boxplot.min, color: '#f43f5e' },
                    { label: 'Q1 (25%)', value: data.auc_boxplot.q1, color: VIOLET },
                    { label: 'Median', value: data.auc_boxplot.median, color: CYAN },
                    { label: 'Q3 (75%)', value: data.auc_boxplot.q3, color: VIOLET },
                    { label: 'Max', value: data.auc_boxplot.max, color: EMERALD },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-12">
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 70 }}>{item.label}</span>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, ((item.value - data.auc_boxplot.min) / (data.auc_boxplot.max - data.auc_boxplot.min + 0.001)) * 100)}%`,
                          background: item.color,
                          borderRadius: 4,
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: item.color, minWidth: 50, textAlign: 'right' }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid-2 mb-24">
            {/* Top Sensitive Drugs */}
            {data.top_sensitive_drugs?.length > 0 && (
              <div className="glass-card">
                <div className="card-title mb-16">Top 10 Most Sensitive Drugs (lowest IC50)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.top_sensitive_drugs} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis dataKey="drug" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={80} />
                    <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'Median IC50']} />
                    <Bar dataKey="median_ic50" radius={[0,3,3,0]}>
                      {data.top_sensitive_drugs.map((_: any, i: number) => (
                        <Cell key={i} fill={i % 2 === 0 ? EMERALD : CYAN} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Resistant Cell Lines */}
            {data.top_resistant_cells?.length > 0 && (
              <div className="glass-card">
                <div className="card-title mb-16">Top 10 Resistant Cell Lines (highest IC50)</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.top_resistant_cells} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis dataKey="cell_line" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} width={80} />
                    <Tooltip {...TooltipStyle} formatter={(v: any) => [v, 'Median IC50']} />
                    <Bar dataKey="median_ic50" radius={[0,3,3,0]}>
                      {data.top_resistant_cells.map((_: any, i: number) => (
                        <Cell key={i} fill={i % 2 === 0 ? VIOLET : AMBER} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Correlation Heatmap */}
          {data.correlation?.length > 0 && (
            <div className="glass-card">
              <div className="card-title mb-16">Correlation Heatmap (numeric columns)</div>
              <CorrelationHeatmap data={data.correlation} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CorrelationHeatmap({ data }: { data: any[] }) {
  const rows = [...new Set(data.map(d => d.row))]
  const cols = [...new Set(data.map(d => d.col))]
  const lookup: Record<string, number> = {}
  data.forEach(d => { lookup[`${d.row}::${d.col}`] = d.value })

  const colorScale = (v: number) => {
    const clamped = Math.max(-1, Math.min(1, v))
    if (clamped > 0) return `rgba(34,211,238,${clamped.toFixed(2)})`
    return `rgba(99,102,241,${Math.abs(clamped).toFixed(2)})`
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ padding: 6, color: 'var(--text-muted)' }}></th>
            {cols.map(c => <th key={c} style={{ padding: '4px 6px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r}>
              <td style={{ padding: '4px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r}</td>
              {cols.map(c => {
                const v = lookup[`${r}::${c}`] ?? 0
                return (
                  <td key={c} style={{
                    padding: '6px 8px', textAlign: 'center',
                    background: colorScale(v),
                    color: Math.abs(v) > 0.4 ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600, borderRadius: 4, minWidth: 50,
                  }}>{v.toFixed(2)}</td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
