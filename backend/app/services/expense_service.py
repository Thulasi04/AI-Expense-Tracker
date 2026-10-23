import io
import csv
from typing import Optional, List, Tuple
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from backend.app.models.expense import Expense
from backend.app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseListResponse
from backend.app.utils.currency import rupees_to_paise, paise_to_rupees, format_inr

def create_expense(db: Session, user_id: int, expense_in: ExpenseCreate) -> Expense:
    paise = rupees_to_paise(expense_in.amount)
    db_expense = Expense(
        user_id=user_id,
        amount_paise=paise,
        category=expense_in.category.strip(),
        date=expense_in.date,
        description=expense_in.description.strip(),
        merchant=expense_in.merchant.strip() if expense_in.merchant else None,
        payment_method=expense_in.payment_method,
        receipt_url=expense_in.receipt_url
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

def create_batch_expenses(db: Session, user_id: int, expenses_in: List[ExpenseCreate]) -> List[Expense]:
    created_records = []
    try:
        for exp in expenses_in:
            paise = rupees_to_paise(exp.amount)
            db_exp = Expense(
                user_id=user_id,
                amount_paise=paise,
                category=exp.category.strip(),
                date=exp.date,
                description=exp.description.strip(),
                merchant=exp.merchant.strip() if exp.merchant else None,
                payment_method=exp.payment_method,
                receipt_url=exp.receipt_url
            )
            db.add(db_exp)
            created_records.append(db_exp)
        db.commit()
        for r in created_records:
            db.refresh(r)
        return created_records
    except Exception:
        db.rollback()
        raise

def get_expense(db: Session, user_id: int, expense_id: int) -> Optional[Expense]:
    return db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == user_id).first()

def update_expense(db: Session, user_id: int, expense_id: int, expense_in: ExpenseUpdate) -> Optional[Expense]:
    db_expense = get_expense(db, user_id, expense_id)
    if not db_expense:
        return None
    
    update_data = expense_in.model_dump(exclude_unset=True)
    if "amount" in update_data and update_data["amount"] is not None:
        db_expense.amount_paise = rupees_to_paise(update_data.pop("amount"))
        
    for field, value in update_data.items():
        if value is not None:
            if isinstance(value, str):
                setattr(db_expense, field, value.strip())
            else:
                setattr(db_expense, field, value)
                
    db.commit()
    db.refresh(db_expense)
    return db_expense

def delete_expense(db: Session, user_id: int, expense_id: int) -> bool:
    db_expense = get_expense(db, user_id, expense_id)
    if not db_expense:
        return False
    db.delete(db_expense)
    db.commit()
    return True

def delete_expenses_by_ids(db: Session, user_id: int, expense_ids: List[int]) -> int:
    deleted = db.query(Expense).filter(
        Expense.user_id == user_id,
        Expense.id.in_(expense_ids)
    ).delete(synchronize_session=False)
    db.commit()
    return deleted

def list_expenses(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    payment_method: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "date_desc", # date_desc, date_asc, amount_desc, amount_asc
    page: int = 1,
    page_size: int = 20
) -> ExpenseListResponse:
    query = db.query(Expense).filter(Expense.user_id == user_id)

    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if category and category.lower() != "all":
        query = query.filter(Expense.category == category)
    if min_amount is not None:
        query = query.filter(Expense.amount_paise >= rupees_to_paise(min_amount))
    if max_amount is not None:
        query = query.filter(Expense.amount_paise <= rupees_to_paise(max_amount))
    if payment_method and payment_method.lower() != "all":
        query = query.filter(Expense.payment_method == payment_method)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Expense.description.ilike(search_pattern),
                Expense.merchant.ilike(search_pattern),
                Expense.category.ilike(search_pattern)
            )
        )

    # Calculate total matching count and sum of amounts safely
    total_count = query.count()
    total_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
        Expense.id.in_(query.with_entities(Expense.id))
    ).scalar() or 0
    total_amount_rupees = paise_to_rupees(total_paise)

    # Sorting
    if sort_by == "date_asc":
        query = query.order_by(Expense.date.asc(), Expense.id.asc())
    elif sort_by == "amount_desc":
        query = query.order_by(Expense.amount_paise.desc(), Expense.id.desc())
    elif sort_by == "amount_asc":
        query = query.order_by(Expense.amount_paise.asc(), Expense.id.asc())
    else: # date_desc default
        query = query.order_by(Expense.date.desc(), Expense.id.desc())

    offset = (page - 1) * page_size
    expenses = query.offset(offset).limit(page_size).all()
    
    items = [ExpenseResponse.from_orm_model(e) for e in expenses]
    total_pages = max(1, (total_count + page_size - 1) // page_size) if total_count > 0 else 1

    return ExpenseListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        total_amount=total_amount_rupees,
        formatted_total_amount=format_inr(total_amount_rupees)
    )

def export_expenses_csv(
    db: Session,
    user_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    search: Optional[str] = None
) -> str:
    query = db.query(Expense).filter(Expense.user_id == user_id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if category and category.lower() != "all":
        query = query.filter(Expense.category == category)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Expense.description.ilike(search_pattern),
                Expense.merchant.ilike(search_pattern)
            )
        )
    expenses = query.order_by(Expense.date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Expense ID", "Date", "Description", "Merchant", "Category", "Payment Method", "Amount (INR)"])
    for exp in expenses:
        writer.writerow([
            exp.id,
            exp.date.strftime("%Y-%m-%d"),
            exp.description,
            exp.merchant or "",
            exp.category,
            exp.payment_method,
            f"{exp.amount:.2f}"
        ])
    return output.getvalue()
