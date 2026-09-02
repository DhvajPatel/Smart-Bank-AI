from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.schemas import FinancialHealthResponse, SpendAnalysisResponse
from services import finance_service
from database import models
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/financial-health/{customer_id}", response_model=FinancialHealthResponse)
def financial_health(customer_id: str, db: Session = Depends(get_db)):
    result = finance_service.get_financial_health(db, customer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result


@router.get("/spending/{customer_id}", response_model=SpendAnalysisResponse)
def spending(customer_id: str, months: int = 3, db: Session = Depends(get_db)):
    result = finance_service.get_spend_analysis(db, customer_id, months=months)
    return result


@router.get("/spending-trend/{customer_id}")
def spending_trend(customer_id: str, months: int = 6, db: Session = Depends(get_db)):
    """Return monthly debit totals for the last N months — used for the sparkline chart."""
    today = datetime(2026, 8, 1)
    result = []
    for i in range(months - 1, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        if i == 0:
            month_end = today
        else:
            month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

        total = (
            db.query(func.sum(models.Transaction.amount))
            .filter(
                models.Transaction.customer_id == customer_id,
                models.Transaction.transaction_type == "Debit",
                models.Transaction.date >= month_start.date().isoformat(),
                models.Transaction.date < month_end.date().isoformat(),
            )
            .scalar()
        ) or 0.0

        result.append({
            "month": month_start.strftime("%b"),
            "spending": round(total, 2),
        })
    return {"trend": result}


@router.get("/risk-distribution")
def risk_distribution(db: Session = Depends(get_db)):
    """Credit score risk band counts for pie/donut charts."""
    rows = db.query(models.Customer.credit_score).all()
    bands = {"Low": 0, "Medium": 0, "Elevated": 0, "High": 0}
    for (score,) in rows:
        if score >= 750:
            bands["Low"] += 1
        elif score >= 650:
            bands["Medium"] += 1
        elif score >= 550:
            bands["Elevated"] += 1
        else:
            bands["High"] += 1
    return [{"name": k, "value": v} for k, v in bands.items()]
