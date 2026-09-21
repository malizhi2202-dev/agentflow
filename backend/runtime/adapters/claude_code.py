"""Claude Code 适配器 — 解析 ~/.claude/projects/<project>/*.jsonl."""
import os
import json
import re
import glob
from ..adapter import RuntimeEvent


class ClaudeCodeAdapter:
    name = "claude-code"

    def detect(self) -> bool:
        return os.path.isdir(os.path.expanduser("~/.claude/projects"))

    def log_paths(self, project_root: str) -> list[str]:
        """查找该项目的所有 JSONL 会话文件."""
        project_name = os.path.basename(project_root)
        pattern = os.path.expanduser(f"~/.claude/projects/-home-malizhi-ai-{project_name}/*.jsonl")
        return sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)

    def parse(self, path: str) -> list[RuntimeEvent]:
        """解析一个 JSONL → RuntimeEvent 列表."""
        events = []
        try:
            with open(path, encoding='utf-8') as f:
                prev_user = None
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        d = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue
                    t = d.get("type", "")
                    if t == "user":
                        msg = d.get("message", {})
                        content = msg.get("content", "") if isinstance(msg, dict) else str(msg)
                        prev_user = {
                            "timestamp": d.get("timestamp", ""),
                            "content": content,
                            "cwd": d.get("cwd", ""),
                        }
                    elif t == "assistant":
                        msg = d.get("message", {})
                        usage = msg.get("usage", {})
                        content = msg.get("content", [])
                        # 提取 text 内容作为摘要
                        summary = ""
                        refs = []
                        if isinstance(content, list):
                            texts = []
                            for c in content:
                                if isinstance(c, dict):
                                    if c.get("type") == "text":
                                        texts.append(str(c.get("text", ""))[:200])
                                    elif c.get("type") == "tool_use":
                                        refs.append(c.get("name", ""))
                            summary = " ".join(texts)[:200]
                        # 从 user content 中提取 @引用
                        if prev_user:
                            refs += re.findall(r'@(\S+\.(?:md|py|ts|js))', prev_user.get("content", ""))
                        events.append(RuntimeEvent(
                            session_id=d.get("sessionId", os.path.basename(path).replace(".jsonl", "")),
                            timestamp=d.get("timestamp", ""),
                            agent="claude-code",
                            model=msg.get("model", ""),
                            input_tokens=usage.get("input_tokens", 0),
                            output_tokens=usage.get("output_tokens", 0),
                            cache_tokens=usage.get("cache_read_input_tokens", 0),
                            project=os.path.basename(prev_user.get("cwd", "")) if prev_user else "",
                            summary=summary[:200],
                            role="assistant",
                            references=refs,
                        ))
                    elif t == "user":
                        if prev_user:
                            refs = re.findall(r'@(\S+\.(?:md|py|ts|js))', prev_user.get("content", ""))
                            events.append(RuntimeEvent(
                                session_id=d.get("sessionId", os.path.basename(path).replace(".jsonl", "")),
                                timestamp=prev_user["timestamp"],
                                agent="claude-code",
                                model="",
                                project=os.path.basename(prev_user.get("cwd", "")),
                                summary=prev_user["content"][:200],
                                role="user",
                                references=refs,
                            ))
        except Exception:
            pass
        return events
