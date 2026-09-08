import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/client'
import { Activity, Server, Bot, Database, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface ServiceStatus {
  service: string
  status: string
  detail: string
}
interface DiagItem {
  package: string
  status: string
  version: string | null
}
interface HealthData {
  status: string
  version: string
  groq_configured: boolean
  rag_ready: boolean
  dataset_loaded: boolean
  model_loaded: boolean
  groq_model: string
  services: ServiceStatus[]
  diagnostics: DiagItem[]
}

function StatusIcon({ status }: { status: string }) {
  if (['operational', 'configured', 'ready', 'loaded', 'healthy'].includes(status))
    return <CheckCircle2 size={14} color="var(--emerald)" />
  if (['not_configured', 'empty'].includes(status))
    return <AlertCircle size={14} color="var(--amber)" />
  return <XCircle size={14} color="var(--rose)" />
}

export default function Dashboard() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHealth()
      .then(r => setData(r.data))
      .catch(() => setError('Cannot reach backend. Is uvicorn running on port 8000?'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Activity size={16} color="var(--cyan)" /></div>
          System Dashboard
        </h1>
        <p className="section-desc">Live health status of all platform services and Python dependencies</p>
      </div>

      {/* Backend connection error */}
      {error && (
        <div className="callout danger mb-24">
          <div className="callout-title">⚠ Backend Unreachable</div>
          <div className="callout-body">{error}</div>
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid-3 mb-24">
          {[0,1,2].map(i => (
            <div key={i} className="glass-card" style={{ height: 100 }}>
              <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 28, width: '40%' }} />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* 3 Status Cards */}
          <div className="grid-3 mb-24">
            {/* Backend API */}
            <div className="glass-card glow">
              <div className="card-title">
                <Server size={14} color="var(--cyan)" />
                Backend API
              </div>
              <div className="card-value" style={{ fontSize: 20 }}>v{data.version}</div>
              <div className="flex items-center gap-8 mt-8">
                <div className={`status-dot ${data.status === 'healthy' ? 'ok' : 'error'}`} />
                <span className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>{data.status}</span>
              </div>
            </div>

            {/* AI Services */}
            <div className="glass-card glow">
              <div className="card-title">
                <Bot size={14} color="var(--violet)" />
                AI Services
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="flex items-center gap-8 mb-8">
                  <StatusIcon status={data.groq_configured ? 'configured' : 'not_configured'} />
                  <span className="text-sm">
                    Groq LLM — <span className={data.groq_configured ? 'text-emerald' : 'text-amber'}>
                      {data.groq_configured ? 'Configured' : 'Not configured'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <StatusIcon status={data.rag_ready ? 'ready' : 'empty'} />
                  <span className="text-sm">
                    RAG Engine — <span className={data.rag_ready ? 'text-emerald' : 'text-amber'}>
                      {data.rag_ready ? 'Ready' : 'No documents'}
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted mt-8">Model: {data.groq_model}</div>
            </div>

            {/* Data Environment */}
            <div className="glass-card glow">
              <div className="card-title">
                <Database size={14} color="var(--emerald)" />
                Data Environment
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="flex items-center gap-8 mb-8">
                  <StatusIcon status={data.dataset_loaded ? 'loaded' : 'empty'} />
                  <span className="text-sm">
                    Dataset — <span className={data.dataset_loaded ? 'text-emerald' : 'text-amber'}>
                      {data.dataset_loaded ? 'Loaded' : 'None uploaded'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <StatusIcon status={data.model_loaded ? 'ready' : 'empty'} />
                  <span className="text-sm">
                    ML Model — <span className={data.model_loaded ? 'text-emerald' : 'text-amber'}>
                      {data.model_loaded ? 'Trained' : 'Not trained'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Services List */}
          <div className="glass-card mb-24">
            <div className="card-title mb-16">
              <Activity size={14} color="var(--cyan)" />
              Service Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.services.map(s => (
                <div key={s.service} className="flex items-center gap-12"
                  style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <StatusIcon status={s.status} />
                  <span style={{ fontWeight: 600, fontSize: 13, minWidth: 150 }}>{s.service}</span>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {s.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-muted" style={{ flex: 1 }}>{s.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dependency Diagnostics */}
          <div className="glass-card">
            <div className="card-title mb-16">
              <CheckCircle2 size={14} color="var(--violet)" />
              Dependency Diagnostics
            </div>
            <div className="diag-grid">
              {data.diagnostics.map(d => (
                <div key={d.package} className="diag-item">
                  {d.status === 'ok'
                    ? <CheckCircle2 size={12} color="var(--emerald)" />
                    : <XCircle size={12} color="var(--rose)" />
                  }
                  <span className="diag-name">{d.package}</span>
                  <span className="diag-version">{d.version ?? 'missing'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
