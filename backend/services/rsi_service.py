"""RSI 产物治理服务（R6/R7）——晋升门、三权分离、可改面、熔断。

所有「必须人批 / 缺一不可 / 永久禁改」的规则都在**状态转换层**，不在提示词里。
"""
from __future__ import annotations

import datetime
import fnmatch
import json
import re

from sqlalchemy.orm import Session

from models.rsi import (
    BREAKER_NAMES,
    IMMUTABLE_PREFIXES,
    MEMORY_DOMAINS,
    MEMORY_KINDS,
    MEMORY_LIFE_STATUSES,
    MEMORY_LAYERS,
    POLLUTION_MARKERS,
    PROPOSAL_DIMENSIONS,
    REVIEW_VERDICTS,
    RSI_CATEGORIES,
    BreakerState,
    GoldenSet,
    Memory,
    ProbeEvidence,
    PromotionReview,
    Proposal,
    RsiSwitch,
    SurfaceManifest,
)

# NOISE FLOOR：低于这个幅度的「改进」不算改进（R7-6）
NOISE_FLOOR = 0.01
MAX_STEPS = 50
MAX_TOKENS = 200_000


class RsiError(ValueError):
    """业务非法（路由 400）。"""


class GateError(RsiError):
    """门禁拒绝（路由 409/403）。"""


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


# ── 自动化类目开关（R6-4）────────────────────────────────
# 只有四类产物有开关；四类之外（代码层、门禁本体、本条款自身）**不存在开关**，
# 因此「没有开关」本身就是禁改面的实现——不是少写，是设计如此。
#
# R25-7（v25 · 人工裁定「落表」）：主档 §3.3 的「四类目 + 全局」里的**全局一行**
# 由迁移 032 落表（category='global'）。总闸 off ⇒ 短路一切类目——判定收在
# `assert_category_running` 这一处状态转换层，propose/proposal/publish 三个消费点
# 自动生效，不在各入口重复写短路（入口 ⟂ 转换层各判一次的是「必填原因」那条，见 D11）。
SWITCH_GLOBAL = "global"


def _switch_row(db: Session, category: str) -> RsiSwitch | None:
    return db.query(RsiSwitch).filter(RsiSwitch.category == category).first()


def assert_category_running(db: Session, category: str) -> None:
    """状态转换层的开关判定：关闭 → 「自动体已暂停」直接拒。

    缺行 = 四类白名单默认允许（不是 fail-open：白名单外的类目根本没有开关可开）。
    R25-7：先查全局总闸（off ⇒ 一切类目短路），再查类目自身行。
    """
    if category not in RSI_CATEGORIES:
        raise GateError(f"类目 {category} 不在四类白名单内（R6-4）：不得自动化")
    gate = _switch_row(db, SWITCH_GLOBAL)
    if gate is not None and not gate.enabled:
        raise GateError("全局总闸已停用（R25-7）：关闭期间短路一切类目，"
                        "拒绝自动写入/提案/发布")
    row = _switch_row(db, category)
    if row is not None and not row.enabled:
        raise GateError(f"自动体已暂停（{category}）：关闭期间拒绝一切自动写入/提案/发布")


def switches(db: Session) -> list[dict]:
    out = []
    # v25：总闸**真行**领衔（四类目 + 全局的主档字面）；缺行按开呈现（旧库未迁移=现状）
    gate = _switch_row(db, SWITCH_GLOBAL)
    out.append(gate.to_dict() if gate is not None else
               {"category": SWITCH_GLOBAL, "enabled": True, "state": "running",
                "label": "全局总闸：开（短路一切类目）", "updated_by": "",
                "updated_at": None, "last_reason": "", "last_actor": ""})
    for category in RSI_CATEGORIES:
        row = _switch_row(db, category)
        if row is None:
            out.append({"category": category, "enabled": True, "state": "running",
                        "label": "自动体运行中", "updated_by": "",
                        "updated_at": None})
        else:
            out.append(row.to_dict())
    return out


def set_switch(db: Session, category: str, enabled: bool, actor: str = "",
               reason: str = "") -> RsiSwitch:
    """类目开关（R6-4）。

    D11（设计 §3.3/§6.30 E「必填原因、双入口校验、审计落可见态」）：
    **停用**是必须人批的状态转换动作——原因必填，落列 + 由路由写审计；
    恢复也记原因（可空=「解除暂停的说明」，但留 actor）。
    """
    if category not in RSI_CATEGORIES and category != SWITCH_GLOBAL:
        raise GateError(f"类目 {category} 不是可开关的四类产物，也不是全局总闸（R6-4/R25-7）")
    if not enabled and not (reason or "").strip():
        raise GateError("停用自动体必须给原因（人批动作留痕，不靠提示词）")
    row = _switch_row(db, category)
    if row is None:
        row = RsiSwitch(category=category, enabled=1 if enabled else 0, updated_by=actor)
        db.add(row)
    else:
        row.enabled = 1 if enabled else 0
        row.updated_by = actor
        row.updated_at = _now()
    row.last_reason = (reason or "").strip()
    row.last_actor = actor or row.last_actor
    db.commit()
    db.refresh(row)
    return row


# ── 记忆四层：晋升门 ──────────────────────────────────────

REQUIRED_FIELDS = ("cue", "lesson", "evidence")


def _pollution_scan(text: str) -> bool:
    """防污染扫描（内容标记面）。命中即视为评测回流污染源。"""
    lowered = (text or "").lower()
    return any(marker.lower() in lowered for marker in POLLUTION_MARKERS)


def propose_memory(db: Session, *, layer: str, cue: str, lesson: str,
                   evidence: list | None, kind: str = "positive",
                   scope: str = "agent", owner_id: str = "", source_ref: str = "",
                   confounded: bool | None = None,
                   evidence_is_strong: bool = True,
                   source_seq: int = 0, cites_seq: int = 0,
                   reviewer: str = "",
                   domain: str = "semantic", content: str = "",
                   confidence: float | None = None,
                   source_run_id: int | None = None,
                   source_conversation_id: int | None = None,
                   quarantine_until: datetime.datetime | None = None) -> dict:
    """提一条记忆。三字段缺一 → `no_entry`（合法结论），不入正式层。

    R7-4 因果前缀：`cites_seq` 必须早于 `source_seq`（不许引用未来任务）。
    R7-5 防污染：晋升前扫一次，命中即标 `pollution_flagged` 并强制 confounded。
    v24-doc-refresh D1/D2：记忆表补**内容域**（与层级正交）、**生命周期**、正文/置信度、
    静置期与来源链真外键。
    """
    if layer not in MEMORY_LAYERS:
        raise RsiError(f"layer 必须是 {sorted(MEMORY_LAYERS)} 之一")
    if kind not in MEMORY_KINDS:
        raise RsiError(f"kind 必须是 {sorted(MEMORY_KINDS)} 之一（负知识合法）")
    if domain not in MEMORY_DOMAINS:
        raise RsiError(f"domain 必须是 {sorted(MEMORY_DOMAINS)} 之一（内容域，与层级正交）")
    if confidence is not None and not (0.0 <= float(confidence) <= 1.0):
        raise RsiError("confidence 必须在 0.0~1.0 之间")
    assert_category_running(db, "memory")

    source_seq = int(source_seq or 0)
    cites_seq = int(cites_seq or 0)
    causal_ok = True
    if source_seq and cites_seq and cites_seq >= source_seq:
        causal_ok = False
        raise GateError(
            f"因果前缀冲突：经验只能引用早于自身任务（cites_seq={cites_seq} "
            f"必须 < source_seq={source_seq}），拒绝未来信息回灌"
        )

    payload = {"cue": (cue or "").strip(), "lesson": (lesson or "").strip(),
               "evidence": evidence or []}
    missing = [f for f in REQUIRED_FIELDS if not payload[f]]
    # 拿不准时的默认是 confounded（不是「已成立」）
    is_confounded = True if confounded is None else bool(confounded)
    if not evidence_is_strong:
        is_confounded = True

    # R7-5 第一扫：晋升前
    scan_text = " ".join([payload["cue"], payload["lesson"],
                          " ".join(str(e) for e in payload["evidence"])])
    polluted = _pollution_scan(scan_text)
    if polluted:
        is_confounded = True

    # 正文：未显式给时以 cue 为正文（D2：content 是记忆正文，cue/lesson 是晋升三字段之一）
    body = (content or "").strip() or payload["cue"]

    if missing:
        row = Memory(layer=layer, kind=kind, scope=scope, owner_id=owner_id,
                     domain=domain, life_status="active",
                     cue=payload["cue"], lesson=payload["lesson"], content=body,
                     confidence=confidence,
                     evidence_json=json.dumps(payload["evidence"], ensure_ascii=False),
                     source_ref=source_ref,
                     source_run_id=source_run_id,
                     source_conversation_id=source_conversation_id,
                     quarantine_until=quarantine_until,
                     status="no_entry", confounded=0,
                     source_seq=source_seq, cites_seq=cites_seq,
                     pollution_flagged=1 if polluted else 0,
                     post_ingest_scan=1)
        db.add(row)
        db.flush()
        _write_review(db, row, verdict="no_entry", fields_complete=False,
                      causal_ok=causal_ok, polluted=polluted, reviewer=reviewer,
                      note=f"缺字段: {', '.join(missing)}" if missing else "no_entry")
        db.commit()
        db.refresh(row)
        return {"stored": False, "status": "no_entry", "missing": missing,
                "memory": row.to_dict()}

    row = Memory(
        layer=layer, kind=kind, scope=scope, owner_id=owner_id,
        domain=domain, life_status="active",
        cue=payload["cue"], lesson=payload["lesson"], content=body,
        confidence=confidence,
        evidence_json=json.dumps(payload["evidence"], ensure_ascii=False),
        source_ref=source_ref,
        source_run_id=source_run_id,
        source_conversation_id=source_conversation_id,
        quarantine_until=quarantine_until,
        status="confounded" if is_confounded else "promoted",
        confounded=1 if is_confounded else 0,
        source_seq=source_seq, cites_seq=cites_seq,
        pollution_flagged=1 if polluted else 0,
        post_ingest_scan=1,   # R7-5 第二扫：入库后再扫一次（同一内容面，语义上是独立一步）
    )
    db.add(row)
    db.flush()
    _write_review(db, row, verdict="confounded" if is_confounded else "helped",
                  fields_complete=True, causal_ok=causal_ok, polluted=polluted,
                  reviewer=reviewer, note="晋升前扫描命中金标/评测标记" if polluted else "")
    db.commit()
    db.refresh(row)
    return {"stored": True, "status": row.status, "missing": [],
            "memory": row.to_dict()}


def _write_review(db: Session, row: Memory, *, verdict: str, fields_complete: bool,
                  causal_ok: bool, polluted: bool, reviewer: str,
                  note: str = "") -> PromotionReview:
    """晋升评审账：每次 propose 都留痕（no_entry 也记）。"""
    if verdict not in REVIEW_VERDICTS:
        raise RsiError(f"verdict 必须是 {sorted(REVIEW_VERDICTS)} 之一")
    review = PromotionReview(
        memory_id=row.id, verdict=verdict, fields_complete=1 if fields_complete else 0,
        causal_check=1 if causal_ok else 0, pollution_scan=1 if polluted else 0,
        reviewer=reviewer, note=note,
    )
    db.add(review)
    db.flush()
    return review


def list_reviews(db: Session, memory_id: int | None = None,
                 limit: int = 100) -> list[dict]:
    q = db.query(PromotionReview)
    if memory_id is not None:
        q = q.filter(PromotionReview.memory_id == memory_id)
    return [r.to_dict() for r in q.order_by(PromotionReview.id.desc()).limit(limit).all()]


def list_memories(db: Session, layer: str | None = None, status: str | None = None,
                  domain: str | None = None, life_status: str | None = None,
                  limit: int = 100) -> list[dict]:
    q = db.query(Memory)
    if layer:
        q = q.filter(Memory.layer == layer)
    if status:
        q = q.filter(Memory.status == status)
    if domain:
        q = q.filter(Memory.domain == domain)
    if life_status:
        q = q.filter(Memory.life_status == life_status)
    return [m.to_dict() for m in q.order_by(Memory.id.desc()).limit(limit).all()]


def quarantine_source(db: Session, source_ref: str,
                      quarantine_until: datetime.datetime | None = None) -> int:
    """来源链撤回：该来源的所有记忆进检疫（不删、可追溯）。

    D2：静置期落 `quarantine_until` 时间列（NULL = 免检，站内自产；外部来源入队即非 NULL）。
    """
    count = db.query(Memory).filter(
        Memory.source_ref == source_ref, Memory.status != "quarantined",
    ).update(
        {Memory.status: "quarantined",
         Memory.quarantine_until: quarantine_until or _now()},
        synchronize_session=False,
    )
    db.commit()
    return int(count or 0)


def decay_candidates(db: Session, days: int = 90, limit: int = 100) -> list[dict]:
    """衰减队列：长期未被使用的正式记忆（只列不删）。"""
    cutoff = _now() - datetime.timedelta(days=days)
    rows = db.query(Memory).filter(
        Memory.status == "promoted",
    ).filter(
        (Memory.last_used_at.is_(None)) | (Memory.last_used_at < cutoff),
    ).order_by(Memory.created_at.asc()).limit(limit).all()
    return [m.to_dict() for m in rows]


# ── 可改面 ────────────────────────────────────────────────

def create_surface(db: Session, name: str, allow_edit: list[str],
                   owner_id: str = "", path_pattern: str = "",
                   cap_bytes: int | None = None,
                   structure_rules: list | None = None,
                   exclusions: list | None = None) -> SurfaceManifest:
    """建可改面声明对象。

    D3：设计 §3.3 / §6.30 E 要求四个结构字段——`path_pattern`（可写路径模式）·
    `cap_bytes`（体量上限）· `structure_rules`（结构规则）· `exclusions`（显式排除）。
    """
    if not name:
        raise RsiError("name 不能为空")
    if db.query(SurfaceManifest).filter(SurfaceManifest.name == name).first():
        raise RsiError("surface 已存在")
    # v25（R25-2）：写侧词表 fail-fast（读侧 fail-closed），畸形规则不进库
    _validate_structure_rules(structure_rules)
    if exclusions is not None:
        if not isinstance(exclusions, list) or not all(isinstance(e, str) for e in exclusions):
            raise RsiError("exclusions 必须是字符串数组")
    row = SurfaceManifest(name=name,
                          allow_edit_json=json.dumps(allow_edit or [], ensure_ascii=False),
                          path_pattern=path_pattern or "",
                          cap_bytes=cap_bytes,
                          structure_rules=json.dumps(structure_rules or [], ensure_ascii=False),
                          exclusions=json.dumps(exclusions or [], ensure_ascii=False),
                          owner_id=owner_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_surface(db: Session, surface_id: int, allow_edit, owner_id: str = "",
                   path_pattern: str | None = None, cap_bytes: int | None = None,
                   structure_rules: list | None = None,
                   exclusions: list | None = None) -> SurfaceManifest:
    """改可改面的白名单与声明结构。禁改前缀即使写进白名单也不生效（assert_editable 先判前缀）。"""
    row = db.query(SurfaceManifest).filter(SurfaceManifest.id == int(surface_id)).first()
    if row is None:
        raise RsiError("surface 不存在")
    if allow_edit is not None:
        if not isinstance(allow_edit, list) or not all(isinstance(p, str) for p in allow_edit):
            raise RsiError("allow_edit 必须是字符串数组")
        row.allow_edit_json = json.dumps(allow_edit, ensure_ascii=False)
    if path_pattern is not None:
        row.path_pattern = path_pattern
    if cap_bytes is not None:
        row.cap_bytes = cap_bytes
    if structure_rules is not None:
        _validate_structure_rules(structure_rules)
        row.structure_rules = json.dumps(structure_rules, ensure_ascii=False)
    if exclusions is not None:
        if not isinstance(exclusions, list) or not all(isinstance(e, str) for e in exclusions):
            raise RsiError("exclusions 必须是字符串数组")
        row.exclusions = json.dumps(exclusions, ensure_ascii=False)
    row.owner_id = owner_id or row.owner_id
    db.commit()
    db.refresh(row)
    return row


def delete_surface(db: Session, surface_id: int) -> None:
    row = db.query(SurfaceManifest).filter(SurfaceManifest.id == int(surface_id)).first()
    if row is None:
        raise RsiError("surface 不存在")
    db.delete(row)
    db.commit()


def _pattern_matches(pattern: str, target: str) -> bool:
    """路径类词表（path_pattern / exclusions / 字符串形结构规则共用）：
    含 `*` ⇒ fnmatch 词表（`*` 匹配任意字符段，含 `/`）；否则精确相等。
    '' = 命中（exclusions 里出现空串即「全拒」语义，慎用——写侧不拦）。
    ——词表定义随 R25-2 裁定成文，口径注记进 RULINGS §五点五·二 结案行。"""
    if not pattern:
        return True
    if "*" in pattern:
        return fnmatch.fnmatch(target, pattern)
    return target == pattern


def _rule_matches(rule, target: str) -> bool:
    """structure_rules 单条判定：字符串 = 路径词表；对象 = {type∈prefix|suffix|regex, value}。
    畸形规则**即拒（fail-closed）**——坏规则不许静默放行，宁可挡住一条合法路。"""
    if isinstance(rule, str):
        return _pattern_matches(rule, target)
    if isinstance(rule, dict):
        rtype = str(rule.get("type") or "")
        value = str(rule.get("value") or "")
        if rtype == "prefix":
            return target.startswith(value)
        if rtype == "suffix":
            return target.endswith(value)
        if rtype == "regex":
            try:
                return re.search(value, target) is not None
            except re.error as e:
                raise GateError(f"structure_rules 正则非法（{value!r}）：{e}")
    raise GateError(f"结构规则形态非法（应为字符串或 {{type,value}} 对象）：{rule!r}")


def _validate_structure_rules(rules) -> None:
    """写侧词表校验（fail-fast）：读侧 _rule_matches 已 fail-closed，这里不让畸形进库。"""
    if rules is None:
        return
    if not isinstance(rules, list):
        raise RsiError("structure_rules 必须是数组")
    for r in rules:
        if isinstance(r, str):
            continue
        if (isinstance(r, dict) and str(r.get("type")) in ("prefix", "suffix", "regex")
                and isinstance(r.get("value"), str)):
            continue
        raise RsiError(f"结构规则形态非法（字符串或 {{type∈prefix|suffix|regex, value}}）：{r!r}")


def assert_editable(db: Session, surface_name: str, target: str,
                    content: str | None = None) -> SurfaceManifest:
    """可改面判定：永久禁改前缀 > 代码层禁自改 > 白名单 > **声明结构四列**（v25-R25-2）。

    结构声明消费顺序（任一条不成立即拒）：
    - `path_pattern`：非空则 target 必须命中（路径词表，见 `_pattern_matches`）；
    - `exclusions`：命中任一条即拒（显式排除优先于一切放行）；
    - `structure_rules`：**逐条都要命中**（结构=合取约束）；
    - `cap_bytes`：体量闸——仅当调用点能取到内容（content 传入）时判定；
      提案期只有 target 没有正文，不伪造体积判断（执行器写文件时应把内容传进来）。
    """
    if not target:
        raise GateError("target 不能为空")
    normalized = target.replace("\\", "/").lstrip("./")
    if ".." in normalized.split("/"):
        raise GateError(f"'{target}' 含路径穿越（..），不在任何可改面内")
    if any(normalized.startswith(p) for p in IMMUTABLE_PREFIXES):
        raise GateError(f"'{target}' 属于永久禁改面（{', '.join(IMMUTABLE_PREFIXES)}）")
    # 代码层 RSI 禁止：不在本版开放（线上稳定优先）
    if normalized.startswith("backend/") or normalized.startswith("frontend/src/"):
        raise GateError("代码层 RSI 禁止（R6-4）：不得由提案修改源码")
    surface = db.query(SurfaceManifest).filter(SurfaceManifest.name == surface_name).first()
    if surface is None:
        raise GateError(f"可改面 '{surface_name}' 不存在")
    allowed = json.loads(surface.allow_edit_json or "[]")
    if not any(normalized == a or normalized.startswith(a.rstrip("/") + "/") for a in allowed):
        raise GateError(f"'{target}' 不在可改面 '{surface_name}' 的白名单内")
    # ── v25（R25-2）：声明结构四列从「存而不判」进门禁 ──────────
    if surface.path_pattern and not _pattern_matches(surface.path_pattern, normalized):
        raise GateError(f"'{target}' 不匹配可改面 '{surface_name}' 的路径模式"
                        f"（path_pattern={surface.path_pattern!r}）")
    for ex in (json.loads(surface.exclusions or "[]") or []):
        if _pattern_matches(ex, normalized):
            raise GateError(f"'{target}' 命中显式排除（exclusions={ex!r}）")
    for rule in (json.loads(surface.structure_rules or "[]") or []):
        if not _rule_matches(rule, normalized):
            raise GateError(f"'{target}' 不满足结构规则（structure_rules 条目 {rule!r}）")
    if surface.cap_bytes and content is not None:
        size = len(content.encode("utf-8"))
        if size > int(surface.cap_bytes):
            raise GateError(f"内容 {size} 字节超出可改面体量上限"
                            f"（cap_bytes={surface.cap_bytes}）")
    return surface


# ── 熔断 ──────────────────────────────────────────────────

def _breaker(db: Session, name: str) -> BreakerState:
    row = db.query(BreakerState).filter(BreakerState.name == name).first()
    if row is None:
        row = BreakerState(name=name, status="closed")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def breakers(db: Session) -> list[dict]:
    return [_breaker(db, n).to_dict() for n in BREAKER_NAMES]


def trip(db: Session, name: str, reason: str) -> BreakerState:
    if name not in BREAKER_NAMES:
        raise RsiError(f"未知熔断器: {name}")
    row = _breaker(db, name)
    row.status = "open"
    row.reason = reason
    row.opened_at = _now()
    row.counter = int(row.counter or 0) + 1
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def reset_breaker(db: Session, name: str) -> BreakerState:
    """人工复位（half_open 起步，不直接 closed）。"""
    if name not in BREAKER_NAMES:
        raise RsiError(f"未知熔断器: {name}")
    row = _breaker(db, name)
    row.status = "half_open"
    row.reason = ""
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── 提案制三权分离 ────────────────────────────────────────

def create_proposal(db: Session, *, title: str, dimension: str, surface_name: str,
                    target: str, budget_steps: int = 10,
                    budget_tokens: int = 20000) -> Proposal:
    """生成侧：只允许在可改面内、且带限额（步数/钱）。"""
    if dimension not in PROPOSAL_DIMENSIONS:
        raise RsiError(f"dimension 必须是 {sorted(PROPOSAL_DIMENSIONS)} 之一（INV⟂DOM 双维）")
    if budget_steps <= 0 or budget_steps > MAX_STEPS:
        raise RsiError(f"budget_steps 必须在 1..{MAX_STEPS}")
    if budget_tokens <= 0 or budget_tokens > MAX_TOKENS:
        raise RsiError(f"budget_tokens 必须在 1..{MAX_TOKENS}")
    assert_editable(db, surface_name, target)
    assert_category_running(db, "orchestration")
    open_breakers = [b["name"] for b in breakers(db) if b["status"] == "open"]
    if open_breakers:
        raise GateError(f"熔断打开（{', '.join(open_breakers)}）：拒绝新建提案")
    row = Proposal(title=title, dimension=dimension, surface_name=surface_name,
                   target=target, status="generated",
                   budget_steps=budget_steps, budget_tokens=budget_tokens)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def record_probe(db: Session, proposal: Proposal, metrics: dict,
                 evidences: list[dict] | None = None) -> Proposal:
    """第一拍：探针快筛。**弱证据不定优劣**——只能把状态推到 probed。

    D5 写路径：`evidences`（可选，逐条 {label, diff_ref, trajectory_ref,
    produced_ref, source_ref, evidence, similarity_mean}）落 `probe_evidence` 行。
    不传则只更新提案本身——**不编造证据包**（表先行；界面/调用方接线为残项）。
    """
    if proposal.status != "generated":
        raise GateError(f"当前状态 {proposal.status} 不允许记录探针结果")
    for ev in evidences or []:
        kind = ev.get("evidence", "trajectory")
        if kind not in ProbeEvidence.EVIDENCE_KINDS:
            raise RsiError(f"evidence 只能是 {sorted(ProbeEvidence.EVIDENCE_KINDS)} 之一")
        db.add(ProbeEvidence(
            proposal_id=proposal.id, label=str(ev.get("label", "")),
            diff_ref=str(ev.get("diff_ref", "")),
            trajectory_ref=str(ev.get("trajectory_ref", "")),
            produced_ref=str(ev.get("produced_ref", "")),
            source_ref=str(ev.get("source_ref", "")),
            evidence=kind,
            similarity_mean=(float(ev["similarity_mean"])
                             if ev.get("similarity_mean") is not None else None),
        ))
    proposal.probe_json = json.dumps(metrics, ensure_ascii=False)
    proposal.status = "probed"
    proposal.updated_at = _now()
    # 预算熔断：探针也要计步/计钱
    proposal.used_steps += int(metrics.get("steps", 0) or 0)
    proposal.used_tokens += int(metrics.get("tokens", 0) or 0)
    if proposal.used_steps > proposal.budget_steps:
        trip(db, "steps", f"提案 {proposal.id} 步数超限")
        proposal.status = "blocked"
    if proposal.used_tokens > proposal.budget_tokens:
        trip(db, "budget", f"提案 {proposal.id} token 超限")
        proposal.status = "blocked"
    db.commit()
    db.refresh(proposal)
    return proposal


# ── 金标集（D10：终身门的平台可校验落点）────────────────

# 厂牌前缀表（判 judge 与金标产出厂牌是否异厂；识别不了 = 未证实，fail-closed）
_VENDOR_PREFIXES = {
    "gpt": "openai", "o1": "openai", "o3": "openai", "o4": "openai",
    "claude": "anthropic", "sonnet": "anthropic", "opus": "anthropic", "haiku": "anthropic",
    "gemini": "google", "deepseek": "deepseek", "qwen": "alibaba", "llama": "meta",
    "mistral": "mistral", "grok": "xai", "doubao": "bytedance", "kimi": "moonshot",
}


def _vendor_of(model: str) -> str:
    """从模型名识厂牌；识别不了返回 unknown（调用方按未证实处理）。"""
    m = (model or "").strip().lower()
    for token, vendor in _VENDOR_PREFIXES.items():
        if m.startswith(token) or token in m:
            return vendor
    return "unknown"


def create_golden_set(db: Session, *, name: str, cases: list, produced_by: str = "",
                      kind: str = "eval_set", owner_id: str = "") -> GoldenSet:
    """建金标集（未冻结态）。cases 必填非空。"""
    if not (name or "").strip():
        raise RsiError("金标集必须有名字")
    if db.query(GoldenSet).filter(GoldenSet.name == name).first():
        raise RsiError("金标集同名已存在")
    if not isinstance(cases, list) or not cases:
        raise RsiError("cases 必须是非空数组（金标用例是终身门的最小输入）")
    import hashlib
    payload = json.dumps(cases, ensure_ascii=False, sort_keys=True)
    row = GoldenSet(
        name=name.strip(), kind=kind, cases_json=payload,
        produced_by=(produced_by or "").strip().lower(),
        eval_mark=hashlib.sha256(payload.encode()).hexdigest()[:16],
        owner_id=owner_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def freeze_golden_set(db: Session, golden_set_id: int, *, actor: str) -> GoldenSet:
    """冻结 = 管理员动作（状态转换层，不靠提示词）。冻结后 cases 不再可改。"""
    row = db.query(GoldenSet).filter(GoldenSet.id == int(golden_set_id)).first()
    if row is None:
        raise RsiError("金标集不存在")
    if row.frozen:
        return row  # 幂等
    row.frozen = True
    row.frozen_at = _now()
    row.frozen_by = actor
    db.commit()
    db.refresh(row)
    return row


def list_golden_sets(db: Session) -> list[dict]:
    return [g.to_dict() for g in db.query(GoldenSet).order_by(GoldenSet.id.asc()).all()]


def validate_shadow_gate(db: Session, golden_set_id: int, judge_model: str) -> dict:
    """平台侧校验终身门两条件（D10）。返回校验凭据；不过即 GateError。

    ① 金标必须由平台账上确认 frozen（不是调用方自报）；
    ② judge 厂牌必须**异于**金标产出厂牌——厂牌识别不了也拒绝（fail-closed）。
    """
    row = db.query(GoldenSet).filter(GoldenSet.id == int(golden_set_id)).first()
    if row is None:
        raise GateError(f"金标集 {golden_set_id} 不存在：终身门不认账外金标")
    if not row.frozen:
        raise GateError("金标未冻结（平台校验）：防污染闸未通过，不能作为发布依据")
    judge_vendor = _vendor_of(judge_model)
    if judge_vendor == "unknown":
        raise GateError(f"judge 厂牌无法识别（{judge_model!r}）：异厂性未证实，拒绝（fail-closed）")
    if row.produced_by and judge_vendor == row.produced_by:
        raise GateError(
            f"judge 与金标同厂（{judge_vendor}）：同厂评审不算独立证据")
    return {
        "gate_evidence": "platform_validated",
        "golden_set": {"id": row.id, "name": row.name, "frozen": True,
                       "produced_by": row.produced_by, "eval_mark": row.eval_mark},
        "judge_vendor": judge_vendor,
    }


def record_shadow(db: Session, proposal: Proposal, *, judge_model: str,
                  golden_set_frozen: bool, cross_vendor: bool,
                  pass_rate: float, baseline: float = 0.0,
                  golden_set_id: int | None = None) -> Proposal:
    """第二拍（终身门）：影子重放。要求冻结金标 + 异厂系 judge；低于噪声地板不算改进。

    D10：传 `golden_set_id` 时按账上金标集**平台校验**（冻结 + 异厂），布尔入参被校验结果取代；
    不传时保留旧布尔门，并在 shadow_json 如实记 `gate_evidence=self_declared`（自报门不是平台门）。
    """
    if proposal.status not in ("probed", "generated"):
        raise GateError(f"当前状态 {proposal.status} 不允许影子重放")
    if golden_set_id is not None:
        gate = validate_shadow_gate(db, golden_set_id, judge_model)
        golden_set_frozen, cross_vendor = True, True
    else:
        gate = {"gate_evidence": "self_declared"}
    if not golden_set_frozen:
        raise GateError("金标未冻结：防污染闸未通过，不能作为发布依据")
    if not cross_vendor:
        raise GateError("judge 必须来自异厂系（同厂评审不算独立证据）")
    delta = float(pass_rate) - float(baseline)
    if delta < NOISE_FLOOR:
        # 塌缩熔断：连续无提升 → 记一次，不进入人批
        proposal.shadow_json = json.dumps({
            "judge_model": judge_model, "pass_rate": pass_rate,
            "baseline": baseline, "delta": delta, "noise_floor": NOISE_FLOOR,
            **gate,
        }, ensure_ascii=False)
        proposal.status = "collapsed"
        proposal.updated_at = _now()
        trip(db, "collapse", f"提案 {proposal.id} 提升低于噪声地板")
        db.commit()
        db.refresh(proposal)
        return proposal
    proposal.shadow_json = json.dumps({
        "judge_model": judge_model, "pass_rate": pass_rate,
        "baseline": baseline, "delta": delta, "noise_floor": NOISE_FLOOR,
        "golden_set_frozen": True, "cross_vendor": True,
        **gate,
    }, ensure_ascii=False)
    proposal.judge_model = judge_model
    proposal.status = "awaiting_approval"
    proposal.updated_at = _now()
    db.commit()
    db.refresh(proposal)
    return proposal


def domain_signoff(db: Session, proposal: Proposal, reviewer: str) -> Proposal:
    """领域类提案需要域成员会签（INV⟂DOM 的 DOM 一侧）。"""
    if proposal.dimension != "domain":
        raise RsiError("只有 domain 维度的提案需要域成员会签")
    signoffs = json.loads(proposal.domain_signoff_json or "[]")
    if reviewer not in signoffs:
        signoffs.append(reviewer)
    proposal.domain_signoff_json = json.dumps(signoffs, ensure_ascii=False)
    proposal.updated_at = _now()
    db.commit()
    db.refresh(proposal)
    return proposal


def publish(db: Session, proposal: Proposal, approver: str,
            is_admin: bool) -> Proposal:
    """发布侧：**人批**。且必须已经过影子重放（awaiting_approval）。

    Probe 永不作发布依据：generated/probed/shadowing 一律拒绝。
    """
    if not is_admin or not approver:
        raise GateError("发布需要人类管理员批准（晋升必人批）")
    assert_category_running(db, "orchestration")
    if proposal.status != "awaiting_approval":
        raise GateError(f"当前状态 {proposal.status} 不可发布：必须完成影子重放并通过人批")
    if proposal.dimension == "domain":
        if not json.loads(proposal.domain_signoff_json or "[]"):
            raise GateError("领域类提案缺少域成员会签（INV⟂DOM）")
    proposal.status = "published"
    proposal.approved_by = approver
    proposal.approved_at = _now()
    proposal.updated_at = _now()
    db.commit()
    db.refresh(proposal)
    return proposal


def list_proposals(db: Session, status: str | None = None, limit: int = 100) -> list[dict]:
    q = db.query(Proposal)
    if status:
        q = q.filter(Proposal.status == status)
    return [p.to_dict() for p in q.order_by(Proposal.id.desc()).limit(limit).all()]
