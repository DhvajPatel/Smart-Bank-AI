from sqlalchemy import Column, String, Integer, Float, Date, ForeignKey
from .connection import Base


class Customer(Base):
    __tablename__ = "customers"
    customer_id = Column(String, primary_key=True)
    name = Column(String)
    age = Column(Integer)
    occupation = Column(String)
    monthly_income = Column(Float)
    credit_score = Column(Integer)
    employment_years = Column(Float)
    city = Column(String)
    created_at = Column(String)


class Account(Base):
    __tablename__ = "accounts"
    account_id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), index=True)
    account_type = Column(String)
    balance = Column(Float)
    interest_rate = Column(Float)
    status = Column(String)


class Transaction(Base):
    __tablename__ = "transactions"
    transaction_id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), index=True)
    account_id = Column(String)
    date = Column(String)
    amount = Column(Float)
    transaction_type = Column(String)
    category = Column(String)
    merchant = Column(String)
    payment_method = Column(String)
    location = Column(String)


class Loan(Base):
    __tablename__ = "loans"
    loan_id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), index=True)
    loan_type = Column(String)
    requested_amount = Column(Float)
    tenure_months = Column(Integer)
    monthly_income = Column(Float)
    credit_score = Column(Integer)
    existing_debt = Column(Float)
    employment_years = Column(Float)
    loan_status = Column(String)
    default_probability_true = Column(Float)
    defaulted = Column(Integer)


class CreditCard(Base):
    __tablename__ = "credit_cards"
    card_id = Column(String, primary_key=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), index=True)
    card_type = Column(String)
    credit_limit = Column(Float)
    used_amount = Column(Float)
    available_limit = Column(Float)
    reward_points = Column(Integer)
    annual_fee = Column(Float)
    status = Column(String)


class ProductInteraction(Base):
    __tablename__ = "product_interactions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(String, ForeignKey("customers.customer_id"), index=True)
    product = Column(String)
    viewed = Column(Integer)
    clicked = Column(Integer)
    applied = Column(Integer)
    approved = Column(Integer)
    used = Column(Integer)
