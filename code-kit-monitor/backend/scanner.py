"""增量文件扫描器 — 解析 .specs/ 目录，提供三维度数据."""
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from config import get_specs_dir, CURRENT_PROJECT

CACHE_TTL = 5.0  # 缓存 5 秒过期

STAGES = ['0-change', '1-requirement', '2-design', '2a-ui-design', '3-task', '4-dev', '5-test', '6-review', '7-integration']
STAGE_FILES = {
    '0-change': 'CHANGE.md', '1-requirement': 'REQUIREMENT.md',
    '2-design': 'DESIGN.md', '2a-ui-design': 'UI-DESIGN.md',
    '3-task': 'TASK.md', '5-test': 'TEST.md', '6-review': 'REVIEW.md',
}
ARTIFACTS = ['CHANGE.md', 'REQUIREMENT.md', 'DESIGN.md', 'UI-DESIGN.md', 'TASK.md', 'TEST.md', 'REVIEW.md']
STAGE_NAMES = {
    '0-change': '变更提案', '1-requirement': '需求分析', '2-design': '技术设计',
    '2a-ui-design': 'UI设计', '3-task': '任务拆分', '4-dev': '开发执行',
    '5-test': '测试验证', '6-review': '代码审查', '7-integration': '集成归档',
}


@dataclass
class ChangeInfo:
    id: str
    phase: str = 'unknown'
    phase_name: str = ''
    progress: str = '0/0'
    progress_pct: int = 0
    status: str = 'normal'
    interrupted: bool = False
    interrupted_task: Optional[str] = None
    artifacts: list = field(default_factory=list)
    # 时间线
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    stage_durations: dict = field(default_factory=dict)
    total_days: Optional[int] = None
    # 元信息
    title: str = ''
    author: str = ''
    priority: str = ''
    # 范围
    v1_items: list = field(default_factory=list)
    v2_items: list = field(default_factory=list)
    out_items: list = field(default_factory=list)
    # 风险
    risks: list = field(default_factory=list)
    # 门禁统计
    gate_stats: dict = field(default_factory=dict)
    # task 统计
    task_stats: dict = field(default_factory=dict)
    # 下一步
    next_action: str = ''
    blockers: list = field(default_factory=list)


def _phase_order(phase: str) -> int:
    try: return STAGES.index(phase)
    except ValueError: return -1


def _detect_phase(change_dir: str) -> str:
    found = '0-change'
    for stage, fname in STAGE_FILES.items():
        if os.path.exists(os.path.join(change_dir, fname)):
            found = stage
    if os.path.exists(os.path.join(change_dir, 'T01-SUMMARY.md')) or os.path.exists(os.path.join(change_dir, 'T00-SUMMARY.md')):
        found = '4-dev'
    return found


def _file_time(path: str) -> Optional[str]:
    try: return datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
    except: return None


def _read_section(content: str, section: str) -> str:
    """提取 ## section 内容."""
    m = re.search(rf'^##\s+{re.escape(section)}.*?\n(.*?)(?=\n## |\Z)', content, re.DOTALL | re.MULTILINE)
    return m.group(1).strip() if m else ''


def _read_kv(content: str, key: str) -> str:
    """读 **Key**: Value."""
    m = re.search(rf'\*\*{re.escape(key)}\*\*\s*[:：]\s*(.+)', content)
    return m.group(1).strip() if m else ''


def _count_tasks(content: Optional[str] = None, change_dir: str = '') -> tuple[int, int, int, int]:
    """(total, done, in_progress, blocked). 传入 content 避免重复读文件."""
    try:
        if content is None and change_dir:
            task_file = os.path.join(change_dir, 'TASK.md')
            if not os.path.exists(task_file):
                return 0, 0, 0, 0
            content = open(task_file).read()
        if not content:
            return 0, 0, 0, 0
        total = len(re.findall(r'status="(pending|in_progress|done|blocked)"', content))
        done = len(re.findall(r'status="done"', content))
        in_prog = len(re.findall(r'status="in_progress"', content))
        blocked = len(re.findall(r'status="blocked"', content))
        return total, done, in_prog, blocked
    except: return 0, 0, 0, 0


def _count_done_tasks(change_dir: str) -> int:
    return _count_tasks(change_dir=change_dir)[1]


def _check_interrupted(specs_dir: str, change_id: str) -> tuple[bool, Optional[str]]:
    state_file = os.path.join(specs_dir, '..', 'STATE.md')
    if not os.path.exists(state_file): return False, None
    try:
        content = open(state_file).read()
        if change_id in content and ('中断任务' in content or 'interrupted' in content.lower()):
            m = re.search(r'中断任务.*?[:：]\s*(\S+)', content)
            return True, m.group(1) if m else 'unknown'
    except: pass
    return False, None


def _parse_stage_durations(change_dir: str) -> dict:
    """根据文件 mtime 估算各阶段耗时."""
    durations = {}
    prev_time = None
    for stage in STAGES:
        if stage in STAGE_FILES:
            path = os.path.join(change_dir, STAGE_FILES[stage])
            if os.path.exists(path):
                mtime = os.path.getmtime(path)
                if prev_time:
                    durations[stage] = round((mtime - prev_time) / 3600, 1)
                prev_time = mtime
    return durations


def _parse_v1_v2_out(content: str) -> tuple[list, list, list]:
    """解析 REQUIREMENT.md 的 v1/v2/out."""
    v1, v2, out = [], [], []
    current = None
    for line in content.split('\n'):
        if 'v1（本次必做）' in line or '### v1' in line: current = 'v1'
        elif 'v2（下' in line or '### v2' in line: current = 'v2'
        elif 'out（永远' in line or '### out' in line: current = 'out'
        elif current and line.strip().startswith('- '):
            item = line.strip()[2:]
            if current == 'v1': v1.append(item)
            elif current == 'v2': v2.append(item)
            elif current == 'out': out.append(item)
    return v1, v2, out


def _parse_risks(content: str) -> list:
    """解析 DESIGN.md 风险表."""
    risks = []
    in_table = False
    for line in content.split('\n'):
        if '| # | 风险 |' in line or '| R1 |' in line or '| 风险 |' in line:
            in_table = True; continue
        if in_table and line.startswith('|') and '|---' not in line:
            parts = [p.strip() for p in line.split('|') if p.strip()]
            if len(parts) >= 3 and parts[0] not in ('#', '编号'):
                risks.append({'id': parts[0], 'risk': parts[1] if len(parts) > 1 else '', 'impact': parts[2] if len(parts) > 2 else ''})
        elif in_table and not line.startswith('|'):
            in_table = False
    return risks


def _next_action(info: 'ChangeInfo') -> str:
    """推断下一步动作."""
    if info.interrupted: return f'恢复任务 {info.interrupted_task} — @code-kit/GO.md 继续'
    idx = _phase_order(info.phase)
    if idx < len(STAGES) - 1:
        next_stage = STAGES[idx + 1]
        if '4-dev' in info.phase:
            total, done, _, _ = _count_tasks(change_dir=os.path.join(get_specs_dir(), info.id))
            pending = total - done
            if pending > 0: return f'还有 {pending} 个 task 待执行 — @code-kit/GO.md 执行 T<NN>'
            return '全部 task 完成 — 运行 G3 门禁后进入 5-test'
        return f'进入 {STAGE_NAMES.get(next_stage, next_stage)} — @code-kit/GO.md 继续'
    return '归档完成 ✅'


class FileScanner:
    def __init__(self, specs_dir: str = None):
        self._specs_dir = specs_dir
        self._cache: list[ChangeInfo] = []
        self._cache_valid = False
        self._cache_time: float = 0.0

    @property
    def specs_dir(self):
        return self._specs_dir or get_specs_dir()

    def scan(self, force: bool = False) -> list[ChangeInfo]:
        # 缓存 TTL 检查
        if self._cache_valid and not force and (time.time() - self._cache_time) < CACHE_TTL:
            return self._cache
        changes = []
        if not os.path.isdir(self.specs_dir): self._cache = []; self._cache_valid = True; return []
        for entry in sorted(os.listdir(self.specs_dir)):
            path = os.path.join(self.specs_dir, entry)
            if not os.path.isdir(path) or entry.startswith('.') or entry in ('archive', 'adr', 'health'): continue
            # 一次读取 TASK.md，用于 task 计数 + auto/manual 统计
            task_content = ''
            task_file = os.path.join(path, 'TASK.md')
            if os.path.exists(task_file):
                try:
                    task_content = open(task_file, encoding='utf-8').read()
                except: pass
            total, done, in_prog, blocked = _count_tasks(content=task_content)
            interrupted, interrupted_task = _check_interrupted(self.specs_dir, entry)
            phase = _detect_phase(path)
            artifacts = [f for f in ARTIFACTS if os.path.exists(os.path.join(path, f))]
            artifacts += sorted([f for f in os.listdir(path) if f.endswith('-SUMMARY.md')])
            # 时间线
            created_at = None
            updated_at = None
            for f in artifacts:
                ft = _file_time(os.path.join(path, f))
                if ft:
                    if not created_at or ft < created_at: created_at = ft
                    if not updated_at or ft > updated_at: updated_at = ft
            durations = _parse_stage_durations(path)
            total_days = None
            if created_at and updated_at:
                try:
                    total_days = round((datetime.fromisoformat(updated_at) - datetime.fromisoformat(created_at)).total_seconds() / 86400, 1)
                except: pass
            # 元信息
            change_content = ''
            if os.path.exists(os.path.join(path, 'CHANGE.md')):
                change_content = open(os.path.join(path, 'CHANGE.md'), encoding='utf-8').read()
            title = _read_kv(change_content, 'Change ID') or entry
            author = _read_kv(change_content, '创建日期') or ''
            priority = _read_kv(change_content, '路径建议') or ''
            # 范围
            v1, v2, out = [], [], []
            if os.path.exists(os.path.join(path, 'REQUIREMENT.md')):
                req = open(os.path.join(path, 'REQUIREMENT.md'), encoding='utf-8').read()
                v1, v2, out = _parse_v1_v2_out(req)
            # 风险
            risks = []
            if os.path.exists(os.path.join(path, 'DESIGN.md')):
                design = open(os.path.join(path, 'DESIGN.md'), encoding='utf-8').read()
                risks = _parse_risks(design)
            # 门禁统计（只扫描 SUMMARY 和 REVIEW/TEST，跳过已读的大文件）
            gate_stats = {'total': 0, 'passed': 0, 'rejected': 0, 'conditional': 0, 'pending': 0}
            for fname in artifacts:
                if fname.endswith('-SUMMARY.md') or fname in ('REVIEW.md', 'TEST.md'):
                    try:
                        content = open(os.path.join(path, fname), encoding='utf-8').read()
                        for m in re.finditer(r'结果[:：]\s*(.+?)(?:\n|$)', content):
                            r = m.group(1).strip()
                            gate_stats['total'] += 1
                            if '通过' in r and '条件' not in r: gate_stats['passed'] += 1
                            elif '条件' in r: gate_stats['conditional'] += 1
                            elif '驳回' in r or '反对' in r: gate_stats['rejected'] += 1
                            else: gate_stats['pending'] += 1
                    except: pass
            # task 统计（复用 task_content，不重复读 TASK.md）
            auto_count = len(re.findall(r'<auto>true</auto>', task_content)) if task_content else 0
            manual_count = len(re.findall(r'<auto>false</auto>', task_content)) if task_content else 0
            pct = round(done / total * 100) if total > 0 else 0
            info = ChangeInfo(
                id=entry, phase=phase, phase_name=STAGE_NAMES.get(phase, phase),
                progress=f'{done}/{total}', progress_pct=pct,
                status='interrupted' if interrupted else ('blocked' if blocked > 0 else 'normal'),
                interrupted=interrupted, interrupted_task=interrupted_task,
                artifacts=sorted(artifacts), created_at=created_at, updated_at=updated_at,
                stage_durations=durations, total_days=total_days,
                title=title, author=author, priority=priority,
                v1_items=v1, v2_items=v2, out_items=out, risks=risks,
                gate_stats=gate_stats,
                task_stats={'total': total, 'done': done, 'in_progress': in_prog, 'blocked': blocked, 'auto': auto_count, 'manual': manual_count},
                blockers=[f'{blocked} task(s) blocked'] if blocked > 0 else [],
            )
            info.next_action = _next_action(info)
            changes.append(info)
        changes.sort(key=lambda c: (-c.interrupted, -c.progress_pct, _phase_order(c.phase)))
        self._cache = changes; self._cache_valid = True; self._cache_time = time.time()
        return changes

    def get_change(self, change_id: str) -> Optional[ChangeInfo]:
        for c in self.scan():
            if c.id == change_id: return c
        return None


# 模块级单例 — 所有路由共享，让缓存生效
_file_scanner = FileScanner()


def get_file_scanner() -> FileScanner:
    return _file_scanner
