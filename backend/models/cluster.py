"""跨进程协调状态（P1-7）— 限流窗口 / 调和退避 / 单例循环租约 / 监控偏移。

这些状态此前都在进程内存里（`_rate_limit_store` / `_backoff_state` / `_watched`），
多副本会各自计数、各自退避、各自重放同一批 runtime 记录。落库后：
- 限流：固定窗口计数，一条原子 UPDATE 递增，多进程共享同一窗口；
- 退避：按实例 id 存一行，副本切换后不丢失；
- 租约：单例后台循环（cron / reconcile / runtime watcher）只有持租约的副本在跑。
"""

import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from models import Base


class RateLimitWindow(Base):
    """固定窗口限流计数（scope = 限流维度，window_start = 窗口起点 epoch 秒）。"""

    __tablename__ = "rate_limit_windows"

    scope: Mapped[str] = mapped_column(String(160), primary_key=True)
    window_start: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class ReconcileState(Base):
    """编排实例的调和退避状态（原 `_backoff_state` 字典）。"""

    __tablename__ = "reconcile_states"

    instance_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_retry_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    paused: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class ClusterLease(Base):
    """单例后台循环的租约：谁持有、何时到期。"""

    __tablename__ = "cluster_leases"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)
    heartbeat_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )


class WatcherOffset(Base):
    """runtime.jsonl 的已读行数（原 `_watched` 字典）——副本切换不重放。"""

    __tablename__ = "runtime_watcher_offsets"

    file_path: Mapped[str] = mapped_column(String(512), primary_key=True)
    line_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
