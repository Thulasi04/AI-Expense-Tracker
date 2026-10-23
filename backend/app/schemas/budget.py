from pydantic import BaseModel, Field
from typing import Optional, List

class BudgetBase(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Month in YYYY-MM format")
    category: Optional[str] = Field(None, description="Category name, or None/__TOTAL__ for overall budget")
    amount: float = Field(..., gt=0, description="Budget amount in INR")

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    amount: float = Field(..., gt=0, description="Updated budget amount in INR")

class BudgetResponse(BaseModel):
    id: int
    user_id: int
    month: str
    category: Optional[str]
    amount: float
    formatted_amount: str

    class Config:
        from_attributes = True

class BudgetStatusItem(BaseModel):
    budget_id: Optional[int] = None
    month: str
    category: Optional[str] = None
    category_display: str
    budget_amount: float
    formatted_budget: str
    spent_amount: float
    formatted_spent: str
    remaining_amount: float
    formatted_remaining: str
    percentage_used: float
    is_warning: bool # >= 80%
    is_over_budget: bool # >= 100%

class BudgetOverviewResponse(BaseModel):
    month: str
    overall: Optional[BudgetStatusItem] = None
    categories: List[BudgetStatusItem]
    total_budget: float
    total_spent: float
    formatted_total_budget: str
    formatted_total_spent: str
