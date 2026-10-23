import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine, SessionLocal
from backend.app.models.user import User

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "₹" in data["currency"]

def test_auth_and_expense_lifecycle():
    # 1. Signup
    signup_payload = {
        "email": "netflix_user@example.com",
        "password": "Password123!",
        "full_name": "Netflix Reviewer"
    }
    signup_resp = client.post("/api/auth/signup", json=signup_payload)
    if signup_resp.status_code == 400: # Already exists from previous run
        login_resp = client.post("/api/auth/login", json={"email": "netflix_user@example.com", "password": "Password123!"})
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
    else:
        assert signup_resp.status_code == 201
        token = signup_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check /me
    me_resp = client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "netflix_user@example.com"

    # 3. Add expense
    exp_payload = {
        "amount": 450.0,
        "category": "Groceries",
        "date": "2026-10-23",
        "description": "Vegetables & Milk",
        "merchant": "Reliance Fresh",
        "payment_method": "UPI"
    }
    create_resp = client.post("/api/expenses", json=exp_payload, headers=headers)
    assert create_resp.status_code == 201
    exp_data = create_resp.json()
    assert exp_data["amount"] == 450.0
    assert "₹" in exp_data["formatted_amount"]
    expense_id = exp_data["id"]

    # 4. List expenses
    list_resp = client.get("/api/expenses", headers=headers)
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] >= 1
    assert list_data["total_amount"] >= 450.0

    # 5. Set budget
    budget_payload = {
        "month": "2026-10",
        "amount": 25000.0,
        "category": None
    }
    b_resp = client.post("/api/budgets", json=budget_payload, headers=headers)
    assert b_resp.status_code == 201
    assert b_resp.json()["amount"] == 25000.0

    # 6. Check budget overview
    b_overview_resp = client.get("/api/budgets/overview?month=2026-10", headers=headers)
    assert b_overview_resp.status_code == 200
    b_overview = b_overview_resp.json()
    assert b_overview["overall"] is not None
    assert b_overview["overall"]["budget_amount"] == 25000.0

    # 7. Check dashboard analytics
    dash_resp = client.get("/api/analytics/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["summary"]["total_this_month"] >= 450.0
    assert len(dash_data["category_breakdown"]) >= 1

    # 8. Test AI Chatbot - Create expense via chat
    chat_resp1 = client.post("/api/chat/message", json={"message": "I spent ₹650 for petrol using UPI."}, headers=headers)
    assert chat_resp1.status_code == 200
    c1 = chat_resp1.json()
    assert "₹650" in c1["message"] or "650" in c1["message"]
    session_id = c1["session_id"]

    # 9. Test AI Chatbot - Contextual follow-up: "Actually, make that ₹500."
    chat_resp2 = client.post("/api/chat/message", json={"session_id": session_id, "message": "Actually, make that ₹500."}, headers=headers)
    assert chat_resp2.status_code == 200
    c2 = chat_resp2.json()
    assert "₹500" in c2["message"]

    # 10. Test AI Chatbot - Query: "What was my total again?"
    chat_resp3 = client.post("/api/chat/message", json={"session_id": session_id, "message": "What was my total again?"}, headers=headers)
    assert chat_resp3.status_code == 200

    # 11. Test AI Chatbot - Multi-expense creation: "Add coffee ₹120, lunch ₹250 and Uber ₹180 today."
    chat_resp4 = client.post("/api/chat/message", json={"session_id": session_id, "message": "Add coffee ₹120, lunch ₹250 and Uber ₹180 today."}, headers=headers)
    assert chat_resp4.status_code == 200
    assert "₹550" in chat_resp4.json()["message"] or "3 expenses" in chat_resp4.json()["message"]

    # 12. Test AI Chatbot - Delete last expense
    chat_resp5 = client.post("/api/chat/message", json={"session_id": session_id, "message": "Delete my last expense."}, headers=headers)
    assert chat_resp5.status_code == 200
    assert "Deleted" in chat_resp5.json()["message"]

    # 13. Test CSV export
    csv_resp = client.get("/api/expenses/export/csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "Expense ID,Date,Description" in csv_resp.text
