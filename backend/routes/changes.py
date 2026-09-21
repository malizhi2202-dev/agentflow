"""GET /api/changes — 活跃 change 列表（含 Leader/PM 总览统计）."""
from fastapi import APIRouter
from scanner import get_file_scanner

router = APIRouter()
_scanner = get_file_scanner()


@router.get("/api/changes")
async def list_changes():
    changes = _scanner.scan()

    items = []
    for c in changes:
        items.append({
            'id': c.id, 'title': c.title, 'phase': c.phase, 'phase_name': c.phase_name,
            'progress': c.progress, 'progress_pct': c.progress_pct, 'status': c.status,
            'priority': c.priority,
            'interrupted': c.interrupted, 'interrupted_task': c.interrupted_task,
            'created_at': c.created_at, 'updated_at': c.updated_at,
            'total_days': c.total_days,
            'task_stats': c.task_stats, 'gate_stats': c.gate_stats,
            'next_action': c.next_action, 'blockers': c.blockers,
            'artifacts': c.artifacts,
            'v1_count': len(c.v1_items), 'v2_count': len(c.v2_items), 'risk_count': len(c.risks),
        })

    # leader 总览统计
    total = len(items)
    alerts = sum(1 for i in items if i['status'] in ('interrupted', 'blocked'))
    total_tasks = sum(i['task_stats']['total'] for i in items)
    done_tasks = sum(i['task_stats']['done'] for i in items)
    gates_passed = sum(i['gate_stats']['passed'] for i in items)
    gates_total = sum(i['gate_stats']['total'] for i in items)
    blocked_count = sum(1 for i in items if i['status'] == 'blocked')

    return {
        'changes': items, 'total': total, 'alerts': alerts,
        'summary': {
            'total_changes': total,
            'active_changes': total - alerts,
            'alerts': alerts,
            'blocked': blocked_count,
            'overall_progress_pct': round(done_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            'total_tasks': total_tasks, 'done_tasks': done_tasks,
            'gates_passed': f'{gates_passed}/{gates_total}',
            'avg_days': round(sum(i['total_days'] or 0 for i in items) / total, 1) if total > 0 else 0,
        },
    }
