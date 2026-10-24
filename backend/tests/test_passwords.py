"""P0-2 口令单测（纯标准库）。跑法：cd backend && python3 -m unittest tests.test_passwords -v"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import passwords as pw  # noqa: E402


class TestHash(unittest.TestCase):
    def test_roundtrip(self):
        h = pw.hash_password("correct horse battery staple")
        self.assertTrue(pw.verify_password("correct horse battery staple", h))
        self.assertFalse(pw.verify_password("wrong", h))

    def test_salt_unique(self):
        a = pw.hash_password("same")
        b = pw.hash_password("same")
        self.assertNotEqual(a, b, "同一口令两次哈希必须不同（每口令独立盐）")
        self.assertTrue(pw.verify_password("same", a) and pw.verify_password("same", b))

    def test_format_is_self_describing(self):
        h = pw.hash_password("x" * 16)
        self.assertTrue(h.startswith("$argon2") or h.startswith("scrypt$"), h[:12])

    def test_empty_inputs_are_false_not_crash(self):
        self.assertFalse(pw.verify_password("", "anything"))
        self.assertFalse(pw.verify_password("x", ""))
        self.assertFalse(pw.verify_password("x", "unknown-format"))


class TestLegacySha256(unittest.TestCase):
    def _sha(self, s):
        import hashlib
        return hashlib.sha256(s.encode()).hexdigest()

    def test_legacy_still_verifies(self):
        self.assertTrue(pw.verify_password("123456", self._sha("123456")))
        self.assertFalse(pw.verify_password("123457", self._sha("123456")))

    def test_legacy_needs_rehash(self):
        self.assertTrue(pw.needs_rehash(self._sha("123456")))
        self.assertTrue(pw.needs_rehash(""))
        self.assertFalse(pw.needs_rehash(pw.hash_password("x" * 16)))

    def test_upgrade_path(self):
        """登录时升级：旧哈希校验通过 → 换新哈希 → 仍可校验。"""
        legacy = self._sha("hunter2hunter2")
        self.assertTrue(pw.verify_password("hunter2hunter2", legacy))
        upgraded = pw.hash_password("hunter2hunter2")
        self.assertTrue(pw.verify_password("hunter2hunter2", upgraded))
        self.assertFalse(pw.needs_rehash(upgraded))


class TestPolicy(unittest.TestCase):
    def test_weak(self):
        self.assertTrue(pw.is_weak("123456"))
        self.assertTrue(pw.is_weak("aaaaaaaaaaaa"))
        self.assertFalse(pw.is_weak("Hx7#qLm2!vRz9p"))

    def test_generated_password_is_strong_and_random(self):
        a, b = pw.generate_password(), pw.generate_password()
        self.assertNotEqual(a, b)
        self.assertFalse(pw.is_weak(a))
        self.assertGreaterEqual(len(a), 16)


if __name__ == "__main__":
    unittest.main(verbosity=2)
