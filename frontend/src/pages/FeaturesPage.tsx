import { useState } from 'react'
import { engineerFeatures } from '../api/client'
import { Wrench, CheckCircle2 } from 'lucide-react'

export default function FeaturesPage() {
  const [opts, setOpts] = useState({
    log_transform_ic50: true,
    interaction_terms: false,
    one_hot_drug: true,
    one_hot_cell: true,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const datasetId = localStorage.getItem('dataset_id') ?? ''

  const toggle = (key: string) => setOpts(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))

  const run = async () => {
    if (!datasetId) { setError('No dataset uploaded.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await engineerFeatures(datasetId, opts)
      setResult(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Feature engineering failed')
    } finally { setLoading(false) }
  }

  const features = [
    { key: 'log_transform_ic50', label: 'Log-Transform IC50', desc: 'Apply log1p(IC50) to reduce skewness and normalize distribution.' },
    { key: 'one_hot_drug',       label: 'One-Hot Encode Drugs', desc: 'Create binary columns for each unique drug name (≤500 unique values).' },
    { key: 'one_hot_cell',       label: 'One-Hot Encode Cell Lines', desc: 'Create binary columns for each cell line identifier (≤500 unique values).' },
    { key: 'interaction_terms',  label: 'Interaction Terms', desc: 'Create pairwise product features from the top-5 numeric columns.' },
  ]

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Wrench size={16} color="var(--cyan)" /></div>
          Feature Engineering
        </h1>
        <p className="section-desc">Build drug and cell-line features for machine learning</p>
      </div>

      <div className="glass-card mb-24">
        <div className="card-title mb-16">Select Transformations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {features.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}
              onClick={() => toggle(f.key)}>
              <div style={{
                width: 20, height: 20, border: '2px solid',
                borderColor: opts[f.key as keyof typeof opts] ? 'var(--cyan)' : 'var(--border-subtle)',
                background: opts[f.key as keyof typeof opts] ? 'var(--cyan)' : 'transparent',
                borderRadius: 5, flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {opts[f.key as keyof typeof opts] && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L4 7L9 1" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: opts[f.key as keyof typeof opts] ? 'var(--cyan)' : 'var(--text-primary)' }}>
                  {f.label}
                </div>
                <div className="text-sm text-muted mt-4">{f.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button className="btn btn-primary mb-24" onClick={run} disabled={loading || !datasetId}>
        {loading ? <><span className="spinner" style={{width:14,height:14}} /> Engineering…</> : <><Wrench size={14} /> Run Feature Engineering</>}
      </button>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {result && (
        <div className="glass-card">
          <div className="card-title mb-16"><CheckCircle2 size={14} color="var(--emerald)" /> Features Created Successfully</div>
          <div className="grid-3 mb-16">
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div className="text-muted text-sm mb-4">Original Columns</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-secondary)' }}>{result.original_columns}</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div className="text-muted text-sm mb-4">New Columns</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--cyan)' }}>{result.new_columns}</div>
            </div>
            <div className="glass-card" style={{ textAlign: 'center' }}>
              <div className="text-muted text-sm mb-4">Features Added</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--emerald)' }}>+{result.features_added}</div>
            </div>
          </div>
          <div className="text-sm text-muted">
            Saved to: <span className="text-cyan font-mono">{result.engineered_file}</span>
          </div>
          <hr className="divider" />
          <div className="card-title mb-8">Applied Transformations</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(result.transformations).filter(([,v]) => v).map(([k]) => (
              <span key={k} className="badge badge-emerald">✓ {k.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
