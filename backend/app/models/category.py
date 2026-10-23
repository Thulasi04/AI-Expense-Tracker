from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

DEFAULT_CATEGORIES = [
    {"name": "Food", "icon": "Utensils", "color": "#E50914"},
    {"name": "Groceries", "icon": "ShoppingCart", "color": "#10B981"},
    {"name": "Restaurants", "icon": "Coffee", "color": "#F59E0B"},
    {"name": "Transport", "icon": "Car", "color": "#3B82F6"},
    {"name": "Entertainment", "icon": "Film", "color": "#8B5CF6"},
    {"name": "Bills & Utilities", "icon": "Zap", "color": "#EC4899"},
    {"name": "Shopping", "icon": "ShoppingBag", "color": "#F97316"},
    {"name": "Healthcare", "icon": "HeartPulse", "color": "#EF4444"},
    {"name": "Education", "icon": "GraduationCap", "color": "#6366F1"},
    {"name": "Rent", "icon": "Home", "color": "#14B8A6"},
    {"name": "Travel", "icon": "Plane", "color": "#06B6D4"},
    {"name": "Personal Care", "icon": "Sparkles", "color": "#D946EF"},
    {"name": "Other", "icon": "Tag", "color": "#6B7280"},
]

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), default="Tag")
    color = Column(String(20), default="#E50914")
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="custom_categories")
