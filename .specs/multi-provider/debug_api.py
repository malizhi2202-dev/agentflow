#!/usr/bin/env python3
"""Debug: test agent creation endpoint."""
import urllib.request, urllib.error, json

BASE = 'http://127.0.0.1:8000'

def post(path, data):
    req = urllib.request.Request(f'{BASE}{path}', data=json.dumps(data).encode(), 
                                 headers={'Content-Type': 'application/json', 'X-User-Id': 'admin'},
                                 method='POST')
    try:
        with urllib.request.urlopen(req) as r:
            print(f"  HTTP {r.status} {r.reason}")
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read()
        print(f"  HTTP {e.code} {e.reason}")
        print(f"  Headers: {dict(e.headers)}")
        print(f"  Raw body: {body!r}")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"detail": str(body)}

print("--- Test: create agent ---")
code, d = post('/api/agents', {
    "name": "test-debug",
    "runtime": "langgraph",
    "model_provider": "openai",
    "model_name": "gpt-4"
})
print(f"code={code}")
print(json.dumps(d, indent=2, ensure_ascii=False))
