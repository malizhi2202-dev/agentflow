"""自动化中心业务层（P3-1，原型 `automations.html` 九节）。

口径（照原型，不自己发明）：
- **三段构成**：Runbook ⟂ 负责人（Agent / Squad 二轨，不可混指）⟂ 触发器（N 个）；
  改一段不覆盖另两段。
- **触发器两类**：`schedule`（一行可多条，5 段 cron 无秒位 + IANA 时区 + 服务端算 next_runs）
  与 `webhook`（token 即凭据、遮蔽显示、Rotate 后旧 URL 立即失效）。
- **两级账本**：运行史（跑了什么）⟂ 投递记录（外面投了什么），跑没跑都记。
- **治理三态**：熔断 / 手动暂停 / 归档，三种后果各不同；恢复必须人点（止损非自愈）。
- **两本账**：`can_manage`（谁能管这条）与 `can_run`（这条能不能真跑 = enabled 且 breaker 未开）
  分开判定、分开返回——「改对了规则仍 403 not_callable」是合法结果，界面必须分开显示。
- 可见性 = owner 或平台管理员；越权与不存在统一 404（不用状态码探测他人资源）。

为什么 cron / next_runs 不用第三方库：本仓零新增依赖是纪律（ponytail），而 5 段 cron 的解析
只需标准库；`zoneinfo` 自带 IANA 库（Python 3.9+），DST 跳变由「墙钟往返归一化」检出。
next_runs 是**真算**的：按天枚举 → 命中日再展开时分秒，不是写死示例。
"""
from __future__ import annotations

import datetime
import hashlib
import json
import secrets
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from models.automation import (
    DEFAULT_PAYLOAD_LIMIT,
    DEFAULT_TIMEZONE,
    EXEC_MODES,
    OWNER_TRACKS,
    TRIGGER_KINDS,
    Automation,
    AutomationDelivery,
    AutomationRun,
    AutomationTrigger,
    RuleVersion,
)

# 失败率熔断门（原型 ⑦/⑨ 与小队页 ⑥ 同一数值口径）
FAILURE_WINDOW_DAYS = 7
BREAKER_MIN_SAMPLE = 50
BREAKER_RATE = 0.9
# 归档不删历史：运行史与投递记录只读可查
RUNBOOK_FIELDS = ("goal", "background", "constraints", "steps")
class AutomationError(ValueError):
    """业务校验失败 → 400（路由层映射）。"""


class AutomationNotFound(LookupError):
    """不可见 / 不存在 → 404（两者同码，不用状态码探测他人资源）。"""


class AutomationConflict(AutomationError):
    """重名等冲突 → 409。"""


# ── cron（5 段，无秒位）─────────────────────────────────────

# (键, 中文名, 最小值, 最大值)
_CRON_FIELDS = (
    ("minute", "分", 0, 59),
    ("hour", "时", 0, 23),
    ("dom", "日", 1, 31),
    ("month", "月", 1, 12),
    ("dow", "周", 0, 6),
)


def _parse_cron_field(part: str, label: str, lo: int, hi: int) -> set[int]:
    values: set[int] = set()
    for chunk in part.split(","):
        chunk = chunk.strip()
        if not chunk:
            raise AutomationError(f"cron {label}段出现空项（例：*/5,1-3）")
        step = 1
        if "/" in chunk:
            chunk, raw_step = chunk.split("/", 1)
            if not raw_step.isdigit() or int(raw_step) <= 0:
                raise AutomationError(f"cron {label}段步长「/{raw_step}」必须是正整数")
            step = int(raw_step)
        if chunk == "*":
            start, end = lo, hi
        elif "-" in chunk:
            head, _, tail = chunk.partition("-")
            if not head.isdigit() or not tail.isdigit():
                raise AutomationError(f"cron {label}段「{chunk}」不是 a-b 形式")
            start, end = int(head), int(tail)
        elif chunk.isdigit():
            start = int(chunk)
            end = start if step == 1 else hi
        else:
            raise AutomationError(
                f"cron {label}段「{chunk}」不合法：只支持 * / n / a-b / a-b/n / 逗号列表")
        if start > end:
            raise AutomationError(f"cron {label}段「{chunk}」区间反了（{start}-{end}）")
        if start < lo or end > hi:
            raise AutomationError(f"cron {label}段「{chunk}」越界（允许 {lo}-{hi}）")
        values.update(range(start, end + 1, step))
    return values


def parse_cron(expr: str) -> dict:
    """解析 5 段 cron（分 时 日 月 周）；非法即 AutomationError（不静默按「永不触发」存）。"""
    raw = str(expr or "").strip()
    if not raw:
        raise AutomationError("cron 不能为空：需要 5 段（分 时 日 月 周）")
    parts = raw.split()
    if len(parts) == 6:
        raise AutomationError(
            "cron 只能是 5 段（分 时 日 月 周）：本仓不支持秒位，最小粒度 1 分钟")
    if len(parts) != 5:
        raise AutomationError(f"cron 必须是 5 段（分 时 日 月 周），当前 {len(parts)} 段：{raw}")
    spec: dict = {}
    for part, (key, label, lo, hi) in zip(parts, _CRON_FIELDS):
        spec[key] = _parse_cron_field(part, label, lo, hi)
        spec[f"{key}_any"] = part.strip() == "*"
    return spec


def resolve_timezone(name: str | None) -> ZoneInfo:
    """IANA 名称校验（默认 Asia/Shanghai；非默认由调用方显式标注）。"""
    raw = str(name or DEFAULT_TIMEZONE).strip() or DEFAULT_TIMEZONE
    try:
        return ZoneInfo(raw)
    except Exception:  # noqa: BLE001 — ZoneInfoNotFoundError / ValueError 都归一种错因
        raise AutomationError(
            f"时区「{raw}」不是 IANA 名称（例：Asia/Shanghai / America/New_York / Europe/Berlin）")


def _day_matches(spec: dict, day: datetime.date) -> bool:
    if day.month not in spec["month"]:
        return False
    dom_ok = day.day in spec["dom"]
    dow_ok = ((day.weekday() + 1) % 7) in spec["dow"]   # cron 的 0 = 周日
    # 标准 cron 口径：日/周两段都限定时取「或」，只限一段时取「与」
    if spec["dom_any"] or spec["dow_any"]:
        return dom_ok and dow_ok
    return dom_ok or dow_ok


def next_runs(expr: str, timezone_name: str | None = DEFAULT_TIMEZONE,
              count: int = 3, now: datetime.datetime | None = None) -> list[str]:
    """真算接下来 N 次触发时刻（本地时区 ISO 8601，含偏移）。"""
    spec = parse_cron(expr)
    zone = resolve_timezone(timezone_name)
    now_utc = now or datetime.datetime.now(datetime.timezone.utc)
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=datetime.timezone.utc)
    local_now = now_utc.astimezone(zone)
    out: list[str] = []
    day = local_now.date()
    # 每年一次这类表达式要往后翻几年才够 count 条：按天扫，上限 6 年
    for _ in range(366 * 6):
        if len(out) >= count:
            break
        if _day_matches(spec, day):
            for hour in sorted(spec["hour"]):
                for minute in sorted(spec["minute"]):
                    naive = datetime.datetime(day.year, day.month, day.day, hour, minute)
                    candidate = naive.replace(tzinfo=zone)
                    # 春季跳变不存在该墙钟时刻：往返归一化后会变，跳过而不是硬报一个假时刻
                    normal = candidate.astimezone(datetime.timezone.utc).astimezone(zone)
                    if normal.replace(tzinfo=None) != naive:
                        continue
                    if normal > local_now:
                        out.append(normal.isoformat())
                        if len(out) >= count:
                            break
                if len(out) >= count:
                    break
        day += datetime.timedelta(days=1)
    return out


# ── 触发器：token / 事件过滤 ────────────────────────────────

WEBHOOK_TOKEN_PREFIX = "af_wh_"


def _hash_token(token: str) -> str:
    """只落 sha256：库被读走也拿不到明文 token（写-only 不回显）。"""
    return hashlib.sha256(str(token).encode("utf-8")).hexdigest()


def mask_token(token: str) -> str:
    """遮蔽显示：`af_wh_9f4c…e21`（与原型同形）。"""
    if not token:
        return ""
    if len(token) <= 12:
        return token[:3] + "…"
    return f"{token[:12]}…{token[-3:]}"


def _new_webhook_token() -> tuple[str, str, str]:
    token = WEBHOOK_TOKEN_PREFIX + secrets.token_hex(12)
    return token, _hash_token(token), mask_token(token)


def _normalize_event_filter(raw) -> list[dict]:
    """事件过滤：`[{event, actions?}]`；空 = 全收（不是全拒）。"""
    if raw in (None, "", []):
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw or "[]")
        except json.JSONDecodeError:
            raise AutomationError("事件过滤不是合法 JSON：应为 [{event, actions}] 数组")
    if not isinstance(raw, list):
        raise AutomationError("事件过滤必须是数组：[{event, actions}]")
    out: list[dict] = []
    for row in raw:
        if isinstance(row, str):
            row = {"event": row}
        if not isinstance(row, dict) or not str(row.get("event") or "").strip():
            raise AutomationError("事件过滤每行必须有 event（可带 actions 数组）")
        actions = row.get("actions") or []
        if isinstance(actions, str):
            actions = [actions]
        out.append({"event": str(row["event"]).strip(),
                    "actions": [str(a) for a in actions]})
    return out


def _event_matches(event_filter: list[dict], event: str, action: str) -> bool:
    if not event_filter:
        return True   # 空规则 = 全收
    for row in event_filter:
        if row.get("event") not in (event, "*"):
            continue
        actions = row.get("actions") or []
        if not actions or action in actions:
            return True
    return False


# ── 可见性 / 权限两本账 ────────────────────────────────────

def is_admin(user: dict) -> bool:
    return user.get("role") == "admin"


def is_owner_or_admin(user: dict, auto: Automation) -> bool:
    return auto.owner_id == user.get("id") or is_admin(user)


def get_visible(db: Session, automation_id: int, user: dict) -> Automation:
    auto = db.query(Automation).filter(Automation.id == automation_id).first()
    if auto is None or not is_owner_or_admin(user, auto):
        raise AutomationNotFound("自动化不存在")
    return auto


def list_visible(db: Session, user: dict) -> list[Automation]:
    q = db.query(Automation)
    if not is_admin(user):
        q = q.filter(Automation.owner_id == user.get("id"))
    return q.order_by(Automation.id.desc()).all()


def permission_books(auto: Automation, user: dict) -> dict:
    """⑧ 两本账：能不能管 ⟂ 能不能真跑。两条判定互不推导。"""
    manage_ok = is_owner_or_admin(user, auto)
    manage = {
        "allowed": manage_ok,
        "reason": None if manage_ok else "permission_denied_editor",
        "detail": "创建者 + 平台管理员可编辑 / 启停 / 归档 / Rotate 触发器",
    }
    allowed, reason, detail = run_gate(auto)
    return {"manage": manage, "run": {"allowed": allowed, "reason": reason, "detail": detail}}


def run_gate(auto: Automation) -> tuple[bool, str | None, str]:
    """「这条能不能真跑」的**唯一判定**：enabled + 未归档 + 熔断未开。

    不做成 `enabled and not breaker_open` 散落在各调用点：webhook 入口与界面展示
    必须同一份判定，否则会出现「界面说能跑、投递说 skip」的假绿。
    """
    if auto.status == "archived":
        return False, "archived", "已归档：停未来全部触发，历史运行史与投递记录只读可查"
    if auto.breaker_open:
        return False, "breaker_open", "失败率熔断已打开：修好后必须人点恢复（止损非自愈）"
    if auto.status == "disabled":
        return False, "disabled", (
            "已自动停用（D7：指向的小队已归档）：规则与历史账保留，"
            "重新指派新小队后手动启用（不静默删行，也不自动恢复）")
    if not auto.enabled or auto.status == "paused":
        return False, "paused", "已手动暂停：schedule / webhook / Run now 三个入口一起停"
    return True, None, "enabled 且熔断未打开 ⇒ 各入口可派生成运行"


# ── 失败率（7d）与熔断门 ───────────────────────────────────

def failure_stats(db: Session, automation_id: int, days: int = FAILURE_WINDOW_DAYS,
                  now: datetime.datetime | None = None) -> dict:
    """近 N 天失败率：分母 = 完结（completed + failed）；skipped / cancelled 不计。"""
    end = now or datetime.datetime.utcnow()
    start = end - datetime.timedelta(days=days)
    rows = db.query(AutomationRun).filter(
        AutomationRun.automation_id == automation_id,
        AutomationRun.started_at >= start,
    ).all()
    completed = sum(1 for r in rows if r.status == "completed")
    failed = sum(1 for r in rows if r.status == "failed")
    sample = completed + failed
    rate = (failed / sample) if sample else None
    return {
        "window_days": days,
        "completed": completed,
        "failed": failed,
        "skipped": sum(1 for r in rows if r.status == "skipped"),
        "cancelled": sum(1 for r in rows if r.status == "cancelled"),
        "sample": sample,
        "rate": rate,
        "breaker_gate": bool(sample >= BREAKER_MIN_SAMPLE and rate is not None
                             and rate >= BREAKER_RATE),
        "breaker_rule": f"近 {days} 天 ≥{BREAKER_MIN_SAMPLE} 次完结且失败率 ≥{int(BREAKER_RATE * 100)}%",
    }


# ── 序列化 ────────────────────────────────────────────────

def _load_runbook(auto: Automation) -> dict:
    try:
        data = json.loads(auto.runbook or "{}")
    except json.JSONDecodeError:
        data = {}
    return {k: str(data.get(k) or "") for k in RUNBOOK_FIELDS}


def _trigger_dict(trigger: AutomationTrigger) -> dict:
    row = {
        "id": trigger.id,
        "kind": trigger.kind,
        "enabled": bool(trigger.enabled),
        "cron": trigger.cron or "",
        "timezone": trigger.timezone or DEFAULT_TIMEZONE,
        "secret_preview": trigger.secret_preview or "",
        "payload_limit": int(trigger.payload_limit or DEFAULT_PAYLOAD_LIMIT),
        "payload_limit_human": (
            f"{int(trigger.payload_limit or DEFAULT_PAYLOAD_LIMIT)} 字节"
            f"（{int(trigger.payload_limit or DEFAULT_PAYLOAD_LIMIT) // 1024} KiB）"),
        "created_at": trigger.created_at.isoformat() if trigger.created_at else None,
    }
    try:
        row["event_filter"] = json.loads(trigger.event_filter or "[]")
    except json.JSONDecodeError:
        row["event_filter"] = []
    if trigger.kind == "schedule":
        if trigger.enabled:
            try:
                row["next_runs"] = next_runs(trigger.cron, trigger.timezone, 3)
                row["next_runs_note"] = (
                    None if (trigger.timezone or DEFAULT_TIMEZONE) == DEFAULT_TIMEZONE
                    else f"非默认时区已标注：{trigger.timezone}")
            except AutomationError as e:
                # 账上有非法 cron（历史脏数据）也要能列出来，不能整页 500
                row["next_runs"] = []
                row["next_runs_note"] = f"cron 无法解析：{e}"
        else:
            # 停用中的触发器不显示未来时刻，避免看着像在跑
            row["next_runs"] = []
            row["next_runs_note"] = "停用中 · 无未来触发"
    else:
        row["webhook_path"] = f"/api/webhooks/automations/{trigger.secret_preview or '（已轮换）'}"
    return row


def _owner_ref_name(db: Session, auto: Automation) -> str | None:
    """负责人轨的展示名：Agent 轨能解析就带上名字（解析不了就如实留空）。"""
    if auto.owner_track != "agent" or not str(auto.owner_id_ref or "").isdigit():
        return None
    try:
        from models.agent import Agent
        agent = db.query(Agent).filter(Agent.id == int(auto.owner_id_ref)).first()
        return agent.name if agent else None
    except Exception:  # noqa: BLE001 — 展示用，失败不影响业务
        return None


def describe(db: Session, auto: Automation, user: dict, with_triggers: bool = True) -> dict:
    row = {
        "id": auto.id,
        "name": auto.name,
        "runbook": _load_runbook(auto),
        "owner_track": auto.owner_track,
        "owner_id_ref": auto.owner_id_ref,
        "owner_ref_name": _owner_ref_name(db, auto),
        "exec_mode": auto.exec_mode,
        "status": auto.status,
        "enabled": bool(auto.enabled),
        "breaker_open": bool(auto.breaker_open),
        "breaker_reason": auto.breaker_reason or "",
        "paused_reason": auto.paused_reason or "",
        "spec_version": int(auto.spec_version or 1),
        "owner_id": auto.owner_id,
        "created_at": auto.created_at.isoformat() if auto.created_at else None,
        "updated_at": auto.updated_at.isoformat() if auto.updated_at else None,
        "permissions": permission_books(auto, user),
        "failure_7d": failure_stats(db, auto.id),
    }
    if with_triggers:
        triggers = db.query(AutomationTrigger).filter(
            AutomationTrigger.automation_id == auto.id
        ).order_by(AutomationTrigger.id.asc()).all()
        rows = [_trigger_dict(t) for t in triggers]
        row["triggers"] = rows
        row["trigger_count"] = len(rows)
        row["trigger_summary"] = _trigger_summary(rows)
        schedule_rows = [r for r in rows if r["kind"] == "schedule" and r["enabled"]]
        row["next_runs"] = schedule_rows[0]["next_runs"] if schedule_rows else []
        row["next_runs_trigger_id"] = schedule_rows[0]["id"] if schedule_rows else None
    else:
        triggers = db.query(AutomationTrigger).filter(
            AutomationTrigger.automation_id == auto.id
        ).order_by(AutomationTrigger.id.asc()).all()
        row["triggers"] = []
        row["trigger_count"] = len(triggers)
        row["trigger_summary"] = _trigger_summary(
            [{"kind": t.kind, "cron": t.cron, "timezone": t.timezone, "enabled": bool(t.enabled)}
             for t in triggers])
        schedule = next((t for t in triggers if t.kind == "schedule" and t.enabled), None)
        try:
            row["next_runs"] = next_runs(schedule.cron, schedule.timezone, 3) if schedule else []
        except AutomationError:
            row["next_runs"] = []
        row["next_runs_trigger_id"] = schedule.id if schedule else None
    return row


def _trigger_summary(rows: list[dict]) -> str:
    if not rows:
        return "无触发器（只能 Run now）"
    parts = []
    for row in rows:
        if row["kind"] == "schedule":
            parts.append(f"schedule {row.get('cron')} {row.get('timezone')}"
                         + ("" if row.get("enabled") else "（停用）"))
        else:
            parts.append("webhook" + ("" if row.get("enabled") else "（停用）"))
    return " · ".join(parts)


# ── 写路径：创建 / 三段构成 / 触发器 ────────────────────────

def _normalize_runbook(raw) -> dict:
    if not isinstance(raw, dict):
        raise AutomationError("Runbook 必须是对象：{goal, background, constraints, steps}")
    data = {k: str(raw.get(k) or "").strip() for k in RUNBOOK_FIELDS}
    if not data["goal"]:
        raise AutomationError("Runbook 目标不能为空：一句话说清要达成什么（可判成败）")
    return data


def _check_name(db: Session, owner_id: str, name: str, exclude_id: int | None = None) -> None:
    if not name:
        raise AutomationError("名称不能为空")
    dup = db.query(Automation).filter(Automation.owner_id == owner_id,
                                      Automation.name == name).all()
    if any(a.id != exclude_id for a in dup):
        raise AutomationConflict(f"同工作区已有同名自动化「{name}」")


def create(db: Session, user: dict, payload: dict) -> Automation:
    name = str(payload.get("name") or "").strip()
    _check_name(db, user["id"], name)
    track = str(payload.get("owner_track") or "agent")
    if track not in OWNER_TRACKS:
        raise AutomationError(f"负责人轨只能是 agent 或 squad，当前「{track}」")
    ref = str(payload.get("owner_id_ref") or "").strip()
    if not ref:
        raise AutomationError("负责人不能为空：二轨（Agent / Squad）各须指一个目标，不可混指")
    exec_mode = str(payload.get("exec_mode") or "run_only")
    if exec_mode not in EXEC_MODES:
        raise AutomationError(f"执行模式只能是 create_issue 或 run_only，当前「{exec_mode}」")
    auto = Automation(
        owner_id=user["id"], name=name,
        runbook=json.dumps(_normalize_runbook(payload.get("runbook") or {}), ensure_ascii=False),
        owner_track=track, owner_id_ref=ref, exec_mode=exec_mode,
        status="enabled", enabled=True, spec_version=1,
    )
    db.add(auto)
    db.commit()
    db.refresh(auto)
    # D5：创建即有 v1 快照（界面显示 v1…vN 的起点）
    record_rule_version(db, auto, reason="创建", created_by=user["id"])
    return auto


def update_sections(db: Session, auto: Automation, payload: dict) -> Automation:
    """三段构成分别可改：只有出现在 payload 里的段才动（互不覆盖）。"""
    touched: list[str] = []
    if "runbook" in payload:
        auto.runbook = json.dumps(_normalize_runbook(payload["runbook"]), ensure_ascii=False)
        touched.append("runbook")
    if "owner_track" in payload or "owner_id_ref" in payload:
        track = str(payload.get("owner_track") or auto.owner_track)
        ref = str(payload.get("owner_id_ref", auto.owner_id_ref) or "").strip()
        if track not in OWNER_TRACKS:
            raise AutomationError(f"负责人轨只能是 agent 或 squad，当前「{track}」")
        if not ref:
            raise AutomationError("负责人不能为空：二轨各须指一个目标，不可混指")
        auto.owner_track, auto.owner_id_ref = track, ref
        touched.append("owner")
    if "exec_mode" in payload:
        mode = str(payload["exec_mode"] or "")
        if mode not in EXEC_MODES:
            raise AutomationError(f"执行模式只能是 create_issue 或 run_only，当前「{mode}」")
        if mode != auto.exec_mode:
            auto.exec_mode = mode
            touched.append("exec_mode")
    if "name" in payload:
        name = str(payload["name"] or "").strip()
        _check_name(db, auto.owner_id, name, exclude_id=auto.id)
        if name != auto.name:
            auto.name = name
            touched.append("name")
    # 实质发布才追加版本号：改名不追加（改名不转移责任）
    bumped = bool(set(touched) - {"name"})
    if bumped:
        auto.spec_version = int(auto.spec_version or 1) + 1
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(auto)
    if bumped:  # D5：每次版本递增留一行不可变快照
        record_rule_version(db, auto, reason="修改：" + ",".join(touched),
                            created_by=auto.owner_id)
    return auto


def add_trigger(db: Session, auto: Automation, payload: dict) -> tuple[AutomationTrigger, str | None]:
    kind = str(payload.get("kind") or "schedule")
    if kind not in TRIGGER_KINDS:
        raise AutomationError(f"触发器只有 schedule、webhook、api 三类，当前「{kind}」")
    trigger = AutomationTrigger(automation_id=auto.id, kind=kind,
                                enabled=bool(payload.get("enabled", True)))
    token_plain = None
    if kind == "schedule":
        cron = str(payload.get("cron") or "").strip()
        tz = str(payload.get("timezone") or DEFAULT_TIMEZONE).strip() or DEFAULT_TIMEZONE
        parse_cron(cron)              # 非法即抛：不静默存成「永不触发」
        resolve_timezone(tz)
        trigger.cron, trigger.timezone = cron, tz
    else:
        # webhook 与 api 都是「外部/自扩展投递」：token 即凭据（写-only）。
        # 差别在**入口**：webhook 走公开 URL（`/api/webhooks/automations/{token}`），
        # api 型走平台内自扩展通道（`invoke_api_trigger`，同样以 token 为凭据）。
        token_plain, hashed, preview = _new_webhook_token()
        trigger.secret, trigger.secret_preview = hashed, preview
        trigger.event_filter = json.dumps(_normalize_event_filter(payload.get("event_filter")),
                                         ensure_ascii=False)
        trigger.payload_limit = int(payload.get("payload_limit") or DEFAULT_PAYLOAD_LIMIT)
        if trigger.payload_limit <= 0:
            raise AutomationError("载荷上限必须是正整数（字节）")
    db.add(trigger)
    db.flush()
    auto.spec_version = int(auto.spec_version or 1) + 1
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(trigger)
    # D5：规则版本不可变行账——每改一次规格留一行快照（能指回「触发当时是哪一版规则」）
    record_rule_version(db, auto, reason=f"新增 {kind} 触发器", created_by=auto.owner_id)
    return trigger, token_plain


def record_rule_version(db: Session, auto: Automation, *, reason: str = "",
                        created_by: str = "") -> RuleVersion:
    """D5：规则版本**不可变行账**（设计 §6.31 H/I）。

    - 运行史每行带 `spec_version`，能指回「触发当时是哪一版规则」；
    - 界面显示 v1…vN + 版本 diff 只读 +「为何停用」可查；
    - **不删被引用中的旧快照**（时间线要能复盘当时的规则）。
    """
    version = int(auto.spec_version or 1)
    row = db.query(RuleVersion).filter(
        RuleVersion.automation_id == auto.id, RuleVersion.version == version
    ).first()
    if row is not None:
        return row          # 同版本不重复落（幂等）
    row = RuleVersion(
        automation_id=auto.id, version=version,
        spec_json=json.dumps({"runbook": auto.runbook, "owner_track": auto.owner_track,
                               "owner_id_ref": auto.owner_id_ref, "exec_mode": auto.exec_mode,
                               "status": auto.status}, ensure_ascii=False),
        reason=reason or "", created_by=created_by or auto.owner_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_rule_versions(db: Session, automation_id: int) -> list[dict]:
    """版本 diff 只读列表：v1…vN。"""
    rows = db.query(RuleVersion).filter(
        RuleVersion.automation_id == int(automation_id)
    ).order_by(RuleVersion.version.asc()).all()
    return [r.to_dict() for r in rows]


def get_trigger(db: Session, auto: Automation, trigger_id: int) -> AutomationTrigger:
    trigger = db.query(AutomationTrigger).filter(
        AutomationTrigger.id == trigger_id,
        AutomationTrigger.automation_id == auto.id,
    ).first()
    if trigger is None:
        raise AutomationNotFound("触发器不存在")
    return trigger


def delete_trigger(db: Session, auto: Automation, trigger_id: int) -> dict:
    trigger = get_trigger(db, auto, trigger_id)
    kind = trigger.kind
    db.delete(trigger)
    auto.spec_version = int(auto.spec_version or 1) + 1
    db.commit()
    return {"ok": True, "deleted_kind": kind}


def toggle_trigger(db: Session, auto: Automation, trigger_id: int,
                   enabled: bool | None = None) -> AutomationTrigger:
    trigger = get_trigger(db, auto, trigger_id)
    trigger.enabled = (not bool(trigger.enabled)) if enabled is None else bool(enabled)
    db.commit()
    db.refresh(trigger)
    return trigger


def rotate_trigger(db: Session, auto: Automation, trigger_id: int) -> tuple[AutomationTrigger, str]:
    """Rotate URL：换 token，旧 URL 立即失效（写-only，明文只在这一次响应里给）。"""
    trigger = get_trigger(db, auto, trigger_id)
    if trigger.kind != "webhook":
        raise AutomationError("只有 webhook 触发器有 URL/token，schedule 不需要 Rotate")
    token, hashed, preview = _new_webhook_token()
    trigger.secret, trigger.secret_preview = hashed, preview
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(trigger)
    return trigger, token


def preview_cron(cron: str, timezone_name: str | None, count: int = 3) -> dict:
    """Next runs 预览：保存前必须看到（不预览不给保存）。"""
    rows = next_runs(cron, timezone_name, count)
    return {
        "cron": cron,
        "timezone": str(timezone_name or DEFAULT_TIMEZONE),
        "next_runs": rows,
        "note": "服务端解析 · 5 段无秒位 · 最小粒度 1 分钟",
    }


# ── 治理三态 ──────────────────────────────────────────────

def pause(db: Session, auto: Automation, reason: str = "") -> Automation:
    if auto.status == "archived":
        raise AutomationError("已归档的规则不能暂停：它已经没有未来触发")
    auto.enabled = False
    auto.status = "paused"
    auto.paused_reason = reason or "人工暂停"
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(auto)
    return auto


def resume(db: Session, auto: Automation) -> Automation:
    if auto.status == "archived":
        raise AutomationError("已归档的规则没有「恢复触发」：要再跑得新建一条（历史账保留）")
    # D7：disabled（小队归档自动停用）不自动恢复——重新指派新小队后由人点 resume（沉默≠同意）；
    # 人点了就照常启用。
    auto.enabled = True
    auto.status = "enabled"
    auto.paused_reason = ""
    auto.breaker_reason = ""
    auto.breaker_open = False
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(auto)
    return auto


def disable_for_squad(db: Session, squad_id: int) -> int:
    """D7 级联：小队归档 → 指向它的自动化转 disabled（不静默删行）。

    「指向」即负责人轨为 squad 且引用该小队（`owner_track='squad' + owner_id_ref`）。
    已归档（archived）的规则不动——它本来就没有未来触发。
    """
    rows = db.query(Automation).filter(
        Automation.owner_track == "squad",
        Automation.owner_id_ref == str(int(squad_id)),
        Automation.status.in_(["enabled", "paused", "disabled"]),
    ).all()
    n = 0
    for auto in rows:
        if auto.status == "disabled":
            continue
        auto.status = "disabled"
        auto.enabled = False
        auto.paused_reason = "自动停用：指向的小队已归档（D7；重新指派后可手动启用）"
        auto.updated_at = datetime.datetime.utcnow()
        n += 1
    db.commit()
    return n


def archive(db: Session, auto: Automation, reason: str = "") -> Automation:
    auto.status = "archived"
    auto.enabled = False
    auto.paused_reason = reason or "人工归档"
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(auto)
    return auto


def set_breaker(db: Session, auto: Automation, opened: bool, reason: str = "") -> Automation:
    """熔断开关：打开 = 停止止损（并自动暂停）；关闭 = 复位，但触发仍需人点恢复。"""
    if opened:
        auto.breaker_open = True
        auto.breaker_reason = reason or "失败率熔断"
        auto.enabled = False
        auto.status = "paused"
    else:
        auto.breaker_open = False
        auto.breaker_reason = ""
    auto.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(auto)
    return auto


# ── 两级账本 ──────────────────────────────────────────────

def runs(db: Session, auto: Automation, limit: int = 50) -> list[dict]:
    rows = db.query(AutomationRun).filter(
        AutomationRun.automation_id == auto.id
    ).order_by(AutomationRun.id.desc()).limit(limit).all()
    trigger_ids = {r.trigger_id for r in rows if r.trigger_id}
    labels = {}
    if trigger_ids:
        for t in db.query(AutomationTrigger).filter(AutomationTrigger.id.in_(trigger_ids)).all():
            labels[t.id] = f"{t.kind}#{t.id}"
    return [{
        "id": r.id,
        "trigger_id": r.trigger_id,
        "trigger_label": labels.get(r.trigger_id, "Run now"),
        "status": r.status,
        "summary": r.summary or "",
        "error": r.error or "",
        "error_kind": r.error_kind or "",
        "spec_version": int(r.spec_version or 1),
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "finished_at": r.finished_at.isoformat() if r.finished_at else None,
    } for r in rows]


def deliveries(db: Session, auto: Automation, limit: int = 50) -> list[dict]:
    rows = db.query(AutomationDelivery).filter(
        AutomationDelivery.automation_id == auto.id
    ).order_by(AutomationDelivery.id.desc()).limit(limit).all()
    return [{
        "id": r.id,
        "trigger_id": r.trigger_id,
        "external_id": r.external_id or "",
        "event": r.event or "",
        "payload_bytes": int(r.payload_bytes or 0),
        "status": r.status,
        "response_code": int(r.response_code or 200),
        "dedup_key": r.dedup_key or "",
        # D6：两键分开记账对外可见（排查「谁把谁吃了」类幂等问题）
        "idem_key": r.idem_key or "", "delivery_key": r.delivery_key or "",
        "error": r.error or "",
        "replayed_from": r.replayed_from,
        # 不可重放只有两类：技术性拒绝（rejected）/ 无 body（payload_bytes = 0）
        "replayable": r.status != "rejected" and int(r.payload_bytes or 0) > 0,
        "replay_block_reason": (
            "技术性拒绝（载荷超限 / 非合法 JSON）不可重放" if r.status == "rejected"
            else "无 body 的投递不可重放" if int(r.payload_bytes or 0) == 0 else None),
        "received_at": r.received_at.isoformat() if r.received_at else None,
    } for r in rows]


# ── webhook 入口 ──────────────────────────────────────────

def _header(headers, name: str) -> str:
    for key, value in (headers or {}).items():
        if str(key).lower() == name.lower():
            return str(value)
    return ""


def infer_event(body: dict, headers) -> tuple[str, str, int]:
    """六步事件推断（按序取第一个命中）：返回 (event, action, 命中步骤号)。"""
    if isinstance(body, dict):
        raw = body.get("event")
        if isinstance(raw, str) and raw.strip():
            return raw.strip(), str(body.get("action") or ""), 1
    gh = _header(headers, "x-github-event")
    if gh:
        return gh, str((body or {}).get("action") or "") if isinstance(body, dict) else "", 2
    gl = _header(headers, "x-gitlab-event")
    if gl:
        return gl, "", 3
    et = _header(headers, "x-event-type")
    if et:
        return et, "", 4
    if isinstance(body, dict):
        for key in ("type", "action"):
            raw = body.get(key)
            if isinstance(raw, str) and raw.strip():
                return raw.strip(), str(body.get("action") or "") if key == "type" else "", 5
    return "webhook.received", "", 6


def _record_delivery(db: Session, auto: Automation, trigger: AutomationTrigger | None, *,
                     external_id: str, event: str, payload_bytes: int, status: str,
                     response_code: int, dedup_key: str = "", error: str = "",
                     idem_key: str = "", delivery_key: str = "") -> AutomationDelivery:
    row = AutomationDelivery(
        automation_id=auto.id, trigger_id=trigger.id if trigger else None,
        external_id=external_id, event=event, payload_bytes=payload_bytes,
        status=status, response_code=response_code, dedup_key=dedup_key, error=error,
        # D6：两键分开记账（不合成）
        idem_key=idem_key or "", delivery_key=delivery_key or "",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _find_by_keys(db: Session, auto: Automation, *, idem_key: str = "",
                  delivery_key: str = "") -> AutomationDelivery | None:
    """按**两键分别**查已记的投递。

    D6：通用 `Idempotency-Key` 与 GitHub `X-GitHub-Delivery` 语义不同（前者跨投递方、
    后者跨重投）。合成一个键会让**一方的键吃掉另一方的投递**——所以分开查、分开记。
    """
    q = db.query(AutomationDelivery).filter(
        AutomationDelivery.automation_id == auto.id,
        AutomationDelivery.status != "duplicate",
    )
    if idem_key:
        q = q.filter(AutomationDelivery.idem_key == idem_key)
    elif delivery_key:
        q = q.filter(AutomationDelivery.delivery_key == delivery_key)
    else:
        return None
    return q.first()


def ingest_webhook(db: Session, token: str, headers, raw_body: bytes) -> tuple[int, dict]:
    """投递入口：token 即凭据。返回 (HTTP 码, 响应体)。

    闸门顺序即「六步收事件」之后的判定链：载荷上限 → JSON → 幂等键 → 事件过滤 →
    能不能真跑（enabled + breaker）→ 派生成运行。每一档都落投递记录（跑没跑都记）。
    """
    trigger = db.query(AutomationTrigger).filter(
        AutomationTrigger.secret == _hash_token(token),
        AutomationTrigger.kind == "webhook",
    ).first()
    if trigger is None:
        # 没有可归属的自动化：不落账（没有 external 主体可挂），直接 404
        return 404, {"semantics": "rejected", "detail": "webhook 不存在或已轮换（旧 URL 立即失效）"}

    auto = db.query(Automation).filter(Automation.id == trigger.automation_id).first()
    if auto is None:
        return 404, {"semantics": "rejected", "detail": "webhook 归属的自动化已不存在"}

    payload_bytes = len(raw_body or b"")
    limit = int(trigger.payload_limit or DEFAULT_PAYLOAD_LIMIT)
    # D6：两键分开记账——不再用 `or` 合成一个键
    idem_key = _header(headers, "idempotency-key")
    delivery_key = _header(headers, "x-github-delivery")
    dedup_key = idem_key or delivery_key      # 兼容列：仅作历史留痕
    external_id = delivery_key or ""

    if payload_bytes > limit:
        row = _record_delivery(db, auto, trigger, external_id=external_id, event="", 
                               payload_bytes=payload_bytes, status="rejected",
                               response_code=413, dedup_key=dedup_key, idem_key=idem_key, delivery_key=delivery_key,
                               error=f"载荷 {payload_bytes} 字节 > 上限 {limit} 字节（不截断后照跑）")
        return 413, {"semantics": "rejected", "delivery_id": row.id,
                     "detail": f"载荷 {payload_bytes} 字节超上限 {limit} 字节"}

    try:
        body = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except (UnicodeDecodeError, json.JSONDecodeError) as e:
        row = _record_delivery(db, auto, trigger, external_id=external_id, event="",
                               payload_bytes=payload_bytes, status="rejected",
                               response_code=400, dedup_key=dedup_key, idem_key=idem_key, delivery_key=delivery_key,
                               error=f"载荷不是合法 JSON：{e}")
        return 400, {"semantics": "rejected", "delivery_id": row.id, "detail": "载荷不是合法 JSON"}

    event, action, step = infer_event(body, headers)

    if idem_key or delivery_key:
        seen = _find_by_keys(db, auto, idem_key=idem_key, delivery_key=delivery_key)
        if seen is not None:
            row = _record_delivery(db, auto, trigger, external_id=external_id, event=event,
                                   payload_bytes=payload_bytes, status="duplicate",
                                   response_code=200, dedup_key=dedup_key,
                                   idem_key=idem_key, delivery_key=delivery_key,
                                   error=f"幂等键已在账上（投递 #{seen.id}），不新建运行")
            return 200, {"semantics": "duplicate", "delivery_id": row.id, "event": event,
                         "detail": "幂等键命中，已有那次在账上"}

    try:
        event_filter = json.loads(trigger.event_filter or "[]")
    except json.JSONDecodeError:
        event_filter = []
    if not _event_matches(event_filter, event, action):
        row = _record_delivery(db, auto, trigger, external_id=external_id, event=event,
                               payload_bytes=payload_bytes, status="ignored",
                               response_code=200, dedup_key=dedup_key, idem_key=idem_key, delivery_key=delivery_key,
                               error="事件过滤未命中")
        return 200, {"semantics": "ignored", "delivery_id": row.id, "event": event,
                     "detail": "事件过滤未命中，看完就放下（业务性不跑，回 200 防上游重试）"}

    books_allowed, run_reason, run_detail = run_gate(auto)
    if not trigger.enabled or not books_allowed:
        reason = "触发器已停用" if not trigger.enabled else f"规则当前不能真跑：{run_reason}（{run_detail}）"
        row = _record_delivery(db, auto, trigger, external_id=external_id, event=event,
                               payload_bytes=payload_bytes, status="skipped",
                               response_code=200, dedup_key=dedup_key, idem_key=idem_key, delivery_key=delivery_key, error=reason)
        return 200, {"semantics": "skipped", "delivery_id": row.id, "event": event,
                     "detail": reason}

    row = _record_delivery(db, auto, trigger, external_id=external_id, event=event,
                           payload_bytes=payload_bytes, status="accepted",
                           response_code=202, dedup_key=dedup_key, idem_key=idem_key, delivery_key=delivery_key)
    run = AutomationRun(
        automation_id=auto.id, trigger_id=trigger.id, status="queued",
        summary=f"webhook 已收（事件 {event}，六步推断第 {step} 步命中）；执行器未接入，尚未真正执行",
        spec_version=int(auto.spec_version or 1),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return 202, {"semantics": "accepted", "delivery_id": row.id, "run_id": run.id,
                 "event": event, "inferred_at_step": step,
                 "detail": "已收下并派生成运行；运行结果另在运行史里"}


def invoke_api_trigger(db: Session, token: str, headers, raw_body: bytes) -> tuple[int, dict]:
    """D6：api 型触发器 = 平台内自扩展通道的投递入口（设计 §6.31 B）。

    与 webhook 同一套闸门与两级账本（载荷上限 → JSON → 两键幂等 → 事件过滤 →
    能不能真跑 → 派生成运行）；差别只在**入口**：api 型不挂公开 URL，
    由已鉴权的平台调用方带触发器 token 走 `/api/automations/{id}/triggers/{tid}/invoke`。
    收口成本限定在 kind 枚举一处——这里 kind 判定与 webhook 分支同构。
    """
    trigger = db.query(AutomationTrigger).filter(
        AutomationTrigger.secret == _hash_token(token),
        AutomationTrigger.kind == "api",
    ).first()
    if trigger is None:
        return 404, {"semantics": "rejected", "detail": "api 触发器不存在或已轮换"}
    auto = db.query(Automation).filter(Automation.id == trigger.automation_id).first()
    if auto is None:
        return 404, {"semantics": "rejected", "detail": "触发器归属的自动化已不存在"}
    payload_bytes = len(raw_body or b"")
    limit = int(trigger.payload_limit or DEFAULT_PAYLOAD_LIMIT)
    idem_key = _header(headers, "idempotency-key")
    if payload_bytes > limit:
        row = _record_delivery(db, auto, trigger, external_id="", event="api.invoke",
                               payload_bytes=payload_bytes, status="rejected",
                               response_code=413, idem_key=idem_key,
                               error=f"载荷超上限 {limit} 字节")
        return 413, {"semantics": "rejected", "delivery_id": row.id, "detail": "载荷超限"}
    try:
        body = json.loads(raw_body or b"{}")
    except json.JSONDecodeError:
        body = {}
    if idem_key:
        seen = _find_by_keys(db, auto, idem_key=idem_key)
        if seen is not None:
            row = _record_delivery(db, auto, trigger, external_id="", event="api.invoke",
                                   payload_bytes=payload_bytes, status="duplicate",
                                   response_code=200, idem_key=idem_key,
                                   error=f"幂等键已在账上（投递 #{seen.id}）")
            return 200, {"semantics": "duplicate", "delivery_id": row.id,
                         "detail": "幂等键命中，已有那次在账上"}
    books_allowed, run_reason, run_detail = run_gate(auto)
    if not trigger.enabled or not books_allowed:
        reason = "触发器已停用" if not trigger.enabled else f"规则当前不能真跑：{run_reason}（{run_detail}）"
        row = _record_delivery(db, auto, trigger, external_id="", event="api.invoke",
                               payload_bytes=payload_bytes, status="skipped",
                               response_code=200, idem_key=idem_key, error=reason)
        return 200, {"semantics": "skipped", "delivery_id": row.id, "detail": reason}
    row = _record_delivery(db, auto, trigger, external_id="", event="api.invoke",
                           payload_bytes=payload_bytes, status="accepted",
                           response_code=202, idem_key=idem_key)
    run = AutomationRun(
        automation_id=auto.id, trigger_id=trigger.id, status="queued",
        summary="api 调用已收（载荷键数 "
                + str(len(body) if isinstance(body, dict) else 0) + "）；执行器未接入，尚未真正执行",
        spec_version=int(auto.spec_version or 1),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return 202, {"semantics": "accepted", "delivery_id": row.id, "run_id": run.id,
                 "detail": "已收下并派生成运行；运行结果另在运行史里"}


def webhook_probe(db: Session, token: str) -> dict:
    """GET 探活：URL 还在不在 + 这条规则现在能不能真跑（不派生成运行）。"""
    trigger = db.query(AutomationTrigger).filter(
        AutomationTrigger.secret == _hash_token(token),
        AutomationTrigger.kind == "webhook",
    ).first()
    if trigger is None:
        raise AutomationNotFound("webhook 不存在或已轮换（旧 URL 立即失效）")
    auto = db.query(Automation).filter(Automation.id == trigger.automation_id).first()
    if auto is None:
        raise AutomationNotFound("webhook 归属的自动化已不存在")
    allowed, reason, detail = run_gate(auto)
    can_run = bool(allowed and trigger.enabled)
    if not trigger.enabled:
        reason = "trigger_disabled"
        detail = "触发器已停用：投递会被记成 skipped，不派生成运行"
    return {"ok": True, "automation_id": auto.id, "trigger_id": trigger.id,
            "trigger_enabled": bool(trigger.enabled), "can_run": can_run,
            "gate_reason": None if can_run else reason, "gate_detail": detail}
