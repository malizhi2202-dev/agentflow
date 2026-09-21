"""ORM 模型基类."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from models.tool import Tool  # noqa: E402, F401
from models.workflow import Workflow, WorkflowSnapshot  # noqa: E402, F401
from models.agent import Agent  # noqa: E402, F401
from models.knowledge_source import KnowledgeSource  # noqa: E402, F401
from models.agent_memory import AgentMemory  # noqa: E402, F401
from models.channel_config import ChannelConfig  # noqa: E402, F401
from models.conversation import Conversation  # noqa: E402, F401
from models.message import Message  # noqa: E402, F401
from models.metrics import MetricRaw  # noqa: E402, F401
from models.project import Project  # noqa: E402, F401
from models.role_custom import CustomRole  # noqa: E402, F401
from models.orchestration import (  # noqa: E402, F401
    OrchestrationInstance,
    TopologySnapshot,
    OrchestrationTemplate,
    SchedulingQueue,
    TraceSpan,
)
from models.agent_probe import AgentProbe  # noqa: E402, F401
from models.agent_probe_latest import AgentProbeLatest  # noqa: E402, F401
from models.scheduler_queue import SchedulerQueue  # noqa: E402, F401
from models.domain import Domain  # noqa: E402, F401
from models.human_approval import HumanApproval  # noqa: E402, F401
from models.knowledge_tag import KnowledgeTag, KnowledgeSourceTag  # noqa: E402, F401
from models.scheduled_task import ScheduledTask  # noqa: E402, F401
