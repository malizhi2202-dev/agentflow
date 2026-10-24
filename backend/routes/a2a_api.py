"""A2A 对外发现面（R4-2）— 只做 M0 静态 AgentCard。

M2（任务协商 / 流式 / 推通知）冻结，所以本文件**只有一个只读端点**，没有任何写动作。
越权与不存在统一 404（不让状态码成为资源探测器）。
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.agent import Agent
from services import agent_card

router = APIRouter(prefix="/api/a2a", tags=["a2a"])


def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


@router.get("/agents/{agent_id}/card")
def get_agent_card(agent_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    q = db.query(Agent).filter(Agent.id == agent_id)
    if user.get("role") != "admin":
        q = q.filter(Agent.owner_id == user["id"])
    agent = q.first()
    if agent is None:
        # 越权与不存在同响应：不给「存在但你没权限」的探测面
        raise HTTPException(status_code=404, detail="Agent 不存在")
    return agent_card.build_card(agent)
