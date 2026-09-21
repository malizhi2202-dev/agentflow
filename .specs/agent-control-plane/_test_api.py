#!/usr/bin/env python3
"""BACKEND API VALIDATION — Step 2: Check control_plane_api router endpoints."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from routes.control_plane_api import router

# The router has prefix="/api/control-plane"
expected = {
    ("GET", "/api/control-plane/probes"),
    ("GET", "/api/control-plane/queue"),
    ("GET", "/api/control-plane/reconcile"),
    ("POST", "/api/control-plane/agent/{agent_id}/restart"),
    ("PUT", "/api/control-plane/schedule"),
}

found = set()
all_routes = []

for route in router.routes:
    for method in (route.methods or set()):
        found.add((method, route.path))
        all_routes.append(f"{method} {route.path}")

print("=== All registered routes ===")
for r in sorted(all_routes):
    print(f"  {r}")

print(f"\n=== Expected endpoints ({len(expected)}) ===")
missing = expected - found
matched = expected & found

print(f"  Matched: {len(matched)}/{len(expected)}")
for m in sorted(matched):
    print(f"    OK: {m[0]} {m[1]}")

if missing:
    print(f"\n  MISSING ({len(missing)}):")
    for m in sorted(missing):
        print(f"    FAIL: {m[0]} {m[1]}")

extra = found - expected
if extra:
    print(f"\n  EXTRA routes ({len(extra)}):")
    for e in sorted(extra):
        print(f"    INFO: {e[0]} {e[1]}")

if not missing:
    print("\nALL 5 ENDPOINTS VERIFIED OK")
else:
    print(f"\nFAIL: {len(missing)} endpoint(s) missing")
    sys.exit(1)
