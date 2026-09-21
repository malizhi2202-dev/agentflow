"""YAML Schema 校验器 — 解析 + 校验 Agent 编排 YAML."""
from __future__ import annotations

import re
from collections import deque
from typing import Any

import yaml

# ── jsonschema 校验 ──
ORCHESTRATION_SCHEMA = {
    "type": "object",
    "required": ["apiVersion", "kind", "metadata", "spec"],
    "properties": {
        "apiVersion": {"type": "string", "enum": ["ai-platform/v1"]},
        "kind": {"type": "string", "enum": ["AgentOrchestration"]},
        "metadata": {
            "type": "object",
            "required": ["name"],
            "properties": {
                "name": {"type": "string", "minLength": 1},
                "description": {"type": "string"},
            },
        },
        "spec": {
            "type": "object",
            "required": ["agents", "routes"],
            "properties": {
                "strategy": {
                    "type": "object",
                    "properties": {
                        "priority": {"type": "integer", "minimum": 0, "maximum": 100},
                        "token_soft_limit": {"type": "integer", "minimum": 0},
                        "token_hard_limit": {"type": "integer", "minimum": 0},
                        "max_retries": {"type": "integer", "minimum": 0, "maximum": 10},
                        "retry_backoff": {"type": "string", "enum": ["exponential", "linear", "fixed"]},
                        "on_failure": {"type": "string", "enum": ["degrade", "halt", "ignore"]},
                    },
                },
                "agents": {
                    "type": "array",
                    "minItems": 1,
                    "items": {
                        "type": "object",
                        "required": ["name", "kind", "spec"],
                        "properties": {
                            "name": {"type": "string", "minLength": 1},
                            "kind": {"type": "string", "enum": ["Agent"]},
                            "spec": {
                                "type": "object",
                                "required": ["runtime", "model", "workflow_id"],
                                "properties": {
                                    "runtime": {"type": "string"},
                                    "model": {
                                        "type": "object",
                                        "required": ["provider", "name"],
                                        "properties": {
                                            "provider": {"type": "string"},
                                            "name": {"type": "string"},
                                            "api_key_ref": {"type": "string"},
                                        },
                                    },
                                    "workflow_id": {"type": "integer"},
                                    "token_soft_limit": {"type": "integer"},
                                    "token_hard_limit": {"type": "integer"},
                                    "gate_pre": {"type": "string"},
                                    "gate_post": {"type": "string"},
                                    "io_filter": {"type": "string"},
                                },
                            },
                        },
                    },
                },
                "routes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["from", "to", "type"],
                        "properties": {
                            "from": {"type": "string", "minLength": 1},
                            "to": {"type": "string", "minLength": 1},
                            "type": {"type": "string", "enum": ["sequential", "pipeline", "parallel", "fan-out", "fan-in", "map-reduce", "fork", "condition", "master-slave", "event-trigger", "human-approval", "retry-fallback", "dead-letter"]},
                            "condition": {"type": "string"},
                        },
                    },
                },
            },
        },
    },
}

MAX_YAML_SIZE = 1 * 1024 * 1024  # 1MB
MAX_NESTING_DEPTH = 50


def _check_nesting(obj: Any, depth: int = 0) -> int:
    """递归计算最大嵌套深度."""
    if depth > MAX_NESTING_DEPTH:
        return depth
    if isinstance(obj, dict):
        return max((_check_nesting(v, depth + 1) for v in obj.values()), default=depth)
    if isinstance(obj, list):
        return max((_check_nesting(v, depth + 1) for v in obj), default=depth)
    return depth


def _check_dag(agents: list[dict], routes: list[dict]) -> list[dict]:
    """检测 DAG 合法性：无孤立节点、无自环、无循环引用."""
    agent_names = {a["name"] for a in agents}
    errors: list[dict] = []

    for i, route in enumerate(routes):
        frm = route.get("from", "")
        to = route.get("to", "")
        if frm not in agent_names:
            errors.append({"line": 0, "field": f"routes[{i}].from", "message": f"引用不存在的 agent: '{frm}'"})
        if to not in agent_names:
            errors.append({"line": 0, "field": f"routes[{i}].to", "message": f"引用不存在的 agent: '{to}'"})
        if frm == to and route.get("type") != "fork":
            errors.append({"line": 0, "field": f"routes[{i}]", "message": f"自环连线仅在 fork 类型中允许: {frm} → {to}"})

    # 检测循环引用 (BFS)
    adj: dict[str, list[str]] = {n: [] for n in agent_names}
    for route in routes:
        frm = route.get("from", "")
        to = route.get("to", "")
        if frm in adj and to in adj:
            adj[frm].append(to)

    # DFS 拓扑排序检测环
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in agent_names}

    def has_cycle(node: str) -> bool:
        color[node] = GRAY
        for nb in adj.get(node, []):
            if color[nb] == GRAY:
                return True
            if color[nb] == WHITE and has_cycle(nb):
                return True
        color[node] = BLACK
        return False

    if len(agent_names) > 1:
        for n in agent_names:
            if color[n] == WHITE and has_cycle(n):
                errors.append({"line": 0, "field": "spec.routes", "message": "拓扑存在循环引用，必须为 DAG"})
                break

    # 检测孤立节点（单节点允许无路由）
    referenced = set()
    for route in routes:
        referenced.add(route.get("from", ""))
        referenced.add(route.get("to", ""))
    if len(agent_names) > 1:
        for n in agent_names:
            if n not in referenced:
                errors.append({"line": 0, "field": f"spec.agents[name={n}]", "message": f"Agent '{n}' 无任何连线引用（孤立节点）"})

    return errors


def validate_yaml(yaml_str: str, strict: bool = True) -> dict:
    """校验 YAML 编排配置.

    Returns:
        {"valid": True} 或 {"valid": False, "errors": [{"line": int, "field": str, "message": str}]}
    """
    errors: list[dict] = []

    # 1. 大小限制
    if len(yaml_str.encode("utf-8")) > MAX_YAML_SIZE:
        return {"valid": False, "errors": [{"line": 0, "field": "", "message": f"文件超过 {MAX_YAML_SIZE // 1024 // 1024}MB 限制"}]}

    # 2. YAML 解析
    try:
        doc = yaml.safe_load(yaml_str)
    except yaml.YAMLError as e:
        line = getattr(e, "problem_mark", None)
        return {"valid": False, "errors": [{"line": line.line + 1 if line else 0, "field": "", "message": f"YAML 解析错误: {e}"}]}

    if doc is None:
        return {"valid": False, "errors": [{"line": 0, "field": "", "message": "YAML 内容为空"}]}
    if not isinstance(doc, dict):
        return {"valid": False, "errors": [{"line": 0, "field": "", "message": f"YAML 顶层必须是对象，实际为: {type(doc).__name__}"}]}

    # 3. 嵌套深度
    depth = _check_nesting(doc)
    if depth > MAX_NESTING_DEPTH:
        return {"valid": False, "errors": [{"line": 0, "field": "", "message": f"嵌套深度 {depth} 超过限制 {MAX_NESTING_DEPTH}"}]}

    # 4. jsonschema 结构校验
    try:
        import jsonschema
        jsonschema.validate(instance=doc, schema=ORCHESTRATION_SCHEMA)
    except ImportError:
        pass  # jsonschema 未安装时跳过结构校验
    except jsonschema.ValidationError as e:
        errors.append({"line": 0, "field": ".".join(str(p) for p in e.absolute_path), "message": e.message})

    # 5. agent name 唯一性
    agents = doc.get("spec", {}).get("agents", [])
    seen_names: set[str] = set()
    for a in agents:
        name = a.get("name", "")
        if name in seen_names:
            errors.append({"line": 0, "field": f"spec.agents[name={name}]", "message": f"Agent 名称重复: '{name}'"})
        seen_names.add(name)

    # 6. 拓扑 DAG 校验
    routes = doc.get("spec", {}).get("routes", [])
    dag_errors = _check_dag(agents, routes)
    errors.extend(dag_errors)

    if errors:
        return {"valid": False, "errors": errors}

    return {"valid": True}
