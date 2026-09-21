"""Markdown section 解析器."""
import re
from typing import Optional


class SectionParser:
    """按 ## <section> 切分 markdown → dict."""

    @staticmethod
    def parse(content: str) -> dict[str, str]:
        sections: dict[str, str] = {}
        blocks = re.split(r'\n(?=## )', content)
        for block in blocks:
            m = re.match(r'^## (.+?)(?:\n|$)', block)
            if m:
                key = m.group(1).strip()
                body = block[m.end():].strip()
                sections[key] = body
        return sections

    @staticmethod
    def frontmatter(content: str) -> Optional[dict]:
        """提取 YAML frontmatter（简单实现）."""
        m = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
        if not m:
            return None
        result = {}
        for line in m.group(1).split('\n'):
            kv = re.match(r'^\s*-\s*\*?\*(.+?)\*\*?\s*[:：]\s*(.+)', line)
            if kv:
                result[kv.group(1).strip()] = kv.group(2).strip()
        return result if result else None

    @staticmethod
    def read_file(path: str) -> str:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
