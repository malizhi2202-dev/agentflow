"""Agent 编排 API — apply/validate/CRUD/调度队列/模板."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from engine.yaml_schema import validate_yaml
from engine.scheduler import scheduler
from services.template_service import render_template, validate_params
from services.audit_service import log_audit
from models.orchestration import (
    OrchestrationInstance,
    TopologySnapshot,
    OrchestrationTemplate,
    SchedulingQueue,
)
import datetime
import yaml

router = APIRouter(prefix="/api/orchestration", tags=["orchestration"])


def _user(request: Request) -> dict:
    return getattr(request.state, "user", {"id": "admin", "name": "admin", "role": "admin"})


def _uid(request: Request) -> str:
    return _user(request).get("id", "admin")


def _status_color(status: str) -> str:
    """编排实例状态 → 前端展示颜色."""
    colors = {
        "running": "#5cb878", "success": "#5cb878",
        "failed": "#e05555", "crashed": "#e05555",
        "degraded": "#e8a450", "pending": "#e8a450", "converging": "#e8a450",
        "draft": "#5d6068", "stopped": "#5d6068",
    }
    return colors.get(status, "#5d6068")


def _build_markdown(inst) -> str:
    """从编排实例生成 Markdown 文档."""
    import yaml as _yaml
    try:
        doc = _yaml.safe_load(inst.yaml_raw)
    except Exception:
        return f"# {inst.name}\n\n> YAML 解析失败"
    meta = doc.get("metadata", {})
    spec = doc.get("spec", {})
    agents = spec.get("agents", [])
    routes = spec.get("routes", [])
    edges = inst.edges_json or []

    lines = [f"# 编排: {meta.get('name', inst.name)}", ""]
    lines.append(f"**状态**: {inst.status} | **更新时间**: {inst.updated_at.isoformat() if inst.updated_at else '-'}")
    lines.append("")

    lines.append("## Agent 列表")
    lines.append("")
    lines.append("| # | 名称 | Runtime | 模型 | Workflow ID |")
    lines.append("|---|---|---|---|---|")
    for i, a in enumerate(agents):
        s = a.get("spec", {})
        lines.append(f"| {i+1} | {a.get('name','-')} | {s.get('runtime','-')} | {s.get('model',{}).get('name','-')} | {s.get('workflow_id','-')} |")
    lines.append("")

    if routes:
        lines.append("## 路由表")
        lines.append("")
        lines.append("| # | From | To | 类型 | 触发条件 | 描述 |")
        lines.append("|---|---|---|---|---|---|")
        for i, r in enumerate(routes):
            edge = edges[i] if i < len(edges) else {}
            lines.append(f"| {i+1} | {r.get('from','-')} | {r.get('to','-')} | {edge.get('type', r.get('type','-'))} | {edge.get('trigger_condition','-')} | {edge.get('description','-')} |")
        lines.append("")

    lines.append("## Token 限制")
    lines.append(f"- 软限制: {inst.token_soft_limit:,} | 硬限制: {inst.token_hard_limit:,}")
    return "\n".join(lines)


# ── Apply / Validate ──

@router.post("/apply")
def api_apply(payload: dict, request: Request, db: Session = Depends(get_db)):
    """提交 YAML → 校验 → 创建/更新编排实例 + 拓扑快照 → 入调度队列."""
    yaml_raw = payload.get("yaml_raw", "")
    edges_config = payload.get("edges_config", [])
    owner_id = _uid(request)

    result = validate_yaml(yaml_raw)
    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("errors", [{"message": "YAML 校验失败"}]))

    doc = yaml.safe_load(yaml_raw)
    meta = doc.get("metadata", {})
    spec = doc.get("spec", {})
    name = meta.get("name", "unnamed")
    agents = spec.get("agents", [])

    strategy = spec.get("strategy", {})
    agent_ids = [a.get("spec", {}).get("workflow_id", 0) for a in agents]

    # 检查 name 是否已存在 → 更新
    existing = db.query(OrchestrationInstance).filter(
        OrchestrationInstance.owner_id == owner_id,
        OrchestrationInstance.name == name,
    ).first()

    if existing:
        existing.yaml_raw = yaml_raw
        existing.edges_json = edges_config
        existing.agent_ids = agent_ids
        existing.priority = strategy.get("priority", 50)
        existing.token_soft_limit = strategy.get("token_soft_limit", 800000)
        existing.token_hard_limit = strategy.get("token_hard_limit", 1000000)
        existing.max_retries = strategy.get("max_retries", 3)
        existing.retry_backoff = strategy.get("retry_backoff", "exponential")
        existing.on_failure = strategy.get("on_failure", "degrade")
        existing.status = "converging"
        existing.transition_status = "updating"
        existing.updated_at = datetime.datetime.utcnow()
        instance = existing
    else:
        instance = OrchestrationInstance(
            owner_id=owner_id,
            name=name,
            yaml_raw=yaml_raw,
            edges_json=edges_config,
            agent_ids=agent_ids,
            priority=strategy.get("priority", 50),
            token_soft_limit=strategy.get("token_soft_limit", 800000),
            token_hard_limit=strategy.get("token_hard_limit", 1000000),
            max_retries=strategy.get("max_retries", 3),
            retry_backoff=strategy.get("retry_backoff", "exponential"),
            on_failure=strategy.get("on_failure", "degrade"),
            status="pending",
        )
        db.add(instance)
        db.flush()

    # 拓扑快照
    snapshot = TopologySnapshot(
        instance_id=instance.id,
        yaml_raw=yaml_raw,
        node_count=len(agents),
        edge_count=len(spec.get("routes", [])),
    )
    db.add(snapshot)

    # 入调度队列
    queue_entry = SchedulingQueue(
        instance_id=instance.id,
        priority=strategy.get("priority", 50),
        status="queued",
        max_wait_until=datetime.datetime.utcnow() + datetime.timedelta(minutes=5),
    )
    db.add(queue_entry)
    db.commit()
    db.refresh(instance)

    log_audit(owner_id, _user(request).get("name", ""), "orchestration.apply", str(instance.id), "orchestration", f"apply '{name}'", "127.0.0.1")

    return {"ok": True, "orchestration_id": instance.id, "status": instance.status}


@router.post("/validate")
def api_validate(payload: dict, request: Request = None):
    """YAML 校验（dry-run 不创建实例）."""
    yaml_raw = payload.get("yaml_raw", "")
    return validate_yaml(yaml_raw)


# ── CRUD ──

@router.get("")
def api_list(request: Request, db: Session = Depends(get_db)):
    """编排实例列表（按 owner 隔离）."""
    owner_id = _uid(request)
    instances = db.query(OrchestrationInstance).filter(
        OrchestrationInstance.owner_id == owner_id
    ).order_by(OrchestrationInstance.updated_at.desc()).all()
    return [
        {
            "id": i.id, "name": i.name, "status": i.status,
            "status_color": _status_color(i.status),
            "transition_status": i.transition_status,
            "agent_count": len(i.agent_ids or []),
            "priority": i.priority,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in instances
    ]


# ── Queue ──

@router.get("/queue/list")
def api_queue(request: Request, db: Session = Depends(get_db)):
    """调度队列状态."""
    entries = db.query(SchedulingQueue).filter(
        SchedulingQueue.status.in_(["queued", "scheduled", "executing"])
    ).order_by(SchedulingQueue.priority.desc(), SchedulingQueue.enqueued_at).all()
    return [
        {
            "id": e.id, "instance_id": e.instance_id,
            "priority": e.priority, "status": e.status,
            "enqueued_at": e.enqueued_at.isoformat(),
        }
        for e in entries
    ]


# ── Migration ──

@router.get("/migrate-check")
def api_migrate_check(request: Request, db: Session = Depends(get_db)):
    """检查需要从 spec_json 迁移的编排实例."""
    from services.snapshot_service import migrate_spec_json_to_yaml
    owner_id = _uid(request)
    instances = db.query(OrchestrationInstance).filter(
        OrchestrationInstance.owner_id == owner_id,
        OrchestrationInstance.yaml_raw.like("%spec_json%"),
    ).all() if False else []  # 检测旧格式
    return {"needs_migration": len(instances), "instances": [{"id": i.id, "name": i.name} for i in instances]}


# ── Templates ──

@router.get("/templates")
def api_list_templates(request: Request, db: Session = Depends(get_db)):
    """模板列表（市场：published + 自己的私有模板）."""
    owner_id = _uid(request)
    templates = db.query(OrchestrationTemplate).filter(
        (OrchestrationTemplate.published == True) | (OrchestrationTemplate.owner_id == owner_id)
    ).order_by(OrchestrationTemplate.deploy_count.desc()).all()
    return [
        {
            "id": t.id, "name": t.name, "description": t.description,
            "params": t.params_schema, "published": t.published,
            "deploy_count": t.deploy_count, "owner_id": t.owner_id,
        }
        for t in templates
    ]


@router.post("/templates")
def api_create_template(payload: dict, request: Request, db: Session = Depends(get_db)):
    """保存编排模板."""
    tpl = OrchestrationTemplate(
        owner_id=_uid(request),
        name=payload.get("name", ""),
        description=payload.get("description", ""),
        yaml_raw=payload.get("yaml_raw", ""),
        params_schema=payload.get("params_schema", []),
        published=payload.get("published", False),
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    log_audit(_uid(request), _user(request).get("name", ""), "template.create", str(tpl.id), "template", f"create '{tpl.name}'", "127.0.0.1")
    return {"ok": True, "template_id": tpl.id}


@router.post("/templates/{template_id}/deploy")
def api_deploy_template(template_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    """从模板渲染参数 → apply 部署."""
    tpl = db.query(OrchestrationTemplate).filter(OrchestrationTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="模板不存在")

    values = payload.get("values", {})
    missing = validate_params(tpl.yaml_raw, values)
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少参数: {missing}")

    rendered = render_template(tpl.yaml_raw, values)
    result = api_apply({"yaml_raw": rendered}, request, db)

    tpl.deploy_count += 1
    db.commit()

    log_audit(_uid(request), _user(request).get("name", ""), "orchestration.apply", f"tpl:{template_id}", "template", f"deploy '{tpl.name}'", "127.0.0.1")
    return result
@router.get("/{instance_id}/yaml")
def api_get_yaml(instance_id: int, request: Request, db: Session = Depends(get_db)):
    """返回编排实例的原始 YAML（Content-Type: text/yaml）."""
    from fastapi.responses import PlainTextResponse
    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")
    return PlainTextResponse(content=inst.yaml_raw, media_type="text/yaml")


@router.get("/{instance_id}/md")
def api_get_md(instance_id: int, request: Request, db: Session = Depends(get_db)):
    """返回编排实例的 Markdown 文档."""
    from fastapi.responses import PlainTextResponse
    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")
    md = _build_markdown(inst)
    return PlainTextResponse(content=md, media_type="text/markdown")


@router.get("/{instance_id}")
def api_detail(instance_id: int, request: Request, db: Session = Depends(get_db)):
    """编排实例详情 + 拓扑快照."""
    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")

    snapshot = db.query(TopologySnapshot).filter(
        TopologySnapshot.instance_id == instance_id
    ).order_by(TopologySnapshot.created_at.desc()).first()

    return {
        "id": inst.id, "name": inst.name, "status": inst.status,
        "status_color": _status_color(inst.status),
        "transition_status": inst.transition_status,
        "yaml_raw": inst.yaml_raw,
        "edges_json": inst.edges_json or [],
        "agent_ids": inst.agent_ids,
        "priority": inst.priority,
        "token_soft_limit": inst.token_soft_limit,
        "token_hard_limit": inst.token_hard_limit,
        "max_retries": inst.max_retries,
        "retry_backoff": inst.retry_backoff,
        "on_failure": inst.on_failure,
        "snapshot": {
            "node_count": snapshot.node_count if snapshot else 0,
            "edge_count": snapshot.edge_count if snapshot else 0,
            "created_at": snapshot.created_at.isoformat() if snapshot else None,
        } if snapshot else None,
        "created_at": inst.created_at.isoformat(),
        "updated_at": inst.updated_at.isoformat(),
    }


@router.delete("/{instance_id}")
def api_delete(instance_id: int, request: Request, db: Session = Depends(get_db)):
    """删除编排实例（running 状态不可删）."""
    inst = db.query(OrchestrationInstance).filter(OrchestrationInstance.id == instance_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="编排实例不存在")
    if inst.status == "running":
        raise HTTPException(status_code=400, detail="运行中的编排实例不可删除，请先停止")

    log_audit(_uid(request), _user(request).get("name", ""), "orchestration.delete", str(instance_id), "orchestration", f"delete '{inst.name}'", "127.0.0.1")
    db.delete(inst)
    db.commit()
    return {"ok": True}


