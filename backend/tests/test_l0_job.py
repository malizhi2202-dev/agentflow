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
