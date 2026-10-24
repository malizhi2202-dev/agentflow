"""任务看板 P3-3（原型 6.20 + 变体）后端部分：

1. **完成态需证据 = 警告式**：`→ done` 时 evidence 为空仍允许完成，返回
   `evidence_warned=true` + 中文 warning 文案（不抛 400——原型是「建议」不是硬拦）；
2. 有证据则**不发警告**，并把旧警告撤掉（补证据后不再标「可疑完成」）；
3. 空壳证据（`{"label": "  "}`）不算证据——否则「空手完成」被一条空行洗白；
4. 指派小队仍是「给 leader 入队 leader 任务」语义（不回归成只改负责人字段）；
5. 他人任务 404 不回归（越权与不存在同码）；
6. 两根轴正交 + 受理门不拦「人点名派发」：triage=needs_triage 也能被人显式推状态。
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.agent import Agent
from models.collab import WorkItem
from services import collab_service, team_service as ts

from tests._auth_harness import AuthHarness


class _BoardBase(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def setUp(self):
        super().setUp()
        leader = Agent(owner_id="alice", name="审查助手", model_provider="deepseek",
                       model_name="deepseek-flash", api_key_encrypted="x")
        self.db.add(leader)
        self.db.commit()
        self.leader_id = leader.id
        ts.create_squad(self.db, slug="code-review", name="代码审查小队",
                        leader_agent_id=self.leader_id, created_by="alice")

    def _task(self, creator="alice", title="修复 32 个 TS 错误"):
        return collab_service.create_item(self.db, creator=creator, title=title)

    def _to_review(self, task, actor="alice"):
        for target in ("todo", "in_progress", "in_review"):
            collab_service.change_status(self.db, task, actor, target)
        self.db.refresh(task)


class TestEvidenceGate(_BoardBase):
    def test_done_without_evidence_is_warned_not_blocked(self):
        """无证据完成：200 + evidence_warned=true + 中文警告文案（不是 400）。"""
        item = self._task()
        self._to_review(item)

        r = self.client("alice").post(f"/api/tasks/{item.id}/status", json={"status": "done"})

        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["task"]["status"], "done")
        self.assertTrue(body["evidence_warned"])
        self.assertIn("done_without_evidence", body["warnings"])
        self.assertTrue(body["evidence_warning"])
        self.assertIn("缺证据", body["evidence_warning"])
        self.assertIn("复核", body["evidence_warning"])
        # 落库留痕：界面刷新后仍能看到「缺证据」chip
        self.db.refresh(item)
        self.assertEqual(item.status, "done")
        self.assertTrue(item.evidence_warned)
        self.assertTrue(item.to_dict()["evidence_warned"])

    def test_done_without_evidence_pushes_inbox_reminder(self):
        """缺证据完成 → 给负责人/订阅人一条「请补证据 + 同伴复核」提醒（可选链路）。"""
        item = self._task()
        collab_service.assign(self.db, item, "alice", kind="member", assignee_id="bob")
        self._to_review(item)

        collab_service.change_status(self.db, item, "alice", "done")

        box = collab_service.inbox_for(self.db, "bob")
        hit = [i for i in box["action_required"] if i["event_type"] == "evidence_missing"]
        self.assertEqual(len(hit), 1, box)
        self.assertIn("缺证据", hit[0]["body"])

    def test_done_with_evidence_no_warning(self):
        """有证据：不发警告，证据落库，旧的 evidence_warned 被撤销。"""
        item = self._task()
        self._to_review(item)
        item.evidence_warned = 1          # 上一轮缺证据留下的旧标记
        self.db.commit()

        r = self.client("alice").post(f"/api/tasks/{item.id}/status", json={
            "status": "done",
            "evidence": [{"label": "npx tsc --noEmit → 0 errors", "ref": "run-8849"}],
        })

        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["warnings"], [])
        self.assertFalse(body["evidence_warned"])
        self.assertIsNone(body["evidence_warning"])
        self.assertEqual(body["task"]["evidence"][0]["ref"], "run-8849")
        self.assertFalse(body["task"]["evidence_warned"])
        box = collab_service.inbox_for(self.db, "alice")
        self.assertEqual(
            [i for i in box["action_required"] if i["event_type"] == "evidence_missing"], [],
        )

    def test_blank_evidence_does_not_count(self):
        """空壳证据不算证据：`{"label": "   "}` 仍然发警告。"""
        item = self._task()
        self._to_review(item)

        result = collab_service.change_status(
            self.db, item, "alice", "done", evidence=[{"label": "   ", "ref": ""}],
        )

        self.assertTrue(result["evidence_warned"])
        self.assertIn("done_without_evidence", result["warnings"])

    def test_existing_evidence_reused_when_evidence_omitted(self):
        """payload 不带 evidence 时按已存证据判定（不把「没传」误当「没证据」）。"""
        item = self._task()
        self._to_review(item)
        item.evidence_json = '[{"label": "TEST.md §回归 12/12 绿", "ref": "TEST.md#回归"}]'
        self.db.commit()

        result = collab_service.change_status(self.db, item, "alice", "done")

        self.assertFalse(result["evidence_warned"])
        self.assertEqual(result["warnings"], [])


class TestSquadAssignAndAuthz(_BoardBase):
    def test_squad_assign_is_still_leader_queueing(self):
        """指派小队 = 给 leader 入队一条 leader 任务，成员不抢单（不回归成只改字段）。"""
        task = self._task()

        r = self.client("alice").post(f"/api/tasks/{task.id}/assign",
                                      json={"assignee_kind": "squad", "assignee_id": "code-review"})

        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertFalse(body["deduped"])
        self.assertEqual(body["task"]["assignee_kind"], "squad")
        self.assertEqual(body["leader_task"]["assignee_kind"], "agent")
        self.assertEqual(body["leader_task"]["assignee_id"], str(self.leader_id))
        self.assertEqual(body["leader_task"]["parent_id"], task.id)
        # 再指派一次去重，不产生第二条 leader 任务
        again = self.client("alice").post(
            f"/api/tasks/{task.id}/assign",
            json={"assignee_kind": "squad", "assignee_id": "code-review"},
        ).json()
        self.assertTrue(again["deduped"])

    def test_unknown_squad_fails_with_detail(self):
        """指派失败文案透传给界面（前端原样显示 detail）。"""
        task = self._task()
        r = self.client("alice").post(f"/api/tasks/{task.id}/assign",
                                      json={"assignee_kind": "squad", "assignee_id": "no-such-squad"})
        self.assertGreaterEqual(r.status_code, 400, r.text)
        self.assertTrue(r.json().get("detail"))

    def test_others_task_is_404_for_status_and_read(self):
        """他人任务：读与改状态都 404（不泄露存在性）。"""
        task = self._task(creator="alice")
        bob = self.client("bob")

        self.assertEqual(bob.get(f"/api/tasks/{task.id}").status_code, 404)
        r = bob.post(f"/api/tasks/{task.id}/status", json={"status": "todo"})
        self.assertEqual(r.status_code, 404, r.text)

        self.db.refresh(task)
        self.assertEqual(task.status, "backlog")   # 越权请求没有副作用


class TestAxesOrthogonal(_BoardBase):
    def test_status_change_does_not_touch_triage(self):
        """两根轴正交：改状态不动受理态。"""
        item = self._task()
        self.assertEqual(item.triage_state, "needs_triage")

        collab_service.change_status(self.db, item, "alice", "todo")
        collab_service.change_status(self.db, item, "alice", "in_progress")
        self.db.refresh(item)

        self.assertEqual(item.status, "in_progress")
        self.assertEqual(item.triage_state, "needs_triage")

    def test_unaccepted_task_still_accepts_explicit_human_move(self):
        """受理门只拦「自动推导执行者」，不拦人点名派发 → 未受理也允许人显式推状态。

        后端目前没有派生执行入口（唯一建设路径是 POST /api/tasks 与本路由），
        所以「受理门」本身未接入；这里锁的是「不拦人」这一半，防止将来加门时误拦。
        """
        item = self._task()
        self.assertEqual(item.triage_state, "needs_triage")

        r = self.client("alice").post(f"/api/tasks/{item.id}/status",
                                      json={"status": "todo"})

        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["task"]["status"], "todo")
        self.assertEqual(r.json()["task"]["triage_state"], "needs_triage")


if __name__ == "__main__":
    unittest.main()
