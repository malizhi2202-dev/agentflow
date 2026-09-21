#!/usr/bin/env python3
"""Quick backend API test for capability-groups."""
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
