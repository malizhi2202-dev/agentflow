"""K8s 风格 YAML Agent 编排解析器."""
import yaml
from typing import Any


REQUIRED_TOP_KEYS = {"apiVersion", "kind", "spec"}
VALID_API_VERSIONS = {"ai-platform/v1"}
VALID_KINDS = {"AgentOrchestration"}

SCHEMA = {
    "agents": {"type": "list", "required": True, "item_keys": {"name", "spec"}},
    "agent_spec": {"tool_keys": {"workflow"}, "model_keys": {"provider", "name"}, "sop_keys": {"trigger", "input", "output"}},
    "routes": {"type": "list", "item_keys": {"from", "to", "type"}},
    "parallelism": {"keys": {"strategy", "max_concurrency"}},
}


def parse_yaml(yaml_str: str) -> tuple[dict | None, list[str]]:
    """解析 YAML 编排配置。返回 (parsed_dict, errors)。
    成功时 errors 为空列表。
    """
    errors: list[str] = []

    # 1. YAML 语法检查
    try:
        doc = yaml.safe_load(yaml_str)
    except yaml.YAMLError as e:
        if hasattr(e, "problem_mark") and e.problem_mark:
            m = e.problem_mark
            errors.append(f"line {m.line + 1}, col {m.column + 1}: YAML 语法错误 — {e.problem}")
        else:
            errors.append(f"YAML 语法错误: {e}")
        return None, errors

    if doc is None:
        errors.append("YAML 文件为空")
        return None, errors

    if not isinstance(doc, dict):
        errors.append("YAML 顶层必须是 mapping")
        return None, errors

    # 2. 顶层字段校验
    missing_top = REQUIRED_TOP_KEYS - set(doc.keys())
    if missing_top:
        errors.append(f"缺少顶层字段: {', '.join(sorted(missing_top))}")

    if doc.get("apiVersion") not in VALID_API_VERSIONS:
        errors.append(f"apiVersion 必须为 {', '.join(VALID_API_VERSIONS)}，当前: {doc.get('apiVersion')}")

    if doc.get("kind") not in VALID_KINDS:
        errors.append(f"kind 必须为 {', '.join(VALID_KINDS)}，当前: {doc.get('kind')}")

    # 3. spec 校验
    spec = doc.get("spec", {})
    if not isinstance(spec, dict):
        errors.append("spec 必须是 mapping")
        return None, errors

    agents = spec.get("agents", [])
    if not isinstance(agents, list) or len(agents) == 0:
        errors.append("spec.agents 必须是非空列表")
    else:
        agent_names = set()
        for i, agent in enumerate(agents):
            if not isinstance(agent, dict):
                errors.append(f"agents[{i}] 必须是 mapping")
                continue
            name = agent.get("name", "")
            if not name:
                errors.append(f"agents[{i}]: 缺少 name 字段")
            elif name in agent_names:
                errors.append(f"agents[{i}]: name '{name}' 重复")
            else:
                agent_names.add(name)
            ag_spec = agent.get("spec", {})
            if not isinstance(ag_spec, dict):
                errors.append(f"agents[{i}].spec 必须是 mapping")
                continue
            # 模型校验
            model = ag_spec.get("model", {})
            if not model.get("name"):
                errors.append(f"agents[{i}] ({name}): 缺少 spec.model.name")
            if not model.get("provider"):
                errors.append(f"agents[{i}] ({name}): 缺少 spec.model.provider")
            # 工具校验
            tools = ag_spec.get("tools", {})
            if not tools.get("workflow"):
                errors.append(f"agents[{i}] ({name}): 缺少 spec.tools.workflow")
            # sop 校验
            sop = ag_spec.get("sop", {})
            if not sop.get("trigger"):
                errors.append(f"agents[{i}] ({name}): 缺少 spec.sop.trigger")
            # 监控项
            monitoring = ag_spec.get("monitoring", [])
            if isinstance(monitoring, list):
                valid_metrics = {"token_consumption", "execution_time", "tool_hit_count"}
                for mi, m in enumerate(monitoring):
                    if isinstance(m, dict) and m.get("metric") not in valid_metrics:
                        errors.append(f"agents[{i}] ({name}): monitoring[{mi}].metric 无效: '{m.get('metric')}'，有效值: {', '.join(sorted(valid_metrics))}")

    # 4. routes 校验
    routes = spec.get("routes", [])
    if isinstance(routes, list):
        valid_types = {"sequential", "parallel", "conditional"}
        for ri, route in enumerate(routes):
            if not isinstance(route, dict):
                errors.append(f"routes[{ri}] 必须是 mapping")
                continue
            for k in ("from", "to", "type"):
                if k not in route:
                    errors.append(f"routes[{ri}]: 缺少 '{k}' 字段")
            if route.get("type") not in valid_types:
                errors.append(f"routes[{ri}]: type '{route.get('type')}' 无效，有效值: {', '.join(sorted(valid_types))}")

    if errors:
        return None, errors

    # 成功 → 构建编排 DAG
    dag = _build_dag(spec)
    return {"metadata": {"name": doc.get("metadata", {}).get("name", ""), "description": doc.get("metadata", {}).get("description", "")}, "spec": spec, "dag": dag}, []


def _build_dag(spec: dict) -> dict:
    agents_list = spec.get("agents", [])
    routes = spec.get("routes", [])
    nodes = []
    for a in agents_list:
        ag_spec = a.get("spec", {})
        nodes.append({"id": a["name"], "label": a["name"], "model": ag_spec.get("model", {}).get("name", ""), "workflow": ag_spec.get("tools", {}).get("workflow", ""), "sop": ag_spec.get("sop", {})})
    edges = []
    for r in routes:
        edges.append({"from": r["from"], "to": r["to"], "type": r.get("type", "sequential")})
    parallelism = spec.get("parallelism", {})
    return {"nodes": nodes, "edges": edges, "parallelism": parallelism}
