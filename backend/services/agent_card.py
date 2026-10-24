"""A2A M0 静态 AgentCard（R4-2 / P1-15）。

口径（`RULINGS.md` R4-2 · 主档 §1.6.2 P1-15）：
- **只做 M0 静态卡**：对外「我是谁、能干什么」的发现面；**M2（任务协商/流式/推通知）冻结**，
  不做握手、不建会话、不改任何状态——这就是「静态」的含义。
- **白名单构造**：卡片字段逐个挑选，**绝不含 api_key / model_config 凭据 / gate 提示词**。
  用 `agent.to_dict()` 拼卡会顺手把遮蔽后的 key 一起带出去，所以这里不用它。
- 越权与不存在统一 404（不让状态码变成资源探测器）。
"""
from __future__ import annotations

API_VERSION = "agentflow/v1"
MATURITY = "M0"
NOTE = "M0 静态卡：只做发现，不做 A2A 任务协商（M2 冻结，见 RULINGS R4-2）"


def build_card(agent) -> dict:
    """把一个 Agent 行构造成静态卡。**白名单**，不序列化整行。"""
    return {
        "apiVersion": API_VERSION,
        "kind": "AgentCard",
        "maturity": MATURITY,
        "name": agent.name,
        "description": agent.description or "",
        "status": agent.status,
        "runtime": {
            "kind": agent.runtime,
            "model": agent.model_name,
        },
        "capabilities": {
            # M0 全部为 False：这些是 M2 的能力，冻结即如实写 false，不冒充
            "streaming": False,
            "pushNotifications": False,
            "stateTransitionHistory": False,
        },
        "skills": [
            {
                "id": f"agent-{agent.id}",
                "name": agent.name,
                "description": agent.description or "",
                "tags": [t for t in (agent.runtime, agent.model_name) if t],
            }
        ],
        "endpoints": {
            # 发现面指向站内调用入口；M0 不提供 A2A 协议端点
            "invoke": f"/api/agents/{agent.id}/run",
        },
        "note": NOTE,
    }
