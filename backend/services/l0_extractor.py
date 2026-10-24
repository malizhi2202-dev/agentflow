"""L0 → L1 抽取（记忆四层管道的入口，默认 **dry_run**）。

口径（RULINGS R6-1 · 主档 §2.8）：
- L0 = 对话原文（会话/消息表），本模块只负责「从原文抽候选原子记忆」；
- 抽取器**可注入**（真实 LLM 适配器以后接）；默认不调模型、不写库，返回 `dry_run=True`；
- 写入必须走 `rsi_service.propose_memory`：三字段缺一 → `no_entry`，拿不准默认 `confounded`。
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from models.conversation import Conversation
from models.message import Message
from services import rsi_service

DEFAULT_LIMIT = 50


class ExtractorError(ValueError):
    """抽取入参非法（路由 400）。"""


def load_messages(db: Session, conversation_id: int, limit: int = DEFAULT_LIMIT) -> list[str]:
    rows = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.id.desc()).limit(max(1, min(int(limit), 200))).all()
    rows.reverse()  # 时间正序
    return [m.content for m in rows if m.content]


def extract(db: Session, conversation: Conversation, *, extractor=None,
            limit: int = DEFAULT_LIMIT) -> dict:
    """返回 {'dry_run', 'candidates', 'created', 'messages'}。

    extractor: `(messages: list[str]) -> list[dict]`，每条 `{cue, lesson, evidence}`（可带 kind）。
    """
    contents = load_messages(db, conversation.id, limit)
    if extractor is None:
        # 默认 dry_run：不调模型、不写库。要真抽取必须先显式接适配器。
        return {"dry_run": True, "messages": len(contents), "candidates": 0,
                "created": [], "note": "未配置抽取器：dry_run 只回候选规模，不写记忆"}

    try:
        candidates = extractor(contents) or []
    except Exception as e:  # noqa: BLE001 — 抽取器异常要响亮失败，不吞
        raise ExtractorError(f"抽取器失败: {e}") from e

    created = []
    for c in candidates:
        if not isinstance(c, dict):
            raise ExtractorError("抽取器返回项必须是对象")
        result = rsi_service.propose_memory(
            db, layer="L1", kind=c.get("kind", "positive"),
            cue=c.get("cue", ""), lesson=c.get("lesson", ""),
            evidence=c.get("evidence") or [],
            source_ref=f"conversation:{conversation.id}",
            confounded=True,            # 机器抽取默认拿不准
            evidence_is_strong=bool(c.get("evidence")),
        )
        created.append({"stored": result["stored"], "status": result["status"],
                        "memory_id": result["memory"]["id"]})
    return {"dry_run": False, "messages": len(contents), "candidates": len(candidates),
            "created": created, "note": ""}
