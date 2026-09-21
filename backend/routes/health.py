"""GET /api/health — 数据一致性校验."""
import os
from fastapi import APIRouter
from scanner import get_file_scanner, _count_tasks, _count_done_tasks
from config import get_specs_dir
from parsers.section import SectionParser

router = APIRouter()
_scanner = get_file_scanner()


@router.get("/api/health")
async def health_check():
    issues = []
    for c in _scanner.scan():
        change_dir = os.path.join(get_specs_dir(), c.id)
        # 已完成 task 数 vs SUMMARY 数（只检查 done 的 task）
        done_tasks = _count_done_tasks(change_dir)
        summaries = len([f for f in c.artifacts if f.endswith('-SUMMARY.md')])
        total_tasks, _, _, _ = _count_tasks(change_dir=change_dir)
        if done_tasks > 0 and summaries == 0:
            issues.append({"change_id": c.id, "type": "missing_summary", "detail": f"{done_tasks} done tasks but 0 SUMMARY files (total: {total_tasks})"})
        # 前端项目缺 UI-DESIGN
        if 'DESIGN.md' in c.artifacts and 'UI-DESIGN.md' not in c.artifacts:
            design_path = os.path.join(change_dir, 'DESIGN.md')
            content = SectionParser.read_file(design_path)
            if '前端' in content and 'UI' in content:
                issues.append({"change_id": c.id, "type": "missing_ui_design", "detail": "前端项目缺少 UI-DESIGN.md"})
        # 缺 REQUIREMENT
        if 'CHANGE.md' in c.artifacts and 'REQUIREMENT.md' not in c.artifacts:
            issues.append({"change_id": c.id, "type": "missing_requirement", "detail": "有 CHANGE.md 但缺少 REQUIREMENT.md"})
    return {"consistent": len(issues) == 0, "issues": issues}
