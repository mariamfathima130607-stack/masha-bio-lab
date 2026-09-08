# MASHA Bio Lab — Drug–Cell AI Platform

> **Educational Demo Only — Not for clinical use.**

A full-stack AI platform for drug–cell response analysis, built with FastAPI (Python) and React + TypeScript + Vite.

---

## 🏗 Project Structure

```
aayisha mariam/
├── backend/                # FastAPI Python API
│   ├── main.py
│   ├── .env                # Set your GROQ_API_KEY here
│   ├── requirements.txt
│   ├── routers/
│   │   ├── health.py       # GET /api/health
│   │   ├── datasets.py     # Upload, schema, cleaning
│   │   ├── analytics.py    # EDA charts data
│   │   ├── models.py       # Feature engineering + training + SHAP
│   │   ├── prediction.py   # Inference
│   │   ├── rag.py          # RAG assistant
│   │   ├── analyst.py      # AI data analyst
│   │   └── knowledge.py    # Document management
│   ├── data/               # Auto-created: uploaded CSVs stored here
│   ├── models/             # Auto-created: trained .pkl models
│   └── knowledge_base/     # Auto-created: uploaded documents + FAISS index
│
├── frontend/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx         # Router with all 13 routes
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── Layout.tsx
│   │   ├── pages/          # 13 page components
│   │   ├── api/client.ts   # Axios API helpers
│   │   └── styles/global.css
│   ├── package.json
│   └── vite.config.ts      # Proxies /api → localhost:8000
│
├── start_backend.bat       # Windows launcher for backend
├── start_frontend.bat      # Windows launcher for frontend
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Tool    | Version     | Download |
|---------|-------------|----------|
| Python  | ≥ 3.10      | https://python.org |
| Node.js | ≥ 18        | https://nodejs.org |
| Groq API Key | Optional | https://console.groq.com |

---

### 1. Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
copy .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

API will be available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

### 2. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App will be available at: **http://localhost:5173**

---

### 3. Windows One-Click Launch

Double-click these batch files (open two terminals):
- `start_backend.bat` — Starts FastAPI
- `start_frontend.bat` — Starts Vite

---

## 🧭 Navigation — 13 Pages

| # | Page | Route | Description |
|---|------|--------|-------------|
| 1 | Dashboard | `/` | Backend health, service status, dependency diagnostics |
| 2 | Data Upload | `/upload` | Drag-and-drop CSV upload with preview |
| 3 | Schema Intelligence | `/schema` | Auto-detect column types (drug, cell, IC50, AUC…) |
| 4 | Data Cleaning | `/cleaning` | Drop NaN / impute median/mean / outlier removal |
| 5 | Analytics | `/analytics` | IC50 histogram, AUC boxplot, top drugs/cells, heatmap |
| 6 | Feature Engineering | `/features` | Log IC50, one-hot encode, interaction terms |
| 7 | Model Training | `/training` | Random Forest / XGBoost with R², MAE, RMSE, Pearson, Spearman |
| 8 | Prediction | `/prediction` | Predict IC50/AUC for drug–cell pairs |
| 9 | Explainability | `/explainability` | SHAP feature importance chart |
| 10 | RAG Assistant | `/rag` | Scientific Q&A: Web Search or Local KB |
| 11 | AI Data Analyst | `/analyst` | Natural language queries with inline charts |
| 12 | Knowledge Base | `/knowledge` | Upload & manage documents for RAG |
| 13 | Workshop Mode | `/workshop` | 8-step educational walkthrough |

---

## 🔑 Configuration

Edit `backend/.env`:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxx   # Get from console.groq.com
GROQ_MODEL=llama3-70b-8192      # Or: mixtral-8x7b-32768
DEBUG=true
APP_VERSION=1.0.0
```

**Groq is optional.** Without it:
- RAG Assistant shows raw search results
- AI Analyst gives rule-based answers only
- All other features work fully offline

---

## 📊 Expected CSV Format

Your dataset should have columns like:

```
drug_name, cell_line, ic50, auc, response, viability
```

Column names are auto-detected by the Schema Intelligence module. Common variations like `Drug`, `DRUG_NAME`, `IC50_value`, `cell line` are all recognized.

**Sample datasets:** GDSC (Genomics of Drug Sensitivity in Cancer), CCLE, NCI-60.

---

## 🔬 ML Pipeline

```
CSV Upload → Schema Detection → Data Cleaning → Feature Engineering
→ Model Training (RF / XGBoost) → Evaluation (R², MAE, RMSE, Pearson, Spearman)
→ SHAP Explainability → Prediction
```

**Data Leakage Notice:** The platform uses a random 80/20 train-test split for educational simplicity. In real drug discovery, use drug-blind or cell-blind splits to prevent data leakage.

---

## 🏥 Disclaimer

> This platform is for **educational and research purposes only**.  
> It is **not validated** for clinical decision-making.  
> All predictions should be interpreted with caution by domain experts.
