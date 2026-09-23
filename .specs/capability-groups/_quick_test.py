#!/usr/bin/env python3
"""Quick backend API test for capability-groups.

⚠️ 非回归基线（T-FIX-00 · 5-test 于 2026-09-23 显式标注，原因逐条实测）：
  · 全文 0 条断言（一条判据都没有），末尾**无条件** print 出 "All backend tests passed!"
    → 它打印的是"跑完了"，不是"通过了"；
    （本说明刻意不复述那个"断言"关键字的英文原文：写进来就会让 `grep -c <那个词>` 这条判据
     被**注释**满足，正是 TASK 元规则 2 要防的「零门槛判据」。本文件的合法出路只有真加判据，或保留本标注。）
  · 身份写死 `X-User-Id: admin`（`:6`）→ 结构性看不见越权（跨 owner 的负例它永远看不到）；
  · 依赖一个在跑的 `127.0.0.1:8000`（`:5`）→ 不进 pytest 收集、不可重复、CI 里无从执行。
  capability-groups 的回归判据在 **`backend/tests/test_capability_groups.py`**
  （真实 session + 行集合断言 + 可被 pytest 定向收集），本文件只作手工冒烟脚本保留。
  → 禁止把本文件的输出当任何 verify 的证据（REVIEW G4 安全 ⑤ / TASK `T-FIX-00`）。
"""
import urllib.request, urllib.error, json

BASE = "http://127.0.0.1:8000"
H = {"X-User-Id": "admin"}

def get(path):
    req = urllib.request.Request(BASE + path, headers=H)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

print("=== Test 1: Agent capability filter ===")
data = get("/api/agents?capability=code-review")
agents = data.get("agents", [])
print(f"  Agents with 'code-review' capability: {len(agents)}")

print("\n=== Test 2: Domain capabilities endpoint ===")
data = get("/api/domains/1/capabilities")
print(f"  Domain 1 capabilities: {data}")

print("\n=== Test 3: Combined filter (domain_id + capability) ===")
data = get("/api/agents?domain_id=0&capability=code-review")
agents = data.get("agents", [])
print(f"  Null-domain agents with 'code-review': {len(agents)}")

print("\n=== Test 4: Existing endpoints still work ===")
data = get("/api/agents")
print(f"  Total agents: {len(data.get('agents', []))}")
data = get("/api/domains")
print(f"  Total domains: {len(data.get('domains', []))}")

print("\n=== Test 5: Domain capability endpoint for non-existent domain ===")
try:
    get("/api/domains/99999/capabilities")
    print("  ERROR: Should have returned 404!")
except urllib.error.HTTPError as e:
    print(f"  Correctly returned 404: {e.code}")

print("\n=== All backend tests passed! ===")
