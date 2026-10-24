"""P0-8 迁移账本的单测（纯标准库，无需第三方包）。

跑法：cd backend && python3 -m unittest tests.test_migrations -v
"""
import os
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import migrations  # noqa: E402


def _fresh_db():
    path = tempfile.mktemp(suffix=".db")
    return path, sqlite3.connect(path)


def _legacy_db():
    """模拟老库：agent_memories 无 domain_id、knowledge_sources 无 status/file_path、无标签与定时任务表。"""
    path, conn = _fresh_db()
    cur = conn.cursor()
    cur.execute("CREATE TABLE agent_memories (id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id INTEGER NOT NULL, content TEXT)")
    cur.execute("CREATE TABLE knowledge_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(128) NOT NULL)")
    conn.commit()
    return path, conn


class TestMigrations(unittest.TestCase):
    def test_fresh_db_applies_all(self):
        _path, conn = _fresh_db()
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertEqual(len(applied), len(migrations.MIGRATIONS))
        # 账本落账
        self.assertEqual(migrations.applied_versions(conn, "sqlite"), [m[0] for m in migrations.MIGRATIONS])
        # 表与索引真的建了
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for t in ("schema_migrations", "knowledge_tags", "knowledge_source_tags", "scheduled_tasks"):
            self.assertIn(t, tables)
        # 列级迁移应用在"建表后"路径上：表不存在时跳过、不报错
        conn.close()

    def test_idempotent_second_run(self):
        _path, conn = _fresh_db()
        first = migrations.apply_migrations(conn, "sqlite")
        self.assertTrue(first)
        second = migrations.apply_migrations(conn, "sqlite")
        self.assertEqual(second, [], "重跑不应再应用任何迁移")
        rows = list(conn.execute("SELECT COUNT(*) FROM schema_migrations"))[0][0]
        self.assertEqual(rows, len(migrations.MIGRATIONS))
        conn.close()

    def test_legacy_db_expands(self):
        _path, conn = _legacy_db()
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertIn("001_agent_memories_domain_id", applied)
        self.assertIn("002_knowledge_sources_status_file_path", applied)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(agent_memories)")]
        self.assertIn("domain_id", cols)
        cols = [r[1] for r in conn.execute("PRAGMA table_info(knowledge_sources)")]
        self.assertIn("status", cols)
        self.assertIn("file_path", cols)
        conn.close()

    def test_pending_then_empty(self):
        _path, conn = _fresh_db()
        self.assertEqual(len(migrations.pending_versions(conn, "sqlite")), len(migrations.MIGRATIONS))
        migrations.apply_migrations(conn, "sqlite")
        self.assertEqual(migrations.pending_versions(conn, "sqlite"), [])
        conn.close()

    def test_failure_is_not_recorded(self):
        """迁移抛错 → 不写账本（旧实现是静默跳过，这是本次修的病）。"""
        _path, conn = _fresh_db()

        def boom(_conn, _dialect):
            raise RuntimeError("boom")

        bad = [("900_boom", "故意失败", boom)]
        with self.assertRaises(RuntimeError):
            migrations.apply_migrations(conn, "sqlite", migrations=bad)
        conn.rollback()
        self.assertNotIn("900_boom", migrations.applied_versions(conn, "sqlite"))
        conn.close()

    def test_works_through_proxy_connection(self):
        """集成形态：SQLAlchemy engine.raw_connection() 返回的是代理对象，
        不能靠 conn 的类名猜方言（已改为显式传 dialect，本用例锁死这一点）。"""
        class Proxy:
            def __init__(self, inner):
                self._inner = inner
            def cursor(self):
                return self._inner.cursor()
            def commit(self):
                self._inner.commit()
            def rollback(self):
                self._inner.rollback()
            def close(self):
                self._inner.close()

        _path, raw = _fresh_db()
        proxy = Proxy(raw)
        applied = migrations.apply_migrations(proxy, "sqlite")
        self.assertEqual(len(applied), len(migrations.MIGRATIONS))
        self.assertEqual(migrations.pending_versions(proxy, "sqlite"), [])
        proxy.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
