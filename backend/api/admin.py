import json
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database import models
from services import recommendation_service

router = APIRouter(prefix="/admin", tags=["Admin / Marketing"])

ROOT = Path(__file__).resolve().parents[2]
MODEL_METRICS_PATH = ROOT / "ai" / "models" / "loan_metrics.json"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _risk_band(score):
    if score >= 750: return "Low"
    if score >= 650: return "Medium"
    if score >= 550: return "Elevated"
    return "High"


# ── Existing endpoints ─────────────────────────────────────────────────────────

@router.get("/statistics")
def statistics(db: Session = Depends(get_db)):
    total_customers  = db.query(func.count(models.Customer.customer_id)).scalar()
    active_accounts  = db.query(func.count(models.Account.account_id)).filter_by(status="Active").scalar()
    loan_applications = db.query(func.count(models.Loan.loan_id)).scalar()
    high_risk_loans  = db.query(func.count(models.Loan.loan_id)).filter(
        models.Loan.default_probability_true > 0.4
    ).scalar()
    avg_credit_score = db.query(func.avg(models.Customer.credit_score)).scalar()
    total_deposits   = db.query(func.sum(models.Account.balance)).scalar() or 0

    return {
        "total_customers":   total_customers,
        "active_accounts":   active_accounts,
        "loan_applications": loan_applications,
        "high_risk_loans":   high_risk_loans,
        "avg_credit_score":  round(avg_credit_score, 1) if avg_credit_score else None,
        "total_deposits":    round(total_deposits, 2),
    }


@router.get("/marketing-segments")
def marketing_segments(db: Session = Depends(get_db)):
    high_value          = db.query(func.count(models.Customer.customer_id)).filter(
        models.Customer.monthly_income > 100000).scalar()
    credit_card_prospects = db.query(func.count(models.Customer.customer_id)).filter(
        models.Customer.credit_score > 700).scalar()
    loan_prospects      = db.query(func.count(models.Loan.loan_id)).filter(
        models.Loan.loan_status == "Pending").scalar()
    return {
        "high_value_customers":    high_value,
        "credit_card_prospects":   credit_card_prospects,
        "loan_prospects":          loan_prospects,
    }


# ── New endpoints ──────────────────────────────────────────────────────────────

@router.get("/customer-analytics")
def customer_analytics(db: Session = Depends(get_db)):
    """Distributions for the Analytics page charts."""
    total = db.query(func.count(models.Customer.customer_id)).scalar()

    # Credit score buckets
    score_rows = db.query(models.Customer.credit_score).all()
    score_bins  = {"300-499": 0, "500-599": 0, "600-699": 0, "700-749": 0, "750-900": 0}
    for (s,) in score_rows:
        if   s < 500: score_bins["300-499"] += 1
        elif s < 600: score_bins["500-599"] += 1
        elif s < 700: score_bins["600-699"] += 1
        elif s < 750: score_bins["700-749"] += 1
        else:         score_bins["750-900"] += 1
    credit_score_dist = [{"range": k, "count": v} for k, v in score_bins.items()]

    # Income buckets
    income_rows = db.query(models.Customer.monthly_income).all()
    income_bins  = {"<20k": 0, "20-50k": 0, "50-100k": 0, "100-200k": 0, "200k+": 0}
    for (inc,) in income_rows:
        if   inc < 20000:  income_bins["<20k"]    += 1
        elif inc < 50000:  income_bins["20-50k"]  += 1
        elif inc < 100000: income_bins["50-100k"] += 1
        elif inc < 200000: income_bins["100-200k"] += 1
        else:              income_bins["200k+"]   += 1
    income_dist = [{"range": k, "count": v} for k, v in income_bins.items()]

    # Age buckets
    age_rows = db.query(models.Customer.age).all()
    age_bins = {"21-30": 0, "31-40": 0, "41-50": 0, "51-65": 0}
    for (a,) in age_rows:
        if   a <= 30: age_bins["21-30"] += 1
        elif a <= 40: age_bins["31-40"] += 1
        elif a <= 50: age_bins["41-50"] += 1
        else:         age_bins["51-65"] += 1
    age_dist = [{"range": k, "count": v} for k, v in age_bins.items()]

    # Top cities
    city_rows = db.query(models.Customer.city, func.count(models.Customer.customer_id))\
        .group_by(models.Customer.city)\
        .order_by(func.count(models.Customer.customer_id).desc())\
        .limit(8).all()
    top_cities = [{"city": c, "count": n} for c, n in city_rows]

    # Occupation split
    occ_rows = db.query(models.Customer.occupation, func.count(models.Customer.customer_id))\
        .group_by(models.Customer.occupation)\
        .order_by(func.count(models.Customer.customer_id).desc()).all()
    occ_dist = [{"occupation": o, "count": n} for o, n in occ_rows]

    return {
        "total_customers":          total,
        "credit_score_distribution": credit_score_dist,
        "income_distribution":       income_dist,
        "age_distribution":          age_dist,
        "top_cities":                top_cities,
        "occupation_distribution":   occ_dist,
    }


@router.get("/loan-analytics")
def loan_analytics(db: Session = Depends(get_db)):
    """Loan portfolio summary + per-type breakdown + risk distribution."""
    loans = db.query(models.Loan).all()
    if not loans:
        return {"total_loans": 0, "portfolio_value": 0, "avg_loan_amount": 0,
                "overall_default_rate": 0, "type_breakdown": [], "risk_distribution": []}

    total       = len(loans)
    portfolio   = sum(l.requested_amount for l in loans)
    avg_amount  = round(portfolio / total)
    default_rate = round(sum(1 for l in loans if l.defaulted) / total * 100, 1)

    # Per loan type
    from collections import defaultdict
    type_map = defaultdict(list)
    for l in loans:
        type_map[l.loan_type].append(l)

    type_breakdown = sorted([
        {
            "loan_type":         lt,
            "count":             len(items),
            "avg_amount":        round(sum(i.requested_amount for i in items) / len(items)),
            "avg_tenure_months": round(sum(i.tenure_months for i in items) / len(items)),
            "default_rate":      round(sum(1 for i in items if i.defaulted) / len(items) * 100, 1),
        }
        for lt, items in type_map.items()
    ], key=lambda x: -x["count"])

    # Risk distribution by default_probability_true
    bands = {"Low Risk (<15%)": 0, "Medium Risk (15-35%)": 0, "High Risk (>35%)": 0}
    for l in loans:
        p = l.default_probability_true or 0
        if   p < 0.15: bands["Low Risk (<15%)"]     += 1
        elif p < 0.35: bands["Medium Risk (15-35%)"] += 1
        else:          bands["High Risk (>35%)"]     += 1
    risk_dist = [{"band": k, "count": v} for k, v in bands.items()]

    return {
        "total_loans":         total,
        "portfolio_value":     round(portfolio, 2),
        "avg_loan_amount":     avg_amount,
        "overall_default_rate": default_rate,
        "type_breakdown":      type_breakdown,
        "risk_distribution":   risk_dist,
    }


@router.get("/marketing-prospects")
def marketing_prospects(
    segment: str = "high_value",
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Return customers for a segment with their top AI recommendation."""
    query = db.query(models.Customer)

    if segment == "high_value":
        query = query.filter(models.Customer.monthly_income > 100000)
    elif segment == "credit_card":
        query = query.filter(models.Customer.credit_score > 700)
    elif segment == "loan":
        # Customers with a pending loan
        pending_ids = db.query(models.Loan.customer_id).filter_by(loan_status="Pending").subquery()
        query = query.filter(models.Customer.customer_id.in_(pending_ids))

    customers = query.limit(limit).all()

    prospects = []
    for c in customers:
        recs = recommendation_service.get_recommendations(db, c.customer_id)
        top  = recs["recommendations"][0] if recs and recs["recommendations"] else None
        prospects.append({
            "customer_id":         c.customer_id,
            "name":                c.name,
            "city":                c.city,
            "credit_score":        c.credit_score,
            "monthly_income":      c.monthly_income,
            "recommended_product": top["product"] if top else None,
            "confidence":          round(top["score"] * 100, 1) if top else None,
        })

    return {"segment": segment, "total": len(prospects), "prospects": prospects}


@router.get("/model-metrics")
def model_metrics():
    """Return the saved loan model evaluation metrics."""
    if not MODEL_METRICS_PATH.exists():
        return {"available": False, "detail": "Model not trained yet. Run ai/loan_prediction/train.py"}

    with open(MODEL_METRICS_PATH) as f:
        metrics = json.load(f)

    # Separate version/split info from evaluation metrics
    eval_keys = {"accuracy", "precision", "recall", "f1", "roc_auc"}
    eval_metrics = {k: v for k, v in metrics.items() if k in eval_keys}

    return {
        "available": True,
        "model":     "LoanRiskNet v2 (PyTorch MLP)",
        "version":   metrics.get("version", "v1"),
        "n_train":   metrics.get("n_train"),
        "n_val":     metrics.get("n_val"),
        "n_test":    metrics.get("n_test"),
        "metrics":   eval_metrics,
    }
