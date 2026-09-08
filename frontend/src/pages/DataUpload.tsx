import { useState, useCallback, useRef } from 'react'
import { uploadDataset } from '../api/client'
import { Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

export default function DataUpload() {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await uploadDataset(file)
      setResult(r.data)
      localStorage.setItem('dataset_id', r.data.dataset_id)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Upload failed.')
    } finally { setLoading(false) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Upload size={16} color="var(--cyan)" /></div>
          Data Upload
        </h1>
        <p className="section-desc">Upload a CSV dataset containing drug–cell response measurements</p>
      </div>

      <div className="glass-card mb-24">
        <div
          className={`drop-zone${dragging ? ' dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="drop-zone-icon">
            <Upload size={40} />
          </div>
          <div className="drop-zone-title">
            {loading ? 'Uploading…' : 'Drop your CSV file here'}
          </div>
          <div className="drop-zone-sub">
            or click to browse • CSV files only • Datasets with IC50, AUC, drug/cell columns
          </div>
          {loading && <div className="spinner mt-12" style={{ margin: '12px auto 0' }} />}
        </div>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
      </div>

      {error && (
        <div className="callout danger mb-16">
          <div className="callout-title flex items-center gap-8">
            <AlertCircle size={14} /> Upload Error
          </div>
          <div className="callout-body">{error}</div>
        </div>
      )}

      {result && (
        <>
          <div className="callout success mb-16">
            <div className="callout-title flex items-center gap-8">
              <CheckCircle2 size={14} /> Upload Successful
            </div>
            <div className="callout-body">
              Dataset ID: <strong>{result.dataset_id}</strong> •{' '}
              {result.rows.toLocaleString()} rows •{' '}
              {result.columns.length} columns •{' '}
              File: {result.filename}
            </div>
          </div>

          <div className="glass-card mb-24">
            <div className="card-title mb-16">
              <FileText size={14} color="var(--cyan)" /> Detected Columns
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.columns.map((col: string) => (
                <span key={col} className="badge badge-cyan">{col}</span>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="card-title mb-16">
              <FileText size={14} color="var(--violet)" /> Data Preview (first 10 rows)
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {result.columns.map((col: string) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((row: any, i: number) => (
                    <tr key={i}>
                      {result.columns.map((col: string) => (
                        <td key={col}>{String(row[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!result && !loading && (
        <div className="callout info">
          <div className="callout-title">💡 Expected CSV Format</div>
          <div className="callout-body">
            Your CSV should contain columns like: <code>drug_name</code>, <code>cell_line</code>,{' '}
            <code>ic50</code>, <code>auc</code>, <code>response</code>. Column names are
            auto-detected by the Schema Intelligence module.
          </div>
        </div>
      )}
    </div>
  )
}
