"""
Loads the synthetic CSV datasets (ai/data/raw/*.csv) into the SQL database.

Run this once after generating data, and again anytime you regenerate it:
    python load_data.py
"""
from pathlib import Path
import pandas as pd
from database.connection import engine, Base

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "ai" / "data" / "raw"

TABLE_MAP = {
    "customers.csv": "customers",
    "accounts.csv": "accounts",
    "transactions.csv": "transactions",
    "loans.csv": "loans",
    "credit_cards.csv": "credit_cards",
    "product_interactions.csv": "product_interactions",
}


def main():
    from database import models  # noqa: F401  (ensures models are registered)
    Base.metadata.create_all(bind=engine)

    for csv_name, table_name in TABLE_MAP.items():
        path = RAW / csv_name
        if not path.exists():
            print(f"  Skipping {csv_name} (not found - run the data generator first)")
            continue
        df = pd.read_csv(path)
        df.to_sql(table_name, con=engine, if_exists="replace", index=False)
        print(f"  Loaded {len(df):>8} rows -> {table_name}")

    print("\nDatabase ready at:", engine.url)


if __name__ == "__main__":
    main()
