"""自动化中心 API —「定时任务」的跨 Agent 只读聚合 + 开关/删除（v21 T-05）。

口径：
- 定时任务本体仍归 `agents_api` 的 `/{agent_id}/scheduled-tasks`（创建需指定 Agent）；
  这里只补一个**平台视角**的入口，避免界面为了列一张表打 N 次 `/api/agents`。
- 可见性沿用平台惯例：普通用户只看自己的（`owner_id`），平台管理员看全部。
- 开关/删除是 owner 或平台管理员才允许；越权与不存在统一 404（不用状态码探测他人资源）。
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models.agent import Agent
from models.scheduled_task import ScheduledTask
from services.audit_service import log_audit

router = APIRouter(prefix="/api/automations", tags=["automations"])


def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def _visible(db: Session, user: dict):
    q = db.query(ScheduledTask)
    if not _is_admin(user):
        q = q.filter(ScheduledTask.owner_id == user["id"])
    return q


def _get_owned(db: Session, user: dict, task_id: int) -> ScheduledTask:
    task = _visible(db, user).filter(ScheduledTask.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="定时任务不存在")
    return task


def _row(db: Session, task: ScheduledTask) -> dict:
    agent = db.query(Agent).filter(Agent.id == task.agent_id).first()
    return {**task.to_dict(),
            "agent_name": agent.name if agent else None,
            "agent_status": agent.status if agent else None}


@router.get("")
def list_automations(request: Request = None, db: Session = Depends(get_db)):
    """列出可见的定时任务（附 Agent 名称，前端不用再 N+1）。"""
    user = _user(request)
    tasks = _visible(db, user).order_by(ScheduledTask.id.desc()).all()
    return {"automations": [_row(db, t) for t in tasks]}


@router.post("/{task_id}/toggle")
def toggle_automation(task_id: int, request: Request = None, db: Session = Depends(get_db)):
    """启停一条定时任务（幂等：按当前状态取反）。"""
    user = _user(request)
    task = _get_owned(db, user, task_id)
    task.enabled = not bool(task.enabled)
    db.commit()
    db.refresh(task)
    log_audit(user["id"], user.get("name", user["id"]),
              "scheduled_task.toggle", task.name or task.capability,
              "scheduled_task", "enabled" if task.enabled else "disabled",
              request.client.host if request and request.client else "127.0.0.1")
    return {"ok": True, "automation": _row(db, task)}


@router.delete("/{task_id}")
def delete_automation(task_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    task = _get_owned(db, user, task_id)
    name = task.name or task.capability
    db.delete(task)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]),
              "scheduled_task.delete", name, "scheduled_task", "deleted",
              request.client.host if request and request.client else "127.0.0.1")
    return {"ok": True}
