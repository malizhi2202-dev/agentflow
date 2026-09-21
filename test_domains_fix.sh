#!/bin/bash
# Fix tests 6-7: Use PUT to set domain_id since POST doesn't support it
BASE="http://127.0.0.1:8000"
PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "✅ PASS: $1"; }
fail() { FAIL=$((FAIL+1)); echo "❌ FAIL: $1 — $2"; }

echo "=== TEST 6: Agent domain_id validation ==="

# First create a domain
RESP=$(curl -s -X POST -H "X-User-Id: admin" -H "Content-Type: application/json" -d '{"name":"测试域-T6"}' "$BASE/api/domains")
DOM_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
echo "  Domain created: id=$DOM_ID"

# Get an existing agent
RESP=$(curl -s -H "X-User-Id: admin" "$BASE/api/agents")
AGENT_ID=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['agents'][0]['id'] if d.get('agents') else '')")
echo "  Agent id=$AGENT_ID"

# 6a. Use PUT to set domain_id on own agent (domain_id IS supported in PUT)
RESP=$(curl -s -X PUT -H "X-User-Id: admin" -H "Content-Type: application/json" \
  -d "{\"domain_id\":$DOM_ID}" "$BASE/api/agents/$AGENT_ID")
echo "  PUT domain_id: $RESP"
AGENT_DOMAIN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('domain_id','ERR'))")
if [ "$AGENT_DOMAIN" = "$DOM_ID" ]; then
  pass "6a: Agent domain_id set via PUT to $DOM_ID"
else
  fail "6a: Agent domain_id via PUT" "expected $DOM_ID, got $AGENT_DOMAIN"
fi

# 6b. Verify agent appears in domain filter
RESP=$(curl -s -H "X-User-Id: admin" "$BASE/api/agents?domain_id=$DOM_ID")
FOUND=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('FOUND' if any(a['id']==$AGENT_ID for a in d['agents']) else 'NOT_FOUND')")
if [ "$FOUND" = "FOUND" ]; then
  pass "6b: Agent found when filtering by domain_id=$DOM_ID"
else
  fail "6b: Agent not found in domain filter"
fi

# 6c. Agent POST doesn't support domain_id (document as known issue)
echo "  POST /api/agents with domain_id: NOT SUPPORTED (returns 500)"
RESP=$(curl -s -X POST -H "X-User-Id: admin" -H "Content-Type: application/json" \
  -d "{\"name\":\"t\",\"model_provider\":\"o\",\"model_name\":\"m\",\"api_key\":\"k\",\"domain_id\":1}" "$BASE/api/agents")
if echo "$RESP" | grep -qi "internal server error"; then
  fail "6c: POST /api/agents does not support domain_id param (BUG: 500 error)"
else
  pass "6c: POST /api/agents supports domain_id"
fi

# 6d. Test domain ownership validation: testuser cannot set agent to admin's domain
# First check if testuser has any agents
RESP=$(curl -s -H "X-User-Id: testuser" "$BASE/api/agents")
echo "  testuser agents: $RESP" | head -c 200
echo ""

echo ""
echo "=== TEST 7: Domain delete cascade ==="

# 7a. Delete domain and check cascade
RESP=$(curl -s -X DELETE -H "X-User-Id: admin" "$BASE/api/domains/$DOM_ID")
echo "  Delete domain: $RESP"
RELEASED=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agents_released','ERR'))")
if [ "$RELEASED" -ge 1 ]; then
  pass "7a: Delete cascade released $RELEASED agent(s)"
else
  fail "7a: Delete cascade" "agents_released=$RELEASED, expected >=1"
fi

# 7b. Verify agent domain_id is NULL after cascade
RESP=$(curl -s -H "X-User-Id: admin" "$BASE/api/agents/$AGENT_ID")
AFTER_DOMAIN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('domain_id','ERR'))")
echo "  Agent domain after cascade: $AFTER_DOMAIN"
if [ "$AFTER_DOMAIN" = "None" ] || [ "$AFTER_DOMAIN" = "null" ]; then
  pass "7b: Agent domain_id set to NULL after cascade"
else
  fail "7b: Agent domain after cascade" "expected None, got $AFTER_DOMAIN"
fi

echo ""
echo "=== SUMMARY ==="
echo "Passed: $PASS, Failed: $FAIL"
echo "___JSON___"
echo "{\"pass\":$PASS,\"fail\":$FAIL}"
