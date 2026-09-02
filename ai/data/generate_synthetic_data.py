"""
SmartBank AI - Synthetic Dataset Generator
============================================
Generates realistic (but fully synthetic) banking data:
  - customers.csv
  - accounts.csv
  - transactions.csv
  - loans.csv
  - credit_cards.csv
  - product_interactions.csv   (for the recommendation engine)

Run:
    python generate_synthetic_data.py --customers 10000 --seed 42

Everything is generated with numpy/pandas only - no external datasets needed,
so this works fully offline.
"""

import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta

OUT_DIR = Path(__file__).parent / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)

CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai",
          "Pune", "Ahmedabad", "Kolkata", "Jaipur", "Surat",
          "Lucknow", "Chandigarh", "Bhopal", "Indore", "Nagpur"]

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Arjun", "Reyansh", "Kabir", "Rohan", "Ishaan",
    "Shaurya", "Atharv", "Ananya", "Diya", "Saanvi", "Riya", "Priya", "Sneha",
    "Pooja", "Neha", "Kavya", "Meera", "Rahul", "Amit", "Raj", "Suresh", "Vijay",
    "Nikhil", "Karan", "Siddharth", "Pranav", "Dev", "Sanya", "Tara", "Isha",
    "Naina", "Aisha", "Simran", "Pari", "Ruchi", "Divya", "Swati", "Deepak",
    "Manish", "Rajesh", "Vikram", "Ajay", "Alok", "Tushar", "Gaurav", "Harsh",
    "Mohit", "Shreya", "Ankita", "Pallavi", "Ritika", "Komal", "Nidhi", "Sunita",
    "Geeta", "Rekha", "Usha", "Shweta", "Tarun", "Varun", "Mayank", "Nitin",
    "Ravi", "Pankaj", "Sanjay", "Manoj", "Vishal", "Abhishek", "Akash", "Sachin",
    "Hemant", "Dinesh", "Lalit", "Ramesh", "Jyoti", "Seema", "Anjali", "Pratibha",
]

LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Mehta",
    "Joshi", "Chauhan", "Yadav", "Mishra", "Tiwari", "Pandey", "Dubey", "Shukla",
    "Agarwal", "Bansal", "Garg", "Mittal", "Kapoor", "Malhotra", "Bhatia", "Khanna",
    "Nair", "Menon", "Pillai", "Iyer", "Rao", "Reddy", "Naidu", "Krishnan",
    "Mukherjee", "Chatterjee", "Ghosh", "Das", "Bose", "Roy", "Dutta", "Sen",
    "Desai", "Jain", "Saxena", "Tripathi", "Srivastava", "Awasthi", "Chaurasia",
]

OCCUPATIONS = ["Salaried-Private", "Salaried-Government", "Self-Employed",
               "Business Owner", "Freelancer", "Student", "Retired"]

CATEGORIES = ["Food", "Shopping", "Travel", "Bills", "Entertainment",
              "Healthcare", "Education", "Rent", "Investment", "ATM",
              "Transfer", "Fuel", "Other"]

PAYMENT_METHODS = ["UPI", "Debit Card", "Credit Card", "Net Banking", "Cash", "NEFT"]

MERCHANTS = {
    "Food": ["Swiggy", "Zomato", "Local Restaurant", "Cafe Coffee Day"],
    "Shopping": ["Amazon", "Flipkart", "Myntra", "Local Store"],
    "Travel": ["MakeMyTrip", "IndiGo", "Ola", "Uber", "IRCTC"],
    "Bills": ["Electricity Board", "Airtel", "Jio", "Water Dept"],
    "Entertainment": ["Netflix", "BookMyShow", "Spotify", "PVR"],
    "Healthcare": ["Apollo Pharmacy", "Local Clinic", "1mg"],
    "Education": ["Udemy", "Coursera", "College Fee"],
    "Rent": ["Landlord Transfer"],
    "Investment": ["Zerodha", "Groww", "SIP Auto-debit"],
    "ATM": ["ATM Withdrawal"],
    "Transfer": ["P2P Transfer"],
    "Fuel": ["HP Petrol Pump", "Indian Oil"],
    "Other": ["Misc Merchant"],
}

LOAN_TYPES = ["Personal Loan", "Home Loan", "Education Loan", "Vehicle Loan", "Business Loan"]
CARD_TYPES = ["SmartCard", "TravelCard", "CashbackCard", "PremiumCard", "StudentCard", "FuelCard"]
PRODUCTS = ["Travel Credit Card", "Cashback Credit Card", "Fuel Credit Card", "Premium Credit Card",
            "Personal Loan", "Home Loan", "Fixed Deposit", "Recurring Deposit",
            "Investment Plan (Mutual Fund SIP)", "Term Insurance", "Premium Banking Account"]


def gen_customers(n, rng):
    ages = rng.integers(21, 65, n)
    occupation = rng.choice(OCCUPATIONS, n, p=[0.35, 0.15, 0.15, 0.1, 0.1, 0.1, 0.05])

    base_income = rng.normal(55000, 20000, n)
    occ_multiplier = np.select(
        [occupation == "Business Owner", occupation == "Salaried-Government",
         occupation == "Salaried-Private", occupation == "Self-Employed",
         occupation == "Freelancer", occupation == "Student", occupation == "Retired"],
        [1.6, 1.1, 1.0, 1.2, 0.8, 0.15, 0.6]
    )
    income = np.clip(base_income * occ_multiplier + (ages - 21) * 400, 8000, 500000).round(-2)

    credit_score = np.clip(rng.normal(680, 80, n) + (income / 200000) * 30, 300, 900).astype(int)
    employment_years = np.clip((ages - 21) * rng.uniform(0.2, 0.9, n), 0, 40).round(1)

    df = pd.DataFrame({
        "customer_id": [f"C{100000+i}" for i in range(n)],
        "name": [
            f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
            for _ in range(n)
        ],
        "age": ages,
        "occupation": occupation,
        "monthly_income": income.astype(int),
        "credit_score": credit_score,
        "employment_years": employment_years,
        "city": rng.choice(CITIES, n),
        "created_at": [
            (datetime(2023, 1, 1) + timedelta(days=int(d))).date().isoformat()
            for d in rng.integers(0, 900, n)
        ],
    })
    return df


def gen_accounts(customers, rng):
    rows = []
    acct_id = 1
    for _, c in customers.iterrows():
        n_accts = rng.choice([1, 2], p=[0.7, 0.3])
        for _ in range(n_accts):
            acct_type = rng.choice(["Savings", "Current", "Salary", "Premium"],
                                    p=[0.55, 0.1, 0.25, 0.1])
            balance = max(0, rng.normal(c["monthly_income"] * rng.uniform(0.5, 4), c["monthly_income"] * 0.5))
            rows.append({
                "account_id": f"A{200000+acct_id}",
                "customer_id": c["customer_id"],
                "account_type": acct_type,
                "balance": round(balance, 2),
                "interest_rate": round(rng.uniform(2.5, 6.5), 2),
                "status": rng.choice(["Active", "Active", "Active", "Dormant"]),
            })
            acct_id += 1
    return pd.DataFrame(rows)


def gen_transactions(customers, accounts, rng, months=6):
    rows = []
    tx_id = 1
    acct_by_cust = accounts.groupby("customer_id")["account_id"].apply(list).to_dict()
    today = datetime(2026, 8, 1)

    personality = rng.dirichlet(np.ones(len(CATEGORIES)), len(customers))

    for idx, c in customers.iterrows():
        accts = acct_by_cust.get(c["customer_id"], [])
        if not accts:
            continue
        monthly_spend_budget = c["monthly_income"] * rng.uniform(0.3, 0.85)
        n_tx = int(rng.integers(15, 60) * months / 6 * 6)

        cat_weights = personality[idx]
        for _ in range(n_tx):
            days_ago = rng.integers(0, 30 * months)
            date = today - timedelta(days=int(days_ago))
            category = rng.choice(CATEGORIES, p=cat_weights)
            merchant = rng.choice(MERCHANTS[category])
            weekend_bump = 1.4 if date.weekday() >= 5 else 1.0
            amount = max(20, rng.exponential(monthly_spend_budget / 25) * weekend_bump)
            rows.append({
                "transaction_id": f"T{tx_id:08d}",
                "customer_id": c["customer_id"],
                "account_id": rng.choice(accts),
                "date": date.date().isoformat(),
                "amount": round(amount, 2),
                "transaction_type": "Debit",
                "category": category,
                "merchant": merchant,
                "payment_method": rng.choice(PAYMENT_METHODS),
                "location": c["city"],
            })
            tx_id += 1

        for m in range(months):
            credit_date = today - timedelta(days=30 * m + int(rng.integers(0, 3)))
            rows.append({
                "transaction_id": f"T{tx_id:08d}",
                "customer_id": c["customer_id"],
                "account_id": accts[0],
                "date": credit_date.date().isoformat(),
                "amount": round(c["monthly_income"] * rng.uniform(0.95, 1.0), 2),
                "transaction_type": "Credit",
                "category": "Salary",
                "merchant": "Employer",
                "payment_method": "NEFT",
                "location": c["city"],
            })
            tx_id += 1

        if rng.random() < 0.015:
            anomaly_date = today - timedelta(days=int(rng.integers(0, 30 * months)))
            rows.append({
                "transaction_id": f"T{tx_id:08d}",
                "customer_id": c["customer_id"],
                "account_id": accts[0],
                "date": anomaly_date.date().isoformat(),
                "amount": round(monthly_spend_budget * rng.uniform(8, 20), 2),
                "transaction_type": "Debit",
                "category": "Other",
                "merchant": "Unknown Merchant",
                "payment_method": "Net Banking",
                "location": rng.choice(CITIES),
            })
            tx_id += 1

    return pd.DataFrame(rows)


def gen_loans(customers, rng, frac=0.35):
    sample = customers.sample(frac=frac, random_state=int(rng.integers(0, 1e6)))
    rows = []
    for i, c in sample.iterrows():
        loan_type = rng.choice(LOAN_TYPES)
        requested = {
            "Personal Loan": rng.uniform(50000, 800000),
            "Home Loan": rng.uniform(1000000, 8000000),
            "Education Loan": rng.uniform(100000, 2000000),
            "Vehicle Loan": rng.uniform(100000, 1500000),
            "Business Loan": rng.uniform(200000, 5000000),
        }[loan_type]
        tenure = int(rng.choice([12, 24, 36, 60, 84, 120, 180]))
        existing_debt = max(0, rng.normal(c["monthly_income"] * 0.15, c["monthly_income"] * 0.1))

        dti = existing_debt / max(c["monthly_income"], 1)
        risk_score = (
            -1.8
            - 0.006 * (c["credit_score"] - 650)
            + 2.5 * dti
            + 0.10 * (requested / max(c["monthly_income"] * tenure, 1))
            - 0.03 * c["employment_years"]
            + rng.normal(0, 0.25)   # reduced noise: was 0.5, now 0.25 for cleaner signal
        )
        default_prob = 1 / (1 + np.exp(-risk_score))
        defaulted = int(rng.random() < default_prob)
        status = "Rejected" if default_prob > 0.55 else rng.choice(["Approved", "Approved", "Pending"])

        rows.append({
            "loan_id": f"L{300000+i}",
            "customer_id": c["customer_id"],
            "loan_type": loan_type,
            "requested_amount": round(requested, 2),
            "tenure_months": tenure,
            "monthly_income": c["monthly_income"],
            "credit_score": c["credit_score"],
            "existing_debt": round(existing_debt, 2),
            "employment_years": c["employment_years"],
            "loan_status": status,
            "default_probability_true": round(float(default_prob), 4),
            "defaulted": defaulted,
        })
    return pd.DataFrame(rows)


def gen_credit_cards(customers, rng, frac=0.4):
    sample = customers.sample(frac=frac, random_state=int(rng.integers(0, 1e6)))
    rows = []
    for i, c in sample.iterrows():
        card_type = rng.choice(CARD_TYPES)
        limit = round(c["monthly_income"] * rng.uniform(1.5, 4), -2)
        used = round(limit * rng.uniform(0, 0.8), 2)
        rows.append({
            "card_id": f"CC{400000+i}",
            "customer_id": c["customer_id"],
            "card_type": card_type,
            "credit_limit": limit,
            "used_amount": used,
            "available_limit": round(limit - used, 2),
            "reward_points": int(rng.integers(0, 20000)),
            "annual_fee": rng.choice([0, 499, 999, 2999]),
            "status": "Active",
        })
    return pd.DataFrame(rows)


def gen_product_interactions(customers, rng, n_per_customer=(0, 6)):
    rows = []
    for _, c in customers.iterrows():
        n = rng.integers(*n_per_customer)
        seen_products = rng.choice(PRODUCTS, size=min(n, len(PRODUCTS)), replace=False)
        for p in seen_products:
            viewed = 1
            clicked = int(rng.random() < 0.55)
            applied = int(clicked and rng.random() < 0.35)
            approved = int(applied and rng.random() < 0.7)
            used = int(approved and rng.random() < 0.8)
            rows.append({
                "customer_id": c["customer_id"], "product": p,
                "viewed": viewed, "clicked": clicked,
                "applied": applied, "approved": approved, "used": used,
            })
    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--customers", type=int, default=10000)
    parser.add_argument("--months", type=int, default=6)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rng = np.random.default_rng(args.seed)

    print(f"Generating {args.customers} customers...")
    customers = gen_customers(args.customers, rng)

    print("Generating accounts...")
    accounts = gen_accounts(customers, rng)

    print("Generating transactions...")
    transactions = gen_transactions(customers, accounts, rng, months=args.months)

    print("Generating loan applications...")
    loans = gen_loans(customers, rng)

    print("Generating credit cards...")
    cards = gen_credit_cards(customers, rng)

    print("Generating product interactions...")
    interactions = gen_product_interactions(customers, rng)

    customers.to_csv(OUT_DIR / "customers.csv", index=False)
    accounts.to_csv(OUT_DIR / "accounts.csv", index=False)
    transactions.to_csv(OUT_DIR / "transactions.csv", index=False)
    loans.to_csv(OUT_DIR / "loans.csv", index=False)
    cards.to_csv(OUT_DIR / "credit_cards.csv", index=False)
    interactions.to_csv(OUT_DIR / "product_interactions.csv", index=False)

    print("\nDone. Files written to:", OUT_DIR)
    for f in OUT_DIR.glob("*.csv"):
        print(f" - {f.name}: {sum(1 for _ in open(f)) - 1} rows")


if __name__ == "__main__":
    main()
