from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from backend.app.models.budget import Budget
from backend.app.models.expense import Expense
from backend.app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetStatusItem, BudgetOverviewResponse
from backend.app.utils.currency import rupees_to_paise, paise_to_rupees, format_inr

def get_current_month_str() -> str:
    now = datetime.now()
    return f"{now.year:04d}-{now.month:02d}"

def set_or_update_budget(db: Session, user_id: int, budget_in: BudgetCreate) -> Budget:
    cat = budget_in.category.strip() if budget_in.category and budget_in.category != "__TOTAL__" else None
    month = budget_in.month.strip()
    
    existing = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.month == month,
        Budget.category == cat
    ).first()

    paise = rupees_to_paise(budget_in.amount)
    if existing:
        existing.amount_paise = paise
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_budget = Budget(
            user_id=user_id,
            month=month,
            category=cat,
            amount_paise=paise
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return new_budget

def delete_budget(db: Session, user_id: int, budget_id: int) -> bool:
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user_id).first()
    if not budget:
        return False
    db.delete(budget)
    db.commit()
    return True

def get_monthly_budget_overview(db: Session, user_id: int, month: Optional[str] = None) -> BudgetOverviewResponse:
    if not month:
        month = get_current_month_str()

    year_int, month_int = [int(p) for p in month.split("-")]

    # 1. Fetch all budgets for this user and month
    budgets = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.month == month
    ).all()

    # 2. Fetch total spending for this month
    expenses = db.query(Expense).filter(
        Expense.user_id == user_id,
        extract("year", Expense.date) == year_int,
        extract("month", Expense.date) == month_int
    ).all()

    # Aggregate spending by category and overall
    total_spent_paise = sum(e.amount_paise for e in expenses)
    cat_spent_paise = {}
    for e in expenses:
        cat_spent_paise[e.category] = cat_spent_paise.get(e.category, 0) + e.amount_paise

    # Find overall budget (where category is None)
    overall_budget_obj = next((b for b in budgets if b.category is None), None)
    
    overall_item = None
    if overall_budget_obj:
        budget_amt = overall_budget_obj.amount
        spent_amt = paise_to_rupees(total_spent_paise)
        rem_amt = budget_amt - spent_amt
        pct = (spent_amt / budget_amt * 100.0) if budget_amt > 0 else 0.0
        overall_item = BudgetStatusItem(
            budget_id=overall_budget_obj.id,
            month=month,
            category=None,
            category_display="Overall Monthly Budget",
            budget_amount=budget_amt,
            formatted_budget=format_inr(budget_amt),
            spent_amount=spent_amt,
            formatted_spent=format_inr(spent_amt),
            remaining_amount=rem_amt,
            formatted_remaining=format_inr(rem_amt),
            percentage_used=round(pct, 1),
            is_warning=pct >= 80.0 and pct < 100.0,
            is_over_budget=pct >= 100.0
        )

    # Category budgets
    category_items = []
    category_budgets = [b for b in budgets if b.category is not None]
    
    # Also collect categories that have spending even if no budget set
    for b in category_budgets:
        cat = b.category
        budget_amt = b.amount
        spent_paise = cat_spent_paise.get(cat, 0)
        spent_amt = paise_to_rupees(spent_paise)
        rem_amt = budget_amt - spent_amt
        pct = (spent_amt / budget_amt * 100.0) if budget_amt > 0 else 0.0
        category_items.append(BudgetStatusItem(
            budget_id=b.id,
            month=month,
            category=cat,
            category_display=cat,
            budget_amount=budget_amt,
            formatted_budget=format_inr(budget_amt),
            spent_amount=spent_amt,
            formatted_spent=format_inr(spent_amt),
            remaining_amount=rem_amt,
            formatted_remaining=format_inr(rem_amt),
            percentage_used=round(pct, 1),
            is_warning=pct >= 80.0 and pct < 100.0,
            is_over_budget=pct >= 100.0
        ))

    total_budget_rupees = sum(b.amount for b in budgets)
    total_spent_rupees = paise_to_rupees(total_spent_paise)

    return BudgetOverviewResponse(
        month=month,
        overall=overall_item,
        categories=category_items,
        total_budget=total_budget_rupees,
        total_spent=total_spent_rupees,
        formatted_total_budget=format_inr(total_budget_rupees),
        formatted_total_spent=format_inr(total_spent_rupees)
    )
