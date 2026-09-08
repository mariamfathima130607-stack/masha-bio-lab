import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 120000 })

export default api

// ── Health ───────────────────────────────────────────────────────────────────
export const fetchHealth = () => api.get('/health')

// ── Datasets ──────────────────────────────────────────────────────────────────
export const uploadDataset = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/datasets/upload', fd)
}
export const fetchSchema  = (id: string) => api.get(`/datasets/${id}/schema`)
export const cleanDataset = (id: string, body: object) => api.post(`/datasets/${id}/clean`, body)

// ── Analytics ─────────────────────────────────────────────────────────────────
export const fetchAnalytics = (id: string) => api.get(`/analytics/${id}/summary`)

// ── Models ────────────────────────────────────────────────────────────────────
export const engineerFeatures = (id: string, body: object) => api.post(`/models/${id}/features`, body)
export const trainModel       = (id: string, target: string, modelType: string) =>
  api.post(`/models/${id}/train?target=${target}&model_type=${modelType}`)
export const fetchSHAP        = (modelId: string) => api.get(`/models/${modelId}/shap`)

// ── Prediction ────────────────────────────────────────────────────────────────
export const runPrediction = (id: string, body: object) => api.post(`/prediction/${id}/predict`, body)

// ── RAG ───────────────────────────────────────────────────────────────────────
export const ragQuery   = (body: object) => api.post('/rag/query', body)
export const ragIngest  = () => api.post('/rag/ingest')

// ── Analyst ───────────────────────────────────────────────────────────────────
export const analystQuery = (body: object) => api.post('/ai-analyst/query', body)

// ── Knowledge ─────────────────────────────────────────────────────────────────
export const fetchDocuments   = () => api.get('/knowledge/documents')
export const uploadDocument   = (file: File) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/knowledge/upload', fd)
}
