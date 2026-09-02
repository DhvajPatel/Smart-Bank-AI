# Free Deployment Guide — SmartBank AI

Deploy the full app (frontend + backend + AI models) at **zero cost** using:

| Part | Platform | Free Tier |
|------|----------|-----------|
| Frontend (React) | **Vercel** | Unlimited bandwidth, global CDN |
| Backend (FastAPI + AI) | **Render** | 750 hrs/month, auto-builds |
| Database (SQLite) | Built-in to Render | Rebuilt from CSVs at every deploy |

Total cost: **₹0 / $0**

---

## How it works

```
GitHub Repo
    │
    ├──► Render (backend)
    │       builds: pip install + python load_data.py (creates smartbank.db)
    │       runs:   uvicorn main:app
    │       URL:    https://smartbank-ai-backend.onrender.com
    │
    └──► Vercel (frontend)
            builds: npm run build (Vite)
            serves: dist/ as static files
            URL:    https://smartbank-ai.vercel.app
```

---

## Step 1 — Push to GitHub

### 1a. Create a GitHub account
Go to https://github.com → Sign up (free)

### 1b. Create a new repository
1. Click **+** → **New repository**
2. Name it: `smart-bank-ai`
3. Set to **Public** (required for free Render deploys)
4. Do NOT initialise with README (you already have one)
5. Click **Create repository**

### 1c. Push your code
Open terminal in your project root (`smart-bank-ai/`) and run:

```bash
git init
git add .
git commit -m "Initial commit — SmartBank AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart-bank-ai.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username.

**What gets pushed (~5 MB total):**
- All source code (frontend + backend)
- Small CSVs: customers, loans, accounts, credit_cards, product_interactions (~2.8 MB)
- AI model files: loan_ensemble.pkl, loan_model.pt, loan_scaler.pkl (~1.85 MB)

**What does NOT get pushed (already in .gitignore):**
- `backend/smartbank.db` (425 MB — Render builds it from the CSVs)
- `ai/data/raw/transactions.csv` (187 MB — too big, not needed for the DB build)
- `node_modules/`

---

## Step 2 — Deploy Backend on Render

### 2a. Create Render account
Go to https://render.com → Sign up with GitHub (free)

### 2b. Create a new Web Service
1. Dashboard → **New +** → **Web Service**
2. Connect your GitHub account → select `smart-bank-ai` repo
3. Fill in the settings:

| Setting | Value |
|---------|-------|
| **Name** | `smartbank-ai-backend` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt && python load_data.py` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

4. Click **Create Web Service**

### 2c. Wait for the build
- Build takes ~3–5 minutes (pip install + loading all CSVs into SQLite)
- Watch the logs — you should see:
  ```
  Loaded     10000 rows -> customers
  Loaded     13100 rows -> accounts
  Loaded      3500 rows -> loans
  ...
  Database ready at: sqlite:///./smartbank.db
  INFO: Application startup complete.
  ```

### 2d. Copy your backend URL
Once deployed, Render gives you a URL like:
```
https://smartbank-ai-backend.onrender.com
```
**Save this URL — you need it in Step 3.**

### Test your backend
Open in browser:
```
https://smartbank-ai-backend.onrender.com/docs
```
You should see the FastAPI Swagger UI with all endpoints.

---

## Step 3 — Deploy Frontend on Vercel

### 3a. Update the production API URL
Open `frontend/.env.production` and replace the placeholder with your real Render URL:

```
VITE_API_URL=https://smartbank-ai-backend.onrender.com
```

Commit and push this change:
```bash
git add frontend/.env.production
git commit -m "Set production API URL to Render backend"
git push
```

### 3b. Create Vercel account
Go to https://vercel.com → Sign up with GitHub (free)

### 3c. Import your project
1. Vercel Dashboard → **Add New** → **Project**
2. Import `smart-bank-ai` from GitHub
3. Fill in settings:

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

4. Under **Environment Variables**, add:
   ```
   VITE_API_URL = https://smartbank-ai-backend.onrender.com
   ```
   (same as your .env.production)

5. Click **Deploy**

### 3d. Wait for build (~1 minute)
You'll get a live URL like:
```
https://smart-bank-ai.vercel.app
```

### 3e. Test the full app
Open `https://smart-bank-ai.vercel.app` → Login with:
```
Admin     → admin / admin123
Employee  → emp001 / emp123
```

---

## Important: Cold Start Warning

Render's **free tier spins down** after 15 minutes of inactivity. The first
request after a sleep takes ~30–50 seconds to wake up. This is normal.

**To avoid this for demos:**
- Open your Render URL 2 minutes before your demo
- Or use UptimeRobot (free) to ping the backend every 14 minutes:
  1. Go to https://uptimerobot.com → Sign up free
  2. Add monitor → HTTP(S)
  3. URL: `https://smartbank-ai-backend.onrender.com/`
  4. Interval: 14 minutes
  This keeps the backend always warm.

---

## Free Tier Limits Summary

| Platform | Limit | Impact |
|----------|-------|--------|
| **Vercel** | 100 GB bandwidth/month | Plenty for a demo |
| **Render** | 750 hrs/month free | ~31 days = always on |
| **Render** | Spins down after 15min idle | 30s cold start |
| **Render** | 512 MB RAM | Fine for SQLite + small models |
| **GitHub** | 1 GB repo, 100 MB per file | Fine (~5 MB total) |

---

## Troubleshooting

### Backend shows "Application error"
→ Check Render logs (Dashboard → your service → Logs tab)
→ Most common cause: `load_data.py` couldn't find the CSV files
→ Make sure CSVs are committed: `git status ai/data/raw/`

### Frontend shows "Network Error" or can't reach API
→ Make sure `VITE_API_URL` in Vercel environment variables matches your Render URL exactly (no trailing slash)
→ Check CORS: your backend already has `allow_origins=["*"]` so this should work

### Render build fails with "ModuleNotFoundError: torch"
→ PyTorch CPU wheel is large (~200 MB). Add to `backend/requirements.txt`:
  ```
  torch --index-url https://download.pytorch.org/whl/cpu
  ```
  This fetches the smaller CPU-only version.

### Git push rejected (file too large)
→ Means `smartbank.db` or `transactions.csv` is being tracked
→ Run: `git rm --cached backend/smartbank.db`
→ Run: `git rm --cached ai/data/raw/transactions.csv`
→ Then commit and push again

---

## Re-deploying After Changes

Every time you push to GitHub `main` branch:
- **Render** automatically rebuilds and redeploys the backend
- **Vercel** automatically rebuilds and redeploys the frontend

No manual steps needed after the initial setup.

---

## Your Live URLs (fill in after deploying)

```
Frontend  : https://_________________________.vercel.app
Backend   : https://_________________________.onrender.com
API Docs  : https://_________________________.onrender.com/docs
```
