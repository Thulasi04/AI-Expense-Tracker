from fastapi import APIRouter
from backend.app.api.auth import router as auth_router
from backend.app.api.expenses import router as expenses_router
from backend.app.api.budgets import router as budgets_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.categories import router as categories_router
from backend.app.api.chat import router as chat_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(expenses_router)
api_router.include_router(budgets_router)
api_router.include_router(analytics_router)
api_router.include_router(categories_router)
api_router.include_router(chat_router)
