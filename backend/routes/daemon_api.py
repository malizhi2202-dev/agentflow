"""daemon 上报端点（v22 · §6.28）。

鉴权纪律（D3 / AC-2）：
- `AF_DAEMON_TOKEN` 未配置 → **503**：未配置即拒绝，绝不「无 token 也接收」；
- token 不符 → **401**；比较用 `hmac.compare_digest`（不做字符串 `==`）；
- 归属用户来自服务端配置 `AF_DAEMON_OWNER`，**不读上报体里的 owner**（否则任意 daemon 可自称 admin）。
"""
import hmac

from fastapi import APIRouter, Header, HTTPException, Request

import config
from database import SessionLocal
from services import runtime_registry

router = APIRouter()


@router.post("/api/daemon/report")
def daemon_report(payload: dict, request: Request,
                  x_daemon_token: str | None = Header(default=None, alias="X-Daemon-Token")):
    expected = config.AF_DAEMON_TOKEN
    if not expected:
        raise HTTPException(status_code=503, detail="daemon 上报未启用：AF_DAEMON_TOKEN 未配置")
    if not x_daemon_token or not hmac.compare_digest(x_daemon_token, expected):
        raise HTTPException(status_code=401, detail="daemon token 无效")

    db = SessionLocal()
    try:
        return runtime_registry.report(db, config.AF_DAEMON_OWNER, payload)
    except runtime_registry.RegistryError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    finally:
        db.close()
