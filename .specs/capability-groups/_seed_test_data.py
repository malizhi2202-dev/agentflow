#!/usr/bin/env python3
"""Populate some agents with capabilities for testing."""
import urllib.request, json

BASE = "http://127.0.0.1:8000"
H = {"X-User-Id": "admin", "Content-Type": "application/json"}

# Get all agents
data = json.loads(urllib.request.urlopen(f"{BASE}/api/agents").read())
agents = data.get("agents", [])
print(f"Total agents: {len(agents)}")

# Show first 3 current configs
for a in agents[:3]:
    cfg = a.get("model_config_json", {})
    caps = cfg.get("capabilities", []) if isinstance(cfg, dict) else []
    print(f"  Agent #{a['id']} {a['name']}: domain_id={a.get('domain_id')}, caps={caps}")

# Update agents with capabilities  
cap_map = {
    0: ["code-review", "python"],  # first agent
    1: ["code-review", "frontend"],  # second agent  
    2: ["python", "devops"],  # third agent
}

for i, a in enumerate(agents[:5]):
    if i >= len(cap_map):
        continue
    caps = cap_map.get(i, [])
    if not caps:
        continue
    cfg = a.get("model_config_json", {}) or {}
    cfg["capabilities"] = caps
    body = json.dumps({"model_config_json": cfg}).encode()
    req = urllib.request.Request(f"{BASE}/api/agents/{a['id']}", data=body, headers=H, method="PUT")
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
        print(f"  Updated Agent #{resp['id']} {resp['name']}: caps={caps}")
    except Exception as e:
        print(f"  Failed Agent #{a['id']}: {e}")

# Verify
data = json.loads(urllib.request.urlopen(f"{BASE}/api/agents?capability=code-review").read())
agents = data.get("agents", [])
print(f"\nAgents with 'code-review': {len(agents)}")
for a in agents:
    cfg = a.get("model_config_json", {}) or {}
    print(f"  Agent #{a['id']} {a['name']}: caps={cfg.get('capabilities', [])}")

# Check domain capabilities
data = json.loads(urllib.request.urlopen(f"{BASE}/api/domains/1/capabilities").read())
print(f"\nDomain 1 capabilities: {data}")
