"""真实 app + 登录的测试夹具（多组用例共用，避免每处复制 40 行 patch）。

用法：`class TestX(AuthHarness, unittest.TestCase)`，setUp 里先 `AuthHarness.setUp(self)`。
"""
import json
import os
import tempfile
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import config
import database
from models import Base
from passwords import hash_password
from services import cluster_store, session_service

PW = "correct-horse-battery-staple"


def user_row(uid, role="member"):
    return {"id": uid, "name": uid, "role": role,
            "password_hash": hash_password(PW), "must_change_password": False,
            "project_ids": [], "custom_permissions": [], "active": True}


class AuthHarness:
    users: list[tuple[str, str]] = [("root", "admin"), ("alice", "member")]

    def setUp(self):  # noqa: N802 — unittest 约定
        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._patchers = [
            patch.object(auth, "_users_file", return_value=self.users_file),
            patch.object(auth, "_audit_file", return_value=self.audit_file),
            patch.object(session_service, "SessionLocal", self.Session),
            patch.object(cluster_store, "SessionLocal", self.Session),
            patch.object(database, "SessionLocal", self.Session),
            patch.object(config, "DEPLOY_MODE", "localhost"),
            patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", False),
        ]
        for p in self._patchers:
            p.start()
        from database import get_db
        from main import app as _app

        def _override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        self._app = _app
        self._get_db = get_db
        _app.dependency_overrides[get_db] = _override_db
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": [user_row(*u) for u in self.users]}, f)
        self.db = self.Session()

    def tearDown(self):  # noqa: N802
        self.db.close()
        self._app.dependency_overrides.pop(self._get_db, None)
        for p in reversed(self._patchers):
            p.stop()
        self.engine.dispose()
        self.tmp.cleanup()

    def client(self, uid):
        from fastapi.testclient import TestClient
        from main import app as app_

        c = TestClient(app_, client=("127.0.0.1", 50000))
        r = c.post("/api/auth/login", json={"user_id": uid, "password": PW})
        assert r.status_code == 200, r.text
        return c
