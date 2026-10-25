"""v25 批 B2 治理后端：全局总闸（R25-7）· 结构规则进门禁（R25-2）· webhook HMAC（R25-5）。

裁定记录：全局行「落表」、HMAC「实装 + token 双通道过渡」、R25-3 维持挂起（不测）。
"""
import hashlib
import hmac
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from models import Base  # noqa: E402
from models.automation import Automation, AutomationDelivery, AutomationTrigger  # noqa: E402
from models.rsi import RSI_CATEGORIES, SurfaceManifest  # noqa: E402
from services import automation_service as svc  # noqa: E402
from services import rsi_service as rsi  # noqa: E402
from tests._auth_harness import AuthHarness  # noqa: E402


class TestGlobalGate(unittest.TestCase):
    """R25-7：全局一行总闸——off 短路一切类目（判定收在转换层一处）。"""

    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                               poolclass=StaticPool)
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def tearDown(self):
        self.db.close()

    def test_global_off_shortcircuits_every_category(self):
        rsi.set_switch(self.db, "global", False, "root", reason="季度冻结自动改进")
        for cat in RSI_CATEGORIES:
            with self.assertRaises(rsi.GateError) as ctx:
                rsi.assert_category_running(self.db, cat)
            self.assertIn("全局总闸", str(ctx.exception))

    def test_global_on_category_off_still_independent(self):
        rsi.set_switch(self.db, "memory", False, "root", reason="单类目暂停")
        with self.assertRaises(rsi.GateError):
            rsi.assert_category_running(self.db, "memory")
        rsi.assert_category_running(self.db, "orchestration")  # 其余类目不受总闸影响

    def test_missing_global_row_treated_as_open(self):
        row = self.db.query(rsi.RsiSwitch).filter_by(category="global").first()
        if row:
            self.db.delete(row)
            self.db.commit()
        rsi.assert_category_running(self.db, "memory")  # 旧库形状=现状，不误伤

    def test_global_stop_requires_reason(self):
        with self.assertRaises(rsi.GateError):
            rsi.set_switch(self.db, "global", False, "root", reason="")

    def test_switches_lists_global_first_five_rows(self):
        lst = rsi.switches(self.db)
        self.assertEqual(len(lst), 5)
        self.assertEqual(lst[0]["category"], "global")
        self.assertTrue(lst[0]["enabled"])

    def test_create_proposal_blocked_by_global(self):
        rsi.create_surface(self.db, "docs", ["specs/docs"])
        rsi.set_switch(self.db, "global", False, "root", reason="冻结")
        with self.assertRaises(rsi.GateError) as ctx:
            rsi.create_proposal(self.db, title="t", dimension="domain",
                                surface_name="docs", target="specs/docs/a.md")
        self.assertIn("全局总闸", str(ctx.exception))


class TestStructureRulesGate(unittest.TestCase):
    """R25-2：surface 声明结构四列从「存而不判」进 assert_editable。"""

    def setUp(self):
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                               poolclass=StaticPool)
        Base.metadata.create_all(engine)
        self.db = sessionmaker(bind=engine)()

    def _surface(self, **over):
        kw = dict(path_pattern="", cap_bytes=None, structure_rules=None, exclusions=None)
        kw.update(over)
        return rsi.create_surface(self.db, "docs", ["specs/docs"], **kw)

    def test_string_wildcard_pattern(self):
        self._surface(path_pattern="specs/docs/*")
        rsi.assert_editable(self.db, "docs", "specs/docs/a.md")
        with self.assertRaises(rsi.GateError):
            rsi.assert_editable(self.db, "docs", "specs/other/a.md")

    def test_rule_objects_prefix_suffix_regex(self):
        self._surface(structure_rules=[{"type": "prefix", "value": "specs/docs/"},
                                       {"type": "suffix", "value": ".md"},
                                       {"type": "regex", "value": r"^specs/docs/[\w\-/]+\.md$"}])
        rsi.assert_editable(self.db, "docs", "specs/docs/plan.md")
        with self.assertRaises(rsi.GateError):      # suffix 不合
            rsi.assert_editable(self.db, "docs", "specs/docs/plan.txt")
        with self.assertRaises(rsi.GateError):      # regex 不合
            rsi.assert_editable(self.db, "docs", "specs/docs/中文 名.md")

    def test_exclusions_beat_whitelist(self):
        self._surface(exclusions=["specs/docs/secret*"])
        rsi.assert_editable(self.db, "docs", "specs/docs/ok.md")
        with self.assertRaises(rsi.GateError) as ctx:
            rsi.assert_editable(self.db, "docs", "specs/docs/secret.key")
        self.assertIn("显式排除", str(ctx.exception))

    def test_cap_bytes_only_when_content_given(self):
        self._surface(cap_bytes=8)
        rsi.assert_editable(self.db, "docs", "specs/docs/a.md")            # 提案期无正文：不伪造
        with self.assertRaises(rsi.GateError):
            rsi.assert_editable(self.db, "docs", "specs/docs/a.md",
                                content="0123456789abcdef")               # 16 字节 > 8

    def test_malformed_rules_rejected_on_write(self):
        with self.assertRaises(rsi.RsiError):
            self._surface(structure_rules=[{"type": "glob", "value": "*"}])
        with self.assertRaises(rsi.RsiError):
            self._surface(structure_rules=["ok", 42])
        with self.assertRaises(rsi.RsiError):
            self._surface(exclusions=[{"weird": 1}])

    def test_bad_rule_in_db_fails_closed_on_read(self):
        s = self._surface()
        s.structure_rules = json.dumps([{"type": "nonsense", "value": "x"}])
        self.db.commit()
        with self.assertRaises(rsi.GateError):
            rsi.assert_editable(self.db, "docs", "specs/docs/a.md")

    def test_create_proposal_consumes_rules(self):
        self._surface(structure_rules=["specs/docs/*.md"])
        rsi.create_proposal(self.db, title="t", dimension="domain",
                            surface_name="docs", target="specs/docs/ok.md")
        with self.assertRaises(rsi.GateError):
            rsi.create_proposal(self.db, title="t2", dimension="domain",
                               surface_name="docs", target="specs/docs/ok.txt")


class TestWebhookHmac(AuthHarness, unittest.TestCase):
    """R25-5：HMAC-SHA256 实装 + token 双通道过渡（投递账记因区分）。"""

    users = [("root", "admin"), ("alice", "member")]
    BODY = b'{"action": "opened"}'

    def setUp(self):
        super().setUp()
        c = self.client("alice")
        r = c.post("/api/automations", json={
            "name": "HMAC 用例", "runbook": {"goal": "g", "background": "b",
                                             "constraints": "c", "steps": "s"},
            "owner_track": "agent", "owner_id_ref": "5", "exec_mode": "run_only"})
        self.assertEqual(r.status_code, 200, r.text)
        self.auto_id = r.json()["automation"]["id"]

    def _add_webhook(self):
        c = self.client("alice")
        r = c.post(f"/api/automations/{self.auto_id}/triggers", json={"kind": "webhook"})
        self.assertEqual(r.status_code, 200, r.text)
        return c, r.json()["secret"]

    def _sign(self, secret: str, body: bytes) -> str:
        return "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    def _trigger_row(self, token: str):
        import services.automation_service as m
        return self.db.query(AutomationTrigger).filter(
            AutomationTrigger.secret == m._hash_token(token)).first()

    def test_create_returns_signing_secret_once(self):
        _c, secret = self._add_webhook()
        self.assertIn("signing_secret", secret)
        self.assertIn("X-Webhook-Signature", secret["signature_note"])
        row = self._trigger_row(secret["token"])
        self.assertTrue(row.signing_secret)
        self.assertNotEqual(row.signing_secret, secret["signing_secret"])  # 落库是密文

    def test_valid_signature_accepted_marked_hmac(self):
        c, secret = self._add_webhook()
        r = c.post(secret["webhook_url"], data=self.BODY, headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": self._sign(secret["signing_secret"], self.BODY)})
        self.assertEqual(r.status_code, 202, r.text)
        self.assertEqual(r.json()["auth"], "hmac")

    def test_invalid_signature_401_and_delivery_records_reason(self):
        c, secret = self._add_webhook()
        r = c.post(secret["webhook_url"], data=self.BODY, headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": self._sign("deadbeef", self.BODY)})
        self.assertEqual(r.status_code, 401, r.text)
        self.assertEqual(r.json()["reason"], "signature_invalid")
        row = self.db.query(AutomationDelivery).filter(
            AutomationDelivery.automation_id == self.auto_id).order_by(
            AutomationDelivery.id.desc()).first()
        self.assertIn("signature_invalid", row.error)

    def test_no_signature_header_falls_back_to_token_channel(self):
        """双通道过渡：不带签名头 = 旧 token 通道，如实记 legacy_token，不断道。"""
        c, secret = self._add_webhook()
        r = c.post(secret["webhook_url"], data=self.BODY,
                   headers={"Content-Type": "application/json"})
        self.assertEqual(r.status_code, 202, r.text)
        self.assertEqual(r.json()["auth"], "legacy_token")

    def test_signature_on_unsigned_trigger_rejected_unconfigured(self):
        """存量形状（无签名密钥）收到签名头：401 unconfigured——静默放行才是骗人。"""
        c, secret = self._add_webhook()
        row = self._trigger_row(secret["token"])
        row.signing_secret = ""
        self.db.commit()
        r = c.post(secret["webhook_url"], data=self.BODY, headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": self._sign(secret["signing_secret"], self.BODY)})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.json()["reason"], "signature_unconfigured")

    def test_rotate_invalidates_old_signing_secret(self):
        c, secret = self._add_webhook()
        trigger_id = c.get(f"/api/automations/{self.auto_id}").json()["automation"]["triggers"][0]["id"]
        r = c.post(f"/api/automations/{self.auto_id}/triggers/{trigger_id}/rotate")
        self.assertEqual(r.status_code, 200, r.text)
        new = r.json()["secret"]
        self.assertNotEqual(new["signing_secret"], secret["signing_secret"])
        # 旧签名对新 URL：token 已换 → 404；同 URL 用旧密钥签名 → invalid（下例钉签名面）
        r = c.post(secret["webhook_url"], data=self.BODY, headers={
            "Content-Type": "application/json",
            "X-Webhook-Signature": self._sign(secret["signing_secret"], self.BODY)})
        self.assertEqual(r.status_code, 404)  # 旧 URL 立即失效

    def test_api_trigger_gets_no_signing_secret(self):
        c = self.client("alice")
        r = c.post(f"/api/automations/{self.auto_id}/triggers", json={"kind": "api"})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertNotIn("signing_secret", r.json()["secret"])


if __name__ == "__main__":
    unittest.main()
