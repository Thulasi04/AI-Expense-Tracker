# Flixpense AI — Netflix-Inspired AI Expense Tracker

An end-to-end, production-grade financial web application with a **Netflix-inspired dark visual aesthetic**, powered by **FastAPI, React with Vite, SQLite, Hugging Face LLM integration**, and **Tesseract.js OCR**.

All monetary calculations and displays are strictly formatted in **Indian Rupees (INR ₹)** using decimal-safe integer paise arithmetic.

---

## 🚀 Key Features

### 1. Conversational Financial AI Assistant (Highest Priority)
- Persistent / collapsible chat drawer executing **actual, validated database transactions**.
- **Multi-layer Architecture**:
  1. Natural-language interpretation via **Hugging Face Inference API** (`Qwen/Qwen2.5-72B-Instruct` or `Llama-3.2`) with seamless deterministic fallback engine.
  2. Strict Pydantic parameter validation & anti-SQL-injection layer.
  3. Context-aware session memory persisted in SQLite (`last_created_expense_ids`, `last_referenced_expense_id`, `last_calculated_totals`, `pending_action`).
  4. Multi-item delete safety: calculates matching count & total in INR, and prompts for explicit confirmation before executing.
- **Natural Language Parsing**:
  - **CREATE**: *"I spent ₹450 on groceries at Reliance Fresh yesterday"*, *"Add coffee ₹120, lunch ₹250 and Uber ₹180 today"*, *"Record ₹650 for petrol using UPI"*.
  - **READ**: *"How much did I spend on food this month?"*, *"Show my five biggest expenses last week"*, *"Compare this month with last month"*, *"Show all expenses above ₹1,000"*.
  - **UPDATE**: *"Change my last expense category to Transport"*, *"Actually, make that ₹500"*, *"Change payment method to UPI"*.
  - **DELETE**: *"Delete my last expense"*, *"Delete all coffee expenses from this week"*.
  - **INSIGHTS**: *"Analyze my spending patterns"*, *"Am I on track with my budget?"*, *"Suggest ways to reduce my spending"*.
  - **CONTEXT**: *"What was my total again?"*, *"Delete the expense we just added"*.

### 2. Netflix-Inspired Dark UI
- Charcoal and obsidian dark palettes (`#141414`, `#0f0f0f`, `#181818`, `#232323`).
- Netflix signature red accent (`#E50914`, hover `#F40612`) with glowing ambient shadows.
- Responsive cards with restrained borders, glassmorphic headers, and smooth micro-transitions.
- Formatted in Indian locale: e.g. `₹1,25,000.00` or `₹450.00`. Zero dollar signs or USD anywhere.

### 3. Full CRUD Expense Management & OCR Receipt Scanner
- Add, Edit, Delete, Paginate, Search (by merchant, description, category).
- Filters: Date range, category, payment method (UPI, Cash, Credit Card, Debit Card, Net Banking), and sorting.
- **Client-Side OCR**: Powered by `Tesseract.js` — upload or drag-and-drop physical bills to auto-detect total amount, vendor name, and date.
- **CSV Export**: 1-click export of filtered transaction records.

### 4. Interactive Analytics & Budget Tracking
- Built with **Recharts**:
  - 30-Day Spending Trend Area Chart (with red gradient fill).
  - Category Share Donut Chart with custom dark tooltips.
  - 6-Month Month-over-Month Bar Chart.
  - Top 5 Merchants ranking.
- **Budgeting**: Overall monthly budget and category-specific budgets with automated warnings (Amber at 80%, Crimson danger alert at 100%+).

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Axios, Recharts, Lucide React, Tesseract.js |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy ORM, Pydantic v2, Argon2 password hashing, PyJWT |
| **Database** | SQLite (development & Render deployment) / PostgreSQL compatible |
| **AI / NLP** | Hugging Face Router API (`Qwen/Qwen2.5-72B-Instruct`) + Hybrid Indian NLP regex parser |
| **Hosting** | Render Web Service (Single unified deployment with SPA static fallback) |

---

## 🌐 Deploying to Render (Mandatory Live Demo)

The repository is pre-configured with `render.yaml`, `build.sh`, and `start.sh` so FastAPI automatically serves the built React frontend and API on a single free Web Service!

### Step 1: Push Repository to GitHub
```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and log in.
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Set the following configuration:
   - **Name**: `flixpense-ai`
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `./start.sh`
5. Under **Environment Variables**, add:
   - `SECRET_KEY`: (Enter any secure 32+ character random string)
   - `DATABASE_URL`: `sqlite:///./expenses.db` (or a persistent path like `/data/expenses.db` if using a Render Disk, or Render PostgreSQL URL)
   - `HUGGINGFACE_API_KEY`: *(Optional: if not provided, the app uses its robust deterministic NLP engine)*
   - `HF_MODEL`: `Qwen/Qwen2.5-72B-Instruct`
6. Click **Create Web Service**.
7. Once deployed, Render will provide your working live demo URL (e.g. `https://flixpense-ai.onrender.com`).

---

## 💻 Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# In project root:
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Run FastAPI backend on port 8000:
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be live at: `http://127.0.0.1:8000`  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# In frontend directory:
cd frontend
npm install
npm run dev
```
Frontend will be live at: `http://localhost:5173` (proxies `/api` to port 8000).

### 4. Run Automated Test Suite
```bash
PYTHONPATH=. ./venv/bin/pytest backend/tests/test_api.py -v
```

---

## 🔐 Demo Credentials

Use these credentials or click the **"Fill Demo Credentials"** button on the Login page:
- **Email**: `netflix_user@example.com`
- **Password**: `Password123!`

---

## 📜 License
MIT License. Built for modern financial tracking with state-of-the-art AI.
