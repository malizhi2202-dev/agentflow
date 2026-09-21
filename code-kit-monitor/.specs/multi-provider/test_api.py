"""API tests for multi-provider agent creation."""
import urllib.request, urllib.error, json, sys

BASE = 'http://127.0.0.1:8000'
H = {'Content-Type': 'application/json', 'X-User-Id': 'admin'}

def post(path, data):
    req = urllib.request.Request(f'{BASE}{path}', data=json.dumps(data).encode(), headers=H, method='POST')
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, {"detail": body.decode() if isinstance(body, bytes) else str(body)}

def get(path):
    req = urllib.request.Request(f'{BASE}{path}', headers=H)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

results = {"passed": 0, "failed": 0, "details": []}

def check(desc, condition, detail=""):
    if condition:
        results["passed"] += 1
        results["details"].append(f"  ✓ {desc}")
    else:
        results["failed"] += 1
        results["details"].append(f"  ✗ {desc} {detail}")

# Test 4: agent creation with each runtime
print("=== TEST 4: Agent creation with each runtime ===")
for rt in ['langgraph', 'langchain', 'autogen', 'crewai', 'codex', 'custom']:
    code, d = post('/api/agents', {'name': f'test-{rt}', 'runtime': rt, 'model_provider': 'openai', 'model_name': 'gpt-4'})
    ok = code == 200 and d.get('id') and d.get('runtime') == rt
    check(f"runtime={rt}", ok, f"code={code} id={d.get('id')}")

# Test 5: invalid runtime → 400
print("\n=== TEST 5: Invalid runtime → 400 ===")
for bad in ['invalid', 'gpt4', '']:
    code, d = post('/api/agents', {'name': f'test-{bad}', 'runtime': bad, 'model_provider': 'openai', 'model_name': 'gpt-4'})
    check(f"invalid runtime=\"{bad}\" → 400", code == 400, f"code={code} detail={d.get('detail','')[:60]}")

# Test 6: agent creation with each model_provider
print("\n=== TEST 6: Agent creation with each model_provider ===")
for mp in ['openai', 'ollama', 'anthropic', 'hermes', 'deepseek', 'gemini', 'codex']:
    code, d = post('/api/agents', {'name': f'test-mp-{mp}', 'runtime': 'langgraph', 'model_provider': mp, 'model_name': 'test'})
    ok = code == 200 and d.get('id') and d.get('model_provider') == mp
    check(f"model_provider={mp}", ok, f"code={code} id={d.get('id')}")

# Test 7: invalid model_provider → 400
print("\n=== TEST 7: Invalid model_provider → 400 ===")
for bad in ['invalid', 'gpt4', '']:
    code, d = post('/api/agents', {'name': f'test-mp-{bad}', 'runtime': 'langgraph', 'model_provider': bad, 'model_name': 'test'})
    check(f"invalid model_provider=\"{bad}\" → 400", code == 400, f"code={code} detail={d.get('detail','')[:60]}")

# Test 8: cross-module existing endpoints
print("\n=== TEST 8: Cross-module existing endpoints ===")
endpoints = [
    ('/api/agents', 'GET agents list'),
    ('/api/workflows', 'GET workflows'),
    ('/api/metrics/sessions?limit=1', 'GET metrics'),
    ('/api/users', 'GET users'),
    ('/api/audit-logs?limit=1', 'GET audit logs'),
    ('/api/channels', 'GET channels'),
]
for path, desc in endpoints:
    code, d = get(path)
    check(f"{desc} ({path})", code == 200, f"code={code}")

print(f"\n=== SUMMARY: {results['passed']} passed, {results['failed']} failed ===")
for d in results["details"]:
    print(d)
sys.exit(0 if results['failed'] == 0 else 1)
