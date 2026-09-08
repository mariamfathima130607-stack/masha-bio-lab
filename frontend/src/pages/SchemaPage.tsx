import { useState } from 'react'
import { fetchSchema } from '../api/client'
import { Database, RefreshCw } from 'lucide-react'

const TYPE_BADGE: Record<string, string> = {
  drug: 'badge-violet',
  cell_line: 'badge-cyan',
  ic50: 'badge-emerald',
  auc: 'badge-amber',
  response: 'badge-rose',
  numeric: 'badge-muted',
  categorical: 'badge-muted',
}

const TYPE_LABEL: Record<string, string> = {
  drug: '💊 Drug',
  cell_line: '🧬 Cell Line',
  ic50: '📉 IC50',
  auc: '📈 AUC',
  response: '📊 Response',
  numeric: '🔢 Numeric',
  categorical: '🏷 Categorical',
}

export default function SchemaPage() {
  const [schema, setSchema] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overrides, setOverrides] = useState<Record<string, string>>({})

  const datasetId = localStorage.getItem('dataset_id') ?? ''

  const load = async () => {
    if (!datasetId) { setError('No dataset uploaded yet. Go to Data Upload first.'); return }
    setLoading(true); setError('')
    try {
      const r = await fetchSchema(datasetId)
      setSchema(r.data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to load schema')
    } finally { setLoading(false) }
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Database size={16} color="var(--cyan)" /></div>
          Schema Intelligence
        </h1>
        <p className="section-desc">Auto-detect column types and override them for downstream tasks</p>
      </div>

      <div className="flex items-center gap-12 mb-24">
        <button className="btn btn-primary" onClick={load} disabled={loading || !datasetId}>
          {loading ? <><span className="spinner" style={{ width:14,height:14 }} /> Analyzing…</> : <><RefreshCw size={14} /> Analyze Schema</>}
        </button>
        {!datasetId && <span className="text-sm text-muted">Upload a dataset first</span>}
      </div>

      {error && <div className="callout danger mb-16"><div className="callout-body">{error}</div></div>}

      {schema && (
        <>
          <div className="stat-grid mb-24">
            <div className="glass-card">
              <div className="card-title">Total Rows</div>
              <div className="card-value">{schema.total_rows.toLocaleString()}</div>
            </div>
            <div className="glass-card">
              <div className="card-title">Columns</div>
              <div className="card-value">{schema.columns.length}</div>
            </div>
            <div className="glass-card">
              <div className="card-title">Dataset ID</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'monospace' }}>{schema.dataset_id}</div>
            </div>
          </div>

          <div className="glass-card">
            <div className="card-title mb-16"><Database size={14} color="var(--cyan)" /> Column Schema</div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Column Name</th>
                    <th>Dtype</th>
                    <th>Inferred Type</th>
                    <th>Override</th>
                    <th>Nulls</th>
                    <th>Unique</th>
                    <th>Sample Values</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.columns.map((col: any) => {
                    const effective = overrides[col.name] ?? col.inferred_type
                    return (
                      <tr key={col.name}>
                        <td style={{ fontWeight: 600 }}>{col.name}</td>
                        <td><span className="badge badge-muted font-mono">{col.dtype}</span></td>
                        <td>
                          <span className={`badge ${TYPE_BADGE[effective] ?? 'badge-muted'}`}>
                            {TYPE_LABEL[effective] ?? effective}
                          </span>
                        </td>
                        <td>
                          <select
                            className="form-select"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            value={overrides[col.name] ?? col.inferred_type}
                            onChange={e => setOverrides(prev => ({ ...prev, [col.name]: e.target.value }))}
                          >
                            {['drug','cell_line','ic50','auc','response','numeric','categorical'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <span className={col.null_count > 0 ? 'text-amber' : 'text-emerald'}>
                            {col.null_count}
                          </span>
                        </td>
                        <td>{col.unique_count}</td>
                        <td className="text-muted">{col.sample_values.join(', ')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
