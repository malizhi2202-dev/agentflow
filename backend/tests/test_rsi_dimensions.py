"""v24-doc-refresh D1/D2/D3：记忆表的两个正交维度 + 来源链真外键 + 可改面四个结构字段。

D1：设计 §3.3 要求「层级 + **内容域**（与层级正交）+ **生命周期**」三件事，代码只落了层级，
    且 `status` 列被晋升状态占用。裁定：两个维度都要有，**列名以不破坏既有 API/UI 契约为约束**
    —— `status` 保持晋升状态（`GET /api/rsi/memories?status=` 是已发布契约），
    新增 `domain`（内容域）与 `life_status`（生命周期）。
D2：补 `content` / `confidence` / `quarantine_until`（静置期）/ 来源链**真外键**两列。
D3：`surface_manifests` 补设计要求的四个结构字段。
"""
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
from models.rsi import (
    MEMORY_DOMAINS,
    MEMORY_LIFE_STATUSES,
    Memory,
    SurfaceManifest,
)
from services import rsi_service as rsi

EV = [{"ref": "TEST.md", "note": "复现"}]


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        # SQLite 默认不执行外键；生产引擎（backend/database.py）已开 PRAGMA foreign_keys=ON，
        # 测试引擎必须同口径，否则「真外键」这条断言会假绿。
        @event.listens_for(self.engine, "connect")
        def _fk_on(dbapi_connection, connection_record):
            dbapi_connection.cursor().execute("PRAGMA foreign_keys=ON")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def _promote(self, **kw):
        payload = dict(layer="L1", cue="遇到 X", lesson="先看日志", evidence=EV,
                       confounded=False)
        payload.update(kw)
        return rsi.propose_memory(self.db, **payload)


class TestMigration026(_Base):
    """迁移 026：加列必须落到真实 SQLite 库（幂等 + 可重复）。"""

    def test_026_adds_memory_dimensions_columns(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertIn("026_memory_dimensions_and_manifests", applied)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(memories)")}
        for c in ("domain", "life_status", "content", "confidence",
                  "quarantine_until", "source_run_id", "source_conversation_id"):
            self.assertIn(c, cols)
        # 幂等：重跑不再应用
        self.assertEqual(migrations.apply_migrations(conn, "sqlite"), [])
        conn.close()

    def test_026_adds_manifest_structure_columns(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        migrations.apply_migrations(conn, "sqlite")
        cols = {r[1] for r in conn.execute("PRAGMA table_info(surface_manifests)")}
        for c in ("path_pattern", "cap_bytes", "structure_rules", "exclusions"):
            self.assertIn(c, cols)
        conn.close()

    def test_026_is_idempotent_on_existing_db(self):
        """老库已有 memories 表时，026 只加列不改旧列。"""
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        conn.execute("CREATE TABLE memories (id INTEGER PRIMARY KEY, status VARCHAR(16))")
        conn.commit()
        migrations.apply_migrations(conn, "sqlite")
        cols = {r[1] for r in conn.execute("PRAGMA table_info(memories)")}
        self.assertIn("domain", cols)
        self.assertIn("status", cols)
        conn.close()


class TestMemoryDimensions(_Base):
    """D1：内容域与生命周期两个正交维度。"""

    def test_domain_defaults_to_semantic_and_is_validated(self):
        out = self._promote()
        self.assertEqual(out["memory"]["domain"], "semantic")
        out = self._promote(domain="procedural")
        self.assertEqual(out["memory"]["domain"], "procedural")
        with self.assertRaises(rsi.RsiError):
            self._promote(domain="not-a-domain")

    def test_domain_is_orthogonal_to_layer(self):
        """同一层级可挂不同内容域（正交的含义）。"""
        self._promote(layer="L1", domain="semantic")
        self._promote(layer="L1", domain="preference")
        rows = self.db.query(Memory).all()
        self.assertEqual({r.layer for r in rows}, {"L1"})
        self.assertEqual({r.domain for r in rows}, {"semantic", "preference"})

    def test_life_status_defaults_active_and_accepts_three_values(self):
        out = self._promote()
        self.assertEqual(out["memory"]["life_status"], "active")
        self.assertEqual(set(MEMORY_LIFE_STATUSES), {"active", "revoked", "stale-flagged"})
        row = self.db.query(Memory).first()
        row.life_status = "stale-flagged"
        self.db.commit()
        # 生命周期与晋升状态**互不影响**（两个维度）
        self.assertEqual(row.status, "promoted")
        self.assertEqual(row.life_status, "stale-flagged")

    def test_domain_and_life_status_are_filterable(self):
        self._promote(domain="semantic")
        self._promote(domain="rule")
        only = rsi.list_memories(self.db, domain="rule")
        self.assertEqual(len(only), 1)
        self.assertEqual(only[0]["domain"], "rule")
        self.assertEqual(len(rsi.list_memories(self.db, life_status="active")), 2)
        self.assertEqual(len(rsi.list_memories(self.db, life_status="revoked")), 0)

    def test_domain_vocabulary_is_five_values(self):
        self.assertEqual(
            set(MEMORY_DOMAINS),
            {"semantic", "procedural", "preference", "instruction", "rule"},
        )


class TestMemoryFields(_Base):
    """D2：正文 / 置信度 / 静置期 / 来源链真外键。"""

    def test_content_defaults_to_cue(self):
        out = self._promote(cue="一句话经验")
        self.assertEqual(out["memory"]["content"], "一句话经验")

    def test_explicit_content_wins(self):
        out = self._promote(cue="cue", content="完整正文")
        self.assertEqual(out["memory"]["content"], "完整正文")

    def test_confidence_stored_and_range_checked(self):
        out = self._promote(confidence=0.8)
        self.assertAlmostEqual(out["memory"]["confidence"], 0.8)
        with self.assertRaises(rsi.RsiError):
            self._promote(confidence=1.5)
        with self.assertRaises(rsi.RsiError):
            self._promote(confidence=-0.1)

    def test_quarantine_sets_quarantine_until(self):
        self._promote(source_ref="conversation:7")
        n = rsi.quarantine_source(self.db, "conversation:7")
        self.assertEqual(n, 1)
        row = self.db.query(Memory).filter(Memory.source_ref == "conversation:7").first()
        self.assertEqual(row.status, "quarantined")
        self.assertIsNotNone(row.quarantine_until)  # 静置期落时间列，不再只是布尔态

    def test_source_chain_real_fk_columns_exist(self):
        """来源链真外键：两列 + 外键约束（表级）。"""
        out = self._promote(source_run_id=None, source_conversation_id=None)
        self.assertIsNone(out["memory"]["source_run_id"])
        self.assertIsNone(out["memory"]["source_conversation_id"])
        # 约束存在性：写入一个不存在的来源 id 必须被 DB 层拒绝
        from sqlalchemy.exc import IntegrityError
        with self.assertRaises(IntegrityError):
            self._promote(source_conversation_id=999999)
            self.db.commit()
        self.db.rollback()

    def test_source_conversation_id_roundtrips(self):
        from models.agent import Agent
        from models.conversation import Conversation
        agent = Agent(owner_id="admin", name="a", runtime="hermes",
                      model_provider="cli", model_name="m", api_key_encrypted="")
        self.db.add(agent)
        self.db.commit()
        conv = Conversation(agent_id=agent.id, owner_id="admin", title="t")
        self.db.add(conv)
        self.db.commit()
        out = self._promote(source_conversation_id=conv.id)
        self.assertEqual(out["memory"]["source_conversation_id"], conv.id)


class TestSurfaceStructure(_Base):
    """D3：可改面声明对象的四个结构字段。"""

    def test_create_surface_stores_four_structure_fields(self):
        row = rsi.create_surface(
            self.db, "orchestration", ["prompts/"], owner_id="admin",
            path_pattern="prompts/**/*.md", cap_bytes=65536,
            structure_rules=["frontmatter 必须有 name"],
            exclusions=["scripts/"],
        )
        d = row.to_dict()
        self.assertEqual(d["path_pattern"], "prompts/**/*.md")
        self.assertEqual(d["cap_bytes"], 65536)
        self.assertEqual(d["structure_rules"], ["frontmatter 必须有 name"])
        self.assertEqual(d["exclusions"], ["scripts/"])

    def test_update_surface_changes_structure_fields(self):
        row = rsi.create_surface(self.db, "s1", ["a/"])
        rsi.update_surface(self.db, row.id, None, "admin",
                           path_pattern="b/**", cap_bytes=10,
                           structure_rules=["r1"], exclusions=["e1"])
        got = self.db.query(SurfaceManifest).filter(SurfaceManifest.id == row.id).first()
        self.assertEqual(got.path_pattern, "b/**")
        self.assertEqual(got.cap_bytes, 10)
        self.assertEqual(got.structure_rules, '["r1"]')
        self.assertEqual(got.exclusions, '["e1"]')

    def test_structure_rules_must_be_list(self):
        row = rsi.create_surface(self.db, "s2", ["a/"])
        with self.assertRaises(rsi.RsiError):
            rsi.update_surface(self.db, row.id, None, "admin", structure_rules="nope")
        with self.assertRaises(rsi.RsiError):
            rsi.update_surface(self.db, row.id, None, "admin", exclusions={"a": 1})


if __name__ == "__main__":
    unittest.main()
