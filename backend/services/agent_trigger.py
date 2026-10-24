"""Agent 运行触发（路由与 cron 共用）。

P0-1 AC-1.5：cron 原本用 `urllib` 回环打 `/api/agents/{id}/run` 并伪造
`X-User-Id: owner_id` —— 身份改成服务端会话后那条后门必须消失，
改为与路由**同一实现**的直调（路由与调度器各写一份 = 第二个 bug 的温床）。
"""
from __future__ import annotations

import datetime

from sqlalchemy.orm import Session

from database import SessionLocal
from models.agent import Agent
from models.agent_memory import AgentMemory


class AgentRunError(ValueError):
    """业务上不允许启动（如 token 硬限制）；由路由映射成 400。"""


def trigger_agent_run(agent_id: int, owner_id: str, is_admin: bool = False,
                      db: Session | None = None) -> dict | None:
    """把 Agent 置为 running 并载入相关记忆；不存在/无权返回 None。"""
    own = db is None
    db = db or SessionLocal()
    try:
        q = db.query(Agent).filter(Agent.id == agent_id)
        if not is_admin:
            q = q.filter(Agent.owner_id == owner_id)
        agent = q.first()
        if not agent:
            return None
        if agent.total_tokens_used >= agent.token_hard_limit:
            raise AgentRunError(f"Token 已达硬限制 ({agent.token_hard_limit})")

        agent.status = "running"
        db.commit()

        recent_since = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        capabilities = (agent.model_config_json or {}).get("capabilities", [])
        mem_q = db.query(AgentMemory).filter(
            AgentMemory.owner_id == agent.owner_id,
            AgentMemory.created_at >= recent_since,
        )
        if agent.domain_id is not None:
            mem_q = mem_q.filter(
                (AgentMemory.domain_id == agent.domain_id) | (AgentMemory.domain_id.is_(None))
            )
        memories = mem_q.order_by(
            AgentMemory.priority.desc(), AgentMemory.created_at.desc()
        ).limit(20).all()

        # 按 capability 过滤：记忆的 key / value 命中能力关键词
        if capabilities:
            filtered = []
            for m in memories:
                for cap in capabilities:
                    if cap.lower() in m.key.lower() or cap.lower() in (m.value or "").lower():
                        filtered.append(m)
                        break
            memories = filtered

        loaded = [m.to_dict() for m in memories]
        return {
            "status": "running",
            "agent_id": agent.id,
            "agent_name": agent.name,
            "runtime": agent.runtime,
            "model": agent.model_name,
            "loaded_memories": loaded,
            "loaded_count": len(loaded),
        }
    finally:
        if own:
            db.close()
