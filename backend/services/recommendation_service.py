"""
AI Credit Card & Banking Product Recommendation Engine.

Phase-1 implementation: an explainable, weighted scoring model
(matches the plan doc's Recommendation Score formula in section 22).
This is intentionally rule-based and transparent - a good baseline
before swapping in the neural recommender (ai/recommendation/).
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models
from services.finance_service import get_spend_analysis, get_financial_health

PRODUCT_RULES = {
    "Travel Credit Card": {"trigger_category": "Travel", "min_income": 30000, "min_credit": 680},
    "Fuel Credit Card": {"trigger_category": "Fuel", "min_income": 20000, "min_credit": 650},
    "Cashback Credit Card": {"trigger_category": "Shopping", "min_income": 20000, "min_credit": 650},
    "Premium Banking Account": {"trigger_category": None, "min_income": 150000, "min_credit": 750},
    "Personal Loan": {"trigger_category": None, "min_income": 25000, "min_credit": 600},
    "Fixed Deposit": {"trigger_category": None, "min_income": 0, "min_credit": 0, "needs_high_savings": True},
    "Investment Plan (Mutual Fund SIP)": {"trigger_category": None, "min_income": 40000, "min_credit": 0, "needs_high_savings": True},
    "Term Insurance": {"trigger_category": None, "min_income": 25000, "min_credit": 0},
}


def get_recommendations(db: Session, customer_id: str, top_k: int = 4):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        return None

    spend = get_spend_analysis(db, customer_id, months=3)
    health = get_financial_health(db, customer_id)
    spend_by_cat = {b["category"]: b["amount"] for b in spend["breakdown"]}
    total_spend = spend["total_spent"] or 1

    has_card = db.query(models.CreditCard).filter_by(customer_id=customer_id).count() > 0

    results = []
    for product, rule in PRODUCT_RULES.items():
        if "Credit Card" in product and has_card:
            continue  # don't push a card on someone who already has one, for this simple demo

        income_match = min(1.0, customer.monthly_income / max(rule["min_income"], 1)) if rule["min_income"] else 1.0
        income_match = min(income_match, 1.5) / 1.5

        credit_eligibility = 1.0 if customer.credit_score >= rule["min_credit"] else max(
            0, (customer.credit_score - 300) / max(rule["min_credit"] - 300, 1)
        )

        cat = rule.get("trigger_category")
        spending_match = (spend_by_cat.get(cat, 0) / total_spend) if cat else 0.3
        spending_match = min(1.0, spending_match * 3)  # amplify category signal

        savings_ratio = health["savings_ratio"] if health else 0
        savings_match = min(1.0, savings_ratio * 2) if rule.get("needs_high_savings") else 0.5

        financial_health_norm = (health["financial_health_score"] / 100) if health else 0.5

        score = (
            0.25 * spending_match
            + 0.20 * income_match
            + 0.20 * credit_eligibility
            + 0.15 * savings_match
            + 0.10 * financial_health_norm
            + 0.10 * 0.5  # placeholder for customer-segment component (Phase 5)
        )

        if customer.monthly_income < rule["min_income"] or customer.credit_score < rule["min_credit"] * 0.7:
            continue  # not eligible enough to surface

        reasons = []
        if cat and spend_by_cat.get(cat, 0) > 0:
            reasons.append(f"High {cat.lower()} spending ({round(spend_by_cat[cat] / total_spend * 100)}% of monthly spend)")
        if customer.credit_score >= rule["min_credit"]:
            reasons.append("Credit score meets product eligibility")
        if health and health["financial_health_score"] >= 70:
            reasons.append("Strong overall financial health")
        if rule.get("needs_high_savings") and savings_ratio > 0.2:
            reasons.append("Healthy savings ratio")
        if not reasons:
            reasons.append("Meets baseline eligibility criteria")

        results.append({
            "product": product,
            "score": round(min(score, 0.99), 4),
            "reason": reasons,
        })

    results.sort(key=lambda r: -r["score"])
    return {"customer_id": customer_id, "recommendations": results[:top_k]}
