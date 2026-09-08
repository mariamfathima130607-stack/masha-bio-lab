import { useState } from 'react'
import { cleanDataset } from '../api/client'
import { Sparkles, CheckCircle2 } from 'lucide-react'

export default function CleaningPage() {
  const [strategy, setStrategy] = useState('drop')
  const [removeOutliers, setRemoveOutliers] = useState(false)
  const [outlierStd, setOutlierStd] = useState(3.0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const datasetId = localStorage.getItem('dataset_id') ?? ''

  const run = async () => {
    if (!datasetId) { setError('No dataset uploaded.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await cleanDataset(datasetId, { strategy, remove_outliers: removeOutliers, outlier_std: outlierStd })
      setResult(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Cleaning failed')
    } finally { setLoading(false) }
  }

  const strategies = [
    { value: 'drop',          label: 'Drop NaN Rows',    desc: 'Remove all rows with any missing value' },
    { value: 'impute_median', label: 'Impute Median',    desc: 'Fill missing values with column median' },
    { value: 'impute_mean',   label: 'Impute Mean',      desc: 'Fill missing values with column mean' },
  ]

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Sparkles size={16} color="var(--cyan)" /></div>
          Data Cleaning
        </h1>
        <p className="section-desc">Handle missing values and remove outliers from your dataset</p>
      </div>

      <div className="glass-card mb-24">
        <div className="card-title mb-16">Missing Value Strategy</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {strategies.map(s => (
            <label key={s.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
              onClick={() => setStrategy(s.value)}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                borderColor: strategy === s.value ? 'var(--cyan)' : 'var(--border-subtle)',
                background: strategy === s.value ? 'var(--cyan)' : 'transparent',
                flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {strategy === s.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a1628' }} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: strategy === s.value ? 'var(--cyan)' : 'var(--text-primary)' }}>
                  {s.label}
                </div>
                <div className="text-sm text-muted">{s.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="glass-card mb-24">
        <div className="card-title mb-12">Outlier Removal</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={removeOutliers} onChange={e => setRemoveOutliers(e.target.checked)}
            style={{ accentColor: 'var(--cyan)', width: 16, height: 16 }} />
          <span className="text-sm">Enable outlier removal (Z-score threshold)</span>
        </label>
        {removeOutliers && (
          <div className="form-group mt-12" style={{ maxWidth: 240 }}>
            <label className="form-label">Std Dev Threshold</label>
            <input type="number" className="form-input" value={outlierStd} min={1} max={10} step={0.5}
              onChange={e => setOutlierStd(Number(e.target.value))} />
            <span className="text-xs text-muted">Rows beyond ±{outlierStd}σ removed</span>
          </div>
        )}
      </div>

      <button className="btn btn-primary mb-24" onClick={run} disabled={loading || !datasetId}>
        {loading ? <><span className="spinner" style={{width:14,height:14}} /> Cleaning…</> : <><Sparkles size={14} /> Run Cleaning</>}
      </button>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {result && (
        <div className="glass-card">
          <div className="card-title mb-16"><CheckCircle2 size={14} color="var(--emerald)" /> Cleaning Complete</div>
          <div className="grid-3">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div className="text-muted text-sm mb-4">Rows Removed</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--rose)' }}>
                {result.rows_removed.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div className="text-muted text-sm mb-4">Missing Fixed</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--emerald)' }}>
                {result.missing_fixed.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div className="text-muted text-sm mb-4">Remaining Rows</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--cyan)' }}>
                {result.after.rows.toLocaleString()}
              </div>
            </div>
          </div>
          <hr className="divider" />
          <div className="grid-2">
            <div>
              <div className="text-sm text-muted mb-8">Before Cleaning</div>
              <div className="text-sm">Rows: {result.before.rows.toLocaleString()}</div>
              <div className="text-sm">Missing: <span className="text-amber">{result.before.missing.toLocaleString()}</span></div>
            </div>
            <div>
              <div className="text-sm text-muted mb-8">After Cleaning</div>
              <div className="text-sm">Rows: {result.after.rows.toLocaleString()}</div>
              <div className="text-sm">Missing: <span className="text-emerald">{result.after.missing.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
