"""运行时扫描器 — 双路合并：埋点数据 + Agent 适配器."""
import os
import json
import time
import glob
from datetime import datetime, timedelta
from .adapters import get_adapters
from .adapter import RuntimeEvent
from config import get_specs_dir, CURRENT_PROJECT

CACHE_TTL = 60.0

STAGE_FILES = {
    '0-change': 'CHANGE.md', '1-requirement': 'REQUIREMENT.md',
    '2-design': 'DESIGN.md', '2a-ui-design': 'UI-DESIGN.md',
    '3-task': 'TASK.md', '5-test': 'TEST.md', '6-review': 'REVIEW.md',
}
STAGE_NAMES = {
    '0-change': '变更提案', '1-requirement': '需求分析', '2-design': '技术设计',
    '2a-ui-design': 'UI设计', '3-task': '任务拆分', '4-dev': '开发执行',
    '5-test': '测试验证', '6-review': '代码审查', '7-integration': '集成归档',
}


def _read_instrumented(specs_dir: str) -> list[dict]:
    """读取所有 change 的埋点数据."""
    events = []
    for entry in os.listdir(specs_dir):
        path = os.path.join(specs_dir, entry)
        if not os.path.isdir(path) or entry.startswith('.'):
            continue
        rt_file = os.path.join(path, 'runtime.jsonl')
        if os.path.exists(rt_file):
            try:
                for line in open(rt_file):
                    d = json.loads(line.strip())
                    d['_source'] = 'instrumented'  # 标记来源
                    events.append(d)
            except Exception:
                pass
    return events


def _read_adapter_events() -> list[RuntimeEvent]:
    """读取所有 Agent 适配器事件."""
    events = []
    seen = set()
    for adapter in get_adapters():
        try:
            for path in adapter.log_paths(CURRENT_PROJECT):
                for evt in adapter.parse(path):
                    key = f"{evt.session_id}|{evt.timestamp}"
                    if key not in seen:
                        seen.add(key)
                        events.append(evt)
        except Exception:
            pass
    events.sort(key=lambda e: e.timestamp, reverse=True)
    return events


def _infer_stage(timestamp: str) -> str:
    if not timestamp: return ""
    try:
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        return ""
    specs_dir = get_specs_dir()
    for entry in os.listdir(specs_dir):
        path = os.path.join(specs_dir, entry)
        if not os.path.isdir(path) or entry.startswith('.'): continue
        for stage, fname in STAGE_FILES.items():
            fp = os.path.join(path, fname)
            if os.path.exists(fp):
                if datetime.fromtimestamp(os.path.getmtime(fp)) <= ts:
                    return stage
    return ""


class RuntimeScanner:
    def __init__(self):
        self._cache = None
        self._cache_time = 0.0

    def scan(self, force: bool = False) -> list[dict]:
        now = time.time()
        if not force and self._cache and (now - self._cache_time) < CACHE_TTL:
            return self._cache
        specs_dir = get_specs_dir()

        # 第一路：埋点数据
        inst_events = _read_instrumented(specs_dir)

        # 第二路：适配器数据（补充 token/工具）
        adapter_events = _read_adapter_events()

        # 合并：按时间戳匹配，埋点优先
        merged = []
        inst_by_ts = {}
        for e in inst_events:
            ts = e.get('timestamp', '')[:16]
            inst_by_ts[ts] = e

        # 适配器事件补充 token 到埋点
        for ae in adapter_events:
            ts = ae.timestamp[:16] if ae.timestamp else ''
            if ts in inst_by_ts:
                inst = inst_by_ts[ts]
                if inst.get('tokens_input', 0) == 0 and ae.input_tokens > 0:
                    inst['tokens_input'] = ae.input_tokens
                    inst['tokens_output'] = ae.output_tokens
                    inst['_token_source'] = 'adapter'
            else:
                merged.append({
                    'timestamp': ae.timestamp,
                    'stage': _infer_stage(ae.timestamp),
                    'change_id': '',
                    'agent': ae.agent,
                    'model': ae.model,
                    'tokens_input': ae.input_tokens,
                    'tokens_output': ae.output_tokens,
                    'skills': [],
                    'mcps': [],
                    'summary': ae.summary[:200],
                    '_source': 'adapter',
                    '_token_source': 'adapter',
                })

        # 埋点事件（已可能被适配器补充 token）
        for e in inst_events:
            merged.append(e)

        merged.sort(key=lambda e: e.get('timestamp', ''), reverse=True)
        self._cache = merged
        self._cache_time = now
        return merged

    def stats(self, granularity: str = "hour", days: int = 7) -> dict:
        events = self.scan()
        now = datetime.now()
        cutoff = now - timedelta(days=days)

        total_input = 0
        total_output = 0
        today_input = 0
        today_output = 0
        week_input = 0
        week_output = 0

        by_stage = {}
        by_skill = {}
        by_mcp = {}
        by_model = {}
        timeline = {}
        today_str = now.strftime("%Y-%m-%d")
        week_ago = now - timedelta(days=7)

        for e in events:
            inp = e.get('tokens_input', 0)
            out = e.get('tokens_output', 0)
            total_input += inp
            total_output += out
            ts = e.get('timestamp', '')[:10]

            if ts == today_str:
                today_input += inp
                today_output += out
            try:
                ed = datetime.fromisoformat(e.get('timestamp', '')[:19].replace('Z', '+00:00')).replace(tzinfo=None) if e.get('timestamp') else None
            except Exception:
                ed = None
            if ed and ed >= week_ago:
                week_input += inp
                week_output += out

            stage = e.get('stage', '') or 'unknown'
            by_stage[stage] = by_stage.get(stage, 0) + inp + out

            for s in (e.get('skills') or []):
                by_skill[s] = by_skill.get(s, 0) + inp + out
            for m in (e.get('mcps') or []):
                by_mcp[m] = by_mcp.get(m, 0) + inp + out

            model = e.get('model', '') or 'unknown'
            by_model[model] = by_model.get(model, 0) + inp + out

            # 时间线聚合
            if granularity == "minute":
                tk = (e.get('timestamp', '')[:16]) if e.get('timestamp') else ''
            elif granularity == "hour":
                tk = (e.get('timestamp', '')[:13]) if e.get('timestamp') else ''
            else:
                tk = (e.get('timestamp', '')[:10]) if e.get('timestamp') else ''
            if tk:
                timeline[tk] = timeline.get(tk, 0) + inp + out

        return {
            'summary': {
                'today': today_input + today_output,
                'week': week_input + week_output,
                'total': total_input + total_output,
            },
            'by_stage': [{'stage': k, 'name': STAGE_NAMES.get(k, k), 'tokens': v} for k, v in sorted(by_stage.items(), key=lambda x: -x[1])],
            'by_skill': [{'skill': k, 'tokens': v} for k, v in sorted(by_skill.items(), key=lambda x: -x[1])],
            'by_mcp': [{'mcp': k, 'tokens': v} for k, v in sorted(by_mcp.items(), key=lambda x: -x[1])],
            'by_model': [{'model': k, 'tokens': v} for k, v in sorted(by_model.items(), key=lambda x: -x[1])],
            'timeline': [{'time': k, 'tokens': v} for k, v in sorted(timeline.items())],
            'has_instrumented': any(e.get('_source') == 'instrumented' for e in events),
            'has_adapter': any(e.get('_source') == 'adapter' for e in events),
        }

    def summary(self) -> dict:
        events = self.scan()
        total = sum(e.get('tokens_input', 0) + e.get('tokens_output', 0) for e in events)
        models = list(set(e.get('model', '') for e in events if e.get('model')))
        agents = list(set(e.get('agent', '') for e in events if e.get('agent')))
        sessions = len(set(e.get('change_id', '') or e.get('agent', '') for e in events))
        return {
            'sessions': sessions,
            'total_output_tokens': total,
            'models': models,
            'agents': agents,
            'has_instrumented': any(e.get('_source') == 'instrumented' for e in events),
            'has_adapter': any(e.get('_source') == 'adapter' for e in events),
        }

    def sessions(self) -> list[dict]:
        """返回会话列表（兼容旧 API）."""
        events = self.scan()
        session_map = {}
        for e in events:
            sid = e.get('change_id', '') or e.get('agent', '') or 'unknown'
            if sid not in session_map:
                # 推断状态：如果事件有 status 字段则用，否则根据 stage 推断
                raw_status = e.get('status', '')
                if raw_status in ('success', 'error', 'running'):
                    inferred_status = raw_status
                elif e.get('stage') in ('7-integration', '6-review'):
                    inferred_status = 'success'
                elif e.get('stage') == '':
                    inferred_status = 'running'
                else:
                    inferred_status = 'running'
                session_map[sid] = {
                    'session_id': sid,
                    'agent': e.get('agent', ''),
                    'model': e.get('model', ''),
                    'timestamp': e.get('timestamp', ''),
                    'stage': e.get('stage', ''),
                    'change_id': e.get('change_id', ''),
                    'status': inferred_status,
                    'input_tokens': 0,
                    'output_tokens': 0,
                    'message_count': 0,
                    'summary': e.get('summary', '')[:100],
                }
            session_map[sid]['input_tokens'] += e.get('tokens_input', 0)
            session_map[sid]['output_tokens'] += e.get('tokens_output', 0)
            session_map[sid]['message_count'] += 1
            # 如果有更"成功"的状态（success > running > error），取最佳
            e_status = e.get('status', '')
            if e_status == 'success':
                session_map[sid]['status'] = 'success'
            elif e_status == 'error' and session_map[sid]['status'] != 'success':
                session_map[sid]['status'] = 'error'
        return sorted(session_map.values(), key=lambda s: s['timestamp'], reverse=True)


# 模块级单例 — 所有路由共享
_runtime_scanner = RuntimeScanner()


def get_runtime_scanner() -> RuntimeScanner:
    return _runtime_scanner
