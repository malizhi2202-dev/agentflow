#!/usr/bin/env python3
"""BACKEND FUNCTIONAL — Step 3: Test service functions and methods."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from unittest.mock import MagicMock
from services.agent_probe_service import _sanitize_api_keys, _resolve_health_url
from services.scheduler_service import SchedulerService
from models.agent import Agent

errors = []
ok_count = 0


def check(name, condition, detail=""):
    global ok_count
    if condition:
        ok_count += 1
        print(f"  [PASS] {name}")
    else:
        errors.append(name)
        print(f"  [FAIL] {name}: {detail}")


# ============================================================
# 3a. _sanitize_api_keys (module-level function, takes str)
# ============================================================
print("=" * 60)
print("3a. _sanitize_api_keys tests")
print("=" * 60)

# Case 1: text with API key
result = _sanitize_api_keys("API key: sk-1234567890abcdef for testing")
check("masks sk-xxx key",
      "sk-***" in result and "sk-1234567890abcdef" not in result)

# Case 2: multiple API keys
result2 = _sanitize_api_keys("keys: sk-aaa and sk-bbb with sk-ccc")
check("masks multiple keys",
      "sk-aaa" not in result2 and "sk-bbb" not in result2 and "sk-ccc" not in result2
      and result2.count("sk-***") == 3)

# Case 3: no API key
result3 = _sanitize_api_keys("plain text without keys")
check("leaves plain text unchanged", result3 == "plain text without keys")

# Case 4: empty string
result4 = _sanitize_api_keys("")
check("handles empty string", result4 == "")

# Case 5: non-sk key (anthropic format sk-ant)
result5 = _sanitize_api_keys("anthropic key: sk-ant-abc123")
check("masks sk-ant keys too",
      "sk-***" in result5 and "sk-ant-abc123" not in result5)

# ============================================================
# 3b. _resolve_health_url (module-level function, takes Agent)
# ============================================================
print("\n" + "=" * 60)
print("3b. _resolve_health_url tests")
print("=" * 60)

# Case 1: agent with base_url in model_config_json
agent1 = MagicMock(spec=Agent)
agent1.model_config_json = {"base_url": "http://agent1:8000"}
url1 = _resolve_health_url(agent1)
check("resolves from base_url", url1 == "http://agent1:8000/health")

# Case 2: agent with base_url + trailing slash
agent2 = MagicMock(spec=Agent)
agent2.model_config_json = {"base_url": "http://agent2:8000/"}
url2 = _resolve_health_url(agent2)
check("strips trailing slash from base_url", url2 == "http://agent2:8000/health")

# Case 3: no base_url, has health_url
agent3 = MagicMock(spec=Agent)
agent3.model_config_json = {"health_url": "http://custom:9090/status"}
url3 = _resolve_health_url(agent3)
check("falls back to health_url", url3 == "http://custom:9090/status")

# Case 4: base_url takes priority over health_url
agent4 = MagicMock(spec=Agent)
agent4.model_config_json = {"base_url": "http://main:8000", "health_url": "http://alt:9090/health"}
url4 = _resolve_health_url(agent4)
check("base_url has priority over health_url", url4 == "http://main:8000/health")

# Case 5: no url at all
agent5 = MagicMock(spec=Agent)
agent5.model_config_json = {}
url5 = _resolve_health_url(agent5)
check("returns None when no url configured", url5 is None)

# Case 6: model_config_json is None
agent6 = MagicMock(spec=Agent)
agent6.model_config_json = None
url6 = _resolve_health_url(agent6)
check("handles None config", url6 is None)

# ============================================================
# 3c. SchedulerService Tests
# ============================================================
print("\n" + "=" * 60)
print("3c. SchedulerService tests")
print("=" * 60)

sch = SchedulerService()

# ── match ──
print("\n-- match --")
agents_list = [
    {"id": 1, "name": "agent-a", "capability_tags": ["restart", "scale"]},
    {"id": 2, "name": "agent-b", "capability_tags": ["build"]},
    {"id": 3, "name": "agent-c", "capability_tags": ["restart", "build"]},
    {"id": 4, "name": "agent-d", "capability_tags": []},
]

matched = sch.match("restart", agents_list)
check("match finds agents by tag", len(matched) == 2)
check("match result ids correct",
      {a["id"] for a in matched} == {1, 3})

matched_build = sch.match("build", agents_list)
check("match building agents", len(matched_build) == 2)

matched_none = sch.match("nonexistent", agents_list)
check("match returns empty for missing tag", matched_none == [])

matched_empty = sch.match("restart", [])
check("match handles empty list", matched_empty == [])

# ── pick_least_loaded ──
print("\n-- pick_least_loaded --")
candidates = [
    {"id": 1, "name": "a", "current_load": 8, "max_concurrency": 10},
    {"id": 2, "name": "b", "current_load": 3, "max_concurrency": 10},
    {"id": 3, "name": "c", "current_load": 9, "max_concurrency": 10},
]
picked = sch.pick_least_loaded(candidates)
check("picks least loaded (ratio 0.3)", picked is not None and picked["id"] == 2)

fully_loaded = [
    {"id": 1, "name": "a", "current_load": 10, "max_concurrency": 10},
    {"id": 2, "name": "b", "current_load": 10, "max_concurrency": 10},
]
picked2 = sch.pick_least_loaded(fully_loaded)
check("returns None when all loaded", picked2 is None)

edge_case = [{"id": 1, "name": "a", "current_load": 0, "max_concurrency": 0}]
picked3 = sch.pick_least_loaded(edge_case)
check("handles max_concurrency=0 (as 1)", picked3 is not None and picked3["id"] == 1)

check("pick_least_loaded empty returns None", sch.pick_least_loaded([]) is None)

# ── enqueue / dequeue ──
print("\n-- enqueue / dequeue --")
sch.enqueue("task-1", "restart", priority=100)
sch.enqueue("task-2", "build", priority=50)
sch.enqueue("task-3", "restart", priority=200)

check("queue_size is 3", sch.queue_size == 3)

dq1 = sch.dequeue()
check("dequeue returns tuple", isinstance(dq1, tuple) and len(dq1) == 2)
check("first is highest priority", dq1 == ("task-3", "restart"))

dq2 = sch.dequeue()
check("second is task-1", dq2 == ("task-1", "restart"))

dq3 = sch.dequeue()
check("third is task-2", dq3 == ("task-2", "build"))

check("queue_size is 0", sch.queue_size == 0)

dq4 = sch.dequeue()
check("dequeue empty returns None", dq4 is None)

# ── list_queued ──
sch.enqueue("task-4", "scale", priority=75)
sch.enqueue("task-5", "build", priority=25)
queued = sch.list_queued()
check("list_queued returns list", isinstance(queued, list))
check("list_queued has 2 items", len(queued) == 2)

# ============================================================
print("\n" + "=" * 60)
print(f"RESULTS: {ok_count} passed, {len(errors)} failed")
if errors:
    print("FAILURES:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("ALL FUNCTIONAL TESTS PASSED")
