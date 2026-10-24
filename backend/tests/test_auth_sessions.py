"""P0-1 身份链：服务端会话 / PAT / must_change / 来源闸门（中间件级 + 服务级）。"""
import datetime
import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import auth
import config
from models import Base
from models.session import PatToken, SessionToken
from passwords import hash_password
from services import cluster_store, session_service

PW = "correct-horse-battery-staple"


def _new_engine():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    return engine


class _AuthTestBase(unittest.TestCase):
    """每个用例独立 users.json / audit.jsonl / 内存 DB / 配置基线。"""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.users_file = os.path.join(self.tmp.name, "users.json")
        self.audit_file = os.path.join(self.tmp.name, "audit.jsonl")
        self.engine = _new_engine()
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self._patchers = [
            patch.object(auth, "_users_file", return_value=self.users_file),
            patch.object(auth, "_audit_file", return_value=self.audit_file),
            patch.object(session_service, "SessionLocal", self.Session),
            patch.object(cluster_store, "SessionLocal", self.Session),
            patch.object(config, "DEPLOY_MODE", "localhost"),
            patch.object(config, "TRUSTED_PROXY_IPS", []),
            patch.object(config, "ALLOW_CIDRS", []),
            patch.object(config, "TLS_TERMINATED", False),
            patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", False),
            patch.object(config, "AUTH_DEBUG_HEADER_ADMIT_USERS", []),
        ]
        for p in self._patchers:
            p.start()
        cluster_store.truncate_rate_limits()
        self._write_users([self._user("admin")])

    def tearDown(self):
        # 先清库再撤 patch：清场必须打在本用例的内存库上
        cluster_store.truncate_rate_limits()
        for p in reversed(self._patchers):
            p.stop()
        self.engine.dispose()
        self.tmp.cleanup()

    # ── 夹具 ──
    def _user(self, uid, role="admin", must_change=False, password=PW, active=True):
        return {
            "id": uid,
            "name": uid,
            "role": role,
            "password_hash": hash_password(password),
            "must_change_password": must_change,
            "project_ids": [],
            "custom_permissions": [p for p in ("project:read", "project:write")] if role != "admin" else [],
            "created_at": datetime.datetime.now().isoformat(),
            "active": active,
        }

    def _write_users(self, users):
        with open(self.users_file, "w", encoding="utf-8") as f:
            json.dump({"users": users}, f)

    def _read_users(self):
        with open(self.users_file, encoding="utf-8") as f:
            return json.load(f)

    def _audit_lines(self):
        if not os.path.exists(self.audit_file):
            return []
        with open(self.audit_file, encoding="utf-8") as f:
            return [json.loads(line) for line in f if line.strip()]

    def _client(self, host="127.0.0.1"):
        from main import app

        return TestClient(app, client=(host, 50000))

    def _login(self, client, uid="admin", pw=PW):
        return client.post("/api/auth/login", json={"user_id": uid, "password": pw})

    def _cookie(self, client):
        return client.cookies.get("af_session") or client.cookies.get("__Host-session")

    def _set_expiry(self, expires_at=None, absolute=None):
        db = self.Session()
        try:
            row = db.query(SessionToken).order_by(SessionToken.id.desc()).first()
            if expires_at is not None:
                row.expires_at = expires_at
            if absolute is not None:
                row.absolute_expires_at = absolute
            db.commit()
        finally:
            db.close()


class TestIdentityChain(_AuthTestBase):
    def test_missing_credentials_is_401(self):
        r = self._client().get("/api/admin/workflow")
        self.assertEqual(401, r.status_code)

    def test_x_user_id_no_longer_authenticates(self):
        r = self._client().get("/api/admin/workflow", headers={"X-User-Id": "admin"})
        self.assertEqual(401, r.status_code)

    def test_login_sets_httponly_cookie_and_me_has_no_hash(self):
        c = self._client()
        r = self._login(c)
        self.assertEqual(200, r.status_code, r.text)
        self.assertFalse(r.json()["must_change_password"])
        self.assertTrue(self._cookie(c))

        me = c.get("/api/auth/me")
        self.assertEqual(200, me.status_code)
        self.assertNotIn("password_hash", me.json()["user"])
        # 认证后普通接口可用
        self.assertEqual(200, c.get("/api/admin/workflow").status_code)

    def test_login_error_is_generic(self):
        c = self._client()
        unknown = c.post("/api/auth/login", json={"user_id": "ghost", "password": "x"})
        wrong = c.post("/api/auth/login", json={"user_id": "admin", "password": "x"})
        self.assertEqual(401, unknown.status_code)
        self.assertEqual(401, wrong.status_code)
        self.assertEqual(unknown.json()["detail"], wrong.json()["detail"])

    def test_invalid_cookie_is_401(self):
        c = self._client()
        c.cookies.set("af_session", "forged-token")
        self.assertEqual(401, c.get("/api/auth/me").status_code)

    def test_logout_revokes_session(self):
        c = self._client()
        self._login(c)
        old = self._cookie(c)
        self.assertEqual(200, c.post("/api/auth/logout").status_code)
        c2 = self._client()
        c2.cookies.set("af_session", old)
        self.assertEqual(401, c2.get("/api/auth/me").status_code)

    def test_idle_and_absolute_expiry(self):
        c = self._client()
        self._login(c)
        self._set_expiry(expires_at=datetime.datetime.utcnow() - datetime.timedelta(seconds=1))
        self.assertEqual(401, c.get("/api/auth/me").status_code)

        c = self._client()
        self._login(c)
        self._set_expiry(
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=30),
            absolute=datetime.datetime.utcnow() - datetime.timedelta(seconds=1),
        )
        self.assertEqual(401, c.get("/api/auth/me").status_code)

    def test_login_throttle(self):
        c = self._client()
        for _ in range(config.LOGIN_MAX_FAILURES):
            self.assertEqual(401, c.post(
                "/api/auth/login", json={"user_id": "admin", "password": "wrong"}).status_code)
        r = c.post("/api/auth/login", json={"user_id": "admin", "password": "wrong"})
        self.assertEqual(429, r.status_code)

    def test_active_false_cannot_login(self):
        self._write_users([self._user("admin"), self._user("bob", role="user", active=False)])
        c = self._client()
        r = self._login(c, "bob", PW)
        self.assertEqual(403, r.status_code)
        self.assertFalse(self._cookie(c))


class TestMustChangePassword(_AuthTestBase):
    def test_must_change_blocks_api_but_allows_auth_flow(self):
        self._write_users([self._user("admin", must_change=True)])
        c = self._client()
        r = self._login(c)
        self.assertEqual(200, r.status_code, r.text)
        self.assertTrue(r.json()["must_change_password"])

        blocked = c.get("/api/admin/workflow")
        self.assertEqual(403, blocked.status_code)
        self.assertEqual("password_change_required", blocked.json().get("code"))
        # /api/auth/* 是唯一豁免面
        self.assertEqual(200, c.get("/api/auth/me").status_code)

        changed = c.post("/api/auth/password", json={
            "old_password": PW, "new_password": "new-correct-horse-battery",
        })
        self.assertEqual(200, changed.status_code, changed.text)
        self.assertEqual(200, c.get("/api/admin/workflow").status_code)
        self.assertFalse(self._read_users()["users"][0]["must_change_password"])

    def test_weak_new_password_rejected(self):
        self._write_users([self._user("admin", must_change=True)])
        c = self._client()
        self._login(c)
        r = c.post("/api/auth/password", json={"old_password": PW, "new_password": "123456"})
        self.assertEqual(400, r.status_code)

    def test_wrong_old_password_rejected(self):
        self._write_users([self._user("admin", must_change=True)])
        c = self._client()
        self._login(c)
        r = c.post("/api/auth/password", json={
            "old_password": "not-the-password", "new_password": "new-correct-horse-battery",
        })
        self.assertEqual(400, r.status_code)


class TestSessionRotation(_AuthTestBase):
    def test_password_change_rotates_session(self):
        c = self._client()
        self._login(c)
        old_cookie = self._cookie(c)
        r = c.post("/api/auth/password", json={
            "old_password": PW, "new_password": "new-correct-horse-battery",
        })
        self.assertEqual(200, r.status_code, r.text)
        # 旧 cookie 作废，新 cookie 可用
        c_old = self._client()
        c_old.cookies.set("af_session", old_cookie)
        self.assertEqual(401, c_old.get("/api/auth/me").status_code)
        self.assertEqual(200, c.get("/api/auth/me").status_code)

    def test_permission_change_revokes_target_sessions(self):
        self._write_users([self._user("admin"), self._user("bob", role="user")])
        admin = self._client()
        self._login(admin)
        bob = self._client()
        self.assertEqual(200, self._login(bob, "bob").status_code)
        self.assertEqual(200, bob.get("/api/auth/me").status_code)

        r = admin.put("/api/auth/users/bob", json={"role": "admin"})
        self.assertEqual(200, r.status_code, r.text)
        self.assertEqual(401, bob.get("/api/auth/me").status_code)

    def test_sessions_list_and_manual_revoke(self):
        c = self._client()
        self._login(c)
        rows = c.get("/api/auth/sessions").json()["sessions"]
        self.assertEqual(1, len(rows))
        self.assertTrue(rows[0]["current"])
        self.assertEqual(200, c.delete(f"/api/auth/sessions/{rows[0]['id']}").status_code)
        self.assertEqual(401, c.get("/api/auth/me").status_code)

    def test_revoke_other_users_session_is_404(self):
        self._write_users([self._user("admin"), self._user("bob", role="user")])
        admin = self._client()
        self._login(admin)
        bob = self._client()
        self._login(bob, "bob")
        bob_session = bob.get("/api/auth/sessions").json()["sessions"][0]["id"]
        self.assertEqual(404, admin.delete(f"/api/auth/sessions/{bob_session}").status_code)


class TestPat(_AuthTestBase):
    def test_pat_bearer_auth_and_revoke(self):
        c = self._client()
        self._login(c)
        created = c.post("/api/auth/tokens", json={
            "name": "ci", "scopes": ["project:read"], "expires_days": 5,
        })
        self.assertEqual(200, created.status_code, created.text)
        token = created.json()["token"]["token"]
        self.assertTrue(token.startswith(session_service.PAT_PREFIX))
        pat_id = created.json()["token"]["id"]

        ci = self._client()
        r = ci.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(200, r.status_code)
        self.assertEqual("admin", r.json()["user"]["id"])

        self.assertEqual(200, c.delete(f"/api/auth/tokens/{pat_id}").status_code)
        self.assertEqual(401, ci.get("/api/auth/me",
                                   headers={"Authorization": f"Bearer {token}"}).status_code)

    def test_pat_rejects_no_expiry_and_bad_scope(self):
        c = self._client()
        self._login(c)
        self.assertEqual(400, c.post("/api/auth/tokens", json={
            "name": "forever", "scopes": ["project:read"], "expires_days": 0}).status_code)
        self.assertEqual(400, c.post("/api/auth/tokens", json={
            "name": "x", "scopes": ["not-a-permission"]}).status_code)
        self.assertEqual(400, c.post("/api/auth/tokens", json={
            "name": "x", "scopes": []}).status_code)

    def test_unknown_pat_is_401(self):
        c = self._client()
        self.assertEqual(401, c.get("/api/auth/me", headers={
            "Authorization": "Bearer af_pat_nope"}).status_code)


class TestDeploymentGate(_AuthTestBase):
    def test_source_gate_rejects_non_loopback_but_keeps_cors_headers(self):
        c = self._client(host="10.1.2.3")
        r = c.get("/api/auth/me", headers={"Origin": config.CORS_ORIGIN})
        self.assertEqual(403, r.status_code)
        self.assertEqual(config.CORS_ORIGIN, r.headers.get("access-control-allow-origin"))

    def test_health_is_exempt_from_source_gate(self):
        c = self._client(host="10.1.2.3")
        r = c.get("/api/health")
        self.assertEqual(200, r.status_code)

    def test_debug_header_triple_opt_in(self):
        with patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", True), \
             patch.object(config, "AUTH_DEBUG_HEADER_ADMIT_USERS", ["admin"]):
            c = self._client()
            self.assertEqual(200, c.get("/api/auth/me",
                                        headers={"X-User-Id": "admin"}).status_code)
            self.assertTrue(any(e.get("action") == "auth:debug_header"
                                for e in self._audit_lines()))
            # admit 白名单外仍 401
            self.assertEqual(401, c.get("/api/auth/me",
                                        headers={"X-User-Id": "bob"}).status_code)
        # env 关闭 → 头完全失效
        self.assertEqual(401, self._client().get(
            "/api/auth/me", headers={"X-User-Id": "admin"}).status_code)

    def test_debug_header_off_outside_localhost(self):
        self._write_users([self._user("admin")])
        with patch.object(config, "AUTH_DEBUG_HEADER_ENABLED", True), \
             patch.object(config, "AUTH_DEBUG_HEADER_ADMIT_USERS", ["admin"]), \
             patch.object(config, "DEPLOY_MODE", "lan"), \
             patch.object(config, "ALLOW_CIDRS", ["127.0.0.0/8"]):
            self.assertEqual(401, self._client().get(
                "/api/auth/me", headers={"X-User-Id": "admin"}).status_code)

    def test_lan_mode_allows_cidr_and_blocks_others(self):
        with patch.object(config, "DEPLOY_MODE", "lan"), \
             patch.object(config, "ALLOW_CIDRS", ["10.1.0.0/16"]):
            c = self._client(host="10.1.2.3")
            self.assertEqual(401, c.get("/api/auth/me").status_code)  # 放行后仍要身份
            self.assertEqual(403, self._client(host="10.2.2.3").get(
                "/api/auth/me").status_code)

    def test_behind_proxy_uses_xff_for_audit_only(self):
        with patch.object(config, "DEPLOY_MODE", "behind-proxy"), \
             patch.object(config, "TRUSTED_PROXY_IPS", ["10.0.0.5"]):
            c = self._client(host="10.0.0.5")
            r = self._login(c)
            self.assertEqual(200, r.status_code, r.text)
            self.assertEqual(200, c.get("/api/auth/me").status_code)
            # 直连客户端（非可信代理）一律拒绝
            self.assertEqual(403, self._client(host="203.0.113.9").get(
                "/api/auth/me").status_code)


class TestSessionService(unittest.TestCase):
    """服务层边界：过期清理 / PAT 过期 / 列表过滤。"""

    def setUp(self):
        self.engine = _new_engine()
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)

    def tearDown(self):
        self.engine.dispose()

    def test_cleanup_removes_only_old_expired(self):
        db = self.Session()
        old = SessionToken(
            token_hash=session_service.hash_token("old"), user_id="u",
            created_at=datetime.datetime.utcnow(),
            last_seen=datetime.datetime.utcnow(),
            expires_at=datetime.datetime.utcnow() - datetime.timedelta(days=10),
            absolute_expires_at=datetime.datetime.utcnow() - datetime.timedelta(days=10),
        )
        fresh = SessionToken(
            token_hash=session_service.hash_token("fresh"), user_id="u",
            created_at=datetime.datetime.utcnow(),
            last_seen=datetime.datetime.utcnow(),
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=10),
            absolute_expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        )
        db.add_all([old, fresh]); db.commit(); db.close()

        removed = session_service.cleanup_expired(db=self.Session())
        self.assertEqual(1, removed)
        self.assertEqual(1, len(session_service.list_sessions("u", db=self.Session())))

    def test_pat_expiry_filters_list_and_resolve(self):
        row = session_service.create_pat("u", "t", ["project:read"], expires_days=1,
                                         db=self.Session())
        self.assertEqual(1, len(session_service.list_pats("u", db=self.Session())))
        db = self.Session()
        tok = db.query(PatToken).filter(PatToken.id == row["id"]).first()
        tok.expires_at = datetime.datetime.utcnow() - datetime.timedelta(seconds=1)
        db.commit(); db.close()
        self.assertIsNone(session_service.resolve_pat(row["token"], db=self.Session()))
        self.assertEqual([], session_service.list_pats("u", db=self.Session()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
