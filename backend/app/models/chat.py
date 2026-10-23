import json
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="Expense Assistant", nullable=False)
    
    # Serialized JSON dictionary storing conversation memory
    # {
    #   "last_created_expense_ids": [12, 13],
    #   "last_referenced_expense_id": 13,
    #   "last_query_params": {"category": "Food", "month": "2026-10"},
    #   "last_calculated_totals": {"total": 450.0, "count": 1},
    #   "pending_action": {"action": "confirm_delete", "expense_ids": [12, 13], "count": 2, "total": 600.0}
    # }
    context_data_raw = Column(Text, default="{}", nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

    @property
    def context_data(self) -> dict:
        try:
            return json.loads(self.context_data_raw or "{}")
        except Exception:
            return {}

    @context_data.setter
    def context_data(self, value: dict):
        self.context_data_raw = json.dumps(value or {})

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False) # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    
    tool_calls_raw = Column(Text, nullable=True) # JSON array of tool calls invoked
    tool_results_raw = Column(Text, nullable=True) # JSON results of executed tool
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    session = relationship("ChatSession", back_populates="messages")
