"""capability-groups 回归用例 — T-FIX-00 · RED 基线（5-test 产出）。

口径（本文件的地基，想按「仓里既有风格」重写前先读这段）：

* **seam = 真实 SQLAlchemy session**（内存 SQLite + StaticPool，同一个库贯穿一个用例）+ 真实路由函数，
  断言**返回的行集合**。不打桩会话、不替换查询链、不向任何在跑的服务发请求。
  理由：仓里既有的两种写法（模块级把 `get_db` 换成打桩会话 / 依赖活服务的脚本）都挡不住本 change
  的 `contains()` bug —— 谓词从不落到真 SQL，照那个姿势补的测试会给真 bug 补假证据（R5.2 / T4 / T5）。
* **身份用 dict 直传**路由函数读取的 `request.state.user`（与 REVIEW.md §2.4 的复现姿势一致），
  所以「非 admin + 跨 owner」两类负例**今天就能写**，不被 A07 身份层阻塞
  （TASK.md `T-FIX-04` v5 结论：本条不被身份层阻塞、今天就可测；「不带 admin 旁路」是默认而非备选）。
* 用例从 `REQUIREMENT.md` 的 FR/NFR 派生（R5.1），不从当前实现派生：
  【RED】= 未修态**必须失败**（钉的是 bug，不是实现细节），修后转绿；
  【护栏】= 两个时点都为真，用来挡住「顺手改坏别的」与「过滤器恒返回 0 条也能全绿」。
* 全量套件基线本就是红的（41 failed / 134 passed / 6 skipped，见 TEST.md 第 1 轮第一行），
  故本文件只按**定向**判定：`cd backend && python -m pytest tests/test_capability_groups.py -q`

判据对应的修复任务：`T-FIX-01`（FR1 数组成员判定）· `T-FIX-02`（唯一入口 + 归一化）·
`T-FIX-04`（`domain_api.py:110` 行收口）· `T-FIX-13`（F16 凭据搬运链 + A09 可验性）。
"""
import os
import sys
import types
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))          # 必须绝对路径：相对路径会让 config.PROJECT_ROOT 退化成 ""
os.environ.setdefault("ENCRYPTION_KEY", "test-key-for-ci-32bytes!!")

from fastapi import HTTPException  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import routes.agents_api as agents_api_module  # noqa: E402
import routes.domain_api as domain_api_module  # noqa: E402
from models import Base  # noqa: E402
from models.agent import Agent  # noqa: E402
from models.domain import Domain  # noqa: E402
from routes.agents_api import api_create_agent, api_list_agents  # noqa: E402
from routes.domain_api import list_domain_capabilities, scale_agents  # noqa: E402
from services.encryption_service import decrypt, encrypt  # noqa: E402

_UNSET = object()

VICTIM_KEY = "sk-victim-DO-NOT-COPY"


def _req(user_id: str, role: str) -> types.SimpleNamespace:
    """只带路由真正读取的两处：`state.user`（dict）与 `client`（None → 落 127.0.0.1）。"""
    return types.SimpleNamespace(
        state=types.SimpleNamespace(user={"id": user_id, "role": role, "name": user_id}),
        client=None,
    )


class CapabDbCase(unittest.TestCase):
    """共享的建库/建行工具：每个用例一个独立内存库，互不串味。"""

    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.db = sessionmaker(bind=self.engine)()
        # 清理按 LIFO 跑：先关 session 再 dispose 引擎（反序会在 teardown 抛「closed database」）
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)

        # 唯一被打桩的东西是**审计写文件**这个外部出口（R5.2 要求写明原因与假设）：
        # 假设 = 审计落盘与否不影响本文件判定的行集合；换成记账桩可避免测试往仓库里写 audit.jsonl。
        # DB / 谓词 / 行收口 / 凭据加解密全部走真的 —— 那才是本 change 的 bug 所在。
        self.audits: list[tuple] = []
        for mod in (agents_api_module, domain_api_module):
            original = mod.log_audit
            mod.log_audit = self._make_audit_spy()
            self.addCleanup(self._restore_audit, mod, original)
        self.admin = _req("admin", "admin")

    def _make_audit_spy(self):
        def _spy(*args, **kwargs):
            self.audits.append(args)
        return _spy

    @staticmethod
    def _restore_audit(mod, original):
        mod.log_audit = original

    def _domain(self, name: str, owner: str) -> Domain:
        d = Domain(name=name, owner_id=owner)
        self.db.add(d)
        self.db.commit()
        self.db.refresh(d)
        return d

    def _agent(self, *, name: str, owner: str = "admin", capabilities=None,
               capabilities_raw=_UNSET, domain_id=None, status: str = "standby",
               extra: dict | None = None, api_key: str = "sk-self-owned") -> Agent:
        cfg = dict(extra or {})
        cfg["capabilities"] = capabilities if capabilities_raw is _UNSET else capabilities_raw
        a = Agent(
            owner_id=owner, name=name, model_provider="openai", model_name="gpt-4",
            api_key_encrypted=encrypt(api_key), domain_id=domain_id, status=status,
            model_config_json=cfg,
        )
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def _list(self, *, user=None, **params) -> dict:
        return api_list_agents(request=user or self.admin, db=self.db, **params)

    @staticmethod
    def _names(body: dict) -> list[str]:
        return sorted(a["name"] for a in body["agents"])


# ══════════════════════════════════════════════════════════════
# FR1：`GET /api/agents?capability=` 的数组成员语义
# ══════════════════════════════════════════════════════════════

class TestCapabFR1AgentFilter(CapabDbCase):
    """FR1 第一句：返回 `model_config_json.capabilities` **包含**该 capability 的 Agent。

    三条反向（跨 key / `_` 通配 / `%` 透传）+ 正向锚点 + 边界 + 参数组合，
    按 TASK.md `T-FIX-00` 的用例下限铺（REVIEW.md 第一轮复现记录的三条反例在此成为可执行判据）。
    """

    def _seed(self):
        # A 真有该能力；B 没有能力、只是**无关 key 的值**恰好是该字符串（跨 key 假阳性靶）；C 完全无关
        self._agent(name="A-has-cap", capabilities=["code-review"])
        self._agent(name="B-no-cap", capabilities=[], extra={"note": "code-review"})
        self._agent(name="C-other", capabilities=["python"])

    def test_capab_positive_anchor_returns_the_agent_that_really_has_it(self):
        """【护栏·正向锚点】真有能力的那条**必须**被返回 —— 缺它则「过滤器恒返回 0 条」也能全绿。

        故这条**不放假阳性靶**（靶在下面的反向用例里）：否则它会被 F2 一起带红，失去锚点作用。
        未修态它就该绿；修复后仍须绿。
        """
        self._agent(name="A-has-cap", capabilities=["code-review"])
        self._agent(name="C-other", capabilities=["python"])
        body = self._list(capability="code-review")
        self.assertEqual(["A-has-cap"], self._names(body),
                         "拥有该 capability 的 Agent 必须出现在结果里")
        self.assertEqual(1, body["total"])

    def test_capab_no_cross_key_false_positive(self):
        """【RED · F2 反例①】能力为空、但别的 key 的值恰好是该字符串的 Agent，不得被返回。"""
        self._seed()
        body = self._list(capability="code-review")
        self.assertEqual(["A-has-cap"], self._names(body),
                         "「Agent 拥有 capability」是数组成员判定，不是整段 JSON 文本的子串判定")

    def test_capab_underscore_is_not_a_single_char_wildcard(self):
        """【RED · F2 反例②】`?capability=code_review` 里的 `_` 不得当单字符通配符命中 `code-review`。"""
        self._seed()
        body = self._list(capability="code_review")
        self.assertEqual([], self._names(body), "没有任何 Agent 的能力等于 code_review，应返回 0 条")

    def test_capab_percent_is_not_a_wildcard_passthrough(self):
        """【RED · F2 反例③】`?capability=%` 不得把过滤器绕成无操作（连无能力的 Agent 也被返回）。"""
        self._seed()
        body = self._list(capability="%")
        self.assertEqual([], self._names(body), "字面量 `%` 不是任何 Agent 的能力，应返回 0 条")

    def test_capab_quote_injection_literal_returns_zero_rows_without_error(self):
        """【护栏 · A03】引号闭合串走绑定参数：既不报错也不放大结果集（REVIEW §2.2 已判「非注入」）。"""
        self._seed()
        body = self._list(capability="x' OR '1'='1")
        self.assertEqual([], self._names(body))

    def test_capab_capabilities_as_plain_string_is_not_a_membership(self):
        """【RED · 边界】`capabilities` 被写成字符串时不构成成员关系：既不匹配该值，也不得崩溃。"""
        self._agent(name="D-string-caps", capabilities_raw="code-review")
        body = self._list(capability="code-review")
        self.assertEqual([], self._names(body), "规范集合语义要求 list 形态；非 list 视为「无能力」")

    def test_capab_capabilities_null_is_tolerated(self):
        """【RED · 边界】`capabilities: null` + 无关 key 命中：不得因 JSON 文本匹配而返回该行。"""
        self._agent(name="E-null-caps", capabilities_raw=None, extra={"note": "code-review"})
        body = self._list(capability="code-review")
        self.assertEqual([], self._names(body))

    def test_capab_empty_string_query_means_zero_rows(self):
        """【RED · 边界 · 本阶段裁定的语义】`?capability=`（空串）= 精确匹配且无命中 → 0 条。

        现状靠 `if capability:` 的巧合「跳过过滤、返回全量」，与「返回 0 条」是两种语义。
        TEST.md 第 1 轮显式择一（选 0 条：归一化后空串不可能是任何 Agent 的能力），本条即该裁定的可执行化。
        人工若要改判，**改判本用例**而不是改代码绕过它（R5.3）。
        """
        self._seed()
        body = self._list(capability="")
        self.assertEqual([], self._names(body), "空串不得被当成「未传该参数」而返回全量")

    def test_capab_stored_value_with_padding_matches_normalized_query(self):
        """【RED · F17】存成 `" code-review "` 的行必须归一化后命中（同一套真相不得自己裂开）。"""
        self._agent(name="F-padded", capabilities=[" code-review "])
        body = self._list(capability="code-review")
        self.assertEqual(["F-padded"], self._names(body))

    def test_capab_query_with_padding_matches_stored_exact_value(self):
        """【RED · F17】归一化是双向的：查询串 `" code-review "` 也要命中存下来的 `code-review`。"""
        self._agent(name="G-exact", capabilities=["code-review"])
        body = self._list(capability=" code-review ")
        self.assertEqual(["G-exact"], self._names(body))

    def test_capab_normalization_folds_inner_whitespace(self):
        """【RED · T-FIX-02 归一化契约】存储值须**折叠内部连续空白**后才与查询串可比。

        判据来源不是实现，而是 TASK `T-FIX-02` 的 action 原文：「`c.strip()`，并折叠连续空白 +
        `casefold()` 折不折叠由产品拍，**先按不折叠、写进 docstring**」。同一份契约前端已在
        `capabilitiesOf` 上钉死（`frontend/src/__tests__/capability-group.test.tsx:73`，实跑 14 passed）；
        后端不钉同一条 = F18「单一真相」只剩后端一层，两端各自正确但规则不同。
        """
        self._agent(name="H1-inner-ws", capabilities=["  a\t\tb  "])
        self.assertEqual(["H1-inner-ws"], self._names(self._list(capability="a b")),
                         "strip 只管首尾不够，`a\\t\\tb` 归一后必须等于 `a b`")

    def test_capab_query_does_not_fold_case(self):
        """【RED · 同上，且**依赖一条未拍的产品裁定**】大小写按「先按不折叠」口径：不折叠。

        现状 `contains()` 走 SQL `LIKE`，SQLite 对 ASCII **默认不区分大小写** → `code-review` 查询
        会命中 `Code-Review`，是一种**看不见的假阳性**（`_`/`%` 那两条反例的同族）。
        ⚠️ 若产品改判「折叠大小写」，**本条与前端 `capability-group.test.tsx:74` 必须同时改判**；
        只改一边 = 把 F18 从一个 bug 变成两套真相（R5.3 的「显式换语义并记因」，不是改到能过）。
        """
        self._agent(name="H2-case", capabilities=["Code-Review"])
        self.assertEqual([], self._names(self._list(capability="code-review")),
                         "`Code-Review` 不是 `code-review` 的能力（不折叠大小写口径）")

    def test_capab_combined_with_domain_id(self):
        """FR1 第二句（可与 `domain_id` 组合）：非 0 支 + 同域假阳性靶。"""
        d = self._domain("生产域", "admin")
        other = self._domain("其它域", "admin")
        self._agent(name="H-want", capabilities=["code-review"], domain_id=d.id)
        self._agent(name="I-decoy-same-domain", capabilities=[], domain_id=d.id,
                    extra={"note": "code-review"})
        self._agent(name="J-other-domain", capabilities=["code-review"], domain_id=other.id)
        body = self._list(capability="code-review", domain_id=d.id)
        self.assertEqual(["H-want"], self._names(body))

    def test_capab_combined_with_domain_id_zero_means_no_domain(self):
        """FR1 第二句：`domain_id=0` 走 `domain_id IS NULL` 支（默认域口径），与能力过滤叠加后仍须精确。"""
        d = self._domain("有域归属的域", "admin")
        self._agent(name="K-no-domain", capabilities=["code-review"], domain_id=None)
        self._agent(name="L-no-domain-decoy", capabilities=[], domain_id=None,
                    extra={"note": "code-review"})
        self._agent(name="M-in-domain", capabilities=["code-review"], domain_id=d.id)
        body = self._list(capability="code-review", domain_id=0)
        self.assertEqual(["K-no-domain"], self._names(body))

    def test_capab_combined_with_status(self):
        """FR1 第二句：可与 `status` 组合（三个参数叠加时互不吞掉）。"""
        self._agent(name="N-run", capabilities=["code-review"], status="running")
        self._agent(name="O-standby", capabilities=["code-review"], status="standby")
        self._agent(name="P-run-decoy", capabilities=[], status="running",
                    extra={"note": "code-review"})
        body = self._list(capability="code-review", status="running")
        self.assertEqual(["N-run"], self._names(body))

    def test_capab_combined_with_domain_id_zero_and_status(self):
        """FR1 第二句：`capability` × `domain_id=0` × `status` 三重组合的精确集。"""
        d = self._domain("另一个域", "admin")
        self._agent(name="Q-want", capabilities=["code-review"], domain_id=None, status="running")
        self._agent(name="R-wrong-status", capabilities=["code-review"], domain_id=None, status="dead")
        self._agent(name="S-in-domain", capabilities=["code-review"], domain_id=d.id, status="running")
        self._agent(name="S2-decoy", capabilities=[], domain_id=None, status="running",
                    extra={"note": "code-review"})
        body = self._list(capability="code-review", domain_id=0, status="running")
        self.assertEqual(["Q-want"], self._names(body))

    def test_capab_non_admin_percent_query_leaks_nothing(self):
        """【RED · 安全负例】非 admin 身份下 `%` 既不得绕过过滤，也不得看到他人行。

        现状 `_filter_owner` 先跑，所以泄漏面限于调用者自己 —— 但 `%` 仍会把她的无能力 Agent
        一起返回（语义绕过）。修后两条同时成立，故这一条同时钉 FR1 语义与 A01 边界。
        """
        mallory = _req("mallory", "user")
        self._agent(name="T-mine", owner="mallory", capabilities=["python"])
        self._agent(name="U-mine-decoy", owner="mallory", capabilities=[],
                    extra={"note": "python"})
        self._agent(name="V-alice", owner="alice", capabilities=["python"])
        body = self._list(user=mallory, capability="%")
        self.assertEqual([], self._names(body), "非 admin + `%`：应为 0 条，且一条也不属于 alice")


# ══════════════════════════════════════════════════════════════
# FR2：`GET /api/domains/{id}/capabilities`
# ══════════════════════════════════════════════════════════════

class TestCapabFR2DomainCapabilities(CapabDbCase):
    """FR2 契约形状 + 去重 + 归一化；`T-FIX-04` 的跨 owner 负例。"""

    def test_capab_fr2_contract_shape_and_dedup(self):
        """【护栏】契约 `{domain_id, capabilities}`；实现多出的 `domain_name` 属 additive，须被断言固化。"""
        d = self._domain("交付域", "alice")
        self._agent(name="W1", owner="alice", capabilities=["code-review", "python"], domain_id=d.id)
        self._agent(name="W2", owner="alice", capabilities=["python"], domain_id=d.id)
        self._agent(name="W3", owner="alice", capabilities=[], domain_id=d.id)
        body = list_domain_capabilities(d.id, request=self.admin, db=self.db)
        self.assertIn("domain_id", body)
        self.assertIn("capabilities", body)
        self.assertEqual(d.id, body["domain_id"])
        self.assertEqual(["code-review", "python"], body["capabilities"], "去重 + 稳定排序")
        self.assertEqual("交付域", body.get("domain_name"),
                         "additive 字段一旦对外可见就进契约，不许只靠打印过（REVIEW 第一轮 FR2 的口径）")

    def test_capab_fr2_empty_domain_returns_empty_list(self):
        """【护栏】域内没有 Agent → `capabilities` 为空列表（不是 null、不是缺键）。"""
        d = self._domain("空域", "alice")
        body = list_domain_capabilities(d.id, request=self.admin, db=self.db)
        self.assertEqual([], body["capabilities"])

    def test_capab_fr2_unknown_domain_is_404(self):
        """【护栏】域不存在与越权统一 404（`CLAUDE.md`：避免用状态码探测他人资源）。"""
        alice = _req("alice", "user")
        with self.assertRaises(HTTPException) as ctx:
            list_domain_capabilities(9999, request=alice, db=self.db)
        self.assertEqual(404, ctx.exception.status_code)

    def test_capab_fr2_whitespace_variants_collapse_to_one_entry(self):
        """【RED · F17】`["code-review"," code-review "]` 去重后须为 **1 项**，不得裂成两组。"""
        d = self._domain("归一化域", "alice")
        self._agent(name="X1", owner="alice", capabilities=["code-review", " code-review "],
                    domain_id=d.id)
        body = list_domain_capabilities(d.id, request=self.admin, db=self.db)
        self.assertEqual(["code-review"], body["capabilities"])

    def test_capab_fr2_blank_only_values_are_dropped(self):
        """【护栏】只有空串/空白的 capabilities 视为「无能力」→ 不进列表（FR5 兜底桶口径的前半）。"""
        d = self._domain("空白域", "alice")
        self._agent(name="Y1", owner="alice", capabilities=["", "   "], domain_id=d.id)
        body = list_domain_capabilities(d.id, request=self.admin, db=self.db)
        self.assertEqual([], body["capabilities"])

    def test_capab_fr2_domain_owner_cannot_read_other_owners_capability(self):
        """【RED · T-FIX-04】即使调用者是**域 owner**，也不得从该端点拿到域内**他人** Agent 的能力画像。

        同时断言她自己那条能力**仍在**（挡住「整个端点摆烂返回空」这种假修）。
        结论口径只能是「入口层已加行过滤，身份层仍待修」，不得写「越权已修复」。
        """
        alice = _req("alice", "user")
        d = self._domain("alice 的域", "alice")
        self._agent(name="Z1-alice", owner="alice", capabilities=["review-ui"], domain_id=d.id)
        self._agent(name="Z2-mallory", owner="mallory", capabilities=["secret-cap"], domain_id=d.id)
        body = list_domain_capabilities(d.id, request=alice, db=self.db)
        self.assertIn("review-ui", body["capabilities"], "自己的行必须照常可见（否则本用例是假修）")
        self.assertNotIn("secret-cap", body["capabilities"],
                         "「域成员」不等于「可支配」：域内他人 Agent 的能力画像不得外泄")


# ══════════════════════════════════════════════════════════════
# NFR2：向后兼容（回归护栏，两个时点都为真）
# ══════════════════════════════════════════════════════════════

class TestCapabNfr2Regression(CapabDbCase):
    """NFR2「现有端点不受影响」—— 本轮起它有用例撑着，不再是读代码判出来的 ✅。"""

    def test_capab_regression_list_without_capability_returns_all_own_rows(self):
        self._agent(name="AA", capabilities=["code-review"])
        self._agent(name="AB", capabilities=[])
        self._agent(name="AC", capabilities=["python"])
        body = self._list()
        self.assertEqual(["AA", "AB", "AC"], self._names(body), "不传 capability 时行为不得变")
        self.assertEqual(set(), {"agents", "total"} - set(body.keys()), "响应外壳不变")
        self.assertEqual(3, body["total"])

    def test_capab_regression_status_and_domain_params_still_narrow(self):
        d = self._domain("回归域", "admin")
        self._agent(name="BA", capabilities=["code-review"], domain_id=d.id, status="running")
        self._agent(name="BB", capabilities=["code-review"], domain_id=None, status="standby")
        self.assertEqual(["BA"], self._names(self._list(status="running")))
        self.assertEqual(["BB"], self._names(self._list(domain_id=0)))
        self.assertEqual(["BA"], self._names(self._list(domain_id=d.id)))

    def test_capab_regression_created_agent_roundtrips_capabilities(self):
        """经 POST 建出来的 Agent，其 capabilities 要能被 GET 按能力取回（入口 → 出口闭环）。"""
        created = api_create_agent(
            {"name": "CA", "model_provider": "openai", "runtime": "langgraph",
             "model_name": "gpt-4", "api_key": "sk-ca",
             "model_config_json": {"capabilities": ["code-review"]}},
            request=self.admin, db=self.db)
        self.assertEqual("CA", created["name"], "POST 建 Agent 的返回契约不变（NFR2）")
        body = self._list(capability="code-review")
        self.assertEqual(["CA"], [a["name"] for a in body["agents"]])
        self.assertEqual(["code-review"],
                         body["agents"][0]["model_config_json"]["capabilities"])


# ══════════════════════════════════════════════════════════════
# T-FIX-13 / F16：`POST /api/domains/{id}/scale` 的凭据搬运链
# ══════════════════════════════════════════════════════════════

class TestCapabScaleCredentialChain(CapabDbCase):
    """安全负例：域 owner 以**他人** Agent 为模板 mint 副本 → 搬运他人 LLM 凭据。

    判据只判**明文**（TASK.md `T-FIX-13` v5：`encrypt()` 每次新 nonce，
    「密文不等」那条断言可以在凭据仍被盗用时变绿 → 禁止用作判据）。
    """

    def _new_rows(self, before: set[int]) -> list[Agent]:
        return [a for a in self.db.query(Agent).all() if a.id not in before]

    def test_capab_scale_must_not_hand_victim_credential_to_the_copy(self):
        alice = _req("alice", "user")
        d = self._domain("alice 的域", "alice")
        self._agent(name="AD-victim", owner="mallory", capabilities=["code-review"],
                    domain_id=d.id, api_key=VICTIM_KEY)
        before = {a.id for a in self.db.query(Agent).all()}
        try:
            body = scale_agents(d.id, {"capability": "code-review", "desired_replicas": 2},
                                request=alice, db=self.db)
        except HTTPException as exc:
            self.assertEqual(404, exc.status_code,
                             "越权与「资源不存在」统一 404（CLAUDE.md 约定）")
            return
        self.assertIn(body.get("status"), ("scaled", "no_op"),
                      "既不建副本也不拒绝 → 端点静默无事发生，本用例失去覆盖")
        copies = self._new_rows(before)
        self.assertTrue(copies, "status=scaled 却没建新行，属响应与数据不一致")
        for c in copies:
            self.assertNotEqual("mallory", c.owner_id, "新副本归调用者，不得写成他人 owner")
            if c.api_key_encrypted is None:
                continue  # 正解之一：副本根本不携带凭据
            self.assertNotEqual(
                VICTIM_KEY, decrypt(c.api_key_encrypted),
                "只判明文：解密拿到受害者 Key = 搬运仍成立")

    def test_capab_scale_audit_detail_must_name_the_template_owner(self):
        """【RED · A09】`log_audit("domain.scale")` 现在只记 `scaled N→M`，越权发生时日志完全正常。

        把「事后查得到」变成可执行判据：修复若仍建副本，审计 detail 必须含 `template_owner`
        （`T-FIX-13` 的「审计可验性」项）；若改判为拒绝（404），则不落该记录 ——
        该路径下本用例**显式 skip 并说明原因**，不静默通过。
        """
        alice = _req("alice", "user")
        d = self._domain("审计域", "alice")
        self._agent(name="AE-victim", owner="mallory", capabilities=["code-review"],
                    domain_id=d.id, api_key=VICTIM_KEY)
        try:
            scale_agents(d.id, {"capability": "code-review", "desired_replicas": 2},
                         request=alice, db=self.db)
        except HTTPException as exc:
            self.assertEqual(404, exc.status_code)
            self.skipTest("请求被拒绝（404），不落 domain.scale 审计记录 → 本条无可断对象")
        scale_records = [a for a in self.audits if "domain.scale" in [str(p) for p in a]]
        self.assertTrue(scale_records, "扩容成功却没落审计记录（A09 的另一半）")
        details = " | ".join(str(part) for a in scale_records for part in a)
        self.assertIn("template_owner", details,
                      "审计要能回答「拿谁的 Agent 当了模板」（A09：事后查不到本身就是缺陷）")

    def test_capab_scale_allowed_path_names_template_owner_and_carries_no_template_key(self):
        """【4-dev 补 · T-FIX-13 · A09】上一条在候选集收口后走 404 → `skipTest`（无可断对象）。

        A09「审计要答得出拿谁的 Agent 当了模板」是本任务点名的必修项，**不能只由一条 skip 承载** ——
        否则「漏洞堵了但没有一处绿证明审计真的可查」。本例是**纯加法**：不改动上面任何断言（R5.3），
        走的是「模板归调用者本人」这条**真会扩容**的路径，断三件事：
        ① 副本不落模板凭据（无显式 key → 落 `not_set` 哨兵，即 `agents_api` 建 Agent 时同一个「无凭据」约定）；
        ② 审计 detail 答得出 `template_id` / `template_owner`；③ 调用者自备 key 时用的是他自己的 key。
        5-test 若要把这三件拆成三条或重写口径，随取。
        """
        alice = _req("alice", "user")
        d = self._domain("真扩容域", "alice")
        tpl = self._agent(name="AG-own", owner="alice", capabilities=["code-review"],
                          domain_id=d.id, api_key=VICTIM_KEY)   # 刻意拿受害者串当"自己的"key：连自己的也不许搬
        body = scale_agents(d.id, {"capability": "code-review", "desired_replicas": 2},
                            request=alice, db=self.db)
        self.assertEqual("scaled", body.get("status"), "模板归调用者时端点必须真的扩容，否则本例也退化成 skip")
        copies = [a for a in self.db.query(Agent).all() if a.name == "AG-own-replica-1"]
        self.assertEqual(1, len(copies))
        self.assertEqual("alice", copies[0].owner_id, "副本归调用者")
        self.assertNotEqual(VICTIM_KEY, decrypt(copies[0].api_key_encrypted),
                            "「不搬运模板凭据」不许只在被拒路径上成立")
        self.assertEqual("not_set", decrypt(copies[0].api_key_encrypted),
                         "无显式 api_key → 落仓库既有的「无凭据」哨兵，副本不带可用凭据")
        details = " | ".join(str(part) for a in self.audits if "domain.scale" in [str(x) for x in a] for part in a)
        self.assertIn(f"template_id={tpl.id}", details, "A09：事后要查得到模板 id")
        self.assertIn("template_owner=alice", details, "A09：事后要查得到模板归谁")

        d2 = self._domain("自备 key 域", "alice")
        self._agent(name="AH-own", owner="alice", capabilities=["code-review"],
                    domain_id=d2.id, api_key=VICTIM_KEY)
        scale_agents(d2.id, {"capability": "code-review", "desired_replicas": 2,
                             "api_key": "sk-alice-mine"}, request=alice, db=self.db)
        mine = [a for a in self.db.query(Agent).all() if a.name == "AH-own-replica-1"]
        self.assertEqual(1, len(mine))
        self.assertEqual("sk-alice-mine", decrypt(mine[0].api_key_encrypted),
                         "显式自备 key 这条正解（action 的「要求调用者自备 key」）必须真的可用")
