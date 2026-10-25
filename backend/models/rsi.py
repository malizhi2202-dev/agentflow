"""RSI 产物治理（R6/R7）— 记忆四层 / 提案 / 可改面 / 熔断。

设计口径（RULINGS R6-1..R6-4、R7-1..R7-6）：
- **记忆四层唯一管道**：L0 原文 → L1 原子 → L2 场景 → L3 核心；**层级 ≠ 权限**。
  晋升准入**三字段缺一不入库**（cue / lesson / evidence），拿不准默认 `confounded`，
  `no_entry` 是合法结果（明确「这次不学」也是结论）。
- **提案制三权分离**：生成（限步限钱）/ 评估（探针快筛 + 影子重放终身门）/ 发布（人批）。
  **Probe 永不作发布依据**；影子重放要求冻结金标 + 异厂系 judge。
- **禁改面 = 可改面声明对象**（`surface_manifest`），scripts/plugins/hooks **永久禁改**；
  代码层 RSI 禁止（线上稳定优先）——不是「提示词说不要改代码」。
- **四熔断**（预算 / 步数 / 塌缩 / 错误率）+ NOISE FLOOR（低于噪声的改进不算改进）。
"""

import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

MEMORY_LAYERS: frozenset[str] = frozenset({"L1", "L2", "L3"})
MEMORY_KINDS: frozenset[str] = frozenset({"positive", "negative"})   # 负知识合法
# 晋升状态：晋升门在状态转换层判定后的结论（波 6 落地时的列名 `status`）。
# 注意它**不是**生命周期——生命周期见 MEMORY_LIFE_STATUSES（v24-doc-refresh D1 拆维度）。
MEMORY_STATUSES: frozenset[str] = frozenset(
    {"promoted", "confounded", "quarantined", "no_entry"}
)
# 内容域：与层级**正交**的另一维度（设计 §3.3 / §2.8「记忆四层唯一管道」）。
MEMORY_DOMAINS: frozenset[str] = frozenset(
    {"semantic", "procedural", "preference", "instruction", "rule"}
)
# 生命周期：衰减重验不通过 → stale-flagged（**不物理删**）；撤回 → revoked。
MEMORY_LIFE_STATUSES: frozenset[str] = frozenset({"active", "revoked", "stale-flagged"})
# R7-4 verdict 词表封闭（helped / hurt / no-effect / confounded 默认 / no_entry 合法）
REVIEW_VERDICTS: frozenset[str] = frozenset(
    {"helped", "hurt", "no_effect", "confounded", "no_entry"}
)
# R6-4：只有这四类产物允许自动化；四类之外（含代码层与门禁本体）没有开关
RSI_CATEGORIES: tuple[str, ...] = ("memory", "skill", "orchestration", "model")
# R7-5 防污染标记：评测回流内容的词面绊线（内容标记 + 路径双扫的第一道）
POLLUTION_MARKERS: tuple[str, ...] = (
    "golden", "golden_set", "金标", "benchmark", "eval_set", "评测集", "test_case_expected",
)
PROPOSAL_DIMENSIONS: frozenset[str] = frozenset({"invariant", "domain"})
PROPOSAL_STATUSES: frozenset[str] = frozenset(
    {"generated", "probed", "shadowing", "awaiting_approval", "published",
     "rejected", "collapsed", "blocked"}
)
BREAKER_NAMES: tuple[str, ...] = ("budget", "steps", "collapse", "error_rate")
# 永久禁改的路径前缀（不是提示词，是服务端判定）
IMMUTABLE_PREFIXES: tuple[str, ...] = ("scripts/", "plugins/", "hooks/")


class Memory(Base):
    """晋升门在状态转换层：三字段齐才可能是 promoted。"""

    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    layer: Mapped[str] = mapped_column(String(4), default="L1", index=True)
    kind: Mapped[str] = mapped_column(String(8), default="positive", index=True)
    # 内容域：与 layer 正交（设计 §3.3）——「语义型 / 流程型 / 偏好型 / 指令型 / 规则型」
    domain: Mapped[str] = mapped_column(String(32), default="semantic", index=True)
    scope: Mapped[str] = mapped_column(String(16), default="agent", index=True)
    owner_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    cue: Mapped[str] = mapped_column(Text, default="")
    lesson: Mapped[str] = mapped_column(Text, default="")
    content: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_json: Mapped[str] = mapped_column(Text, default="[]")
    source_ref: Mapped[str] = mapped_column(String(256), default="", index=True)
    # 来源链**真外键**（设计 §3.3「day-1 真外键，支撑沿链成批撤回」）：
    # 两个来源各一列，NULL = 无来源；source_ref 保留作兼容（旧行 / 外部引用）。
    source_run_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("work_item_runs.id"), nullable=True, index=True
    )
    source_conversation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("conversations.id"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(16), default="no_entry", index=True)
    # 生命周期（与晋升状态正交的另一维度）：衰减重验不通过 → stale-flagged，不物理删
    life_status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    # 检疫静置期：NULL = 免检（站内自产）；外部来源入队即非 NULL
    quarantine_until: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    confounded: Mapped[int] = mapped_column(Integer, default=0)
    # R7-4 因果前缀：source_seq=本条经验所属任务序号；cites_seq=它引用到的最大任务序号
    # 规则：cites_seq 必须早于 source_seq（不许引用未来任务，防未来信息回灌）
    source_seq: Mapped[int] = mapped_column(Integer, default=0)
    cites_seq: Mapped[int] = mapped_column(Integer, default=0)
    # R7-5 防污染：晋升前扫命中 → 标记并强制 confounded；入库后再扫一次记 post_ingest_scan
    pollution_flagged: Mapped[int] = mapped_column(Integer, default=0)
    post_ingest_scan: Mapped[int] = mapped_column(Integer, default=0)
    decay_score: Mapped[float] = mapped_column(Integer, default=100)
    last_used_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "layer": self.layer, "kind": self.kind, "scope": self.scope,
            "domain": self.domain,
            "owner_id": self.owner_id, "cue": self.cue, "lesson": self.lesson,
            "content": self.content, "confidence": self.confidence,
            "evidence": json.loads(self.evidence_json or "[]"),
            "source_ref": self.source_ref,
            "source_run_id": self.source_run_id,
            "source_conversation_id": self.source_conversation_id,
            "status": self.status, "life_status": self.life_status,
            "quarantine_until": self.quarantine_until.isoformat() if self.quarantine_until else None,
            "confounded": bool(self.confounded),
            "source_seq": self.source_seq, "cites_seq": self.cites_seq,
            "pollution_flagged": bool(self.pollution_flagged),
            "post_ingest_scan": bool(self.post_ingest_scan),
            "decay_score": self.decay_score,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Proposal(Base):
    """改进提案（R6-3 三权分离 / R7-2 双维）。

    表名 `improvement_proposals`：与设计 §3.3 一致（v24-doc-refresh D4 统一，
    原名 `orchestration_proposals` 是历史漂移）。
    维度取值 `invariant` / `domain` 与设计的 `INV` / `DOM` **等价**（可读性优先，不为字面改数据）。
    """

    __tablename__ = "improvement_proposals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    dimension: Mapped[str] = mapped_column(String(16), default="invariant", index=True)
    surface_name: Mapped[str] = mapped_column(String(64), default="", index=True)
    target: Mapped[str] = mapped_column(String(256), default="")
    status: Mapped[str] = mapped_column(String(24), default="generated", index=True)
    # 生成阶段的两道限额（限步限钱）
    budget_steps: Mapped[int] = mapped_column(Integer, default=10)
    used_steps: Mapped[int] = mapped_column(Integer, default=0)
    budget_tokens: Mapped[int] = mapped_column(Integer, default=20000)
    used_tokens: Mapped[int] = mapped_column(Integer, default=0)
    probe_json: Mapped[str] = mapped_column(Text, default="{}")
    shadow_json: Mapped[str] = mapped_column(Text, default="{}")
    judge_model: Mapped[str] = mapped_column(String(128), default="")
    # D4：设计 §3.3 的五个列（原先证据只落在一个 JSON 串里，**不可按字段查询**）
    proposal_diff: Mapped[str] = mapped_column(Text, default="")
    probe_pack: Mapped[str] = mapped_column(Text, default="")
    seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    blind_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fell_back: Mapped[int] = mapped_column(Integer, default=0)
    domain_signoff_json: Mapped[str] = mapped_column(Text, default="[]")
    approved_by: Mapped[str] = mapped_column(String(64), default="")
    approved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "title": self.title, "dimension": self.dimension,
            "surface_name": self.surface_name, "target": self.target, "status": self.status,
            "budget": {"steps": self.budget_steps, "tokens": self.budget_tokens},
            "used": {"steps": self.used_steps, "tokens": self.used_tokens},
            "probe": json.loads(self.probe_json or "{}"),
            "shadow": json.loads(self.shadow_json or "{}"),
            "judge_model": self.judge_model,
            # D4：设计 §3.3 的五个列（独立可查，不再只落一个 JSON 串）
            "proposal_diff": self.proposal_diff,
            "probe_pack": self.probe_pack,
            "seed": self.seed,
            "blind_rank": self.blind_rank,
            "fell_back": bool(self.fell_back),
            "domain_signoffs": json.loads(self.domain_signoff_json or "[]"),
            "approved_by": self.approved_by or None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ProbeEvidence(Base):
    """探针证据包（设计 §3.3 / §6.30 C）。

    **全表无打分级字段**——把差异摆成布局交给模型读，**代码不写打分器**。
    `similarity_mean` 是两两行级 Jaccard 均值（塌缩探测的输入），不是判定分数。
    """

    __tablename__ = "probe_evidence"

    EVIDENCE_KINDS: frozenset[str] = frozenset({"trajectory", "deliverable"})

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    proposal_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("improvement_proposals.id"), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(64), default="")       # 盲评位次 A/B/…
    diff_ref: Mapped[str] = mapped_column(String(512), default="")
    trajectory_ref: Mapped[str] = mapped_column(String(512), default="")
    produced_ref: Mapped[str] = mapped_column(String(512), default="")
    source_ref: Mapped[str] = mapped_column(String(256), default="")  # 原始资料，供「先可复算核对」
    evidence: Mapped[str] = mapped_column(String(16), default="trajectory", index=True)
    similarity_mean: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "proposal_id": self.proposal_id, "label": self.label,
            "diff_ref": self.diff_ref, "trajectory_ref": self.trajectory_ref,
            "produced_ref": self.produced_ref, "source_ref": self.source_ref,
            "evidence": self.evidence, "similarity_mean": self.similarity_mean,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ExecLedger(Base):
    """作业预算账（设计 §3.3 / §6.30 C/E）。

    恒等式断言**事前写死**：批形状 k base + 2k 候选 + k 终身，参数由预算帽生成器定
    → `expected_rollouts` / `expected_sessions` 先落账；`actual_*` 是实际发生。
    `dup_label`：等式不符或标签重复 = **批次失败**（不是事后账单）。
    `fp_mark` / `cache_digest`：执行指纹幂等——不同配置绝不复用旧证据、配置漂移拒续跑。
    """

    __tablename__ = "exec_ledgers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    expected_rollouts: Mapped[int] = mapped_column(Integer, default=0)
    expected_sessions: Mapped[int] = mapped_column(Integer, default=0)
    actual_rollouts: Mapped[int] = mapped_column(Integer, default=0)
    actual_sessions: Mapped[int] = mapped_column(Integer, default=0)
    budget_error: Mapped[float | None] = mapped_column(Float, nullable=True)
    dup_label: Mapped[str] = mapped_column(String(256), default="")
    fp_mark: Mapped[str] = mapped_column(String(128), default="")
    cache_digest: Mapped[str] = mapped_column(String(128), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "scope": self.scope,
            "expected_rollouts": self.expected_rollouts,
            "expected_sessions": self.expected_sessions,
            "actual_rollouts": self.actual_rollouts,
            "actual_sessions": self.actual_sessions,
            "budget_error": self.budget_error,
            "dup_label": self.dup_label,
            "fp_mark": self.fp_mark, "cache_digest": self.cache_digest,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SurfaceManifest(Base):
    """可改面声明对象——禁改面不是靠 prompt 措辞。"""

    __tablename__ = "surface_manifests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    allow_edit_json: Mapped[str] = mapped_column(Text, default="[]")
    # 设计 §3.3 / §6.30 E 的四个结构字段（v24-doc-refresh D3：代码已建表，但四字段缺）
    path_pattern: Mapped[str] = mapped_column(String(512), default="")
    cap_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    structure_rules: Mapped[str] = mapped_column(Text, default="[]")
    exclusions: Mapped[str] = mapped_column(Text, default="[]")
    owner_id: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "name": self.name,
            "allow_edit": json.loads(self.allow_edit_json or "[]"),
            # 声明结构（设计要求的四件）：路径模式 / 体量上限 / 结构规则 / 显式排除
            "path_pattern": self.path_pattern,
            "cap_bytes": self.cap_bytes,
            "structure_rules": json.loads(self.structure_rules or "[]"),
            "exclusions": json.loads(self.exclusions or "[]"),
            "immutable": list(IMMUTABLE_PREFIXES),
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class GoldenSet(Base):
    """金标集实体（D10 / R7-1 终身门的**平台可校验**落点）。

    「冻结金标 + 异厂系 judge」此前是调用方自报的两个布尔——平台不校验等于门禁可绕过。
    - `frozen`：由管理员冻结动作置位（记 frozen_at / frozen_by），冻结后 cases 不许再改
      （改=解冻重冻，留审计）；
    - `produced_by`：金标产出厂牌。**异厂判定基准**：judge 厂牌 == produced_by ⇒ 拒绝
      （同厂评 own 出品有利益冲突；厂牌识别不了也拒绝——fail-closed）；
    - `eval_mark`：cases 的内容指纹（防污染闸的结构面比对物，词面绊线见 POLLUTION_MARKERS）。
    """

    __tablename__ = "golden_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(32), default="eval_set")
    cases_json: Mapped[str] = mapped_column(Text, default="[]")
    produced_by: Mapped[str] = mapped_column(String(64), default="")
    frozen: Mapped[bool] = mapped_column(Boolean, default=False)
    frozen_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    frozen_by: Mapped[str] = mapped_column(String(64), default="")
    eval_mark: Mapped[str] = mapped_column(String(128), default="")
    owner_id: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "name": self.name, "kind": self.kind,
            "cases_count": len(json.loads(self.cases_json or "[]")),
            "produced_by": self.produced_by,
            "frozen": bool(self.frozen),
            "frozen_at": self.frozen_at.isoformat() if self.frozen_at else None,
            "frozen_by": self.frozen_by, "eval_mark": self.eval_mark,
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class PromotionReview(Base):
    """晋升评审账（R7-4/R7-5）：每次 propose 都落一行，`no_entry` 也记（记统计不记失败）。"""

    __tablename__ = "promotion_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    memory_id: Mapped[int] = mapped_column(Integer, index=True)
    verdict: Mapped[str] = mapped_column(String(16), default="no_entry", index=True)
    fields_complete: Mapped[int] = mapped_column(Integer, default=0)
    causal_check: Mapped[int] = mapped_column(Integer, default=1)
    pollution_scan: Mapped[int] = mapped_column(Integer, default=0)
    reviewer: Mapped[str] = mapped_column(String(64), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id, "memory_id": self.memory_id, "verdict": self.verdict,
            "fields_complete": bool(self.fields_complete),
            "causal_check": bool(self.causal_check),
            "pollution_scan": bool(self.pollution_scan),
            "reviewer": self.reviewer, "note": self.note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RsiSwitch(Base):
    """自动化类目开关（R6-4）。**关闭 = 自动体已暂停**；四类之外不存在开关。"""

    __tablename__ = "rsi_switches"

    category: Mapped[str] = mapped_column(String(16), primary_key=True)
    enabled: Mapped[int] = mapped_column(Integer, default=1)
    updated_by: Mapped[str] = mapped_column(String(64), default="")
    # D11（设计 §3.3）：操作必填原因——停用是「必须人批」的状态转换动作，原因进列进审计
    last_reason: Mapped[str] = mapped_column(String(512), default="")
    last_actor: Mapped[str] = mapped_column(String(64), default="")
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "category": self.category, "enabled": bool(self.enabled),
            "last_reason": self.last_reason, "last_actor": self.last_actor,
            "state": "running" if self.enabled else "paused",
            "label": "自动体已暂停" if not self.enabled else "自动体运行中",
            "updated_by": self.updated_by,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class BreakerState(Base):
    __tablename__ = "breaker_states"

    name: Mapped[str] = mapped_column(String(32), primary_key=True)
    status: Mapped[str] = mapped_column(String(16), default="closed")  # closed|open|half_open
    reason: Mapped[str] = mapped_column(String(255), default="")
    counter: Mapped[int] = mapped_column(Integer, default=0)
    opened_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=datetime.datetime.utcnow
    )

    def to_dict(self) -> dict:
        return {
            "name": self.name, "status": self.status, "reason": self.reason,
            "counter": self.counter,
            "opened_at": self.opened_at.isoformat() if self.opened_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
