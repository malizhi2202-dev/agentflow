"""声明式 API 四件组（P2-5）的服务层。

① **ETag / If-Match → 412**：治「PUT 盲覆盖」。资源哈希 = 规范化 JSON 的 sha256；
   客户端 GET 拿 `ETag`，PUT 带 `If-Match`，不匹配即 412（RFC 7232）。
② **apiVersion / kind 入文档体**：只做语义稳定，不承诺 K8s 兼容；未知 `kind` 拒绝，
   未知 `apiVersion` 走「弃用告警」而不是硬失败（K8s 弃用政策四则的移植）。
③ **generation / conditions**：`observedGeneration` 区分「没处理」与「处理了结果未变」。
④ **change_log 单账本同事务写** + `/api/watch` SSE（应用层 cursor；游标过期 → `resync`，
   等价 410）。明示不跟 MCP 已撤的 Last-Event-ID 路线。
"""
from __future__ import annotations

import hashlib
import json

from fastapi import HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.declarative import ChangeLog, ResourceCondition

DEFAULT_API_VERSION = "agentflow/v1"
SUPPORTED_KINDS = frozenset({"Workflow", "WorkflowConfig", "OrchestrationInstance"})
# 弃用中的 apiVersion（只告警、不拦；下一大版本才移除）
DEPRECATED_API_VERSIONS: dict[str, str] = {}


class PreconditionFailed(HTTPException):
    def __init__(self, detail: str = "If-Match 与当前资源不一致（412）"):
        super().__init__(status_code=412, detail=detail)


def canonical_hash(payload) -> str:
    """规范化 JSON 的 sha256（键排序 + 紧凑分隔符）——ETag 唯一来源。"""
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def etag_for(payload) -> str:
    """强 ETag（带引号）。前端/客户端按 HTTP 语义带 `If-Match`。"""
    return '"' + canonical_hash(payload) + '"'


def check_if_match(request: Request, payload) -> None:
    """If-Match 不匹配即 412；未带 If-Match 时不拦（兼容旧客户端），但要写 change_log。"""
    expected = request.headers.get("if-match")
    if expected is None:
        return
    current = etag_for(payload)
    # 允许 "*"（RFC 7232：只要求资源存在）
    if expected.strip() == "*":
        return
    if expected.strip() != current:
        raise PreconditionFailed(
            f"If-Match 与当前资源不一致：期望 {expected.strip()}，当前 {current}"
        )


def validate_document(body: dict, expected_kind: str | None = None) -> dict:
    """校验 apiVersion/kind；返回 {'apiVersion','kind','deprecated': bool}。"""
    api_version = body.get("apiVersion")
    kind = body.get("kind")
    if kind is not None and kind not in SUPPORTED_KINDS:
        raise HTTPException(status_code=400, detail=f"不支持的 kind: {kind}")
    if expected_kind is not None and kind is not None and kind != expected_kind:
        raise HTTPException(status_code=400, detail=f"kind 应为 {expected_kind}，收到 {kind}")
    if api_version is not None and api_version not in (DEFAULT_API_VERSION, *DEPRECATED_API_VERSIONS):
        raise HTTPException(status_code=400, detail=f"不支持的 apiVersion: {api_version}")
    return {
        "apiVersion": api_version or DEFAULT_API_VERSION,
        "kind": kind or expected_kind or "Workflow",
        "deprecated": api_version in DEPRECATED_API_VERSIONS,
        "deprecation_message": DEPRECATED_API_VERSIONS.get(api_version or ""),
    }


# ── 账本 ──────────────────────────────────────────────────

def next_generation(db: Session, resource_type: str, resource_id: str) -> int:
    current = db.query(func.max(ChangeLog.generation)).filter(
        ChangeLog.resource_type == resource_type,
        ChangeLog.resource_id == resource_id,
    ).scalar()
    return int(current or 0) + 1


def append_change(db: Session, resource_type: str, resource_id: str, actor: str,
                  action: str, before_hash: str = "", after_hash: str = "",
                  payload: dict | None = None) -> ChangeLog:
    """写一条账本行。**不 commit**——由业务方与资源变更同一事务提交。"""
    row = ChangeLog(
        resource_type=resource_type, resource_id=str(resource_id),
        generation=next_generation(db, resource_type, str(resource_id)),
        actor=actor, action=action, before_hash=before_hash, after_hash=after_hash,
        payload_json=json.dumps(payload or {}, ensure_ascii=False),
    )
    db.add(row)
    db.flush()
    return row


def list_changes(db: Session, since: int = 0, limit: int = 100) -> tuple[list[dict], bool]:
    """返回 (events, resync_needed)。游标早于账本最早一行时要求客户端 resync。"""
    row = db.query(func.min(ChangeLog.id)).scalar()
    min_id = int(row or 0)
    resync = bool(min_id and since and since + 1 < min_id)
    q = db.query(ChangeLog)
    if since:
        q = q.filter(ChangeLog.id > since)
    rows = q.order_by(ChangeLog.id.asc()).limit(limit).all()
    return [r.to_event() for r in rows], resync


# ── conditions ────────────────────────────────────────────

def set_condition(db: Session, resource_type: str, resource_id: str,
                  status: str, reason: str = "", message: str = "",
                  observed_generation: int = 0,
                  condition_type: str = "Ready") -> ResourceCondition:
    row = db.query(ResourceCondition).filter(
        ResourceCondition.resource_type == resource_type,
        ResourceCondition.resource_id == str(resource_id),
        ResourceCondition.condition_type == condition_type,
    ).first()
    generation = db.query(func.max(ChangeLog.generation)).filter(
        ChangeLog.resource_type == resource_type,
        ChangeLog.resource_id == str(resource_id),
    ).scalar() or 1
    if row is None:
        row = ResourceCondition(
            resource_type=resource_type, resource_id=str(resource_id),
            condition_type=condition_type, status=status, reason=reason,
            message=message, generation=int(generation),
            observed_generation=observed_generation,
        )
        db.add(row)
    else:
        if row.status != status:
            import datetime

            row.last_transition_at = datetime.datetime.utcnow()
        row.status = status
        row.reason = reason
        row.message = message
        row.generation = int(generation)
        row.observed_generation = observed_generation
    db.flush()
    return row


def conditions(db: Session, resource_type: str, resource_id: str) -> list[dict]:
    rows = db.query(ResourceCondition).filter(
        ResourceCondition.resource_type == resource_type,
        ResourceCondition.resource_id == str(resource_id),
    ).order_by(ResourceCondition.id.asc()).all()
    return [r.to_dict() for r in rows]


def envelope(data: dict, resource_type: str, resource_id: str, db: Session) -> dict:
    """给 GET 响应加 `apiVersion/kind/status{generation,observedGeneration,conditions}`。"""
    generation = db.query(func.max(ChangeLog.generation)).filter(
        ChangeLog.resource_type == resource_type,
        ChangeLog.resource_id == str(resource_id),
    ).scalar() or 1
    conds = conditions(db, resource_type, str(resource_id))
    observed = max([c["observedGeneration"] for c in conds], default=0)
    return {
        "apiVersion": DEFAULT_API_VERSION,
        "kind": kind_for(resource_type),
        "spec": data,
        "status": {
            "generation": int(generation),
            "observedGeneration": int(observed),
            "conditions": conds,
        },
    }


_KIND_BY_TYPE = {
    "workflow_config": "WorkflowConfig",
    "workflow": "Workflow",
    "orchestration_instance": "OrchestrationInstance",
}


def kind_for(resource_type: str) -> str:
    return _KIND_BY_TYPE.get(resource_type, "Workflow")
