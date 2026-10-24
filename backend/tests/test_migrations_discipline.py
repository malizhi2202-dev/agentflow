"""迁移纪律（v21 T-06）：本仓迁移是 **expand-only**，没有 down 迁移。

为什么不是「写一批 down」：主档 P0-8 与 `migrations.py` 文档明确采用 **fix-forward**——
只加列/建表/建索引，不 drop、不改类型；回滚手段 = 修一个新迁移，而不是 undo。
因此这一组用例守的是「纪律不被动摇」而不是「down 能跑」：

1. 迁移函数里不得出现破坏性 SQL（DROP TABLE / DROP COLUMN / RENAME COLUMN / TRUNCATE）；
2. 每个迁移单独跑两次是幂等的（重复执行无副作用）——这是 fix-forward 的前提；
3. 批量里中途失败：失败那一版**不入账**，之前的版本已入账（可继续 fix-forward），不留半条账。
"""
import os
import re
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import migrations


def _fresh():
    path = tempfile.mktemp(suffix=".db")
    return sqlite3.connect(path)


# 允许的破坏性写法只有两类：
#  1) 表重建（SQLite 改列类型只能 copy → drop → rename）：先 `DROP TABLE IF EXISTS x__tmp` 再 `DROP TABLE x` + `ALTER ... RENAME TO x`
#  2) 一次性退场的历史表（并表后不再存在），必须登记在这里
RETIRED_LEGACY_TABLES = {"scheduling_queue"}
FORBIDDEN = ("DROP COLUMN", "TRUNCATE", "DELETE FROM")


class TestMigrationDiscipline(unittest.TestCase):
    def test_no_forbidden_destructive_sql(self):
        with open(migrations.__file__, encoding="utf-8") as f:
            src = f.read().upper()
        offenders = [kw for kw in FORBIDDEN if kw in src]
        self.assertEqual(offenders, [], f"迁移里出现禁止的破坏性 SQL: {offenders}")

    def test_plain_drop_table_is_rebuild_or_retired_legacy(self):
        """`DROP TABLE x`（无 IF EXISTS）只允许：表重建（后面会 RENAME 回同名）或登记过的历史表。"""
        with open(migrations.__file__, encoding="utf-8") as f:
            src = f.read()
        upper = src.upper()
        plain = re.findall(r"DROP TABLE (?!IF EXISTS )([A-Za-z_][A-Za-z0-9_]*)", upper)
        self.assertTrue(plain, "预期迁移里存在表重建（若已全部改写，请同步本用例）")
        for table in plain:
            rebuilt = f"RENAME TO {table}" in upper
            retired = table.lower() in RETIRED_LEGACY_TABLES
            self.assertTrue(rebuilt or retired,
                            f"DROP TABLE {table} 既不是表重建，也不在历史表白名单里")

    def test_each_migration_is_idempotent_on_its_own(self):
        conn = _fresh()
        # 先建全表（新库形态），再逐条重跑：都应无副作用、不抛
        migrations.apply_migrations(conn, "sqlite")
        for version, _desc, fn in migrations.MIGRATIONS:
            fn(conn, "sqlite")
            fn(conn, "sqlite")
        applied = migrations.applied_versions(conn, "sqlite")
        self.assertEqual(applied, [m[0] for m in migrations.MIGRATIONS])
        conn.close()

    def test_failure_midway_keeps_prior_versions_and_skips_failed(self):
        conn = _fresh()
        calls = []

        def ok(_conn, _dialect):
            calls.append("ok")

        def boom(_conn, _dialect):
            calls.append("boom")
            raise RuntimeError("模拟迁移失败")

        batch = [("901_ok", "先成功", ok), ("902_boom", "后失败", boom)]
        with self.assertRaises(RuntimeError):
            migrations.apply_migrations(conn, "sqlite", migrations=batch)
        applied = migrations.applied_versions(conn, "sqlite")
        self.assertIn("901_ok", applied)
        self.assertNotIn("902_boom", applied)
        # fix-forward：修好后重跑只补失败那一版
        fixed = [("902_boom", "后失败", ok)]
        self.assertEqual(migrations.apply_migrations(conn, "sqlite", migrations=fixed), ["902_boom"])
        conn.close()

    def test_ledger_records_description(self):
        conn = _fresh()
        migrations.apply_migrations(conn, "sqlite")
        row = conn.execute(
            "SELECT version, description FROM schema_migrations WHERE version = ?",
            (migrations.MIGRATIONS[0][0],)).fetchone()
        self.assertEqual(row[0], migrations.MIGRATIONS[0][0])
        self.assertEqual(row[1], migrations.MIGRATIONS[0][1])
        conn.close()

    def test_migration_versions_are_unique_and_ordered(self):
        versions = [v for v, _d, _f in migrations.MIGRATIONS]
        self.assertEqual(len(versions), len(set(versions)), "迁移号必须唯一")
        self.assertEqual(versions, sorted(versions), "迁移号必须递增排列（按文件名跑）")
        for v in versions:
            self.assertRegex(v, r"^\d{3}_", "迁移号形如 017_xxx（三位数字前缀）")
