"""运行时发现的**唯一判定层**（v22 · §6.28）。

daemon 上报 → 幂等 upsert；读侧算 online/offline；可见性只在这里判定（D8）。
路由层只做参数校验与鉴权映射，不复制这里的任何规则。

边界（与 DESIGN 对齐）：
- 白名单入参：出现 `token` / `api_key` / `password` / `account` 等键**一律忽略**（AC-7）；
- 不落状态列：`online/offline` 由 `last_seen` 现算（D5）；
- 非 owner 改可见性 → `NotFound`（路由映射 404：越权与不存在同码，避免探测，AC-4）。
"""
from __future__ import annotations

import datetime
import json

import config
from models.agent import Agent
from models.runtime_registry import RuntimeRegistry

# 允许落库的上报键（其余键忽略，含任何看起来像凭据的字段）
RUNTIME_FIELDS = (
    "cli", "protocol_family", "binary_path", "source_file",
    "version", "models", "models_error", "capabilities",
)
VISIBILITIES = ("private", "public")


class RegistryError(ValueError):
    """上报体非法（路由映射 400）。"""


class NotFound(LookupError):
    """运行时不存在或无权（路由统一 404）。"""


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _utc(dt: datetime.datetime | None) -> datetime.datetime | None:
    """DB 取回的时间可能带时区（MySQL DATETIME vs SQLite）——统一成 naive UTC 再比较。"""
    if dt is None:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


def _json_list(value) -> list[str]:
    """把上报的数组字段规范化：只收字符串、去空、去重保序、上限 200 项。"""
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str) and item.strip():
            s = item.strip()[:120]
            if s not in out:
                out.append(s)
    return out[:200]


def _loads(raw: str | None) -> list[str]:
    try:
        value = json.loads(raw or "[]")
    except Exception:  # noqa: BLE001 — 脏行按空处理，不因单行坏数据 500
        return []
    return value if isinstance(value, list) else []


def _status(last_seen: datetime.datetime | None) -> str:
    seen = _utc(last_seen)
    if seen is None:
        return "offline"
    age = (_now() - seen).total_seconds()
    return "online" if age <= config.RUNTIME_OFFLINE_AFTER_SECONDS else "offline"


def report(db, owner_id: str, payload: dict) -> dict:
    """daemon 上报：按 (machine_id, cli, protocol_family) 幂等 upsert（AC-1 / D2）。"""
    if not isinstance(payload, dict):
        raise RegistryError("上报体必须是对象")
    machine = payload.get("machine")
    if not isinstance(machine, dict) or not str(machine.get("id") or "").strip():
        raise RegistryError("缺 machine.id")
    machine_id = str(machine["id"]).strip()[:64]
    machine_name = str(machine.get("name") or "")[:128]
    runtimes = payload.get("runtimes")
    if not isinstance(runtimes, list) or not runtimes:
        raise RegistryError("runtimes 必须是非空数组")

    now = _now()
    registered = 0
    for raw in runtimes:
        if not isinstance(raw, dict):
            raise RegistryError("runtimes 元素必须是对象")
        cli = str(raw.get("cli") or "").strip().lower()[:32]
        if not cli:
            raise RegistryError("运行时缺 cli")
        protocol = str(raw.get("protocol_family") or "exec").strip().lower()[:16] or "exec"
        row = (db.query(RuntimeRegistry)
               .filter(RuntimeRegistry.machine_id == machine_id,
                       RuntimeRegistry.cli == cli,
                       RuntimeRegistry.protocol_family == protocol)
               .first())
        if row is None:
            row = RuntimeRegistry(machine_id=machine_id, cli=cli, protocol_family=protocol,
                                  owner_id=owner_id, created_at=now,
                                  models_json="[]", capabilities_json="[]",
                                  visibility="private", last_seen=now)
            db.add(row)
        # 只取白名单键：多余键（含任何凭据样式字段）不落库（AC-7）
        row.machine_name = machine_name
        row.binary_path = str(raw.get("binary_path") or "")[:512]
        row.source_file = str(raw.get("source_file") or "")[:64]
        row.version = str(raw.get("version") or "")[:64]
        row.models_json = json.dumps(_json_list(raw.get("models")), ensure_ascii=False)
        row.models_error = str(raw.get("models_error") or "")[:200]
        row.capabilities_json = json.dumps(_json_list(raw.get("capabilities")), ensure_ascii=False)
        row.owner_id = owner_id          # 上报者即 owner（机器级凭据归属）
        row.last_seen = now
        row.updated_at = now
        registered += 1
    db.commit()
    return {"ok": True, "registered": registered, "machine_id": machine_id}


def _bound_agents(db, cli: str) -> int:
    """绑定 Agent 数 = `agents.runtime` 等于该 CLI 的行数（D9，只读聚合）。"""
    try:
        return db.query(Agent).filter(Agent.runtime == cli).count()
    except Exception:  # noqa: BLE001 — agents 表不可用（裸库）时按 0，不让整页 500
        return 0


def list_runtimes(db, viewer_id: str) -> list[dict]:
    """本人全部 + 任何 public（AC-4）。online/offline 读侧现算（D5）。"""
    rows = (db.query(RuntimeRegistry)
            .filter((RuntimeRegistry.owner_id == viewer_id)
                    | (RuntimeRegistry.visibility == "public"))
            .order_by(RuntimeRegistry.machine_id.asc(), RuntimeRegistry.cli.asc())
            .all())
    bound_cache: dict[str, int] = {}
    out = []
    for r in rows:
        if r.cli not in bound_cache:
            bound_cache[r.cli] = _bound_agents(db, r.cli)
        models = _loads(r.models_json)
        out.append({
            "id": r.id,
            "machine_id": r.machine_id,
            "machine_name": r.machine_name or "",
            "cli": r.cli,
            "protocol_family": r.protocol_family or "exec",
            "binary_path": r.binary_path or "",
            "source_file": r.source_file or "",
            "version": r.version or "",
            "models": models,
            "models_error": r.models_error or "",
            "capabilities": _loads(r.capabilities_json),
            "status": _status(r.last_seen),
            "last_seen": (_utc(r.last_seen) or _now()).isoformat(timespec="seconds") + "Z",
            "visibility": r.visibility or "private",
            "bound_agents": bound_cache[r.cli],
            "mine": r.owner_id == viewer_id,
        })
    return out


def set_visibility(db, runtime_id: int, viewer_id: str, public: bool) -> dict:
    """只有 owner 能改（admin 不旁路）；非 owner 与不存在同码 NotFound（AC-4 / D8）。"""
    row = db.query(RuntimeRegistry).filter(RuntimeRegistry.id == runtime_id).first()
    if row is None or row.owner_id != viewer_id:
        raise NotFound("运行时不存在")
    row.visibility = "public" if public else "private"
    row.updated_at = _now()
    db.commit()
    return {"ok": True, "visibility": row.visibility}
