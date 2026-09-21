"""对话 API — Web 端聊天 + 会话管理."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from services.chat_service import chat_service

router = APIRouter(tags=["chat"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


@router.post("/api/agents/{agent_id}/chat")
def send_chat_message(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """向 Agent 发送消息，返回 Agent 回复."""
    content = payload.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="消息内容不能为空")
    conversation_id = payload.get("conversation_id")
    try:
        result = chat_service.send_message(
            agent_id=agent_id,
            content=content,
            owner_id=_uid(request),
            db=db,
            conversation_id=conversation_id,
            channel_type="web",
        )
        return {"ok": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/chat/conversations")
def list_chat_conversations(request: Request, agent_id: int | None = None, db: Session = Depends(get_db)):
    """列出当前用户的对话会话列表."""
    return chat_service.list_conversations(_uid(request), db, agent_id=agent_id)


@router.post("/api/chat/conversations")
def create_chat_conversation(payload: dict, request: Request, db: Session = Depends(get_db)):
    """创建新的对话会话."""
    agent_id = payload.get("agent_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id 不能为空")
    return chat_service.create_conversation(agent_id, _uid(request), db, channel_type="web")


@router.get("/api/chat/{conversation_id}/messages")
def get_chat_messages(
    conversation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    since_id: int | None = None,
    limit: int = 100,
):
    """获取对话消息历史（前端每 2s 轮询此端点）."""
    return chat_service.get_messages(conversation_id, _uid(request), db, since_id=since_id, limit=limit)
