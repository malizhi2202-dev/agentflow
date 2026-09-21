"""模板渲染服务 — Go template 风格 {{ .Values.xxx }} 占位符替换."""
from __future__ import annotations

import re

# {{ .Values.xxx }} 或 {{ .Values.xxx.yyy }}
TEMPLATE_PATTERN = re.compile(r"\{\{\s*\.Values\.(\w+(?:\.\w+)*)\s*\}\}")


def list_params(template_yaml: str) -> list[str]:
    """提取模板中所有占位符变量名（去重）."""
    return list(dict.fromkeys(TEMPLATE_PATTERN.findall(template_yaml)))


def validate_params(template_yaml: str, values: dict[str, str]) -> list[str]:
    """检查是否所有占位符都有对应值.

    Returns:
        缺失的参数名列表（空列表 = 校验通过）
    """
    required = list_params(template_yaml)
    return [p for p in required if p not in values]


def render_template(template_yaml: str, values: dict[str, str]) -> str:
    """渲染模板：替换所有 {{ .Values.xxx }} 为对应值.

    Args:
        template_yaml: 含占位符的 YAML 模板
        values: 参数名 → 值的映射

    Returns:
        渲染后的 YAML 字符串
    """
    def replacer(match: re.Match) -> str:
        key = match.group(1)
        return values.get(key, match.group(0))

    return TEMPLATE_PATTERN.sub(replacer, template_yaml)
