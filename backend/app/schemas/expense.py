from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import datetime as dt
from backend.app.utils.currency import format_inr

class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in Indian Rupees (INR)")
    category: str = Field(..., min_length=1, description="Category name")
    date: dt.date = Field(..., description="Date of expense (YYYY-MM-DD)")
    description: str = Field(..., min_length=1, description="Description of the expense")
    merchant: Optional[str] = Field(None, description="Merchant or vendor name")
    payment_method: str = Field("UPI", description="Payment method: UPI, Cash, Credit Card, Debit Card, Net Banking")
    receipt_url: Optional[str] = None

    @field_validator("payment_method")
    def validate_payment_method(cls, v):
        valid = ["UPI", "Cash", "Credit Card", "Debit Card", "Net Banking", "Other"]
        if v not in valid:
            # normalize or accept
            for item in valid:
                if item.lower() == v.lower():
                    return item
            return "Other"
        return v

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    date: Optional[dt.date] = None
    description: Optional[str] = None
    merchant: Optional[str] = None
    payment_method: Optional[str] = None
    receipt_url: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    formatted_amount: str
    category: str
    date: dt.date
    description: str
    merchant: Optional[str] = None
    payment_method: str
    receipt_url: Optional[str] = None
    created_at: dt.datetime
    updated_at: dt.datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_model(cls, exp):
        amt = exp.amount
        return cls(
            id=exp.id,
            user_id=exp.user_id,
            amount=amt,
            formatted_amount=format_inr(amt),
            category=exp.category,
            date=exp.date,
            description=exp.description,
            merchant=exp.merchant,
            payment_method=exp.payment_method,
            receipt_url=exp.receipt_url,
            created_at=exp.created_at,
            updated_at=exp.updated_at
        )

class ExpenseListResponse(BaseModel):
    items: List[ExpenseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    total_amount: float
    formatted_total_amount: str

class ExpenseBatchCreate(BaseModel):
    expenses: List[ExpenseCreate]
