"""
Finance Intelligence service.

Implements:
  - Financial Health Score (0-100), per the weighting scheme in the plan doc
  - Customer Spend Analyzer with category breakdown + rule-based AI insights
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models


def get_financial_health(db: Session, customer_id: str):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        return None

    # Monthly spend = average of last 3 months of debit transactions
    cutoff = (datetime(2026, 8, 1) - timedelta(days=90)).date().isoformat()
    debit_total = (
        db.query(func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.customer_id == customer_id,
            models.Transaction.transaction_type == "Debit",
            models.Transaction.date >= cutoff,
        )
        .scalar()
    ) or 0.0
    monthly_spending = debit_total / 3

    income = customer.monthly_income
    savings = max(income - monthly_spending, 0)
    savings_ratio = savings / income if income else 0

    loan = (
        db.query(models.Loan)
        .filter_by(customer_id=customer_id)
        .order_by(models.Loan.loan_id.desc())
        .first()
    )
    existing_debt = loan.existing_debt if loan else 0
    dti = existing_debt / income if income else 0

    # --- Weighted scoring (matches plan doc section 9) ---
    income_stability_score = min(100, (customer.employment_years / 15) * 100)
    savings_score = min(100, savings_ratio * 200)  # 50% savings ratio -> 100
    debt_score = max(0, 100 - dti * 300)
    spending_score = max(0, 100 - max(0, (monthly_spending / income - 0.6)) * 250) if income else 50
    credit_score_component = min(100, max(0, (customer.credit_score - 300) / 6))
    balance_score = min(100, (savings / max(income, 1)) * 100)

    score = (
        0.20 * income_stability_score
        + 0.20 * savings_score
        + 0.20 * debt_score
        + 0.15 * spending_score
        + 0.15 * credit_score_component
        + 0.10 * balance_score
    )
    score = round(max(0, min(100, score)))

    if score >= 80:
        rating = "Excellent"
    elif score >= 65:
        rating = "Good"
    elif score >= 45:
        rating = "Fair"
    else:
        rating = "Needs Attention"

    return {
        "customer_id": customer_id,
        "monthly_income": income,
        "monthly_spending": round(monthly_spending, 2),
        "savings": round(savings, 2),
        "savings_ratio": round(savings_ratio, 4),
        "debt_to_income": round(dti, 4),
        "financial_health_score": score,
        "rating": rating,
    }


def get_spend_analysis(db: Session, customer_id: str, months: int = 3):
    cutoff = (datetime(2026, 8, 1) - timedelta(days=30 * months)).date().isoformat()
    prev_cutoff = (datetime(2026, 8, 1) - timedelta(days=60 * months)).date().isoformat()

    rows = (
        db.query(models.Transaction.category, func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.customer_id == customer_id,
            models.Transaction.transaction_type == "Debit",
            models.Transaction.date >= cutoff,
        )
        .group_by(models.Transaction.category)
        .all()
    )
    total = sum(amt for _, amt in rows) or 1
    breakdown = sorted(
        [{"category": cat, "amount": round(amt, 2), "pct_of_total": round(amt / total * 100, 1)}
         for cat, amt in rows],
        key=lambda r: -r["amount"],
    )

    # Compare this period vs previous period, per category, for rule-based insights
    prev_rows = dict(
        db.query(models.Transaction.category, func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.customer_id == customer_id,
            models.Transaction.transaction_type == "Debit",
            models.Transaction.date >= prev_cutoff,
            models.Transaction.date < cutoff,
        )
        .group_by(models.Transaction.category)
        .all()
    )

    insights = []
    for item in breakdown[:6]:
        cat = item["category"]
        prev_amt = prev_rows.get(cat, 0)
        if prev_amt and prev_amt > 0:
            pct_change = (item["amount"] - prev_amt) / prev_amt * 100
            if pct_change > 20:
                insights.append(f"⚠ {cat} spending increased {round(pct_change)}% vs. the previous period.")
            elif pct_change < -15:
                insights.append(f"✓ {cat} spending decreased {round(abs(pct_change))}% vs. the previous period.")

    if breakdown:
        top = breakdown[0]
        if top["pct_of_total"] > 30:
            potential_saving = round(top["amount"] * 0.15, -1)
            insights.append(
                f"💡 {top['category']} is your largest expense ({top['pct_of_total']}% of spending). "
                f"Reducing it by 15% could save about ₹{potential_saving:,.0f}/month."
            )

    if not insights:
        insights.append("No major spending shifts detected this period.")

    return {
        "customer_id": customer_id,
        "period_months": months,
        "total_spent": round(total, 2),
        "breakdown": breakdown,
        "insights": insights,
    }
