"""TASK.md XML 解析器."""
import re
from html import unescape
from typing import Optional


def _safe_xml_parse(block: str) -> Optional[dict]:
    """安全解析单个 <task> 块，处理常见 XML 问题."""
    # 移除 XML 注释
    cleaned = re.sub(r'<!--.*?-->', '', block, flags=re.DOTALL)
    # HTML unescape (&lt; &gt; &amp; 等)
    cleaned = unescape(cleaned)

    # 提取属性
    attrs = {}
    m = re.match(r'<task\s+(.*?)>', cleaned, re.DOTALL)
    if m:
        attr_str = m.group(1)
        for am in re.finditer(r'(\w+)="([^"]*)"', attr_str):
            attrs[am.group(1)] = am.group(2)

    task = {
        'id': attrs.get('id', ''),
        'parallel': attrs.get('parallel', 'false') == 'true',
        'status': attrs.get('status', 'pending'),
        'name': '', 'read_files': [], 'write_files': [],
        'action': '', 'verify': '', 'done': '', 'auto': True,
        'depends_on': [],
    }

    # 提取子元素内容
    for tag in ['name', 'action', 'verify', 'done']:
        m = re.search(rf'<{tag}>\s*(.*?)\s*</{tag}>', cleaned, re.DOTALL)
        if m:
            task[tag] = m.group(1).strip()

    # read_files / write_files (多行)
    for tag in ['read_files', 'write_files']:
        m = re.search(rf'<{tag}>\s*(.*?)\s*</{tag}>', cleaned, re.DOTALL)
        if m:
            lines = [l.strip() for l in m.group(1).strip().split('\n') if l.strip()]
            task[tag] = lines

    # depends_on
    m = re.search(r'<depends_on>\s*(.*?)\s*</depends_on>', cleaned, re.DOTALL)
    if m and m.group(1).strip():
        task['depends_on'] = [d.strip() for d in m.group(1).strip().split(',') if d.strip()]

    # auto
    m = re.search(r'<auto>\s*(.*?)\s*</auto>', cleaned, re.DOTALL)
    if m:
        task['auto'] = m.group(1).strip().lower() == 'true'

    return task if task['id'] else None


def parse_tasks(content: str) -> list[dict]:
    """解析 <task> 块 → 结构化数据."""
    tasks = []
    # 匹配完整 <task ...> ... </task> 块
    pattern = re.compile(r'<task\b[^>]*>.*?</task>', re.DOTALL)
    for match in pattern.finditer(content):
        block = match.group(0)
        task = _safe_xml_parse(block)
        if task:
            tasks.append(task)
    return tasks
