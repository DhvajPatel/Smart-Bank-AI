"""
Loan Risk Inference Service — V3
==================================
Mirrors the feature engineering in ai/loan_prediction/train.py exactly.
Loads the weighted ensemble (GBR + MLP) from loan_ensemble.pkl; falls back
to MLP-only if the pickle does not exist (e.g. first run / V2 artefacts).
"""
import pickle
from pathlib import Path

import numpy as np
import torch

import sys
ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / "ai" / "loan_prediction"))
from model import LoanRiskNet, FEATURE_COLUMNS, INPUT_DIM   # noqa: E402

MODEL_DIR = ROOT / "ai" / "models"

# Lazily-loaded singletons
_mlp      = None
_scaler   = None
_ensemble = None    # {"gbr": ..., "threshold": float, "gbr_w": float, "mlp_w": float}


def _load():
    global _mlp, _scaler, _ensemble

    if _scaler is None:
        with open(MODEL_DIR / "loan_scaler.pkl", "rb") as f:
            _scaler = pickle.load(f)

    if _mlp is None:
        _mlp = LoanRiskNet(input_dim=INPUT_DIM)
        _mlp.load_state_dict(
            torch.load(MODEL_DIR / "loan_model.pt", map_location="cpu",
                       weights_only=True)
        )
        _mlp.eval()

    ens_path = MODEL_DIR / "loan_ensemble.pkl"
    if _ensemble is None and ens_path.exists():
        with open(ens_path, "rb") as f:
            _ensemble = pickle.load(f)
        # Normalise legacy key names
        if "gbt" in _ensemble and "gbr" not in _ensemble:
            _ensemble["gbr"] = _ensemble.pop("gbt")

    return _mlp, _scaler, _ensemble


# ── Feature engineering (must exactly mirror train.py) ───────────────────────
_LOAN_TYPES = [
    "lt_Business Loan", "lt_Education Loan",
    "lt_Home Loan",     "lt_Personal Loan", "lt_Vehicle Loan",
]

def _build_features(
    monthly_income: float,
    credit_score: int,
    employment_years: float,
    requested_amount: float,
    tenure_months: int,
    existing_debt: float,
    loan_type: str = "",
) -> np.ndarray:
    """Return a (1, INPUT_DIM) float32 array in FEATURE_COLUMNS order."""
    inc = max(monthly_income, 1.0)
    ten = max(tenure_months, 1)
    emp = max(employment_years, 0.1)

    dti         = existing_debt / inc
    lti         = requested_amount / (inc * ten)
    debt_per_emp= existing_debt / emp
    monthly_obl = requested_amount / ten
    obl_ratio   = monthly_obl / inc
    credit_sq   = credit_score ** 2 / 1000.0
    score_x_emp = credit_score * employment_years / 100.0
    log_income  = float(np.log1p(monthly_income))
    log_debt    = float(np.log1p(existing_debt))
    log_amount  = float(np.log1p(requested_amount))

    lt_key = f"lt_{loan_type}" if loan_type else ""
    lt_vals = [1.0 if col == lt_key else 0.0 for col in _LOAN_TYPES]

    row = [
        credit_score, monthly_income, employment_years,
        existing_debt, requested_amount, tenure_months,
        dti, lti, debt_per_emp, monthly_obl, obl_ratio,
        credit_sq, score_x_emp, log_income, log_debt, log_amount,
        *lt_vals,
    ]
    return np.array([row], dtype=np.float32)


# ── Public API ────────────────────────────────────────────────────────────────
def predict_loan_risk(
    monthly_income: float,
    credit_score: int,
    employment_years: float,
    requested_amount: float,
    tenure_months: int,
    existing_debt: float,
    loan_type: str = "",
):
    mlp, scaler, ensemble = _load()

    raw    = _build_features(monthly_income, credit_score, employment_years,
                             requested_amount, tenure_months, existing_debt,
                             loan_type)
    scaled = scaler.transform(raw)

    # MLP probability
    with torch.no_grad():
        mlp_prob = torch.sigmoid(
            mlp(torch.tensor(scaled, dtype=torch.float32))
        ).item()

    # Ensemble (GBR + MLP weighted average) when available
    if ensemble is not None:
        gbr = ensemble["gbr"]
        if hasattr(gbr, "predict_proba"):           # classifier fallback
            gbr_prob = float(gbr.predict_proba(scaled)[0, 1])
        else:                                        # regressor (V3 normal path)
            gbr_prob = float(np.clip(gbr.predict(scaled)[0], 0.0, 1.0))

        gbr_w = ensemble.get("gbr_w", 0.65)
        mlp_w = ensemble.get("mlp_w", 0.35)

        # Legacy stacking meta-learner (V3-alpha artefacts)
        if "meta" in ensemble:
            meta_in   = np.array([[gbr_prob, mlp_prob]])
            default_p = float(ensemble["meta"].predict_proba(meta_in)[0, 1])
        else:
            default_p = gbr_w * gbr_prob + mlp_w * mlp_prob

        threshold = float(ensemble.get("threshold", 0.5))
    else:
        default_p = mlp_prob
        threshold = 0.5

    approval_p = 1.0 - default_p

    # Risk band relative to the tuned threshold
    if default_p < threshold * 0.55:
        risk_level = "LOW"
    elif default_p < threshold * 1.30:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # Recommended terms if risky
    rec_amount = requested_amount
    rec_tenure = tenure_months
    if default_p >= threshold:
        rec_amount = round(requested_amount * 0.65, -3)
        rec_tenure = min(tenure_months + 24, 180)

    # Human-readable explanation
    explanation = []
    if credit_score >= 750:
        explanation.append("Strong credit score — low default risk")
    elif credit_score >= 700:
        explanation.append("Good credit score")
    elif credit_score >= 650:
        explanation.append("Fair credit score — moderate risk")
    else:
        explanation.append("Below-average credit score increases risk")

    if employment_years >= 5:
        explanation.append("Stable long-term employment (≥5 years)")
    elif employment_years >= 3:
        explanation.append("Adequate employment history (≥3 years)")
    else:
        explanation.append("Limited employment history raises risk")

    dti = existing_debt / max(monthly_income, 1)
    if dti < 0.20:
        explanation.append("Low existing debt-to-income ratio")
    elif dti < 0.40:
        explanation.append("Moderate existing debt obligations")
    else:
        explanation.append("High debt-to-income ratio increases risk")

    obl = requested_amount / max(monthly_income * tenure_months, 1)
    if obl > 0.50:
        explanation.append("Large loan relative to income and tenure")

    if loan_type:
        explanation.append(f"Loan type: {loan_type}")

    return {
        "approval_probability": round(approval_p,  4),
        "default_probability":  round(default_p,   4),
        "risk_level":           risk_level,
        "recommended_amount":   round(rec_amount,  2),
        "recommended_tenure":   int(rec_tenure),
        "explanation":          explanation,
    }
