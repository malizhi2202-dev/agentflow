"""回填脚本：默认 dry-run 不写库；--apply 需要 owner；幂等。"""
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
from models.teams import Squad
from services import team_service as ts

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
from scripts.backfill_squad_creator import run  # noqa: E402


class TestBackfill(unittest.TestCase):
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
        # 一条历史空 creator + 一条已有 creator
        self.db.add_all([
            Squad(slug="legacy", name="历史队", leader_agent_id=agent.id, created_by=""),
            Squad(slug="owned", name="有主队", leader_agent_id=agent.id, created_by="bob"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_dry_run_does_not_write(self):
        out = run(self.db, "alice", apply=False)
        self.assertEqual(out["scanned"], 1)
        self.assertFalse(out["applied"])
        row = self.db.query(Squad).filter(Squad.slug == "legacy").one()
        self.assertEqual(row.created_by, "")

    def test_apply_sets_owner_and_is_idempotent(self):
        out = run(self.db, "alice", apply=True)
        self.assertEqual(out["scanned"], 1)
        row = self.db.query(Squad).filter(Squad.slug == "legacy").one()
        self.assertEqual(row.created_by, "alice")
        # 已有 creator 的不被覆盖；再跑一次扫描 0 条
        self.assertEqual(self.db.query(Squad).filter(Squad.slug == "owned").one().created_by, "bob")
        self.assertEqual(run(self.db, "carol", apply=True)["scanned"], 0)
        # 回填后 creator 能写
        ts.assert_can_manage_squad(self.db, row, {"id": "alice", "role": "member"})


if __name__ == "__main__":
    unittest.main()
