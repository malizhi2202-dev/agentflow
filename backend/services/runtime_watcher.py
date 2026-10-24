"""runtime.jsonl 文件监控器 — 增量捕捉 Agent 运行时数据.

P1-7：已读行数与「谁在扫」都搬进了库：
- 行数存 `runtime_watcher_offsets`（原进程内 `_watched`）——副本切换或重启
  不会把同一批记录再导一遍；
- 扫描本身受 `runtime-watcher` 租约保护——多副本只有一个在扫，其余待命。
"""

import os
import json
import time
import threading
import datetime

from database import SessionLocal
from models.metrics import SessionMetric, MetricRaw
from config import CLUSTER_LEASE_TTL_SECONDS, get_specs_dir
from services import cluster_store

LEASE_NAME = "runtime-watcher"
_running = False
_standby_logged = False


def start_watcher(specs_dir: str | None = None):
    global _running
    if _running:
        return
    _running = True
    if not specs_dir:
        specs_dir = get_specs_dir()
    t = threading.Thread(target=_watch_loop, args=(specs_dir,), daemon=True)
    t.start()
    print(f"[runtime-watcher] 启动，监控 {specs_dir}")


def _watch_loop(specs_dir: str):
    global _standby_logged
    while _running:
        # 只有持租约的副本才扫描（租约到期自动可被其他副本接管）
        try:
            active = cluster_store.acquire_lease(LEASE_NAME, CLUSTER_LEASE_TTL_SECONDS)
        except Exception as e:
            print(f"[runtime-watcher] 租约失败，跳过本轮: {e}")
            active = False
        if active:
            _standby_logged = False
            try:
                _scan(specs_dir)
            except Exception as e:
                print(f"[runtime-watcher] 错误: {e}")
        elif not _standby_logged:
            print(f"[runtime-watcher] 待命（租约被 {cluster_store.instance_id()} 之外的副本持有）")
            _standby_logged = True
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
        # 读取增量行（偏移量在库里，重启/换副本都不重放）
        prev_count = cluster_store.watcher_offset(rt_file)
        with open(rt_file) as f:
            lines = f.readlines()
        current_count = len(lines)
        if current_count > prev_count:
            new_lines = lines[prev_count:]
            _import_lines(rt_file, new_lines, entry)
            cluster_store.set_watcher_offset(rt_file, current_count)


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
                session_id=f"rt-{change_id}-{ts.timestamp()}",
                entity_type="project",
                entity_id=0,
                owner_id="admin",
                model_name=rec.get("agent", rec.get("model", "unknown")),
                total_tokens=tokens,
                prompt_tokens=rec.get("tokens_input", 0),
                completion_tokens=rec.get("tokens_output", 0),
                duration_ms=0,
                tool_name=f"runtime:{change_id}:{rec.get('stage','unknown')}",
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
