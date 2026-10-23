from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.budget import BudgetCreate, BudgetResponse, BudgetOverviewResponse
from backend.app.services.auth_service import get_current_user
from backend.app.services import budget_service
from backend.app.utils.currency import format_inr

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.get("/overview", response_model=BudgetOverviewResponse)
def get_budget_overview(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return budget_service.get_monthly_budget_overview(db, current_user.id, month)

@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def set_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    b = budget_service.set_or_update_budget(db, current_user.id, budget_in)
    return BudgetResponse(
        id=b.id,
        user_id=b.user_id,
        month=b.month,
        category=b.category,
        amount=b.amount,
        formatted_amount=format_inr(b.amount)
    )

@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = budget_service.delete_budget(db, current_user.id, budget_id)
    if not success:
        raise HTTPException(status_code=404, detail="Budget not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
