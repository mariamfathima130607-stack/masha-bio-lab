import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trainModel } from '../api/client'
import { Brain, ChevronRight, AlertTriangle } from 'lucide-react'

function R2Color(r2: number) {
  if (r2 >= 0.7) return 'var(--emerald)'
  if (r2 >= 0.4) return 'var(--amber)'
  return 'var(--rose)'
}

function R2Interpretation(r2: number) {
  if (r2 >= 0.85) return 'Excellent model fit. The model explains most variance in the target. (Note: may indicate data leakage with random split.)'
  if (r2 >= 0.7)  return 'Good model fit. The model captures a strong signal in the data.'
  if (r2 >= 0.4)  return 'Moderate fit. The model explains some variance but may need more features.'
  return 'Poor fit. The model struggles with this target. Try feature engineering or a different target column.'
}

export default function TrainingPage() {
  const [target, setTarget] = useState('ic50')
  const [modelType, setModelType] = useState('rf')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const datasetId = localStorage.getItem('dataset_id') ?? ''

  const run = async () => {
    if (!datasetId) { setError('No dataset uploaded.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await trainModel(datasetId, target, modelType)
      setResult(r.data)
      localStorage.setItem('model_id', r.data.model_id)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Training failed')
    } finally { setLoading(false) }
  }

  const targets   = [{ v: 'ic50', l: 'IC50' }, { v: 'auc', l: 'AUC' }, { v: 'response', l: 'Response / Viability' }]
  const modelTypes = [{ v: 'rf', l: 'Random Forest' }, { v: 'xgb', l: 'XGBoost' }]

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Brain size={16} color="var(--cyan)" /></div>
          Model Training
        </h1>
        <p className="section-desc">Train a regression model to predict drug–cell response metrics</p>
      </div>

      <div className="callout warning mb-24">
        <div className="callout-title flex items-center gap-8"><AlertTriangle size={14} /> Data Leakage Notice</div>
        <div className="callout-body">
          This platform uses a <strong>random 80/20 train-test split</strong>. In real drug discovery, 
          you would split by drug or cell line to avoid leakage. Very high R² values may reflect 
          memorization, not generalization.
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="glass-card">
          <div className="card-title mb-12">Target Variable</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {targets.map(t => (
              <button key={t.v} className={`radio-btn${target === t.v ? ' selected' : ''}`} onClick={() => setTarget(t.v)}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid', borderColor: target === t.v ? 'var(--cyan)' : 'var(--text-muted)', background: target === t.v ? 'var(--cyan)' : 'transparent' }} />
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="card-title mb-12">Model Type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modelTypes.map(m => (
              <button key={m.v} className={`radio-btn${modelType === m.v ? ' selected' : ''}`} onClick={() => setModelType(m.v)}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid', borderColor: modelType === m.v ? 'var(--cyan)' : 'var(--text-muted)', background: modelType === m.v ? 'var(--cyan)' : 'transparent' }} />
                {m.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn btn-primary mb-24" onClick={run} disabled={loading || !datasetId} style={{ minWidth: 180 }}>
        {loading
          ? <><span className="spinner" style={{width:14,height:14}} /> Training… (may take 30–120s)</>
          : <><Brain size={14} /> Train Model</>
        }
      </button>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {result && (
        <>
          <div className="glass-card mb-24">
            <div className="card-title mb-16">
              <Brain size={14} color="var(--emerald)" /> Training Complete — {result.model_type.toUpperCase()} → {result.target}
            </div>
            <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Model ID: <span className="text-cyan font-mono">{result.model_id}</span> ·{' '}
              {result.features_used} features · {result.metrics.train_samples.toLocaleString()} train / {result.metrics.test_samples.toLocaleString()} test
            </div>

            <div className="metric-grid mt-16">
              {[
                { label: 'R²', value: result.metrics.r2, color: R2Color(result.metrics.r2), fmt: (v: number) => v.toFixed(4) },
                { label: 'MAE', value: result.metrics.mae, color: 'var(--cyan)', fmt: (v: number) => v.toFixed(4) },
                { label: 'RMSE', value: result.metrics.rmse, color: 'var(--violet)', fmt: (v: number) => v.toFixed(4) },
                { label: 'Pearson r', value: result.metrics.pearson, color: 'var(--emerald)', fmt: (v: number) => v.toFixed(4) },
                { label: 'Spearman ρ', value: result.metrics.spearman, color: 'var(--amber)', fmt: (v: number) => v.toFixed(4) },
              ].map(m => (
                <div key={m.label} className="glass-card" style={{ textAlign: 'center', padding: 16 }}>
                  <div className="text-muted text-sm mb-4">{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.fmt(m.value)}</div>
                </div>
              ))}
            </div>

            <div className="callout info mt-16">
              <div className="callout-title">R² Interpretation</div>
              <div className="callout-body">{R2Interpretation(result.metrics.r2)}</div>
            </div>
          </div>

          <div className="flex gap-12">
            <button className="btn btn-primary" onClick={() => navigate('/explainability')}>
              Explore Explainability <ChevronRight size={14} />
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/prediction')}>
              Run Predictions <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
