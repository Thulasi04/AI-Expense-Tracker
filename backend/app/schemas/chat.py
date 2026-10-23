from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatRequest(BaseModel):
    session_id: Optional[int] = None
    message: str

class PendingAction(BaseModel):
    action_type: str # e.g. "confirm_delete"
    description: str
    target_ids: List[int]
    total_amount: float
    formatted_total_amount: str
    count: int

class ChatResponse(BaseModel):
    session_id: int
    message: str
    intent: Optional[str] = None
    tool_executed: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    pending_confirmation: Optional[PendingAction] = None
    refreshed_data_needed: bool = False

class ChatConfirmRequest(BaseModel):
    session_id: int
    confirmed: bool

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    tool_calls_raw: Optional[str] = None
    tool_results_raw: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = None

    class Config:
        from_attributes = True
