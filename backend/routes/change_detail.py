"""GET /api/changes/<id> — 单个 change 详情（开发者/Leader/PM 三维度）."""
import os
from fastapi import APIRouter, HTTPException
from scanner import get_file_scanner, STAGE_NAMES, _phase_order
from parsers.section import SectionParser
from parsers.task import parse_tasks
from parsers.gate import parse_gates
from config import get_specs_dir

router = APIRouter()
_scanner = get_file_scanner()


def _read_artifact(change_dir: str, name: str) -> str | None:
    for fname in os.listdir(change_dir):
        if name.lower() in fname.lower() and fname.endswith('.md'):
            return SectionParser.read_file(os.path.join(change_dir, fname))
    return None


@router.get("/api/changes/{change_id}")
async def get_change(change_id: str):
    info = _scanner.get_change(change_id)
    if not info:
        raise HTTPException(404, f"change '{change_id}' not found")
    change_dir = os.path.join(get_specs_dir(), change_id)

    # ── 门禁投票详情 ──
    gates = []
    for artifact in ['CHANGE.md', 'REQUIREMENT.md', 'DESIGN.md', 'UI-DESIGN.md', 'TASK.md', 'TEST.md', 'REVIEW.md']:
        content = _read_artifact(change_dir, artifact)
        if content:
            parsed = parse_gates(content)
            for g in parsed:
                gates.append({
                    'name': g['name'], 'question': g.get('question', ''),
                    'result': g.get('result', 'pending'),
                    'votes': g['votes'],
                    'source': artifact,
                })

    # ── 任务列表 ──
    tasks = []
    task_content = _read_artifact(change_dir, 'TASK.md')
    if task_content:
        tasks = parse_tasks(task_content)

    # ── 各阶段时间线（给 Leader/PM 看瓶颈）──
    stage_timeline = []
    for stage_id in ['0-change', '1-requirement', '2-design', '2a-ui-design', '3-task', '4-dev', '5-test', '6-review', '7-integration']:
        hours = info.stage_durations.get(stage_id)
        stage_timeline.append({
            'id': stage_id,
            'name': STAGE_NAMES.get(stage_id, stage_id),
            'duration_hours': hours,
            'status': 'done' if _phase_order(stage_id) < _phase_order(info.phase) else ('current' if stage_id == info.phase else 'pending'),
        })

    # ── leader 视角：瓶颈检测 ──
    bottleneck = None
    if info.stage_durations:
        slowest = max(info.stage_durations, key=lambda k: info.stage_durations[k])
        bottleneck = {'stage': slowest, 'stage_name': STAGE_NAMES.get(slowest, slowest), 'hours': info.stage_durations[slowest]}

    return {
        # 基础
        'id': info.id, 'title': info.title, 'phase': info.phase,
        'phase_name': info.phase_name, 'status': info.status,
        'priority': info.priority, 'author': info.author, 'next_action': info.next_action,

        # 时间线（开发者/Leader关心）
        'created_at': info.created_at, 'updated_at': info.updated_at,
        'total_days': info.total_days, 'stage_timeline': stage_timeline,
        'bottleneck': bottleneck,

        # 进度（三种角色都关心）
        'progress': info.progress, 'progress_pct': info.progress_pct,
        'task_stats': info.task_stats,
        'interrupted': info.interrupted, 'interrupted_task': info.interrupted_task,
        'blockers': info.blockers,

        # 门禁（Leader/PM关心）
        'gate_stats': info.gate_stats, 'gates': gates,

        # 范围（PM关心）
        'v1_items': info.v1_items, 'v2_items': info.v2_items, 'out_items': info.out_items,

        # 风险（三种角色都关心）
        'risks': info.risks,

        # 产物 & 任务
        'artifacts': info.artifacts, 'tasks': tasks,
    }
