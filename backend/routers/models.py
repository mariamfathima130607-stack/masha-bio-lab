import pickle
import uuid
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from scipy.stats import pearsonr, spearmanr
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

router = APIRouter(tags=["Models"])

DATA_DIR   = Path("data")
MODELS_DIR = Path("models")
MAX_ROWS   = 30_000

def _load_df(dataset_id: str) -> pd.DataFrame:
    p = DATA_DIR / f"{dataset_id}.csv"
    if not p.exists():
        raise HTTPException(404, f"Dataset '{dataset_id}' not found")
    return pd.read_csv(p)

def _save_df(df: pd.DataFrame, name: str) -> None:
    df.to_csv(DATA_DIR / name, index=False)

def _find_col(df: pd.DataFrame, keywords: list[str]) -> str | None:
    for col in df.columns:
        if any(k in col.lower() for k in keywords):
            return col
    return None

# ── Feature Engineering ───────────────────────────────────────────────────────

class FeatureRequest(BaseModel):
    log_transform_ic50: bool = True
    interaction_terms: bool = False
    one_hot_drug: bool = True
    one_hot_cell: bool = True

@router.post("/models/{dataset_id}/features")
async def engineer_features(dataset_id: str, req: FeatureRequest):
    df = _load_df(dataset_id)
    original_cols = len(df.columns)

    ic50_col = _find_col(df, ["ic50", "ic_50"])
    drug_col = _find_col(df, ["drug", "compound"])
    cell_col = _find_col(df, ["cell", "line", "sample"])

    if req.log_transform_ic50 and ic50_col:
        df[f"log_{ic50_col}"] = np.log1p(df[ic50_col].clip(lower=0))

    if req.one_hot_drug and drug_col and df[drug_col].nunique() <= 500:
        dummies = pd.get_dummies(df[drug_col], prefix="drug")
        df = pd.concat([df, dummies], axis=1)

    if req.one_hot_cell and cell_col and df[cell_col].nunique() <= 500:
        dummies = pd.get_dummies(df[cell_col], prefix="cell")
        df = pd.concat([df, dummies], axis=1)

    if req.interaction_terms and ic50_col:
        num_cols = df.select_dtypes(include="number").columns[:5].tolist()
        for i, c1 in enumerate(num_cols):
            for c2 in num_cols[i+1:]:
                df[f"{c1}_x_{c2}"] = df[c1] * df[c2]

    out_name = f"{dataset_id}_engineered.csv"
    _save_df(df, out_name)

    return {
        "dataset_id": dataset_id,
        "engineered_file": out_name,
        "original_columns": original_cols,
        "new_columns": len(df.columns),
        "features_added": len(df.columns) - original_cols,
        "rows": len(df),
        "transformations": {
            "log_ic50": req.log_transform_ic50 and ic50_col is not None,
            "one_hot_drug": req.one_hot_drug and drug_col is not None,
            "one_hot_cell": req.one_hot_cell and cell_col is not None,
            "interaction_terms": req.interaction_terms,
        },
    }

# ── Model Training ────────────────────────────────────────────────────────────

@router.post("/models/{dataset_id}/train")
async def train_model(
    dataset_id: str,
    target: str = Query("ic50", description="Target column keyword: ic50, auc, response"),
    model_type: str = Query("rf", description="rf = Random Forest, xgb = XGBoost"),
):
    # Try engineered CSV first
    eng_path = DATA_DIR / f"{dataset_id}_engineered.csv"
    raw_path = DATA_DIR / f"{dataset_id}.csv"
    df = pd.read_csv(eng_path if eng_path.exists() else raw_path)

    if len(df) > MAX_ROWS:
        df = df.sample(MAX_ROWS, random_state=42)

    # Find target column
    target_col = _find_col(df, [target.lower()])
    if target_col is None:
        num_cols = df.select_dtypes(include="number").columns.tolist()
        if not num_cols:
            raise HTTPException(400, f"No numeric columns found and target '{target}' not found")
        target_col = num_cols[0]

    df = df.dropna(subset=[target_col])
    y = df[target_col].values

    # Build feature matrix
    feature_df = df.drop(columns=[target_col])
    # Encode string columns
    for col in feature_df.select_dtypes(include="object").columns:
        le = LabelEncoder()
        feature_df[col] = le.fit_transform(feature_df[col].astype(str))
    feature_df = feature_df.select_dtypes(include="number").fillna(0)
    X = feature_df.values
    feature_names = list(feature_df.columns)

    if X.shape[1] == 0:
        raise HTTPException(400, "No numeric features available for training")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train
    if model_type == "xgb":
        try:
            from xgboost import XGBRegressor
            model = XGBRegressor(n_estimators=200, learning_rate=0.1, max_depth=6,
                                 random_state=42, n_jobs=-1, verbosity=0)
        except ImportError:
            model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
            model_type = "rf_fallback"
    else:
        model = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    r2   = float(r2_score(y_test, y_pred))
    mae  = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    pearson,  _ = pearsonr(y_test, y_pred)
    spearman, _ = spearmanr(y_test, y_pred)

    model_id = f"{dataset_id}_{model_type}_{target}"
    artifact = {
        "model": model,
        "feature_names": feature_names,
        "target_col": target_col,
        "model_type": model_type,
        "dataset_id": dataset_id,
    }
    with open(MODELS_DIR / f"{model_id}.pkl", "wb") as f:
        pickle.dump(artifact, f)

    return {
        "model_id": model_id,
        "model_type": model_type,
        "target": target_col,
        "features_used": len(feature_names),
        "metrics": {
            "r2": round(r2, 4),
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "pearson": round(float(pearson), 4),
            "spearman": round(float(spearman), 4),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
        },
    }

# ── SHAP ──────────────────────────────────────────────────────────────────────

@router.get("/models/{model_id}/shap")
async def get_shap(model_id: str):
    pkl_path = MODELS_DIR / f"{model_id}.pkl"
    if not pkl_path.exists():
        raise HTTPException(404, f"Model '{model_id}' not found")

    with open(pkl_path, "rb") as f:
        artifact = pickle.load(f)

    model         = artifact["model"]
    feature_names = artifact["feature_names"]
    dataset_id    = artifact["dataset_id"]
    target_col    = artifact["target_col"]

    df = pd.read_csv(DATA_DIR / f"{dataset_id}.csv").dropna(subset=[target_col])
    if len(df) > 2000:
        df = df.sample(2000, random_state=42)

    for col in df.select_dtypes(include="object").columns:
        from sklearn.preprocessing import LabelEncoder
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].astype(str))

    X = df[feature_names].fillna(0).values if all(f in df.columns for f in feature_names) else None

    importances = []
    if X is not None:
        try:
            import shap
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X)
            mean_shap = np.abs(shap_values).mean(axis=0)
            importances = [
                {"feature": feature_names[i], "importance": round(float(mean_shap[i]), 6)}
                for i in range(len(feature_names))
            ]
            importances.sort(key=lambda x: x["importance"], reverse=True)
            importances = importances[:20]
        except Exception:
            # Fallback: use model's native feature importances
            fi = getattr(model, "feature_importances_", None)
            if fi is not None:
                importances = [
                    {"feature": feature_names[i], "importance": round(float(fi[i]), 6)}
                    for i in range(len(feature_names))
                ]
                importances.sort(key=lambda x: x["importance"], reverse=True)
                importances = importances[:20]

    return {
        "model_id": model_id,
        "target": target_col,
        "feature_importances": importances,
        "note": "SHAP values represent mean absolute impact on model output",
    }
