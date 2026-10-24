# SUMMARY: v20-e2e-mysql

- **Change ID**: v20-e2e-mysql · 2026-10-24 · 测试/基础设施 + 1 处产品修正

## 做了什么
1. 起**私有 MySQL 8.0**（`/tmp/mysql-e2e`，端口 3307，`--no-defaults --initialize-insecure`，无需 sudo/docker），建库 `agentflow_e2e`；
   `init_db()` 应用 **001…016 全部迁移** → 50 表；二次调用幂等。
2. 后端以 MySQL URL + **`RSI_JUDGE_PROVIDER=cli` / `RSI_CLI_PROVIDER=dsh`** 启动；`/api/health` 200、登录 200。
3. 用 dsh CLI 真跑 L0 抽取（2 条入库），再用 **Playwright** 对界面跑 **13 条功能 E2E**（MySQL 真库 + 真运行时），13/13 通过。
4. 修 1 处产品语义：`/shadow/run` 的 `judge_kind` 归一为 `llm_judge`（原暴露内部简称 `llm`），补路由用例（patch 替身，不真调 CLI）。
5. E2E 脚本入仓：`scripts/e2e/ui_mysql_e2e.js`（env 参数化）+ `scripts/e2e/seed_l0_mysql.py`。

## 改动文件
| 文件 | 性质 |
|---|---|
| `scripts/e2e/ui_mysql_e2e.js` | 新增（13 条界面 E2E，env 参数化） |
| `scripts/e2e/seed_l0_mysql.py` | 新增（MySQL 上真实跑 L0 CLI 抽取） |
| `backend/routes/rsi_api.py` | 修改（judge_kind 归一） |
| `backend/tests/test_shadow_runner.py` | 修改（+1 路由用例） |
| `.specs/v20-e2e-mysql/*` | 新增工件 |

## verify（真实输出）
```text
MySQL: 16 迁移 / 50 表 / 二次「无待应用迁移」
界面 E2E: SUMMARY 13/13 passed（含 judge=llm 真调 dsh → pass_rate 0.5 / llm_judge）
unittest tests.test_shadow_runner → Ran 13 — OK
MySQL 行数：tasks 18 · teams 8 · memories 9 · proposals 5 · trace_spans 6
```

## 已知接受
- 自派任务不自我通知（未读 0 属预期，多用户由 `test_collab` 覆盖）。
- `change_log` 本轮为 0（未走 workflow PUT）。
