import { useState, useEffect, useRef } from 'react'
import { fetchDocuments, uploadDocument } from '../api/client'
import { BookOpen, Upload, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react'

export default function KnowledgePage() {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetchDocuments()
      setDocs(r.data.documents)
    } catch { setDocs([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (file: File) => {
    setUploading(true); setMsg(''); setError('')
    try {
      const r = await uploadDocument(file)
      setMsg(`✓ ${r.data.filename} uploaded (${(r.data.size_bytes/1024).toFixed(1)} KB)`)
      load()
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Upload failed')
    } finally { setUploading(false) }
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><BookOpen size={16} color="var(--cyan)" /></div>
          Knowledge Base
        </h1>
        <p className="section-desc">Manage scientific documents for RAG-powered Q&A</p>
      </div>

      <div className="flex items-center gap-12 mb-24">
        <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <><span className="spinner" style={{width:14,height:14}} /> Uploading…</> : <><Upload size={14} /> Upload Document</>}
        </button>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
        <input ref={inputRef} type="file" accept=".txt,.pdf,.md" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
        {msg && <span className="text-sm text-emerald">{msg}</span>}
        {error && <span className="text-sm text-rose">{error}</span>}
      </div>

      <div className="callout info mb-24">
        <div className="callout-title">Supported Formats</div>
        <div className="callout-body">
          Upload <strong>.txt</strong>, <strong>.pdf</strong>, or <strong>.md</strong> files. 
          After uploading, go to <strong>RAG Assistant → Rebuild Vector Index</strong> to embed the new documents.
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
          <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>No documents yet</div>
          <div className="text-sm text-muted">Upload PDF, TXT, or MD files to build your local knowledge base.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {docs.map(doc => (
            <div key={doc.id} className="glass-card glow" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
              <div style={{ width: 40, height: 40, background: 'var(--violet-dim)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} color="var(--violet)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{doc.title}</div>
                <div className="text-xs text-muted">
                  {doc.filename} · {(doc.size_bytes/1024).toFixed(1)} KB · ~{doc.chunks} chunks · Added {new Date(doc.date_added).toLocaleDateString()}
                </div>
              </div>
              <div>
                {doc.embedded
                  ? <span className="badge badge-emerald"><CheckCircle2 size={10} /> Embedded</span>
                  : <span className="badge badge-amber"><AlertCircle size={10} /> Not embedded</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
