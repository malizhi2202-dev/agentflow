"""v24-doc-refresh D5/D6/D7：三张治理账表 + 投递两键分开记账 + api 型触发器 + 小队归档级联。"""
import itertools
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import migrations
from models import Base
from models.automation import (
    TRIGGER_KINDS,
    Automation,
    AutomationDelivery,
    RuleVersion,
)
from models.rsi import ExecLedger, ProbeEvidence, Proposal
from models.teams import Squad
from services import automation_service as svc
from services import team_service

ADMIN = {"id": "admin", "role": "admin", "name": "admin"}
_SEQ = itertools.count(1)


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        @event.listens_for(self.engine, "connect")
        def _fk_on(dbapi_connection, connection_record):
            dbapi_connection.cursor().execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _auto(self, name="a1", **kw):
        payload = {"name": name, "owner_track": "agent", "owner_id_ref": "42",
                   "exec_mode": "run_only", "runbook": {"goal": "g"}}
        payload.update(kw)
        return svc.create(self.db, ADMIN, payload)


class TestMigration028(_Base):
    def test_three_ledger_tables_created(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertIn("028_governance_ledgers", applied)
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn("probe_evidence", tables)
        self.assertIn("exec_ledgers", tables)
        self.assertIn("rule_versions", tables)
        conn.close()

    def test_probe_evidence_has_no_scoring_field(self):
        """设计硬口径：全表无打分级字段（代码不写打分器）。"""
        cols = {c.key for c in ProbeEvidence.__table__.columns}
        for banned in ("score", "grade", "rating", "pass_rate", "verdict"):
            self.assertNotIn(banned, cols)


class TestProbeEvidence(_Base):
    def test_fk_to_proposal_required(self):
        from sqlalchemy.exc import IntegrityError
        with self.assertRaises(IntegrityError):
            self.db.add(ProbeEvidence(proposal_id=999999, label="A"))
            self.db.commit()
        self.db.rollback()

    def test_evidence_vocabulary_two_values(self):
        row = ProbeEvidence(proposal_id=1, label="A", evidence="deliverable",
                            similarity_mean=0.87,
                            diff_ref="runs/1/harness.diff",
                            trajectory_ref="runs/1/rollout.md",
                            produced_ref="runs/1/produced.md",
                            source_ref="arXiv:2305.16444")
        d = row.to_dict()
        self.assertEqual(d["evidence"], "deliverable")
        self.assertAlmostEqual(d["similarity_mean"], 0.87)
        # 证据三件套独立可查（不再埋在一个 JSON 串里）
        for k in ("diff_ref", "trajectory_ref", "produced_ref"):
            self.assertTrue(d[k])


class TestExecLedgers(_Base):
    def test_identity_columns_predeclared(self):
        """恒等式断言「事前写死」：expected_* 先落账，actual_* 后对账。"""
        row = ExecLedger(scope="proposal:1:batch-7",
                         expected_rollouts=4, expected_sessions=3,
                         actual_rollouts=4, actual_sessions=3,
                         budget_error=0.0, dup_label="",
                         fp_mark="runmark:abc", cache_digest="sha256:def")
        d = row.to_dict()
        self.assertEqual((d["expected_rollouts"], d["actual_rollouts"]), (4, 4))
        self.assertEqual(d["fp_mark"], "runmark:abc")
        self.assertEqual(d["cache_digest"], "sha256:def")


class TestRuleVersions(_Base):
    def test_create_records_v1(self):
        auto = self._auto()
        rows = svc.list_rule_versions(self.db, auto.id)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["version"], 1)
        self.assertEqual(rows[0]["reason"], "创建")

    def test_update_records_new_version(self):
        auto = self._auto()
        svc.update_sections(self.db, auto, {"runbook": {"goal": "g2"}})
        rows = svc.list_rule_versions(self.db, auto.id)
        self.assertEqual([r["version"] for r in rows], [1, 2])

    def test_rename_does_not_bump_version(self):
        """改名不追加版本（改名不转移责任）——版本账同样不追加。"""
        auto = self._auto()
        svc.update_sections(self.db, auto, {"name": "renamed"})
        rows = svc.list_rule_versions(self.db, auto.id)
        self.assertEqual(len(rows), 1)

    def test_versions_are_immutable_unique(self):
        auto = self._auto()
        with self.assertRaises(Exception):
            self.db.add(RuleVersion(automation_id=auto.id, version=1, reason="dup"))
            self.db.commit()
        self.db.rollback()


class TestTwoKeyDedup(_Base):
    """D6：两键分开记账——一方来键不许吃掉另一方的投递。"""

    def _webhook(self):
        auto = self._auto(name="wh")
        trigger, token = svc.add_trigger(self.db, auto, {"kind": "webhook"})
        return auto, trigger, token

    def test_both_keys_recorded_separately(self):
        auto, _trigger, token = self._webhook()
        headers = {"idempotency-key": "IK-1", "x-github-delivery": "GD-1"}
        code, body = svc.ingest_webhook(self.db, token, headers, b'{"a":1}')
        self.assertIn(code, (200, 202))
        row = self.db.query(AutomationDelivery).filter(
            AutomationDelivery.id == body["delivery_id"]).first()
        self.assertEqual(row.idem_key, "IK-1")
        self.assertEqual(row.delivery_key, "GD-1")

    def test_same_delivery_key_different_idem_key_not_swallowed(self):
        """GitHub 重投（同 GD）但不同 Idempotency-Key：按 Idempotency-Key 判，不判 duplicate。"""
        auto, _trigger, token = self._webhook()
        c1, b1 = svc.ingest_webhook(self.db, token,
                                    {"idempotency-key": "IK-1", "x-github-delivery": "GD-1"}, b"{}")
        c2, b2 = svc.ingest_webhook(self.db, token,
                                    {"idempotency-key": "IK-2", "x-github-delivery": "GD-1"}, b"{}")
        self.assertNotEqual(b2.get("semantics"), "duplicate")
        self.assertNotEqual(b1["delivery_id"], b2["delivery_id"])

    def test_same_idem_key_is_duplicate(self):
        auto, _trigger, token = self._webhook()
        svc.ingest_webhook(self.db, token, {"idempotency-key": "IK-1"}, b'{"x":1}')
        _c, b2 = svc.ingest_webhook(self.db, token, {"idempotency-key": "IK-1"}, b'{"x":1}')
        self.assertEqual(b2["semantics"], "duplicate")


class TestApiTrigger(_Base):
    """D6：api 型触发器（三型 kind + 自扩展通道入口）。"""

    def test_kind_api_accepted(self):
        self.assertEqual(set(TRIGGER_KINDS), {"schedule", "webhook", "api"})
        auto = self._auto(name="api1")
        trigger, token = svc.add_trigger(self.db, auto, {"kind": "api"})
        self.assertEqual(trigger.kind, "api")
        self.assertTrue(token)

    def test_invoke_accepted_then_duplicate(self):
        auto, = (self._auto(name="api2"),)
        _trigger, token = svc.add_trigger(self.db, auto, {"kind": "api"})
        headers = {"idempotency-key": "IK-A"}
        code, body = svc.invoke_api_trigger(self.db, token, headers, b'{"k":1}')
        self.assertEqual(code, 202)
        self.assertEqual(body["semantics"], "accepted")
        code2, body2 = svc.invoke_api_trigger(self.db, token, headers, b'{"k":1}')
        self.assertEqual(code2, 200)
        self.assertEqual(body2["semantics"], "duplicate")

    def test_invoke_wrong_kind_rejected(self):
        auto = self._auto(name="api3")
        trigger, token = svc.add_trigger(self.db, auto, {"kind": "webhook"})
        code, body = svc.invoke_api_trigger(self.db, token, {}, b"{}")
        self.assertEqual(code, 404)  # webhook 的 token 查不到 api 型触发器

    def test_invoke_oversize_payload_413(self):
        auto = self._auto(name="api4")
        trigger, token = svc.add_trigger(self.db, auto, {"kind": "api", "payload_limit": 8})
        code, body = svc.invoke_api_trigger(self.db, token, {}, b"0123456789abcdef")
        self.assertEqual(code, 413)

    def test_invoke_disabled_when_squad_archived(self):
        """D6×D7：负责人是 squad → 归档后 api 投递记 skipped（disabled 语义贯通）。"""
        squad = self._squad()
        auto = self._auto(name="api5", owner_track="squad", owner_id_ref=str(squad.id))
        _trigger, token = svc.add_trigger(self.db, auto, {"kind": "api"})
        team_service.archive_squad(self.db, squad)
        code, body = svc.invoke_api_trigger(self.db, token, {}, b'{"x":1}')
        self.assertEqual(code, 200)
        self.assertEqual(body["semantics"], "skipped")
        self.assertIn("disabled", body["detail"])

    def _squad(self):
        from models.agent import Agent
        n = next(_SEQ)
        leader = Agent(owner_id="admin", name=f"leader{n}", runtime="hermes",
                       model_provider="cli", model_name="m", api_key_encrypted="")
        self.db.add(leader)
        self.db.commit()
        squad = Squad(slug=f"sq{n}", name=f"sq{n}", leader_agent_id=leader.id, created_by="admin")
        self.db.add(squad)
        self.db.commit()
        self.db.refresh(squad)
        return squad


class TestSquadArchiveCascade(_Base):
    """D7：小队归档 → 指向它的自动化转 disabled（不静默删行）。"""

    def _squad(self):
        from models.agent import Agent
        n = next(_SEQ)
        leader = Agent(owner_id="admin", name=f"l{n}", runtime="hermes",
                       model_provider="cli", model_name="m", api_key_encrypted="")
        self.db.add(leader)
        self.db.commit()
        squad = Squad(slug=f"sq{n}", name=f"sq{n}", leader_agent_id=leader.id, created_by="admin")
        self.db.add(squad)
        self.db.commit()
        self.db.refresh(squad)
        return squad

    def test_archived_squad_disables_referring_automations(self):
        squad = self._squad()
        auto = self._auto(name="casc", owner_track="squad", owner_id_ref=str(squad.id))
        team_service.archive_squad(self.db, squad)
        self.db.refresh(auto)
        self.assertEqual(auto.status, "disabled")
        self.assertFalse(auto.enabled)
        self.assertIn("小队已归档", auto.paused_reason)

    def test_archived_automations_not_touched(self):
        """已归档的规则不动——它本来就没有未来触发。"""
        squad = self._squad()
        auto = self._auto(name="casc2", owner_track="squad", owner_id_ref=str(squad.id))
        svc.archive(self.db, auto, reason="先归档")
        team_service.archive_squad(self.db, squad)
        self.db.refresh(auto)
        self.assertEqual(auto.status, "archived")

    def test_other_squads_untouched(self):
        squad = self._squad()
        other = self._squad()
        auto = self._auto(name="casc3", owner_track="squad", owner_id_ref=str(other.id))
        team_service.archive_squad(self.db, squad)
        self.db.refresh(auto)
        self.assertEqual(auto.status, "enabled")

    def test_disabled_blocks_run_gate_and_resume_is_manual(self):
        squad = self._squad()
        auto = self._auto(name="casc4", owner_track="squad", owner_id_ref=str(squad.id))
        team_service.archive_squad(self.db, squad)
        allowed, reason, _ = svc.run_gate(auto)
        self.assertFalse(allowed)
        self.assertEqual(reason, "disabled")
        # 人重新启用走 resume（不自动恢复：沉默≠同意）
        svc.resume(self.db, auto)
        self.db.refresh(auto)
        self.assertEqual(auto.status, "enabled")


class TestProbeEvidenceWritePath(_Base):
    """D5 写路径：record_probe 带 evidences 落证据包行；不传不造数。"""

    def _proposal(self):
        from services import rsi_service as rsi
        rsi.create_surface(self.db, "orchestration", ["prompts/"])
        return rsi.create_proposal(self.db, title="t", dimension="invariant",
                                   surface_name="orchestration", target="prompts/a.md")

    def test_evidences_persist_as_rows(self):
        from services import rsi_service as rsi
        p = self._proposal()
        rsi.record_probe(self.db, p, {"steps": 1, "tokens": 5}, evidences=[
            {"label": "A", "diff_ref": "runs/1/a.diff", "evidence": "deliverable",
             "similarity_mean": 0.91},
            {"label": "B", "diff_ref": "runs/1/b.diff", "evidence": "trajectory"},
        ])
        rows = self.db.query(ProbeEvidence).filter(
            ProbeEvidence.proposal_id == p.id).order_by(ProbeEvidence.label).all()
        self.assertEqual([r.label for r in rows], ["A", "B"])
        self.assertAlmostEqual(rows[0].similarity_mean, 0.91)
        self.assertIsNone(rows[1].similarity_mean)

    def test_no_evidences_writes_nothing(self):
        from services import rsi_service as rsi
        p = self._proposal()
        rsi.record_probe(self.db, p, {"steps": 1, "tokens": 5})
        self.assertEqual(self.db.query(ProbeEvidence).count(), 0)

    def test_bad_evidence_kind_rejected(self):
        from services import rsi_service as rsi
        p = self._proposal()
        with self.assertRaises(rsi.RsiError):
            rsi.record_probe(self.db, p, {"steps": 1}, evidences=[{"evidence": "score"}])


if __name__ == "__main__":
    unittest.main()
