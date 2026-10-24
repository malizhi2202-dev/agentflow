# scripts/e2e — 真实库 + 真实运行时界面 E2E

前置：
1. **MySQL**（本轮用私有实例，不碰系统库）：
   ```bash
   mysqld --no-defaults --initialize-insecure --datadir=/tmp/mysql-e2e/data --basedir=/usr
   mysqld --no-defaults --datadir=/tmp/mysql-e2e/data --port=3307 --bind-address=127.0.0.1 \
          --socket=/tmp/mysql-e2e/run/mysqld.sock --mysqlx=0 &
   mysql -uroot -h127.0.0.1 -P3307 -e "CREATE DATABASE agentflow_e2e CHARACTER SET utf8mb4"
   ```
2. **后端**（MySQL + CLI 运行时）：
   ```bash
   cd backend
   DATABASE_URL="mysql+pymysql://root@127.0.0.1:3307/agentflow" \
   RSI_CLI_PROVIDER=dsh \               # 换 hermes 即整条链走 hermes CLI
   RSI_JUDGE_PROVIDER=cli RSI_JUDGE_MODEL=dsh-cli RSI_JUDGE_MAX_CALLS=4 \
   RSI_EXTRACTOR_PROVIDER=cli RSI_EXTRACTOR_MODEL=dsh-cli \
   uvicorn main:app --port 8000
   # 注意 RSI_JUDGE_MODEL 必须给（judge 走 config，不吃请求里的 judge_model；
   # 缺它 = judge 未配置 → shadow/run(judge=llm) 直接 400 fail-closed）
   ```
3. **前端**：`cd frontend && npm run dev`（5173，代理 /api → 8000）
4. **Playwright**：`NODE_PATH=<playwright 包路径>`（本机 `~/.npm/_npx/*/node_modules`），浏览器用 headless shell：
   `E2E_CHROME=~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`

跑：
```bash
python scripts/e2e/seed_l0_mysql.py            # 用 dsh CLI 真跑 L0 抽取（2 条入库）
NODE_PATH=<playwright> node scripts/e2e/ui_mysql_e2e.js
```

覆盖：登录 / 任务建单+推进 / 收件箱 / 团队建团+成员+状态 / 记忆列表+写入+评审 / 治理开关+手动熔断(+熔断期拒绝+复位) /
提案 探针→影子→人批发布 / **UI 会话内 judge=llm 真调 CLI**。截图落在 `E2E_SHOTS`（默认 `/tmp/e2e-mysql/shots`）。
