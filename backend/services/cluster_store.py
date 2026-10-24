"""跨进程协调状态读写（P1-7）：队列 / 限流 / 调和退避 / 单例租约 / 监控偏移。

为什么要有这一层：波 1 之后身份是真的了，但「调度队列 / 控制面限流 / 调和退避」
仍各自躺在某个进程的内存里——重启清零、多副本各算各的。本模块把这三处状态
（外加 runtime 监控偏移）搬进库，并给单例后台循环加一把**数据库租约**：
拿到租约的副本干活，其余待命，租约到期自动可被接管。

时间约定：一律 UTC naive，与既有 ORM 模型一致；需要确定性测试的函数都收
`now: datetime | None`。

shortcut: 队列 claim 是「先查后有条件更新」，不是 SELECT ... FOR UPDATE SKIP LOCKED
          （SQLite 没有）。条件更新失败即重试，够用到多写并发成为瓶颈；届时按
          MySQL 换 SKIP LOCKED。限流同理：单条 UPDATE 递增，原子性由数据库保证。
"""
from __future__ import annotations

import datetime

from sqlalchemy import and_, case, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import config
from database import SessionLocal
from models.cluster import ClusterLease, RateLimitWindow, ReconcileState, WatcherOffset
from models.scheduler_queue import SchedulerQueue

# 调和退避：1s → 2s → 4s → 8s，连续失败超过阈值即暂停（需人工恢复）
BACKOFF_SECONDS = (1, 2, 4, 8)
MAX_CONSECUTIVE_FAILURES = 3

ACTIVE_STATUSES = ("queued", "leased")


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _session(db: Session | None) -> tuple[Session, bool]:
    if db is not None:
        return db, False
    return SessionLocal(), True


# ── 任务队列 ──────────────────────────────────────────────

def _claimable(now: datetime.datetime):
    """可被 claim：排队的，或租约已过期的（持有者失联）。"""
    return or_(
        SchedulerQueue.status == "queued",
        and_(
            SchedulerQueue.status == "leased",
            SchedulerQueue.lease_expires_at.isnot(None),
            SchedulerQueue.lease_expires_at <= now,
        ),
    )


def enqueue_task(task_id: str, label: str, priority: int = 50,
                 domain_id: int | None = None, agent_id: int | None = None,
                 db: Session | None = None,
                 now: datetime.datetime | None = None) -> dict:
    """入队并返回排位（1 = 下一个被 claim）。同一 task_id 重复入队保持幂等。"""
    now = now or _now()
    s = db or SessionLocal()
    try:
        row = s.query(SchedulerQueue).filter(
            SchedulerQueue.task_id == task_id,
            SchedulerQueue.status.in_(ACTIVE_STATUSES),
        ).first()
        if row is None:
            row = SchedulerQueue(
                task_id=task_id, label=label, priority=priority,
                domain_id=domain_id, agent_id=agent_id,
                status="queued", enqueued_at=now,
            )
            s.add(row)
            s.commit()
        result = row.to_dict()
        result["position"] = queue_position(task_id, db=s, now=now)
        return result
    finally:
        if s is not db:
            s.close()


def queue_position(task_id: str, db: Session | None = None,
                   now: datetime.datetime | None = None) -> int:
    """在**同 label** 的活跃任务里排第几（1-based）；不在队列返回 0。"""
    now = now or _now()
    s, _ = _session(db)
    try:
        me = s.query(SchedulerQueue).filter(
            SchedulerQueue.task_id == task_id,
            SchedulerQueue.status.in_(ACTIVE_STATUSES),
        ).first()
        if me is None:
            return 0
        ahead = s.query(SchedulerQueue).filter(
            SchedulerQueue.status.in_(ACTIVE_STATUSES),
            SchedulerQueue.label == me.label,
            or_(
                SchedulerQueue.priority > me.priority,
                and_(
                    SchedulerQueue.priority == me.priority,
                    SchedulerQueue.enqueued_at <= me.enqueued_at,
                ),
            ),
        ).count()
        return max(1, ahead)
    finally:
        if s is not db:
            s.close()


def count_queued(label: str | None = None, domain_id: int | None = None,
                 statuses: tuple[str, ...] = ACTIVE_STATUSES,
                 db: Session | None = None) -> int:
    s, _ = _session(db)
    try:
        q = s.query(SchedulerQueue).filter(SchedulerQueue.status.in_(statuses))
        if label is not None:
            q = q.filter(SchedulerQueue.label == label)
        if domain_id is not None:
            q = q.filter(SchedulerQueue.domain_id == domain_id)
        return q.count()
    finally:
        if s is not db:
            s.close()


def claim_task(worker_id: str, lease_seconds: int = 60,
               db: Session | None = None,
               now: datetime.datetime | None = None) -> dict | None:
    """取一个任务并打租约；条件更新失败（被别的副本抢到）就重试下一个。"""
    now = now or _now()
    s, _ = _session(db)
    try:
        for _ in range(5):
            cand = (
                s.query(SchedulerQueue)
                .filter(_claimable(now))
                .order_by(SchedulerQueue.priority.desc(), SchedulerQueue.enqueued_at.asc())
                .first()
            )
            if cand is None:
                return None
            result = s.execute(
                update(SchedulerQueue)
                .where(SchedulerQueue.id == cand.id, _claimable(now))
                .values(
                    status="leased",
                    lease_owner=worker_id,
                    lease_expires_at=now + datetime.timedelta(seconds=lease_seconds),
                    heartbeat_at=now,
                    started_at=SchedulerQueue.started_at,
                    attempts=SchedulerQueue.attempts + 1,
                )
                .execution_options(synchronize_session=False)
            )
            s.commit()
            if result.rowcount == 1:
                s.refresh(cand)
                return cand.to_dict()
        return None
    finally:
        if s is not db:
            s.close()


def heartbeat_task(task_id: str, worker_id: str, lease_seconds: int = 60,
                   db: Session | None = None,
                   now: datetime.datetime | None = None) -> bool:
    """续租；不是持有者或已结束返回 False（调用方据此停手，不要继续干活）。"""
    now = now or _now()
    s, _ = _session(db)
    try:
        result = s.execute(
            update(SchedulerQueue)
            .where(
                SchedulerQueue.task_id == task_id,
                SchedulerQueue.status == "leased",
                SchedulerQueue.lease_owner == worker_id,
            )
            .values(
                heartbeat_at=now,
                lease_expires_at=now + datetime.timedelta(seconds=lease_seconds),
            )
            .execution_options(synchronize_session=False)
        )
        s.commit()
        return result.rowcount == 1
    finally:
        if s is not db:
            s.close()


def finish_task(task_id: str, status: str = "done", db: Session | None = None,
                now: datetime.datetime | None = None) -> bool:
    if status not in ("done", "failed"):
        raise ValueError(f"非法结束状态: {status}")
    now = now or _now()
    s, _ = _session(db)
    try:
        result = s.execute(
            update(SchedulerQueue)
            .where(SchedulerQueue.task_id == task_id, SchedulerQueue.status.in_(ACTIVE_STATUSES))
            .values(status=status, finished_at=now)
            .execution_options(synchronize_session=False)
        )
        s.commit()
        return result.rowcount == 1
    finally:
        if s is not db:
            s.close()


def complete_oldest(label: str, domain_id: int | None = None,
                    db: Session | None = None,
                    now: datetime.datetime | None = None) -> int:
    """消费掉该能力标签下最早排队的一条（原 `decrement_queue` 的正解）。

    队列深度由行数直接得出，不再维护一个会漂移的计数器。
    """
    now = now or _now()
    s, _ = _session(db)
    try:
        q = s.query(SchedulerQueue).filter(
            SchedulerQueue.label == label,
            SchedulerQueue.status == "queued",
        )
        if domain_id is not None:
            q = q.filter(SchedulerQueue.domain_id == domain_id)
        row = q.order_by(SchedulerQueue.enqueued_at.asc()).first()
        if row is None:
            return 0
        row.status = "done"
        row.finished_at = now
        s.commit()
        return count_queued(label=label, domain_id=domain_id, statuses=("queued",), db=s)
    finally:
        if s is not db:
            s.close()


def requeue_expired(db: Session | None = None,
                    now: datetime.datetime | None = None) -> int:
    """把租约过期的任务退回 queued（持有者失联）。返回退回条数。"""
    now = now or _now()
    s, _ = _session(db)
    try:
        result = s.execute(
            update(SchedulerQueue)
            .where(
                SchedulerQueue.status == "leased",
                SchedulerQueue.lease_expires_at.isnot(None),
                SchedulerQueue.lease_expires_at <= now,
            )
            .values(status="queued", lease_owner=None, lease_expires_at=None)
            .execution_options(synchronize_session=False)
        )
        s.commit()
        return int(result.rowcount or 0)
    finally:
        if s is not db:
            s.close()


def queue_stats(db: Session | None = None) -> dict:
    s, _ = _session(db)
    try:
        rows = s.query(SchedulerQueue).filter(SchedulerQueue.status.in_(ACTIVE_STATUSES)).all()
        by_label: dict[str, int] = {}
        leased = 0
        for row in rows:
            by_label[row.label or "unknown"] = by_label.get(row.label or "unknown", 0) + 1
            if row.status == "leased":
                leased += 1
        return {"total": len(rows), "leased": leased, "by_label": by_label}
    finally:
        if s is not db:
            s.close()


# ── 固定窗口限流 ──────────────────────────────────────────

def _window_start(now: datetime.datetime, window_seconds: int) -> int:
    epoch = int(now.timestamp())
    return epoch - (epoch % max(1, window_seconds))


def consume(scope: str, window_seconds: int, max_hits: int,
            db: Session | None = None, now: datetime.datetime | None = None) -> tuple[int, bool]:
    """记一次并返回 (窗口内累计次数, 是否放行)。

    单条 UPDATE 原子递增：`COUNT = 同窗口 ? count+1 : 1`，跨进程也不会各算各的。
    """
    now = now or _now()
    start = _window_start(now, window_seconds)
    s = db or SessionLocal()
    try:
        # 一条 UPDATE 完成「同窗口 +1 / 换窗口重置」，跨进程不会各算各的
        result = s.execute(
            update(RateLimitWindow)
            .where(RateLimitWindow.scope == scope)
            .values(
                count=case(
                    (RateLimitWindow.window_start == start, RateLimitWindow.count + 1),
                    else_=1,
                ),
                window_start=case(
                    (RateLimitWindow.window_start == start, RateLimitWindow.window_start),
                    else_=start,
                ),
                updated_at=now,
            )
            .execution_options(synchronize_session=False)
        )
        if result.rowcount == 0:
            s.add(RateLimitWindow(scope=scope, window_start=start, count=1, updated_at=now))
            try:
                s.commit()
                return 1, max_hits >= 1
            except IntegrityError:
                # 另一个进程刚插进来：回滚后走 UPDATE 分支（并发首击）
                s.rollback()
                result = s.execute(
                    update(RateLimitWindow)
                    .where(RateLimitWindow.scope == scope)
                    .values(
                        count=case(
                            (RateLimitWindow.window_start == start, RateLimitWindow.count + 1),
                            else_=1,
                        ),
                        window_start=case(
                            (RateLimitWindow.window_start == start, RateLimitWindow.window_start),
                            else_=start,
                        ),
                        updated_at=now,
                    )
                    .execution_options(synchronize_session=False)
                )
        s.commit()
        row = s.query(RateLimitWindow).filter(RateLimitWindow.scope == scope).first()
        count = int(row.count) if row else 1
        return count, count <= max_hits
    finally:
        if s is not db:
            s.close()


def hits(scope: str, window_seconds: int, db: Session | None = None,
         now: datetime.datetime | None = None) -> int:
    """只读：当前窗口内已记次数。"""
    now = now or _now()
    start = _window_start(now, window_seconds)
    s, _ = _session(db)
    try:
        row = s.query(RateLimitWindow).filter(RateLimitWindow.scope == scope).first()
        if row is None or row.window_start != start:
            return 0
        return int(row.count)
    finally:
        if s is not db:
            s.close()


def reset(scope: str, db: Session | None = None) -> None:
    s, _ = _session(db)
    try:
        s.query(RateLimitWindow).filter(RateLimitWindow.scope == scope).delete()
        s.commit()
    finally:
        if s is not db:
            s.close()


def truncate_rate_limits(db: Session | None = None) -> None:
    """测试清场用：清空全部限流窗口。"""
    s, _ = _session(db)
    try:
        s.query(RateLimitWindow).delete()
        s.commit()
    finally:
        if s is not db:
            s.close()


# ── 调和退避 ──────────────────────────────────────────────

def reconcile_state(instance_id: int, db: Session | None = None) -> dict:
    s, _ = _session(db)
    try:
        row = s.query(ReconcileState).filter(ReconcileState.instance_id == instance_id).first()
        if row is None:
            return {"instance_id": instance_id, "failures": 0, "next_retry_at": None, "paused": False}
        return {
            "instance_id": instance_id,
            "failures": row.failures,
            "next_retry_at": row.next_retry_at,
            "paused": bool(row.paused),
        }
    finally:
        if s is not db:
            s.close()


def should_backoff(instance_id: int, db: Session | None = None,
                   now: datetime.datetime | None = None) -> bool:
    now = now or _now()
    state = reconcile_state(instance_id, db=db)
    if state["paused"]:
        return True
    next_retry = state["next_retry_at"]
    return next_retry is not None and now < next_retry


def record_reconcile_failure(instance_id: int, db: Session | None = None,
                             now: datetime.datetime | None = None) -> dict:
    """记一次失败并算下一次重试时间；超过阈值置 paused（需人工恢复）。"""
    now = now or _now()
    s, _ = _session(db)
    try:
        row = s.query(ReconcileState).filter(ReconcileState.instance_id == instance_id).first()
        if row is None:
            row = ReconcileState(instance_id=instance_id, failures=0, paused=0, updated_at=now)
            s.add(row)
        row.failures += 1
        row.updated_at = now
        if row.failures > MAX_CONSECUTIVE_FAILURES:
            row.paused = 1
            row.next_retry_at = None
        else:
            delay = BACKOFF_SECONDS[min(row.failures, len(BACKOFF_SECONDS)) - 1]
            row.next_retry_at = now + datetime.timedelta(seconds=delay)
        s.commit()
        return {
            "instance_id": instance_id,
            "failures": row.failures,
            "next_retry_at": row.next_retry_at,
            "paused": bool(row.paused),
        }
    finally:
        if s is not db:
            s.close()


def record_reconcile_success(instance_id: int, db: Session | None = None) -> None:
    s, _ = _session(db)
    try:
        s.query(ReconcileState).filter(ReconcileState.instance_id == instance_id).delete()
        s.commit()
    finally:
        if s is not db:
            s.close()


def resume_reconcile(instance_id: int, db: Session | None = None) -> None:
    """人工恢复：清掉 paused 与计数（对应原 `_resume_paused`）。"""
    record_reconcile_success(instance_id, db=db)


# ── 单例循环租约 ──────────────────────────────────────────

def instance_id() -> str:
    return config.INSTANCE_ID


def acquire_lease(name: str, ttl_seconds: int, owner: str | None = None,
                  db: Session | None = None,
                  now: datetime.datetime | None = None) -> bool:
    """拿到或续上租约：只有「我的」或「已过期」的租约能被占。"""
    now = now or _now()
    owner = owner or instance_id()
    s, _ = _session(db)
    try:
        result = s.execute(
            update(ClusterLease)
            .where(
                ClusterLease.name == name,
                or_(
                    ClusterLease.owner == owner,
                    ClusterLease.expires_at <= now,
                ),
            )
            .values(
                owner=owner,
                expires_at=now + datetime.timedelta(seconds=ttl_seconds),
                heartbeat_at=now,
            )
            .execution_options(synchronize_session=False)
        )
        s.commit()
        if result.rowcount == 1:
            return True
        if s.query(ClusterLease).filter(ClusterLease.name == name).first() is not None:
            return False
        s.add(ClusterLease(
            name=name, owner=owner,
            expires_at=now + datetime.timedelta(seconds=ttl_seconds),
            heartbeat_at=now,
        ))
        try:
            s.commit()
            return True
        except IntegrityError:
            s.rollback()
            return False
    finally:
        if s is not db:
            s.close()


def release_lease(name: str, owner: str | None = None,
                  db: Session | None = None) -> bool:
    owner = owner or instance_id()
    s, _ = _session(db)
    try:
        result = s.execute(
            update(ClusterLease)
            .where(ClusterLease.name == name, ClusterLease.owner == owner)
            .values(expires_at=datetime.datetime(1970, 1, 1))
            .execution_options(synchronize_session=False)
        )
        s.commit()
        return result.rowcount == 1
    finally:
        if s is not db:
            s.close()


def list_leases(db: Session | None = None, now: datetime.datetime | None = None) -> list[dict]:
    now = now or _now()
    s, _ = _session(db)
    try:
        rows = s.query(ClusterLease).all()
        return [
            {
                "name": r.name,
                "owner": r.owner,
                "active": r.expires_at > now,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "heartbeat_at": r.heartbeat_at.isoformat() if r.heartbeat_at else None,
            }
            for r in rows
        ]
    finally:
        if s is not db:
            s.close()


# ── runtime 监控偏移 ──────────────────────────────────────

def watcher_offset(file_path: str, db: Session | None = None) -> int:
    s, _ = _session(db)
    try:
        row = s.query(WatcherOffset).filter(WatcherOffset.file_path == file_path).first()
        return int(row.line_count) if row else 0
    finally:
        if s is not db:
            s.close()


def set_watcher_offset(file_path: str, line_count: int,
                       db: Session | None = None,
                       now: datetime.datetime | None = None) -> None:
    now = now or _now()
    s, _ = _session(db)
    try:
        row = s.query(WatcherOffset).filter(WatcherOffset.file_path == file_path).first()
        if row is None:
            s.add(WatcherOffset(file_path=file_path, line_count=line_count, updated_at=now))
        else:
            row.line_count = line_count
            row.updated_at = now
        s.commit()
    finally:
        if s is not db:
            s.close()
