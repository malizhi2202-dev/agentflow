"""工作流 API 路由 — CRUD + 执行 + 发布."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.workflow import Workflow, WorkflowSnapshot
from services.snapshot_service import create_snapshot
from services.audit_service import log_audit

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


def _user(request: Request) -> dict:
    return request.state.user


def _filter_owner(q, user: dict):
    if user.get("role") != "admin":
        q = q.filter(Workflow.owner_id == user["id"])
    return q


@router.get("")
def api_list_workflows(status: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Workflow), _user(request))
    if status:
        q = q.filter(Workflow.status == status)
    wfs = q.order_by(Workflow.updated_at.desc()).all()
    return {"workflows": [w.to_dict() for w in wfs], "total": len(wfs)}


@router.post("")
def api_create_workflow(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    if not payload.get("spec_json"):
        payload["spec_json"] = {"nodes": [], "edges": []}
    wf = Workflow(owner_id=user["id"], name=payload["name"], description=payload.get("description", ""), definition_mode=payload.get("definition_mode", "visual"), spec_json=payload["spec_json"], token_soft_limit=payload.get("token_soft_limit", 800000), token_hard_limit=payload.get("token_hard_limit", 1000000))
    db.add(wf)
    db.commit()
    db.refresh(wf)
    log_audit(user["id"], user.get("name", user["id"]), "workflow.create", wf.name, "workflow", "created", request.client.host if request.client else "127.0.0.1")
    return wf.to_dict()


@router.get("/{workflow_id}")
def api_get_workflow(workflow_id: int, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Workflow).filter(Workflow.id == workflow_id), _user(request))
    wf = q.first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    return wf.to_dict()


@router.put("/{workflow_id}")
def api_update_workflow(workflow_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Workflow).filter(Workflow.id == workflow_id), user)
    wf = q.first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    if wf.status == "running":
        raise HTTPException(status_code=400, detail="运行中工作流不可编辑")
    for f in ("name", "description", "spec_json", "token_soft_limit", "token_hard_limit"):
        if f in payload:
            setattr(wf, f, payload[f])
    db.commit()
    db.refresh(wf)
    log_audit(user["id"], user.get("name", user["id"]), "workflow.update", wf.name, "workflow", "updated", request.client.host if request.client else "127.0.0.1")
    return wf.to_dict()


@router.delete("/{workflow_id}")
def api_delete_workflow(workflow_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Workflow).filter(Workflow.id == workflow_id), user)
    wf = q.first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    if wf.status == "running":
        raise HTTPException(status_code=400, detail="运行中工作流不可删除，请先停止")
    db.delete(wf)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "workflow.delete", wf.name, "workflow", "deleted", request.client.host if request.client else "127.0.0.1")
    return {"status": "deleted"}


@router.post("/{workflow_id}/publish")
def api_publish_workflow(workflow_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Workflow).filter(Workflow.id == workflow_id), user)
    wf = q.first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    wf.status = "published"
    create_snapshot(db, wf)
    db.commit()
    db.refresh(wf)
    log_audit(user["id"], user.get("name", user["id"]), "workflow.publish", wf.name, "workflow", "published", request.client.host if request.client else "127.0.0.1")
    return wf.to_dict()


@router.get("/{workflow_id}/agents")
def api_workflow_agents(workflow_id: int, request: Request = None, db: Session = Depends(get_db)):
    """查询绑定了此工作流的 Agent 列表。工作流必须通过 Agent 来执行。"""
    from models.agent import Agent
    user = _user(request)
    q = db.query(Agent).filter(Agent.workflow_id == workflow_id)
    if user.get("role") != "admin":
        q = q.filter(Agent.owner_id == user["id"])
    agents = q.all()
    return {"agents": [a.to_dict() for a in agents], "total": len(agents)}


# 工作流不独立执行/停止——必须通过 Agent 来运行。
# Agent: POST /api/agents/:id/run → Agent 内部调用绑定的工作流
