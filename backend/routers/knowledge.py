import uuid
import shutil
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(tags=["Knowledge Base"])

KB_DIR = Path("knowledge_base")

@router.get("/knowledge/documents")
async def list_documents():
    docs = []
    for p in KB_DIR.iterdir():
        if p.suffix in {".txt", ".pdf", ".md"} and p.is_file():
            stat = p.stat()
            # Estimate chunk count: ~500 chars per chunk
            try:
                text_len = len(p.read_text(encoding="utf-8", errors="ignore"))
            except Exception:
                text_len = 0
            est_chunks = max(1, text_len // 500)
            docs.append({
                "id": p.name,
                "title": p.stem.replace("_", " ").title(),
                "filename": p.name,
                "size_bytes": stat.st_size,
                "chunks": est_chunks,
                "date_added": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "embedded": (KB_DIR / "faiss_index").exists(),
            })
    return {"documents": docs, "total": len(docs)}

@router.post("/knowledge/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed = {".txt", ".pdf", ".md"}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(400, f"Only {allowed} files are supported")

    dest = KB_DIR / file.filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    stat = dest.stat()
    return {
        "filename": file.filename,
        "size_bytes": stat.st_size,
        "status": "uploaded",
        "message": "Document uploaded. Click 'Rebuild Index' in the RAG Assistant to embed it.",
    }
