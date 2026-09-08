import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# ── Directory setup ──────────────────────────────────────────────────────────
for d in ["data", "models", "knowledge_base"]:
    Path(d).mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("masha_biolab")

# ── Router imports ────────────────────────────────────────────────────────────
from routers import health, datasets, analytics, models, prediction, rag, analyst, knowledge

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MASHA Bio Lab API starting up …")
    yield
    logger.info("MASHA Bio Lab API shut down.")

app = FastAPI(
    title="MASHA Bio Lab API",
    version=os.getenv("APP_VERSION", "1.0.0"),
    description="Educational AI platform for drug–cell response analysis",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,     prefix="/api")
app.include_router(datasets.router,   prefix="/api")
app.include_router(analytics.router,  prefix="/api")
app.include_router(models.router,     prefix="/api")
app.include_router(prediction.router, prefix="/api")
app.include_router(rag.router,        prefix="/api")
app.include_router(analyst.router,    prefix="/api")
app.include_router(knowledge.router,  prefix="/api")

@app.get("/")
async def root():
    return {"message": "MASHA Bio Lab API", "docs": "/docs"}
