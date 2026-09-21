"""项目管理 API — ORM 持久化."""
import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.project import Project
from services.audit_service import log_audit

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _user(request: Request) -> dict:
    return request.state.user


def _filter_owner(q, user: dict):
    if user.get("role") != "admin":
        q = q.filter(Project.owner_id == user["id"])
    return q


@router.get("")
def api_list_projects(status: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Project), _user(request))
    if status:
        q = q.filter(Project.status == status)
    items = q.order_by(Project.updated_at.desc()).all()
    return {"projects": [p.to_dict() for p in items], "total": len(items)}


@router.post("")
def api_create_project(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    project = Project(
        owner_id=user["id"], name=payload["name"],
        requirement_raw=payload.get("requirement_raw", ""),
        requirement_type=payload.get("requirement_type", "text"),
        agent_id=payload.get("agent_id"), workflow_id=payload.get("workflow_id"),
        orchestration_id=payload.get("orchestration_id")
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit(user["id"], user.get("name", user["id"]), "project.create", project.name, "project", "created", request.client.host if request.client else "127.0.0.1")
    return project.to_dict()


@router.get("/{project_id}")
def api_get_project(project_id: int, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Project).filter(Project.id == project_id), _user(request))
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    return p.to_dict()


@router.put("/{project_id}")
def api_update_project(project_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Project).filter(Project.id == project_id), user)
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    for f in ("name", "requirement_raw", "requirement_type", "agent_id", "workflow_id", "orchestration_id"):
        if f in payload:
            setattr(p, f, payload[f])
    p.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(p)
    log_audit(user["id"], user.get("name", user["id"]), "project.update", p.name, "project", "updated", request.client.host if request.client else "127.0.0.1")
    return p.to_dict()


@router.delete("/{project_id}")
def api_delete_project(project_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Project).filter(Project.id == project_id), user)
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    if p.status == "running":
        raise HTTPException(status_code=400, detail="运行中项目不可删除")
    db.delete(p)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "project.delete", p.name, "project", "deleted", request.client.host if request.client else "127.0.0.1")
    return {"status": "deleted"}


@router.post("/{project_id}/parse")
def api_parse_requirement(project_id: int, request: Request = None, db: Session = Depends(get_db)):
    q = _filter_owner(db.query(Project).filter(Project.id == project_id), _user(request))
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    raw = p.requirement_raw or ""
    p.parsed_summary = f"[AI 解析] {raw[:200]}{'...' if len(raw) > 200 else ''}"
    db.commit()
    return {"status": "parsed", "summary": p.parsed_summary}


@router.post("/{project_id}/execute")
def api_execute_project(project_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Project).filter(Project.id == project_id), user)
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    p.status = "running"
    p.updated_at = datetime.datetime.utcnow()
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "project.execute", p.name, "project", "started", request.client.host if request.client else "127.0.0.1")
    return {"status": "running", "project_id": p.id}


@router.post("/{project_id}/stop")
def api_stop_project(project_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    q = _filter_owner(db.query(Project).filter(Project.id == project_id), user)
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="项目不存在")
    p.status = "stopped"
    p.updated_at = datetime.datetime.utcnow()
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "project.stop", p.name, "project", "stopped", request.client.host if request.client else "127.0.0.1")
    return {"status": "stopped"}


@router.post("/upload-legacy")
def api_upload_legacy(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = _user(request)
    git_url = payload.get("git_url", "")
    if not git_url:
        raise HTTPException(status_code=400, detail="git_url 不能为空")
    project = Project(
        owner_id=user["id"],
        name=f"Legacy: {git_url.split('/')[-1]}" if '/' in git_url else git_url,
        requirement_raw=f"Git URL: {git_url}",
        requirement_type="legacy",
        parsed_summary=f"[AI 扫描] 正在克隆 {git_url} 并分析代码结构...",
        agent_id=payload.get("agent_id"),
        workflow_id=payload.get("workflow_id"),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    log_audit(user["id"], user.get("name", user["id"]), "project.legacy_upload", git_url, "project", "legacy project created", request.client.host if request.client else "127.0.0.1")
    return project.to_dict()
