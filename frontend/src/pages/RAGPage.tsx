import { useState, useRef, useEffect } from 'react'
import { ragQuery, ragIngest } from '../api/client'
import { MessageSquare, Send, RefreshCw, Globe, BookOpen } from 'lucide-react'

interface Message {
  role: 'user' | 'ai'
  content: string
  sources?: any[]
  mode?: string
}

export default function RAGPage() {
  const [mode, setMode] = useState<'web' | 'local'>('web')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: "Hello! I'm your RAG-powered scientific assistant. Ask me about drug mechanisms, IC50 interpretation, or any pharmacology topic. Use Web Search for live results, or Local KB for your uploaded documents.", mode: 'web' }
  ])
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [ingestMsg, setIngestMsg] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const q = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const r = await ragQuery({ question: q, mode })
      setMessages(prev => [...prev, { role: 'ai', content: r.data.answer, sources: r.data.sources, mode: r.data.mode }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${e.response?.data?.detail ?? 'Request failed'}` }])
    } finally { setLoading(false) }
  }

  const rebuild = async () => {
    setIngesting(true); setIngestMsg('')
    try {
      const r = await ragIngest()
      setIngestMsg(`✓ Indexed ${r.data.documents_processed} docs → ${r.data.chunks_created} chunks`)
    } catch (e: any) {
      setIngestMsg(`✗ ${e.response?.data?.detail ?? 'Ingestion failed'}`)
    } finally { setIngesting(false) }
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><MessageSquare size={16} color="var(--cyan)" /></div>
          RAG Assistant
        </h1>
        <p className="section-desc">Scientific Q&A powered by web search and local knowledge base</p>
      </div>

      {/* Mode Toggle */}
      <div className="glass-card mb-16" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px' }}>
        <span className="text-sm text-muted">Search Mode:</span>
        <div className="toggle-group" style={{ maxWidth: 280 }}>
          <button className={`toggle-option${mode === 'web' ? ' active-cyan' : ''}`} onClick={() => setMode('web')}>
            <Globe size={12} style={{ marginRight: 4 }} /> Web Search
          </button>
          <button className={`toggle-option${mode === 'local' ? ' active-violet' : ''}`} onClick={() => setMode('local')}>
            <BookOpen size={12} style={{ marginRight: 4 }} /> Local KB
          </button>
        </div>
        {mode === 'local' && (
          <>
            <button className="btn btn-ghost" onClick={rebuild} disabled={ingesting} style={{ fontSize: 12, padding: '6px 12px' }}>
              {ingesting ? <><span className="spinner" style={{width:12,height:12}} /> Indexing…</> : <><RefreshCw size={12} /> Rebuild Index</>}
            </button>
            {ingestMsg && <span className="text-sm text-muted">{ingestMsg}</span>}
          </>
        )}
      </div>

      {mode === 'web' && (
        <div className="callout info mb-16" style={{ padding: '10px 14px' }}>
          <div className="callout-body text-xs">Web mode uses DuckDuckGo to fetch recent results, then summarizes with Groq LLM.</div>
        </div>
      )}
      {mode === 'local' && (
        <div className="callout info mb-16" style={{ padding: '10px 14px' }}>
          <div className="callout-body text-xs">Local KB mode searches your uploaded documents via FAISS vector store. Upload docs in the Knowledge Base page, then rebuild the index.</div>
        </div>
      )}

      {/* Chat */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 360px)', minHeight: 420 }}>
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`chat-bubble ${msg.role}`}>
                <div className={`chat-avatar ${msg.role}`}>
                  {msg.role === 'ai' ? '🧬' : '👤'}
                </div>
                <div className="chat-text">
                  {msg.content.split('\n').map((line, j) => <p key={j} style={{ marginBottom: 4 }}>{line}</p>)}
                </div>
              </div>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginLeft: 42, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Sources:</div>
                  {msg.sources.slice(0, 3).map((s: any, si: number) => (
                    <div key={si} className="source-card">
                      {s.title && <div className="source-card-title">{s.title}</div>}
                      {s.href && <div className="source-card-url">{s.hostname || s.href}</div>}
                      {s.file && <div className="source-card-url">📄 {s.file}</div>}
                      <div className="source-card-body">{(s.body || s.snippet || '').slice(0, 200)}…</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble ai">
              <div className="chat-avatar ai">🧬</div>
              <div className="chat-text" style={{ padding: 0 }}>
                <div className="typing-dots">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-bar" style={{ padding: '12px 16px' }}>
          <input
            className="form-input"
            placeholder={mode === 'web' ? 'Ask about drug mechanisms, pharmacology…' : 'Search your local documents…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
