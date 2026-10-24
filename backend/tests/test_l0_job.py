"""L0 定时作业：按会话上限抽取；默认 dry-run；可注入抽取器。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.agent import Agent
from models.conversation import Conversation
from models.message import Message
from models.rsi import Memory
from services import l0_job


class TestL0Job(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()
        agent = Agent(owner_id="alice", name="a", model_provider="deepseek",
                      model_name="m", api_key_encrypted="x")
        self.db.add(agent)
        self.db.commit()
        for i in range(3):
            conv = Conversation(agent_id=agent.id, owner_id="alice", title=f"c{i}")
            self.db.add(conv)
            self.db.commit()
            self.db.add(Message(conversation_id=conv.id, role="user", content=f"消息 {i}"))
            self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_default_dry_run_counts_only(self):
        out = l0_job.run_once(self.db)
        self.assertTrue(out["dry_run"])
        self.assertEqual(out["conversations"], 3)
        self.assertEqual(out["created"], 0)
        self.assertEqual(self.db.query(Memory).count(), 0)

    def test_cap_limits_conversations(self):
        out = l0_job.run_once(self.db, max_conversations=2)
        self.assertEqual(out["conversations"], 2)

    def test_injected_extractor_writes(self):
        def fake(messages):
            return [{"cue": "c", "lesson": "l", "evidence": [{"ref": "m1"}]}]
        out = l0_job.run_once(self.db, extractor=fake, max_conversations=2)
        self.assertFalse(out["dry_run"])
        self.assertEqual(out["created"], 2)          # 每个会话一条
        self.assertEqual(self.db.query(Memory).count(), 2)


if __name__ == "__main__":
    unittest.main()


class TestTick(unittest.TestCase):
    """定时循环的一轮：租约拿到才跑；拿不到待命；可用假 store 注入（不依赖真实 DB 集群表）。"""

    def setUp(self):
        from tests.test_l0_job import TestL0Job  # noqa: F401 — 复用夹具写法
        self._outer = TestL0Job("test_default_dry_run_counts_only")
        self._outer.setUp()

    def tearDown(self):
        self._outer.tearDown()

    class _Store:
        def __init__(self, ok):
            self.ok = ok
            self.calls = 0

        def acquire_lease(self, name, ttl):
            self.calls += 1
            return self.ok

    def test_tick_returns_none_when_standby(self):
        store = self._Store(False)
        out = l0_job.tick(self._outer.db, cluster_store=store)
        self.assertIsNone(out)
        self.assertEqual(store.calls, 1)

    def test_tick_runs_job_when_lease_acquired(self):
        store = self._Store(True)
        out = l0_job.tick(self._outer.db, cluster_store=store)
        self.assertIsNotNone(out)
        self.assertEqual(out["conversations"], 3)
        self.assertTrue(out["dry_run"])

    def test_tick_uses_lease_name_constant(self):
        names = []

        class S:
            def acquire_lease(self, name, ttl):
                names.append(name)
                return True

        l0_job.tick(self._outer.db, cluster_store=S())
        self.assertEqual(names, [l0_job.LEASE_NAME])
