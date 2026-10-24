"""自动化中心 API（v21 T-05）：跨 Agent 聚合列表 + 启停/删除的可见性。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.agent import Agent
from models.scheduled_task import ScheduledTask

from tests._auth_harness import AuthHarness


class TestAutomationsApi(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def setUp(self):
        super().setUp()
        a = Agent(owner_id="alice", name="巡检助手", model_provider="deepseek",
                  model_name="deepseek-flash", api_key_encrypted="x")
        b = Agent(owner_id="bob", name="bob 的助手", model_provider="deepseek",
                  model_name="deepseek-flash", api_key_encrypted="x")
        self.db.add_all([a, b]); self.db.commit()
        self.alice_agent, self.bob_agent = a.id, b.id
        for agent_id, owner, name in ((self.alice_agent, "alice", "alice 的巡检"),
                                      (self.bob_agent, "bob", "bob 的巡检")):
            self.db.add(ScheduledTask(agent_id=agent_id, cron_expr="0 9 * * 1",
                                      capability="daily-report", enabled=True,
                                      owner_id=owner, name=name))
        self.db.commit()

    def _list(self, uid):
        r = self.client(uid).get("/api/automations")
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["automations"]

    def test_list_is_owner_scoped_with_agent_name(self):
        alice = self._list("alice")
        self.assertEqual([a["name"] for a in alice], ["alice 的巡检"])
        self.assertEqual(alice[0]["agent_name"], "巡检助手")
        self.assertEqual(len(self._list("bob")), 1)

    def test_admin_sees_all(self):
        self.assertEqual(len(self._list("root")), 2)

    def test_toggle_flips_and_persists(self):
        c = self.client("alice")
        task_id = self._list("alice")[0]["id"]
        r = c.post(f"/api/automations/{task_id}/toggle")
        self.assertEqual(r.status_code, 200, r.text)
        self.assertFalse(r.json()["automation"]["enabled"])
        r2 = c.post(f"/api/automations/{task_id}/toggle")
        self.assertTrue(r2.json()["automation"]["enabled"])

    def test_other_members_task_is_404_not_403(self):
        bob_task = self._list("bob")[0]["id"]
        r = self.client("alice").post(f"/api/automations/{bob_task}/toggle")
        self.assertEqual(r.status_code, 404, r.text)

    def test_delete_removes_row(self):
        c = self.client("alice")
        task_id = self._list("alice")[0]["id"]
        self.assertEqual(c.delete(f"/api/automations/{task_id}").status_code, 200)
        self.assertEqual(self._list("alice"), [])

    def test_requires_auth(self):
        from fastapi.testclient import TestClient
        from main import app as app_

        self.assertEqual(TestClient(app_, client=("127.0.0.1", 50000)).get("/api/automations").status_code, 401)
