"""L0 → L1 定时抽取作业（单例循环调用；默认不接模型 = 只统计规模）。

- 作业本身不做抽取决策：`extractor` 可注入（真实 LLM 适配器），默认 None → 纯 dry-run 统计；
- 每次最多处理 `L0_EXTRACT_MAX_CONVERSATIONS` 个会话（预算帽，不扫全库）。
"""
from __future__ import annotations

import config
from models.conversation import Conversation
from models.message import Message
from services import l0_extractor

DEFAULT_MAX_CONVERSATIONS = 5


def run_once(db, *, extractor=None, max_conversations: int | None = None,
             limit_per_conversation: int = l0_extractor.DEFAULT_LIMIT) -> dict:
    cap = int(config.L0_EXTRACT_MAX_CONVERSATIONS if max_conversations is None
              else max_conversations) or DEFAULT_MAX_CONVERSATIONS
    # 只挑**有消息**的会话（按最近更新倒序），不做全库扫描
    convs = (
        db.query(Conversation)
        .join(Message, Message.conversation_id == Conversation.id)
        .order_by(Conversation.updated_at.desc())
        .distinct()
        .limit(max(1, cap))
        .all()
    )
    total_candidates = 0
    total_created = 0
    details = []
    for conv in convs:
        out = l0_extractor.extract(db, conv, extractor=extractor, limit=limit_per_conversation)
        total_candidates += out["candidates"]
        total_created += len([c for c in out["created"] if c.get("stored")])
        details.append({"conversation_id": conv.id, "dry_run": out["dry_run"],
                        "candidates": out["candidates"], "created": len(out["created"])})
    return {
        "conversations": len(convs),
        "dry_run": extractor is None,
        "candidates": total_candidates,
        "created": total_created,
        "details": details,
    }
