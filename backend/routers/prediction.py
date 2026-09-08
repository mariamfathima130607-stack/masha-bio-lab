import pickle
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.preprocessing import LabelEncoder

router = APIRouter(tags=["Prediction"])

DATA_DIR   = Path("data")
MODELS_DIR = Path("models")

class PredictRequest(BaseModel):
    drug_name: Optional[str] = None
    cell_line: Optional[str] = None
    model_id: Optional[str] = None

def _load_model(dataset_id: str):
    """Load the most recently trained model for a dataset."""
    candidates = list(MODELS_DIR.glob(f"{dataset_id}_*.pkl"))
    if not candidates:
        raise HTTPException(404, f"No trained model found for dataset '{dataset_id}'. Please train a model first.")
    # pick latest
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    with open(candidates[0], "rb") as f:
        return pickle.load(f), candidates[0].stem

@router.post("/prediction/{dataset_id}/predict")
async def predict(dataset_id: str, req: PredictRequest):
    artifact, model_id = _load_model(dataset_id)
    model         = artifact["model"]
    feature_names = artifact["feature_names"]
    target_col    = artifact["target_col"]

    # Build input row
    row = {f: 0.0 for f in feature_names}

    # Try to set drug/cell features
    if req.drug_name:
        drug_key = f"drug_{req.drug_name}"
        if drug_key in row:
            row[drug_key] = 1.0

    if req.cell_line:
        cell_key = f"cell_{req.cell_line}"
        if cell_key in row:
            row[cell_key] = 1.0

    X = np.array([[row[f] for f in feature_names]])
    y_pred = float(model.predict(X)[0])

    # Confidence range: ±10% of prediction
    conf_low  = round(y_pred * 0.90, 4)
    conf_high = round(y_pred * 1.10, 4)

    # Top-5 sensitive cell lines for the given drug (lowest predicted IC50)
    top_sensitive = []
    df_raw = pd.read_csv(DATA_DIR / f"{dataset_id}.csv")
    cell_col = next((c for c in df_raw.columns if "cell" in c.lower() or "line" in c.lower()), None)
    ic50_col = next((c for c in df_raw.columns if "ic50" in c.lower()), None)

    if cell_col and ic50_col:
        grouped = df_raw.groupby(cell_col)[ic50_col].median().sort_values().head(5)
        top_sensitive = [
            {"cell_line": str(k), "median_ic50": round(float(v), 4)}
            for k, v in grouped.items()
        ]

    return {
        "model_id": model_id,
        "drug_name": req.drug_name,
        "cell_line": req.cell_line,
        "target": target_col,
        "prediction": round(y_pred, 4),
        "confidence_low": conf_low,
        "confidence_high": conf_high,
        "top_sensitive_cell_lines": top_sensitive,
        "note": "Prediction is based on encoded feature vectors. Results are for educational purposes only.",
    }
