"""
SmartBank AI - FastAPI backend entrypoint.

Run:
    cd backend
    python load_data.py        # one-time: load CSVs into the DB
    uvicorn main:app --reload  # start the API server

Then open http://127.0.0.1:8000/docs for interactive Swagger docs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import customers, analytics, loans, recommendations, admin

app = FastAPI(
    title="SmartBank AI",
    description="AI-Powered Banking Intelligence Platform - Finance Analytics, "
                "Loan Risk Prediction, Spend Analysis & Personalized Recommendations.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(analytics.router)
app.include_router(loans.router)
app.include_router(recommendations.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "message": "SmartBank AI backend is running.",
        "docs": "/docs",
        "modules": ["customers", "analytics", "loans", "recommendations", "admin"],
    }
