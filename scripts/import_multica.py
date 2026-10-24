#!/usr/bin/env python3
"""把 **multica** 的技能 / Agent / 小队搬进 **agentflow**（v23）。

默认 dry-run（只统计与打印映射，不写库）；`--apply` 才真写。

## 源 → 目标映射

| multica（Postgres） | agentflow（MySQL/SQLite） | 说明 |
|---|---|---|
| `skill` | `tools`（`type='skill'`） | `name`/`description`/`content` → `name`/`description`/`content_md` |
| `skill_file` | `tools.files_json` `[{path, content}]` | 多文件技能包整体落一个 JSON 列（迁移 020） |
| `agent` | `agents` | `instructions` → `system_prompt`；`description` 原样；`model` 的 `provider:id` 规范成 `provider/id` |
| `agent.runtime_id` → `agent_runtime.provider` | `agents.runtime` | dsh/hermes/codex 直通，其余（claude 等）→ `custom`（不假装支持） |
| `squad` | `squads` + `squad_members` | `leader_id` → `leader_agent_id`；成员全部按 Agent 入池，`role` 一并落库；`slug` 由名字派生（ASCII 兜底 `multica-squad-N`） |
| `skill.config` | `tools.config_json` | 通用配置块（来源侧本机 30 条全为空对象） |
| `agent_skill` | **`agent_tools`** | 技能↔Agent 绑定（唯一键幂等；本机 104 条） |
| `agent.avatar_url` | `agents.avatar_url` | multica 的 `emoji:🧠` 形态 |
| `agent.custom_env/custom_args/mcp_config/thinking_level/service_tier/composio_toolkit_allowlist` | `agents` 同名列 | opaque 配置块（来源侧本机全空，列与映射都补齐，不留死角） |

**全部字段都迁**（v23 追加：`agent_tools` 关联表 + 迁移 022/023 补齐列）。仍**不迁**的只剩一类：
multica 的 `workspace`/`daemon`/`chat_*`/`comment_*` 等**平台运行态**数据（不属于「技能/Agent/小队」三类资产）。

## 幂等

- 技能：按 `(owner_id, type='skill', name)` 去重 → 已存在默认 **skip**（`--update` 则覆盖正文与文件包）；
- Agent：按 `(owner_id, name)` 去重 → 同上；
- 小队：按 `name` 去重 → 已存在 skip（`--update` 重建成员池）；
- 全体归属 `admin`（`owner_kind='personal'`，`team_id=NULL`）——迁移不替人决定团队归属。

## 用法

```bash
# 1) 先看：只读源 + 只读目标，打印将写入什么
python scripts/import_multica.py

# 2) 真写（目标库走 DATABASE_URL / --target-url）
python scripts/import_multica.py --apply

# 3) 覆盖已存在的内容（技能正文/文件包、Agent 人设、小队指令）
python scripts/import_multica.py --apply --update
```

退出码：0 = 成功（含 dry-run）；2 = 前置不满足（psql 不可用 / 源不可读 / 目标不可连）。
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, os.path.join(REPO, "backend"))

DEFAULT_MULTICA_DSN = os.environ.get(
    "MULTICA_DSN", "postgres://multica:multica_dev_pw@localhost:5433/multica?sslmode=disable"
)
OWNER = "admin"
SLUG_RE = re.compile(r"^[a-z][a-z0-9-]{1,31}$")

# multica 的 CLI provider → agentflow 可执行的运行时（其余一律 custom，不假装支持）
RUNTIME_MAP = {"dsh": "dsh", "hermes": "hermes", "codex": "codex"}


# ── 源读取（psql --csv：不引入 psycopg2 依赖，离线机器也能跑）─────────────

def _psql(dsn: str, sql: str) -> list[dict]:
    try:
        proc = subprocess.run(
            ["psql", dsn, "--csv", "--quiet", "-c", sql],
            capture_output=True, text=True, timeout=120,
        )
    except FileNotFoundError:
        raise SystemExit("[import] 找不到 psql：请安装 postgresql-client 或用 --dsn 指向可用实例")
    except subprocess.TimeoutExpired:
        raise SystemExit("[import] psql 超时（>120s）")
    if proc.returncode != 0:
        raise SystemExit(f"[import] 读 multica 失败：{(proc.stderr or '').strip()[:300]}")
    return list(csv.DictReader(io.StringIO(proc.stdout)))


def read_source(dsn: str) -> dict:
    """一次性把三张表读进内存（30 技能 / 38 Agent / 2 小队量级，不需要流式）。"""
    skills = _psql(dsn, """
        select id, name, description, content, config from skill order by name
    """)
    files = _psql(dsn, """
        select skill_id, path, content from skill_file order by skill_id, path
    """)
    agents = _psql(dsn, """
        select a.id, a.name, a.description, a.instructions, a.model, a.status,
               coalesce(r.provider, '') as provider,
               a.avatar_url, a.custom_env, a.custom_args, a.mcp_config,
               a.thinking_level, a.service_tier, a.composio_toolkit_allowlist
        from agent a left join agent_runtime r on r.id = a.runtime_id
        order by a.name
    """)
    links = _psql(dsn, """
        select agent_id, skill_id from agent_skill order by agent_id, skill_id
    """)
    squads = _psql(dsn, """
        select id, name, instructions, leader_id, creator_id from squad order by name
    """)
    members = _psql(dsn, """
        select squad_id, member_type, member_id, role from squad_member order by squad_id
    """)
    files_by_skill: dict[str, list[dict]] = {}
    for f in files:
        files_by_skill.setdefault(f["skill_id"], []).append(
            {"path": f["path"], "content": f["content"]}
        )
    members_by_squad: dict[str, list[dict]] = {}
    for m in members:
        members_by_squad.setdefault(m["squad_id"], []).append(m)
    return {"skills": skills, "files_by_skill": files_by_skill,
            "agents": agents, "squads": squads, "members_by_squad": members_by_squad,
            "links": links}


# ── 映射（纯函数，便于单测）─────────────────────────────────────────────

def normalize_model(raw: str | None) -> str:
    """multica 的 `provider:id`（如 `minimax:MiniMax-M3`）→ agentflow 的 `provider/id`。

    multica 的 `:` 是「provider 后面跟模型 id」的分隔；agentflow / 运行时注册表用的是 `/`
    （例如 `deepseek-official/deepseek-v4-flash`）。空值保持空串（= 用运行时自身默认）。
    """
    text = (raw or "").strip()
    if not text:
        return ""
    if ":" in text:
        provider, _, model = text.partition(":")
        return f"{provider.strip()}/{model.strip()}" if provider.strip() and model.strip() else text
    return text


def map_runtime(provider: str | None) -> str:
    """multica 运行时 provider → agentflow 运行时（未知一律 custom）。"""
    key = (provider or "").strip().lower()
    return RUNTIME_MAP.get(key, "custom")


def slug_for_squad(name: str, index: int, taken: set[str]) -> str:
    """由名字派生合法 slug（agentflow: `^[a-z][a-z0-9-]{1,31}$`）；中文名走 ASCII 兜底。"""
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    candidates = []
    if base:
        candidates.append(base[:31])
        candidates.append(f"multica-{base[:23]}")
    candidates.append(f"multica-squad-{index}")
    for cand in candidates:
        cand = cand if len(cand) >= 2 else f"{cand}-1"
        if SLUG_RE.match(cand) and cand not in taken:
            return cand
    n = index
    while f"multica-squad-{n}" in taken:
        n += 1
    return f"multica-squad-{n}"


def parse_json_field(raw, default=None):
    """psql --csv 把 JSON 列当**文本**吐出来：这里解析回对象；空/`null`/坏值 → default。

    不猜形状：只接受解析成功的结果，坏值按 default 处理（并可由调用方记告警）。
    """
    if raw is None:
        return default
    text = str(raw).strip()
    if not text or text.lower() in ("null", "{}", "[]"):
        return default if text in ("", "null") else json.loads(text)
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001 — 坏值不炸整批
        return default


def agent_extra_fields(agent: dict) -> dict:
    """agent 行 → `agents` 表里 v23 补齐的附加字段（avatar + opaque 配置块）。"""
    avatar = (agent.get("avatar_url") or "").strip()[:512] or None
    return {
        "avatar_url": avatar,
        "custom_env": parse_json_field(agent.get("custom_env")),
        "custom_args": parse_json_field(agent.get("custom_args")),
        "mcp_config": parse_json_field(agent.get("mcp_config")),
        "thinking_level": (agent.get("thinking_level") or "").strip()[:16] or None,
        "service_tier": (agent.get("service_tier") or "").strip()[:16] or None,
        "composio_toolkit_allowlist": parse_json_field(agent.get("composio_toolkit_allowlist")),
    }


def skill_payload(skill: dict, files: list[dict]) -> dict:
    """skill → tools 请求体（走 services.tool_service.create_tool，校验同一份）。"""
    return {
        "type": "skill",
        "name": (skill["name"] or "").strip()[:128],
        "description": skill.get("description") or "",
        "content_md": skill.get("content") or "",
        "files_json": files,
        "config_json": parse_json_field(skill.get("config"), {}) or {},
        "permissions": [],
    }


def agent_payload(agent: dict) -> dict:
    """agent → agents 行（人设/指令 → system_prompt；模型规范化；运行时按 provider 映射）。"""
    return {
        "name": (agent["name"] or "").strip()[:128],
        "description": agent.get("description") or "",
        "runtime": map_runtime(agent.get("provider")),
        "model_name": normalize_model(agent.get("model"))[:128],
        "system_prompt": agent.get("instructions") or None,
        **agent_extra_fields(agent),
    }


# ── 目标写入 ────────────────────────────────────────────────────────────

def run_import(args) -> int:
    from database import SessionLocal
    from models.agent import Agent
    from models.teams import Squad, SquadMember
    from models.tool import Tool
    from services.agent_channel import provider_for_runtime
    from services import team_service, tool_service

    source = read_source(args.dsn)
    skills, agents, squads = source["skills"], source["agents"], source["squads"]
    print(f"[import] 源：技能 {len(skills)} · Agent {len(agents)} · 小队 {len(squads)} · "
          f"技能文件 {sum(len(v) for v in source['files_by_skill'].values())}")

    db = SessionLocal()
    stats = {"tools_created": 0, "tools_skipped": 0, "tools_updated": 0,
             "agents_created": 0, "agents_skipped": 0, "agents_updated": 0,
             "squads_created": 0, "squads_skipped": 0, "squads_updated": 0,
             "members_added": 0, "members_skipped": 0,
             "tool_links_added": 0, "tool_links_skipped": 0}
    warnings: list[str] = []
    admin = {"id": OWNER, "name": OWNER, "role": "admin"}
    tool_id_by_skill: dict[str, int] = {}   # multica skill.id(uuid) → agentflow tools.id

    # 1) 技能 → tools
    for s in skills:
        files = source["files_by_skill"].get(s["id"], [])
        payload = skill_payload(s, files)
        if not payload["name"]:
            warnings.append(f"技能缺 name，跳过：{s['id']}")
            continue
        try:
            # 写库前先用服务层的同一份校验：不合法的技能包**跳过并告警**，不让整批中断
            tool_service.normalize_files_json(payload["files_json"])
        except tool_service.ToolPayloadError as exc:
            warnings.append(f"技能「{payload['name']}」文件包不合法，跳过：{exc}")
            continue
        existing = (db.query(Tool)
                    .filter(Tool.owner_id == OWNER, Tool.type == "skill", Tool.name == payload["name"])
                    .first())
        if existing is not None:
            tool_id_by_skill[s["id"]] = existing.id
            if not args.update:
                stats["tools_skipped"] += 1
                continue
            if not args.apply:
                stats["tools_updated"] += 1
                continue
            tool_service.update_tool(db, existing.id, admin, {
                "description": payload["description"],
                "content_md": payload["content_md"],
                "files_json": payload["files_json"],
                "config_json": payload["config_json"],
            })
            stats["tools_updated"] += 1
            continue
        stats["tools_created"] += 1
        if not args.apply:
            continue
        created_tool = tool_service.create_tool(db, admin, payload)
        tool_id_by_skill[s["id"]] = created_tool.id

    # 2) Agent → agents（复用 services.agent_channel 的通道推导，与界面创建同口径）
    agent_id_map: dict[str, int] = {}
    for a in agents:
        payload = agent_payload(a)
        if not payload["name"]:
            warnings.append(f"Agent 缺 name，跳过：{a['id']}")
            continue
        existing = db.query(Agent).filter(Agent.owner_id == OWNER, Agent.name == payload["name"]).first()
        if existing is not None:
            agent_id_map[a["id"]] = existing.id
            if not args.update:
                stats["agents_skipped"] += 1
                continue
            stats["agents_updated"] += 1
            if args.apply:
                existing.description = payload["description"]
                existing.runtime = payload["runtime"]
                existing.model_provider = provider_for_runtime(payload["runtime"])
                existing.model_name = payload["model_name"]
                existing.system_prompt = payload["system_prompt"]
                for k in ("avatar_url", "custom_env", "custom_args", "mcp_config",
                          "thinking_level", "service_tier", "composio_toolkit_allowlist"):
                    setattr(existing, k, payload.get(k))
                db.commit()
            continue
        stats["agents_created"] += 1
        if not args.apply:
            # dry-run 占位 id：小队可迁性要在不写库的前提下也算得出来
            agent_id_map[a["id"]] = -(len(agent_id_map) + 1)
            continue
        row = Agent(
            owner_id=OWNER,
            name=payload["name"],
            description=payload["description"],
            runtime=payload["runtime"],
            model_provider=provider_for_runtime(payload["runtime"]),
            model_name=payload["model_name"],
            model_config_json={},
            api_key_encrypted="",
            token_soft_limit=800000,
            token_hard_limit=1000000,
            system_prompt=payload["system_prompt"],
            avatar_url=payload.get("avatar_url"),
            custom_env=payload.get("custom_env"),
            custom_args=payload.get("custom_args"),
            mcp_config=payload.get("mcp_config"),
            thinking_level=payload.get("thinking_level"),
            service_tier=payload.get("service_tier"),
            composio_toolkit_allowlist=payload.get("composio_toolkit_allowlist"),
            status="standby",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        agent_id_map[a["id"]] = row.id

    # 3) 小队 → squads + squad_members
    taken_slugs = {r[0] for r in db.query(Squad.slug).all()}
    for idx, sq in enumerate(squads, start=1):
        name = (sq["name"] or "").strip()
        if not name:
            warnings.append(f"小队缺 name，跳过：{sq['id']}")
            continue
        leader_local_id = agent_id_map.get(sq["leader_id"])
        if leader_local_id is None:
            # leader 没迁进来（例如 leader 是 multica 里已删除的 Agent）→ 不瞎编一个 leader
            warnings.append(f"小队「{name}」的 leader 未迁移，整队跳过（leader_id={sq['leader_id']}）")
            continue
        existing = db.query(Squad).filter(Squad.name == name[:64]).first()
        squad_pk = None            # dry-run 时为 None：只算「能不能迁」，不写库
        if existing is not None:
            if not args.update:
                stats["squads_skipped"] += 1
                continue
            stats["squads_updated"] += 1
            squad_pk = existing.id
            if args.apply:
                existing.instructions = sq.get("instructions") or ""
                existing.leader_agent_id = leader_local_id
                db.commit()
        else:
            stats["squads_created"] += 1
            if args.apply:
                slug = slug_for_squad(name, idx, taken_slugs)
                taken_slugs.add(slug)
                squad_row = team_service.create_squad(
                    db, slug=slug, name=name[:64], leader_agent_id=leader_local_id,
                    instructions=sq.get("instructions") or "", created_by=OWNER,
                )
                squad_pk = squad_row.id
        members = source["members_by_squad"].get(sq["id"], [])
        for m in members:
            if m.get("member_type") != "agent":
                warnings.append(f"小队「{name}」有非 Agent 成员，未迁：{m.get('member_id')}")
                continue
            local_id = agent_id_map.get(m["member_id"])
            if local_id is None:
                warnings.append(f"小队「{name}」成员 Agent 未迁移，跳过：{m['member_id']}")
                continue
            if not args.apply:
                stats["members_added"] += 1
                continue
            already = (db.query(SquadMember)
                       .filter(SquadMember.squad_id == squad_pk,
                               SquadMember.member_kind == "agent",
                               SquadMember.member_id == str(local_id))
                       .first())
            if already is not None:
                stats["members_skipped"] += 1
                if args.update and (already.role or "") != (m.get("role") or "")[:32]:
                    already.role = (m.get("role") or "")[:32]
                    db.commit()
                continue
            team_service.add_squad_member(db, squad_row if existing is None else existing,
                                          "agent", str(local_id), role=m.get("role") or "")
            stats["members_added"] += 1

    # 3.5) 技能↔Agent 绑定（multica agent_skill → agent_tools，唯一键幂等）
    from models.agent_tool import AgentTool
    for link in source["links"]:
        local_agent = agent_id_map.get(link["agent_id"])
        local_tool = tool_id_by_skill.get(link["skill_id"])
        if local_agent is None or local_tool is None:
            warnings.append(f"技能绑定缺一端，跳过：agent={link['agent_id']} skill={link['skill_id']}")
            continue
        if not args.apply:
            stats["tool_links_added"] += 1
            continue
        already = (db.query(AgentTool)
                   .filter(AgentTool.agent_id == local_agent, AgentTool.tool_id == local_tool)
                   .first())
        if already is not None:
            stats["tool_links_skipped"] += 1
            continue
        db.add(AgentTool(agent_id=local_agent, tool_id=local_tool))
        db.commit()
        stats["tool_links_added"] += 1

    # 4) 回读核对（dry-run 也读，便于对比「将写入」与「现在库里有什么」）
    db.expire_all()
    print("\n[import] 结果统计：")
    for k, v in stats.items():
        print(f"  {k:<16} {v}")
    print(f"\n[import] 目标库现状：技能 {db.query(Tool).filter(Tool.type == 'skill').count()} · "
          f"Agent {db.query(Agent).count()} · 小队 {db.query(Squad).count()} · "
          f"小队成员 {db.query(SquadMember).count()} · "
          f"技能绑定 {db.query(AgentTool).count()}")
    if warnings:
        print(f"\n[import] ⚠ {len(warnings)} 条告警（未迁内容，绝不静默）：")
        for w in warnings[:40]:
            print(f"  - {w}")
        if len(warnings) > 40:
            print(f"  …还有 {len(warnings) - 40} 条")
    db.close()
    print("\n[import] " + ("已写入（--apply）" if args.apply else "dry-run：没有写库，加 --apply 才真写"))
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="把 multica 的技能 / Agent / 小队搬进 agentflow")
    ap.add_argument("--dsn", default=DEFAULT_MULTICA_DSN, help="multica 的 Postgres DSN")
    ap.add_argument("--apply", action="store_true", help="真写目标库（默认 dry-run）")
    ap.add_argument("--update", action="store_true", help="已存在的按 name 覆盖内容（默认 skip）")
    args = ap.parse_args(argv)
    try:
        return run_import(args)
    except ImportError as exc:  # 目标库依赖缺失
        print(f"[import] 目标库依赖缺失：{exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
