import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Upload, Database, Sparkles, BarChart2,
  Wrench, Brain, Zap, FlaskConical, MessageSquare, Bot,
  BookOpen, GraduationCap, Dna
} from 'lucide-react'

const navItems = [
  { path: '/',              label: 'Dashboard',         icon: LayoutDashboard, phase: null },
  { path: '/upload',        label: 'Data Upload',        icon: Upload,         phase: null },
  { path: '/schema',        label: 'Schema Intelligence',icon: Database,       phase: null },
  { path: '/cleaning',      label: 'Data Cleaning',      icon: Sparkles,       phase: null },
  { path: '/analytics',     label: 'Analytics',          icon: BarChart2,      phase: null },
  { path: '/features',      label: 'Feature Engineering',icon: Wrench,         phase: null },
  { path: '/training',      label: 'Model Training',     icon: Brain,          phase: null },
  { path: '/prediction',    label: 'Prediction',         icon: Zap,            phase: null },
  { path: '/explainability',label: 'Explainability',     icon: FlaskConical,   phase: null },
  { path: '/rag',           label: 'RAG Assistant',      icon: MessageSquare,  phase: null },
  { path: '/analyst',       label: 'AI Data Analyst',    icon: Bot,            phase: null },
  { path: '/knowledge',     label: 'Knowledge Base',     icon: BookOpen,       phase: null },
  { path: '/workshop',      label: 'Workshop Mode',      icon: GraduationCap,  phase: null },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Dna size={20} color="#fff" />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">MASHA Bio Lab</span>
          <span className="sidebar-brand-sub">Drug–Cell AI Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon className="nav-item-icon" />
              <span className="nav-item-label">{item.label}</span>
              {item.phase && (
                <span className="nav-phase-badge">{item.phase}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <span style={{ color: 'var(--amber)', fontSize: '10px', fontWeight: 600 }}>
          ⚠ Educational Demo Only
        </span>
        <br />
        Not for clinical use
      </div>
    </aside>
  )
}
