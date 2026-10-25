"""v25 批 A-4 后端接线（R25-8）：指派确认层「开始」= 显式运行请求。

服务层 `run_from_assignment` 判定（转换层）+ 路由 `assign?start=true` 双入口校验。
原型口径 board#md-assign-confirm：开始=当场建 run、先不开工=只登记、终态不豁免、
人轨不产生 run、停车闸（backlog/未开始）内「开始」不入队。
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from models import Base  # noqa: E402
from models.agent import Agent  # noqa: E402
from services import collab_service as cs  # noqa: E402
from tests._auth_harness import AuthHarness  # noqa: E402


class _SvcBase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://",
                                    connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.agent = Agent(owner_id="alice", name="审查助手", model_provider="deepseek",
                           model_name="deepseek-chat", api_key_encrypted="x", status="standby")
        self.db.add(self.agent)
        self.db.commit()
        self.db.refresh(self.agent)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _assigned(self, status="in_progress", kind="agent"):
        item = cs.create_item(self.db, creator="alice", title="指派开跑用例")
        # 直接置状态造场景（测的是 run_from_assignment 的门，不是状态机白名单）
        item.status = status
        self.db.commit()
        if kind == "agent":
            cs.assign(self.db, item, "alice", kind="agent", assignee_id=str(self.agent.id))
        else:
            cs.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        self.db.refresh(item)
        return item


class TestRunFromAssignment(_SvcBase):
    def test_agent_track_off_parking_creates_queued_run(self):
        item = self._assigned(status="in_progress")
        run = cs.run_from_assignment(self.db, item, "alice")
        self.assertEqual(run.status, "queued")
        self.assertEqual(run.agent_id, self.agent.id)
        self.assertIn("指派开跑", run.summary)

    def test_backlog_parking_gate_rejects(self):
        item = self._assigned(status="backlog")
        with self.assertRaises(ValueError) as ctx:
            cs.run_from_assignment(self.db, item, "alice")
        self.assertIn("停车闸", str(ctx.exception))

    def test_todo_also_parked(self):
        item = self._assigned(status="todo")
        with self.assertRaises(ValueError):
            cs.run_from_assignment(self.db, item, "alice")

    def test_terminal_state_not_exempted(self):
        """done 也能当场开跑（原型脚注①：要「登记但不跑」只有「先不开工」一条路）。"""
        item = self._assigned(status="done")
        run = cs.run_from_assignment(self.db, item, "alice")
        self.assertEqual(run.status, "queued")

    def test_member_track_has_no_run(self):
        item = self._assigned(status="in_progress", kind="member")
        with self.assertRaises(ValueError) as ctx:
            cs.run_from_assignment(self.db, item, "alice")
        self.assertIn("agent 轨", str(ctx.exception))

    def test_missing_agent_rejected(self):
        item = self._assigned(status="in_progress")
        self.agent.owner_id = "someone-else"   # alice 既非 owner 也非 admin → 查不到
        self.db.commit()
        with self.assertRaises(ValueError):
            cs.run_from_assignment(self.db, item, "alice")


class TestAssignStartRoute(AuthHarness, unittest.TestCase):
    """路由层双入口：start 参数在入口也各判一次轨与停车闸，不假设服务层覆盖。"""

    users = [("root", "admin"), ("alice", "member")]

    def _make(self, uid, assignee_id):
        r = self.client(uid).post("/api/tasks", json={"title": "看板用例", "domain_id": 1})
        self.assertEqual(r.status_code, 200, r.text)
        t = r.json()["task"]
        return t

    def test_start_in_parking_rejected_at_entry(self):
        c = self.client("alice")
        t = self._make("alice", None)
        # 新任务在 backlog = 停车闸：start=true 应被入口拒
        r = c.post(f"/api/tasks/{t['id']}/assign",
                   json={"assignee_kind": "agent", "assignee_id": "1", "start": True})
        self.assertEqual(r.status_code, 400)
        self.assertIn("停车闸", r.json()["detail"])

    def test_start_on_member_rejected(self):
        c = self.client("alice")
        t = self._make("alice", None)
        c.post(f"/api/tasks/{t['id']}/status", json={"status": "in_progress"})
        r = c.post(f"/api/tasks/{t['id']}/assign",
                   json={"assignee_kind": "member", "assignee_id": "bob", "start": True})
        self.assertEqual(r.status_code, 400)
        self.assertIn("agent 轨", r.json()["detail"])

    def test_plain_assign_without_start_registers_only(self):
        """「先不开工」= 不传 start：只登记负责人，无 run。"""
        c = self.client("alice")
        t = self._make("alice", None)
        c.post(f"/api/tasks/{t['id']}/status", json={"status": "in_progress"})
        r = c.post(f"/api/tasks/{t['id']}/assign",
                   json={"assignee_kind": "agent", "assignee_id": "1"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertNotIn("run", r.json())


if __name__ == "__main__":
    unittest.main()
