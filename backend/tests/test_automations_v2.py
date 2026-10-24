"""自动化中心 v2（P3-1）：原型九节的真实口径用例。

覆盖（逐节对照原型）：
① 清单：owner 隔离 / admin 全见 / 触发器摘要 / next_runs / 7d 失败率
② 三段构成：Runbook ⟂ 负责人 ⟂ 触发器 各自独立改，互不覆盖
③ schedule：5 段无秒位校验、IANA 时区、next_runs 真算、多条并存、单条启停
④ webhook：幂等键去重、载荷上限 64KB、secret 遮蔽与 Rotate、事件过滤、六步推断、响应语义
⑤ exec_mode：create_issue ⟂ run_only 校验
⑥ 两级账本：运行史（跑了什么）⟂ 投递记录（外面投了什么）
⑦ 治理三态：熔断 / 手动暂停 / 归档 + 审计落账
⑧ 两本账：能管（owner/admin）⟂ 能真跑（enabled + breaker）分开判定
⑨ 他人资源一律 404（不用状态码探测）
"""
import datetime
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from models.automation import (  # noqa: E402 — 必须在 Base.metadata.create_all 之前导入
    Automation,
    AutomationDelivery,
    AutomationRun,
    AutomationTrigger,
)
from services import automation_service as svc  # noqa: E402
from tests._auth_harness import AuthHarness  # noqa: E402


def _runbook(goal="日会前过一遍待审 PR"):
    return {"goal": goal, "background": "AF-109 靠人手工发起常漏",
            "constraints": "不改代码、不合并", "steps": "1) 拉清单 2) 汇总 REVIEW.md"}


class TestAutomationsV2(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    # ── 夹具 ──────────────────────────────────────────────
    def _create(self, uid="alice", **over):
        payload = {
            "name": f"{uid} 的自动化",
            "runbook": _runbook(),
            "owner_track": "agent",
            "owner_id_ref": "5",
            "exec_mode": "run_only",
        }
        payload.update(over)
        r = self.client(uid).post("/api/automations", json=payload)
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()["automation"]

    def _add_trigger(self, uid, auto_id, **over):
        payload = {"kind": "schedule", "cron": "30 8 * * 1-5", "timezone": "Asia/Shanghai"}
        payload.update(over)
        r = self.client(uid).post(f"/api/automations/{auto_id}/triggers", json=payload)
        return r

    def _webhook(self, token, body, headers=None):
        from fastapi.testclient import TestClient
        from main import app as app_
        c = TestClient(app_, client=("127.0.0.1", 50000))
        return c.post(f"/api/webhooks/automations/{token}", json=body, headers=headers or {})

    def _webhook_raw(self, token, raw, headers=None):
        from fastapi.testclient import TestClient
        from main import app as app_
        c = TestClient(app_, client=("127.0.0.1", 50000))
        return c.post(f"/api/webhooks/automations/{token}", content=raw,
                      headers=headers or {})

    def _audit_actions(self):
        if not os.path.exists(self.audit_file):
            return []
        with open(self.audit_file, encoding="utf-8") as f:
            return [json.loads(line)["action"] for line in f if line.strip()]

    # ── ① 清单 ────────────────────────────────────────────
    def test_requires_auth(self):
        from fastapi.testclient import TestClient
        from main import app as app_

        r = TestClient(app_, client=("127.0.0.1", 50000)).get("/api/automations")
        self.assertEqual(r.status_code, 401, r.text)

    def test_list_is_owner_scoped_and_carries_meta(self):
        self._create("alice", name="alice 的")
        self._create("bob", name="bob 的")
        alice = self.client("alice").get("/api/automations").json()
        self.assertEqual([a["name"] for a in alice["automations"]], ["alice 的"])
        self.assertEqual(alice["meta"]["total"], 1)
        self.assertEqual(alice["meta"]["enabled"], 1)
        self.assertEqual(alice["webhook_payload_limit"], 64 * 1024)
        self.assertIn("breaker_rule", alice)
        root = self.client("root").get("/api/automations").json()
        self.assertEqual(root["meta"]["total"], 2)

    # ── ② 三段构成 ────────────────────────────────────────
    def test_three_sections_edit_independently(self):
        auto = self._create()
        auto_id = auto["id"]
        c = self.client("alice")
        self.assertEqual(auto["spec_version"], 1)

        # 只改 Runbook：负责人不动
        r = c.put(f"/api/automations/{auto_id}", json={"runbook": _runbook("换成新目标")})
        self.assertEqual(r.status_code, 200, r.text)
        row = r.json()["automation"]
        self.assertEqual(row["runbook"]["goal"], "换成新目标")
        self.assertEqual(row["owner_track"], "agent")
        self.assertEqual(row["owner_id_ref"], "5")
        self.assertEqual(row["spec_version"], 2)

        # 只改负责人：Runbook 不动
        r = c.put(f"/api/automations/{auto_id}",
                  json={"owner_track": "squad", "owner_id_ref": "sq-1"})
        row = r.json()["automation"]
        self.assertEqual(row["owner_track"], "squad")
        self.assertEqual(row["owner_id_ref"], "sq-1")
        self.assertEqual(row["runbook"]["goal"], "换成新目标")
        self.assertEqual(row["spec_version"], 3)

        # 改名字不追加版本（改名不转移责任）
        r = c.put(f"/api/automations/{auto_id}", json={"name": "改过的名字"})
        row = r.json()["automation"]
        self.assertEqual(row["name"], "改过的名字")
        self.assertEqual(row["spec_version"], 3)
        self.assertEqual(row["runbook"]["goal"], "换成新目标")
        self.assertEqual(row["owner_id_ref"], "sq-1")

        # Runbook 目标必填
        r = c.put(f"/api/automations/{auto_id}", json={"runbook": _runbook("")})
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("目标不能为空", r.json()["detail"])

        # 他人不可改（404 不是 403）
        bob = self.client("bob").put(f"/api/automations/{auto_id}", json={"name": "抢改"})
        self.assertEqual(bob.status_code, 404, bob.text)

    def test_trigger_is_its_own_segment(self):
        auto = self._create()
        auto_id = auto["id"]
        self.assertEqual(auto["trigger_count"], 0)
        self.assertIn("无触发器", auto["trigger_summary"])
        r = self._add_trigger("alice", auto_id)
        self.assertEqual(r.status_code, 200, r.text)
        row = r.json()["automation"]
        self.assertEqual(row["trigger_count"], 1)
        self.assertIn("schedule 30 8 * * 1-5", row["trigger_summary"])
        self.assertEqual(row["runbook"]["goal"], _runbook()["goal"])   # Runbook 没被触发器写入覆盖
        self.assertEqual(row["spec_version"], 2)

    # ── ③ schedule ────────────────────────────────────────
    def test_schedule_cron_validation_and_next_runs(self):
        auto_id = self._create()["id"]

        r = self._add_trigger("alice", auto_id)
        self.assertEqual(r.status_code, 200, r.text)
        trig = r.json()["trigger"]
        self.assertEqual(trig["kind"], "schedule")
        self.assertEqual(len(trig["next_runs"]), 3)
        now = datetime.datetime.now(datetime.timezone.utc)
        weekdays = {1, 2, 3, 4, 5}   # cron 1-5 = 周一…周五
        for iso in trig["next_runs"]:
            at = datetime.datetime.fromisoformat(iso)
            self.assertIsNotNone(at.tzinfo)
            self.assertGreater(at, now)                      # 真算：不是写死的过去时刻
            self.assertIn(at.hour, (8,))
            self.assertIn(at.minute, (30,))
            self.assertIn((at.weekday() + 1) % 7, weekdays)  # 跳过周末
        self.assertIsNone(trig["next_runs_note"])            # 默认时区不标注

        # 6 段（带秒位）必须被拒，且说清原因
        r = self._add_trigger("alice", auto_id, cron="0 30 8 * * 1-5")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("5 段", r.json()["detail"])
        # 越界
        r = self._add_trigger("alice", auto_id, cron="61 8 * * *")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("越界", r.json()["detail"])
        # 段数不足
        r = self._add_trigger("alice", auto_id, cron="0 8 *")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("5 段", r.json()["detail"])
        # 非 IANA 时区
        r = self._add_trigger("alice", auto_id, timezone="Mars/Base")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("IANA", r.json()["detail"])

    def test_non_default_timezone_is_annotated(self):
        auto_id = self._create()["id"]
        r = self._add_trigger("alice", auto_id, cron="0 2 * * *", timezone="America/New_York")
        self.assertEqual(r.status_code, 200, r.text)
        trig = r.json()["trigger"]
        self.assertIn("非默认时区已标注", trig["next_runs_note"])
        self.assertIn("America/New_York", trig["next_runs_note"])

    def test_multiple_schedules_coexist_and_can_be_disabled(self):
        auto_id = self._create()["id"]
        first = self._add_trigger("alice", auto_id, cron="30 8 * * 1-5").json()["trigger"]
        second = self._add_trigger("alice", auto_id, cron="0 16 * * 5").json()["trigger"]
        row = self.client("alice").get(f"/api/automations/{auto_id}").json()["automation"]
        self.assertEqual(row["trigger_count"], 2)
        self.assertIn("30 8 * * 1-5", row["trigger_summary"])
        self.assertIn("0 16 * * 5", row["trigger_summary"])

        # 单条停用：不显示未来时刻，另一条不受影响
        r = self.client("alice").post(
            f"/api/automations/{auto_id}/triggers/{second['id']}/toggle",
            json={"enabled": False})
        self.assertEqual(r.status_code, 200, r.text)
        toggled = r.json()["trigger"]
        self.assertFalse(toggled["enabled"])
        self.assertEqual(toggled["next_runs"], [])
        self.assertIn("停用中", toggled["next_runs_note"])
        remaining = [t for t in r.json()["automation"]["triggers"] if t["id"] == first["id"]][0]
        self.assertTrue(remaining["enabled"])
        self.assertEqual(len(remaining["next_runs"]), 3)

    def test_cron_preview_endpoint_is_server_side(self):
        auto_id = self._create()["id"]
        c = self.client("alice")
        r = c.get(f"/api/automations/{auto_id}/triggers/preview",
                  params={"cron": "0 0 1 1 *", "timezone": "Asia/Shanghai"})
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(len(data["next_runs"]), 3)
        # 一年一次这种表达式：预览要把「一年一次」摊到脸上（跨年而非同一天）
        years = {datetime.datetime.fromisoformat(x).year for x in data["next_runs"]}
        self.assertEqual(len(years), 3)
        self.assertTrue(all(x.endswith("-01-01T00:00:00+08:00") for x in data["next_runs"]))

        bad = c.get(f"/api/automations/{auto_id}/triggers/preview",
                    params={"cron": "*/0 * * * *", "timezone": "Asia/Shanghai"})
        self.assertEqual(bad.status_code, 422, bad.text)
        self.assertIn("步长", bad.json()["detail"])

    # ── ④ webhook ─────────────────────────────────────────
    def test_webhook_trigger_masks_secret(self):
        auto_id = self._create()["id"]
        r = self._add_trigger("alice", auto_id, kind="webhook")
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        token = data["secret"]["token"]
        self.assertTrue(token.startswith("af_wh_"))
        masks = data["trigger"]["secret_preview"]
        self.assertIn("…", masks)
        self.assertNotIn(token, json.dumps(data["trigger"], ensure_ascii=False))
        self.assertEqual(data["trigger"]["payload_limit"], 64 * 1024)
        self.assertIn("字节", data["trigger"]["payload_limit_human"])

    def test_webhook_dedup_by_idempotency_key(self):
        auto_id = self._create()["id"]
        token = self._add_trigger("alice", auto_id, kind="webhook").json()["secret"]["token"]

        first = self._webhook(token, {"event": "push", "action": "opened"},
                              {"Idempotency-Key": "k-1"})
        self.assertEqual(first.status_code, 202, first.text)
        self.assertEqual(first.json()["semantics"], "accepted")
        self.assertEqual(first.json()["event"], "push")

        again = self._webhook(token, {"event": "push", "action": "opened"},
                              {"Idempotency-Key": "k-1"})
        self.assertEqual(again.status_code, 200, again.text)
        self.assertEqual(again.json()["semantics"], "duplicate")

        runs = self.client("alice").get(f"/api/automations/{auto_id}/runs").json()["runs"]
        self.assertEqual(len(runs), 1, "去重命中的投递不新建运行")
        delivs = self.client("alice").get(
            f"/api/automations/{auto_id}/deliveries").json()["deliveries"]
        self.assertEqual(len(delivs), 2, "跑没跑都要记投递")
        self.assertEqual([d["status"] for d in delivs], ["duplicate", "accepted"])

    def test_webhook_payload_limit_records_failure(self):
        auto_id = self._create()["id"]
        token = self._add_trigger("alice", auto_id, kind="webhook").json()["secret"]["token"]
        big = b'{"event":"push","blob":"' + b"x" * (65 * 1024) + b'"}'
        r = self._webhook_raw(token, big)
        self.assertEqual(r.status_code, 413, r.text)
        self.assertIn("超上限", r.json()["detail"])
        delivs = self.client("alice").get(
            f"/api/automations/{auto_id}/deliveries").json()["deliveries"]
        self.assertEqual(len(delivs), 1)
        self.assertEqual(delivs[0]["status"], "rejected")
        self.assertGreater(delivs[0]["payload_bytes"], 64 * 1024)
        self.assertFalse(delivs[0]["replayable"])
        runs = self.client("alice").get(f"/api/automations/{auto_id}/runs").json()["runs"]
        self.assertEqual(runs, [])

    def test_webhook_rotate_invalidates_old_url(self):
        auto_id = self._create()["id"]
        webhook = self._add_trigger("alice", auto_id, kind="webhook").json()
        old_token = webhook["secret"]["token"]
        old_mask = webhook["trigger"]["secret_preview"]

        r = self.client("alice").post(
            f"/api/automations/{auto_id}/triggers/{webhook['trigger']['id']}/rotate")
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        new_token = data["secret"]["token"]
        self.assertNotEqual(new_token, old_token)
        self.assertNotEqual(data["trigger"]["secret_preview"], old_mask)

        stale = self._webhook(old_token, {"event": "push"})
        self.assertEqual(stale.status_code, 404, stale.text)
        fresh = self._webhook(new_token, {"event": "push"})
        self.assertEqual(fresh.status_code, 202, fresh.text)

        # schedule 触发器没有 URL，Rotate 必须明确拒绝
        sched = self._add_trigger("alice", auto_id).json()["trigger"]
        r = self.client("alice").post(
            f"/api/automations/{auto_id}/triggers/{sched['id']}/rotate")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("只有 webhook", r.json()["detail"])

    def test_webhook_event_filter_and_six_step_inference(self):
        auto_id = self._create()["id"]
        trigger = self._add_trigger("alice", auto_id, kind="webhook",
                                    event_filter=[{"event": "push",
                                                   "actions": ["opened"]}]).json()["trigger"]
        token = self._add_trigger("alice", auto_id, kind="webhook",
                                  event_filter=[{"event": "push",
                                                 "actions": ["opened"]}]).json()["secret"]["token"]
        self.assertEqual(trigger["event_filter"], [{"event": "push", "actions": ["opened"]}])

        ignored = self._webhook(token, {"event": "issues", "action": "opened"})
        self.assertEqual(ignored.status_code, 200, ignored.text)
        self.assertEqual(ignored.json()["semantics"], "ignored")

        ok = self._webhook(token, {"event": "push", "action": "opened"})
        self.assertEqual(ok.status_code, 202, ok.text)
        self.assertEqual(ok.json()["inferred_at_step"], 1)

        # 第 2 步：X-GitHub-Event
        step2 = self._webhook(token, {"action": "opened"}, {"X-GitHub-Event": "push"})
        self.assertEqual(step2.json()["inferred_at_step"], 2)
        # 第 5 步：正文 type —— 必须用**空规则**的触发器（带 push 过滤的会把 note 正确过滤成 ignored）
        plain5_id = self._create(name="第5步规则")["id"]
        token5 = self._add_trigger("alice", plain5_id, kind="webhook").json()["secret"]["token"]
        step5 = self._webhook(token5, {"type": "note"})
        self.assertEqual(step5.status_code, 202, step5.text)
        self.assertEqual(step5.json()["inferred_at_step"], 5)
        # 第 6 步：兜底 webhook.received 且仍收（空规则 = 全收）
        plain_id = self._create(name="全收规则")["id"]
        plain_token = self._add_trigger("alice", plain_id, kind="webhook").json()["secret"]["token"]
        step6 = self._webhook(plain_token, {})
        self.assertEqual(step6.status_code, 202, step6.text)
        self.assertEqual(step6.json()["inferred_at_step"], 6)
        self.assertEqual(step6.json()["event"], "webhook.received")

    def test_webhook_rejects_malformed_json(self):
        auto_id = self._create()["id"]
        token = self._add_trigger("alice", auto_id, kind="webhook").json()["secret"]["token"]
        r = self._webhook_raw(token, b"not-json")
        self.assertEqual(r.status_code, 400, r.text)
        r = self._webhook_raw("af_wh_deadbeef", b"{}")
        self.assertEqual(r.status_code, 404, r.text)

    # ── ⑤ 执行模式 ────────────────────────────────────────
    def test_exec_mode_two_options(self):
        auto = self._create(exec_mode="create_issue")
        self.assertEqual(auto["exec_mode"], "create_issue")
        c = self.client("alice")
        r = c.put(f"/api/automations/{auto['id']}", json={"exec_mode": "run_only"})
        self.assertEqual(r.json()["automation"]["exec_mode"], "run_only")
        self.assertEqual(r.json()["automation"]["spec_version"], 2)
        bad = c.put(f"/api/automations/{auto['id']}", json={"exec_mode": "digest"})
        self.assertEqual(bad.status_code, 400, bad.text)
        self.assertIn("执行模式", bad.json()["detail"])
        bad = c.post("/api/automations", json={
            "name": "坏模式", "runbook": _runbook(), "owner_track": "agent",
            "owner_id_ref": "5", "exec_mode": "nope"})
        self.assertEqual(bad.status_code, 400, bad.text)

    def test_owner_track_is_exclusive(self):
        r = self.client("alice").post("/api/automations", json={
            "name": "混指", "runbook": _runbook(), "owner_track": "both",
            "owner_id_ref": "5", "exec_mode": "run_only"})
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("负责人轨", r.json()["detail"])
        r = self.client("alice").post("/api/automations", json={
            "name": "空负责人", "runbook": _runbook(), "owner_track": "squad",
            "owner_id_ref": "", "exec_mode": "run_only"})
        self.assertEqual(r.status_code, 400, r.text)

    # ── ⑥ 两级账本 ────────────────────────────────────────
    def test_two_ledgers_and_replay_view(self):
        auto_id = self._create()["id"]
        trigger = self._add_trigger("alice", auto_id).json()["trigger"]
        base = datetime.datetime.utcnow()
        for i, (status, err, kind) in enumerate((
                ("completed", "", ""),
                ("failed", "exit 1", "work"),
                ("completed", "", ""),
                ("skipped", "负责人在 run_only 下离线", "gate"),
        )):
            self.db.add(AutomationRun(automation_id=auto_id, trigger_id=trigger["id"],
                                      status=status, summary=f"run-{i}",
                                      error=err, error_kind=kind,
                                      spec_version=2,
                                      started_at=base - datetime.timedelta(hours=i)))
        self.db.commit()

        data = self.client("alice").get(f"/api/automations/{auto_id}/runs").json()
        rows = data["runs"]
        self.assertEqual(len(rows), 4)
        # 排序口径：最近**写入**在前（id desc）——与实现一致；按 summary 定位再断言字段
        self.assertEqual(rows[0]["summary"], "run-3", "运行史最近写入在前（id desc）")
        by_summary = {r["summary"]: r for r in rows}
        self.assertEqual(by_summary["run-1"]["error_kind"], "work")
        self.assertEqual(by_summary["run-3"]["error_kind"], "gate")
        self.assertEqual(rows[0]["trigger_label"], f"schedule#{trigger['id']}")
        self.assertIn("分母只算完结", data["note"])

        row = self.client("alice").get(f"/api/automations/{auto_id}").json()["automation"]
        stats = row["failure_7d"]
        self.assertEqual(stats["sample"], 3, "skipped 不计入分母")
        self.assertEqual(stats["failed"], 1)
        self.assertAlmostEqual(stats["rate"], 1 / 3, places=6)
        self.assertFalse(stats["breaker_gate"], "样本 <50 不进熔断判定")

        # 第二级账本：投递记录（含不可重放的一类）
        token = self._add_trigger("alice", auto_id, kind="webhook").json()["secret"]["token"]
        self._webhook(token, {"event": "push"})
        self._webhook_raw(token, b"x" * (65 * 1024))
        delivs = self.client("alice").get(
            f"/api/automations/{auto_id}/deliveries").json()["deliveries"]
        by_status = {d["status"]: d for d in delivs}
        self.assertTrue(by_status["accepted"]["replayable"])
        self.assertFalse(by_status["rejected"]["replayable"])
        self.assertIn("不可重放", by_status["rejected"]["replay_block_reason"])

    def test_empty_ledgers_are_empty_not_fake(self):
        auto_id = self._create()["id"]
        c = self.client("alice")
        self.assertEqual(c.get(f"/api/automations/{auto_id}/runs").json()["runs"], [])
        self.assertEqual(c.get(f"/api/automations/{auto_id}/deliveries").json()["deliveries"], [])

    # ── ⑦ 治理三态 + 审计 ─────────────────────────────────
    def test_governance_three_states_and_audit(self):
        auto_id = self._create()["id"]
        c = self.client("alice")

        r = c.post(f"/api/automations/{auto_id}/pause", json={"reason": "负责人离线太久"})
        self.assertEqual(r.status_code, 200, r.text)
        row = r.json()["automation"]
        self.assertEqual(row["status"], "paused")
        self.assertFalse(row["enabled"])
        self.assertEqual(row["paused_reason"], "负责人离线太久")
        self.assertEqual(row["permissions"]["run"]["reason"], "paused")

        r = c.post(f"/api/automations/{auto_id}/resume")
        self.assertEqual(r.json()["automation"]["status"], "enabled")
        self.assertTrue(r.json()["automation"]["enabled"])

        # 熔断：打开即停三入口，且恢复必须人点
        r = c.post(f"/api/automations/{auto_id}/breaker",
                   json={"open": True, "reason": "近 7d 47 败 / 51 完结"})
        row = r.json()["automation"]
        self.assertTrue(row["breaker_open"])
        self.assertFalse(row["enabled"])
        self.assertEqual(row["permissions"]["run"]["reason"], "breaker_open")
        self.assertIn("人点恢复", row["permissions"]["run"]["detail"])

        r = c.post(f"/api/automations/{auto_id}/breaker", json={"open": False})
        self.assertFalse(r.json()["automation"]["breaker_open"])
        self.assertFalse(r.json()["automation"]["enabled"], "复位熔断不自动恢复触发")

        # 归档 = 删除的软形态：停未来触发，历史账保留，没有「恢复触发」
        c.post(f"/api/automations/{auto_id}/resume")
        r = c.post(f"/api/automations/{auto_id}/archive", json={"reason": "目标队已归档"})
        row = r.json()["automation"]
        self.assertEqual(row["status"], "archived")
        self.assertFalse(row["permissions"]["run"]["allowed"])
        self.assertEqual(row["permissions"]["run"]["reason"], "archived")
        r = c.post(f"/api/automations/{auto_id}/resume")
        self.assertEqual(r.status_code, 400, r.text)
        self.assertIn("已归档", r.json()["detail"])

        actions = self._audit_actions()
        for action in ("automation.create", "automation.pause", "automation.resume",
                       "automation.breaker", "automation.archive"):
            self.assertIn(action, actions, f"审计缺少 {action}：{actions}")

    def test_archived_automation_skips_delivery(self):
        auto_id = self._create()["id"]
        token = self._add_trigger("alice", auto_id, kind="webhook").json()["secret"]["token"]
        self.client("alice").post(f"/api/automations/{auto_id}/archive", json={})
        r = self._webhook(token, {"event": "push"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()["semantics"], "skipped")
        self.assertIn("archived", r.json()["detail"])

    # ── ⑧ 两本账 + ⑨ 404 ─────────────────────────────────
    def test_permission_books_are_separate(self):
        auto_id = self._create()["id"]
        row = self.client("alice").get(f"/api/automations/{auto_id}").json()["automation"]
        self.assertTrue(row["permissions"]["manage"]["allowed"])
        self.assertTrue(row["permissions"]["run"]["allowed"])

        # 暂停后：仍能管，但不能真跑 —— 两本账分开
        self.client("alice").post(f"/api/automations/{auto_id}/pause", json={})
        row = self.client("alice").get(f"/api/automations/{auto_id}").json()["automation"]
        self.assertTrue(row["permissions"]["manage"]["allowed"])
        self.assertFalse(row["permissions"]["run"]["allowed"])

        # admin 能管他人资源；普通成员一律 404（不用 403 探测）
        row = self.client("root").get(f"/api/automations/{auto_id}").json()["automation"]
        self.assertTrue(row["permissions"]["manage"]["allowed"])
        c = self.client("bob")
        self.assertEqual(c.get(f"/api/automations/{auto_id}").status_code, 404)
        self.assertEqual(c.put(f"/api/automations/{auto_id}", json={"name": "x"}).status_code, 404)
        self.assertEqual(c.post(f"/api/automations/{auto_id}/pause", json={}).status_code, 404)
        self.assertEqual(c.post(f"/api/automations/{auto_id}/archive", json={}).status_code, 404)
        self.assertEqual(c.get(f"/api/automations/{auto_id}/runs").status_code, 404)
        self.assertEqual(c.get(f"/api/automations/{auto_id}/deliveries").status_code, 404)
        self.assertEqual(c.delete(
            f"/api/automations/{auto_id}/triggers/1").status_code, 404)

    def test_unknown_trigger_and_automation_are_404(self):
        auto_id = self._create()["id"]
        c = self.client("alice")
        self.assertEqual(c.get("/api/automations/99999").status_code, 404)
        self.assertEqual(c.delete(f"/api/automations/{auto_id}/triggers/99999").status_code, 404)


class TestAutomationServiceUnits(unittest.TestCase):
    """纯函数级用例：cron 解析与 next_runs 必须真算（不依赖 DB）。"""

    def test_cron_rejects_seconds_field(self):
        with self.assertRaises(svc.AutomationError) as ctx:
            svc.parse_cron("0 30 8 * * 1-5")
        self.assertIn("5 段", str(ctx.exception))

    def test_next_runs_weekday_window(self):
        now = datetime.datetime(2026, 10, 23, 9, 0, tzinfo=datetime.timezone.utc)  # 周五
        rows = svc.next_runs("30 8 * * 1-5", "Asia/Shanghai", 3, now=now)
        days = [datetime.datetime.fromisoformat(r).strftime("%m-%d") for r in rows]
        # 上海 17:00 = 周五已过 08:30 → 下周一、二、三
        self.assertEqual(days, ["10-26", "10-27", "10-28"])

    def test_next_runs_yearly(self):
        now = datetime.datetime(2026, 10, 23, 9, 0, tzinfo=datetime.timezone.utc)
        rows = svc.next_runs("0 0 1 1 *", "Asia/Shanghai", 3, now=now)
        years = [r[:4] for r in rows]
        self.assertEqual(years, ["2027", "2028", "2029"])

    def test_timezone_rejects_unknown(self):
        with self.assertRaises(svc.AutomationError):
            svc.resolve_timezone("Not/AZone")


if __name__ == "__main__":
    unittest.main()
