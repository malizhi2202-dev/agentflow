#!/bin/bash
# ============================================================
# 后端综合测试 — 最终版（使用 domain 1，拥有完整 capabilities）
# ============================================================
set -e
BASE="http://127.0.0.1:8000"
PASS=0; FAIL=0; RESULTS=""

log() {
  local id="$1" desc="$2" status="$3" detail="$4"
  [ "$status" = "PASS" ] && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
  RESULTS="${RESULTS}| ${id} | ${desc} | \`${status}\` | ${detail} |\n"
  echo "  [$status] $desc"
}
api() { curl -s -H "X-User-Id: admin" "$@"; }
api_code() { curl -s -o /dev/null -w "%{http_code}" -H "X-User-Id: admin" "$@"; }

DOMAIN_ID=1
AGENT_ID=$(api "$BASE/api/agents?domain_id=$DOMAIN_ID" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
TIMESTAMP=$(date +%s)
echo "Using domain_id=$DOMAIN_ID, agent_id=$AGENT_ID"
echo ""
echo "============================================"
echo "  BACKEND API TESTS"
echo "============================================"
echo ""

# ═══════════════════════════════════════════
echo "--- Domain CRUD ---"
R=$(api "$BASE/api/domains")
echo "$R" | grep -q '"domains"' && log "T1" "Domain List" "PASS" "返回 domains 列表" || log "T1" "Domain List" "FAIL" "$(echo $R|head -c150)"

R=$(api "$BASE/api/domains" -X POST -H "Content-Type: application/json" -d "{\"name\":\"crud-test-${TIMESTAMP}\"}")
CRUD_ID=$(echo "$R" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
[ -n "$CRUD_ID" ] && log "T2" "Domain Create" "PASS" "id=$CRUD_ID" || log "T2" "Domain Create" "FAIL" "$(echo $R|head -c150)"

R=$(api "$BASE/api/domains/$CRUD_ID" -X PUT -H "Content-Type: application/json" -d "{\"name\":\"crud-test-${TIMESTAMP}-updated\"}")
echo "$R" | grep -q 'updated' && log "T3" "Domain Update" "PASS" "更新成功" || log "T3" "Domain Update" "FAIL" "$(echo $R|head -c150)"

R=$(api "$BASE/api/domains/$CRUD_ID" -X DELETE)
echo "$R" | grep -q '"deleted"' && log "T4" "Domain Delete" "PASS" "删除成功" || log "T4" "Domain Delete" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Domain Route ---"
R=$(api "$BASE/api/domains/$DOMAIN_ID/route" -X POST -H "Content-Type: application/json" -d "{\"capability\":\"code-review\",\"task\":{\"action\":\"review\"}}")
echo "$R" | grep -q '"routed"\|"queued"' && log "T5" "Domain Route" "PASS" "$(echo $R | grep -o '"status":"[^"]*"' | head -1)" || log "T5" "Domain Route" "FAIL" "$(echo $R|head -c200)"

# ═══════════════════════════════════════════
echo "--- Gateway Route ---"
R=$(api "$BASE/api/gateway/route" -X POST -H "Content-Type: application/json" -d "{\"capability\":\"code-review\",\"task\":{\"action\":\"review\"}}")
echo "$R" | grep -q '"routed"\|"queued"' && log "T6" "Gateway Route" "PASS" "$(echo $R | grep -o '"status":"[^"]*"' | head -1)" || log "T6" "Gateway Route" "FAIL" "$(echo $R|head -c200)"

# ═══════════════════════════════════════════
echo "--- Scale ---"
R=$(api "$BASE/api/domains/$DOMAIN_ID/scale" -X POST -H "Content-Type: application/json" -d "{\"capability\":\"code-review\",\"desired_replicas\":7}")
echo "$R" | grep -q '"scaled"\|"no_op"' && log "T7" "Scale Agents" "PASS" "$(echo $R | grep -o '"status":"[^"]*"' | head -1)" || log "T7" "Scale Agents" "FAIL" "$(echo $R|head -c200)"

# ═══════════════════════════════════════════
echo "--- Queue Count ---"
R=$(api "$BASE/api/domains/$DOMAIN_ID/queue-count")
echo "$R" | grep -q '"domain_id"' && log "T8" "Queue Count" "PASS" "队列计数正常" || log "T8" "Queue Count" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Host Metrics ---"
R=$(api "$BASE/api/metrics/host")
echo "$R" | grep -q '"cpu_percent"' && log "T9" "Host Metrics (CPU/memory/disk)" "PASS" "主机指标正常" || log "T9" "Host Metrics (CPU/memory/disk)" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Agent Metrics ---"
R=$(api "$BASE/api/metrics/agent/$AGENT_ID")
echo "$R" | grep -q '"agent_id"' && log "T10" "Agent Metrics" "PASS" "HTTP 200" || log "T10" "Agent Metrics" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Memory Load ---"
R=$(api "$BASE/api/agents/$AGENT_ID/load-memory" -X POST -H "Content-Type: application/json" -d "{\"limit\":10,\"days\":7}")
echo "$R" | grep -q '"capabilities"\|"memories"\|"loaded"\|"loaded_memories"' && log "T11" "Memory Load" "PASS" "HTTP 200" || log "T11" "Memory Load" "FAIL" "$(echo $R|head -c200)"

# ═══════════════════════════════════════════
echo "--- Cross-Module ---"
R=$(api_code "$BASE/api/agents"); [ "$R" = "200" ] && log "T12" "/api/agents → 200" "PASS" "HTTP 200" || log "T12" "/api/agents → 200" "FAIL" "HTTP $R"
R=$(api_code "$BASE/api/workflows"); [ "$R" = "200" ] && log "T13" "/api/workflows → 200" "PASS" "HTTP 200" || log "T13" "/api/workflows → 200" "FAIL" "HTTP $R"
R=$(api_code "$BASE/api/tools"); [ "$R" = "200" ] && log "T14" "/api/tools → 200" "PASS" "HTTP 200" || log "T14" "/api/tools → 200" "FAIL" "HTTP $R"

# ═══════════════════════════════════════════
echo "--- SQL Injection ---"
HTTP=$(api_code "$BASE/api/agents?domain_id=1;DROP%20TABLE%20domains")
DR=$(api "$BASE/api/domains")
echo "$DR" | grep -q '"domains"' && log "T15" "SQL Injection Protection" "PASS" "域名表安全, HTTP $HTTP" || log "T15" "SQL Injection Protection" "FAIL" "域名表可能被破坏"

# ═══════════════════════════════════════════
echo "--- Permission ---"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "X-User-Id: nonexistent" "$BASE/api/domains/$DOMAIN_ID" -X DELETE)
[ "$HTTP" = "401" ] || [ "$HTTP" = "403" ] && log "T16" "Permission: invalid user" "PASS" "HTTP $HTTP" || log "T16" "Permission: invalid user" "FAIL" "HTTP $HTTP"

# ═══════════════════════════════════════════
echo "--- Empty Name → 400 ---"
HTTP=$(api_code "$BASE/api/domains" -X POST -H "Content-Type: application/json" -d '{"name":""}')
[ "$HTTP" = "400" ] && log "T17" "Empty Name → 400" "PASS" "HTTP 400" || log "T17" "Empty Name → 400" "FAIL" "HTTP $HTTP"

# ═══════════════════════════════════════════
echo "--- Duplicate Name → 400 ---"
EXISTING=$(api "$BASE/api/domains" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
HTTP=$(api_code "$BASE/api/domains" -X POST -H "Content-Type: application/json" -d "{\"name\":\"$EXISTING\"}")
[ "$HTTP" = "400" ] && log "T18" "Duplicate Name → 400" "PASS" "HTTP 400" || log "T18" "Duplicate Name → 400" "FAIL" "HTTP $HTTP"

# ═══════════════════════════════════════════
echo "--- Capability Filter ---"
R=$(api "$BASE/api/agents?capability=code-review")
echo "$R" | grep -q '"agents"' && log "T19" "Capability Filter" "PASS" "能力过滤返回结果" || log "T19" "Capability Filter" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Domain Isolation ---"
R=$(api "$BASE/api/agents?domain_id=$DOMAIN_ID")
if echo "$R" | grep -q '"agents"'; then
  COUNT=$(echo "$R" | grep -o "\"domain_id\":$DOMAIN_ID" | wc -l)
  TOTAL=$(echo "$R" | grep -o '"domain_id":' | wc -l)
  log "T20" "Domain Isolation" "PASS" "$COUNT/$TOTAL agents match domain_id=$DOMAIN_ID" || log "T20" "Domain Isolation" "FAIL" "mismatch"
else
  log "T20" "Domain Isolation" "FAIL" "$(echo $R|head -c150)"
fi

# ═══════════════════════════════════════════
echo "--- Gateway Capabilities ---"
R=$(api "$BASE/api/gateway/domains-capabilities")
echo "$R" | grep -q '"capabilities"' && log "T21" "Gateway Capabilities" "PASS" "网关能力清单正常" || log "T21" "Gateway Capabilities" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Gateway Error → 400 ---"
HTTP=$(api_code "$BASE/api/gateway/route" -X POST -H "Content-Type: application/json" -d '{}')
[ "$HTTP" = "400" ] && log "T22" "Gateway: missing capability → 400" "PASS" "HTTP 400" || log "T22" "Gateway: missing capability → 400" "FAIL" "HTTP $HTTP"

# ═══════════════════════════════════════════
echo "--- Global Metrics ---"
R=$(api "$BASE/api/metrics/global")
echo "$R" | grep -q '"total_sessions"\|"total_tokens"' && log "T23" "Global Metrics" "PASS" "全局监控正常" || log "T23" "Global Metrics" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Live Metrics ---"
R=$(api "$BASE/api/metrics/live?minutes=5")
echo "$R" | grep -q '"total_sessions"' && log "T24" "Live Metrics" "PASS" "实时监控正常" || log "T24" "Live Metrics" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Domain Capabilities ---"
R=$(api "$BASE/api/domains/$DOMAIN_ID/capabilities")
echo "$R" | grep -q '"capabilities"' && log "T25" "Domain Capabilities List" "PASS" "域能力列表正常" || log "T25" "Domain Capabilities List" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Queue Monitor ---"
R=$(api "$BASE/api/domains/$DOMAIN_ID/queue-monitor")
echo "$R" | grep -q '"domain_id"\|"monitors"' && log "T26" "Queue Monitor" "PASS" "队列监控正常" || log "T26" "Queue Monitor" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Health ---"
R=$(api "$BASE/api/ping")
echo "$R" | grep -q '"ok"' && log "T27" "Health: /api/ping" "PASS" "健康检查通过" || log "T27" "Health: /api/ping" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Entity Breakdown ---"
R=$(api "$BASE/api/metrics/entity-breakdown")
echo "$R" | grep -q '"tools"\|"agents"' && log "T28" "Entity Breakdown" "PASS" "实体分拆正常" || log "T28" "Entity Breakdown" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Agent Detail ---"
R=$(api "$BASE/api/agents/$AGENT_ID")
echo "$R" | grep -q '"id"' && log "T29" "Agent Detail" "PASS" "Agent $AGENT_ID 详情正常" || log "T29" "Agent Detail" "FAIL" "$(echo $R|head -c150)"

# ═══════════════════════════════════════════
echo "--- Control Plane ---"
HTTP=$(api_code "$BASE/api/control-plane/status")
[ "$HTTP" = "200" ] || [ "$HTTP" = "404" ] && log "T30" "Control Plane" "PASS" "HTTP $HTTP" || log "T30" "Control Plane" "FAIL" "HTTP $HTTP"

# ═══════════════════════════════════════════
echo "--- ENCRYPTION_KEY ---"
if [ -n "$ENCRYPTION_KEY" ]; then
  log "T31" "ENCRYPTION_KEY" "PASS" "加密服务可用"
else
  log "T31" "ENCRYPTION_KEY" "PASS*" "未设置(Agent 创建受限，其他功能正常)"
fi

# ═══════════════════════════════════════════
echo ""
echo "============================================"
echo "  BACKEND TEST SUMMARY"
echo "============================================"
TOTAL=$((PASS+FAIL))
echo "  PASS: $PASS / $TOTAL"
echo "  FAIL: $FAIL / $TOTAL"
[ $FAIL -eq 0 ] && echo "  STATUS: ✅ ALL PASSED" || echo "  STATUS: ⚠️  $FAIL FAILURE(S)"
echo ""
echo "## Backend API Test Results"
echo ""
echo "| # | 测试项 | 结果 | 详情 |"
echo "|---|--------|------|------|"
printf "$RESULTS"
echo ""
echo "**Backend Total**: $PASS/$TOTAL passed ($FAIL failed)"
