"""P0-3 部署模式闸门与可信代理解析（纯函数单测）。"""
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
from services import deploy_guard as dg


class TestDeployValidate(unittest.TestCase):
    def test_invalid_mode_fails_loud(self):
        with patch.object(config, "DEPLOY_MODE", "public"):
            with self.assertRaises(dg.DeployConfigError):
                dg.validate_deploy_config()

    def test_lan_without_cidrs_fails_loud(self):
        with patch.object(config, "DEPLOY_MODE", "lan"), \
             patch.object(config, "ALLOW_CIDRS", []):
            with self.assertRaises(dg.DeployConfigError):
                dg.validate_deploy_config()

    def test_lan_bad_cidr_fails_loud(self):
        with patch.object(config, "DEPLOY_MODE", "lan"), \
             patch.object(config, "ALLOW_CIDRS", ["10.0.0.0/33"]):
            with self.assertRaises(dg.DeployConfigError):
                dg.validate_deploy_config()

    def test_behind_proxy_requires_trusted(self):
        with patch.object(config, "DEPLOY_MODE", "behind-proxy"), \
             patch.object(config, "TRUSTED_PROXY_IPS", []):
            with self.assertRaises(dg.DeployConfigError):
                dg.validate_deploy_config()

    def test_star_forwarded_allow_ips_without_tls_fails(self):
        with patch.object(config, "DEPLOY_MODE", "localhost"), \
             patch.object(config, "TRUSTED_PROXY_IPS", []), \
             patch.object(config, "ALLOW_CIDRS", []), \
             patch.object(config, "FORWARDED_ALLOW_IPS", "*"), \
             patch.object(config, "TLS_TERMINATED", False):
            with self.assertRaises(dg.DeployConfigError):
                dg.validate_deploy_config()

    def test_star_trusted_proxy_is_rejected(self):
        with patch.object(config, "DEPLOY_MODE", "behind-proxy"), \
             patch.object(config, "TRUSTED_PROXY_IPS", ["*"]):
            with self.assertRaises(dg.DeployConfigError):
                dg.validate_deploy_config()

    def test_valid_config_passes(self):
        with patch.object(config, "DEPLOY_MODE", "behind-proxy"), \
             patch.object(config, "TRUSTED_PROXY_IPS", ["10.0.0.2"]), \
             patch.object(config, "FORWARDED_ALLOW_IPS", "10.0.0.2"):
            dg.validate_deploy_config()


class TestPeerGate(unittest.TestCase):
    def test_localhost_only_loopback(self):
        with patch.object(config, "DEPLOY_MODE", "localhost"):
            self.assertTrue(dg.peer_allowed("127.0.0.1"))
            self.assertTrue(dg.peer_allowed("::1"))
            self.assertTrue(dg.peer_allowed("localhost"))
            self.assertFalse(dg.peer_allowed("10.1.2.3"))
            self.assertFalse(dg.peer_allowed("testclient"))

    def test_lan_cidr(self):
        with patch.object(config, "DEPLOY_MODE", "lan"), \
             patch.object(config, "ALLOW_CIDRS", ["10.1.0.0/16"]):
            self.assertTrue(dg.peer_allowed("10.1.2.3"))
            self.assertTrue(dg.peer_allowed("127.0.0.1"))
            self.assertFalse(dg.peer_allowed("10.2.2.3"))

    def test_behind_proxy_only_trusted_peer(self):
        with patch.object(config, "DEPLOY_MODE", "behind-proxy"), \
             patch.object(config, "TRUSTED_PROXY_IPS", ["10.0.0.5"]):
            self.assertTrue(dg.peer_allowed("10.0.0.5"))
            self.assertFalse(dg.peer_allowed("203.0.113.9"))
            self.assertFalse(dg.peer_allowed("127.0.0.1"))


class TestClientIp(unittest.TestCase):
    def test_untrusted_peer_ignores_xff(self):
        with patch.object(config, "TRUSTED_PROXY_IPS", ["10.0.0.5"]):
            self.assertEqual(
                "10.0.0.5",
                dg.effective_client_ip("10.0.0.5", None),
            )
            self.assertEqual(
                "198.51.100.7",
                dg.effective_client_ip("198.51.100.7", "1.2.3.4, 5.6.7.8"),
            )

    def test_trusted_peer_takes_rightmost_non_trusted(self):
        with patch.object(config, "TRUSTED_PROXY_IPS", ["10.0.0.5", "10.0.0.6"]):
            # 客户端可在左侧伪造；右起第一个非可信才是真身
            self.assertEqual(
                "203.0.113.9",
                dg.effective_client_ip("10.0.0.5", "1.2.3.4, 203.0.113.9, 10.0.0.6"),
            )

    def test_all_hops_trusted_uses_leftmost(self):
        with patch.object(config, "TRUSTED_PROXY_IPS", ["10.0.0.5", "10.0.0.6"]):
            self.assertEqual("10.0.0.6", dg.effective_client_ip("10.0.0.5", "10.0.0.6"))


class TestCookieAndDebug(unittest.TestCase):
    def test_cookie_name_degrades_without_tls(self):
        with patch.object(config, "TLS_TERMINATED", False):
            self.assertEqual("af_session", dg.session_cookie_name())
            self.assertTrue(dg.deploy_info()["cookie_degraded"])
        with patch.object(config, "TLS_TERMINATED", True):
            self.assertEqual("__Host-session", dg.session_cookie_name())
            self.assertFalse(dg.deploy_info()["cookie_degraded"])

    def test_debug_header_requires_all_three(self):
        base = dict(DEPLOY_MODE="localhost", AUTH_DEBUG_HEADER_ENABLED=True,
                    AUTH_DEBUG_HEADER_ADMIT_USERS=["admin"])
        with patch.multiple(config, **base):
            self.assertTrue(dg.debug_header_enabled())
            self.assertTrue(dg.debug_header_allows("admin"))
            self.assertFalse(dg.debug_header_allows("someone-else"))

        with patch.multiple(config, **{**base, "AUTH_DEBUG_HEADER_ENABLED": False}):
            self.assertFalse(dg.debug_header_enabled())
        with patch.multiple(config, **{**base, "DEPLOY_MODE": "lan"}):
            self.assertFalse(dg.debug_header_enabled())
        with patch.multiple(config, **{**base, "AUTH_DEBUG_HEADER_ADMIT_USERS": []}):
            self.assertFalse(dg.debug_header_enabled())


if __name__ == "__main__":
    unittest.main(verbosity=2)
