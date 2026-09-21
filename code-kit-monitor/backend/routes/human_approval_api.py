"""人机协同审批 API."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.human_approval import HumanApproval
import datetime

router = APIRouter(prefix="/api", tags=["human-approval"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


@router.post("/agents/{agent_id}/approval-request")
def create_approval_request(agent_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """Agent 暂停并请求人工审批."""
    owner_id = _uid(request)

    approval = HumanApproval(
        agent_id=agent_id,
        owner_id=owner_id,
        task_id=payload.get("task_id"),
        status="pending",
        form_data=payload.get("form_data", {}),
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return {"ok": True, "approval": approval.to_dict()}


@router.get("/approvals")
def list_approvals(
    request: Request,
    db: Session = Depends(get_db),
    agent_id: int | None = None,
    status: str | None = None,
    limit: int = 50,
):
    """列出审批请求（默认返回 pending）."""
    owner_id = _uid(request)
    q = db.query(HumanApproval).filter(HumanApproval.owner_id == owner_id)
    if agent_id is not None:
        q = q.filter(HumanApproval.agent_id == agent_id)
    if status:
        q = q.filter(HumanApproval.status == status)
    else:
        # 默认只返回 pending
        q = q.filter(HumanApproval.status == "pending")
    approvals = q.order_by(HumanApproval.created_at.desc()).limit(limit).all()
    return {"approvals": [a.to_dict() for a in approvals], "total": len(approvals)}


@router.post("/approvals/{approval_id}/respond")
def respond_approval(approval_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """人工提交审批响应，Agent 恢复执行."""
    owner_id = _uid(request)

    approval = db.query(HumanApproval).filter(
        HumanApproval.id == approval_id,
        HumanApproval.owner_id == owner_id,
    ).first()
    if not approval:
        raise HTTPException(status_code=404, detail="审批请求不存在")

    if approval.status != "pending":
        raise HTTPException(status_code=400, detail=f"审批已{approval.status}，无法重复操作")

    response_status = payload.get("status", "approved")
    if response_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status 必须为 approved 或 rejected")

    approval.status = response_status
    approval.response_data = payload.get("response_data", {})
    approval.resolved_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(approval)

    return {"ok": True, "approval": approval.to_dict()}
