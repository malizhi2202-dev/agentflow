"""运行时注册表端点（v22 · §6.28）：本人全部 + 任何 public；可见性仅 owner。

路由只做映射：可见性判定、offline 计算、绑定数聚合全部在
`services/runtime_registry.py`（单点，避免两套授权口径）。
"""
from fastapi import APIRouter, HTTPException, Request

from database import SessionLocal
from services import runtime_registry

router = APIRouter()


@router.get("/api/runtimes")
def list_runtimes(request: Request):
    viewer = request.state.user
    db = SessionLocal()
    try:
        return {"runtimes": runtime_registry.list_runtimes(db, viewer["id"])}
    finally:
        db.close()


@router.put("/api/runtimes/{runtime_id}/visibility")
def set_runtime_visibility(runtime_id: int, payload: dict, request: Request):
    viewer = request.state.user
    body = payload if isinstance(payload, dict) else {}
    if "public" not in body:
        raise HTTPException(status_code=400, detail="缺 public 字段（true/false）")
    db = SessionLocal()
    try:
        return runtime_registry.set_visibility(db, runtime_id, viewer["id"], bool(body["public"]))
    except runtime_registry.NotFound as exc:
        # 越权与不存在统一 404：不用 403 给人探测「这台机器上有什么运行时」
        raise HTTPException(status_code=404, detail=str(exc))
    finally:
        db.close()
