import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.expense import Expense
from backend.app.models.budget import Budget
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.chat import ChatResponse, PendingAction
from backend.app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from backend.app.services import expense_service, budget_service, analytics_service
from backend.app.services.natural_parser import (
    infer_category,
    parse_relative_date,
    parse_payment_method,
    extract_merchant,
    extract_amount,
    parse_multi_expense_items
)
from backend.app.utils.currency import format_inr, paise_to_rupees

logger = logging.getLogger("ai_service")

# Tool definitions for LLM prompting
TOOLS_SPEC = [
    {
        "name": "create_expense",
        "description": "Create a single expense in INR",
        "parameters": {
            "amount": "float in rupees",
            "category": "string category name",
            "description": "string description",
            "merchant": "optional string merchant name",
            "date": "YYYY-MM-DD string",
            "payment_method": "UPI, Cash, Credit Card, Debit Card, Net Banking"
        }
    },
    {
        "name": "create_multiple_expenses",
        "description": "Create multiple expenses in one atomic batch",
        "parameters": {
            "expenses": "list of objects with amount, category, description, merchant, date, payment_method"
        }
    },
    {
        "name": "list_expenses",
        "description": "Search and list expenses with optional filters",
        "parameters": {
            "category": "optional string category",
            "merchant": "optional string merchant",
            "min_amount": "optional float",
            "max_amount": "optional float",
            "date_range": "today, yesterday, this_week, last_week, this_month, last_month"
        }
    },
    {
        "name": "get_spending_summary",
        "description": "Get total spending for a specific date or period",
        "parameters": {
            "period": "today, yesterday, this_week, last_week, this_month, last_month",
            "category": "optional string category",
            "merchant": "optional string merchant"
        }
    },
    {
        "name": "get_category_breakdown",
        "description": "Get spending breakdown across categories for current month",
        "parameters": {}
    },
    {
        "name": "get_top_expenses",
        "description": "Get top largest expenses",
        "parameters": {
            "limit": "integer count (e.g. 5)",
            "period": "this_week, last_week, this_month, last_month, all"
        }
    },
    {
        "name": "compare_monthly_spending",
        "description": "Compare this month's spending with last month",
        "parameters": {}
    },
    {
        "name": "update_expense",
        "description": "Update an existing expense (amount, category, payment_method, etc.)",
        "parameters": {
            "target": "last, or specific criteria",
            "amount": "optional float new amount",
            "category": "optional string new category",
            "payment_method": "optional string new payment method"
        }
    },
    {
        "name": "delete_expense",
        "description": "Delete single or multiple expenses",
        "parameters": {
            "target": "last, yesterday_coffee, all_coffee_this_week, etc."
        }
    },
    {
        "name": "get_budget_status",
        "description": "Check if user is on track with budgets",
        "parameters": {}
    },
    {
        "name": "generate_spending_insights",
        "description": "Analyze spending patterns and suggest ways to reduce expenses based on data",
        "parameters": {}
    }
]

SYSTEM_PROMPT = f"""You are the AI assistant for an Indian Expense Tracker app.
Today's date is: {date.today().strftime('%Y-%m-%d')}.
All monetary amounts are strictly in Indian Rupees (INR, ₹).
You MUST inspect the user's message and select the exact application tool to run.
Return ONLY a valid JSON object with keys:
"tool": "<tool_name>",
"arguments": {{...}}

Available tools:
{json.dumps(TOOLS_SPEC, indent=2)}

Do NOT return conversational filler or prose when calling a tool. Return valid JSON only.
"""

async def query_huggingface(message: str) -> Optional[Dict[str, Any]]:
    if not settings.HUGGINGFACE_API_KEY:
        return None
    
    headers = {
        "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
        "Content-Type": "application/json"
    }

    # Hugging Face Router endpoint
    url = "https://router.huggingface.co/v1/chat/completions"
    payload = {
        "model": settings.HF_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ],
        "temperature": 0.1,
        "max_tokens": 500
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                # Extract JSON if enclosed in markdown code fences
                json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
                json_str = json_match.group(1) if json_match else content.strip()
                parsed = json.loads(json_str)
                if isinstance(parsed, dict) and "tool" in parsed:
                    return parsed
    except Exception as e:
        logger.warning(f"Hugging Face router query failed or timed out: {e}. Falling back to rule-based parser.")
        return None

    return None

def interpret_intent_with_rules(message: str, context: dict) -> Dict[str, Any]:
    """
    Deterministic NLP parser supporting all requirements:
    CREATE, READ, UPDATE, DELETE, INSIGHTS, CONTEXT
    """
    msg = message.strip()
    lower = msg.lower()

    # 1. Check for Pending Confirmation response ("yes", "confirm", "proceed", "cancel", "no")
    pending = context.get("pending_action")
    if pending:
        if any(w in lower for w in ["yes", "confirm", "proceed", "sure", "do it", "ok"]):
            return {"tool": "confirm_pending_action", "arguments": {"confirmed": True}}
        elif any(w in lower for w in ["no", "cancel", "stop", "abort", "don't"]):
            return {"tool": "confirm_pending_action", "arguments": {"confirmed": False}}

    # 2. Contextual follow-ups:
    # "Actually, make that ₹500." / "Make that 500" / "Change amount to 500"
    make_match = re.search(r'\b(?:actually,?\s*)?(?:make\s+that|change\s+that\s+to|change\s+to|update\s+to)\s+(?:₹|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)', lower)
    if make_match:
        new_amt = float(make_match.group(1).replace(",", ""))
        return {"tool": "update_expense", "arguments": {"target": "last", "amount": new_amt}}

    # "What was my total again?" / "What was my total?"
    if "what was my total" in lower or "my total again" in lower:
        return {"tool": "get_last_total", "arguments": {}}

    # "Delete the expense we just added." / "Delete my last expense"
    if any(k in lower for k in ["delete my last expense", "delete the expense we just added", "remove my last expense", "undo last expense"]):
        return {"tool": "delete_expense", "arguments": {"target": "last"}}

    # "Change its category to Food." / "Change my last expense category to Transport."
    change_cat_match = re.search(r'change\s+(?:its|my\s+last\s+expense|that)\s+category\s+to\s+([A-Za-z\s&]+)', lower)
    if change_cat_match:
        target_cat = infer_category(change_cat_match.group(1).strip())
        return {"tool": "update_expense", "arguments": {"target": "last", "category": target_cat}}

    # "Change the payment method of that transaction to UPI."
    change_pm_match = re.search(r'change\s+(?:the\s+)?payment\s+method\s+(?:of\s+that\s+transaction\s+)?to\s+([A-Za-z\s]+)', lower)
    if change_pm_match:
        pm = parse_payment_method(change_pm_match.group(1))
        return {"tool": "update_expense", "arguments": {"target": "last", "payment_method": pm}}

    # 3. Insights:
    if any(k in lower for k in ["analyze my spending", "spending pattern", "patterns", "suggest ways to reduce", "reduce my spending"]):
        return {"tool": "generate_spending_insights", "arguments": {}}
    if any(k in lower for k in ["on track with my budget", "budget status", "how is my budget"]):
        return {"tool": "get_budget_status", "arguments": {}}
    if any(k in lower for k in ["which category increased the most", "category increased", "spending jump"]):
        return {"tool": "get_most_increased_category", "arguments": {}}

    # 4. Compare months:
    if "compare this month with last month" in lower or "compare months" in lower or "compare with last month" in lower:
        return {"tool": "compare_monthly_spending", "arguments": {}}

    # 5. Queries (READ):
    # "How much did I spend on food this month?"
    cat_spend_match = re.search(r'how\s+much\s+(?:did\s+i\s+spend|spent)\s+(?:on|for)\s+([A-Za-z\s&]+?)(?:\s+(?:this\s+month|last\s+month|today|yesterday|this\s+week))?\??$', lower)
    if cat_spend_match:
        cat_candidate = cat_spend_match.group(1).strip()
        period = "this_month"
        if "last month" in lower: period = "last_month"
        elif "today" in lower: period = "today"
        elif "yesterday" in lower: period = "yesterday"
        elif "this week" in lower: period = "this_week"
        return {"tool": "get_spending_summary", "arguments": {"category": infer_category(cat_candidate), "period": period}}

    # "How much did I spend at Amazon?"
    merchant_spend_match = re.search(r'how\s+much\s+(?:did\s+i\s+spend|spent)\s+(?:at|on|with)\s+([A-Za-z0-9\s&]+?)\??$', lower)
    if merchant_spend_match:
        m_cand = merchant_spend_match.group(1).strip()
        return {"tool": "get_spending_summary", "arguments": {"merchant": m_cand, "period": "all"}}

    # "What was my total spending yesterday?" / "total spending today"
    if "total spending yesterday" in lower or "spent yesterday" in lower:
        return {"tool": "get_spending_summary", "arguments": {"period": "yesterday"}}
    if "total spending today" in lower or "spent today" in lower:
        return {"tool": "get_spending_summary", "arguments": {"period": "today"}}
    if "total spending this month" in lower or "spent this month" in lower:
        return {"tool": "get_spending_summary", "arguments": {"period": "this_month"}}

    # "Show my five biggest expenses last week." / "top expenses"
    top_match = re.search(r'(?:show|what\s+are|list)?\s*(?:my\s+)?(\d+|five|three|ten)?\s*(?:biggest|largest|top|highest)\s+expenses(?:\s+(last\s+week|this\s+week|this\s+month|last\s+month))?', lower)
    if top_match:
        limit_str = top_match.group(1) or "5"
        limit_map = {"five": 5, "three": 3, "ten": 10, "top": 5}
        limit = limit_map.get(limit_str, int(limit_str) if limit_str.isdigit() else 5)
        period_str = (top_match.group(2) or "this_month").replace(" ", "_")
        return {"tool": "get_top_expenses", "arguments": {"limit": limit, "period": period_str}}

    # "Show all expenses above ₹1,000." / "expenses above 500"
    above_match = re.search(r'expenses?\s+(?:above|greater\s+than|more\s+than|over)\s+(?:₹|rs\.?)?\s*([\d,]+)', lower)
    if above_match:
        min_amt = float(above_match.group(1).replace(",", ""))
        return {"tool": "list_expenses", "arguments": {"min_amount": min_amt}}

    # 6. Specific DELETE targets:
    # "Delete all coffee expenses from this week."
    if "delete all" in lower or "remove all" in lower:
        cat = infer_category(lower)
        period = "this_week" if "this week" in lower else "this_month"
        return {"tool": "delete_matching_expenses", "arguments": {"category": cat, "period": period}}

    # "Remove the coffee expense from yesterday."
    if "remove" in lower or "delete" in lower:
        cat = infer_category(lower)
        dt = parse_relative_date(lower)
        return {"tool": "delete_matching_expenses", "arguments": {"category": cat, "date": dt.strftime("%Y-%m-%d")}}

    # "Update yesterday's grocery expense to ₹520."
    update_match = re.search(r'update\s+(?:yesterday\'s|today\'s)?\s*([A-Za-z\s]+?)\s+expense\s+to\s+(?:₹|rs\.?)?\s*([\d,]+)', lower)
    if update_match:
        target_name = update_match.group(1)
        amt = float(update_match.group(2).replace(",", ""))
        cat = infer_category(target_name)
        dt = parse_relative_date(lower)
        return {"tool": "update_expense_by_match", "arguments": {"category": cat, "date": dt.strftime("%Y-%m-%d"), "amount": amt}}

    # 7. Multi-expense creation:
    # "Add coffee ₹120, lunch ₹250 and Uber ₹180 today."
    multi_items = parse_multi_expense_items(msg)
    if len(multi_items) > 1:
        return {"tool": "create_multiple_expenses", "arguments": {"expenses": multi_items}}
    elif len(multi_items) == 1 and ("add" in lower or "spent" in lower or "paid" in lower or "record" in lower or "₹" in msg):
        item = multi_items[0]
        return {"tool": "create_expense", "arguments": {
            "amount": item["amount"],
            "category": item["category"],
            "description": item["description"],
            "merchant": item["merchant"],
            "date": item["date"].strftime("%Y-%m-%d") if isinstance(item["date"], date) else item["date"],
            "payment_method": item["payment_method"]
        }}

    # 8. Single expense creation fallback:
    single_amt = extract_amount(msg)
    if single_amt and ("spent" in lower or "paid" in lower or "record" in lower or "add" in lower or "bought" in lower):
        cat = infer_category(msg)
        m = extract_merchant(msg, cat)
        d = parse_relative_date(msg)
        pm = parse_payment_method(msg)
        desc = re.sub(r'(?:₹|rs\.?|rupees|rupee|bucks|inr|[\d,]+(?:\.\d+)?|\b(?:i|spent|paid|record|add|bought|using|via|upi|cash|today|yesterday|day before yesterday)\b)', ' ', msg, flags=re.IGNORECASE)
        desc = re.sub(r'\s+', ' ', desc).strip()
        # Clean leading prepositions
        desc = re.sub(r'^(?:for|on|at|of)\s+', '', desc, flags=re.IGNORECASE).strip()
        if not desc or len(desc) < 2:
            desc = f"{cat} expense"
        return {"tool": "create_expense", "arguments": {
            "amount": single_amt,
            "category": cat,
            "description": desc.strip().capitalize(),
            "merchant": m,
            "date": d.strftime("%Y-%m-%d"),
            "payment_method": pm
        }}

    # Default to general spending summary if user asks how they are doing
    return {"tool": "get_spending_summary", "arguments": {"period": "this_month"}}

# Tool Execution Engine
async def execute_tool(
    db: Session,
    user: User,
    tool_name: str,
    arguments: Dict[str, Any],
    session: ChatSession
) -> Tuple[str, Optional[Dict[str, Any]], Optional[PendingAction], bool]:
    """
    Executes actual, validated database operations.
    Returns:
    (assistant_reply_message, tool_result_dict, pending_confirmation, refreshed_data_needed)
    """
    context = session.context_data
    refreshed_data_needed = False

    # 1. CREATE EXPENSE
    if tool_name == "create_expense":
        try:
            amt = float(arguments.get("amount", 0))
            if amt <= 0:
                return ("Please specify a valid expense amount greater than ₹0.", None, None, False)
            cat = arguments.get("category", "Other")
            desc = arguments.get("description", f"{cat} expense")
            merchant = arguments.get("merchant")
            dt_str = arguments.get("date")
            exp_date = datetime.strptime(dt_str, "%Y-%m-%d").date() if dt_str else date.today()
            pm = arguments.get("payment_method", "UPI")

            exp_in = ExpenseCreate(
                amount=amt,
                category=cat,
                date=exp_date,
                description=desc,
                merchant=merchant,
                payment_method=pm
            )
            created = expense_service.create_expense(db, user.id, exp_in)

            # Update context
            context["last_created_expense_ids"] = [created.id]
            context["last_referenced_expense_id"] = created.id
            session.context_data = context
            db.commit()

            msg = f"Recorded expense of **{format_inr(amt)}** for **{desc}** ({cat})"
            if merchant:
                msg += f" at *{merchant}*"
            msg += f" on {exp_date.strftime('%d %b %Y')} via {pm}."

            return (msg, {"id": created.id, "amount": amt, "category": cat}, None, True)
        except Exception as e:
            return (f"Failed to record expense: {str(e)}", None, None, False)

    # 2. CREATE MULTIPLE EXPENSES
    elif tool_name == "create_multiple_expenses":
        raw_items = arguments.get("expenses", [])
        if not raw_items:
            return ("No valid expenses were found to add.", None, None, False)

        expense_objects = []
        for it in raw_items:
            amt = float(it.get("amount", 0))
            if amt <= 0: continue
            cat = it.get("category", "Other")
            desc = it.get("description", f"{cat} expense")
            merchant = it.get("merchant")
            dt = it.get("date")
            if isinstance(dt, str):
                parsed_dt = datetime.strptime(dt, "%Y-%m-%d").date()
            elif isinstance(dt, date):
                parsed_dt = dt
            else:
                parsed_dt = date.today()
            pm = it.get("payment_method", "UPI")

            expense_objects.append(ExpenseCreate(
                amount=amt,
                category=cat,
                date=parsed_dt,
                description=desc,
                merchant=merchant,
                payment_method=pm
            ))

        if not expense_objects:
            return ("Could not parse valid expense amounts.", None, None, False)

        created_list = expense_service.create_batch_expenses(db, user.id, expense_objects)
        ids = [e.id for e in created_list]
        total_amt = sum(e.amount for e in created_list)

        context["last_created_expense_ids"] = ids
        context["last_referenced_expense_id"] = ids[-1]
        session.context_data = context
        db.commit()

        lines = [f"- **{e.description}**: {format_inr(e.amount)} ({e.category})" for e in created_list]
        msg = f"Successfully added {len(created_list)} expenses totaling **{format_inr(total_amt)}**:\n" + "\n".join(lines)
        return (msg, {"count": len(created_list), "total": total_amt, "ids": ids}, None, True)

    # 3. GET SPENDING SUMMARY
    elif tool_name == "get_spending_summary":
        period = arguments.get("period", "this_month")
        cat = arguments.get("category")
        merchant = arguments.get("merchant")
        today = date.today()

        query = db.query(Expense).filter(Expense.user_id == user.id)
        period_label = "this month"

        if period == "today":
            query = query.filter(Expense.date == today)
            period_label = "today"
        elif period == "yesterday":
            query = query.filter(Expense.date == (today - timedelta(days=1)))
            period_label = "yesterday"
        elif period == "this_week":
            start_week = today - timedelta(days=today.weekday())
            query = query.filter(Expense.date >= start_week, Expense.date <= today)
            period_label = "this week"
        elif period == "last_week":
            start_last_week = today - timedelta(days=today.weekday() + 7)
            end_last_week = start_last_week + timedelta(days=6)
            query = query.filter(Expense.date >= start_last_week, Expense.date <= end_last_week)
            period_label = "last week"
        elif period == "last_month":
            first_this_month = today.replace(day=1)
            last_month_end = first_this_month - timedelta(days=1)
            query = query.filter(
                extract("year", Expense.date) == last_month_end.year,
                extract("month", Expense.date) == last_month_end.month
            )
            period_label = f"in {last_month_end.strftime('%B %Y')}"
        elif period == "all":
            period_label = "in total"
        else: # this_month
            query = query.filter(
                extract("year", Expense.date) == today.year,
                extract("month", Expense.date) == today.month
            )
            period_label = "this month"

        if cat:
            query = query.filter(Expense.category == cat)
        if merchant:
            query = query.filter(Expense.merchant.ilike(f"%{merchant}%"))

        total_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
            Expense.id.in_(query.with_entities(Expense.id))
        ).scalar() or 0
        total_amt = paise_to_rupees(total_paise)
        count = query.count()

        # Save to context
        context["last_calculated_totals"] = {"total": total_amt, "count": count, "period": period_label}
        session.context_data = context
        db.commit()

        target_str = ""
        if cat: target_str += f" on **{cat}**"
        if merchant: target_str += f" at **{merchant}**"

        if count == 0:
            msg = f"You had no recorded expenses{target_str} {period_label}."
        else:
            msg = f"Your total spending{target_str} {period_label} is **{format_inr(total_amt)}** across {count} transaction(s)."

        return (msg, {"total": total_amt, "count": count}, None, False)

    # 4. GET LAST TOTAL
    elif tool_name == "get_last_total":
        last_tot = context.get("last_calculated_totals")
        if last_tot:
            return (f"Your previous calculated total was **{format_inr(last_tot['total'])}** ({last_tot['count']} transactions for {last_tot.get('period', 'the requested period')}).", last_tot, None, False)
        else:
            # Calculate this month's total
            today = date.today()
            this_month_paise = db.query(func.coalesce(func.sum(Expense.amount_paise), 0)).filter(
                Expense.user_id == user.id,
                extract("year", Expense.date) == today.year,
                extract("month", Expense.date) == today.month
            ).scalar() or 0
            amt = paise_to_rupees(this_month_paise)
            return (f"Your total spending this month is **{format_inr(amt)}**.", {"total": amt}, None, False)

    # 5. GET TOP EXPENSES
    elif tool_name == "get_top_expenses":
        limit = arguments.get("limit", 5)
        period = arguments.get("period", "this_month")
        today = date.today()

        query = db.query(Expense).filter(Expense.user_id == user.id)
        if period == "last_week":
            start_last_week = today - timedelta(days=today.weekday() + 7)
            end_last_week = start_last_week + timedelta(days=6)
            query = query.filter(Expense.date >= start_last_week, Expense.date <= end_last_week)
            period_label = "last week"
        elif period == "this_week":
            start_week = today - timedelta(days=today.weekday())
            query = query.filter(Expense.date >= start_week, Expense.date <= today)
            period_label = "this week"
        elif period == "last_month":
            first_this_month = today.replace(day=1)
            last_month_end = first_this_month - timedelta(days=1)
            query = query.filter(
                extract("year", Expense.date) == last_month_end.year,
                extract("month", Expense.date) == last_month_end.month
            )
            period_label = f"in {last_month_end.strftime('%B %Y')}"
        elif period == "all":
            period_label = "all time"
        else:
            query = query.filter(
                extract("year", Expense.date) == today.year,
                extract("month", Expense.date) == today.month
            )
            period_label = "this month"

        top_expenses = query.order_by(Expense.amount_paise.desc()).limit(limit).all()
        if not top_expenses:
            return (f"No expenses found for {period_label}.", None, None, False)

        lines = [f"{idx+1}. **{e.description}** — {format_inr(e.amount)} ({e.category}, {e.date.strftime('%d %b')})" for idx, e in enumerate(top_expenses)]
        msg = f"Here are your top {len(top_expenses)} largest expenses {period_label}:\n" + "\n".join(lines)
        return (msg, {"count": len(top_expenses)}, None, False)

    # 6. COMPARE MONTHLY SPENDING
    elif tool_name == "compare_monthly_spending":
        dash = analytics_service.get_dashboard_analytics(db, user.id)
        curr = dash.summary.total_this_month
        prev = dash.summary.total_last_month
        pct = dash.summary.mom_percentage_change
        m_type = dash.summary.mom_change_type

        if prev == 0 and curr == 0:
            msg = "You have no recorded expenses for either this month or last month."
        elif prev == 0:
            msg = f"This month you have spent **{format_inr(curr)}**. There was no spending recorded last month."
        else:
            change_word = "more" if pct > 0 else "less"
            diff = abs(curr - prev)
            msg = (f"This month's spending is **{format_inr(curr)}** compared to **{format_inr(prev)}** last month.\n"
                   f"That is a **{abs(pct)}% {m_type}** ({format_inr(diff)} {change_word} than last month).")
        return (msg, {"this_month": curr, "last_month": prev, "pct_change": pct}, None, False)

    # 7. UPDATE EXPENSE
    elif tool_name == "update_expense":
        target = arguments.get("target", "last")
        target_id = None
        if target == "last":
            target_id = context.get("last_referenced_expense_id")
            if not target_id and context.get("last_created_expense_ids"):
                target_id = context["last_created_expense_ids"][-1]
        
        if not target_id:
            # Find the most recent expense for this user
            most_recent = db.query(Expense).filter(Expense.user_id == user.id).order_by(Expense.date.desc(), Expense.id.desc()).first()
            if most_recent:
                target_id = most_recent.id

        if not target_id:
            return ("No recent expense found to update.", None, None, False)

        exp = expense_service.get_expense(db, user.id, target_id)
        if not exp:
            return (f"Expense with ID {target_id} could not be found.", None, None, False)

        old_amt = exp.amount
        old_cat = exp.category

        update_payload = ExpenseUpdate()
        if "amount" in arguments and arguments["amount"] is not None:
            update_payload.amount = float(arguments["amount"])
        if "category" in arguments and arguments["category"]:
            update_payload.category = arguments["category"]
        if "payment_method" in arguments and arguments["payment_method"]:
            update_payload.payment_method = arguments["payment_method"]

        updated = expense_service.update_expense(db, user.id, target_id, update_payload)
        context["last_referenced_expense_id"] = updated.id
        session.context_data = context
        db.commit()

        msg = f"Updated **{updated.description}**: amount is now **{format_inr(updated.amount)}** ({updated.category}, {updated.payment_method})."
        return (msg, {"id": updated.id, "amount": updated.amount, "category": updated.category}, None, True)

    # 8. UPDATE EXPENSE BY MATCH
    elif tool_name == "update_expense_by_match":
        cat = arguments.get("category")
        dt_str = arguments.get("date")
        new_amt = arguments.get("amount")
        query = db.query(Expense).filter(Expense.user_id == user.id)
        if cat and cat != "Other":
            query = query.filter(Expense.category == cat)
        if dt_str:
            d = datetime.strptime(dt_str, "%Y-%m-%d").date()
            query = query.filter(Expense.date == d)
        target_exp = query.order_by(Expense.id.desc()).first()
        if not target_exp:
            return (f"Could not find a matching expense to update.", None, None, False)
        
        updated = expense_service.update_expense(db, user.id, target_exp.id, ExpenseUpdate(amount=new_amt))
        context["last_referenced_expense_id"] = updated.id
        session.context_data = context
        db.commit()
        return (f"Updated {updated.description} on {updated.date} to **{format_inr(updated.amount)}**.", {"id": updated.id}, None, True)

    # 9. DELETE EXPENSE (Single)
    elif tool_name == "delete_expense":
        target = arguments.get("target", "last")
        target_id = None
        if target == "last":
            target_id = context.get("last_referenced_expense_id")
            if not target_id and context.get("last_created_expense_ids"):
                target_id = context["last_created_expense_ids"][-1]

        if not target_id:
            most_recent = db.query(Expense).filter(Expense.user_id == user.id).order_by(Expense.date.desc(), Expense.id.desc()).first()
            if most_recent:
                target_id = most_recent.id

        if not target_id:
            return ("No recent expense found to delete.", None, None, False)

        exp = expense_service.get_expense(db, user.id, target_id)
        if not exp:
            return ("The specified expense does not exist or was already deleted.", None, None, False)

        desc = exp.description
        amt = exp.amount
        expense_service.delete_expense(db, user.id, target_id)

        # Clear from context
        if context.get("last_referenced_expense_id") == target_id:
            context["last_referenced_expense_id"] = None
        if context.get("last_created_expense_ids"):
            context["last_created_expense_ids"] = [i for i in context["last_created_expense_ids"] if i != target_id]
        session.context_data = context
        db.commit()

        return (f"Deleted expense **{desc}** ({format_inr(amt)}).", {"deleted_id": target_id}, None, True)

    # 10. DELETE MATCHING EXPENSES (with Multi-record explicit confirmation safety!)
    elif tool_name == "delete_matching_expenses":
        cat = arguments.get("category")
        period = arguments.get("period")
        dt_str = arguments.get("date")

        query = db.query(Expense).filter(Expense.user_id == user.id)
        desc_parts = []
        if cat and cat != "Other":
            query = query.filter(Expense.category == cat)
            desc_parts.append(f"category '{cat}'")
        if dt_str:
            d = datetime.strptime(dt_str, "%Y-%m-%d").date()
            query = query.filter(Expense.date == d)
            desc_parts.append(f"date {d}")
        elif period == "this_week":
            start_week = date.today() - timedelta(days=date.today().weekday())
            query = query.filter(Expense.date >= start_week)
            desc_parts.append("this week")

        matching = query.all()
        count = len(matching)
        if count == 0:
            return ("No matching expenses found to delete.", None, None, False)

        total_paise = sum(e.amount_paise for e in matching)
        total_amt = paise_to_rupees(total_paise)
        ids = [e.id for e in matching]

        if count == 1:
            # Single item direct deletion
            e = matching[0]
            expense_service.delete_expense(db, user.id, e.id)
            return (f"Deleted expense **{e.description}** for **{format_inr(e.amount)}**.", {"deleted_ids": ids}, None, True)

        # Multiple items: Require explicit confirmation!
        pending_act = PendingAction(
            action_type="confirm_delete",
            description=f"Delete {count} expenses ({', '.join(desc_parts)})",
            target_ids=ids,
            total_amount=total_amt,
            formatted_total_amount=format_inr(total_amt),
            count=count
        )
        context["pending_action"] = pending_act.model_dump()
        session.context_data = context
        db.commit()

        msg = (f"Found **{count}** matching expenses totaling **{format_inr(total_amt)}**.\n"
               f"Are you sure you want to delete these {count} records? Reply **Yes** to confirm or **Cancel** to abort.")
        return (msg, None, pending_act, False)

    # 11. CONFIRM PENDING ACTION
    elif tool_name == "confirm_pending_action":
        confirmed = arguments.get("confirmed", False)
        pending = context.get("pending_action")
        if not pending:
            return ("There is no pending action waiting for confirmation.", None, None, False)

        if not confirmed:
            context["pending_action"] = None
            session.context_data = context
            db.commit()
            return ("Cancelled. No expenses were deleted.", None, None, False)

        if pending.get("action_type") == "confirm_delete":
            ids = pending.get("target_ids", [])
            deleted_count = expense_service.delete_expenses_by_ids(db, user.id, ids)
            tot = pending.get("total_amount", 0)
            context["pending_action"] = None
            session.context_data = context
            db.commit()
            return (f"Confirmed. Successfully deleted **{deleted_count}** expenses totaling **{format_inr(tot)}**.", {"deleted_count": deleted_count}, None, True)

    # 12. BUDGET STATUS
    elif tool_name == "get_budget_status":
        overview = budget_service.get_monthly_budget_overview(db, user.id)
        if not overview.overall and not overview.categories:
            return ("You haven't set any monthly budgets yet. Go to the Budgets page to set spending limits!", None, None, False)

        lines = []
        if overview.overall:
            o = overview.overall
            status = "⚠️ Warning (80%+ consumed)" if o.is_warning else ("🚨 OVER BUDGET!" if o.is_over_budget else "✅ On track")
            lines.append(f"- **Overall Budget**: {o.formatted_spent} of {o.formatted_budget} used ({o.percentage_used}%) — {status}")

        for c in overview.categories:
            st = "⚠️ Warning" if c.is_warning else ("🚨 OVER BUDGET" if c.is_over_budget else "✅ Normal")
            lines.append(f"- **{c.category_display}**: {c.formatted_spent} of {c.formatted_budget} ({c.percentage_used}%) — {st}")

        msg = "Here is your current budget status:\n" + "\n".join(lines)
        return (msg, {"total_budget": overview.total_budget, "total_spent": overview.total_spent}, None, False)

    # 13. SPENDING INSIGHTS
    elif tool_name == "generate_spending_insights":
        dash = analytics_service.get_dashboard_analytics(db, user.id)
        curr = dash.summary.total_this_month
        categories = dash.category_breakdown

        if curr == 0:
            return ("You have no recorded expenses this month yet. Start tracking to receive personalized insights!", None, None, False)

        lines = [f"### 💡 Spending Analysis for This Month ({format_inr(curr)} total)"]
        if categories:
            top_c = categories[0]
            lines.append(f"- **Top Expenditure**: Your highest category is **{top_c.category}** at **{top_c.formatted_amount}** ({top_c.percentage}% of all expenses).")
            if len(categories) > 1:
                second = categories[1]
                lines.append(f"- **Secondary Category**: **{second.category}** accounts for **{second.formatted_amount}** ({second.percentage}%).")

        # MoM observation
        if dash.summary.mom_percentage_change != 0 and dash.summary.total_last_month > 0:
            direction = "increased" if dash.summary.mom_percentage_change > 0 else "decreased"
            lines.append(f"- **Trend**: Your spending has {direction} by **{abs(dash.summary.mom_percentage_change)}%** compared to last month.")

        # Practical recommendations
        lines.append("\n**Actionable Recommendations:**")
        lines.append("- Review recurring subscriptions and utility bills to eliminate unused services.")
        lines.append("- Consider setting a category-specific budget for your top spending categories.")
        lines.append("- Track daily micro-transactions (like coffee and snacks) using UPI voice/text logging.")

        return ("\n".join(lines), {"top_category": categories[0].category if categories else None}, None, False)

    # 14. LIST EXPENSES (Filter match)
    elif tool_name == "list_expenses":
        min_amt = arguments.get("min_amount")
        max_amt = arguments.get("max_amount")
        cat = arguments.get("category")
        res = expense_service.list_expenses(db, user.id, min_amount=min_amt, max_amount=max_amt, category=cat, page_size=10)
        if res.total == 0:
            return ("No matching expenses found for those criteria.", None, None, False)

        lines = [f"- **{e.description}**: {e.formatted_amount} ({e.category}, {e.date.strftime('%d %b')})" for e in res.items]
        msg = f"Found **{res.total}** expense(s) totaling **{res.formatted_total_amount}**:\n" + "\n".join(lines)
        return (msg, {"count": res.total, "total": res.total_amount}, None, False)

    return ("I've processed your request. How else can I help you manage your finances?", None, None, False)

# Main Chatbot Entrypoint
async def handle_chat_message(
    db: Session,
    user: User,
    message_text: str,
    session_id: Optional[int] = None
) -> ChatResponse:
    # 1. Retrieve or create session
    if session_id:
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    else:
        session = None

    if not session:
        session = ChatSession(
            user_id=user.id,
            title=message_text[:35] + ("..." if len(message_text) > 35 else "")
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 2. Save user message to database
    user_msg_db = ChatMessage(
        session_id=session.id,
        role="user",
        content=message_text
    )
    db.add(user_msg_db)
    db.commit()

    context = session.context_data

    # 3. Multi-layer NLP Interpretation
    # First attempt with Hugging Face LLM if configured; fallback seamlessly to deterministic parser
    tool_invocation = None
    if settings.HUGGINGFACE_API_KEY:
        tool_invocation = await query_huggingface(message_text)

    if not tool_invocation or "tool" not in tool_invocation:
        tool_invocation = interpret_intent_with_rules(message_text, context)

    tool_name = tool_invocation.get("tool", "get_spending_summary")
    tool_args = tool_invocation.get("arguments", {})

    # 4. Execute tool
    reply_text, tool_result, pending_conf, refreshed_needed = await execute_tool(
        db=db,
        user=user,
        tool_name=tool_name,
        arguments=tool_args,
        session=session
    )

    # 5. Save assistant reply to database
    assistant_msg_db = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=reply_text,
        tool_calls_raw=json.dumps(tool_invocation, default=str),
        tool_results_raw=json.dumps(tool_result, default=str) if tool_result else None
    )
    db.add(assistant_msg_db)
    db.commit()

    return ChatResponse(
        session_id=session.id,
        message=reply_text,
        intent=tool_name,
        tool_executed=tool_name,
        tool_result=tool_result,
        pending_confirmation=pending_conf,
        refreshed_data_needed=refreshed_needed
    )
