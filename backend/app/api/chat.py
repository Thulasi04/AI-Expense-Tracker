from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatConfirmRequest,
    ChatSessionResponse,
    ChatMessageResponse
)
from backend.app.services.auth_service import get_current_user
from backend.app.services.ai_service import handle_chat_message, execute_tool

router = APIRouter(prefix="/chat", tags=["AI Chatbot"])

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    chat_req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not chat_req.message or not chat_req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
    return await handle_chat_message(
        db=db,
        user=current_user,
        message_text=chat_req.message.strip(),
        session_id=chat_req.session_id
    )

@router.post("/confirm", response_model=ChatResponse)
async def confirm_action(
    confirm_req: ChatConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == confirm_req.session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    reply_text, tool_result, pending_conf, refreshed_needed = await execute_tool(
        db=db,
        user=current_user,
        tool_name="confirm_pending_action",
        arguments={"confirmed": confirm_req.confirmed},
        session=session
    )

    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=reply_text
    )
    db.add(assistant_msg)
    db.commit()

    return ChatResponse(
        session_id=session.id,
        message=reply_text,
        intent="confirm_pending_action",
        tool_executed="confirm_pending_action",
        tool_result=tool_result,
        pending_confirmation=pending_conf,
        refreshed_data_needed=refreshed_needed
    )

@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).all()
    
    result = []
    for s in sessions:
        last_msg = s.messages[-1].content if s.messages else None
        result.append(ChatSessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            last_message=last_msg
        ))
    return result

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            tool_calls_raw=m.tool_calls_raw,
            tool_results_raw=m.tool_results_raw,
            created_at=m.created_at
        )
        for m in session.messages
    ]

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    db.delete(session)
    db.commit()
    return None
