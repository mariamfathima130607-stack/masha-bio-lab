import { useLocation } from 'react-router-dom'
import { Dna } from 'lucide-react'

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/':               { title: 'Dashboard',          subtitle: 'System overview & service health' },
  '/upload':         { title: 'Data Upload',         subtitle: 'Upload and preview CSV datasets' },
  '/schema':         { title: 'Schema Intelligence', subtitle: 'Auto-detect column types & structure' },
  '/cleaning':       { title: 'Data Cleaning',       subtitle: 'Handle missing values & outliers' },
  '/analytics':      { title: 'Analytics',           subtitle: 'Visual exploratory data analysis' },
  '/features':       { title: 'Feature Engineering', subtitle: 'Build drug & cell-line features' },
  '/training':       { title: 'Model Training',      subtitle: 'Train RF & XGBoost regression models' },
  '/prediction':     { title: 'Prediction',          subtitle: 'Run inference on drug–cell pairs' },
  '/explainability': { title: 'Explainability',      subtitle: 'SHAP feature importance analysis' },
  '/rag':            { title: 'RAG Assistant',        subtitle: 'Scientific Q&A with web & local KB' },
  '/analyst':        { title: 'AI Data Analyst',     subtitle: 'Natural language dataset queries' },
  '/knowledge':      { title: 'Knowledge Base',      subtitle: 'Manage indexed scientific documents' },
  '/workshop':       { title: 'Workshop Mode',       subtitle: 'Step-by-step ML pipeline walkthrough' },
}

export default function Topbar() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] ?? { title: 'MASHA Bio Lab', subtitle: '' }

  const datasetId = localStorage.getItem('dataset_id')
  const modelId   = localStorage.getItem('model_id')

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-subtitle">{meta.subtitle}</div>
      </div>
      <div className="topbar-spacer" />

      {datasetId && (
        <span className="topbar-badge" title={`Dataset: ${datasetId}`}>
          Dataset: {datasetId}
        </span>
      )}
      {modelId && (
        <span className="topbar-badge" title={`Model: ${modelId}`} style={{ background: 'var(--violet-dim)', color: 'var(--violet)', borderColor: 'rgba(99,102,241,0.3)' }}>
          Model ready
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Dna size={16} color="#fff" />
        </div>
      </div>
    </header>
  )
}
