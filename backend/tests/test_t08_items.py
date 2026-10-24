"""T-08 小项的后端部分（v21-completion）：

1. 小队指派 = leader 入队（不是把负责人字段写成 squad 就完事）+ 去重 + 归档拒绝；
2. 可改面编辑/删除（仅管理员）；
3. 手动熔断/复位落审计。
"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.agent import Agent
from models.collab import WorkItem
from services import collab_service, team_service as ts

from tests._auth_harness import AuthHarness


class TestSquadAssign(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member")]

    def setUp(self):
        super().setUp()
        leader = Agent(owner_id="alice", name="审查助手", model_provider="deepseek",
                       model_name="deepseek-flash", api_key_encrypted="x")
        self.db.add(leader); self.db.commit()
        self.leader_id = leader.id
        self.squad = ts.create_squad(self.db, slug="code-review", name="代码审查小队",
                                     leader_agent_id=self.leader_id, created_by="alice")
        self.task = collab_service.create_item(self.db, creator="alice", title="要小队干的任务")

    def test_assign_to_squad_creates_leader_task(self):
        r = self.client("alice").post(f"/api/tasks/{self.task.id}/assign",
                                      json={"assignee_kind": "squad", "assignee_id": "code-review"})
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertFalse(body["deduped"])
        self.assertEqual(body["leader_task"]["assignee_kind"], "agent")
        self.assertEqual(body["leader_task"]["assignee_id"], str(self.leader_id))
        self.assertEqual(body["leader_task"]["parent_id"], self.task.id)
        self.assertEqual(body["task"]["assignee_kind"], "squad")

    def test_repeat_assign_is_deduped(self):
        c = self.client("alice")
        first = c.post(f"/api/tasks/{self.task.id}/assign",
                       json={"assignee_kind": "squad", "assignee_id": "code-review"}).json()
        second = c.post(f"/api/tasks/{self.task.id}/assign",
                        json={"assignee_kind": "squad", "assignee_id": "code-review"}).json()
        self.assertFalse(first["deduped"])
        self.assertTrue(second["deduped"])
        self.assertEqual(second["leader_task"]["id"], first["leader_task"]["id"])

    def test_archived_squad_is_rejected(self):
        ts.archive_squad(self.db, ts._squad(self.db, "code-review"))
        r = self.client("alice").post(f"/api/tasks/{self.task.id}/assign",
                                      json={"assignee_kind": "squad", "assignee_id": "code-review"})
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("归档", r.json()["detail"])

    def test_unknown_squad_is_404(self):
        r = self.client("alice").post(f"/api/tasks/{self.task.id}/assign",
                                      json={"assignee_kind": "squad", "assignee_id": "no-such"})
        self.assertEqual(r.status_code, 404, r.text)

    def test_member_assign_still_works(self):
        r = self.client("alice").post(f"/api/tasks/{self.task.id}/assign",
                                      json={"assignee_kind": "member", "assignee_id": "alice"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["task"]["assignee_kind"], "member")
        # 不该凭空造 leader 任务
        self.assertEqual(self.db.query(WorkItem).filter(WorkItem.is_leader_task == 1).count(), 0)


class TestSurfaceEditDelete(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member")]

    def _create(self):
        r = self.client("root").post("/api/rsi/surfaces",
                                     json={"name": "agent-config", "allow_edit": ["prompts/"]})
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["surface"]

    def test_member_cannot_edit_or_delete(self):
        s = self._create()
        c = self.client("alice")
        self.assertEqual(c.put(f"/api/rsi/surfaces/{s['id']}", json={"allow_edit": ["x/"]}).status_code, 403)
        self.assertEqual(c.delete(f"/api/rsi/surfaces/{s['id']}").status_code, 403)

    def test_admin_can_update_whitelist(self):
        s = self._create()
        r = self.client("root").put(f"/api/rsi/surfaces/{s['id']}",
                                    json={"allow_edit": ["prompts/", "docs/"]})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["surface"]["allow_edit"], ["prompts/", "docs/"])

    def test_bad_allow_edit_is_400(self):
        s = self._create()
        r = self.client("root").put(f"/api/rsi/surfaces/{s['id']}", json={"allow_edit": "prompts/"})
        self.assertEqual(r.status_code, 400, r.text)

    def test_delete_then_update_is_404(self):
        s = self._create()
        c = self.client("root")
        self.assertEqual(c.delete(f"/api/rsi/surfaces/{s['id']}").status_code, 200)
        self.assertEqual(c.put(f"/api/rsi/surfaces/{s['id']}", json={"allow_edit": []}).status_code, 404)


class TestBreakerAudit(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member")]

    def _audit_lines(self):
        with open(self.audit_file, encoding="utf-8") as f:
            return [json.loads(ln) for ln in f if ln.strip()]

    def test_trip_and_reset_are_audited(self):
        c = self.client("root")
        r = c.post("/api/rsi/breakers/budget/trip", json={"reason": "演练"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(c.post("/api/rsi/breakers/budget/reset").status_code, 200)
        actions = [ln.get("action") for ln in self._audit_lines()]
        self.assertIn("rsi.breaker.trip", actions)
        self.assertIn("rsi.breaker.reset", actions)

    def test_member_trip_is_forbidden_and_not_audited(self):
        r = self.client("alice").post("/api/rsi/breakers/budget/trip", json={"reason": "x"})
        self.assertEqual(r.status_code, 403, r.text)
        self.assertNotIn("rsi.breaker.trip", [ln.get("action") for ln in self._audit_lines()])
