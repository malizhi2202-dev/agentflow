"""执行隔离契约只读接口（P2-3）——让界面/运维看到「现在能在哪跑、围栏有没有生效」。"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from services import execution_contract as ec

router = APIRouter(prefix="/api/runtime", tags=["runtime"])


@router.get("/execution-contract")
def get_contract(request: Request):
    if getattr(request.state, "user", None) is None:
        raise HTTPException(status_code=401, detail="未认证")
    return ec.describe()


@router.post("/execution-contract/validate")
def validate_spec(payload: dict, request: Request, db: Session = Depends(get_db)):
    """校验一份候选契约（不动真实执行面）——供前端预检与 CI 使用。"""
    if getattr(request.state, "user", None) is None:
        raise HTTPException(status_code=401, detail="未认证")
    spec = ec.ExecutionSpec(
        tier=payload.get("tier", "inproc"),
        ttl_seconds=int(payload.get("ttl_seconds", ec.DEFAULT_TTL_SECONDS)),
        retain=bool(payload.get("retain", False)),
        egress_allowlist=list(payload.get("egress_allowlist") or []),
    )
    try:
        ec.validate(spec)
    except ec.ExecutionContractError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "spec": spec.to_dict()}
