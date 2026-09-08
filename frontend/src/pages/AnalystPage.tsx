import { useState, useRef, useEffect } from 'react'
import { analystQuery } from '../api/client'
import { Bot, Send, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Message {
  role: 'user' | 'ai'
  content: string
  visualization?: 'bar' | 'histogram' | null
  chartData?: any[]
  operation?: string
}

const QUICK_QUESTIONS = [
  'Give me a summary',
  'Which drugs are most potent?',
  'Which cell lines are most sensitive?',
  'Show me the IC50 distribution',
  'How many missing values?',
  'What is the AUC distribution?',
]

const COLORS = ['#22d3ee','#6366f1','#10b981','#f59e0b','#f43f5e','#8b5cf6','#06b6d4','#84cc16']

const TooltipStyle = {
  contentStyle: { background: '#162040', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#f0f4ff', fontSize: 12 },
}

function InlineChart({ data, vizType }: { data: any[]; vizType: string }) {
  if (!data?.length) return null
  const isHistogram = vizType === 'histogram'
  return (
    <div style={{ marginTop: 12, height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={isHistogram ? 'bin' : 'name'} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(v: any) => typeof v === 'number' ? v.toFixed(1) : String(v).slice(0, 10)} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} />
          <Tooltip {...TooltipStyle} />
          <Bar dataKey={isHistogram ? 'count' : 'value'} radius={[3,3,0,0]}>
            {data.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AnalystPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hi! I\'m your AI Data Analyst. Ask me questions about your dataset in plain English. No code needed — I use safe rule-based analysis (no eval/exec).' }
  ])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const datasetId = localStorage.getItem('dataset_id') ?? ''

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const ask = async (question: string) => {
    if (loading) return
    const q = question.trim()
    if (!q) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const r = await analystQuery({ question: q, dataset_id: datasetId || undefined })
      setMessages(prev => [...prev, {
        role: 'ai',
        content: r.data.answer,
        visualization: r.data.visualization,
        chartData: r.data.data,
        operation: r.data.operation,
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${e.response?.data?.detail ?? 'Request failed'}` }])
    } finally { setLoading(false) }
  }

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><Bot size={16} color="var(--cyan)" /></div>
          AI Data Analyst
        </h1>
        <p className="section-desc">Natural language dataset queries with inline visualizations</p>
      </div>

      {!datasetId && (
        <div className="callout warning mb-16">
          <div className="callout-body">No dataset loaded. Upload a CSV first for data-specific analysis.</div>
        </div>
      )}

      <div className="callout info mb-16" style={{ padding: '10px 14px' }}>
        <div className="callout-body text-xs">🔒 Safe mode — All analysis uses rule-based pattern matching. No <code>eval()</code> or <code>exec()</code> is ever used.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16 }}>
        {/* Chat Column */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 360px)', minHeight: 420 }}>
          <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <div className={`chat-avatar ${msg.role}`}>
                  {msg.role === 'ai' ? <Bot size={16} /> : '👤'}
                </div>
                <div className="chat-text" style={{ maxWidth: '90%' }}>
                  <p>{msg.content}</p>
                  {msg.visualization && msg.chartData && (
                    <InlineChart data={Array.isArray(msg.chartData) ? msg.chartData : Object.values(msg.chartData)} vizType={msg.visualization} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-bubble ai">
                <div className="chat-avatar ai"><Bot size={16} /></div>
                <div className="chat-text" style={{ padding: 0 }}>
                  <div className="typing-dots"><div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/></div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-bar" style={{ padding: '12px 16px' }}>
            <input
              className="form-input"
              placeholder="Ask about your data…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask(input) }}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => ask(input)} disabled={loading || !input.trim()}>
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Quick Questions */}
        <div>
          <div className="glass-card">
            <div className="card-title mb-12">
              <BarChart2 size={13} color="var(--violet)" /> Quick Questions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} className="btn btn-ghost" onClick={() => ask(q)} disabled={loading}
                  style={{ textAlign: 'left', fontSize: 12, padding: '8px 12px', justifyContent: 'flex-start' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
