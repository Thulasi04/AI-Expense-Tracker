from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseListResponse,
    ExpenseBatchCreate
)
from backend.app.services.auth_service import get_current_user
from backend.app.services import expense_service

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created = expense_service.create_expense(db, current_user.id, expense_in)
    return ExpenseResponse.from_orm_model(created)

@router.post("/batch", response_model=List[ExpenseResponse], status_code=status.HTTP_201_CREATED)
def create_batch_expenses(
    batch_in: ExpenseBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created_list = expense_service.create_batch_expenses(db, current_user.id, batch_in.expenses)
    return [ExpenseResponse.from_orm_model(e) for e in created_list]

@router.get("", response_model=ExpenseListResponse)
def get_expenses(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    category: Optional[str] = Query(None, description="Category filter"),
    min_amount: Optional[float] = Query(None, description="Min amount in INR"),
    max_amount: Optional[float] = Query(None, description="Max amount in INR"),
    payment_method: Optional[str] = Query(None, description="Payment method filter"),
    search: Optional[str] = Query(None, description="Search keyword in description or merchant"),
    sort_by: str = Query("date_desc", description="date_desc, date_asc, amount_desc, amount_asc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return expense_service.list_expenses(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category=category,
        min_amount=min_amount,
        max_amount=max_amount,
        payment_method=payment_method,
        search=search,
        sort_by=sort_by,
        page=page,
        page_size=page_size
    )

@router.get("/export/csv")
def export_csv(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    csv_data = expense_service.export_expenses_csv(
        db=db,
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
        category=category,
        search=search
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=expenses_{date.today().strftime('%Y%m%d')}.csv"}
    )

@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = expense_service.get_expense(db, current_user.id, expense_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")
    return ExpenseResponse.from_orm_model(exp)

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated = expense_service.update_expense(db, current_user.id, expense_id, expense_in)
    if not updated:
        raise HTTPException(status_code=404, detail="Expense not found")
    return ExpenseResponse.from_orm_model(updated)

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    success = expense_service.delete_expense(db, current_user.id, expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
