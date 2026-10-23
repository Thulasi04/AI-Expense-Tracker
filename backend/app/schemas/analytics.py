from pydantic import BaseModel
from typing import List, Optional
from backend.app.schemas.expense import ExpenseResponse

class SpendingSummaryResponse(BaseModel):
    total_this_month: float
    formatted_this_month: str
    total_last_month: float
    formatted_last_month: str
    mom_percentage_change: float # Month-over-month %
    mom_change_type: str # 'increase', 'decrease', 'flat', 'new'
    total_today: float
    formatted_today: str
    monthly_budget: float
    formatted_monthly_budget: str
    remaining_budget: float
    formatted_remaining_budget: str
    budget_used_percentage: float

class CategoryBreakdownItem(BaseModel):
    category: str
    total_amount: float
    formatted_amount: str
    percentage: float
    count: int
    color: str

class MerchantBreakdownItem(BaseModel):
    merchant: str
    total_amount: float
    formatted_amount: str
    count: int

class SpendingTrendItem(BaseModel):
    date: str
    amount: float
    formatted_amount: str
    count: int

class MonthlyComparisonItem(BaseModel):
    month: str # YYYY-MM
    label: str # e.g. "Oct 2026"
    total_amount: float
    formatted_amount: str

class AnalyticsDashboardResponse(BaseModel):
    summary: SpendingSummaryResponse
    category_breakdown: List[CategoryBreakdownItem]
    top_merchants: List[MerchantBreakdownItem]
    recent_expenses: List[ExpenseResponse]
    spending_trends: List[SpendingTrendItem]
    monthly_comparison: List[MonthlyComparisonItem]
