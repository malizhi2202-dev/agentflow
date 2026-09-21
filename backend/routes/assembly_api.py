"""角色×工作流组装 API — 绑定关系管理."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.workflow import Workflow
from models.role_custom import CustomRole

router = APIRouter(prefix="/api/assembly", tags=["assembly"])

# 内存存储（后续迁移到 ORM）
_bindings: list[dict] = []
_next_id = 1


@router.get("/list")
def api_list_bindings(request: Request = None, db: Session = Depends(get_db)):
    """列出所有绑定关系"""
    return {"bindings": _bindings, "total": len(_bindings)}


@router.post("/bind")
def api_create_binding(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    global _next_id
    # 验证工作流和角色存在
    wf = db.query(Workflow).filter(Workflow.id == payload["workflow_id"]).first()
    if not wf:
        raise HTTPException(status_code=404, detail="工作流不存在")
    role = db.query(CustomRole).filter(CustomRole.id == payload["role_id"]).first()
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")

    binding = {
        "id": _next_id,
        "workflow_id": payload["workflow_id"],
        "workflow_name": wf.name,
        "node_id": payload.get("node_id", ""),
        "role_id": payload["role_id"],
        "role_name": role.name,
        "mode": payload.get("mode", "review"),
    }
    _next_id += 1
    _bindings.append(binding)
    return {"status": "bound", "binding": binding}


@router.delete("/unbind/{binding_id}")
def api_delete_binding(binding_id: int):
    global _bindings
    for i, b in enumerate(_bindings):
        if b["id"] == binding_id:
            del _bindings[i]
            return {"status": "unbound"}
    raise HTTPException(status_code=404, detail="绑定不存在")
