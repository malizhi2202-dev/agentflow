"""L0 → L1 抽取：默认 dry_run 不写库；注入抽取器才按三字段门落库。"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base
from models.agent import Agent
from models.conversation import Conversation
from models.message import Message
from models.rsi import Memory
from services import l0_extractor, rsi_service as rsi

from tests._auth_harness import AuthHarness


class _Base(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                                    poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, autocommit=False, autoflush=False)
        self.db = self.Session()
        agent = Agent(owner_id="alice", name="a", model_provider="deepseek",
                      model_name="m", api_key_encrypted="x")
        self.db.add(agent)
        self.db.commit()
        self.conv = Conversation(agent_id=agent.id, owner_id="alice", title="排查构建")
        self.db.add(self.conv)
        self.db.commit()
        self.db.add_all([
            Message(conversation_id=self.conv.id, role="user", content="构建挂了怎么查"),
            Message(conversation_id=self.conv.id, role="assistant", content="先看 tsc 第一个错误"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()


class TestExtract(_Base):
    def test_default_is_dry_run_and_writes_nothing(self):
        out = l0_extractor.extract(self.db, self.conv)
        self.assertTrue(out["dry_run"])
        self.assertEqual(out["candidates"], 0)
        self.assertEqual(out["messages"], 2)
        self.assertEqual(self.db.query(Memory).count(), 0)

    def test_injected_extractor_promotes_with_source_ref(self):
        def fake(messages):
            assert len(messages) == 2
            return [{"cue": "构建挂了先看 tsc", "lesson": "定位第一个类型错误",
                     "evidence": [{"ref": "msg-1"}]}]
        out = l0_extractor.extract(self.db, self.conv, extractor=fake)
        self.assertFalse(out["dry_run"])
        self.assertEqual(out["candidates"], 1)
        row = self.db.query(Memory).one()
        self.assertEqual(row.source_ref, f"conversation:{self.conv.id}")
        # 机器抽取默认拿不准 → confounded（不是假装成立）
        self.assertEqual(row.status, "confounded")
        self.assertTrue(row.confounded)

    def test_missing_fields_become_no_entry(self):
        def fake(_):
            return [{"cue": "", "lesson": "", "evidence": []}]
        out = l0_extractor.extract(self.db, self.conv, extractor=fake)
        self.assertEqual(out["created"][0]["status"], "no_entry")
        self.assertFalse(out["created"][0]["stored"])

    def test_extractor_error_is_loud(self):
        def fake(_):
            raise RuntimeError("model down")
        with self.assertRaises(l0_extractor.ExtractorError):
            l0_extractor.extract(self.db, self.conv, extractor=fake)


class TestRoute(AuthHarness, unittest.TestCase):
    users = [("root", "admin"), ("alice", "member"), ("bob", "member")]

    def setUp(self):
        AuthHarness.setUp(self)
        agent = Agent(owner_id="alice", name="a", model_provider="deepseek",
                      model_name="m", api_key_encrypted="x")
        self.db.add(agent)
        self.db.commit()
        conv = Conversation(agent_id=agent.id, owner_id="alice", title="t")
        self.db.add(conv)
        self.db.commit()
        self.conv_id = conv.id

    def test_owner_dry_run_ok(self):
        r = self.client("alice").post("/api/rsi/l0/extract", json={"conversation_id": self.conv_id})
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json()["dry_run"])
        self.assertEqual(r.json()["candidates"], 0)

    def test_other_member_gets_404(self):
        r = self.client("bob").post("/api/rsi/l0/extract", json={"conversation_id": self.conv_id})
        self.assertEqual(r.status_code, 404, r.text)

    def test_platform_admin_may_extract_any_conversation(self):
        # 平台管理员按既有口径可跨所有者处理（与其它管理面一致）
        r = self.client("root").post("/api/rsi/l0/extract", json={"conversation_id": self.conv_id})
        self.assertEqual(r.status_code, 200, r.text)

    def test_missing_conversation_id_400(self):
        r = self.client("alice").post("/api/rsi/l0/extract", json={})
        self.assertEqual(r.status_code, 400)


if __name__ == "__main__":
    unittest.main()


class TestLlmExtractorShape(unittest.TestCase):
    """LLM 输出是不可信外部输入：对象与 [cue, lesson, evidence] 三元组都要能接。"""

    class _Fake:
        def __init__(self, reply):
            self.reply = reply

        def chat(self, messages, api_key, model_name):
            return self.reply, {}

    def _extract(self, reply):
        from services import l0_llm_extractor as llm
        return llm.build_extractor(provider=self._Fake(reply))(["一段对话"])

    def test_object_shape(self):
        got = self._extract('[{"cue":"c","lesson":"l","evidence":["r"]}]')
        self.assertEqual(got, [{"cue": "c", "lesson": "l", "evidence": ["r"]}])

    def test_triple_shape_is_tolerated(self):
        got = self._extract('[["c","l",["r"]]]')
        self.assertEqual(got, [{"cue": "c", "lesson": "l", "evidence": ["r"]}])

    def test_garbage_is_dropped_not_guessed(self):
        self.assertEqual(self._extract('不是 JSON'), [])
        # 缺字段的条目直接丢（不猜、不留空壳让下游误判）；非对象/非三元组的项同样丢弃
        self.assertEqual(self._extract('[{"foo":1}, 42]'), [])

    def test_real_cli_object_envelope_and_alias_keys(self):
        """真实 CLI（hermes）会把候选包在 {"experiences": [...]} 里、字段叫 title/content/notes。"""
        reply = (
            "```json\n{\"experiences\": [{\"title\": \"线上 502 报警\","
            " \"content\": \"先看网关日志和后端健康\","
            " \"notes\": \"助手原话：先看网关日志\"}]}\n```\n\n补充说明：仅供参考。"
        )
        got = self._extract(reply)
        self.assertEqual(got, [{"cue": "线上 502 报警",
                                "lesson": "先看网关日志和后端健康",
                                "evidence": ["助手原话：先看网关日志"]}])

    def test_evidence_string_is_wrapped(self):
        got = self._extract('[{"cue":"c","lesson":"l","evidence":"r"}]')
        self.assertEqual(got, [{"cue": "c", "lesson": "l", "evidence": ["r"]}])
