"""快照服务 — 工具版本冻结与恢复."""
import json
import zlib
from sqlalchemy.orm import Session
from models.workflow import Workflow, WorkflowSnapshot
from models.tool import Tool


def create_snapshot(db: Session, workflow: Workflow) -> WorkflowSnapshot:
    tool_ids = []
    for node in (workflow.spec_json or {}).get("nodes", []):
        tid = node.get("tool_id")
        if tid:
            tool_ids.append(tid)
    tools = db.query(Tool).filter(Tool.id.in_(tool_ids)).all() if tool_ids else []
    snapshot_data = {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "tools": [t.to_dict() for t in tools],
    }
    compressed = json.dumps(snapshot_data)
    latest = db.query(WorkflowSnapshot).filter(WorkflowSnapshot.workflow_id == workflow.id).order_by(WorkflowSnapshot.version.desc()).first()
    version = (latest.version + 1) if latest else 1
    snapshot = WorkflowSnapshot(workflow_id=workflow.id, tool_snapshots_json={"data": compressed, "tool_count": len(tools)}, version=version)
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    _cleanup_old(db, workflow.id, keep=5)
    return snapshot


def get_latest_snapshot(db: Session, workflow_id: int) -> WorkflowSnapshot | None:
    return db.query(WorkflowSnapshot).filter(WorkflowSnapshot.workflow_id == workflow_id).order_by(WorkflowSnapshot.version.desc()).first()


def migrate_spec_json_to_yaml(spec_json: dict) -> str:
    """将旧的 spec_json {nodes, edges} 转换为 YAML 编排格式."""
    nodes = spec_json.get("nodes", [])
    edges = spec_json.get("edges", [])
    agents_yaml = ""
    for n in nodes:
        agents_yaml += f"    - name: {n.get('agentName', n.get('label', 'agent'))}\n"
        agents_yaml += "      kind: Agent\n"
        agents_yaml += "      spec:\n"
        agents_yaml += "        runtime: langgraph\n"
        agents_yaml += "        model:\n"
        agents_yaml += f"          provider: openai\n"
        agents_yaml += f"          name: gpt-4o\n"
        agents_yaml += f"        workflow_id: {n.get('agentId', 1)}\n"
    routes_yaml = ""
    for e in edges:
        routes_yaml += f"    - from: {e.get('from', '')}\n"
        routes_yaml += f"      to: {e.get('to', '')}\n"
        routes_yaml += f"      type: {e.get('strategy', 'sequential')}\n"
    return (
        "apiVersion: ai-platform/v1\n"
        "kind: AgentOrchestration\n"
        "metadata:\n"
        "  name: migrated-orchestration\n"
        "spec:\n"
        "  agents:\n"
        f"{agents_yaml}"
        "  routes:\n"
        f"{routes_yaml}"
    )


def _cleanup_old(db: Session, workflow_id: int, keep: int = 5):
    old = db.query(WorkflowSnapshot).filter(WorkflowSnapshot.workflow_id == workflow_id).order_by(WorkflowSnapshot.version.desc()).offset(keep).all()
    for s in old:
        db.delete(s)
    db.commit()
