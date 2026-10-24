"""P1-7 跨进程状态：任务队列（租约/心跳）· 限流 · 调和退避 · 单例租约 · 监控偏移。

全部用例只在内存 SQLite 上跑：每个用例一个新库，等价于「换一个副本」——
同一份数据被不同 session 读到，正是这层要保证的事。
"""
import datetime
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from services import cluster_store

T0 = datetime.datetime(2026, 10, 24, 8, 0, 0)


class _StoreTestBase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._p = patch.object(cluster_store, "SessionLocal", self.Session)
        self._p.start()

    def tearDown(self):
        self._p.stop()
        self.engine.dispose()


class TestTaskQueue(_StoreTestBase):
    def test_enqueue_persists_across_sessions(self):
        row = cluster_store.enqueue_task("t1", "research", now=T0)
        self.assertEqual(row["position"], 1)
        # 另一条 session（等价另一个副本）看得到
        self.assertEqual(cluster_store.count_queued(label="research"), 1)
        self.assertEqual(cluster_store.queue_position("t1"), 1)

    def test_enqueue_is_idempotent(self):
        cluster_store.enqueue_task("t1", "research", now=T0)
        cluster_store.enqueue_task("t1", "research", now=T0)
        self.assertEqual(cluster_store.count_queued(label="research"), 1)

    def test_priority_and_fifo_order(self):
        cluster_store.enqueue_task("low", "cap", priority=10, now=T0)
        cluster_store.enqueue_task("high", "cap", priority=90, now=T0 + datetime.timedelta(seconds=1))
        cluster_store.enqueue_task("mid", "cap", priority=50, now=T0 + datetime.timedelta(seconds=2))

        self.assertEqual(cluster_store.queue_position("high"), 1)
        self.assertEqual(cluster_store.queue_position("mid"), 2)
        self.assertEqual(cluster_store.queue_position("low"), 3)

        self.assertEqual(cluster_store.claim_task("w1", now=T0)["task_id"], "high")
        self.assertEqual(cluster_store.claim_task("w1", now=T0)["task_id"], "mid")
        self.assertEqual(cluster_store.claim_task("w1", now=T0)["task_id"], "low")

    def test_claim_leases_once_only(self):
        cluster_store.enqueue_task("t1", "cap", now=T0)
        cluster_store.enqueue_task("t2", "cap", now=T0 + datetime.timedelta(seconds=1))

        first = cluster_store.claim_task("w1", lease_seconds=60, now=T0)
        second = cluster_store.claim_task("w2", lease_seconds=60, now=T0)
        self.assertEqual(first["task_id"], "t1")
        self.assertEqual(second["task_id"], "t2")
        self.assertEqual(first["status"], "leased")
        self.assertEqual(first["lease_owner"], "w1")
        self.assertEqual(first["attempts"], 1)
        # 队列已空
        self.assertIsNone(cluster_store.claim_task("w3", now=T0))

    def test_expired_lease_can_be_reclaimed(self):
        cluster_store.enqueue_task("t1", "cap", now=T0)
        cluster_store.claim_task("w1", lease_seconds=10, now=T0)
        self.assertIsNone(cluster_store.claim_task("w2", now=T0 + datetime.timedelta(seconds=5)))

        reclaimed = cluster_store.claim_task("w2", lease_seconds=10, now=T0 + datetime.timedelta(seconds=11))
        self.assertEqual(reclaimed["task_id"], "t1")
        self.assertEqual(reclaimed["lease_owner"], "w2")
        self.assertEqual(reclaimed["attempts"], 2)

    def test_heartbeat_only_by_owner(self):
        cluster_store.enqueue_task("t1", "cap", now=T0)
        cluster_store.claim_task("w1", lease_seconds=10, now=T0)
        self.assertFalse(cluster_store.heartbeat_task("t1", "w2", 10, now=T0))
        # 第 9 秒续租 10 秒 → 到期时间从 T0+10 推到 T0+19
        self.assertTrue(
            cluster_store.heartbeat_task("t1", "w1", 10, now=T0 + datetime.timedelta(seconds=9))
        )
        # 原到期点之后仍不可被别人抢（续租生效）
        self.assertIsNone(
            cluster_store.claim_task("w2", lease_seconds=10, now=T0 + datetime.timedelta(seconds=11))
        )
        # 续租后的到期点之后才可被接管
        self.assertEqual(
            cluster_store.claim_task("w2", lease_seconds=10, now=T0 + datetime.timedelta(seconds=20))["task_id"],
            "t1",
        )

    def test_finish_task_removes_from_active(self):
        cluster_store.enqueue_task("t1", "cap", now=T0)
        self.assertTrue(cluster_store.finish_task("t1", "done", now=T0))
        self.assertEqual(cluster_store.count_queued(label="cap"), 0)
        self.assertFalse(cluster_store.finish_task("t1", "done", now=T0))
        with self.assertRaises(ValueError):
            cluster_store.finish_task("t1", "weird", now=T0)

    def test_count_by_label_and_domain(self):
        cluster_store.enqueue_task("a", "cap1", domain_id=1, now=T0)
        cluster_store.enqueue_task("b", "cap1", domain_id=2, now=T0)
        cluster_store.enqueue_task("c", "cap2", domain_id=1, now=T0)
        self.assertEqual(cluster_store.count_queued(label="cap1"), 2)
        self.assertEqual(cluster_store.count_queued(label="cap1", domain_id=1), 1)
        self.assertEqual(cluster_store.queue_stats()["total"], 3)
        self.assertEqual(cluster_store.queue_stats()["by_label"], {"cap1": 2, "cap2": 1})

    def test_complete_oldest_consumes_fifo(self):
        cluster_store.enqueue_task("a", "cap", now=T0)
        cluster_store.enqueue_task("b", "cap", now=T0 + datetime.timedelta(seconds=1))

        remaining = cluster_store.complete_oldest("cap", now=T0 + datetime.timedelta(seconds=2))
        self.assertEqual(remaining, 1)
        # 最早那条被消费，剩下的是 b
        self.assertEqual(cluster_store.queue_position("b"), 1)
        self.assertEqual(cluster_store.complete_oldest("cap", now=T0), 0)

    def test_requeue_expired(self):
        cluster_store.enqueue_task("t1", "cap", now=T0)
        cluster_store.claim_task("w1", lease_seconds=10, now=T0)
        self.assertEqual(cluster_store.requeue_expired(now=T0 + datetime.timedelta(seconds=5)), 0)
        self.assertEqual(cluster_store.requeue_expired(now=T0 + datetime.timedelta(seconds=11)), 1)
        row = cluster_store.claim_task("w2", now=T0 + datetime.timedelta(seconds=12))
        self.assertEqual(row["task_id"], "t1")
        self.assertEqual(row["lease_owner"], "w2")


class TestRateLimit(_StoreTestBase):
    def test_blocks_after_max(self):
        results = [
            cluster_store.consume("scope", 60, 3, now=T0)[1] for _ in range(4)
        ]
        self.assertEqual(results, [True, True, True, False])
        self.assertEqual(cluster_store.hits("scope", 60, now=T0), 4)

    def test_scopes_are_independent(self):
        for _ in range(3):
            cluster_store.consume("a", 60, 3, now=T0)
        self.assertTrue(cluster_store.consume("b", 60, 3, now=T0)[1])

    def test_window_resets(self):
        for _ in range(3):
            cluster_store.consume("scope", 60, 3, now=T0)
        self.assertFalse(cluster_store.consume("scope", 60, 3, now=T0)[1])
        # 下一分钟窗口：计数从 1 重新开始
        later = T0 + datetime.timedelta(seconds=60)
        count, allowed = cluster_store.consume("scope", 60, 3, now=later)
        self.assertEqual(count, 1)
        self.assertTrue(allowed)
        # 旧窗口的计数不再计入
        self.assertEqual(cluster_store.hits("scope", 60, now=later), 1)

    def test_reset_and_truncate(self):
        cluster_store.consume("a", 60, 3, now=T0)
        cluster_store.consume("b", 60, 3, now=T0)
        cluster_store.reset("a")
        self.assertEqual(cluster_store.hits("a", 60, now=T0), 0)
        self.assertEqual(cluster_store.hits("b", 60, now=T0), 1)
        cluster_store.truncate_rate_limits()
        self.assertEqual(cluster_store.hits("b", 60, now=T0), 0)

    def test_persists_across_sessions(self):
        cluster_store.consume("scope", 60, 1, now=T0)
        # 新 session（别的副本）读同一份计数 → 立即超限
        self.assertFalse(cluster_store.consume("scope", 60, 1, now=T0)[1])


class TestReconcileBackoff(_StoreTestBase):
    def test_backoff_schedule(self):
        state = cluster_store.record_reconcile_failure(7, now=T0)
        self.assertEqual(state["failures"], 1)
        self.assertEqual(state["next_retry_at"], T0 + datetime.timedelta(seconds=1))
        self.assertTrue(cluster_store.should_backoff(7, now=T0))
        self.assertFalse(cluster_store.should_backoff(7, now=T0 + datetime.timedelta(seconds=2)))

        state = cluster_store.record_reconcile_failure(7, now=T0 + datetime.timedelta(seconds=2))
        self.assertEqual(state["next_retry_at"], T0 + datetime.timedelta(seconds=4))

    def test_pauses_after_threshold(self):
        for i in range(cluster_store.MAX_CONSECUTIVE_FAILURES + 1):
            state = cluster_store.record_reconcile_failure(7, now=T0 + datetime.timedelta(seconds=i))
        self.assertTrue(state["paused"])
        self.assertIsNone(state["next_retry_at"])
        # 暂停后无论多久都不再跑
        self.assertTrue(cluster_store.should_backoff(7, now=T0 + datetime.timedelta(days=1)))

    def test_success_and_resume_clear_state(self):
        cluster_store.record_reconcile_failure(7, now=T0)
        cluster_store.record_reconcile_success(7)
        self.assertEqual(cluster_store.reconcile_state(7)["failures"], 0)
        self.assertFalse(cluster_store.should_backoff(7, now=T0))

        for i in range(cluster_store.MAX_CONSECUTIVE_FAILURES + 1):
            cluster_store.record_reconcile_failure(8, now=T0 + datetime.timedelta(seconds=i))
        cluster_store.resume_reconcile(8)
        self.assertFalse(cluster_store.should_backoff(8, now=T0))

    def test_state_persists_across_sessions(self):
        cluster_store.record_reconcile_failure(9, now=T0)
        # 另一个副本读到同样的退避状态（不是各自计数）
        self.assertTrue(cluster_store.should_backoff(9, now=T0))


class TestLeaderLease(_StoreTestBase):
    def test_single_holder_and_takeover_by_expiry(self):
        self.assertTrue(cluster_store.acquire_lease("cron-scheduler", 30, owner="A", now=T0))
        self.assertFalse(cluster_store.acquire_lease("cron-scheduler", 30, owner="B", now=T0))
        # 持有者续租
        self.assertTrue(cluster_store.acquire_lease("cron-scheduler", 30, owner="A", now=T0 + datetime.timedelta(seconds=10)))
        # 到期后 B 可以接管
        self.assertTrue(
            cluster_store.acquire_lease("cron-scheduler", 30, owner="B", now=T0 + datetime.timedelta(seconds=45))
        )

    def test_release_allows_other_owner(self):
        cluster_store.acquire_lease("runtime-watcher", 30, owner="A", now=T0)
        self.assertFalse(cluster_store.acquire_lease("runtime-watcher", 30, owner="B", now=T0))
        self.assertTrue(cluster_store.release_lease("runtime-watcher", owner="A"))
        self.assertTrue(cluster_store.acquire_lease("runtime-watcher", 30, owner="B", now=T0))

    def test_list_leases_reports_active(self):
        cluster_store.acquire_lease("cron-scheduler", 30, owner="A", now=T0)
        rows = {r["name"]: r for r in cluster_store.list_leases(now=T0)}
        self.assertTrue(rows["cron-scheduler"]["active"])
        self.assertEqual(rows["cron-scheduler"]["owner"], "A")
        stale = {r["name"]: r for r in cluster_store.list_leases(now=T0 + datetime.timedelta(minutes=5))}
        self.assertFalse(stale["cron-scheduler"]["active"])


class TestWatcherOffset(_StoreTestBase):
    def test_offset_roundtrip_and_persistence(self):
        path = "/specs/x/runtime.jsonl"
        self.assertEqual(cluster_store.watcher_offset(path), 0)
        cluster_store.set_watcher_offset(path, 12)
        self.assertEqual(cluster_store.watcher_offset(path), 12)
        cluster_store.set_watcher_offset(path, 20)
        self.assertEqual(cluster_store.watcher_offset(path), 20)
        self.assertEqual(cluster_store.watcher_offset("/specs/y/runtime.jsonl"), 0)


if __name__ == "__main__":
    unittest.main()
