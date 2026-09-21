#!/usr/bin/env python3
"""
agent-domains 后端集成测试
测试域 CRUD、Agent 域关联、跨模块兼容性
后端地址: http://127.0.0.1:8000
"""
import json
import sys
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"
HEADERS = {"Content-Type": "application/json", "X-User-Id": "admin"}

passed = 0
failed = 0

def req(method, path, body=None):
    """发送 HTTP 请求"""
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else "{}"
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"detail": body}

def test(name, condition):
    """记录测试结果"""
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name}")

print("=" * 60)
print("agent-domains 后端集成测试")
print("=" * 60)

# ── 1. GET /api/domains ──
print("\n📋 测试 1: GET /api/domains 返回默认域")
code, data = req("GET", "/api/domains")
test("HTTP 200", code == 200)
test("返回 domains 数组", "domains" in data)
test("至少有一个域（默认域）", len(data.get("domains", [])) >= 1)
default_domain = (data.get("domains") or [{}])[0]
test("默认域名称正确", default_domain.get("name") == "默认域")
test("包含 agent_count 字段", "agent_count" in default_domain)
print(f"  返回数据: {json.dumps(data, ensure_ascii=False, indent=2)[:200]}")

# ── 2. POST /api/domains 创建域 ──
print("\n📋 测试 2: POST /api/domains 创建新域")
test_name = f"测试域-{__import__('time').time():.0f}"
code, data = req("POST", "/api/domains", {"name": test_name})
test("HTTP 200", code == 200)
test("返回 id 字段", "id" in data)
new_domain_id = data.get("id")
test("返回 name 匹配", data.get("name") == test_name)
test("返回 owner_id", data.get("owner_id") == "admin")
print(f"  创建的域: id={new_domain_id}, name={data.get('name')}")

# ── 2b. POST 重复名 ──
print("\n📋 测试 2b: POST /api/domains 重复名应返回 400")
code, data = req("POST", "/api/domains", {"name": test_name})
test("HTTP 400 重复名拒绝", code == 400)
print(f"  返回: {data}")

# ── 2c. POST 空名 ──
print("\n📋 测试 2c: POST /api/domains 空名应返回 400")
code, data = req("POST", "/api/domains", {"name": "  "})
test("HTTP 400 空名拒绝", code == 400)
print(f"  返回: {data}")

# ── 3. GET /api/agents?domain_id=0 (NULL domain) ──
print("\n📋 测试 3: GET /api/agents?domain_id=0 返回无域 Agent")
code, data = req("GET", "/api/agents?domain_id=0")
test("HTTP 200", code == 200)
test("返回 agents 数组", "agents" in data)
agents_no_domain = data.get("agents", [])
test("所有返回的 agent 无 domain_id", all(a.get("domain_id") is None for a in agents_no_domain))
print(f"  无域 Agent 数量: {len(agents_no_domain)}")

# ── 4. PUT /api/agents/{id} 更新 domain_id ──
print("\n📋 测试 4: PUT /api/agents/{id} 更新 agent domain_id")
# 先获取一个 agent
code, all_agents = req("GET", "/api/agents")
agents = all_agents.get("agents", [])
print(f"  Agent 总数: {len(agents)}")

if agents:
    target_agent = agents[0]
    agent_id = target_agent["id"]
    old_domain = target_agent.get("domain_id")
    print(f"  目标 Agent: id={agent_id}, name={target_agent['name']}, old_domain_id={old_domain}")

    # 将 agent 分配到新域
    code, updated = req("PUT", f"/api/agents/{agent_id}", {"domain_id": new_domain_id})
    test("HTTP 200", code == 200)
    test("domain_id 已更新", updated.get("domain_id") == new_domain_id)
    print(f"  更新后 domain_id={updated.get('domain_id')}")

    # 验证域内 Agent 数量
    code, domain_agents = req("GET", f"/api/agents?domain_id={new_domain_id}")
    test("域内 Agent 可查询", code == 200)
    found = any(a["id"] == agent_id for a in domain_agents.get("agents", []))
    test(f"Agent #{agent_id} 在域 {new_domain_id} 中", found)
    print(f"  域 {new_domain_id} 内 Agent: {len(domain_agents.get('agents', []))} 个")

    # 将 agent 移回无域 (NULL)
    code, updated2 = req("PUT", f"/api/agents/{agent_id}", {"domain_id": None})
    test("domain_id 可设为 None", code == 200)
    test("domain_id 为 None", updated2.get("domain_id") is None)
    print(f"  重置后 domain_id={updated2.get('domain_id')}")
else:
    print("  ⚠ 无 Agent 可测试，跳过 PUT 测试")

# ── 5. DELETE /api/domains/{id} ──
print("\n📋 测试 5: DELETE /api/domains/{id} 删除域 (Agent 回归 NULL)")

# 创建临时域用于删除测试
tmp_name = f"临时删除域-{__import__('time').time():.0f}"
code, tmp_domain = req("POST", "/api/domains", {"name": tmp_name})
tmp_id = tmp_domain.get("id")
print(f"  创建临时域: id={tmp_id}")

if tmp_id and agents:
    # 将 agent 分配到这个临时域
    req("PUT", f"/api/agents/{agent_id}", {"domain_id": tmp_id})
    # 确认分配成功
    _, check1 = req("GET", f"/api/agents?domain_id={tmp_id}")
    test(f"临时域中有 Agent", len(check1.get("agents", [])) > 0)
    
    # 删除域
    code, del_result = req("DELETE", f"/api/domains/{tmp_id}")
    test("HTTP 200 删除成功", code == 200)
    test("返回 status=deleted", del_result.get("status") == "deleted")
    test("agents_released > 0", del_result.get("agents_released", 0) > 0)
    print(f"  删除结果: {del_result}")

    # 确认域已从列表中消失
    code, after_del = req("GET", "/api/domains")
    remaining_ids = [d["id"] for d in after_del.get("domains", [])]
    test("删除后域不在列表中", tmp_id not in remaining_ids)

    # 确认 agent 回归 NULL
    _, check2 = req("GET", f"/api/agents/{agent_id}")
    test("删除域后 agent domain_id 回归 None", check2.get("domain_id") is None)
    print(f"  Agent 当前 domain_id={check2.get('domain_id')}")
else:
    print("  ⚠ 跳过删除测试（无可用 Agent）")

# ── 6. 跨模块兼容性 ──
print("\n📋 测试 6: 跨模块兼容性")

code, data = req("GET", "/api/agents")
test("GET /api/agents 正常", code == 200)
test("返回 agents 数组", "agents" in data)
print(f"  Agent 数量: {len(data.get('agents', []))}")

code, data = req("GET", "/api/workflows")
test("GET /api/workflows 正常", code == 200)
print(f"  Workflow 数量: {data.get('total', 0) if isinstance(data, dict) else 'N/A'}")

code, data = req("GET", "/api/tools")
test("GET /api/tools 正常", code == 200)
print(f"  Tool 数量: {data.get('total', 0) if isinstance(data, dict) else 'N/A'}")

# ── 6b. 域列表再验证 ──
print("\n📋 测试 6b: 最终域列表验证")
code, data = req("GET", "/api/domains")
test("最终 GET /api/domains 正常", code == 200)
domains = data.get("domains", [])
test("至少包含默认域", len(domains) >= 1)
# 确保删除的临时域已不在列表中
tmp_ids = [d["id"] for d in domains]
if tmp_id:
    test("已删除的临时域不在列表中", tmp_id not in tmp_ids)
print(f"  域列表: {[d['name'] for d in domains]}")

# ── 7. 更新域名称 ──
print("\n📋 测试 7: PUT /api/domains/{id} 更新域名称")
if new_domain_id:
    updated_name = test_name + "-已更新"
    code, data = req("PUT", f"/api/domains/{new_domain_id}", {"name": updated_name})
    test("HTTP 200", code == 200)
    test("名称已更新", data.get("name") == updated_name)
    print(f"  更新后: {data.get('name')}")
else:
    print("  ⚠ 跳过（无可更新域）")

# ── 结果汇总 ──
print("\n" + "=" * 60)
total = passed + failed
print(f"测试结果: {passed}/{total} 通过" + (" 🎉" if failed == 0 else f" ❌ {failed} 失败"))
print("=" * 60)

sys.exit(0 if failed == 0 else 1)
