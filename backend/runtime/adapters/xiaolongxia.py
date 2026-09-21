"""小龙虾 / 通用 Agent 适配器.

小龙虾是一款国产 AI 编程工具（XiaoLongXia / Crayfish Agent）.
日志格式与其他 Agent 类似，使用 JSONL.

同时作为通用适配器——任何未知 Agent 的 JSONL 日志都可尝试解析.
"""
import os
import json
import glob
from ..adapter import RuntimeEvent


class XiaolongxiaAdapter:
    name = "xiaolongxia"

    def detect(self) -> bool:
        """探测小龙虾或其他未知 Agent 的日志目录."""
        paths = [
            os.path.expanduser(p) for p in [
                "~/.xiaolongxia", "~/.crayfish", "~/.xlx",
                "~/.config/xiaolongxia", "~/.local/share/xiaolongxia",
                "~/.agent-logs",  # 通用日志目录
            ]
        ]
        return any(os.path.isdir(p) for p in paths)

    def log_paths(self, project_root: str) -> list[str]:
        project_name = os.path.basename(project_root)
        patterns = [
            os.path.expanduser("~/.xiaolongxia/sessions/*.jsonl"),
            os.path.expanduser("~/.crayfish/logs/*.jsonl"),
            os.path.expanduser("~/.xlx/sessions/*.jsonl"),
            os.path.expanduser("~/.agent-logs/*.jsonl"),
        ]
        # 通用：项目根下的 .agent-logs/
        patterns.append(os.path.join(project_root, ".agent-logs", "*.jsonl"))
        files = []
        for p in patterns:
            files.extend(glob.glob(p))
        return sorted(set(files), key=os.path.getmtime, reverse=True)

    def parse(self, path: str) -> list[RuntimeEvent]:
        """通用 JSONL 解析——尝试匹配常见字段名."""
        events = []
        try:
            with open(path, encoding='utf-8') as f:
                prev = {}
                for line in f:
                    if not line.strip(): continue
                    try:
                        d = json.loads(line.strip())
                    except json.JSONDecodeError:
                        continue

                    # 尝试多种常见的字段名
                    role = d.get("role", d.get("type", ""))
                    msg = d.get("message", d.get("content", d))
                    if isinstance(msg, str):
                        msg = {"content": msg}
                    usage = d.get("usage", msg.get("usage", {}))
                    model = d.get("model", msg.get("model", ""))

                    if role in ("assistant", "ai", "bot", "agent"):
                        events.append(RuntimeEvent(
                            session_id=d.get("sessionId", d.get("session_id", d.get("id", os.path.basename(path).replace(".jsonl", "")))),
                            timestamp=d.get("timestamp", d.get("time", d.get("created_at", ""))),
                            agent=self.name,
                            model=str(model),
                            input_tokens=_int(usage, "input_tokens", "prompt_tokens", "input"),
                            output_tokens=_int(usage, "output_tokens", "completion_tokens", "output"),
                            project=os.path.basename(d.get("cwd", d.get("project", d.get("project_root", "")))),
                            summary=str(msg.get("content", ""))[:200],
                            role="assistant",
                        ))
                    prev = d
        except Exception:
            pass
        return events


def _int(d: dict, *keys: str) -> int:
    """从 dict 中尝试多个 key 取值."""
    for k in keys:
        v = d.get(k, 0)
        if v and isinstance(v, (int, float)):
            return int(v)
        if isinstance(v, str) and v.isdigit():
            return int(v)
    return 0
