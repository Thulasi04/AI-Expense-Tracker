from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Store amount in integer paise (e.g. ₹450.50 -> 45050 paise) to prevent floating-point inaccuracies
    amount_paise = Column(Integer, nullable=False)
    
    category = Column(String(100), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    description = Column(String(255), nullable=False)
    merchant = Column(String(255), nullable=True, index=True)
    payment_method = Column(String(50), default="UPI", nullable=False) # UPI, Cash, Credit Card, Debit Card, Net Banking
    
    receipt_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="expenses")

    @property
    def amount(self) -> float:
        return self.amount_paise / 100.0

    @amount.setter
    def amount(self, value: float):
        self.amount_paise = int(round(value * 100))

# Composite index for lightning-fast user date/category queries
Index("ix_expenses_user_date", Expense.user_id, Expense.date.desc())
Index("ix_expenses_user_category", Expense.user_id, Expense.category)
Index("ix_expenses_user_merchant", Expense.user_id, Expense.merchant)
