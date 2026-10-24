"""自动化中心 API（P3-1，原型 `automations.html` 九节）。

**这是 v21 T-05 三个旧端点的明确迁移（不是兼容影子）**。旧实现是「定时任务的平台视图」，
直接读写 `scheduled_tasks`：

| v21 旧端点                          | 现在                                                          |
|-------------------------------------|---------------------------------------------------------------|
| `GET /api/automations`              | 改为返回**新自动化资源**（三段构成 + 触发器摘要 + 7d 失败率）   |
| `POST /api/automations/{id}/toggle` | 拆成 `POST /{id}/pause` ⟂ `POST /{id}/resume`（旧「取反」里没有熔断与归档两态） |
| `DELETE /api/automations/{id}`      | 改为 `POST /{id}/archive`（删除 = 归档：停未来触发，两级账本全保留） |

定时任务本身**没有消失**：`scheduled_tasks` 表与 `/api/agents/{agent_id}/scheduled-tasks`
照旧（`routes/agents_api.py`），它是「挂在某个 Agent 名下的 v21 形态」；本模块是新的独立资源
（一条自动化可以是 Agent 轨或 Squad 轨、可带 N 个触发器、有两级账本）。
因此 `tests/test_automations_api.py`（v21 那 6 例）按设计变红——它断言的是旧语义
（列表 = 定时任务、toggle 取反、DELETE 真删行）；替代用例见 `tests/test_automations_v2.py`，
迁移说明见 `.specs/ui-parity/P3-automations.md`。

鉴权纪律：可见性 = owner 或平台管理员；越权与不存在统一 404（不用状态码探测他人资源）；
写操作同样按 owner/admin 判定。审计一律走 `services.audit_service.log_audit`，失败不阻断业务。
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from services import automation_service as svc
from services.audit_service import log_audit

# 无前缀：本模块同时挂 /api/automations 与 /api/webhooks/automations/{token} 两族路径，
# 用显式全路径换「main.py 只需原有那一条 include_router」。
router = APIRouter(tags=["automations"])


# ── 公共小件 ──────────────────────────────────────────────

def _user(request: Request) -> dict:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="未认证")
    return user


def _ip(request: Request | None) -> str:
    if request is None:
        return "127.0.0.1"
    return getattr(request.state, "client_ip", None) or (
        request.client.host if request.client else "127.0.0.1")


def _audit(user: dict, request: Request | None, action: str, target: str, detail: str = "") -> None:
    """审计不参与业务成败：写失败只打日志（与 decision_api 同一纪律）。"""
    try:
        log_audit(user["id"], user.get("name", user["id"]), action, target,
                  "automation", detail, _ip(request))
    except Exception as e:  # noqa: BLE001
        print(f"[automations] 审计写入失败：{e}")


def _http(fn, *args, **kwargs):
    """服务层错误 → HTTP 码（404 / 409 / 400），detail 原样给前端显示。"""
    try:
        return fn(*args, **kwargs)
    except svc.AutomationNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except svc.AutomationConflict as e:
        raise HTTPException(status_code=409, detail=str(e))
    except svc.AutomationError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _visible(db: Session, user: dict, auto_id: int):
    return _http(svc.get_visible, db, auto_id, user)


def _auto_row(db: Session, auto, user: dict) -> dict:
    return svc.describe(db, auto, user, with_triggers=True)


def _secret_payload(token: str | None) -> dict | None:
    if not token:
        return None
    return {"token": token, "webhook_url": f"/api/webhooks/automations/{token}",
            "note": "token 写-only：明文只在本响应出现一次，之后只给遮蔽值"}


# ── 清单 / 新建 / 详情 ────────────────────────────────────

@router.get("/api/automations")
def list_automations(request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    rows = svc.list_visible(db, user)
    return {
        "automations": [svc.describe(db, a, user, with_triggers=False) for a in rows],
        "meta": {
            # 清单四卡口径（原型 ①）：先给自己算一遍，别写死数字
            "total": len(rows),
            "enabled": sum(1 for a in rows if svc.run_gate(a)[0]),
            "paused": sum(1 for a in rows if a.status == "paused"),
            "archived": sum(1 for a in rows if a.status == "archived"),
            "breaker_open": sum(1 for a in rows if a.breaker_open),
        },
        "failure_window_days": svc.FAILURE_WINDOW_DAYS,
        "breaker_rule": (f"近 {svc.FAILURE_WINDOW_DAYS} 天 ≥{svc.BREAKER_MIN_SAMPLE} 次完结"
                         f"且失败率 ≥{int(svc.BREAKER_RATE * 100)}% → 自动暂停并通知创建者"
                         "（止损非自愈，恢复必须人点）"),
        "webhook_payload_limit": svc.DEFAULT_PAYLOAD_LIMIT,
    }


@router.post("/api/automations")
def create_automation(payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    auto = _http(svc.create, db, user, payload or {})
    _audit(user, request, "automation.create", auto.name,
           f"exec_mode={auto.exec_mode} owner={auto.owner_track}:{auto.owner_id_ref}")
    return {"ok": True, "automation": _auto_row(db, auto, user)}


@router.get("/api/automations/{auto_id}")
def get_automation(auto_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    return {"automation": _auto_row(db, auto, user)}


@router.put("/api/automations/{auto_id}")
def update_automation(auto_id: int, payload: dict, request: Request,
                      db: Session = Depends(get_db)):
    """三段构成分别可改：payload 里出现哪一段就只改哪一段（互不覆盖）。"""
    user = _user(request)
    auto = _visible(db, user, auto_id)
    auto = _http(svc.update_sections, db, auto, payload or {})
    _audit(user, request, "automation.update", auto.name,
           "sections=" + ",".join(sorted(k for k in (payload or {}))))
    return {"ok": True, "automation": _auto_row(db, auto, user)}


# ── 触发器 ────────────────────────────────────────────────

@router.get("/api/automations/{auto_id}/triggers/preview")
def preview_trigger(auto_id: int, request: Request, cron: str = "",
                    timezone: str = "Asia/Shanghai", db: Session = Depends(get_db)):
    """Next runs 预览（必显才能保存）：服务端解析，非法表达式 422 直给错因。"""
    user = _user(request)
    _visible(db, user, auto_id)
    try:
        return svc.preview_cron(cron, timezone, 3)
    except svc.AutomationError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/api/automations/{auto_id}/triggers")
def add_trigger(auto_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    trigger, token = _http(svc.add_trigger, db, auto, payload or {})
    _audit(user, request, "automation.trigger.add", auto.name,
           f"kind={trigger.kind} trigger#{trigger.id}")
    return {"ok": True, "trigger": svc._trigger_dict(trigger),
            "secret": _secret_payload(token),
            "automation": _auto_row(db, auto, user)}


@router.delete("/api/automations/{auto_id}/triggers/{trigger_id}")
def delete_trigger(auto_id: int, trigger_id: int, request: Request,
                   db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    _http(svc.delete_trigger, db, auto, trigger_id)
    _audit(user, request, "automation.trigger.delete", auto.name, f"trigger#{trigger_id}")
    return {"ok": True, "automation": _auto_row(db, auto, user)}


@router.post("/api/automations/{auto_id}/triggers/{trigger_id}/toggle")
def toggle_trigger(auto_id: int, trigger_id: int, request: Request,
                   payload: dict | None = None, db: Session = Depends(get_db)):
    """单触发器启停（原型 ③「自扩展」：multica 侧只有 CLI）。不传 enabled 即取反。"""
    user = _user(request)
    auto = _visible(db, user, auto_id)
    wanted = None if not payload or "enabled" not in payload else bool(payload["enabled"])
    trigger = _http(svc.toggle_trigger, db, auto, trigger_id, wanted)
    _audit(user, request, "automation.trigger.toggle", auto.name,
           f"trigger#{trigger.id} → {'on' if trigger.enabled else 'off'}")
    return {"ok": True, "trigger": svc._trigger_dict(trigger),
            "automation": _auto_row(db, auto, user)}


@router.post("/api/automations/{auto_id}/triggers/{trigger_id}/rotate")
def rotate_trigger(auto_id: int, trigger_id: int, request: Request,
                   db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    trigger, token = _http(svc.rotate_trigger, db, auto, trigger_id)
    _audit(user, request, "automation.trigger.rotate", auto.name,
           f"trigger#{trigger_id} 旧 URL 立即失效")
    return {"ok": True, "trigger": svc._trigger_dict(trigger),
            "secret": _secret_payload(token),
            "automation": _auto_row(db, auto, user)}


# ── 治理三态 ──────────────────────────────────────────────

@router.post("/api/automations/{auto_id}/pause")
def pause_automation(auto_id: int, request: Request, payload: dict | None = None,
                     db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    auto = _http(svc.pause, db, auto, str((payload or {}).get("reason") or ""))
    _audit(user, request, "automation.pause", auto.name, auto.paused_reason)
    return {"ok": True, "automation": _auto_row(db, auto, user)}


@router.post("/api/automations/{auto_id}/resume")
def resume_automation(auto_id: int, request: Request, db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    auto = _http(svc.resume, db, auto)
    _audit(user, request, "automation.resume", auto.name, "人点恢复：三入口重新接入")
    return {"ok": True, "automation": _auto_row(db, auto, user)}


@router.post("/api/automations/{auto_id}/archive")
def archive_automation(auto_id: int, request: Request, payload: dict | None = None,
                       db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    auto = _http(svc.archive, db, auto, str((payload or {}).get("reason") or ""))
    _audit(user, request, "automation.archive", auto.name, auto.paused_reason)
    return {"ok": True, "automation": _auto_row(db, auto, user)}


@router.post("/api/automations/{auto_id}/breaker")
def breaker_automation(auto_id: int, request: Request, payload: dict | None = None,
                       db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    data = payload or {}
    opened = bool(data.get("open", True))
    auto = _http(svc.set_breaker, db, auto, opened, str(data.get("reason") or ""))
    _audit(user, request, "automation.breaker", auto.name,
           f"{'打开' if opened else '复位'}：{auto.breaker_reason or '—'}")
    return {"ok": True, "automation": _auto_row(db, auto, user)}


# ── 两级账本 ──────────────────────────────────────────────

@router.get("/api/automations/{auto_id}/runs")
def list_runs(auto_id: int, request: Request, limit: int = 50, db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    return {"runs": svc.runs(db, auto, max(1, min(int(limit or 50), 200))),
            "note": "第一级账本：每条触发一行（含 skipped 这类「不跑」）；分母只算完结"}


@router.get("/api/automations/{auto_id}/deliveries")
def list_deliveries(auto_id: int, request: Request, limit: int = 50,
                    db: Session = Depends(get_db)):
    user = _user(request)
    auto = _visible(db, user, auto_id)
    return {"deliveries": svc.deliveries(db, auto, max(1, min(int(limit or 50), 200))),
            "note": "第二级账本：每个到达一行，跑没跑都记；Replay 只读呈现（执行器未接入）"}


# ── webhook 入口（token 即凭据，无用户会话）────────────────

@router.post("/api/webhooks/automations/{token}")
async def automation_webhook(token: str, request: Request, db: Session = Depends(get_db)):
    """外部投递入口：幂等键去重 + 载荷上限 + 六步事件推断。

    业务性「不跑」（ignored / skipped / duplicate）回 200，技术性拒绝（400/404/413）才给 4xx：
    上游只对非 2xx 重试，把「过滤掉了」回成 4xx 会让 CI 反复重投。
    """
    raw = await request.body()
    code, body = svc.ingest_webhook(db, token, request.headers, raw)
    return JSONResponse(content=body, status_code=code)


@router.get("/api/webhooks/automations/{token}")
def automation_webhook_probe(token: str, request: Request, db: Session = Depends(get_db)):
    """探活（无 body 的 GET）：只回答 URL 还在不在，不派生成运行。"""
    return _http(svc.webhook_probe, db, token)
