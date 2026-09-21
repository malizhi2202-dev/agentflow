"""runtime.jsonl 文件监控器 — 增量捕捉 code-kit 运行时数据."""

import os
import json
import time
import threading
import datetime
from database import SessionLocal
from models.metrics import SessionMetric, MetricRaw

_watched: dict[str, int] = {}  # file_path → last_line_count
_running = False


def start_watcher(specs_dir: str | None = None):
    global _running
    if _running:
        return
    _running = True
    if not specs_dir:
        specs_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".specs")
    t = threading.Thread(target=_watch_loop, args=(specs_dir,), daemon=True)
    t.start()
    print(f"[runtime-watcher] 启动，监控 {specs_dir}")


def _watch_loop(specs_dir: str):
    while _running:
        try:
            _scan(specs_dir)
        except Exception as e:
            print(f"[runtime-watcher] 错误: {e}")
        time.sleep(30)  # 每 30 秒扫描一次


def _scan(specs_dir: str):
    if not os.path.isdir(specs_dir):
        return
    for entry in os.listdir(specs_dir):
        change_dir = os.path.join(specs_dir, entry)
        if not os.path.isdir(change_dir) or entry.startswith("."):
            continue
        rt_file = os.path.join(change_dir, "runtime.jsonl")
        if not os.path.exists(rt_file):
            continue
        # 读取增量行
        prev_count = _watched.get(rt_file, 0)
        with open(rt_file) as f:
            lines = f.readlines()
        current_count = len(lines)
        if current_count > prev_count:
            new_lines = lines[prev_count:]
            _import_lines(rt_file, new_lines, entry)
            _watched[rt_file] = current_count


def _import_lines(rt_file: str, lines: list[str], change_id: str):
    db = SessionLocal()
    imported = 0
    for line in lines:
        try:
            rec = json.loads(line.strip())
            ts_str = rec.get("timestamp", datetime.datetime.utcnow().isoformat())
            try:
                ts = datetime.datetime.fromisoformat(ts_str)
            except Exception:
                ts = datetime.datetime.utcnow()
            tokens = rec.get("tokens_input", 0) + rec.get("tokens_output", 0)
            m = SessionMetric(
                session_id=f"ck-{change_id}-{ts.timestamp()}",
                entity_type="project",
                entity_id=0,
                owner_id="admin",
                model_name=rec.get("agent", rec.get("model", "code-kit")),
                total_tokens=tokens,
                prompt_tokens=rec.get("tokens_input", 0),
                completion_tokens=rec.get("tokens_output", 0),
                duration_ms=0,
                tool_name=f"code-kit:{change_id}:{rec.get('stage','unknown')}",
                tool_calls=len(rec.get("skills", [])),
                timestamp=ts,
            )
            db.add(m)
            imported += 1
        except Exception:
            pass
    if imported > 0:
        db.commit()
        print(f"[runtime-watcher] 📥 {rt_file}: +{imported} 条")
    db.close()
