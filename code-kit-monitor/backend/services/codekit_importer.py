"""code-kit 数据导入器 — 将 code-kit/ 目录拆解为平台的工具/工作流/角色/Agent/项目."""

import os
import json
import datetime
from database import SessionLocal
from models.tool import Tool
from models.workflow import Workflow
from models.agent import Agent
from models.project import Project
from models.role_custom import CustomRole
from models.metrics import MetricRaw, SessionMetric
from services.encryption_service import encrypt
from services.audit_service import log_audit

CODE_KIT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "code-kit")
SPECS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".specs")


def import_all(owner_id: str = "admin") -> dict:
    """全量导入 code-kit 数据到平台模块表。"""
    stats = {"tools": 0, "workflows": 0, "agents": 0, "projects": 0, "roles": 0, "metrics": 0}
    db = SessionLocal()

    # ── 1. 导入 code-kit 阶段 prompts → Skill 工具 ──
    prompts_dir = os.path.join(CODE_KIT_DIR, "prompts")
    stage_tools = {}  # stage_name → tool_id
    stage_order = ["0-change", "1-requirement", "2-design", "2a-ui-design", "3-task", "4-dev", "5-test", "6-review", "7-integration"]

    for stage in stage_order:
        md_path = os.path.join(prompts_dir, f"{stage}.md")
        content = _read(md_path)
        if not content:
            continue
        tool = Tool(owner_id=owner_id, type="skill", name=f"code-kit:{stage}", description=f"code-kit 阶段: {_first_title(content)}", token_soft_limit=200000, token_hard_limit=500000, permissions=["read", "write"], content_md=content[:10000], gate_pre_check=None, gate_post_check=None, io_filter=None)
        db.add(tool)
        db.flush()
        stage_tools[stage] = tool.id
        stats["tools"] += 1

    # ── 2. 导入横向命令 prompts → Skill 工具 ──
    extra_prompts = {
        "A-architect": "架构梳理工作流", "A-evolve": "架构演进工作流",
        "I-intel-scan": "入场扫描工作流", "L-restyle": "换风格工作流", "M-health": "健康检查工作流"
    }
    extra_tool_ids = {}
    for name, desc in extra_prompts.items():
        content = _read(os.path.join(prompts_dir, f"{name}.md"))
        if not content:
            continue
        tool = Tool(owner_id=owner_id, type="skill", name=f"code-kit:{name}", description=desc, token_soft_limit=100000, token_hard_limit=300000, permissions=["read"], content_md=content[:8000])
        db.add(tool)
        db.flush()
        extra_tool_ids[name] = tool.id
        stats["tools"] += 1

    # ── 3. 导入 role 定义 → CustomRole 表 ──
    roles_dir = prompts_dir
    for fname in sorted(os.listdir(roles_dir)):
        if not fname.startswith("R-") or not fname.endswith(".md"):
            continue
        content = _read(os.path.join(roles_dir, fname))
        if not content:
            continue
        name = fname.replace("R-", "").replace(".md", "")
        # 解析 code-kit 角色文件
        trigs, cans, cannots, evals, inputs_list, outputs_list = _parse_role_md(content)
        role = CustomRole(
            owner_id=owner_id, name=name, based_on="code-kit",
            temperament=_extract_temperament(content),
            responsibilities=_extract_responsibilities(content),
            triggers=trigs, boundaries_can=cans, boundaries_cannot=cannots,
            evaluation=evals, inputs=inputs_list, outputs=outputs_list,
            gate_pre_check=None, gate_post_check=None, io_filter=None
        )
        db.add(role)
        stats["roles"] += 1

    # ── 4. 导入模板 → Skill 工具 ──
    templates_dir = os.path.join(CODE_KIT_DIR, "templates")
    if os.path.isdir(templates_dir):
        for fname in sorted(os.listdir(templates_dir)):
            if not fname.endswith(".md"):
                continue
            content = _read(os.path.join(templates_dir, fname))
            if not content:
                continue
            name = fname.replace(".md", "")
            tool = Tool(owner_id=owner_id, type="skill", name=f"code-kit:模板:{name}", description=f"code-kit 文档模板: {name}", token_soft_limit=30000, token_hard_limit=100000, permissions=["read"], content_md=content[:8000])
            db.add(tool)
            db.flush()
            stats["tools"] += 1

    # ── 5. 导入 reference → Skill 工具 ──
    ref_dir = os.path.join(CODE_KIT_DIR, "reference")
    if os.path.isdir(ref_dir):
        for fname in sorted(os.listdir(ref_dir)):
            if not fname.endswith(".md"):
                continue
            content = _read(os.path.join(ref_dir, fname))
            if not content:
                continue
            name = fname.replace(".md", "")
            tool = Tool(owner_id=owner_id, type="skill", name=f"code-kit:参考:{name}", description=f"code-kit 参考文档: {name}", token_soft_limit=20000, token_hard_limit=50000, permissions=["read"], content_md=content[:8000])
            db.add(tool)
            db.flush()
            stats["tools"] += 1

    # ── 6. 创建标准 code-kit 工作流（0→1→2→2a→3→4→5→6→7）──
    ck_workflow = Workflow(
        owner_id=owner_id, name="code-kit 标准流程",
        description="code-kit 的标准 8 阶段开发流程：0-change → 1-requirement → 2-design → 2a-ui → 3-task → 4-dev → 5-test → 6-review → 7-integration",
        definition_mode="visual",
        spec_json={"nodes": [{"id": s, "tool_id": stage_tools.get(s, 0), "label": s} for s in stage_order if s in stage_tools],
                   "edges": [{"from": stage_order[i], "to": stage_order[i+1]} for i in range(len(stage_order)-1) if stage_order[i] in stage_tools and stage_order[i+1] in stage_tools]},
        status="published", token_soft_limit=5000000, token_hard_limit=10000000,
        gate_pre_check="输入必须包含有效的 change-id", gate_post_check="所有阶段产物文件必须存在", io_filter="sanitize")
    db.add(ck_workflow)
    db.flush()
    stats["workflows"] += 1

    # ── 7. 创建 Agent ──
    ck_agent = Agent(owner_id=owner_id, name="code-kit 标准 Agent",
                     description="执行 code-kit 标准 8 阶段开发流程的自动化 Agent",
                     runtime="langgraph", model_provider="ollama", model_name="qwen2:0.5b",
                     api_key_encrypted=encrypt("ollama-local"),
                     workflow_id=ck_workflow.id,
                     token_soft_limit=5000000, token_hard_limit=10000000,
                     gate_pre_check="change-id 格式校验", io_filter="sanitize")
    db.add(ck_agent)
    db.flush()
    stats["agents"] += 1

    # ── 8. 横向命令 Agent ──
    extra_agent = Agent(owner_id=owner_id, name="code-kit 横向命令 Agent",
                        description="执行健康检查/架构梳理/入场扫描等横向命令",
                        runtime="langchain", model_provider="ollama", model_name="qwen2:0.5b",
                        api_key_encrypted=encrypt("ollama-local"),
                        token_soft_limit=3000000, token_hard_limit=5000000)
    db.add(extra_agent)
    db.flush()
    stats["agents"] += 1

    # ── 9. 导入 .specs/ 下的已有 change → 项目 ──
    if os.path.isdir(SPECS_DIR):
        for entry in sorted(os.listdir(SPECS_DIR)):
            change_dir = os.path.join(SPECS_DIR, entry)
            if not os.path.isdir(change_dir) or entry.startswith(".") or entry in ("archive", "backup"):
                continue
            try:
                change_md = _read(os.path.join(change_dir, "CHANGE.md"))
                req_md = _read(os.path.join(change_dir, "REQUIREMENT.md"))
                project = Project(
                    owner_id=owner_id,
                    name=_extract_title(change_md) or entry,
                    requirement_raw=(req_md or change_md or "")[:3000],
                    requirement_type="markdown",
                    parsed_summary=_extract_summary(change_md),
                    agent_id=ck_agent.id,
                    workflow_id=ck_workflow.id,
                    status="completed" if os.path.exists(os.path.join(change_dir, "INTEGRATION.md")) else "pending"
                )
                db.add(project)
                db.flush()

                # 导入 runtime metrics
                rt_file = os.path.join(change_dir, "runtime.jsonl")
                if os.path.exists(rt_file):
                    for line in open(rt_file):
                        try:
                            rec = json.loads(line.strip())
                            ts_str = rec.get("timestamp", datetime.datetime.utcnow().isoformat())
                            try:
                                ts = datetime.datetime.fromisoformat(ts_str)
                            except Exception:
                                ts = datetime.datetime.utcnow()
                            db.add(MetricRaw(entity_type="project", entity_id=project.id, owner_id=owner_id,
                                             model_name=rec.get("agent", "code-kit"),
                                             token_count=rec.get("tokens_input", 0) + rec.get("tokens_output", 0),
                                             execution_time_ms=0, timestamp=ts))
                            stats["metrics"] += 1
                        except Exception:
                            pass
                stats["projects"] += 1
            except Exception as e:
                print(f"  [WARN] 导入 change '{entry}' 失败: {e}")

    # ── 10. 注入各维度监控数据（聚合 + 会话级）──
    import random, uuid
    all_tools = db.query(Tool).filter(Tool.owner_id == owner_id).all()
    all_workflows = db.query(Workflow).filter(Workflow.owner_id == owner_id).all()
    all_agents = db.query(Agent).filter(Agent.owner_id == owner_id).all()
    all_projects = db.query(Project).filter(Project.owner_id == owner_id).all()
    models = ["qwen2:0.5b", "qwen2:1.5b", "llama3.2:1b"]
    tool_names = ["天气查询", "代码审查", "数据库查询", "文本分析", "安全扫描"]
    now = datetime.datetime.utcnow()

    # 聚合 metrics（5 分钟粒度，过去 2 小时）
    for i in range(24):
        ts = now - datetime.timedelta(minutes=i * 5)
        for t in random.sample(all_tools, min(5, len(all_tools))):
            db.add(MetricRaw(entity_type="tool", entity_id=t.id, owner_id=owner_id, model_name=random.choice(models), token_count=random.randint(1000, 20000), tool_hit_count=random.randint(1, 5), execution_time_ms=random.randint(100, 2000), timestamp=ts))
        for w in random.sample(all_workflows, min(2, len(all_workflows))):
            db.add(MetricRaw(entity_type="workflow", entity_id=w.id, owner_id=owner_id, model_name=random.choice(models), token_count=random.randint(5000, 80000), tool_hit_count=random.randint(2, 10), execution_time_ms=random.randint(500, 5000), timestamp=ts))
        for a in all_agents:
            db.add(MetricRaw(entity_type="agent", entity_id=a.id, owner_id=owner_id, model_name=random.choice(models), token_count=random.randint(10000, 150000), tool_hit_count=random.randint(3, 15), execution_time_ms=random.randint(1000, 8000), timestamp=ts))
        for p in all_projects:
            db.add(MetricRaw(entity_type="project", entity_id=p.id, owner_id=owner_id, model_name=random.choice(models), token_count=random.randint(50000, 500000), tool_hit_count=random.randint(5, 30), execution_time_ms=random.randint(2000, 15000), timestamp=ts))
        stats["metrics"] += 1

    # 会话级 metrics（模拟 20 次模型调用会话）
    for i in range(20):
        sid = str(uuid.uuid4())[:8]
        ts = now - datetime.timedelta(minutes=random.randint(0, 120))
        entity_type = random.choice(["tool", "workflow", "agent", "project"])
        entity_id = random.choice([t.id for t in all_tools] if entity_type == "tool" else [w.id for w in all_workflows] if entity_type == "workflow" else [a.id for a in all_agents] if entity_type == "agent" else [p.id for p in all_projects])
        model = random.choice(models)
        prompt_tok = random.randint(500, 10000)
        completion_tok = random.randint(200, 8000)
        db.add(SessionMetric(
            session_id=sid, entity_type=entity_type, entity_id=entity_id,
            owner_id=owner_id, model_name=model,
            prompt_tokens=prompt_tok, completion_tokens=completion_tok,
            total_tokens=prompt_tok + completion_tok,
            duration_ms=random.randint(200, 10000),
            tool_name=random.choice(tool_names), tool_calls=random.randint(0, 5),
            status=random.choice(["success"] * 8 + ["error"]),
            error_msg="", timestamp=ts
        ))
        stats["metrics"] += 1
    db.commit()
    db.close()

    # audit
    log_audit(owner_id, "系统", "codekit.import", "code-kit", "import", f"{stats['tools']}工具/{stats['workflows']}工作流/{stats['agents']}Agent/{stats['projects']}项目/{stats['roles']}角色/{stats['metrics']}metrics", "127.0.0.1")
    return stats


def _read(path: str) -> str | None:
    if os.path.exists(path):
        with open(path) as f:
            return f.read()
    return None


def _first_title(md: str) -> str:
    for line in md.split("\n"):
        line = line.strip()
        if line.startswith("# "):
            return line.replace("# ", "").strip()
    return ""


def _extract_title(md: str | None) -> str:
    if not md:
        return "未命名"
    for line in md.split("\n"):
        line = line.strip()
        if line.startswith("# ") and "CHANGE" not in line:
            return line.replace("# ", "").strip()
    return "未命名"


def _parse_role_md(content: str) -> tuple:
    """解析 code-kit R-*.md 角色文件，提取结构化数据."""
    triggers, cans, cannots, evals, inputs_list, outputs_list = [], [], [], [], [], []
    section = ""
    for line in content.split("\n"):
        stripped = line.strip()
        if "## 触发场景" in stripped: section = "triggers"; continue
        if "## 边界" in stripped: section = "boundaries"; continue
        if "## 评估框架" in stripped: section = "evaluation"; continue
        if "## 输入" in stripped: section = "inputs"; continue
        if "## 输出" in stripped: section = "outputs";
        if stripped.startswith("## ") and "触发" not in stripped and "边界" not in stripped and "评估" not in stripped and "输入" not in stripped and "输出" not in stripped: section = ""
        if section == "triggers" and "|" in stripped and "核心议题" not in stripped:
            parts = [p.strip() for p in stripped.split("|") if p.strip()]
            if len(parts) >= 3 and parts[0] != "**门**":
                triggers.append({"gate": parts[0].replace("**","").strip(), "topic": parts[2].replace("**","").strip()[:50]})
        if section == "boundaries":
            if "能做" in stripped or "✅" in stripped: cans.append(stripped.replace("✅","").replace("*","").strip()[:80])
            if "不能做" in stripped or "❌" in stripped: cannots.append(stripped.replace("❌","").replace("*","").strip()[:80])
        if section == "evaluation" and stripped.startswith("- [ ]"):
            evals.append({"step": str(len(evals)+1), "title": "", "items": [stripped.replace("- [ ]","").strip()[:100]]})
    return triggers, cans[:5], cannots[:5], evals[:5], inputs_list[:5], outputs_list[:5]


def _extract_temperament(content: str) -> str:
    for line in content.split("\n"):
        if "性情" in line or "核心原则" in line:
            return line.strip()[:100]
    return ""


def _extract_responsibilities(content: str) -> list:
    resp = []
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped.startswith("✅") or "能做" in stripped:
            resp.append(stripped.replace("✅","").replace("*","").strip()[:80])
    return resp[:8]


def _extract_summary(md: str | None) -> str:
    if not md:
        return ""
    lines = md.split("\n")
    summary = []
    in_section = False
    for line in lines:
        if "## Why" in line or "## What" in line:
            in_section = True
            continue
        if in_section and line.startswith("##"):
            break
        if in_section and line.strip() and not line.startswith("---"):
            summary.append(line.strip())
    return " ".join(summary[:5]) if summary else ""
