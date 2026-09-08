from pathlib import Path
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["Analytics"])
DATA_DIR = Path("data")

def _load_df(dataset_id: str) -> pd.DataFrame:
    path = DATA_DIR / f"{dataset_id}.csv"
    if not path.exists():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")
    return pd.read_csv(path)

def _find_col(df: pd.DataFrame, keywords: list[str]) -> str | None:
    for col in df.columns:
        c = col.lower()
        if any(k in c for k in keywords):
            return col
    return None

@router.get("/analytics/{dataset_id}/summary")
async def analytics_summary(dataset_id: str):
    df = _load_df(dataset_id)

    ic50_col  = _find_col(df, ["ic50", "ic_50"])
    auc_col   = _find_col(df, ["auc", "area"])
    drug_col  = _find_col(df, ["drug", "compound", "treatment"])
    cell_col  = _find_col(df, ["cell", "line", "sample"])

    result: dict = {
        "dataset_id": dataset_id,
        "rows": len(df),
        "columns": len(df.columns),
        "numeric_summary": {},
        "ic50_distribution": [],
        "auc_boxplot": {},
        "top_sensitive_drugs": [],
        "top_resistant_cells": [],
        "correlation": [],
    }

    # Numeric summary
    for col in df.select_dtypes(include="number").columns:
        s = df[col].dropna()
        result["numeric_summary"][col] = {
            "mean": round(float(s.mean()), 4),
            "median": round(float(s.median()), 4),
            "std": round(float(s.std()), 4),
            "min": round(float(s.min()), 4),
            "max": round(float(s.max()), 4),
            "missing": int(df[col].isna().sum()),
        }

    # IC50 histogram bins
    if ic50_col:
        s = df[ic50_col].dropna()
        counts, edges = np.histogram(s, bins=20)
        result["ic50_distribution"] = [
            {"bin": round(float(edges[i]), 3), "count": int(counts[i])}
            for i in range(len(counts))
        ]

    # AUC boxplot stats
    if auc_col:
        s = df[auc_col].dropna()
        q1, q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
        iqr = q3 - q1
        result["auc_boxplot"] = {
            "min": round(float(s.min()), 4),
            "q1": round(q1, 4),
            "median": round(float(s.median()), 4),
            "q3": round(q3, 4),
            "max": round(float(s.max()), 4),
            "outliers": [round(float(v), 4) for v in s[(s < q1 - 1.5*iqr) | (s > q3 + 1.5*iqr)].head(20)],
        }

    # Top-10 sensitive drugs (lowest median IC50)
    if drug_col and ic50_col:
        top = (df.groupby(drug_col)[ic50_col].median()
               .sort_values().head(10).reset_index())
        result["top_sensitive_drugs"] = [
            {"drug": str(row[drug_col]), "median_ic50": round(float(row[ic50_col]), 4)}
            for _, row in top.iterrows()
        ]

    # Top-10 resistant cell lines (highest median IC50)
    if cell_col and ic50_col:
        top = (df.groupby(cell_col)[ic50_col].median()
               .sort_values(ascending=False).head(10).reset_index())
        result["top_resistant_cells"] = [
            {"cell_line": str(row[cell_col]), "median_ic50": round(float(row[ic50_col]), 4)}
            for _, row in top.iterrows()
        ]

    # Correlation heatmap (numeric cols only, max 10)
    num_cols = df.select_dtypes(include="number").columns[:10].tolist()
    if len(num_cols) >= 2:
        corr = df[num_cols].corr().round(3)
        for i, r in enumerate(num_cols):
            for j, c in enumerate(num_cols):
                result["correlation"].append({
                    "row": r, "col": c,
                    "value": float(corr.iloc[i, j]) if not np.isnan(corr.iloc[i, j]) else 0.0
                })

    return result
