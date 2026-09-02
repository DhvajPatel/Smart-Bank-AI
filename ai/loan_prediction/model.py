"""
Loan Risk Model — V3
=====================
Primary model  : GradientBoostingRegressor trained on default_probability_true
                 (soft labels — corr=-0.64 with credit_score vs only -0.18 for hard labels)
Secondary model: PyTorch MLP (LoanRiskNet) for blended ensemble
Final output   : weighted average of GBR + MLP probabilities

Root cause of V2 low accuracy
------------------------------
The hard 0/1 "defaulted" labels carry very little signal: max feature
correlation is -0.18 (credit_score).  The ground-truth probability column
"default_probability_true" has -0.64 correlation with credit_score — 3.5x
stronger.  Training a regressor on those soft labels, then thresholding,
consistently outperforms classifiers trained on hard labels.

Architecture
------------
  LoanRiskNet : 21 features → 256 → 128 → 64 → 32 → 1  (GELU, BN, Dropout)
  GBR         : sklearn GradientBoostingRegressor (1000 trees, depth 4)
  Ensemble    : 0.65 * GBR + 0.35 * MLP  (weighted average of probabilities)
"""
import torch
import torch.nn as nn

# ── Feature columns (21 total) ─────────────────────────────────────────────
FEATURE_COLUMNS = [
    # Raw numerics
    "credit_score",
    "monthly_income",
    "employment_years",
    "existing_debt",
    "requested_amount",
    "tenure_months",
    # Ratio features
    "dti",                   # debt-to-income
    "lti",                   # loan-to-income-per-month
    "debt_per_emp",          # existing_debt / employment_years
    "monthly_obl",           # requested_amount / tenure_months
    "obl_ratio",             # monthly_obligation / monthly_income
    # Non-linear / interaction features
    "credit_sq",             # credit_score² / 1000
    "score_x_emp",           # credit_score × employment_years / 100
    "log_income",            # log1p(monthly_income)
    "log_debt",              # log1p(existing_debt)
    "log_amount",            # log1p(requested_amount)
    # Loan-type one-hot (5 categories)
    "lt_Business Loan",
    "lt_Education Loan",
    "lt_Home Loan",
    "lt_Personal Loan",
    "lt_Vehicle Loan",
]

INPUT_DIM = len(FEATURE_COLUMNS)   # 21


# ── PyTorch MLP ──────────────────────────────────────────────────────────────
class LoanRiskNet(nn.Module):
    """
    Input  : INPUT_DIM standardised features
    Output : raw logit  (apply sigmoid outside)
    """
    def __init__(self, input_dim: int = INPUT_DIM):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.35),

            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.25),

            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(0.15),

            nn.Linear(64, 32),
            nn.GELU(),

            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)   # raw logit
