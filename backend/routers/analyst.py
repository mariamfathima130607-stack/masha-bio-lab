import os
from pathlib import Path
from typing import Optional, Literal

import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["AI Analyst"])

DATA_DIR = Path("data")

class AnalystQuery(BaseModel):
    question: str
    dataset_id: Optional[str] = None

def _load_df(dataset_id: str) -> pd.DataFrame:
    p = DATA_DIR / f"{dataset_id}.csv"
    if not p.exists():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")
    return pd.read_csv(p)

def _find_col(df: pd.DataFrame, keywords: list[str]) -> Optional[str]:
    for col in df.columns:
        if any(k in col.lower() for k in keywords):
            return col
    return None

def _safe_describe(df: pd.DataFrame, question: str) -> dict:
    """Rule-based analysis — no eval/exec used."""
    q = question.lower()
    result = {"operation": "general", "data": None, "visualization": None, "answer": ""}

    if any(k in q for k in ["summary", "describe", "overview", "statistics"]):
        summary = {}
        for col in df.select_dtypes(include="number").columns[:8]:
            s = df[col].dropna()
            summary[col] = {
                "mean": round(float(s.mean()), 4),
                "median": round(float(s.median()), 4),
                "std": round(float(s.std()), 4),
                "min": round(float(s.min()), 4),
                "max": round(float(s.max()), 4),
                "missing": int(df[col].isna().sum()),
            }
        result["operation"] = "summary"
        result["data"] = summary
        result["answer"] = (
            f"Dataset has {len(df)} rows and {len(df.columns)} columns. "
            f"Numeric columns analyzed: {', '.join(summary.keys())}."
        )

    elif any(k in q for k in ["drug", "potent", "compound"]):
        drug_col = _find_col(df, ["drug", "compound"])
        ic50_col = _find_col(df, ["ic50"])
        if drug_col and ic50_col:
            top = df.groupby(drug_col)[ic50_col].median().sort_values().head(10)
            chart_data = [{"name": str(k), "value": round(float(v), 4)} for k, v in top.items()]
            result["operation"] = "top_drugs"
            result["data"] = chart_data
            result["visualization"] = "bar"
            result["answer"] = f"Top 10 most potent drugs by median IC50 (lower = more potent): {', '.join(str(k) for k in top.index[:3])} and more."
        else:
            result["answer"] = "Could not find drug or IC50 columns in this dataset."

    elif any(k in q for k in ["cell", "sensitive", "line"]):
        cell_col = _find_col(df, ["cell", "line", "sample"])
        ic50_col = _find_col(df, ["ic50"])
        if cell_col and ic50_col:
            top = df.groupby(cell_col)[ic50_col].median().sort_values().head(10)
            chart_data = [{"name": str(k), "value": round(float(v), 4)} for k, v in top.items()]
            result["operation"] = "top_cells"
            result["data"] = chart_data
            result["visualization"] = "bar"
            result["answer"] = f"Top 10 most sensitive cell lines by median IC50: {', '.join(str(k) for k in top.index[:3])} and more."
        else:
            result["answer"] = "Could not find cell line or IC50 columns in this dataset."

    elif any(k in q for k in ["ic50", "distribution", "histogram"]):
        ic50_col = _find_col(df, ["ic50"])
        if ic50_col:
            s = df[ic50_col].dropna()
            counts, edges = np.histogram(s, bins=15)
            chart_data = [{"bin": round(float(edges[i]), 3), "count": int(counts[i])} for i in range(len(counts))]
            result["operation"] = "ic50_histogram"
            result["data"] = chart_data
            result["visualization"] = "histogram"
            result["answer"] = (
                f"IC50 distribution: mean={s.mean():.4f}, median={s.median():.4f}, "
                f"std={s.std():.4f}, range=[{s.min():.4f}, {s.max():.4f}]."
            )
        else:
            result["answer"] = "No IC50 column found in this dataset."

    elif any(k in q for k in ["auc", "area under"]):
        auc_col = _find_col(df, ["auc", "area"])
        if auc_col:
            s = df[auc_col].dropna()
            counts, edges = np.histogram(s, bins=15)
            chart_data = [{"bin": round(float(edges[i]), 3), "count": int(counts[i])} for i in range(len(counts))]
            result["operation"] = "auc_histogram"
            result["data"] = chart_data
            result["visualization"] = "histogram"
            result["answer"] = (
                f"AUC distribution: mean={s.mean():.4f}, median={s.median():.4f}, "
                f"std={s.std():.4f}, range=[{s.min():.4f}, {s.max():.4f}]."
            )
        else:
            result["answer"] = "No AUC column found in this dataset."

    elif any(k in q for k in ["missing", "null", "nan", "empty"]):
        missing = df.isna().sum()
        missing_data = [{"column": c, "missing": int(v)} for c, v in missing.items() if v > 0]
        result["operation"] = "missing_values"
        result["data"] = missing_data
        result["visualization"] = "bar"
        total_missing = int(missing.sum())
        result["answer"] = (
            f"Total missing values: {total_missing}. "
            f"Columns with missing data: {sum(1 for v in missing if v > 0)} of {len(df.columns)}."
        )

    else:
        # Fallback: basic stats
        result["operation"] = "fallback"
        result["answer"] = (
            f"Dataset contains {len(df)} rows and {len(df.columns)} columns. "
            f"Columns: {', '.join(df.columns[:10].tolist())}. "
            f"Ask me about drug potency, cell line sensitivity, IC50 distribution, AUC, or missing values."
        )

    return result

def _groq_enhance(question: str, base_result: dict) -> str:
    """Optionally enrich the answer using Groq if configured."""
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key or api_key == "your_groq_api_key_here":
        return base_result["answer"]
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        prompt = (
            f"You are a bioinformatics data analyst. The user asked: '{question}'\n"
            f"Preliminary analysis result: {base_result['answer']}\n"
            f"Provide a clear, educational 2-3 sentence explanation. Do not fabricate numbers."
        )
        resp = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2, max_tokens=300,
        )
        return resp.choices[0].message.content.strip()
    except Exception:
        return base_result["answer"]

@router.post("/ai-analyst/query")
async def ai_analyst_query(req: AnalystQuery):
    if not req.dataset_id:
        return {
            "answer": "Please upload a dataset first, then ask your question.",
            "operation": "no_dataset",
            "data": None,
            "visualization": None,
        }

    df = _load_df(req.dataset_id)
    result = _safe_describe(df, req.question)
    result["answer"] = _groq_enhance(req.question, result)

    return result
