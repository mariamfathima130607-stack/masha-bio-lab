import os
import json
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["RAG Assistant"])

KB_DIR = Path("knowledge_base")

# ── Schemas ───────────────────────────────────────────────────────────────────

class RAGQuery(BaseModel):
    question: str
    mode: Literal["web", "local"] = "web"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_groq_client():
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your_groq_api_key_here":
        return None
    try:
        from groq import Groq
        return Groq(api_key=api_key)
    except Exception:
        return None

def _groq_complete(client, prompt: str, model: Optional[str] = None) -> str:
    model = model or os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1024,
    )
    return resp.choices[0].message.content.strip()

# ── Web Search mode ───────────────────────────────────────────────────────────

def _web_search(query: str) -> list[dict]:
    # 1. Try SerpAPI if configured
    serp_key = os.getenv("SERPAPI_API_KEY", "")
    if serp_key and serp_key != "your_serpapi_key_here":
        try:
            import httpx
            resp = httpx.get(
                "https://serpapi.com/search.json",
                params={"q": query, "api_key": serp_key, "num": 5},
                timeout=15.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for r in data.get("organic_results", [])[:5]:
                    link = r.get("link", "")
                    hostname = link.split("/")[2] if link.startswith("http") and "/" in link[8:] else link.split("/")[0] if link else "google.com"
                    results.append({
                        "title": r.get("title", ""),
                        "href":  link,
                        "body":  r.get("snippet", ""),
                        "hostname": hostname,
                    })
                if results:
                    return results
        except Exception:
            pass  # Fall back to DuckDuckGo

    # 2. Fallback to DuckDuckGo search
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
        return [
            {
                "title": r.get("title", ""),
                "href":  r.get("href", ""),
                "body":  r.get("body", ""),
                "hostname": r.get("href", "").split("/")[2] if r.get("href") else "",
            }
            for r in results
        ]
    except Exception as e:
        return [{"title": "Search unavailable", "href": "", "body": str(e), "hostname": "error"}]

# ── Local RAG mode ────────────────────────────────────────────────────────────

def _local_rag_query(question: str) -> tuple[str, list[dict]]:
    index_path = KB_DIR / "faiss_index"
    if not index_path.exists():
        return (
            "No local knowledge base found. Please upload documents and rebuild the index.",
            []
        )
    try:
        from langchain_community.vectorstores import FAISS
        from langchain_community.embeddings import HuggingFaceEmbeddings
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        db = FAISS.load_local(str(index_path), embeddings, allow_dangerous_deserialization=True)
        docs = db.similarity_search(question, k=4)
        context = "\n\n".join(d.page_content for d in docs)
        sources = [
            {
                "file": d.metadata.get("source", "unknown"),
                "snippet": d.page_content[:300],
            }
            for d in docs
        ]
        return context, sources
    except Exception as e:
        return f"Error loading local KB: {e}", []

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/rag/query")
async def rag_query(req: RAGQuery):
    client = _get_groq_client()

    if req.mode == "web":
        sources_raw = _web_search(req.question)
        context = "\n\n".join(
            f"[{s['title']}] ({s['hostname']})\n{s['body']}"
            for s in sources_raw
        )
        if client:
            prompt = (
                f"You are a scientific assistant specializing in drug–cell response analysis.\n"
                f"Using the web search results below, answer the user's question clearly and concisely.\n\n"
                f"Search Results:\n{context}\n\n"
                f"Question: {req.question}\n\nAnswer:"
            )
            answer = _groq_complete(client, prompt)
        else:
            answer = (
                "Groq API key not configured. Here are raw web search results:\n\n"
                + "\n\n".join(f"• {s['title']}: {s['body'][:200]}" for s in sources_raw)
            )
        return {"answer": answer, "sources": sources_raw, "mode": "web"}

    else:  # local
        context, sources = _local_rag_query(req.question)
        if client and sources:
            prompt = (
                f"You are a scientific assistant. Using the document excerpts below, "
                f"answer the question precisely.\n\n"
                f"Context:\n{context}\n\n"
                f"Question: {req.question}\n\nAnswer:"
            )
            answer = _groq_complete(client, prompt)
        elif not sources:
            answer = context  # error message
        else:
            answer = f"Context retrieved:\n\n{context}"
        return {"answer": answer, "sources": sources, "mode": "local"}


@router.post("/rag/ingest")
async def ingest_documents():
    """Re-build the FAISS vector index from knowledge_base/ documents."""
    docs_found = list(KB_DIR.glob("*.txt")) + list(KB_DIR.glob("*.pdf")) + list(KB_DIR.glob("*.md"))
    if not docs_found:
        raise HTTPException(400, "No documents found in knowledge_base/ directory. Upload documents first.")

    try:
        from langchain_community.document_loaders import TextLoader, PyPDFLoader
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import FAISS
        from langchain_community.embeddings import HuggingFaceEmbeddings

        all_docs = []
        for p in docs_found:
            try:
                if p.suffix == ".pdf":
                    loader = PyPDFLoader(str(p))
                else:
                    loader = TextLoader(str(p), encoding="utf-8")
                all_docs.extend(loader.load())
            except Exception:
                pass

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(all_docs)

        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        db = FAISS.from_documents(chunks, embeddings)
        db.save_local(str(KB_DIR / "faiss_index"))

        return {
            "status": "success",
            "documents_processed": len(docs_found),
            "chunks_created": len(chunks),
            "index_path": str(KB_DIR / "faiss_index"),
        }
    except Exception as e:
        raise HTTPException(500, f"Ingestion failed: {e}")
