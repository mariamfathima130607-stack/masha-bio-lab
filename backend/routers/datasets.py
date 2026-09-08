import uuid
import shutil
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, File, UploadFile, HTTPException

router = APIRouter(tags=["Datasets"])

DATA_DIR = Path("data")

# ── Helpers ──────────────────────────────────────────────────────────────────

def _load_df(dataset_id: str) -> pd.DataFrame:
    path = DATA_DIR / f"{dataset_id}.csv"
    if not path.exists():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")
    return pd.read_csv(path)

def _save_df(df: pd.DataFrame, dataset_id: str) -> None:
    df.to_csv(DATA_DIR / f"{dataset_id}.csv", index=False)

# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/datasets/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    dataset_id = str(uuid.uuid4())[:8]
    dest = DATA_DIR / f"{dataset_id}.csv"

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    df = pd.read_csv(dest)
    preview = df.head(10).fillna("").to_dict(orient="records")

    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": list(df.columns),
        "preview": preview,
    }

# ── Schema ────────────────────────────────────────────────────────────────────

DRUG_KEYWORDS   = {"drug", "compound", "molecule", "treatment", "smiles", "name"}
CELL_KEYWORDS   = {"cell", "line", "cellline", "cell_line", "sample"}
IC50_KEYWORDS   = {"ic50", "ic_50", "inhibition", "half"}
AUC_KEYWORDS    = {"auc", "area", "curve"}
RESP_KEYWORDS   = {"response", "viability", "activity", "effect", "sensitivity"}
NUMERIC_TYPES   = {"int64", "float64", "int32", "float32"}

def _infer_column_type(col: str, dtype: str) -> str:
    c = col.lower().replace(" ", "_")
    if any(k in c for k in DRUG_KEYWORDS):   return "drug"
    if any(k in c for k in CELL_KEYWORDS):   return "cell_line"
    if any(k in c for k in IC50_KEYWORDS):   return "ic50"
    if any(k in c for k in AUC_KEYWORDS):    return "auc"
    if any(k in c for k in RESP_KEYWORDS):   return "response"
    if dtype in NUMERIC_TYPES:               return "numeric"
    return "categorical"

@router.get("/datasets/{dataset_id}/schema")
async def get_schema(dataset_id: str):
    df = _load_df(dataset_id)
    columns = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        inferred = _infer_column_type(col, dtype)
        columns.append({
            "name": col,
            "dtype": dtype,
            "inferred_type": inferred,
            "null_count": int(df[col].isna().sum()),
            "unique_count": int(df[col].nunique()),
            "sample_values": df[col].dropna().head(3).astype(str).tolist(),
        })
    return {"dataset_id": dataset_id, "columns": columns, "total_rows": len(df)}

# ── Cleaning ──────────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import Literal

class CleanRequest(BaseModel):
    strategy: Literal["drop", "impute_median", "impute_mean"] = "drop"
    remove_outliers: bool = False
    outlier_std: float = 3.0

@router.post("/datasets/{dataset_id}/clean")
async def clean_dataset(dataset_id: str, req: CleanRequest):
    df = _load_df(dataset_id)
    before_rows = len(df)
    before_missing = int(df.isna().sum().sum())

    numeric_cols = df.select_dtypes(include="number").columns.tolist()

    if req.strategy == "drop":
        df = df.dropna()
    elif req.strategy == "impute_median":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    elif req.strategy == "impute_mean":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

    if req.remove_outliers and numeric_cols:
        import numpy as np
        mask = pd.Series([True] * len(df), index=df.index)
        for col in numeric_cols:
            mean, std = df[col].mean(), df[col].std()
            if std > 0:
                mask &= (df[col] - mean).abs() <= req.outlier_std * std
        df = df[mask]

    after_rows = len(df)
    after_missing = int(df.isna().sum().sum())

    _save_df(df, dataset_id)

    return {
        "dataset_id": dataset_id,
        "strategy": req.strategy,
        "remove_outliers": req.remove_outliers,
        "before": {"rows": before_rows, "missing": before_missing},
        "after": {"rows": after_rows, "missing": after_missing},
        "rows_removed": before_rows - after_rows,
        "missing_fixed": before_missing - after_missing,
    }
