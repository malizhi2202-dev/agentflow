"""调度器服务 — Agent 选择（按标签匹配 + 选最低负载）。

P1-7：原来的进程内等待队列（`PriorityQueue` + `_task_labels`）已删除——它
从未被生产路径写入（`route_to_agent` 只加了个计数器），重启即丢。队列
现在由 `services/cluster_store.py` 落库持有（带租约/心跳）。
"""

from __future__ import annotations


class SchedulerService:
    """Agent 调度服务：按标签匹配 Agent，选择负载最低的."""

    # ── Agent 匹配与选择 ────────────────────────────────────────────

    def match(self, label: str, agents: list[dict]) -> list[dict]:
        """按 capability 标签过滤 Agent 列表.

        Args:
            label: 能力标签，匹配 agents[i]['capability_tags'] 中的标签.
            agents: Agent 字典列表，每个需包含 'capability_tags' 字段（字符串列表）.

        Returns:
            匹配的 Agent 列表.
        """
        return [
            a for a in agents
            if label in (a.get("capability_tags") or [])
        ]

    def pick_least_loaded(self, candidates: list[dict]) -> dict | None:
        """从候选 Agent 中选择当前负载率最低的.

        负载率 = current_load / max_concurrency.
        只返回负载率 < 1.0 的 Agent（即仍有空闲容量的）。

        Args:
            candidates: Agent 字典列表，每个需包含 'current_load' 和
                        'max_concurrency' 字段.

        Returns:
            负载率最低的 Agent，若所有候选均已满载则返回 None.
        """
        best: dict | None = None
        best_ratio = float("inf")
        for a in candidates:
            current = a.get("current_load", 0)
            max_conc = a.get("max_concurrency", 1)
            if max_conc <= 0:
                max_conc = 1
            ratio = current / max_conc
            if ratio < 1.0 and ratio < best_ratio:
                best_ratio = ratio
                best = a
        return best
