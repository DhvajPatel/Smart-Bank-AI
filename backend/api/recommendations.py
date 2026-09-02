from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.schemas import RecommendationResponse
from services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/{customer_id}", response_model=RecommendationResponse)
def recommendations(customer_id: str, db: Session = Depends(get_db)):
    result = recommendation_service.get_recommendations(db, customer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result
