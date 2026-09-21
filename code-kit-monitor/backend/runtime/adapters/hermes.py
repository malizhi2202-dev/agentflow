"""Hermes Agent 适配器.

Hermes Agent 遵循 agentskills.io 开放标准.
会话日志通常存储在:
  ~/.hermes/sessions/<session-id>.jsonl
  ~/.hermes/logs/

JSONL 格式与 Claude Code 类似:
  {"type":"user","message":{"role":"user","content":"..."},"timestamp":"...","sessionId":"..."}
  {"type":"assistant","message":{"role":"assistant","model":"...","usage":{...}},...}
"""
import os
import json
import glob
from ..adapter import RuntimeEvent


class HermesAdapter:
    name = "hermes"

    def detect(self) -> bool:
        paths = [os.path.expanduser(p) for p in [
            "~/.hermes", "~/.config/hermes", "~/.local/share/hermes"
        ]]
        return any(os.path.isdir(p) for p in paths)

    def log_paths(self, project_root: str) -> list[str]:
        project_name = os.path.basename(project_root)
        patterns = [
            os.path.expanduser(f"~/.hermes/sessions/*.jsonl"),
            os.path.expanduser(f"~/.hermes/logs/*.jsonl"),
            os.path.expanduser(f"~/.config/hermes/sessions/*.jsonl"),
        ]
        files = []
        for p in patterns:
            files.extend(glob.glob(p))
        # Hermes 可能在项目目录下有 .hermes/logs/
        local = os.path.join(project_root, ".hermes", "logs", "*.jsonl")
        files.extend(glob.glob(local))
        return sorted(set(files), key=os.path.getmtime, reverse=True)

    def parse(self, path: str) -> list[RuntimeEvent]:
        events = []
        try:
            with open(path, encoding='utf-8') as f:
                prev_user = None
                for line in f:
                    if not line.strip(): continue
                    try:
                        d = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue
                    t = d.get("type", d.get("role", ""))
                    msg = d.get("message", {})
                    if isinstance(msg, str):
                        msg = {"content": msg}
                    if t == "user":
                        prev_user = {
                            "timestamp": d.get("timestamp", ""),
                            "content": msg.get("content", "")[:200],
                        }
                    elif t in ("assistant", "ai"):
                        usage = msg.get("usage", {})
                        events.append(RuntimeEvent(
                            session_id=d.get("sessionId", d.get("session_id", os.path.basename(path).replace(".jsonl", ""))),
                            timestamp=d.get("timestamp", ""),
                            agent="hermes",
                            model=msg.get("model", ""),
                            input_tokens=usage.get("input_tokens", usage.get("prompt_tokens", 0)),
                            output_tokens=usage.get("output_tokens", usage.get("completion_tokens", 0)),
                            project=os.path.basename(d.get("cwd", d.get("project_root", ""))),
                            summary=msg.get("content", "")[:200],
                            role="assistant",
                        ))
        except Exception:
            pass
        return events
