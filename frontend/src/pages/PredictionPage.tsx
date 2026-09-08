import { useState } from 'react'
import { runPrediction } from '../api/client'
import { Zap, TrendingDown } from 'lucide-react'

export default function PredictionPage() {
  const [drugName, setDrugName] = useState('')
  const [cellLine, setCellLine] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const datasetId = localStorage.getItem('dataset_id') ?? ''

  const run = async () => {
    if (!datasetId) { setError('No dataset uploaded.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await runPrediction(datasetId, {
        drug_name: drugName || undefined,
        cell_line: cellLine || undefined,
      })
      setResult(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Prediction failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Zap size={16} color="var(--cyan)" /></div>
          Prediction
        </h1>
        <p className="section-desc">Run inference to predict drug–cell response values</p>
      </div>

      <div className="callout warning mb-24">
        <div className="callout-body">
          ⚠ Predictions use the most recently trained model. Train a model first if you haven't already.
        </div>
      </div>

      <div className="glass-card mb-24">
        <div className="card-title mb-16">Input Parameters</div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Drug Name</label>
            <input className="form-input" placeholder="e.g. Erlotinib" value={drugName}
              onChange={e => setDrugName(e.target.value)} />
            <span className="text-xs text-muted">Must match a drug in the dataset (used for one-hot lookup)</span>
          </div>
          <div className="form-group">
            <label className="form-label">Cell Line</label>
            <input className="form-input" placeholder="e.g. MCF7" value={cellLine}
              onChange={e => setCellLine(e.target.value)} />
            <span className="text-xs text-muted">Must match a cell line in the dataset</span>
          </div>
        </div>
        <button className="btn btn-primary mt-16" onClick={run} disabled={loading || !datasetId}>
          {loading ? <><span className="spinner" style={{width:14,height:14}} /> Predicting…</> : <><Zap size={14} /> Predict</>}
        </button>
      </div>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {result && (
        <>
          <div className="glass-card mb-24">
            <div className="card-title mb-16"><Zap size={14} color="var(--cyan)" /> Prediction Result</div>
            <div className="grid-3">
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="text-muted text-sm mb-4">Predicted {result.target?.toUpperCase()}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--cyan)' }}>{result.prediction}</div>
                <div className="text-xs text-muted mt-4">{result.target}</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="text-muted text-sm mb-4">Confidence Low</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--violet)' }}>{result.confidence_low}</div>
                <div className="text-xs text-muted mt-4">−10% range</div>
              </div>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <div className="text-muted text-sm mb-4">Confidence High</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--violet)' }}>{result.confidence_high}</div>
                <div className="text-xs text-muted mt-4">+10% range</div>
              </div>
            </div>
            <hr className="divider" />
            <div className="text-sm text-muted">
              Drug: <span className="text-cyan">{result.drug_name || '—'}</span> ·{' '}
              Cell Line: <span className="text-cyan">{result.cell_line || '—'}</span> ·{' '}
              Model: <span className="font-mono text-sm">{result.model_id}</span>
            </div>
            <div className="callout warning mt-12" style={{ padding: '10px 14px' }}>
              <div className="callout-body" style={{ fontSize: 11 }}>{result.note}</div>
            </div>
          </div>

          {result.top_sensitive_cell_lines?.length > 0 && (
            <div className="glass-card">
              <div className="card-title mb-16">
                <TrendingDown size={14} color="var(--emerald)" /> Top 5 Most Sensitive Cell Lines (Lowest IC50)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.top_sensitive_cell_lines.map((cl: any, i: number) => (
                  <div key={i} className="flex items-center gap-12"
                    style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--emerald)', minWidth: 20 }}>#{i+1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{cl.cell_line}</span>
                    <span className="badge badge-emerald">IC50: {cl.median_ic50}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
