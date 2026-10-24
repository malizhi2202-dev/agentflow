#!/usr/bin/env bash
# 把 AgentFlow 装成 systemd **user** 服务（不需要 root）：
#   agentflow-mysql / agentflow-backend / agentflow-frontend + agentflow.target
#
# 用法：
#   bash scripts/systemd_user_install.sh [--restart]
# 之后统一用 systemctl --user 管理：
#   systemctl --user status agentflow.target
#   systemctl --user restart agentflow-backend
#   journalctl --user -u agentflow-backend -f
#
# 说明：
# - unit 模板在 deploy/systemd/user/*.in，装到 ~/.config/systemd/user/（@REPO@/@DATA@/@NODE_BIN@ 渲染）；
# - 持久 venv：~/ai/agentflow-data/venv（不用 /tmp，重启机器仍在）；
# - 配置集中在 ~/ai/agentflow-data/agentflow.env（chmod 600，含 ENCRYPTION_KEY）；
# - 想开机自启需要 `loginctl enable-linger <user>`（同用户可执行，个别机器要 polkit 授权）。
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"
DATA="${DATA_DIR:-$HOME/ai/agentflow-data}"
UNIT_DIR="$HOME/.config/systemd/user"
MYSQL_DATA="/var/tmp/agentflow-mysql/data"
PY="$DATA/venv/bin/python"
NODE_BIN="$(dirname "$(command -v node)")"
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"; LAN_IP="${LAN_IP:-127.0.0.1}"

say() { echo "· $*"; }
die() { echo "✖ $*"; exit 1; }

systemctl --user is-system-running >/dev/null 2>&1 || true
systemctl --user status >/dev/null 2>&1 || die "user 级 systemd 不可用（没有 /run/user/$(id -u) 会话总线）"

mkdir -p "$DATA" "$UNIT_DIR" "$DATA/logs"

# 1) 持久 venv + 依赖
if [ ! -x "$PY" ]; then
  say "创建持久 venv $DATA/venv"
  python3 -m venv "$DATA/venv" || die "venv 创建失败"
fi
if ! "$PY" -c "import fastapi, sqlalchemy, uvicorn, pymysql" 2>/dev/null; then
  # 本机外网很慢（实测 ~10 kB/s）：若已有可用的构建产物/现成 venv，直接复用避免几百 MB 下载
  REUSE="${REUSE_SITE_PACKAGES:-/tmp/afvenv2/lib/python3.10/site-packages}"
  if [ -d "$REUSE" ]; then
    say "复用现成 site-packages：$REUSE（不联网）"
    cp -a "$REUSE/." "$DATA/venv/lib/python3.10/site-packages/" || die "复制依赖失败"
  else
    say "安装后端依赖（首次会慢一点）"
    "$PY" -m pip install -q -r "$REPO/backend/requirements.txt" || die "依赖安装失败"
  fi
fi
"$PY" -c "import fastapi, sqlalchemy, uvicorn, pymysql" || die "依赖仍不完整"

# 2) MySQL 数据目录（不存在才初始化；已存在绝不动）
if [ ! -d "$MYSQL_DATA/mysql" ]; then
  say "初始化 MySQL 数据目录 $MYSQL_DATA（一次性）"
  mkdir -p /var/tmp/agentflow-mysql/run
  /usr/sbin/mysqld --no-defaults --initialize-insecure --datadir="$MYSQL_DATA" --basedir=/usr \
    >> "$DATA/logs/mysql-init.log" 2>&1 || die "MySQL 初始化失败（见 $DATA/logs/mysql-init.log）"
fi

# 3) 环境文件（已存在不覆盖，避免改掉密钥/口令）
ENV_FILE="$DATA/agentflow.env"
if [ ! -f "$ENV_FILE" ]; then
  say "生成 $ENV_FILE（含随机 ENCRYPTION_KEY）"
  key="$("$PY" -c 'import secrets;print(secrets.token_urlsafe(24))')"
  umask 077
  cat > "$ENV_FILE" <<EOF
# AgentFlow 后端环境（systemd user 服务读取）。改完：systemctl --user restart agentflow-backend
DATABASE_URL=mysql+pymysql://root@127.0.0.1:3307/agentflow
PROJECT_ROOT=$DATA/runtime
ENCRYPTION_KEY=$key
DEPLOY_MODE=lan
ALLOW_CIDRS=192.168.36.0/24
# 本地 CLI 当模型通道（试运行/无厂商 key 场景）
RSI_CLI_PROVIDER=hermes
RSI_JUDGE_PROVIDER=cli
RSI_JUDGE_MODEL=hermes-cli
RSI_JUDGE_MAX_CALLS=4
RSI_EXTRACTOR_PROVIDER=cli
RSI_EXTRACTOR_MODEL=hermes-cli
RUNTIME_EXEC_ENABLED=true
EOF
  chmod 600 "$ENV_FILE"
fi

# 4) 渲染 unit
say "安装 unit 到 $UNIT_DIR"
for f in "$REPO"/deploy/systemd/user/*.in; do
  name="$(basename "$f" .in)"
  sed -e "s|@REPO@|$REPO|g" -e "s|@DATA@|$DATA|g" -e "s|@NODE_BIN@|$NODE_BIN|g" "$f" > "$UNIT_DIR/$name"
done

# 5) 起服务
systemctl --user daemon-reload || die "daemon-reload 失败"
say "enable --now agentflow.target"
systemctl --user enable --now agentflow.target || {
  systemctl --user status --no-pager agentflow.target | tail -20
  die "启动失败（看 journalctl --user -u agentflow-backend -n 50）"
}

# 6) 开机自启（linger）：能开就开，开不了只提示
if [ "$(loginctl show-user "$(id -un)" -p Linger --value 2>/dev/null)" != "yes" ]; then
  if loginctl enable-linger "$(id -un)" 2>/dev/null; then
    say "已开启 linger（重启机器后自动拉起）"
  else
    say "未开启 linger：需开机自启用 sudo loginctl enable-linger $(id -un)（本次不影响当前运行）"
  fi
else
  say "linger 已开启（重启机器后自动拉起）"
fi

# 7) 首次：把种子用户导入 app_users（表非空后由表提供档案）
if curl -sf "http://127.0.0.1:8000/api/health" >/dev/null 2>&1; then
  SEED="$DATA/users.import.json"
  if [ ! -f "$SEED" ]; then
    umask 077
    "$PY" - "$SEED" <<'PY'
import json, sys
sys.path.insert(0, "backend")
from passwords import hash_password
pw = "e2e-pass-123"
users = [{"id": uid, "name": name, "role": role, "password_hash": hash_password(pw),
          "must_change_password": False, "project_ids": [], "custom_permissions": [],
          "active": True, "created_at": "2026-10-24T00:00:00"}
         for uid, name, role in (("admin", "管理员", "admin"), ("bob", "bob", "member"))]
json.dump({"users": users}, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
PY
  fi
  if ! mysql -uroot -h127.0.0.1 -P3307 agentflow -e "SELECT 1 FROM app_users LIMIT 1" >/dev/null 2>&1; then
    say "导入种子用户 → app_users（首次）"
    # 复用同一份 env（导入脚本需要 DATABASE_URL + ENCRYPTION_KEY）
    ( set -a; . "$ENV_FILE"; set +a
      cd backend && "$PY" scripts/import_users_to_db.py --file "$SEED" --apply 2>&1 | tail -2 )
    systemctl --user restart agentflow-backend
  fi
fi

echo
echo "✅ systemd user 服务已就绪（数据 $DATA；配置 $ENV_FILE）"
systemctl --user --no-pager status agentflow.target | head -6
echo
echo "  局域网前端: http://$LAN_IP:5173/     （admin / e2e-pass-123）"
echo "  局域网后端: http://$LAN_IP:8000/api/health"
echo "  管理：systemctl --user {status|restart|stop} agentflow.{target,backend,frontend,mysql}"
echo "  日志：journalctl --user -u agentflow-backend -f"
