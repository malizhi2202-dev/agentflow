"""决策模型 / 微调批次 / 环境参谋（P4 · 原型 6.23/6.24/6.25）。

路由只做鉴权与参数校验，业务在 services/。可见性 = owner 或平台管理员；
越权与不存在统一 404（不用状态码探测他人资源）。
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth import is_admin
from database import get_db
from services import decision_models as dm, env_advisor, finetune
from services.audit_service import log_audit

router = APIRouter(prefix="/api/decision-models", tags=["decision-models"])


def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _admin(user: dict) -> bool:
    return bool(is_admin(user))


def _audit(user: dict, request: Request, action: str, target: str, detail: str = "") -> None:
    try:
        log_audit(user["id"], user.get("name", user["id"]), action, target,
                  "decision_model", detail,
                  request.client.host if request and request.client else "127.0.0.1")
    except Exception as e:  # noqa: BLE001 — 审计不参与业务成败
        print(f"[decision] 审计写入失败：{e}")


# ── 决策模型 ──────────────────────────────────────────────

@router.get("")
def list_models(request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    return {"models": dm.list_models(db, user["id"], _admin(user))}


@router.post("")
def register_model(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = dm.register(db, user["id"], payload)
    except dm.DecisionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    _audit(user, request, "decision_model.register", row.name)
    return {"ok": True, "model": row.to_dict()}


@router.post("/{model_id}/bindings")
def set_binding(model_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = dm.get_visible(db, model_id, user["id"], _admin(user))
        row = dm.set_binding(db, row, (payload.get("binding") or "").strip(),
                             bool(payload.get("enabled", False)))
    except dm.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except dm.DecisionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    _audit(user, request, "decision_model.binding",
           f"{row.name}:{payload.get('binding')}", "on" if payload.get("enabled") else "off")
    return {"ok": True, "model": row.to_dict()}


@router.post("/{model_id}/toggle")
def toggle_model(model_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = dm.get_visible(db, model_id, user["id"], _admin(user))
        row = dm.set_enabled(db, row, bool(payload.get("enabled", False)))
    except dm.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    _audit(user, request, "decision_model.toggle", row.name, "on" if row.enabled else "off")
    return {"ok": True, "model": row.to_dict()}


@router.post("/{model_id}/reprobe")
def reprobe(model_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = dm.get_visible(db, model_id, user["id"], _admin(user))
        out = dm.reprobe(db, row)
    except dm.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True, "model": row.to_dict(), **out}


# ── 微调批次（含三指标门禁）────────────────────────────────

@router.get("/finetune/batches")
def list_batches(request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    return {"batches": finetune.list_batches(db, user["id"], _admin(user))}


@router.post("/finetune/batches")
def create_batch(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    try:
        row = finetune.create_batch(db, user["id"], payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    _audit(user, request, "finetune.create", row.task_name, row.gate_verdict)
    return {"ok": True, "batch": row.to_dict()}


# ── 环境参谋（只读画像 + 方案）─────────────────────────────

@router.get("/advisor")
def advisor(request: Request):
    _user(request)
    profile = env_advisor.probe()
    return {"profile": profile, "plans": env_advisor.plans(profile)}
