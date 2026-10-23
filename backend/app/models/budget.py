from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Month represented as "YYYY-MM" (e.g. "2026-10")
    month = Column(String(7), nullable=False, index=True)
    
    # Category name for category-specific budget, or "__TOTAL__" / None for overall monthly budget
    category = Column(String(100), nullable=True, index=True)
    
    # Amount in integer paise
    amount_paise = Column(Integer, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("user_id", "month", "category", name="uq_user_month_category_budget"),
    )

    @property
    def amount(self) -> float:
        return self.amount_paise / 100.0

    @amount.setter
    def amount(self, value: float):
        self.amount_paise = int(round(value * 100))
