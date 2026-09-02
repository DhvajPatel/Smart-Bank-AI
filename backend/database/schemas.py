from pydantic import BaseModel
from typing import List, Optional


class FinancialHealthResponse(BaseModel):
    customer_id: str
    monthly_income: float
    monthly_spending: float
    savings: float
    savings_ratio: float
    debt_to_income: float
    financial_health_score: int
    rating: str


class SpendCategoryBreakdown(BaseModel):
    category: str
    amount: float
    pct_of_total: float


class SpendAnalysisResponse(BaseModel):
    customer_id: str
    period_months: int
    total_spent: float
    breakdown: List[SpendCategoryBreakdown]
    insights: List[str]


class LoanPredictRequest(BaseModel):
    customer_id: Optional[str] = None
    loan_type: Optional[str] = None
    monthly_income: float
    credit_score: int
    employment_years: float
    requested_amount: float
    tenure_months: int
    existing_debt: float


class LoanPredictResponse(BaseModel):
    approval_probability: float
    default_probability: float
    risk_level: str
    recommended_amount: float
    recommended_tenure: int
    explanation: List[str]


class RecommendationItem(BaseModel):
    product: str
    score: float
    reason: List[str]


class RecommendationResponse(BaseModel):
    customer_id: str
    recommendations: List[RecommendationItem]
