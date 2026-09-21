"""自定义角色 API."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.role_custom import CustomRole

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("/templates")
def api_list_templates(request: Request = None):
    """返回 code-kit 内置 12 角色模板（前端已有硬编码，这里返回占位）"""
    return {"templates": [], "note": "内置角色模板在前端 RoleMarket 中硬编码"}


@router.get("/custom")
def api_list_custom_roles(request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    q = db.query(CustomRole)
    if user and user.get("role") != "admin":
        q = q.filter(CustomRole.owner_id == user["id"])
    roles = q.order_by(CustomRole.updated_at.desc()).all()
    return {"roles": [r.to_dict() for r in roles], "total": len(roles)}


@router.post("/custom")
def api_create_custom_role(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    owner = user["id"] if user else "admin"
    role = CustomRole(
        owner_id=owner, name=payload["name"], based_on=payload.get("based_on"),
        temperament=payload.get("temperament", ""),
        responsibilities=payload.get("responsibilities", []),
        boundaries_can=payload.get("boundaries_can", []),
        boundaries_cannot=payload.get("boundaries_cannot", []),
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    return role.to_dict()


@router.put("/custom/{role_id}")
def api_update_custom_role(role_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    q = db.query(CustomRole).filter(CustomRole.id == role_id)
    if user and user.get("role") != "admin":
        q = q.filter(CustomRole.owner_id == user["id"])
    role = q.first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    for f in ("name", "based_on", "temperament", "responsibilities", "triggers", "boundaries_can", "boundaries_cannot", "evaluation", "inputs", "outputs", "gate_pre_check", "gate_post_check", "io_filter"):
        if f in payload:
            setattr(role, f, payload[f])
    db.commit()
    db.refresh(role)
    return role.to_dict()


@router.delete("/custom/{role_id}")
def api_delete_custom_role(role_id: int, request: Request = None, db: Session = Depends(get_db)):
    user = request.state.user if request else None
    q = db.query(CustomRole).filter(CustomRole.id == role_id)
    if user and user.get("role") != "admin":
        q = q.filter(CustomRole.owner_id == user["id"])
    role = q.first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    db.delete(role)
    db.commit()
    return {"status": "deleted"}
