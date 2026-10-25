"""ORM 模型基类."""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from models.tool import Tool  # noqa: E402, F401
from models.agent_tool import AgentTool  # noqa: E402, F401
from models.runtime_registry import RuntimeRegistry  # noqa: E402, F401
from models.automation import (  # noqa: E402, F401
    Automation,
    AutomationTrigger,
    AutomationRun,
    AutomationDelivery,
    RuleVersion,
)
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
    TraceSpan,
)
from models.agent_probe import AgentProbe  # noqa: E402, F401
from models.agent_probe_latest import AgentProbeLatest  # noqa: E402, F401
from models.scheduler_queue import SchedulerQueue  # noqa: E402, F401
from models.domain import Domain  # noqa: E402, F401
from models.human_approval import HumanApproval  # noqa: E402, F401
from models.knowledge_tag import KnowledgeTag, KnowledgeSourceTag  # noqa: E402, F401
from models.scheduled_task import ScheduledTask  # noqa: E402, F401
from models.session import SessionToken, PatToken  # noqa: E402, F401
from models.alert import Alert  # noqa: E402, F401
from models.attribution import DomainAttributionPolicy  # noqa: E402, F401
from models.declarative import ChangeLog, ResourceCondition  # noqa: E402, F401
from models.rsi import (  # noqa: E402, F401
    BreakerState,
    ExecLedger,
    GoldenSet,
    Memory,
    ProbeEvidence,
    PromotionReview,
    Proposal,
    RsiSwitch,
    SurfaceManifest,
)
from models.teams import (  # noqa: E402, F401
    Squad,
    SquadMember,
    Team,
    TeamMember,
)
from models.collab import (  # noqa: E402, F401
    InboxItem,
    MentionTarget,
    WorkItem,
    WorkItemRun,
    WorkItemSubscription,
)
from models.im_binding import ImBinding  # noqa: E402, F401
from models.user import AppUser, AuditLog  # noqa: E402, F401
from models.decision import DecisionModel, FinetuneBatch  # noqa: E402, F401
from models.cluster import (  # noqa: E402, F401
    ClusterLease,
    RateLimitWindow,
    ReconcileState,
    WatcherOffset,
)
