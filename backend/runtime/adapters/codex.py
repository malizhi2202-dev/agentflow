"""OpenAI Codex CLI 适配器.

Codex CLI 会话日志通常存储在:
  ~/.codex/sessions/<session-id>.jsonl
  或 ~/.openai-codex/logs/

每条记录包含:
  {"role":"user","content":"..."}
  {"role":"assistant","content":"...","model":"gpt-4o","usage":{"prompt_tokens":N,"completion_tokens":N}}
"""
import os
import json
import glob
from ..adapter import RuntimeEvent


class CodexAdapter:
    name = "codex"

    def detect(self) -> bool:
        paths = [os.path.expanduser(p) for p in [
            "~/.codex", "~/.openai-codex", "~/.config/codex"
        ]]
        return any(os.path.isdir(p) for p in paths)

    def log_paths(self, project_root: str) -> list[str]:
        project_name = os.path.basename(project_root)
        patterns = [
            os.path.expanduser(f"~/.codex/sessions/*.jsonl"),
            os.path.expanduser(f"~/.openai-codex/logs/*.jsonl"),
            os.path.expanduser(f"~/.config/codex/sessions/*.jsonl"),
        ]
        files = []
        for p in patterns:
            files.extend(glob.glob(p))
        # 过滤：只返回 cwd 匹配该项目的会话
        return sorted(files, key=os.path.getmtime, reverse=True)

    def parse(self, path: str) -> list[RuntimeEvent]:
        events = []
        try:
            current_session = os.path.basename(path).replace(".jsonl", "")
            with open(path, encoding='utf-8') as f:
                prev_user = ""
                for line in f:
                    if not line.strip(): continue
                    try:
                        d = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue
                    role = d.get("role", "")
                    # 检查 cwd 匹配项目
                    project = os.path.basename(d.get("cwd", ""))
                    if role == "user":
                        prev_user = d.get("content", "")[:200]
                    elif role == "assistant":
                        usage = d.get("usage", {})
                        events.append(RuntimeEvent(
                            session_id=current_session,
                            timestamp=d.get("timestamp", ""),
                            agent="codex",
                            model=d.get("model", ""),
                            input_tokens=usage.get("prompt_tokens", 0) + usage.get("input_tokens", 0),
                            output_tokens=usage.get("completion_tokens", 0) + usage.get("output_tokens", 0),
                            project=project,
                            summary=d.get("content", "")[:200],
                            role="assistant",
                        ))
                        events.append(RuntimeEvent(
                            session_id=current_session,
                            timestamp=d.get("timestamp", ""),
                            agent="codex",
                            model="",
                            project=project,
                            summary=prev_user,
                            role="user",
                        ))
        except Exception:
            pass
        return events
