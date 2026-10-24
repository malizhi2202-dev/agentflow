"""多副本单例租约（v21 T-06）：两个独立会话 = 两个副本，同一份库。

口径（P1-7）：拿到租约的副本干活，其余待命；租约到期可被接管；只有持有者能续/释放。
用**文件型 SQLite**（非 StaticPool）保证两个会话看到同一份数据，接近多副本真实形态。
"""
import datetime
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base
from services import cluster_store, l0_job

NAME = "l0-extract"
T0 = datetime.datetime(2026, 10, 24, 12, 0, 0)


class TestMultiReplicaLease(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        path = os.path.join(self.tmp.name, "cluster.db")
        self.engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.replica_a = self.Session()
        self.replica_b = self.Session()

    def tearDown(self):
        self.replica_a.close()
        self.replica_b.close()
        self.engine.dispose()
        self.tmp.cleanup()

    def _acquire(self, db, owner, now=T0, ttl=90):
        return cluster_store.acquire_lease(NAME, ttl, owner=owner, db=db, now=now)

    def test_only_one_replica_holds_lease(self):
        self.assertTrue(self._acquire(self.replica_a, "A"))
        self.assertFalse(self._acquire(self.replica_b, "B"), "B 不应抢到 A 还持有且未过期的租约")

    def test_holder_can_renew(self):
        self.assertTrue(self._acquire(self.replica_a, "A"))
        self.assertTrue(self._acquire(self.replica_a, "A", now=T0 + datetime.timedelta(seconds=30)))

    def test_expired_lease_is_taken_over(self):
        self.assertTrue(self._acquire(self.replica_a, "A"))
        later = T0 + datetime.timedelta(seconds=91)
        self.assertTrue(self._acquire(self.replica_b, "B", now=later), "过期后应可接管")
        self.assertFalse(self._acquire(self.replica_a, "A", now=later), "A 失去租约，不能再续")

    def test_release_hands_over(self):
        self.assertTrue(self._acquire(self.replica_a, "A"))
        self.assertTrue(cluster_store.release_lease(NAME, owner="A", db=self.replica_a))
        self.assertTrue(self._acquire(self.replica_b, "B"))
        # 非持有者释放是空操作（不报错、也不影响持有者）
        self.assertFalse(cluster_store.release_lease(NAME, owner="A", db=self.replica_a))

    def test_standby_replica_does_not_run_tick(self):
        """集成面：租约被别人的副本持有时，tick 返回 None 且不启动抽取。"""
        session = self.replica_b

        class OtherReplicaStore:
            def acquire_lease(self, name, ttl):
                return cluster_store.acquire_lease(
                    name, ttl, owner="other", db=session, now=T0)

        self.assertTrue(self._acquire(self.replica_a, "A"))
        self.assertIsNone(l0_job.tick(self.replica_b, cluster_store=OtherReplicaStore()))
