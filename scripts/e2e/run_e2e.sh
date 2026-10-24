#!/usr/bin/env bash
# v21 T-04：E2E 入口（被 `npm run e2e` 调用）。
# 前置：MySQL 后端已在本机 8000（运行时由其后端 env 决定：RSI_CLI_PROVIDER=dsh|hermes）、
#       前端 vite 在 5173、Playwright 包可用（NODE_PATH 或全局 npx 缓存）。
# 用法：E2E_CLI=dsh|hermes bash scripts/e2e/run_e2e.sh
set -uo pipefail
cd "$(dirname "$0")/../.."
BASE="${E2E_BASE:-http://127.0.0.1:5173}"
API="${E2E_API:-http://127.0.0.1:8000}"
CLI="${E2E_CLI:-dsh}"

echo "== 前置检查 =="
curl -sf "$API/api/health" >/dev/null || { echo "后端 $API 不可用"; exit 2; }
curl -sf "$BASE/" >/dev/null || { echo "前端 $BASE 不可用"; exit 2; }
echo "后端/前端就绪；运行时通道标记：$CLI"

# Playwright 包定位（优先 NODE_PATH，其次 npx 缓存）
if [ -z "${NODE_PATH:-}" ]; then
  PW_DIR="$(ls -d "$HOME"/.npm/_npx/*/node_modules 2>/dev/null | while read -r d; do [ -d "$d/playwright" ] && echo "$d" && break; done)"
  [ -n "$PW_DIR" ] && export NODE_PATH="$PW_DIR"
fi
[ -n "${NODE_PATH:-}" ] || { echo "找不到 playwright 包（设置 NODE_PATH）"; exit 2; }

echo "== 种子：用 CLI 真跑一次 L0 抽取 =="
# Python 解释器：优先持久 venv（~/ai/agentflow-data/venv），其次 /tmp 旧 venv，最后系统 python3
PY="${PY:-}"
if [ -z "$PY" ]; then
  for cand in "$HOME/ai/agentflow-data/venv/bin/python" /tmp/afvenv2/bin/python; do
    [ -x "$cand" ] && { PY="$cand"; break; }
  done
fi
PY="${PY:-python3}"
[ -x "$(command -v "$PY" 2>/dev/null || echo "$PY")" ] || { echo "找不到 Python：$PY（设 PY=...）"; exit 2; }
DATABASE_URL="${DATABASE_URL:-mysql+pymysql://root@127.0.0.1:3307/agentflow}" \
ENCRYPTION_KEY="${ENCRYPTION_KEY:-e2e-key-32bytes-0123456789abcdef}" \
RSI_EXTRACTOR_PROVIDER=cli RSI_CLI_PROVIDER="$CLI" RSI_EXTRACTOR_MODEL="$CLI-cli" \
  "$PY" scripts/e2e/seed_l0_mysql.py || exit 3

echo "== 界面 E2E（13 条） =="
E2E_BASE="$BASE" node scripts/e2e/ui_mysql_e2e.js
