"""统一运行时事件模型 + Agent 适配器接口."""
from dataclasses import dataclass, field
from typing import Optional, Protocol


@dataclass
class RuntimeEvent:
    """统一的运行时事件——所有 Agent 适配器输出此格式."""
    session_id: str
    timestamp: str
    agent: str               # "claude-code" | "codex" | "hermes" | ...
    model: str               # "deepseek-v4-pro" | "gpt-4o" | ...
    input_tokens: int = 0
    output_tokens: int = 0
    cache_tokens: int = 0
    project: str = ""        # 项目目录名
    stage: str = ""          # 推断的阶段 "0-change" | "1-requirement" | ...
    change_id: str = ""      # 关联的 change-id
    skill: str = ""          # 调用的 skill 名（如 "code-review"）
    summary: str = ""        # 一句话摘要
    role: str = "user"       # "user" | "assistant"
    references: list = field(default_factory=list)  # @引用的文件列表


class AgentAdapter(Protocol):
    """Agent 适配器接口——每个 Agent 实现此接口."""
    name: str

    def detect(self) -> bool:
        """检测该 Agent 是否已安装/有数据."""
        ...

    def log_paths(self, project_root: str) -> list[str]:
        """返回该项目可能的日志文件路径列表."""
        ...

    def parse(self, path: str) -> list[RuntimeEvent]:
        """解析一个日志文件 → RuntimeEvent 列表."""
        ...
