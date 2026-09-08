import os
import importlib
from fastapi import APIRouter

router = APIRouter(tags=["Health"])

REQUIRED_PACKAGES = [
    "pandas", "numpy", "sklearn", "xgboost", "shap",
    "faiss", "langchain", "groq", "sentence_transformers",
    "scipy", "duckduckgo_search",
]

def _check_pkg(name: str) -> dict:
    try:
        mod = importlib.import_module(name)
        version = getattr(mod, "__version__", "installed")
        return {"package": name, "status": "ok", "version": version}
    except ImportError:
        return {"package": name, "status": "missing", "version": None}

@router.get("/health")
async def health_check():
    groq_key = os.getenv("GROQ_API_KEY", "")
    groq_configured = bool(groq_key and groq_key != "your_groq_api_key_here")

    serp_key = os.getenv("SERPAPI_API_KEY", "")
    serp_configured = bool(serp_key and serp_key != "your_serpapi_key_here")

    # Check for uploaded datasets
    data_files = list(__import__("pathlib").Path("data").glob("*.csv"))
    dataset_loaded = len(data_files) > 0

    # Check for trained models
    model_files = list(__import__("pathlib").Path("models").glob("*.pkl"))
    model_loaded = len(model_files) > 0

    # Check RAG readiness
    kb_files = list(__import__("pathlib").Path("knowledge_base").glob("*"))
    rag_ready = len(kb_files) > 0

    services = [
        {
            "service": "FastAPI Backend",
            "status": "operational",
            "detail": f"v{os.getenv('APP_VERSION', '1.0.0')} running"
        },
        {
            "service": "Groq LLM",
            "status": "configured" if groq_configured else "not_configured",
            "detail": f"Model: {os.getenv('GROQ_MODEL', 'qwen/qwen3.8-27b')}" if groq_configured else "Set GROQ_API_KEY in .env"
        },
        {
            "service": "SerpAPI Search Engine",
            "status": "configured" if serp_configured else "optional",
            "detail": "Live scientific literature search" if serp_configured else "Optional: set SERPAPI_API_KEY"
        },
        {
            "service": "RAG Engine",
            "status": "ready" if rag_ready else "empty",
            "detail": f"{len(kb_files)} documents indexed" if rag_ready else "No documents ingested yet"
        },
        {
            "service": "Dataset Store",
            "status": "loaded" if dataset_loaded else "empty",
            "detail": f"{len(data_files)} dataset(s) available" if dataset_loaded else "No datasets uploaded"
        },
        {
            "service": "Model Store",
            "status": "ready" if model_loaded else "empty",
            "detail": f"{len(model_files)} model(s) trained" if model_loaded else "No models trained yet"
        },
    ]

    diagnostics = [_check_pkg(p) for p in REQUIRED_PACKAGES]

    return {
        "status": "healthy",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "groq_configured": groq_configured,
        "rag_ready": rag_ready,
        "dataset_loaded": dataset_loaded,
        "model_loaded": model_loaded,
        "groq_model": os.getenv("GROQ_MODEL", "llama3-70b-8192"),
        "services": services,
        "diagnostics": diagnostics,
    }
