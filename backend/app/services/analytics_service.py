from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from backend.app.models.expense import Expense
from backend.app.models.budget import Budget
from backend.app.models.category import DEFAULT_CATEGORIES
from backend.app.schemas.analytics import (
    SpendingSummaryResponse,
    CategoryBreakdownItem,
    MerchantBreakdownItem,
    SpendingTrendItem,
    MonthlyComparisonItem,
    AnalyticsDashboardResponse
)
from backend.app.schemas.expense import ExpenseResponse
from backend.app.utils.currency import paise_to_rupees, format_inr

CATEGORY_COLOR_MAP = {c["name"]: c["color"] for c in DEFAULT_CATEGORIES}
CATEGORY_COLOR_MAP.update({
    "Food": "#E50914",
    "Groceries": "#10B981",
    "Restaurants": "#F59E0B",
    "Transport": "#3B82F6",
    "Entertainment": "#8B5CF6",
    "Bills & Utilities": "#EC4899",
    "Shopping": "#F97316",
    "Healthcare": "#EF4444",
    "Education": "#6366F1",
    "Rent": "#14B8A6",
    "Travel": "#06B6D4",
    "Personal Care": "#D946EF",
    "Other": "#6B7280"
})

def get_color_for_category(name: str) -> str:
    return CATEGORY_COLOR_MAP.get(name, "#E50914")

def get_dashboard_analytics(db: Session, user_id: int) -> AnalyticsDashboardResponse:
    today = date.today()
    current_year = today.year
    current_month = today.month
    
    # Previous month calculations
    if current_month == 1:
        prev_month = 12
        prev_year = current_year - 1
    else:
        prev_month = current_month - 1
        prev_year = current_year

    # 1. Total this month
    this_month_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
        Expense.user_id == user_id,
        extract("year", Expense.date) == current_year,
        extract("month", Expense.date) == current_month
    ).scalar() or 0
    this_month_rupees = paise_to_rupees(this_month_paise)

    # 2. Total last month
    last_month_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
        Expense.user_id == user_id,
        extract("year", Expense.date) == prev_year,
        extract("month", Expense.date) == prev_month
    ).scalar() or 0
    last_month_rupees = paise_to_rupees(last_month_paise)

    # 3. MoM Percentage change = ((Current - Previous) / Previous) * 100
    if last_month_rupees > 0:
        mom_change = ((this_month_rupees - last_month_rupees) / last_month_rupees) * 100.0
        if mom_change > 0:
            mom_type = "increase"
        elif mom_change < 0:
            mom_type = "decrease"
        else:
            mom_type = "flat"
    else:
        if this_month_rupees > 0:
            mom_change = 100.0
            mom_type = "new"
        else:
            mom_change = 0.0
            mom_type = "flat"

    # 4. Total today
    today_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
        Expense.user_id == user_id,
        Expense.date == today
    ).scalar() or 0
    today_rupees = paise_to_rupees(today_paise)

    # 5. Monthly budget & remaining
    current_month_str = f"{current_year:04d}-{current_month:02d}"
    overall_budget_obj = db.query(Budget).filter(
        Budget.user_id == user_id,
        Budget.month == current_month_str,
        Budget.category.is_(None)
    ).first()

    monthly_budget_rupees = overall_budget_obj.amount if overall_budget_obj else 0.0
    remaining_budget_rupees = max(0.0, monthly_budget_rupees - this_month_rupees) if monthly_budget_rupees > 0 else 0.0
    budget_pct = (this_month_rupees / monthly_budget_rupees * 100.0) if monthly_budget_rupees > 0 else 0.0

    summary = SpendingSummaryResponse(
        total_this_month=this_month_rupees,
        formatted_this_month=format_inr(this_month_rupees),
        total_last_month=last_month_rupees,
        formatted_last_month=format_inr(last_month_rupees),
        mom_percentage_change=round(mom_change, 1),
        mom_change_type=mom_type,
        total_today=today_rupees,
        formatted_today=format_inr(today_rupees),
        monthly_budget=monthly_budget_rupees,
        formatted_monthly_budget=format_inr(monthly_budget_rupees),
        remaining_budget=remaining_budget_rupees,
        formatted_remaining_budget=format_inr(remaining_budget_rupees),
        budget_used_percentage=round(budget_pct, 1)
    )

    # 6. Category Breakdown for current month
    cat_query = db.query(
        Expense.category,
        func.sum(Expense.amount_paise).label("cat_paise"),
        func.count(Expense.id).label("cat_count")
    ).filter(
        Expense.user_id == user_id,
        extract("year", Expense.date) == current_year,
        extract("month", Expense.date) == current_month
    ).group_by(Expense.category).order_by(func.sum(Expense.amount_paise).desc()).all()

    category_breakdown = []
    for cat_name, c_paise, c_count in cat_query:
        amt = paise_to_rupees(c_paise)
        pct = (amt / this_month_rupees * 100.0) if this_month_rupees > 0 else 0.0
        category_breakdown.append(CategoryBreakdownItem(
            category=cat_name,
            total_amount=amt,
            formatted_amount=format_inr(amt),
            percentage=round(pct, 1),
            count=c_count,
            color=get_color_for_category(cat_name)
        ))

    # 7. Top Merchants for current month
    merchant_query = db.query(
        Expense.merchant,
        func.sum(Expense.amount_paise).label("m_paise"),
        func.count(Expense.id).label("m_count")
    ).filter(
        Expense.user_id == user_id,
        extract("year", Expense.date) == current_year,
        extract("month", Expense.date) == current_month,
        Expense.merchant.isnot(None),
        Expense.merchant != ""
    ).group_by(Expense.merchant).order_by(func.sum(Expense.amount_paise).desc()).limit(5).all()

    top_merchants = [
        MerchantBreakdownItem(
            merchant=m_name,
            total_amount=paise_to_rupees(m_paise),
            formatted_amount=format_inr(paise_to_rupees(m_paise)),
            count=m_count
        )
        for m_name, m_paise, m_count in merchant_query
    ]

    # 8. Recent 5 Transactions
    recent_db_expenses = db.query(Expense).filter(
        Expense.user_id == user_id
    ).order_by(Expense.date.desc(), Expense.id.desc()).limit(5).all()
    recent_expenses = [ExpenseResponse.from_orm_model(e) for e in recent_db_expenses]

    # 9. Spending trends for last 30 days
    start_30 = today - timedelta(days=29)
    trend_query = db.query(
        Expense.date,
        func.sum(Expense.amount_paise).label("d_paise"),
        func.count(Expense.id).label("d_count")
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_30,
        Expense.date <= today
    ).group_by(Expense.date).order_by(Expense.date.asc()).all()

    trend_map = {row.date: (row.d_paise, row.d_count) for row in trend_query}
    spending_trends = []
    for day_offset in range(30):
        d = start_30 + timedelta(days=day_offset)
        d_paise, d_count = trend_map.get(d, (0, 0))
        amt = paise_to_rupees(d_paise)
        spending_trends.append(SpendingTrendItem(
            date=d.strftime("%b %d"),
            amount=amt,
            formatted_amount=format_inr(amt),
            count=d_count
        ))

    # 10. Monthly comparison over last 6 months
    monthly_comparison = []
    for i in range(5, -1, -1):
        # Calculate target year and month
        m_offset = current_month - i
        y_offset = current_year
        while m_offset <= 0:
            m_offset += 12
            y_offset -= 1
        m_str = f"{y_offset:04d}-{m_offset:02d}"
        label = datetime(y_offset, m_offset, 1).strftime("%b %Y")
        
        m_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
            Expense.user_id == user_id,
            extract("year", Expense.date) == y_offset,
            extract("month", Expense.date) == m_offset
        ).scalar() or 0
        amt = paise_to_rupees(m_paise)
        monthly_comparison.append(MonthlyComparisonItem(
            month=m_str,
            label=label,
            total_amount=amt,
            formatted_amount=format_inr(amt)
        ))

    return AnalyticsDashboardResponse(
        summary=summary,
        category_breakdown=category_breakdown,
        top_merchants=top_merchants,
        recent_expenses=recent_expenses,
        spending_trends=spending_trends,
        monthly_comparison=monthly_comparison
    )
