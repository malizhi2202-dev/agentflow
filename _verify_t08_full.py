"""T08 功能验证：漂移检测 + 分类 + 退避 + 拓扑感知."""
import sys
sys.path.insert(0, '.')

from backend.engine.reconcile_loop import (
    reconcile_loop,
    _detect_drift,
    _classify_action,
    _should_backoff,
    _record_reconcile_failure,
    _record_reconcile_success,
    _resume_paused,
    _get_agent_dependencies,
    _topology_safe_pause,
)

# ── 测试 _detect_drift ──
desired = {"agents": [{"name": "A", "status": "running"}, {"name": "B", "status": "running"}, {"name": "C", "status": "running"}]}
actual = {"agents": [{"name": "A", "status": "running", "id": 1}, {"name": "B", "status": "crashed", "id": 2}, {"name": "C", "status": "running", "id": 3}]}
drift = _detect_drift(desired, actual)
assert drift["expected_count"] == 3
assert drift["healthy_count"] == 2
assert drift["unhealthy_count"] == 1
assert drift["severity"] == "caution"  # 1 unhealthy / 3 total, not > half
print("_detect_drift: PASS")

# ── 测试 _classify_action ──
assert _classify_action({"unhealthy_count": 0, "drift_count": 0, "expected_count": 3}) == "safe"
assert _classify_action({"unhealthy_count": 1, "drift_count": 0, "expected_count": 3}) == "caution"
assert _classify_action({"unhealthy_count": 2, "drift_count": 0, "expected_count": 3}) == "dangerous"  # > half
assert _classify_action({"unhealthy_count": 0, "drift_count": 3, "expected_count": 10}) == "dangerous"  # >= 3
print("_classify_action: PASS")

# ── 测试 backoff ──
assert not _should_backoff(999)
_record_reconcile_failure(999)
assert _should_backoff(999)  # 退避中, next_retry_at 在未来
_record_reconcile_success(999)
assert not _should_backoff(999)  # 成功后重置
print("backoff: PASS")

# ── 测试拓扑依赖解析 ──
class FakeInst:
    edges_json = [{"from": "A", "to": "B"}, {"from": "C", "to": "B"}]
    yaml_raw = ""

deps = _get_agent_dependencies(FakeInst())
assert "B" in deps
assert deps["B"] == {"A", "C"}
print("_get_agent_dependencies: PASS")

print("\n✅ 所有 T08 reconcile_loop 验证通过！")
