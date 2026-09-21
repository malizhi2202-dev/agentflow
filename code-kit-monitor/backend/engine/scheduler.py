"""调度器 — 优先级队列 + 防饥饿 + 抢占."""
from __future__ import annotations

import heapq
from datetime import datetime, timedelta


class PriorityQueue:
    """按优先级排序的编排任务队列.

    priority 越高越先执行；同优先级按入队时间 FIFO。
    排队超过 max_wait_seconds 自动提升 priority。
    """

    def __init__(self, max_wait_seconds: int = 300):
        self._heap: list[tuple[int, float, str]] = []  # (-priority, enqueued_ts, instance_id)
        self._entries: dict[str, dict] = {}
        self.max_wait_seconds = max_wait_seconds

    def enqueue(self, instance_id: str, priority: int = 50) -> None:
        """入队."""
        if instance_id in self._entries:
            return
        ts = datetime.utcnow().timestamp()
        entry = {"instance_id": instance_id, "priority": priority, "enqueued_ts": ts}
        self._entries[instance_id] = entry
        heapq.heappush(self._heap, (-priority, ts, instance_id))

    def next(self) -> str | None:
        """取出下一个要调度的 instance_id（先做防饥饿提升）."""
        self._boost_starved()
        while self._heap:
            _, _, instance_id = heapq.heappop(self._heap)
            if instance_id in self._entries:
                del self._entries[instance_id]
                return instance_id
        return None

    def peek(self) -> str | None:
        """查看队首但不取出."""
        self._boost_starved()
        while self._heap:
            _, _, instance_id = self._heap[0]
            if instance_id in self._entries:
                return instance_id
            heapq.heappop(self._heap)
        return None

    def remove(self, instance_id: str) -> None:
        """从队列中移除."""
        self._entries.pop(instance_id, None)

    def size(self) -> int:
        return len(self._entries)

    def list_all(self) -> list[dict]:
        """返回队列中所有任务（按优先级降序）."""
        items = list(self._entries.values())
        items.sort(key=lambda x: (-x["priority"], x["enqueued_ts"]))
        return items

    def _boost_starved(self) -> None:
        """防饥饿：排队超过 max_wait_seconds 的任务自动提升 priority."""
        now = datetime.utcnow().timestamp()
        for entry in list(self._entries.values()):
            wait = now - entry["enqueued_ts"]
            if wait > self.max_wait_seconds:
                # 重建堆项
                old_prio = entry["priority"]
                entry["priority"] = min(old_prio + 10, 100)
                entry["enqueued_ts"] = now  # 重置等待计时
                heapq.heappush(self._heap, (-entry["priority"], now, entry["instance_id"]))


# ── 全局调度器实例 ──
scheduler = PriorityQueue()
