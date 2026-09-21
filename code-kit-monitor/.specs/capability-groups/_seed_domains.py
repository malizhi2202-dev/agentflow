#!/usr/bin/env python3
"""Assign some agents to domain 1 (默认域) for testing."""
import urllib.request, json

BASE = "http://127.0.0.1:8000"
H = {"X-User-Id": "admin", "Content-Type": "application/json"}

# Get all agents and domains
data = json.loads(urllib.request.urlopen(f"{BASE}/api/agents").read())
agents = data.get("agents", [])
domains_data = json.loads(urllib.request.urlopen(f"{BASE}/api/domains").read())
domains = domains_data.get("domains", [])
print(f"Domains: {[(d['id'], d['name']) for d in domains]}")

# Assign first 3 agents to domain 1 (默认域)
domain_id = 1
for a in agents[:3]:
    body = json.dumps({"domain_id": domain_id}).encode()
    req = urllib.request.Request(f"{BASE}/api/agents/{a['id']}", data=body, headers=H, method="PUT")
    resp = json.loads(urllib.request.urlopen(req).read())
    cfg = (resp.get("model_config_json") or {})
    print(f"  Agent #{resp['id']} {resp['name']}: domain_id={resp['domain_id']}, caps={cfg.get('capabilities', [])}")

# Verify domain 1 capabilities
data = json.loads(urllib.request.urlopen(f"{BASE}/api/domains/1/capabilities").read())
print(f"\nDomain 1 capabilities: {data}")

# Assign 2 more agents to domain_id=2 (if exists) or create
if len(domains) >= 2:
    d2_id = domains[1]["id"]
    for a in agents[3:5]:
        body = json.dumps({"domain_id": d2_id}).encode()
        req = urllib.request.Request(f"{BASE}/api/agents/{a['id']}", data=body, headers=H, method="PUT")
        urllib.request.urlopen(req)
    data = json.loads(urllib.request.urlopen(f"{BASE}/api/domains/{d2_id}/capabilities").read())
    print(f"Domain {d2_id} capabilities: {data}")

# Also seed capabilities for agents 3-5
for i, a in enumerate(agents[3:8]):
    caps = [["frontend", "testing"], ["devops"], ["code-review"], ["python", "ml"], ["frontend"]][i]
    cfg = a.get("model_config_json", {}) or {}
    cfg["capabilities"] = caps
    body = json.dumps({"model_config_json": cfg}).encode()
    req = urllib.request.Request(f"{BASE}/api/agents/{a['id']}", data=body, headers=H, method="PUT")
    resp = json.loads(urllib.request.urlopen(req).read())
    print(f"  Seeded Agent #{resp['id']}: caps={caps}")
