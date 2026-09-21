"""调度器服务 — Agent 选择 + 任务队列管理."""

from __future__ import annotations

from engine.scheduler import PriorityQueue


class SchedulerService:
    """Agent 调度服务：按标签匹配 Agent，选择负载最低的，管理等待队列."""

    def __init__(self):
        self._queue = PriorityQueue()
        # 存储 task_id → label 的映射，方便 dequeue 后按标签重新匹配
        self._task_labels: dict[str, str] = {}

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

    # ── 任务队列管理 ────────────────────────────────────────────────

    def enqueue(self, task_id: str, label: str, priority: int = 50) -> None:
        """当无可用 Agent 时，将任务加入优先级队列.

        Args:
            task_id: 任务唯一标识.
            label: 能力标签（用于后续 dequeue 时重新按标签匹配 Agent）.
            priority: 优先级，越高越先调度.
        """
        self._queue.enqueue(task_id, priority=priority)
        self._task_labels[task_id] = label

    def dequeue(self) -> tuple[str, str] | None:
        """从队列中取出下一个待调度的任务（通常在 Agent 变为空闲时调用）.

        Returns:
            (task_id, label) 元组；队列为空时返回 None.
        """
        task_id = self._queue.next()
        if task_id is None:
            return None
        label = self._task_labels.pop(task_id, "unknown")
        return task_id, label

    @property
    def queue_size(self) -> int:
        """当前等待队列中的任务数."""
        return self._queue.size()

    def list_queued(self) -> list[dict]:
        """列出所有排队中的任务."""
        return self._queue.list_all()
