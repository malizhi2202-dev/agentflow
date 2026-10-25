"""自动化中心（原型 6.20b / `automations.html` 9 节）的 ORM 模型。

一条自动化 = **三段构成**：Runbook（目标/背景/约束/步骤）⟂ 负责人（Agent 或 Squad 二轨）
⟂ 触发器（N 个，schedule / webhook 两类）。三段各存各的账，改一段不覆盖另两段——
所以 `runbook` 单独一列存 JSON，负责人两列（轨 + 引用 id），触发器独立一张表。

为什么还要 `spec_version`：原型 ⑨ 的自证条款要求「每次运行记当时那份规则的快照版本」，
熔断与回归时能指回「触发当时按哪份规则跑的」。实质改动（Runbook / 负责人 / 触发器 /
执行模式）追加版本号，改名字不算——改名不转移责任。

为什么 `enabled` 与 `status` 并存：⑧ 的两本账必须能分开判定。
`status` 是**这条规则被谁怎么处置**（enabled / paused / archived，人点或熔断写的），
`enabled` 是**当下是否接收入口**；熔断另记 `breaker_open`，因为「熔断打开」要能带着
原因单独恢复，且恢复必须人点（止损非自愈，不自动重试）。
"""
import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from models import Base

# 触发器两类 + 保留 v14 的 api 作第三类（原型 ⑨：multica 只有两类，api 是我方自扩展）
# D6：三型——api 型是我方自扩展通道（设计 §6.31 B「收口成本限定在 kind 枚举一处」）
TRIGGER_KINDS = ("schedule", "webhook", "api")
# 执行模式两档：留痕在任务上 ⟂ 只进运行史
EXEC_MODES = ("create_issue", "run_only")
# 负责人二轨，不可混指
OWNER_TRACKS = ("agent", "squad")
# 规则状态三态（归档 = 删除的软形态，历史账全部保留）
# D6/D7：设计 §3.3 状态集含 `disabled`——小队归档时指向它的自动化转 disabled（不静默删行）
STATUSES = ("enabled", "disabled", "paused", "archived")
# 运行史状态：skipped / cancelled / duplicate 是「不跑」的三类，都不计入失败率分母
RUN_STATUSES = ("queued", "running", "completed", "failed", "skipped", "cancelled")
# 投递记录状态：accepted 派生成运行；skipped/ignored/duplicate 是业务性不跑；rejected 是技术性拒绝
DELIVERY_STATUSES = ("accepted", "skipped", "ignored", "duplicate", "rejected")

# 载荷上限默认值（字节）。原型写 256KiB，本轮按任务书口径收紧到 64KiB 并在界面写明字节数。
DEFAULT_PAYLOAD_LIMIT = 64 * 1024
DEFAULT_TIMEZONE = "Asia/Shanghai"


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    runbook: Mapped[str] = mapped_column(Text, default="{}")        # JSON：goal/background/constraints/steps
    owner_track: Mapped[str] = mapped_column(String(16), default="agent")
    owner_id_ref: Mapped[str] = mapped_column(String(64), default="")
    exec_mode: Mapped[str] = mapped_column(String(16), default="run_only")
    status: Mapped[str] = mapped_column(String(16), default="enabled")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    breaker_open: Mapped[bool] = mapped_column(Boolean, default=False)
    breaker_reason: Mapped[str] = mapped_column(Text, default="")
    paused_reason: Mapped[str] = mapped_column(Text, default="")
    spec_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class AutomationTrigger(Base):
    __tablename__ = "automation_triggers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    automation_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(16), default="schedule")
    # schedule 用：5 段 cron（无秒位）+ IANA 时区
    cron: Mapped[str] = mapped_column(String(64), default="")
    timezone: Mapped[str] = mapped_column(String(64), default=DEFAULT_TIMEZONE)
    # webhook 用：secret 存 token 的 sha256（不落明文，回显只给 secret_preview）
    secret: Mapped[str] = mapped_column(String(128), default="", index=True)
    secret_preview: Mapped[str] = mapped_column(String(64), default="")
    # 事件过滤：[{"event": "push", "actions": ["opened"]}, ...]；空 = 全收（不是全拒）
    event_filter: Mapped[str] = mapped_column(Text, default="[]")
    payload_limit: Mapped[int] = mapped_column(Integer, default=DEFAULT_PAYLOAD_LIMIT)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class AutomationRun(Base):
    """第一级账本：**跑了什么**（每条触发一行，含 skipped 这类「不跑」）。"""
    __tablename__ = "automation_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    automation_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    trigger_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="queued")
    summary: Mapped[str] = mapped_column(Text, default="")
    error: Mapped[str] = mapped_column(Text, default="")
    # 失败原因要能分「门」与「活」：门 = 签名/权限/门禁，活 = 业务执行失败
    error_kind: Mapped[str] = mapped_column(String(16), default="")
    spec_version: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    finished_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)


class AutomationDelivery(Base):
    """第二级账本：**外面投了什么**（每次到达一行，跑没跑都记）。"""
    __tablename__ = "automation_deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    automation_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    trigger_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    external_id: Mapped[str] = mapped_column(String(128), default="")
    event: Mapped[str] = mapped_column(String(128), default="")   # 六步推断的结果
    payload_bytes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="accepted")
    response_code: Mapped[int] = mapped_column(Integer, default=200)
    dedup_key: Mapped[str] = mapped_column(String(128), default="")
    # D6：设计要求「两键分开记账」——通用 Idempotency-Key 与 GitHub X-GitHub-Delivery
    # 语义不同（前者跨投递方、后者跨重投），**不能合成一个键**（合成 = 一方来键会吃掉另一方）。
    idem_key: Mapped[str] = mapped_column(String(128), default="", index=True)
    delivery_key: Mapped[str] = mapped_column(String(128), default="", index=True)
    error: Mapped[str] = mapped_column(Text, default="")
    replayed_from: Mapped[int | None] = mapped_column(Integer, nullable=True)
    received_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)


class RuleVersion(Base):
    """规则版本**不可变行账**（设计 §3.3 / §6.31 H/I）。

    每版一行快照：`version` + `spec_json` + `reason` + `created_by`。
    - 运行史每行带 `spec_version`（`automation_runs.spec_version`），能指回「触发当时是哪一版规则」；
    - 界面显示 v1…vN + 版本 diff 只读 +「为何停用」可查；
    - **不删被引用中的旧快照**（时间线要能复盘当时的规则）。
    """

    __tablename__ = "rule_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    automation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("automations.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    spec_json: Mapped[str] = mapped_column(Text, default="{}")
    reason: Mapped[str] = mapped_column(String(512), default="")
    created_by: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (UniqueConstraint("automation_id", "version", name="ux_rule_versions_auto_ver"),)

    def to_dict(self) -> dict:
        import json

        return {
            "id": self.id, "automation_id": self.automation_id, "version": self.version,
            "spec": json.loads(self.spec_json or "{}"),
            "reason": self.reason, "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
