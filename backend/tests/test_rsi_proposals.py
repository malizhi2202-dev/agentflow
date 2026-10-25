"""v24-doc-refresh D4：提案表名统一 + 补齐设计 §3.3 的五个字段。"""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine, event, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import migrations
from models import Base
from models.rsi import Proposal
from services import rsi_service as rsi


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


class TestMigration027(_Base):
    def test_027_renames_table_and_adds_five_columns(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertIn("027_improvement_proposals_rename", applied)
        tables = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertIn("improvement_proposals", tables)
        self.assertNotIn("orchestration_proposals", tables)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(improvement_proposals)")}
        for c in ("proposal_diff", "probe_pack", "seed", "blind_rank", "fell_back"):
            self.assertIn(c, cols)
        conn.close()

    def test_027_is_idempotent(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        migrations.apply_migrations(conn, "sqlite")
        self.assertEqual(migrations.apply_migrations(conn, "sqlite"), [])
        conn.close()

    def test_027_keeps_rows_of_old_table(self):
        """老库场景：旧表有数据 → 重命名后数据还在。"""
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        migrations.apply_migrations(conn, "sqlite")
        # 造一条旧表数据（模拟老库），删掉迁移记录让 027 重跑
        conn.execute("DROP TABLE improvement_proposals")
        conn.execute(
            "CREATE TABLE orchestration_proposals (id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "title VARCHAR(255), dimension VARCHAR(16), status VARCHAR(24))"
        )
        conn.execute("INSERT INTO orchestration_proposals (title, dimension, status) "
                     "VALUES ('旧提案', 'domain', 'generated')")
        conn.commit()
        conn.execute("DELETE FROM schema_migrations WHERE version LIKE '027%'")
        conn.commit()
        migrations.apply_migrations(conn, "sqlite")
        rows = list(conn.execute("SELECT title FROM improvement_proposals"))
        self.assertEqual([r[0] for r in rows], ["旧提案"])
        conn.close()

    def test_orm_tablename_matches_design(self):
        self.assertEqual(Proposal.__tablename__, "improvement_proposals")
        names = set(inspect(self.engine).get_table_names())
        self.assertIn("improvement_proposals", names)


class TestProposalFields(_Base):
    def setUp(self):
        super().setUp()
        rsi.create_surface(self.db, "orchestration", ["prompts/", "config/"])

    def _proposal(self):
        return rsi.create_proposal(self.db, title="t", dimension="domain",
                                   surface_name="orchestration",
                                   target="prompts/system.md")

    def test_five_fields_are_queryable_columns(self):
        p = self._proposal()
        p.proposal_diff = "- old\n+ new"
        p.probe_pack = '{"cases": 3}'
        p.seed = 42
        p.blind_rank = 1
        p.fell_back = 1
        self.db.commit()
        row = self.db.query(Proposal).filter(Proposal.id == p.id).first()
        self.assertEqual(row.proposal_diff, "- old\n+ new")
        self.assertEqual(row.seed, 42)
        self.assertEqual(row.blind_rank, 1)
        self.assertEqual(row.fell_back, 1)

    def test_to_dict_exposes_five_fields(self):
        p = self._proposal()
        d = p.to_dict()
        for k in ("proposal_diff", "probe_pack", "seed", "blind_rank", "fell_back"):
            self.assertIn(k, d)
        self.assertIs(d["fell_back"], False)

    def test_dimension_vocabulary_is_readable_equivalent_to_design(self):
        """设计写 {INV, DOM}，代码用 {invariant, domain}——语义等价，字面不迁。"""
        p = self._proposal()
        self.assertEqual(p.dimension, "domain")
        from models.rsi import PROPOSAL_DIMENSIONS
        self.assertEqual(set(PROPOSAL_DIMENSIONS), {"invariant", "domain"})


if __name__ == "__main__":
    unittest.main()
