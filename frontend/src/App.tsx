import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataUpload from './pages/DataUpload'
import SchemaPage from './pages/SchemaPage'
import CleaningPage from './pages/CleaningPage'
import AnalyticsPage from './pages/AnalyticsPage'
import FeaturesPage from './pages/FeaturesPage'
import TrainingPage from './pages/TrainingPage'
import PredictionPage from './pages/PredictionPage'
import ExplainabilityPage from './pages/ExplainabilityPage'
import RAGPage from './pages/RAGPage'
import AnalystPage from './pages/AnalystPage'
import KnowledgePage from './pages/KnowledgePage'
import WorkshopPage from './pages/WorkshopPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<DataUpload />} />
          <Route path="schema" element={<SchemaPage />} />
          <Route path="cleaning" element={<CleaningPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="prediction" element={<PredictionPage />} />
          <Route path="explainability" element={<ExplainabilityPage />} />
          <Route path="rag" element={<RAGPage />} />
          <Route path="analyst" element={<AnalystPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="workshop" element={<WorkshopPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
