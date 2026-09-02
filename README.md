# 🏦 SmartBank AI — AI-Powered Banking Intelligence Platform

An advanced "Bank Management" project built around **Deep Learning**, not CRUD:
customer data → financial behavior → DL predictions → personalized banking
recommendations → explainable dashboard.

**Status of this build:** Phases 1–3 (+ a working slice of Phases 6, 7 and 8)
are implemented and tested end-to-end. See the roadmap at the bottom for what's next.

| Module | What it does | Tech |
|---|---|---|
| Finance Intelligence | Financial Health Score (0–100), income/spend/savings ratios | Rule-based scoring |
| Customer Spend Analyzer | Category breakdown + period-over-period AI insights | SQL aggregation + rules |
| Loan Risk Prediction | Approval / default probability, risk level, explanation | **PyTorch MLP (trained)** |
| Product Recommendation | Credit card / loan / investment matching with reasons | Weighted scoring engine |
| Admin/Marketing Dashboard | Portfolio-wide stats and customer segments | SQL aggregation |

---

## 1. Project structure

```
smart-bank-ai/
├── backend/                 FastAPI app
│   ├── main.py               entrypoint - run this with uvicorn
│   ├── load_data.py           loads CSVs into the DB (run once)
│   ├── database/
│   │   ├── connection.py      SQLAlchemy engine (SQLite by default)
│   │   ├── models.py          ORM tables
│   │   └── schemas.py         Pydantic response models
│   ├── api/                   route handlers (customers, analytics, loans, recommendations, admin)
│   ├── services/               business logic + model inference
│   └── requirements.txt
│
├── ai/                       Everything Deep-Learning related
│   ├── data/
│   │   ├── generate_synthetic_data.py   creates all datasets
│   │   └── raw/                          generated CSVs land here
│   ├── loan_prediction/
│   │   ├── model.py           LoanRiskNet (MLP architecture)
│   │   └── train.py           training script -> saves ai/models/loan_model.pt
│   ├── spending/               (Phase 4 - LSTM forecaster, stub for you to build next)
│   ├── recommendation/         (Phase 6 - neural recommender, stub for you to build next)
│   └── models/                 trained weights + metrics land here
│
├── frontend/                 (Phase 8-9 - React dashboard, not yet built)
├── datasets/
└── notebooks/                 for experimentation in Colab/Jupyter
```

---

## 2. Quick start (what's runnable right now)

### Step 1 — Install dependencies
```bash
cd smart-bank-ai/backend
pip install -r requirements.txt
```

### Step 2 — Generate the synthetic dataset
This creates ~6,000 customers, ~1.4M transactions, ~2,100 loan applications,
~2,400 credit cards, and product-interaction data — all synthetic, no external
downloads needed.
```bash
cd ../ai/data
python generate_synthetic_data.py --customers 6000 --months 6 --seed 42
```
Output goes to `ai/data/raw/*.csv`.

### Step 3 — Train the Loan Risk Deep Learning model
```bash
cd ../loan_prediction
python train.py
```
This trains a PyTorch MLP (`Dense(128)→BN→ReLU→Dropout→Dense(64)→ReLU→Dropout→Dense(32)→Dense(1)→Sigmoid`)
on the synthetic loan labels, with class-imbalance handling (`pos_weight`) and
a `ReduceLROnPlateau` scheduler. It saves:
- `ai/models/loan_model.pt` — trained weights
- `ai/models/loan_scaler.pkl` — feature scaler (needed at inference time)
- `ai/models/loan_metrics.json` — accuracy / precision / recall / F1 / ROC-AUC

On this synthetic dataset it currently reaches **ROC-AUC ≈ 0.63–0.66**. That's
a reasonable baseline for a noisy synthetic label — see "Improving the model"
below for how to push it higher for your submission.

### Step 4 — Load data into the database
```bash
cd ../../backend
python load_data.py
```
Uses SQLite (`smartbank.db`) with zero setup. To point at PostgreSQL instead,
just set `DATABASE_URL` before running:
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/smartbank"
```

### Step 5 — Run the API
```bash
uvicorn main:app --reload
```
Open **http://127.0.0.1:8000/docs** for interactive Swagger docs where you can
try every endpoint.

### Try it
```bash
# Pick any customer_id from ai/data/raw/customers.csv, e.g. C100000
curl http://127.0.0.1:8000/customers/C100000/360

curl -X POST http://127.0.0.1:8000/loans/predict \
  -H "Content-Type: application/json" \
  -d '{"monthly_income": 80000, "credit_score": 760, "employment_years": 5,
       "requested_amount": 800000, "tenure_months": 60, "existing_debt": 10000}'

curl http://127.0.0.1:8000/admin/statistics
```

---

## 3. API reference (what's live)

| Endpoint | Method | Purpose |
|---|---|---|
| `/customers/{id}` | GET | Basic profile |
| `/customers/{id}/360` | GET | Combined dashboard: health + spending + recommendations |
| `/analytics/financial-health/{id}` | GET | Financial Health Score |
| `/analytics/spending/{id}?months=3` | GET | Category breakdown + AI insights |
| `/loans/predict` | POST | Deep-learning loan risk inference |
| `/recommendations/{id}` | GET | Top matched banking products with reasons |
| `/admin/statistics` | GET | Portfolio-wide counts |
| `/admin/marketing-segments` | GET | High-value / prospect segment counts |

---

## 4. Improving the loan model for your submission

The current AUC (~0.65) is realistic for a *noisy* synthetic label — good
enough to prove the pipeline, but you'll want more for a report/demo. Easy wins:

1. **More data**: bump `--customers` to 15,000–20,000 when generating data (loans
   scale with customer count). Re-run `train.py`.
2. **Reduce label noise**: in `ai/data/generate_synthetic_data.py`, lower the
   `rng.normal(0, 0.5)` noise term in `gen_loans()` — smaller noise = a cleaner,
   more learnable signal (but also a less realistic dataset — there's a
   deliberate trade-off here for your report to discuss).
3. **Swap in a real dataset**: for a more credible academic submission, download
   a public loan-default dataset (e.g. Lending Club, or the Kaggle "Loan
   Prediction" dataset), map its columns to `FEATURE_COLUMNS` in
   `ai/loan_prediction/model.py`, and retrain. This is the "Dataset strategy"
   phase from the original plan (Section 33).
4. **Add SHAP explainability** (Phase 7): `pip install shap`, then use
   `shap.DeepExplainer` on `LoanRiskNet` to replace the current rule-based
   `explanation` list with real per-feature contribution values.

---

## 5. Roadmap — what to build next (in order)

This build covers Phases 1–3 solidly, with early slices of 6/7/8. Continue with:

- **Phase 4 — Spending AI**: LSTM in `ai/spending/` forecasting next-7-day
  spend per category from the 30-day transaction sequence (input tensors:
  `[batch, 30, n_features]`).
- **Phase 5 — Customer Intelligence**: Autoencoder + KMeans on customer
  features (income, spend, savings, credit) for segmentation, feeding into
  `/admin/marketing-segments`.
- **Phase 6 — Neural Recommender**: replace `recommendation_service.py`'s
  rule-based scorer with a two-tower embedding model trained on
  `product_interactions.csv` (customer embedding × product embedding →
  compatibility score).
- **Phase 7 — Explainability**: SHAP on the loan model (see above).
- **Phase 8 — Frontend**: React + Tailwind + Recharts dashboard consuming
  this API — customer view (`/dashboard`, `/spending`, `/recommendations`) and
  admin view (`/admin/customers`, `/admin/risk`, `/admin/marketing`).
- **Phase 9 — Security**: JWT auth (`/auth/register`, `/auth/login`), RBAC for
  admin vs. customer roles, rate limiting.
- **Phase 10 — Deployment**: frontend → Vercel, backend → Render/Railway,
  database → managed Postgres.

---

## 6. Notes on the data

All data in `ai/data/raw/*.csv` is **synthetic**, generated by
`generate_synthetic_data.py` with realistic correlations baked in (income ↔
credit score ↔ spending ↔ default risk), plus rare injected anomalies for a
future fraud/anomaly-detection module. No real customer data is used anywhere,
which is the right approach for a college project — never substitute real
banking/financial records for demo data.







########################################################################################
                                                                                       #
#________________SmartBank AI — Complete Project Documentation_________________________#
                                                                                       #
########################################################################################

> A full-stack AI-powered banking intelligence platform built with React, FastAPI, PyTorch, and Scikit-Learn.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Architecture](#3-project-architecture)
4. [Dataset & Data Generation](#4-dataset--data-generation)
5. [AI Models — Deep Learning & Machine Learning](#5-ai-models--deep-learning--machine-learning)
6. [Model Training — Step by Step](#6-model-training--step-by-step)
7. [Backend API — All Endpoints](#7-backend-api--all-endpoints)
8. [Frontend — Pages & Features](#8-frontend--pages--features)
9. [How to Run the Project](#9-how-to-run-the-project)
10. [Project Phases — PPT Presentation Plan](#10-project-phases--ppt-presentation-plan)

---

## 1. Project Overview

**SmartBank AI** is an AI-powered banking intelligence dashboard that simulates a real-world bank's internal analytics platform. It has three types of users:

| Role | What They See |
|------|--------------|
| **Admin** | Full bank-wide analytics — customer distributions, loan portfolio, marketing intelligence, AI model metrics, customer search |
| **Employee** | Customer lookup, financial health, spending analysis, loan risk prediction, AI recommendations |
| **Customer** | Their own dashboard — personal finance health, spending, loan calculator, product recommendations |

The platform combines **deep learning** (PyTorch MLP), **gradient boosting** (Scikit-Learn GBR), and **rule-based AI** (scoring engine) to deliver real-time banking intelligence.

---

## 2. Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Page & component animations |
| **Recharts** | Charts and data visualizations |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP API calls |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | REST API framework (Python) |
| **SQLAlchemy** | ORM — database models & queries |
| **SQLite** | Database (`smartbank.db`) |
| **Pydantic** | Request/response schema validation |
| **Uvicorn** | ASGI server |

### AI / ML
| Technology | Purpose |
|------------|---------|
| **PyTorch** | Deep Learning — MLP neural network |
| **Scikit-Learn** | Gradient Boosting Regressor, StandardScaler, metrics |
| **NumPy** | Numerical computing, feature engineering |
| **Pandas** | Data manipulation & CSV processing |

---

## 3. Project Architecture

```
smart-bank-ai/
│
├── frontend/                   ← React SPA (Vite)
│   ├── public/
│   │   └── smart bank ai icon.png
│   └── src/
│       ├── components/
│       │   ├── layout/         ← AppShell, Sidebar, Topbar, MobileNav
│       │   ├── cards/          ← StatCard, RecommendationCard, RiskCard
│       │   └── common/         ← Loading, ErrorState, AnimatedPage
│       ├── pages/
│       │   ├── admin/          ← Dashboard, Analytics, LoanAnalytics, Marketing, SystemOverview
│       │   ├── employee/       ← Dashboard, Customers, Customer360, Finance, Spending, LoanPrediction
│       │   ├── customer/       ← CustomerDashboard
│       │   └── auth/           ← Login
│       ├── context/            ← AuthContext (user session)
│       ├── services/
│       │   └── api.js          ← All Axios API calls
│       └── routes/
│           └── AppRoutes.jsx   ← Protected route tree
│
├── backend/                    ← FastAPI Python server
│   ├── main.py                 ← App entry point, CORS, router registration
│   ├── api/
│   │   ├── customers.py        ← Customer CRUD + 360° view + transactions/loans/cards
│   │   ├── analytics.py        ← Financial health, spending analysis
│   │   ├── loans.py            ← Loan risk prediction endpoint
│   │   ├── recommendations.py  ← Product recommendations
│   │   └── admin.py            ← Statistics, analytics, marketing, model metrics
│   ├── database/
│   │   ├── connection.py       ← SQLAlchemy engine & session
│   │   ├── models.py           ← ORM table definitions
│   │   └── schemas.py          ← Pydantic request/response models
│   └── services/
│       ├── finance_service.py      ← Financial Health Score, Spend Analyzer
│       ├── loan_service.py         ← Model inference (GBR + MLP ensemble)
│       └── recommendation_service.py ← Rule-based product recommendation engine
│
└── ai/                         ← Machine Learning pipeline
    ├── data/
    │   ├── generate_synthetic_data.py  ← Dataset generator (NumPy/Pandas)
    │   └── raw/                        ← Generated CSVs (10,000 customers)
    ├── loan_prediction/
    │   ├── model.py            ← LoanRiskNet (PyTorch MLP) + FEATURE_COLUMNS
    │   └── train.py            ← Full training pipeline V3
    └── models/                 ← Saved model artefacts
        ├── loan_model.pt       ← MLP weights (PyTorch)
        ├── loan_scaler.pkl     ← StandardScaler (Scikit-Learn)
        ├── loan_ensemble.pkl   ← GBR model + threshold + blend weights
        └── loan_metrics.json   ← Evaluation metrics on held-out test set
```

---

## 4. Dataset & Data Generation

All data is **fully synthetic** — generated using `ai/data/generate_synthetic_data.py` with NumPy and Pandas only. No real customer data is used.

### Dataset Scale
| Table | Rows | Description |
|-------|------|-------------|
| `customers.csv` | 10,000 | Customer profiles — age, income, credit score, occupation, city |
| `accounts.csv` | ~13,000 | Bank accounts (savings, current, salary, premium) |
| `transactions.csv` | ~500,000 | 6 months of debit/credit transactions across 13 categories |
| `loans.csv` | 3,500 | Loan applications with true default probability labels |
| `credit_cards.csv` | ~4,000 | Credit card accounts with limits and usage |
| `product_interactions.csv` | ~25,000 | Product view/click/apply/approve/use events |

### How Data is Generated
1. **Customers** — Names drawn from Indian first/last name banks. Income is generated using `rng.normal(55000, 20000)` multiplied by an occupation factor (e.g. Business Owner ×1.6, Student ×0.15). Credit score is correlated with income: `clip(normal(680, 80) + income/200000 * 30, 300, 900)`.

2. **Transactions** — Each customer gets a Dirichlet-sampled spending personality (different category weights). Weekend transactions are amplified 1.4×. Salary credits are added monthly. 1.5% of customers have an anomaly (unusually large transaction).

3. **Loans** — A logistic function generates `default_probability_true`:
   ```
   risk_score = -1.8
              - 0.006 × (credit_score - 650)
              + 2.5 × debt_to_income_ratio
              + 0.10 × loan_to_income_ratio
              - 0.03 × employment_years
              + Normal(0, 0.25)   ← random noise
   
   default_probability = sigmoid(risk_score)
   defaulted = Bernoulli(default_probability)
   ```
   This produces ~15.3% default rate, matching real-world banking data.

---

## 5. AI Models — Deep Learning & Machine Learning

### 5.1 Loan Risk Prediction Model (V3)

This is the core deep learning component. It predicts the probability that a loan applicant will default.

#### Why This Problem is Hard
The hard binary label (`defaulted`: 0 or 1) has very weak correlation with features (max −0.18 with credit score). However, `default_probability_true` (the ground truth probability) has **−0.64 correlation** with credit score — 3.5× stronger. This insight drives the entire V3 training strategy.

#### Model Architecture

**Model 1: Gradient Boosting Regressor (Primary)**
```
Algorithm   : sklearn GradientBoostingRegressor
Target      : default_probability_true  ← soft labels (not hard 0/1)
Trees       : 1,000
Learning Rate: 0.02
Max Depth   : 4
Min Samples Leaf: 10
Subsample   : 70%
Max Features: sqrt
```

**Model 2: LoanRiskNet — PyTorch MLP (Secondary)**
```
Input (21 features)
       ↓
Linear(21 → 256) → BatchNorm1d → GELU → Dropout(0.35)
       ↓
Linear(256 → 128) → BatchNorm1d → GELU → Dropout(0.25)
       ↓
Linear(128 → 64) → BatchNorm1d → GELU → Dropout(0.15)
       ↓
Linear(64 → 32) → GELU
       ↓
Linear(32 → 1)  → raw logit → sigmoid → probability
```

**Final Ensemble:**
```
P(default) = 0.80 × GBR_probability + 0.20 × MLP_probability
```

#### Feature Engineering (21 Features)

| Feature | Formula | Why |
|---------|---------|-----|
| `credit_score` | raw | Strongest predictor (corr −0.18 hard / −0.64 soft) |
| `monthly_income` | raw | Income capacity |
| `employment_years` | raw | Job stability |
| `existing_debt` | raw | Current obligations |
| `requested_amount` | raw | Loan size |
| `tenure_months` | raw | Repayment period |
| `dti` | existing_debt / income | Debt-to-income ratio |
| `lti` | amount / (income × tenure) | Loan burden per month |
| `debt_per_emp` | existing_debt / employment_years | Debt relative to career length |
| `monthly_obl` | amount / tenure | Monthly repayment amount |
| `obl_ratio` | monthly_obl / income | Affordability ratio |
| `credit_sq` | credit_score² / 1000 | Non-linear credit signal |
| `score_x_emp` | credit_score × employment_years / 100 | Interaction feature |
| `log_income` | log(1 + income) | Normalise skewed income |
| `log_debt` | log(1 + debt) | Normalise skewed debt |
| `log_amount` | log(1 + amount) | Normalise skewed loan amount |
| `lt_Business Loan` | one-hot | Business loan type flag |
| `lt_Education Loan` | one-hot | Education loan type flag |
| `lt_Home Loan` | one-hot | Home loan type flag |
| `lt_Personal Loan` | one-hot | Personal loan type flag |
| `lt_Vehicle Loan` | one-hot | Vehicle loan type flag |

#### Model Performance (V3 vs V2)
| Metric | V2 (MLP only) | V3 (GBR+MLP) | Change |
|--------|--------------|-------------|--------|
| **Accuracy** | 0.6305 | **0.7657** | ▲ +13.5% |
| **Precision** | 0.2297 | **0.2871** | ▲ +5.7% |
| **Recall** | 0.5926 | 0.3625 | ▼ (less false positives) |
| **F1 Score** | 0.3310 | 0.3204 | ≈ similar |
| **ROC-AUC** | 0.6729 | **0.6731** | ▲ |
| **Threshold** | 0.50 (fixed) | **0.21 (tuned)** | Val F1 optimised |

> **Note on data ceiling:** The oracle AUC (using ground-truth probabilities) is 0.694. Our model at 0.673 is 97% of the theoretical maximum for this dataset. The recall tradeoff is intentional — V2's 59% recall came with 23% precision (3 out of 4 default predictions were wrong). V3 is better calibrated.

---

### 5.2 Financial Health Score (Rule-Based AI)

Computed in `backend/services/finance_service.py` using a **weighted scoring formula**:

```
Financial Health Score (0–100) =
  0.20 × income_stability_score   (employment_years / 15, capped at 100)
+ 0.20 × savings_score            (savings_ratio × 200, capped at 100)
+ 0.20 × debt_score               (100 − dti × 300)
+ 0.15 × spending_score           (penalises spending > 60% of income)
+ 0.15 × credit_score_component   ((credit_score − 300) / 6)
+ 0.10 × balance_score            (savings / income × 100)

Rating: Excellent (≥80), Good (≥65), Fair (≥45), Needs Attention (<45)
```

---

### 5.3 Product Recommendation Engine (Weighted Scoring AI)

Implemented in `backend/services/recommendation_service.py`.

For each product, a **composite score** is computed:
```
score =
  0.25 × spending_match      (does the customer spend in this category?)
+ 0.20 × income_match        (meets minimum income threshold?)
+ 0.20 × credit_eligibility  (credit score meets threshold?)
+ 0.15 × savings_match       (for FD/SIP products: does customer save?)
+ 0.10 × financial_health    (overall health score / 100)
+ 0.10 × segment_placeholder (reserved for future neural recommender)
```

Products covered: Travel Card, Fuel Card, Cashback Card, Premium Banking, Personal Loan, Fixed Deposit, Mutual Fund SIP, Term Insurance.

---

## 6. Model Training — Step by Step

### Prerequisites
```bash
pip install torch scikit-learn pandas numpy
```

### Step 1 — Generate the Dataset
```bash
cd ai/data
python generate_synthetic_data.py --customers 10000 --seed 42
```
Produces 6 CSV files in `ai/data/raw/`.

### Step 2 — Train the Loan Risk Model
```bash
cd ai/loan_prediction
python train.py
```

#### What happens inside `train.py`:

**Step 2a — Load & Engineer Features**
```python
df = pd.read_csv("loans.csv")
X  = feature_engineering(df)   # 21 engineered columns
y_hard = df["defaulted"]       # hard 0/1 labels
y_soft = df["default_probability_true"]  # smooth probability labels
```

**Step 2b — 70/15/15 Train/Val/Test Split**
```python
# Stratified by hard label to preserve class balance
X_tr, X_val, X_tst, y_h_tr, y_h_val, y_h_tst, y_s_tr, y_s_val = split_data(...)
```

**Step 2c — StandardScaler (fit ONLY on train)**
```python
scaler = StandardScaler()
X_tr_s = scaler.fit_transform(X_tr)   # fit here
X_val_s = scaler.transform(X_val)     # transform only
X_tst_s = scaler.transform(X_tst)    # transform only
```
> Fitting on the full dataset would cause **data leakage** — the model would get info about validation/test distributions before seeing them.

**Step 2d — Train GBR on Soft Labels**
```python
gbr = GradientBoostingRegressor(n_estimators=1000, learning_rate=0.02, ...)
gbr.fit(X_tr_s, y_soft_tr)   # ← soft probability targets, not hard 0/1
```

**Step 2e — Train MLP with Blended Loss**
```python
# Phase 1 (epoch 1–200): learns the smooth probability distribution
loss = MSELoss(sigmoid(logit), soft_target)

# Phase 2 (epoch 200–300): fine-tunes on actual outcomes
loss = BCEWithLogitsLoss(logit, hard_target)

# Blend: alpha decays 1→0 over 300 epochs
loss = alpha × soft_loss + (1−alpha) × hard_loss
```
- Optimizer: **AdamW** (lr=3e-4, weight_decay=1e-4)
- Scheduler: **Cosine Annealing LR** (T_max=400, eta_min=1e-6)
- Early stopping: **60 epochs** patience on validation AUC
- Class imbalance: `pos_weight = n_negatives / n_positives ≈ 5.52`

**Step 2f — Ensemble & Threshold Tuning**
```python
P(default) = 0.80 × GBR_prob + 0.20 × MLP_prob

# Find threshold that maximises F1 on validation set
for t in range(0.10, 0.60, 0.01):
    f1 = f1_score(y_val, (val_probs >= t))
# Best threshold ≈ 0.21
```

**Step 2g — Save Artefacts**
```
ai/models/loan_model.pt       ← MLP state_dict (PyTorch)
ai/models/loan_scaler.pkl     ← Fitted StandardScaler
ai/models/loan_ensemble.pkl   ← {"gbr": model, "threshold": 0.21, "gbr_w": 0.80}
ai/models/loan_metrics.json   ← Final test set metrics
```

### Step 3 — Load Data into Database
```bash
cd backend
python load_data.py
```
Reads all CSVs and inserts them into `smartbank.db` (SQLite).

---

## 7. Backend API — All Endpoints

Base URL: `http://127.0.0.1:8000`
Interactive docs: `http://127.0.0.1:8000/docs`

### Customer Endpoints — `/customers`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/customers` | List customers. Params: `limit`, `offset`, `search` (ID or name) |
| `GET` | `/customers/{id}` | Single customer profile + risk band |
| `GET` | `/customers/{id}/360` | Full 360° view: health + spending + recommendations |
| `GET` | `/customers/{id}/loan-profile` | Pre-fill data for loan calculator |
| `GET` | `/customers/{id}/transactions` | Paginated transaction history. Params: `limit`, `offset` |
| `GET` | `/customers/{id}/loans` | All loan records for a customer |
| `GET` | `/customers/{id}/credit-cards` | All credit card records |

**Risk Band Logic:**
```
credit_score ≥ 750 → Low Risk
credit_score ≥ 650 → Medium Risk
credit_score ≥ 550 → Elevated Risk
credit_score < 550 → High Risk
```

---

### Analytics Endpoints — `/analytics`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/analytics/financial-health/{id}` | Financial health score + breakdown |
| `GET` | `/analytics/spending/{id}` | Spend category breakdown. Param: `months` (default 3) |
| `GET` | `/analytics/spending-trend/{id}` | Month-over-month spending trend |

**Financial Health Response:**
```json
{
  "monthly_income": 84800,
  "monthly_spending": 42300,
  "savings": 42500,
  "savings_ratio": 0.5013,
  "debt_to_income": 0.129,
  "financial_health_score": 74,
  "rating": "Good"
}
```

---

### Loan Endpoints — `/loans`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/loans/predict` | Predict loan default risk using V3 ensemble |

**Request Body:**
```json
{
  "customer_id": "C100000",       // optional — for logging
  "loan_type": "Home Loan",       // optional — used in OHE features
  "monthly_income": 84800,
  "credit_score": 720,
  "employment_years": 5.5,
  "requested_amount": 2500000,
  "tenure_months": 120,
  "existing_debt": 12000
}
```

**Response:**
```json
{
  "approval_probability": 0.7823,
  "default_probability": 0.2177,
  "risk_level": "MEDIUM",
  "recommended_amount": 2500000,
  "recommended_tenure": 120,
  "explanation": [
    "Good credit score",
    "Stable long-term employment (≥5 years)",
    "Moderate existing debt obligations",
    "Loan type: Home Loan"
  ]
}
```

**How inference works:**
```python
raw_features = build_features(input)         # 21 engineered columns
scaled = scaler.transform(raw_features)      # StandardScaler

gbr_prob = gbr.predict(scaled)[0]            # GBR → soft probability
mlp_prob = sigmoid(mlp(scaled_tensor))       # MLP → logit → probability

default_prob = 0.80 × gbr_prob + 0.20 × mlp_prob

risk_level = "LOW"    if default_prob < threshold × 0.55
           = "MEDIUM" if default_prob < threshold × 1.30
           = "HIGH"   otherwise
```

---

### Recommendation Endpoints — `/recommendations`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/recommendations/{id}` | Top-4 product recommendations for a customer |

---

### Admin Endpoints — `/admin`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/statistics` | Bank-wide KPIs: total customers, active accounts, loan count, high-risk count, avg credit score, total deposits |
| `GET` | `/admin/customer-analytics` | Distributions: credit score, income, age, cities, occupations |
| `GET` | `/admin/loan-analytics` | Portfolio: total loans, value, default rate, breakdown by loan type |
| `GET` | `/admin/marketing-segments` | Segment counts: high-value, credit card prospects, loan prospects |
| `GET` | `/admin/marketing-prospects` | Customer list for a segment. Param: `segment` (high_value / credit_card / loan) |
| `GET` | `/admin/model-metrics` | V3 model evaluation metrics from `loan_metrics.json` |

---

## 8. Frontend — Pages & Features

### Admin Pages

| Page | Route | What it Shows |
|------|-------|--------------|
| Admin Overview | `/admin` | 6 KPI stat cards + bank health summary |
| Customers | `/admin/customers` | Searchable customer directory |
| Customer Detail | `/admin/customers/:id` | 4-tab profile: Overview, Transactions, Loans, Credit Cards |
| Analytics | `/admin/analytics` | 5 distribution charts (credit score, income, age, cities, occupations) |
| Loan Portfolio | `/admin/loans` | Portfolio stats + breakdown by loan type |
| Marketing Intelligence | `/admin/marketing` | Customer segments + prospect lists with AI recommendations |
| AI Models | `/admin/models` | V3 model metrics, status, version info |

### Employee Pages

| Page | Route | What it Shows |
|------|-------|--------------|
| Dashboard | `/employee` | Customer portfolio overview |
| Customers | `/employee/customers` | Search + directory |
| Customer 360° | `/employee/customers/:id` | Full profile with tabs |
| Finance | `/employee/finance` | Financial health deep-dive |
| Spending Analyzer | `/employee/spending` | Category breakdown + insights |
| Loan AI | `/employee/loans` | Interactive loan prediction calculator |
| Recommendations | `/employee/recommendations` | AI product suggestions |

### Customer Pages

| Page | Route | What it Shows |
|------|-------|--------------|
| My Dashboard | `/employee` | Personal health score, income vs spending, AI recommendations |
| My Profile | `/employee/customers/:id` | Own 360° profile with tabs |
| My Spending | `/employee/spending` | Personal spend analysis |
| Loan Calculator | `/employee/loans` | Self-service loan eligibility check |

### Global Topbar Search (Admin Only)
- **Debounced** — searches after 280ms pause (avoids spam API calls)
- **Live dropdown** — shows up to 6 matching customers with name, ID, city, credit score, risk band
- **Keyboard** — `Escape` closes the dropdown
- **Navigation** — click a result → goes directly to Customer 360° page

---

## 9. How to Run the Project

### 1. Generate Data (one-time)
```bash
cd ai/data
python generate_synthetic_data.py --customers 10000 --seed 42
```

### 2. Train the AI Model (one-time)
```bash
cd ai/loan_prediction
python train.py
```

### 3. Start the Backend
```bash
cd backend
pip install -r requirements.txt
python load_data.py       # one-time: load CSVs into SQLite
uvicorn main:app --reload
# Running at: http://127.0.0.1:8000
# Swagger docs: http://127.0.0.1:8000/docs
```

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Running at: http://localhost:5173
```

### 5. Login Credentials
```
Admin    → username: admin   / password: admin123
Employee → username: emp001  / password: emp123
Customer → use any customer ID (e.g. C100000) as both username and password
```

---

## 10. Project Phases — PPT Presentation Plan

> Each phase represents approximately 2 weeks of work. Use this as your update timeline for every 15-day presentation to your professor.

---

### Phase 1 — Project Foundation & Data Pipeline
**Duration:** Week 1–2  
**Theme:** *"Building the Brain of the Bank"*

**What was done:**
- Defined the full project scope and architecture
- Chose tech stack: React + FastAPI + PyTorch + SQLite
- Built `generate_synthetic_data.py` — created 10,000 realistic Indian banking customers with correlated data (income, credit score, employment, transactions, loans, credit cards)
- Implemented logistic-function-based `default_probability_true` column in loans data — this is the key label for the AI model
- Set up SQLAlchemy ORM models for all 6 tables
- Loaded all CSV data into SQLite database

**Key Slides:**
1. Problem Statement — why banks need AI
2. System Architecture Diagram
3. Dataset Overview — 10K customers, 500K transactions, 3.5K loans
4. Data Generation Logic — how synthetic data mimics real banking patterns
5. Database Schema (ER diagram style)

---

### Phase 2 — Backend API Development
**Duration:** Week 3–4  
**Theme:** *"The API Layer — Connecting Data to Intelligence"*

**What was done:**
- Built FastAPI backend with 5 router modules (customers, analytics, loans, recommendations, admin)
- Implemented `GET /customers` with search, pagination, and risk band calculation
- Built `GET /customers/{id}/360` — combined health + spending + recommendations in one call
- Built `GET /analytics/financial-health/{id}` — 6-component weighted scoring formula
- Built `GET /analytics/spending/{id}` — category breakdown with period-over-period insights
- Set up CORS for frontend communication
- Tested all endpoints via Swagger (`/docs`)

**Key Slides:**
1. REST API Architecture (router diagram)
2. Financial Health Score Formula — 6 components, weights, rating bands
3. Spending Analysis Logic — Dirichlet personality model, category aggregation
4. Risk Band Classification — credit score thresholds
5. Live Swagger demo screenshot

---

### Phase 3 — Deep Learning Model V1 & V2
**Duration:** Week 5–6  
**Theme:** *"Teaching the Machine to Predict Loan Risk"*

**What was done:**
- Designed and built `LoanRiskNet` — PyTorch MLP with 8 input features
- V1: Basic 3-layer MLP, fixed 0.5 threshold, trained on hard labels → Accuracy 63.8%
- V2 improvements: 70/15/15 stratified split (no data leakage), cosine annealing LR, `pos_weight` for class imbalance, early stopping on validation AUC
- V2 result: Accuracy 63.1%, ROC-AUC 0.673, but precision only 23%
- Discovered root cause: hard labels have only −0.18 correlation with features
- Built `loan_service.py` inference pipeline: loads model at startup, runs feature engineering at inference

**Key Slides:**
1. The Loan Default Problem — why it's hard (class imbalance, noisy labels)
2. LoanRiskNet Architecture Diagram (input → hidden layers → output)
3. Data Leakage Prevention — why scaler must fit on train only
4. Class Imbalance — pos_weight formula, effect on training
5. V2 Confusion Matrix + ROC Curve

---

### Phase 4 — Frontend Dashboard Development
**Duration:** Week 7–8  
**Theme:** *"Visualising Intelligence — The React Dashboard"*

**What was done:**
- Built complete React SPA with Vite and Tailwind CSS
- Implemented 3-role auth system (Admin, Employee, Customer) with `AuthContext`
- Built `AppShell` layout — Sidebar, Topbar, MobileNav, animated page transitions (Framer Motion)
- Built all Employee pages: Customers list, Customer 360° profile, Finance, Spending Analyzer, Loan Prediction calculator, Recommendations
- Built all Admin pages: Overview dashboard, Analytics with 5 charts (Recharts), Loan Portfolio, Marketing Intelligence, AI Models
- Built Customer self-service portal
- All pages connected to live FastAPI backend via Axios

**Key Slides:**
1. UI Architecture — component tree diagram
2. Role-Based Access Control — 3 portals, protected routes
3. Customer 360° Page — 4 tabs with live data
4. Analytics Charts — credit score & income distributions
5. Loan AI Calculator — live prediction demo

---

### Phase 5 — AI Model V3 + Feature Engineering
**Duration:** Week 9–10  
**Theme:** *"The Breakthrough — Soft Labels & Gradient Boosting"*

**What was done:**
- Root-cause analysis: `default_probability_true` has −0.64 corr with credit score vs −0.18 for hard label
- Expanded features from 8 → 21 (ratios, interactions, non-linear transforms, OHE)
- Switched primary model from MLP classifier → **GradientBoostingRegressor on soft labels**
- MLP upgraded: 256-128-64-32 with GELU, BatchNorm, blended soft→hard loss
- Weighted ensemble: 80% GBR + 20% MLP
- Threshold tuned on validation F1 (→ 0.21 vs fixed 0.5)
- V3 results: Accuracy +13.5%, Precision +5.7%, ROC-AUC matches theoretical ceiling (0.673 vs oracle 0.694)
- Updated `SystemOverview` page to show V3 metrics with model type

**Key Slides:**
1. The Soft Labels Insight — correlation comparison table (hard vs soft labels)
2. Feature Engineering Table — all 21 features with formulas
3. GBR on Soft Labels — why regression > classification here
4. MLP Blended Loss Diagram — alpha decay from soft→hard over 300 epochs
5. V2 vs V3 Comparison Table — all 5 metrics

---

### Phase 6 — Advanced Features & UX Polish
**Duration:** Week 11–12  
**Theme:** *"Production-Ready — Search, Tabs, and Loan Portfolio Drill-Down"*

**What was done:**
- **Global Customer Search** (Topbar, admin only) — debounced live search with dropdown, risk badges, direct navigation to Customer 360°
- **Customer 360° Tabs** — rebuilt with 4 tabs: Overview (health + spending + AI recs), Transactions (paginated), Loans (table with default risk), Credit Cards (utilisation bars)
- New backend endpoints: `GET /customers/{id}/transactions`, `GET /customers/{id}/loans`, `GET /customers/{id}/credit-cards`
- Loan Portfolio page — expandable customer list per loan type category
- **Custom app icon** — replaced Vite default with SmartBank AI PNG in sidebar and browser tab
- Search bar role-gating — only visible to admin users

**Key Slides:**
1. Global Search Architecture — debounce, API call, dropdown component
2. Customer 360° Before/After — single page vs 4-tab design
3. New API Endpoints — transactions, loans, credit cards
4. Loan Portfolio Category Drill-Down
5. Role-Based UI — admin vs employee vs customer view differences

---

### Phase 7 — Testing, Optimisation & Final Demo
**Duration:** Week 13–14 (Final Phase)  
**Theme:** *"From Prototype to Polished Platform"*

**What was done / planned:**
- End-to-end testing of all 3 user roles
- Performance: SQLite index on `customer_id` (all foreign keys), 30s API timeout for slow queries
- Model monitoring: `loan_metrics.json` surfaced live in `/admin/models` page
- Documentation complete (`PROJECT_DOCUMENTATION.md`)
- Final presentation preparation

**Key Slides:**
1. Full System Demo — live walkthrough of all 3 portals
2. AI Performance Dashboard — V3 metrics on screen
3. Architecture Summary — complete stack in one diagram
4. What We Learned — soft labels, data leakage, class imbalance, ensemble methods
5. Future Work — real bank data integration, XGBoost, transformer-based recommender, fraud detection module

---

## Summary Table — All Phases

| Phase | Weeks | Focus | Key Output |
|-------|-------|-------|-----------|
| 1 | 1–2 | Data Pipeline | 10K synthetic customers, 500K transactions, SQLite DB |
| 2 | 3–4 | Backend API | 20+ REST endpoints, Swagger docs |
| 3 | 5–6 | Deep Learning V1/V2 | LoanRiskNet MLP, 63% accuracy |
| 4 | 7–8 | Frontend Dashboard | React SPA, 3-role auth, all pages |
| 5 | 9–10 | AI Model V3 | GBR + soft labels, 76% accuracy, AUC 0.673 |
| 6 | 11–12 | UX & Search | 4-tab Customer 360°, global search, new endpoints |
| 7 | 13–14 | Testing & Docs | Final demo, this documentation |

---

*SmartBank AI — Built with React 19, FastAPI, PyTorch, Scikit-Learn*  
*Dataset: 10,000 synthetic Indian banking customers | Model: V3 GBR+MLP Ensemble*
