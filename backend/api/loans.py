from fastapi import APIRouter
from database.schemas import LoanPredictRequest, LoanPredictResponse
from services import loan_service

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post("/predict", response_model=LoanPredictResponse)
def predict_loan(payload: LoanPredictRequest):
    result = loan_service.predict_loan_risk(
        monthly_income=payload.monthly_income,
        credit_score=payload.credit_score,
        employment_years=payload.employment_years,
        requested_amount=payload.requested_amount,
        tenure_months=payload.tenure_months,
        existing_debt=payload.existing_debt,
        loan_type=payload.loan_type or "",
    )
    return result
