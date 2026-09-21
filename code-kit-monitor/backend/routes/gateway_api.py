"""Gateway Agent — 统一路由入口 (K8s-inspired).

用户无需选择域，只需声明 capability，网关自动扫描所有域并选择最优 Agent。
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.domain import Domain
from models.agent import Agent
from services.k8s_routing_service import route_to_agent

router = APIRouter(prefix="/api/gateway", tags=["gateway"])


def _user(request: Request) -> dict:
    return request.state.user


@router.post("/route")
def gateway_route(payload: dict, request: Request = None, db: Session = Depends(get_db)):
    """统一网关路由：跨所有域查找最优 Agent.

    Body: {"capability": "code-review", "task": {...}}
    - 扫描所有域中具备该 capability 的 Agent
    - 选负载最低的
    - 返回 selected agent + proxy instructions

    Returns:
        routed → {"agent_id", "agent_name", "load", "domain_id", "domain_name", "proxy_url": "/api/agents/{id}/run"}
        queued → {"status": "queued", "position": N, "detail": "..."}
    """
    user = _user(request)
    capability = payload.get("capability", "").strip()
    if not capability:
        raise HTTPException(status_code=400, detail="缺少 capability 参数")

    # 扫描所有域及默认域（domain_id=NULL 的 Agent）
    all_domains = db.query(Domain).all()
    # 获取无域 Agent
    unassigned_agents = db.query(Agent).filter(Agent.domain_id.is_(None)).all()

    all_candidates = list(unassigned_agents)
    domain_map: dict[int, str] = {}  # domain_id → name

    for domain in all_domains:
        agents = db.query(Agent).filter(Agent.domain_id == domain.id).all()
        all_candidates.extend(agents)
        domain_map[domain.id] = domain.name

    if not all_candidates:
        return {"status": "queued", "position": 0, "detail": "系统没有注册任何 Agent"}

    # 使用 K8s 路由逻辑，跨域选择
    result = route_to_agent(all_candidates, capability)

    if result.get("status") == "routed":
        agent_id = result["agent_id"]
        # 查找所属域
        agent_row = next((a for a in all_candidates if a.id == agent_id), None)
        if agent_row:
            did = agent_row.domain_id
            result["domain_id"] = did
            result["domain_name"] = domain_map.get(did, "默认域") if did else "默认域"
        # 添加 proxy 指令
        result["proxy_url"] = f"/api/agents/{agent_id}/run"
        result["proxy_instructions"] = f"调用 {result.get('agent_name', 'Agent')} 执行 {capability} 任务"

    return result


@router.get("/domains-capabilities")
def gateway_list_capabilities(request: Request = None, db: Session = Depends(get_db)):
    """网关能力清单：列出跨所有域的 capability 汇总.

    返回:
        {"capabilities": {"code-review": {"domain_count": 2, "agent_count": 5, "available": 3}, ...}}
    """
    user = _user(request)
    all_agents = db.query(Agent).all()
    caps_summary: dict[str, dict] = {}

    for a in all_agents:
        cfg = a.model_config_json or {}
        caps = cfg.get("capabilities", []) if isinstance(cfg, dict) and isinstance(cfg.get("capabilities"), list) else []
        domain_id = a.domain_id or 0
        current_load = cfg.get("current_load", 0) if isinstance(cfg, dict) else 0
        max_conc = cfg.get("max_concurrency", 5) if isinstance(cfg, dict) else 5
        available = current_load < max_conc

        for c in caps:
            if c not in caps_summary:
                caps_summary[c] = {"domain_ids": set(), "agent_count": 0, "available": 0}
            caps_summary[c]["domain_ids"].add(domain_id)
            caps_summary[c]["agent_count"] += 1
            if available:
                caps_summary[c]["available"] += 1

    result = {}
    for cap, info in caps_summary.items():
        result[cap] = {
            "domain_count": len(info["domain_ids"]),
            "agent_count": info["agent_count"],
            "available": info["available"],
        }
    return {"capabilities": result}
