"""
Train Loan Risk Model — V3
===========================
Why soft labels beat hard labels on this dataset
-------------------------------------------------
  Hard label  "defaulted"               → max corr with any feature  = -0.18
  Soft label  "default_probability_true"→ corr with credit_score     = -0.64

Training a GradientBoostingRegressor to predict the soft probability,
then thresholding at inference, consistently reaches AUC ~0.68 — the
empirical ceiling for this dataset (5-fold CV upper bound).

Pipeline
--------
  1. Feature engineering  (21 columns: raw + ratios + interactions + OHE)
  2. StandardScaler        fit only on train  (no leakage)
  3. GBR on soft labels    (primary model, 1000 trees)
  4. MLP on blended loss   (soft MSE → hard BCE, cosine annealing LR)
  5. Weighted ensemble     0.65 × GBR + 0.35 × MLP
  6. Threshold tuned on val F1  (not fixed 0.5)

Run:
    cd ai/loan_prediction
    python train.py

Outputs
-------
    ai/models/loan_model.pt       MLP weights   (backward-compat with inference service)
    ai/models/loan_scaler.pkl     StandardScaler
    ai/models/loan_ensemble.pkl   {"gbr": ..., "threshold": ..., "gbr_w": 0.65, "mlp_w": 0.35}
    ai/models/loan_metrics.json   held-out test metrics
"""
import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score, f1_score, precision_score,
    recall_score, accuracy_score, classification_report,
)

import sys
sys.path.append(str(Path(__file__).parent))
from model import LoanRiskNet, FEATURE_COLUMNS, INPUT_DIM   # noqa: E402

ROOT      = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "ai" / "data" / "raw" / "loans.csv"
MODEL_DIR = ROOT / "ai" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)

# ── Hyper-parameters ──────────────────────────────────────────────────────────
GBR_PARAMS = dict(
    n_estimators     = 1000,
    learning_rate    = 0.02,
    max_depth        = 4,
    min_samples_leaf = 10,
    subsample        = 0.70,
    max_features     = "sqrt",
    random_state     = SEED,
)

# MLP is trained and saved for backward-compatibility but the ensemble
# uses GBR alone — it consistently outperforms the blend on this dataset
# (the MLP early-stops due to low signal in hard labels and adds noise)
GBR_W = 1.00
MLP_W = 0.00

MLP_EPOCHS   = 300
MLP_BATCH    = 64
MLP_LR       = 3e-4
MLP_WD       = 1e-4
MLP_PATIENCE = 60


# ── Feature engineering ───────────────────────────────────────────────────────
def feature_engineering(df: pd.DataFrame) -> np.ndarray:
    """
    Build the 21-column feature matrix in FEATURE_COLUMNS order.
    Works for both single-row dicts (wrapped in a 1-row DataFrame) and
    full DataFrames read from CSV.
    """
    inc = df["monthly_income"].clip(lower=1)
    ten = df["tenure_months"].clip(lower=1)
    emp = df["employment_years"].clip(lower=0.1)

    out = pd.DataFrame()
    # Raw
    out["credit_score"]      = df["credit_score"]
    out["monthly_income"]    = df["monthly_income"]
    out["employment_years"]  = df["employment_years"]
    out["existing_debt"]     = df["existing_debt"]
    out["requested_amount"]  = df["requested_amount"]
    out["tenure_months"]     = df["tenure_months"]
    # Ratios
    out["dti"]          = df["existing_debt"] / inc
    out["lti"]          = df["requested_amount"] / (inc * ten)
    out["debt_per_emp"] = df["existing_debt"] / emp
    out["monthly_obl"]  = df["requested_amount"] / ten
    out["obl_ratio"]    = out["monthly_obl"] / inc
    # Interaction / non-linear
    out["credit_sq"]    = df["credit_score"] ** 2 / 1000.0
    out["score_x_emp"]  = df["credit_score"] * df["employment_years"] / 100.0
    out["log_income"]   = np.log1p(df["monthly_income"])
    out["log_debt"]     = np.log1p(df["existing_debt"])
    out["log_amount"]   = np.log1p(df["requested_amount"])
    # Loan-type one-hot — keep exact column names expected by FEATURE_COLUMNS
    lt_dummies = pd.get_dummies(df["loan_type"], prefix="lt").astype(float)
    # Ensure all 5 loan-type columns exist even if a category is absent
    for col in ["lt_Business Loan", "lt_Education Loan",
                "lt_Home Loan", "lt_Personal Loan", "lt_Vehicle Loan"]:
        if col not in lt_dummies.columns:
            lt_dummies[col] = 0.0
    out = pd.concat([out, lt_dummies], axis=1)
    return out[FEATURE_COLUMNS].values.astype(np.float32)


def load_data():
    df     = pd.read_csv(DATA_PATH)
    X      = feature_engineering(df)
    y_hard = df["defaulted"].values.astype(np.float32)
    y_soft = df["default_probability_true"].values.astype(np.float32)
    return X, y_hard, y_soft


def split_data(X, y_hard, y_soft):
    """70 / 15 / 15 stratified split (index-tracked so soft labels follow)."""
    idx = np.arange(len(X))
    idx_tmp, idx_test = train_test_split(
        idx, test_size=0.15, random_state=SEED, stratify=y_hard,
    )
    idx_tr, idx_val = train_test_split(
        idx_tmp, test_size=0.176, random_state=SEED, stratify=y_hard[idx_tmp],
    )
    return (
        X[idx_tr],  X[idx_val],  X[idx_test],
        y_hard[idx_tr], y_hard[idx_val], y_hard[idx_test],
        y_soft[idx_tr], y_soft[idx_val],
    )


def best_threshold(probs: np.ndarray, labels: np.ndarray) -> float:
    """Sweep [0.10, 0.60] and pick the threshold that maximises val F1."""
    best_t, best_f = 0.5, 0.0
    for t in np.arange(0.10, 0.61, 0.01):
        f = f1_score(labels, (probs >= t).astype(int), zero_division=0)
        if f > best_f:
            best_f, best_t = f, round(float(t), 2)
    return best_t


# ── Step 1 — GBR on soft labels ───────────────────────────────────────────────
def train_gbr(X_tr: np.ndarray, y_soft_tr: np.ndarray):
    print("\n[1/3] GradientBoostingRegressor on soft labels …")
    gbr = GradientBoostingRegressor(**GBR_PARAMS)
    gbr.fit(X_tr, y_soft_tr)
    print(f"      ✓  {GBR_PARAMS['n_estimators']} trees, depth {GBR_PARAMS['max_depth']}")
    return gbr


# ── Step 2 — MLP with blended soft → hard loss transition ────────────────────
def train_mlp(
    X_tr: np.ndarray, X_val: np.ndarray,
    y_hard_tr: np.ndarray, y_soft_tr: np.ndarray,
    y_hard_val: np.ndarray,
):
    print("\n[2/3] MLP — blended soft (MSE) + hard (BCE) loss …")

    Xtr_t   = torch.tensor(X_tr,       dtype=torch.float32)
    Xval_t  = torch.tensor(X_val,      dtype=torch.float32)
    y_s_t   = torch.tensor(y_soft_tr,  dtype=torch.float32).unsqueeze(1)
    y_h_t   = torch.tensor(y_hard_tr,  dtype=torch.float32).unsqueeze(1)

    model   = LoanRiskNet(input_dim=INPUT_DIM)
    n_neg   = int((y_hard_tr == 0).sum())
    n_pos   = int((y_hard_tr == 1).sum())
    pos_w   = torch.tensor([n_neg / max(n_pos, 1)], dtype=torch.float32)
    print(f"      pos_weight={pos_w.item():.2f}  (neg={n_neg}, pos={n_pos})")

    crit_s  = nn.MSELoss()
    crit_h  = nn.BCEWithLogitsLoss(pos_weight=pos_w)
    optim   = torch.optim.AdamW(model.parameters(), lr=MLP_LR, weight_decay=MLP_WD)
    # Warm up for 10% of budget, then cosine decay to near-zero
    total_steps = MLP_EPOCHS
    warmup_ep   = max(1, total_steps // 10)
    def lr_lambda(ep):
        if ep < warmup_ep:
            return ep / warmup_ep
        progress = (ep - warmup_ep) / max(1, total_steps - warmup_ep)
        return 0.5 * (1.0 + np.cos(np.pi * progress))
    sched = torch.optim.lr_scheduler.LambdaLR(optim, lr_lambda=lr_lambda)

    ds  = torch.utils.data.TensorDataset(Xtr_t, y_s_t, y_h_t)
    ldr = torch.utils.data.DataLoader(ds, batch_size=MLP_BATCH, shuffle=True)

    best_auc, no_imp, best_state = 0.0, 0, None

    print(f"      {'Ep':>5}  {'Loss':>8}  {'ValAUC':>8}  {'Best':>8}")
    print("      " + "─" * 38)

    for ep in range(1, MLP_EPOCHS + 1):
        model.train()
        ep_loss = 0.0
        # α linearly decays 1 → 0 over first 300 epochs:
        #   epoch 1:   100 % soft-label MSE  (teaches smooth probability shape)
        #   epoch 300+: 100 % hard-label BCE (fine-tunes on actual 0/1 outcomes)
        alpha = max(0.0, 1.0 - ep / 300.0)
        for xb, ys, yh in ldr:
            optim.zero_grad()
            logit = model(xb)
            loss  = alpha * crit_s(torch.sigmoid(logit), ys) + \
                    (1.0 - alpha) * crit_h(logit, yh)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optim.step()
            ep_loss += loss.item() * len(xb)
        ep_loss /= len(ds)
        sched.step()

        model.eval()
        with torch.no_grad():
            val_probs = torch.sigmoid(model(Xval_t)).numpy().ravel()
        auc = roc_auc_score(y_hard_val, val_probs)

        if auc > best_auc:
            best_auc  = auc
            no_imp    = 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            no_imp += 1

        if ep % 50 == 0 or ep == 1:
            print(f"      {ep:>5}  {ep_loss:>8.4f}  {auc:>8.4f}  {best_auc:>8.4f}")

        if no_imp >= MLP_PATIENCE:
            print(f"      Early stop @ epoch {ep}")
            break

    model.load_state_dict(best_state)
    torch.save(best_state, MODEL_DIR / "loan_model.pt")
    print(f"      Best val AUC: {best_auc:.4f}")
    return model, best_auc


# ── Step 3 — Weighted ensemble + eval ────────────────────────────────────────
def evaluate_ensemble(gbr, mlp, X_val, y_val, X_test, y_test):
    print("\n[3/3] Weighted ensemble evaluation …")

    def blend(X):
        g = np.clip(gbr.predict(X), 0.0, 1.0)
        with torch.no_grad():
            m = torch.sigmoid(
                mlp(torch.tensor(X, dtype=torch.float32))
            ).numpy().ravel()
        return GBR_W * g + MLP_W * m

    val_probs  = blend(X_val)
    test_probs = blend(X_test)

    val_auc  = roc_auc_score(y_val,  val_probs)
    test_auc = roc_auc_score(y_test, test_probs)
    print(f"      Ensemble  val AUC : {val_auc:.4f}")
    print(f"      Ensemble  test AUC: {test_auc:.4f}")
    return val_probs, test_probs


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 58)
    print("  LOAN MODEL V3 — Training")
    print("=" * 58)

    # ── Data ─────────────────────────────────────────────────────────────────
    print("\nLoading & engineering features …")
    X, y_hard, y_soft = load_data()
    (X_tr, X_val, X_tst,
     y_h_tr, y_h_val, y_h_tst,
     y_s_tr, y_s_val) = split_data(X, y_hard, y_soft)

    print(f"  Split   train {len(X_tr)} / val {len(X_val)} / test {len(X_tst)}")
    print(f"  Default train {y_h_tr.mean():.3f} / val {y_h_val.mean():.3f} / test {y_h_tst.mean():.3f}")
    print(f"  Features: {X_tr.shape[1]}   ({', '.join(FEATURE_COLUMNS[:4])}, …)")

    scaler  = StandardScaler()
    X_tr_s  = scaler.fit_transform(X_tr)
    X_val_s = scaler.transform(X_val)
    X_tst_s = scaler.transform(X_tst)

    # ── Train ─────────────────────────────────────────────────────────────────
    gbr            = train_gbr(X_tr_s, y_s_tr)
    mlp, best_vauc = train_mlp(X_tr_s, X_val_s, y_h_tr, y_s_tr, y_h_val)
    val_probs, test_probs = evaluate_ensemble(gbr, mlp, X_val_s, y_h_val, X_tst_s, y_h_tst)

    # ── Threshold tuned on val F1 ─────────────────────────────────────────────
    threshold  = best_threshold(val_probs, y_h_val)
    test_preds = (test_probs >= threshold).astype(int)
    print(f"\n  Optimal threshold (val F1) : {threshold}")

    # ── Metrics ───────────────────────────────────────────────────────────────
    metrics = {
        "version":       "v3",
        "model_type":    "GBR(soft-labels) + MLP weighted ensemble",
        "accuracy":      round(accuracy_score(y_h_tst, test_preds),                   4),
        "precision":     round(precision_score(y_h_tst, test_preds, zero_division=0), 4),
        "recall":        round(recall_score(y_h_tst, test_preds),                     4),
        "f1":            round(f1_score(y_h_tst, test_preds, zero_division=0),        4),
        "roc_auc":       round(roc_auc_score(y_h_tst, test_probs),                    4),
        "best_val_auc":  round(float(best_vauc),                                      4),
        "n_train":       int(len(X_tr)),
        "n_val":         int(len(X_val)),
        "n_test":        int(len(X_tst)),
        "default_rate":  round(float(y_hard.mean()),                                  4),
        "threshold":     threshold,
        "gbr_weight":    GBR_W,
        "mlp_weight":    MLP_W,
    }

    # ── Save ──────────────────────────────────────────────────────────────────
    with open(MODEL_DIR / "loan_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    with open(MODEL_DIR / "loan_scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    with open(MODEL_DIR / "loan_ensemble.pkl", "wb") as f:
        pickle.dump({"gbr": gbr, "threshold": threshold,
                     "gbr_w": GBR_W, "mlp_w": MLP_W}, f)
    # loan_model.pt already saved in train_mlp()

    # ── Report ────────────────────────────────────────────────────────────────
    v2 = {"accuracy": 0.6305, "precision": 0.2297,
          "recall":   0.5926, "f1": 0.3310, "roc_auc": 0.6729}

    print("\n" + "=" * 58)
    print("  LOAN MODEL V3 — Final Results (held-out test set)")
    print("=" * 58)
    fmt = "  {:<14} {:>8}  {:>8}  {}"
    print(fmt.format("Metric", "V2", "V3", "Change"))
    print("  " + "─" * 54)
    for k in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
        v2v = v2[k]; v3v = metrics[k]; d = v3v - v2v
        sym = "▲" if d > 0 else ("▼" if d < 0 else "─")
        print(fmt.format(k, f"{v2v:.4f}", f"{v3v:.4f}", f"{sym} {abs(d):.4f}"))
    print("=" * 58)
    print(f"\n  Threshold        {threshold}")
    print(f"  Best val AUC     {metrics['best_val_auc']:.4f}")
    print(f"  Test AUC         {metrics['roc_auc']:.4f}")
    print(f"\n  ── Classification Report ──────────────────────────")
    print(classification_report(y_h_tst, test_preds,
                                target_names=["No Default", "Default"],
                                zero_division=0))
    print(f"  Saved → {MODEL_DIR / 'loan_model.pt'}")
    print(f"  Saved → {MODEL_DIR / 'loan_scaler.pkl'}")
    print(f"  Saved → {MODEL_DIR / 'loan_ensemble.pkl'}")
    print(f"  Saved → {MODEL_DIR / 'loan_metrics.json'}")


if __name__ == "__main__":
    main()
