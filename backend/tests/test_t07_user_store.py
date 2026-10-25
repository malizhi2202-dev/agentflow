"""T-07（裁定⑦收尾）：`users.json` / `audit.jsonl` 表化。

口径（不静默回退，判定只看「表里有没有行」）：
- 表非空 → 表是权威源（`auth.load_users` 读表，`_save_users` 写表）；
- 表空 → 迁移期读 users.json（行为与旧版一致），导入脚本跑完后表恒非空；
- 审计：表可用时以表为查询权威，文件仍留一份；表化前的历史行从文件补进来（去重）。
"""
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

import sqlite3

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import database
import migrations
from models import Base
from models.user import AppUser, AuditLog
from passwords import hash_password
from services import audit_service, cluster_store, session_service, user_store

PW = "correct-horse-battery-staple"


def _user_row(uid, role="member", **over):
    row = {
        "id": uid, "name": uid, "role": role,
        "password_hash": hash_password(PW), "must_change_password": False,
        "project_ids": ["p1"], "custom_permissions": ["task:read"],
        "active": True, "created_at": "2026-10-24T00:00:00",
    }
    row.update(over)
    return row


class _Db(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self._patchers = [
            patch.object(auth, "_users_file", return_value=self.users_file),
            patch.object(auth, "_audit_file", return_value=self.audit_file),
            patch.object(database, "SessionLocal", self.Session),
            patch.object(user_store, "SessionLocal", self.Session),
            patch.object(cluster_store, "SessionLocal", self.Session),
            patch.object(session_service, "SessionLocal", self.Session),
        ]
        for p in self._patchers:
            p.start()

    def tearDown(self):
        for p in reversed(self._patchers):
            p.stop()
        self.engine.dispose()
        self.tmp.cleanup()

    def seed(self, users):
        s = self.Session()
        try:
            s.add_all([AppUser(**{k: v for k, v in u.items() if k != "updated_at"}) for u in users])
            s.commit()
        finally:
            s.close()


class TestMigration(unittest.TestCase):
    def test_018_creates_users_and_audit_tables(self):
        conn = sqlite3.connect(tempfile.mktemp(suffix=".db"))
        applied = migrations.apply_migrations(conn, "sqlite")
        self.assertIn("018_users_and_audit_tables", applied)
        cols = {r[1] for r in conn.execute("PRAGMA table_info(app_users)")}
        for c in ("id", "name", "role", "password_hash", "must_change_password",
                  "project_ids", "custom_permissions", "active"):
            self.assertIn(c, cols)
        acols = {r[1] for r in conn.execute("PRAGMA table_info(audit_log)")}
        for c in ("timestamp", "user_id", "action", "target", "result"):
            self.assertIn(c, acols)
        conn.close()


class TestUserStore(_Db):
    def test_empty_table_is_not_authoritative(self):
        self.assertFalse(user_store.available())
        self.assertIsNone(user_store.load_all())

    def test_import_dry_run_does_not_write(self):
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("alice")]}, f)
        out = user_store.import_from_json(self.users_file, apply=False)
        self.assertEqual(out["found"], 1)
        self.assertFalse(out["applied"])
        self.assertFalse(user_store.available())

    def test_import_apply_roundtrips_all_fields(self):
        row = _user_row("alice", "admin", must_change_password=True)
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [row]}, f)
        out = user_store.import_from_json(self.users_file, apply=True)
        self.assertTrue(out["applied"])
        self.assertTrue(user_store.available())
        got = user_store.get("alice")
        self.assertEqual(got["role"], "admin")
        self.assertTrue(got["must_change_password"])
        self.assertEqual(got["project_ids"], ["p1"])
        self.assertEqual(got["custom_permissions"], ["task:read"])
        # 哈希原样搬运，不重算。**格式二分**：`passwords.py` 的设计是 argon2id 优先、
        # 缺 argon2-cffi 时退 scrypt（合规兜底）。断言只锁「搬运的是合法哈希」，
        # 不锁「本机装没装 argon2」——那是环境，不是代码不变量。
        self.assertTrue(
            got["password_hash"].startswith("$argon2") or got["password_hash"].startswith("scrypt$"),
            f"口令哈希不是受支持的两种格式之一: {got['password_hash'][:16]!r}",
        )
        self.assertEqual(got["password_hash"], row["password_hash"])  # 原样搬运（不重算）

    def test_import_is_idempotent_and_prunes_removed_users(self):
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("alice"), _user_row("bob")]}, f)
        user_store.import_from_json(self.users_file, apply=True)
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("alice")]}, f)
        out = user_store.import_from_json(self.users_file, apply=True)
        self.assertEqual(out["deleted"], 1)
        self.assertIsNone(user_store.get("bob"))


class TestAuthUsesTable(_Db):
    def test_load_users_prefers_table(self):
        self.seed([_user_row("alice")])
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("file-only-user")]}, f)
        ids = [u["id"] for u in auth.load_users()["users"]]
        self.assertEqual(ids, ["alice"], "表非空时文件不得参与（否则双源分叉）")

    def test_load_users_falls_back_to_file_when_table_empty(self):
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("file-user")]}, f)
        ids = [u["id"] for u in auth.load_users()["users"]]
        self.assertEqual(ids, ["file-user"])

    def test_save_users_writes_table_when_enabled(self):
        self.seed([_user_row("alice")])
        auth._save_users({"users": [_user_row("alice"), _user_row("bob")]})
        self.assertIsNotNone(user_store.get("bob"))
        self.assertFalse(os.path.exists(self.users_file), "表启用后不应再写文件（避免双写分叉）")

    def test_get_user_reads_table(self):
        self.seed([_user_row("alice")])
        self.assertEqual(auth.get_user("alice")["id"], "alice")
        self.assertIsNone(auth.get_user("nobody"))


class TestAuditTable(_Db):
    def test_log_audit_writes_table_and_file(self):
        audit_service.log_audit("alice", "alice", "task.create", "t-1", "task", "created", "127.0.0.1")
        s = self.Session()
        try:
            self.assertEqual(s.query(AuditLog).filter(AuditLog.action == "task.create").count(), 1)
        finally:
            s.close()
        self.assertTrue(os.path.exists(self.audit_file))

    def test_read_audit_prefers_table_rows(self):
        audit_service.log_audit("alice", "alice", "task.create", "t-1", "task", "created", "127.0.0.1")
        rows = auth.read_audit()
        self.assertEqual([r["action"] for r in rows][:1], ["task.create"])

    def test_file_history_is_merged_without_duplicates(self):
        legacy = {"timestamp": "2026-01-01T00:00:00", "user_id": "old", "user_name": "old",
                  "action": "legacy.action", "target": "x", "target_type": "t",
                  "detail": "", "ip": "127.0.0.1", "result": "success"}
        with open(self.audit_file, "w", encoding="utf-8") as f:
            f.write(json.dumps(legacy) + "\n")
        audit_service.log_audit("alice", "alice", "task.create", "t-1", "task", "created", "127.0.0.1")
        actions = [r["action"] for r in auth.read_audit(limit=10)]
        self.assertIn("task.create", actions)
        self.assertIn("legacy.action", actions, "表化前的历史行不能丢")
        self.assertEqual(len(actions), len(set(actions)), "同一条不应重复出现")


class TestLoginFromTable(_Db):
    def test_login_uses_table_user_and_ignores_file(self):
        """真实 app 登录：表里的用户能登进来，文件里的同名/多余用户不参与。"""
        from fastapi.testclient import TestClient
        from main import app

        self.seed([_user_row("alice")])
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [_user_row("ghost")]}, f)
        c = TestClient(app, client=("127.0.0.1", 50000))
        ok = c.post("/api/auth/login", json={"user_id": "alice", "password": PW})
        self.assertEqual(ok.status_code, 200, ok.text)
        ghost = c.post("/api/auth/login", json={"user_id": "ghost", "password": PW})
        self.assertEqual(ghost.status_code, 401, ghost.text)
