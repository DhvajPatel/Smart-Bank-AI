"""
One-time script: adds indexes to the transactions table for fast customer queries.
Run once: python add_indexes.py
"""
import sqlite3, time
from pathlib import Path

DB = Path(__file__).parent / "smartbank.db"
conn = sqlite3.connect(DB)
c = conn.cursor()

indexes = [
    ("idx_tx_customer",      "CREATE INDEX IF NOT EXISTS idx_tx_customer      ON transactions(customer_id)"),
    ("idx_tx_customer_type", "CREATE INDEX IF NOT EXISTS idx_tx_customer_type ON transactions(customer_id, transaction_type)"),
    ("idx_tx_customer_date", "CREATE INDEX IF NOT EXISTS idx_tx_customer_date ON transactions(customer_id, date)"),
    ("idx_tx_full",          "CREATE INDEX IF NOT EXISTS idx_tx_full          ON transactions(customer_id, transaction_type, date)"),
    ("idx_loan_customer",    "CREATE INDEX IF NOT EXISTS idx_loan_customer    ON loans(customer_id)"),
    ("idx_account_customer", "CREATE INDEX IF NOT EXISTS idx_account_customer ON accounts(customer_id)"),
]

for name, sql in indexes:
    t = time.time()
    print(f"Creating {name}...", end=" ", flush=True)
    c.execute(sql)
    conn.commit()
    print(f"done ({(time.time()-t)*1000:.0f}ms)")

# verify speed improvement
t = time.time()
c.execute("SELECT category, SUM(amount) FROM transactions WHERE customer_id='C100009' AND transaction_type='Debit' AND date >= '2026-05-01' GROUP BY category")
c.fetchall()
print(f"\nSpend query after index: {(time.time()-t)*1000:.0f}ms  (was ~1300ms)")

conn.close()
print("\nDone. Indexes created.")
