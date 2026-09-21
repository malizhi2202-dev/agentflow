"""安全栅栏注册表 — 规则名 → 校验函数映射.

gate_pre 规则在 Agent 调用前执行（输入校验）。
gate_post 规则在 Agent 调用后执行（输出合规检查）。
"""


def _validate_sql_injection(data: dict) -> dict:
    """检查输入中是否包含 SQL 注入特征."""
    import re
    sql_patterns = [
        r"(?i)(\bSELECT\b.*\bFROM\b|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b|\bALTER\b)",
        r"(?i)(--\s|/\*.*\*/|;\s*$)",
        r"(?i)(\bUNION\b.*\bSELECT\b)",
    ]
    for key, value in data.items():
        if isinstance(value, str):
            for pattern in sql_patterns:
                if re.search(pattern, value):
                    return {"ok": False, "reason": f"SQL injection pattern detected in field '{key}'"}
    return {"ok": True}


def _mask_pii(data: dict) -> dict:
    """脱敏个人身份信息（手机号、邮箱、身份证号）."""
    import re
    import copy
    result = copy.deepcopy(data)

    def _mask(val: str) -> str:
        if not isinstance(val, str):
            return val
        # 手机号
        val = re.sub(r'\b1[3-9]\d{2}\*{4}\d{4}\b', '***PHONE***', val)
        val = re.sub(r'\b1[3-9]\d{9}\b', '***PHONE***', val)
        # 邮箱
        val = re.sub(r'\b[\w.-]+@[\w.-]+\.\w{2,}\b', '***EMAIL***', val)
        # 身份证
        val = re.sub(r'\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])\d{6}[\dXx]\b', '***ID***', val)
        return val

    for key in result:
        if isinstance(result[key], str):
            result[key] = _mask(result[key])
        elif isinstance(result[key], dict):
            for k in result[key]:
                result[key][k] = _mask(result[key][k]) if isinstance(result[key][k], str) else result[key][k]
    return result


def _validate_output_schema(data: dict, schema: dict | None = None) -> dict:
    """校验输出是否符合声明的 JSON Schema（简化版：检查 required 字段存在）."""
    if not schema:
        return {"ok": True}
    required = schema.get("required", [])
    for field in required:
        if field not in data:
            return {"ok": False, "reason": f"Output missing required field: {field}"}
    return {"ok": True}


def _check_param_type(data: dict, schema: dict | None = None) -> dict:
    """检查输入参数类型是否匹配 schema."""
    if not schema:
        return {"ok": True}
    properties = schema.get("properties", {})
    for key, prop in properties.items():
        if key in data:
            expected_type = prop.get("type", "string")
            actual = data[key]
            type_map = {"string": str, "number": (int, float), "integer": int, "boolean": bool, "array": list, "object": dict}
            expected = type_map.get(expected_type)
            if expected and not isinstance(actual, expected):
                return {"ok": False, "reason": f"Field '{key}' expected {expected_type}, got {type(actual).__name__}"}
    return {"ok": True}


def _noop(data: dict) -> dict:
    """空操作，默认规则."""
    return data


# ── 注册表 ──
GATE_REGISTRY: dict[str, callable] = {
    "validate_sql_injection": _validate_sql_injection,
    "mask_pii": _mask_pii,
    "validate_output_schema": _validate_output_schema,
    "check_param_type": _check_param_type,
    "noop": _noop,
}


def run_gate(rule_name: str, data: dict, schema: dict | None = None) -> dict:
    """执行指定栅栏规则.

    Returns:
        - gate_pre: {"ok": True/False, "reason": ...} 或处理后数据
        - gate_post: 处理后的数据（如脱敏）
    """
    fn = GATE_REGISTRY.get(rule_name)
    if not fn:
        return {"ok": True}  # 未知规则默认放行
    if rule_name in ("validate_output_schema", "check_param_type"):
        return fn(data, schema)
    return fn(data)
