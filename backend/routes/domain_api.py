"""Domain API 路由 — 隔离域 CRUD + K8s 自动路由 + 弹性缩放."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.domain import Domain
from models.agent import Agent
from services.audit_service import log_audit
from services.k8s_routing_service import (
    route_to_agent, get_queued_count, simulate_queue_monitor, _extract_capabilities,
)

router = APIRouter(prefix="/api/domains", tags=["domains"])


def _user(request: Request) -> dict:
    return request.state.user


def _filter_owner(q, user: dict):
    if user.get("role") != "admin":
        q = q.filter(Domain.owner_id == user["id"])
    return q


@router.get("")
def list_domains(request: Request = None, db: Session = Depends(get_db)):
    """列出所有域（普通用户只看自己的，admin 看全部）"""
    user = _user(request)
    q = _filter_owner(db.query(Domain), user)
    domains = q.order_by(Domain.id.asc()).all()
    # 计算每个域下的 agent 数量
    result = []
    for d in domains:
        agent_count = db.query(Agent).filter(Agent.domain_id == d.id).count()
        result.append({**d.to_dict(), "agent_count": agent_count})
    return {"domains": result, "total": len(result)}


@router.post("")
def create_domain(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """创建域"""
    user = _user(request)
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="域名称不能为空")
    # 检查名称是否重复（同一 owner）
    existing = db.query(Domain).filter(Domain.name == name, Domain.owner_id == user["id"]).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"域 '{name}' 已存在")
    domain = Domain(name=name, owner_id=user["id"])
    db.add(domain)
    db.commit()
    db.refresh(domain)
    log_audit(user["id"], user.get("name", user["id"]), "domain.create", domain.name, "domain", "created",
              request.client.host if request.client else "127.0.0.1")
    return domain.to_dict()


@router.put("/{domain_id}")
def update_domain(domain_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """更新域名称"""
    user = _user(request)
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    domain = q.first()
    if not domain:
        raise HTTPException(status_code=404, detail="域不存在")
    name = payload.get("name", "").strip()
    if name:
        # 检查重名
        dup = db.query(Domain).filter(Domain.name == name, Domain.owner_id == user["id"],
                                       Domain.id != domain_id).first()
        if dup:
            raise HTTPException(status_code=400, detail=f"域 '{name}' 已存在")
        domain.name = name
        db.commit()
        db.refresh(domain)
        log_audit(user["id"], user.get("name", user["id"]), "domain.update", domain.name, "domain", "updated",
                  request.client.host if request.client else "127.0.0.1")
    return domain.to_dict()


@router.delete("/{domain_id}")
def delete_domain(domain_id: int, request: Request = None, db: Session = Depends(get_db)):
    """删除域：将域内所有 Agent 的 domain_id 置 NULL（回归默认域）"""
    user = _user(request)
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    domain = q.first()
    if not domain:
        raise HTTPException(status_code=404, detail="域不存在")
    # 将域内 Agent 的 domain_id 置 NULL
    affected = db.query(Agent).filter(Agent.domain_id == domain_id).update({"domain_id": None})
    db.delete(domain)
    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "domain.delete", domain.name, "domain",
              f"deleted (agents_released={affected})",
              request.client.host if request.client else "127.0.0.1")
    return {"status": "deleted", "agents_released": affected}


@router.get("/{domain_id}/capabilities")
def list_domain_capabilities(domain_id: int, request: Request = None, db: Session = Depends(get_db)):
    """列出域内所有 Agent 的唯一 capability 列表."""
    user = _user(request)
    # 先验证域存在
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    domain = q.first()
    if not domain:
        raise HTTPException(status_code=404, detail="域不存在")
    # 获取域内所有 Agent
    agents = db.query(Agent).filter(Agent.domain_id == domain_id).all()
    caps_set = set()
    for a in agents:
        cfg = a.model_config_json or {}
        caps = cfg.get("capabilities", [])
        if isinstance(caps, list):
            for c in caps:
                if isinstance(c, str) and c.strip():
                    caps_set.add(c)
    return {"domain_id": domain_id, "domain_name": domain.name, "capabilities": sorted(caps_set)}


# ── A. 域内自动路由 (K8s-inspired) ──────────────────────────────

@router.post("/{domain_id}/route")
def route_in_domain(domain_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """在指定域内按 capability 自动选择最优 Agent.

    Body: {"capability": "code-review", "task": {...}}
    Returns: {"agent_id": N, "agent_name": "..", "load": "2/5"} 或 {"status": "queued", "position": N}
    """
    user = _user(request)
    capability = payload.get("capability", "").strip()
    if not capability:
        raise HTTPException(status_code=400, detail="缺少 capability 参数")

    # 验证域存在
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    domain = q.first()
    if not domain:
        raise HTTPException(status_code=404, detail="域不存在")

    # 获取域内所有 Agent
    agents = db.query(Agent).filter(Agent.domain_id == domain_id).all()
    if not agents:
        return {"status": "queued", "position": 0, "detail": "该域没有 Agent"}

    # 使用 K8s 路由逻辑
    result = route_to_agent(agents, capability)
    result["domain_id"] = domain_id
    result["domain_name"] = domain.name
    return result


@router.get("/{domain_id}/queue-count")
def get_capability_queue_counts(domain_id: int, capability: str | None = None,
                                 request: Request = None, db: Session = Depends(get_db)):
    """获取域内 capability 组的排队计数.

    Query: ?capability=code-review  (可选，不传返回所有 capabilities)
    """
    user = _user(request)
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    if not q.first():
        raise HTTPException(status_code=404, detail="域不存在")
    if capability:
        return {
            "domain_id": domain_id,
            "capability": capability,
            "queued": get_queued_count(domain_id, capability),
        }
    # 列出所有 capabilities 的排队计数
    agents = db.query(Agent).filter(Agent.domain_id == domain_id).all()
    caps_set = set()
    for a in agents:
        for c in _extract_capabilities(a):
            caps_set.add(c)
    result = {}
    for c in sorted(caps_set):
        result[c] = get_queued_count(domain_id, c)
    return {"domain_id": domain_id, "queued_by_capability": result}


# ── C. 弹性缩放 (K8s-inspired progressive expansion) ──────────

@router.post("/{domain_id}/scale")
def scale_agents(domain_id: int, payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """弹性缩放：按 capability 创建 Agent 副本.

    Body: {"capability": "code-review", "desired_replicas": 5}
    - 查找域内该 capability 的现有 Agent，用第一个的配置创建新副本
    - new_count = desired_replicas - current_count
    """
    user = _user(request)
    capability = payload.get("capability", "").strip()
    desired = payload.get("desired_replicas")
    if not capability:
        raise HTTPException(status_code=400, detail="缺少 capability 参数")
    if desired is None or not isinstance(desired, int) or desired < 0:
        raise HTTPException(status_code=400, detail="desired_replicas 必须为非负整数")

    # 验证域
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    domain = q.first()
    if not domain:
        raise HTTPException(status_code=404, detail="域不存在")

    # 获取域内具备该 capability 的所有 Agent
    all_agents = db.query(Agent).filter(Agent.domain_id == domain_id).all()
    matching = []
    for a in all_agents:
        caps = _extract_capabilities(a)
        if capability in caps:
            matching.append(a)

    current_count = len(matching)
    if current_count >= desired:
        return {
            "status": "no_op",
            "domain_id": domain_id,
            "capability": capability,
            "current_replicas": current_count,
            "desired_replicas": desired,
            "detail": f"已有 {current_count} 个副本，无需扩容",
        }

    if not matching and desired > 0:
        raise HTTPException(status_code=400,
                            detail=f"该域没有具备 '{capability}' 能力的 Agent 作为模板，无法扩容")

    # 以第一个匹配 Agent 为模板创建新副本
    template = matching[0]
    to_create = desired - current_count
    created = []
    for i in range(to_create):
        new_agent = Agent(
            owner_id=user["id"],
            name=f"{template.name}-replica-{i + 1}",
            description=template.description,
            runtime=template.runtime,
            model_provider=template.model_provider,
            model_name=template.model_name,
            model_config_json=template.model_config_json,
            api_key_encrypted=template.api_key_encrypted,
            domain_id=domain_id,
            workflow_id=template.workflow_id,
            token_soft_limit=template.token_soft_limit,
            token_hard_limit=template.token_hard_limit,
            visibility=template.visibility,
        )
        db.add(new_agent)
        db.flush()
        created.append(new_agent.to_dict())

    db.commit()
    log_audit(user["id"], user.get("name", user["id"]), "domain.scale",
              f"{domain.name}:{capability}", "domain",
              f"scaled {current_count}→{desired} (+{to_create})",
              request.client.host if request.client else "127.0.0.1")

    return {
        "status": "scaled",
        "domain_id": domain_id,
        "capability": capability,
        "current_replicas": current_count,
        "desired_replicas": desired,
        "created": to_create,
        "agents": created,
    }


@router.get("/{domain_id}/queue-monitor")
def queue_monitor(domain_id: int, capability: str | None = None,
                  request: Request = None, db: Session = Depends(get_db)):
    """队列监控：查看某 capability 是否需要扩容."""
    user = _user(request)
    q = _filter_owner(db.query(Domain).filter(Domain.id == domain_id), user)
    if not q.first():
        raise HTTPException(status_code=404, detail="域不存在")
    agents = db.query(Agent).filter(Agent.domain_id == domain_id).all()
    if capability:
        return simulate_queue_monitor(domain_id, capability, agents)
    # 所有 capabilities
    caps_set = set()
    for a in agents:
        for c in _extract_capabilities(a):
            caps_set.add(c)
    results = []
    for c in sorted(caps_set):
        results.append(simulate_queue_monitor(domain_id, c, agents))
    return {"domain_id": domain_id, "monitors": results}
