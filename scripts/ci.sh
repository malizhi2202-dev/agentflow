#!/usr/bin/env bash
# v21 T-04：本地 CI（与 .github/workflows/ci.yml 同步）。
# 用法：bash scripts/ci.sh [--with-coverage] [--with-e2e]
# 退出码非 0 即失败；每步都打印真实命令与输出。
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
# 解释器解析（v24-doc-refresh E-1）：旧版硬编码 `/tmp/afvenv2/bin/python`——那是 /tmp 下的
# 临时 venv，重启即失，本地门禁第一步就跑不起来。改为**按序探测**，且允许 PY 覆盖：
#   1) $PY（显式指定，最优先）
#   2) 仓内持久 venv（.venv/bin/python）
#   3) PATH 上的 python3
# 注意：`/tmp` 下的路径**不再**作为默认——依赖环境不应放在临时目录里。
PY="${PY:-}"
if [ -z "$PY" ]; then
  for _cand in "$ROOT/.venv/bin/python" "$(command -v python3 || true)"; do
    if [ -n "$_cand" ] && [ -x "$_cand" ]; then PY="$_cand"; break; fi
  done
fi
if [ -z "$PY" ] || [ ! -x "$PY" ]; then
  echo "!! 找不到可用的 Python 解释器。用 PY=/path/to/python 指定，或先建 venv：" >&2
  echo "   python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt -r backend/requirements-dev.txt" >&2
  exit 2
fi
echo "[ci] 解释器：$PY"
WITH_COV=0; WITH_E2E=0
for a in "$@"; do case "$a" in --with-coverage) WITH_COV=1;; --with-e2e) WITH_E2E=1;; esac; done
fail=0
step() { echo; echo "===== $* ====="; }
run() { echo "\$ $*"; "$@"; local rc=$?; [ $rc -ne 0 ] && fail=1; return $rc; }

step "后端：pyflakes（未定义名）"
run bash -c "cd backend && $PY -m pyflakes \$(git ls-files '*.py' | grep -v node_modules) 2>&1 | grep -E 'undefined name' && exit 1 || exit 0"

step "后端：全量单测（目标 0 失败）"
if [ "$WITH_COV" = "1" ] && $PY -c "import coverage" 2>/dev/null; then
  ( cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! $PY -m coverage run --source=. -m unittest discover -s tests >/tmp/ci-backend.log 2>&1
    rc=$?; tail -3 /tmp/ci-backend.log
    # coverage 的 include 相对 cwd 匹配，不能写前导 *（否则 No data to report）
    $PY -m coverage report --skip-covered --include='services/*,routes/*' | tail -12
    exit $rc )
  [ $? -ne 0 ] && fail=1
else
  ( cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! $PY -m unittest discover -s tests > /tmp/ci-backend.log 2>&1
    rc=$?; tail -3 /tmp/ci-backend.log; exit $rc )
  [ $? -ne 0 ] && fail=1
fi

step "前端：类型检查"
run bash -c "cd frontend && npx tsc --noEmit"

step "前端：单测"
if [ "$WITH_COV" = "1" ]; then
  run bash -c "cd frontend && npx vitest run --coverage 2>&1 | tail -12"
else
  run bash -c "cd frontend && npx vitest run 2>&1 | tail -3"
fi

step "原型对齐：缺失/部分页族必须为 0"
run bash -c "python3 scripts/proto_parity_check.py --strict >/tmp/ci-parity.log 2>&1 || (cat /tmp/ci-parity.log; exit 1)"

step "前端：生产构建"
run bash -c "cd frontend && npm run build 2>&1 | tail -3"

if [ "$WITH_E2E" = "1" ]; then
  step "E2E（需外部已起 MySQL 后端 + vite，见 scripts/e2e/README.md）"
  run bash scripts/e2e/run_e2e.sh
fi

echo
if [ $fail -eq 0 ]; then echo "CI ✅ 全绿"; else echo "CI ❌ 有失败步骤（见上）"; fi
exit $fail
