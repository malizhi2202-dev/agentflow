#!/usr/bin/env bash
# agentflow 内网可访问的一套栈：真 MySQL + 后端(0.0.0.0:8000) + 前端 vite(0.0.0.0:5173)
#
# 用法：
#   bash scripts/serve_lan.sh start     # 起 MySQL/后端/前端，并做健康检查
#   bash scripts/serve_lan.sh stop      # 全停
#   bash scripts/serve_lan.sh status    # 看端口/进程/健康
#   bash scripts/serve_lan.sh restart
#   bash scripts/serve_lan.sh dump      # mysqldump 到 $DATA_DIR/backups（保留最近 10 份）
#   bash scripts/serve_lan.sh restore <file.sql.gz>
#
# 为什么不用系统 MySQL(3306)：本机 3306 是系统实例，root 口令未知且无 sudo 免密，
# 不去改它；这里跑**独立持久化实例**（数据目录见 DATA_DIR，不用 /tmp，重启机器不丢）。
#
# 环境变量（都有默认值）：
#   DATA_DIR      默认 ~/ai/agentflow-data          （运行根/日志/pid/备份，独立于仓库）
#   MYSQL_BASE    默认 /var/tmp/agentflow-mysql      （MySQL 数据目录）
#   MYSQL_PORT    默认 3307（系统 3306 被占，避免冲突）
#   MYSQL_DB      默认 agentflow
#   BACKEND_PORT  默认 8000
#   FRONTEND_PORT 默认 5173
#   LAN_CIDR      默认 192.168.36.0/24（DEPLOY_MODE=lan 的允许网段）
#   ADMIN_PASSWORD 默认 e2e-pass-123（仅首次建库时写入，之后改密请走界面）
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

DATA_DIR="${DATA_DIR:-$HOME/ai/agentflow-data}"
# MySQL 数据目录为什么不在 $HOME：Ubuntu 的 AppArmor 把 mysqld 限制在
# /var/lib/mysql、/tmp、/var/tmp 下（home 会 Permission denied）。这里用 /var/tmp，
# 本机 systemd-tmpfiles 的 /var/tmp 清理规则是注释掉的（不自动清），重启不丢；
# 另外 `serve_lan.sh dump` 会往 $DATA_DIR/backups 做持久 mysqldump。
MYSQL_BASE="${MYSQL_BASE:-/var/tmp/agentflow-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3307}"
MYSQL_DB="${MYSQL_DB:-agentflow}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
LAN_CIDR="${LAN_CIDR:-192.168.36.0/24}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-e2e-pass-123}"
PY="${PY:-/tmp/afvenv2/bin/python}"

MYSQL_DATA="$MYSQL_BASE/data"
MYSQL_RUN="$MYSQL_BASE/run"
RUNTIME_ROOT="$DATA_DIR/runtime"
LOGS="$DATA_DIR/logs"
PIDS="$DATA_DIR/pids"
USERS_SEED="$DATA_DIR/users.import.json"
SOCK="$MYSQL_RUN/mysqld.sock"
DATABASE_URL="mysql+pymysql://root@127.0.0.1:${MYSQL_PORT}/${MYSQL_DB}"

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[ -n "$LAN_IP" ] || LAN_IP="127.0.0.1"

mkdir -p "$MYSQL_RUN" "$RUNTIME_ROOT" "$LOGS" "$PIDS" "$DATA_DIR/backups"  # MYSQL_DATA 由 mysqld 初始化时自己建（已存在会报 errno 17）

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
wait_port() {  # wait_port PORT NAME SECONDS
  for _ in $(seq 1 "${3:-40}"); do port_open "$1" && return 0; sleep 1; done
  echo "✖ $2 在 $3 秒内没起来（看日志 $LOGS）"; return 1
}
have_pid() { [ -f "$PIDS/$1" ] && kill -0 "$(cat "$PIDS/$1")" 2>/dev/null; }

start_mysql() {
  if port_open "$MYSQL_PORT"; then echo "· MySQL 已在 $MYSQL_PORT（复用）"; return 0; fi
  if [ ! -d "$MYSQL_DATA/mysql" ]; then
    echo "· 初始化 MySQL 数据目录 $MYSQL_DATA（一次性）"
    /usr/sbin/mysqld --no-defaults --initialize-insecure \
      --datadir="$MYSQL_DATA" --basedir=/usr > "$LOGS/mysql-init.log" 2>&1 || {
        echo "✖ MySQL 初始化失败，见 $LOGS/mysql-init.log"; return 1; }
  fi
  echo "· 启动 MySQL :$MYSQL_PORT（datadir=$MYSQL_DATA）"
  /usr/sbin/mysqld --no-defaults --datadir="$MYSQL_DATA" --basedir=/usr \
    --port="$MYSQL_PORT" --bind-address=127.0.0.1 --socket="$SOCK" --mysqlx=0 \
    --pid-file="$MYSQL_RUN/mysqld.pid" > "$LOGS/mysql.log" 2>&1 &
  echo $! > "$PIDS/mysql.pid"
  wait_port "$MYSQL_PORT" MySQL 40 || return 1
  # 建库（已存在则跳过）
  mysql -uroot -h127.0.0.1 -P"$MYSQL_PORT" \
    -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" \
    || { echo "✖ 建库失败"; return 1; }
  echo "· 库 $MYSQL_DB 就绪"
}

seed_users_file() {
  # 表为空时才需要：导入脚本会把 users.json 搬进 app_users 表；之后表是权威源
  [ -f "$USERS_SEED" ] && return 0
  "$PY" - "$USERS_SEED" "$ADMIN_PASSWORD" <<'PY' || return 1
import json, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)) if "__file__" in dir() else ".", "backend"))
sys.path.insert(0, "backend")
from passwords import hash_password
path, pw = sys.argv[1], sys.argv[2]
users = []
for uid, name, role in (("admin", "管理员", "admin"), ("bob", "bob", "member")):
    users.append({"id": uid, "name": name, "role": role,
                  "password_hash": hash_password(pw), "must_change_password": False,
                  "project_ids": [], "custom_permissions": [], "active": True,
                  "created_at": "2026-10-24T00:00:00"})
json.dump({"users": users}, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"· 生成登录种子 {path}（admin/bob，口令 {pw}）")
PY
}

start_backend() {
  if port_open "$BACKEND_PORT"; then echo "· 后端已在 $BACKEND_PORT（复用）"; return 0; fi
  seed_users_file || return 1
  echo "· 启动后端 0.0.0.0:$BACKEND_PORT（DEPLOY_MODE=lan，ALLOW_CIDRS=$LAN_CIDR）"
  ( cd backend && \
    PROJECT_ROOT="$RUNTIME_ROOT" \
    DATABASE_URL="$DATABASE_URL" \
    DEPLOY_MODE="lan" ALLOW_CIDRS="$LAN_CIDR" \
    ENCRYPTION_KEY="${ENCRYPTION_KEY:-agentflow-lan-32bytes-key-000000}" \
    RSI_JUDGE_PROVIDER="${RSI_JUDGE_PROVIDER:-cli}" \
    RSI_JUDGE_MODEL="${RSI_JUDGE_MODEL:-hermes-cli}" \
    RSI_JUDGE_MAX_CALLS="${RSI_JUDGE_MAX_CALLS:-4}" \
    RSI_CLI_PROVIDER="${RSI_CLI_PROVIDER:-hermes}" \
    RSI_EXTRACTOR_PROVIDER="${RSI_EXTRACTOR_PROVIDER:-cli}" \
    RSI_EXTRACTOR_MODEL="${RSI_EXTRACTOR_MODEL:-hermes-cli}" \
    RUNTIME_EXEC_ENABLED="${RUNTIME_EXEC_ENABLED:-true}" \
    "$PY" -m uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" \
      > "$LOGS/backend.log" 2>&1 & echo $! > "$PIDS/backend.pid" )
  wait_port "$BACKEND_PORT" 后端 60 || { tail -20 "$LOGS/backend.log"; return 1; }

  # 首次：把种子里面的用户导入 app_users（表非空后由表提供档案）
  echo "· 导入用户种子 → app_users（幂等）"
  ( cd backend && DATABASE_URL="$DATABASE_URL" \
      ENCRYPTION_KEY="${ENCRYPTION_KEY:-agentflow-lan-32bytes-key-000000}" \
      "$PY" scripts/import_users_to_db.py --file "$USERS_SEED" --apply 2>&1 | tail -3 )
}

start_frontend() {
  if port_open "$FRONTEND_PORT"; then echo "· 前端已在 $FRONTEND_PORT（复用）"; return 0; fi
  echo "· 启动前端 0.0.0.0:$FRONTEND_PORT（/api 代理到 127.0.0.1:$BACKEND_PORT）"
  ( cd frontend && npx vite --host 0.0.0.0 --port "$FRONTEND_PORT" --strictPort \
      > "$LOGS/frontend.log" 2>&1 & echo $! > "$PIDS/frontend.pid" )
  wait_port "$FRONTEND_PORT" 前端 60 || { tail -20 "$LOGS/frontend.log"; return 1; }
}

health() {
  local ok=0
  curl -sf "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null && echo "  后端 API : 200" || { echo "  后端 API : ✖"; ok=1; }
  curl -sf -o /dev/null "http://127.0.0.1:$FRONTEND_PORT/" && echo "  前端页面 : 200" || { echo "  前端页面 : ✖"; ok=1; }
  echo "  局域网后端: http://$LAN_IP:$BACKEND_PORT/api/health"
  echo "  局域网前端: http://$LAN_IP:$FRONTEND_PORT/"
  return $ok
}

do_start() {
  start_mysql || exit 1
  start_backend || exit 1
  start_frontend || exit 1
  echo
  echo "✅ 全部就绪（数据目录 $DATA_DIR，日志 $LOGS）"
  health || exit 1
  echo "   登录：admin / $ADMIN_PASSWORD（bob / 同口令，普通成员）"
}

do_stop() {
  for name in frontend backend; do
    if have_pid "$name"; then
      pid="$(cat "$PIDS/$name.pid")"; echo "· 停 $name (pid $pid)"
      pkill -P "$pid" 2>/dev/null; kill "$pid" 2>/dev/null
      rm -f "$PIDS/$name.pid"
    fi
  done
  # vite/uvicorn 可能派生 node 子进程，按端口兜底
  for port in "$FRONTEND_PORT" "$BACKEND_PORT"; do
    pids="$(ss -lptn "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u)"
    for pid in $pids; do [ "$pid" != "$$" ] && kill "$pid" 2>/dev/null; done
  done
  if have_pid mysql; then
    pid="$(cat "$PIDS/mysql.pid")"; echo "· 停 MySQL (pid $pid)"
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 20); do port_open "$MYSQL_PORT" || break; sleep 1; done
    rm -f "$PIDS/mysql.pid"
  fi
  echo "已停（数据仍在 $DATA_DIR，不会丢）"
}

do_status() {
  for pair in "MySQL:$MYSQL_PORT" "后端:$BACKEND_PORT" "前端:$FRONTEND_PORT"; do
    name="${pair%%:*}"; port="${pair##*:}"
    if port_open "$port"; then echo "$name :$port 运行中"; else echo "$name :$port 未运行"; fi
  done
  health
}

do_dump() {
  local ts file
  ts="$(date +%Y%m%d-%H%M%S)"
  file="$DATA_DIR/backups/${MYSQL_DB}-${ts}.sql.gz"
  mkdir -p "$DATA_DIR/backups"
  mysqldump -uroot -h127.0.0.1 -P"$MYSQL_PORT" --databases "$MYSQL_DB" 2>/dev/null | gzip > "$file" \
    || { echo "✖ dump 失败（MySQL 没起？）"; return 1; }
  ls -1t "$DATA_DIR/backups/${MYSQL_DB}-"*.sql.gz | tail -n +11 | xargs -r rm -f
  echo "✅ 已备份到 $file（$(du -h "$file" | cut -f1)）"
}

do_restore() {
  local file="${1:-}"
  [ -n "$file" ] && [ -f "$file" ] || { echo "用法: $0 restore <file.sql.gz>"; return 2; }
  echo "· 从 $file 恢复（覆盖 $MYSQL_DB）"
  gzip -dc "$file" | mysql -uroot -h127.0.0.1 -P"$MYSQL_PORT" || return 1
  echo "✅ 恢复完成；如后端在跑，建议 restart 一遍"
}

case "${1:-start}" in
  start)   do_start ;;
  stop)    do_stop ;;
  restart) do_stop; sleep 1; do_start ;;
  status)  do_status ;;
  dump)    do_dump ;;
  restore) do_restore "${2:-}" ;;
  *) echo "用法: $0 {start|stop|restart|status|dump|restore <file>}"; exit 2 ;;
esac
