from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
from services import finance_service, recommendation_service

router = APIRouter(prefix="/customers", tags=["Customers"])


def _risk_band(credit_score: int) -> str:
    if credit_score >= 750:
        return "Low"
    if credit_score >= 650:
        return "Medium"
    if credit_score >= 550:
        return "Elevated"
    return "High"


@router.get("", include_in_schema=True)
def list_customers(
    limit: int = 20,
    offset: int = 0,
    search: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Customer)
    if search:
        term = f"%{search}%"
        query = query.filter(
            models.Customer.customer_id.ilike(term)
            | models.Customer.name.ilike(term)
        )
    total = query.count()
    customers = query.offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "customer_id": c.customer_id,
                "name": c.name,
                "age": c.age,
                "occupation": c.occupation,
                "monthly_income": c.monthly_income,
                "credit_score": c.credit_score,
                "employment_years": c.employment_years,
                "city": c.city,
                "risk_band": _risk_band(c.credit_score),
            }
            for c in customers
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ── All specific sub-routes MUST come before /{customer_id} ──────────────────

@router.get("/{customer_id}/loan-profile")
def customer_loan_profile(customer_id: str, db: Session = Depends(get_db)):
    """Returns fields needed to prefill the loan calculator for a customer."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    loan = (
        db.query(models.Loan)
        .filter_by(customer_id=customer_id)
        .order_by(models.Loan.loan_id.desc())
        .first()
    )
    existing_debt = round(loan.existing_debt, 2) if loan else 0.0
    return {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "monthly_income": customer.monthly_income,
        "credit_score": customer.credit_score,
        "employment_years": customer.employment_years,
        "existing_debt": existing_debt,
    }


@router.get("/{customer_id}/360")
def customer_360(customer_id: str, db: Session = Depends(get_db)):
    """Combines finance health + spend breakdown + recommendations."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    health = finance_service.get_financial_health(db, customer_id)
    spend  = finance_service.get_spend_analysis(db, customer_id, months=3)
    recs   = recommendation_service.get_recommendations(db, customer_id)
    return {
        "customer": {
            "customer_id": customer.customer_id,
            "name": customer.name,
            "age": customer.age,
            "occupation": customer.occupation,
            "credit_score": customer.credit_score,
            "monthly_income": customer.monthly_income,
            "city": customer.city,
            "employment_years": customer.employment_years,
            "risk_band": _risk_band(customer.credit_score),
        },
        "financial_health": health,
        "spending": spend,
        "recommendations": recs["recommendations"] if recs else [],
    }


@router.get("/{customer_id}/transactions")
def customer_transactions(
    customer_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Paginated transaction history for a customer."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    query = (
        db.query(models.Transaction)
        .filter_by(customer_id=customer_id)
        .order_by(models.Transaction.date.desc(), models.Transaction.transaction_id.desc())
    )
    total = query.count()
    txns = query.offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "transaction_id": t.transaction_id,
                "date": t.date,
                "amount": t.amount,
                "transaction_type": t.transaction_type,
                "category": t.category,
                "merchant": t.merchant,
                "payment_method": t.payment_method,
                "location": t.location,
            }
            for t in txns
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{customer_id}/loans")
def customer_loans(customer_id: str, db: Session = Depends(get_db)):
    """All loans for a customer."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    loans = (
        db.query(models.Loan)
        .filter_by(customer_id=customer_id)
        .order_by(models.Loan.loan_id.desc())
        .all()
    )
    return {
        "items": [
            {
                "loan_id": l.loan_id,
                "loan_type": l.loan_type,
                "requested_amount": l.requested_amount,
                "tenure_months": l.tenure_months,
                "loan_status": l.loan_status,
                "defaulted": bool(l.defaulted),
                "default_probability": round(l.default_probability_true or 0, 4),
                "existing_debt": l.existing_debt,
                "credit_score": l.credit_score,
            }
            for l in loans
        ],
        "total": len(loans),
    }


@router.get("/{customer_id}/credit-cards")
def customer_credit_cards(customer_id: str, db: Session = Depends(get_db)):
    """All credit cards for a customer."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    cards = (
        db.query(models.CreditCard)
        .filter_by(customer_id=customer_id)
        .all()
    )
    return {
        "items": [
            {
                "card_id": c.card_id,
                "card_type": c.card_type,
                "credit_limit": c.credit_limit,
                "used_amount": c.used_amount,
                "available_limit": c.available_limit,
                "reward_points": c.reward_points,
                "annual_fee": c.annual_fee,
                "status": c.status,
            }
            for c in cards
        ],
        "total": len(cards),
    }


# ── Generic single-customer lookup — MUST be last ────────────────────────────

@router.get("/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "age": customer.age,
        "occupation": customer.occupation,
        "monthly_income": customer.monthly_income,
        "credit_score": customer.credit_score,
        "employment_years": customer.employment_years,
        "city": customer.city,
        "risk_band": _risk_band(customer.credit_score),
    }
