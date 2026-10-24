# CHANGE: MySQL 真实库 + 真实运行时（CLI）界面 E2E

- **Change ID**: v20-e2e-mysql · 2026-10-24 · 测试/基础设施（含 1 处产品修正）· 压缩路径（0→3→4→6）
- **触发**：用户 10-24「测试的时候 1 数据库改为 mysql 不用 sqlite 2 真正采用接入运行时 对界面各种功能做出测试」

## Why
此前的 E2E 跑在 SQLite + mock 数据上；MySQL 档（裁定⑦ 的权威档）**迁移从未真跑过**，界面也**没在真实运行时下点过**。
用户要求：数据库换 MySQL、并用真正接入的运行时（本地 dsh/hermes CLI）对界面各功能做测试。

## What / AC
| AC | 判据 |
|---|---|
| AC-1 | 私有 MySQL 8.0 实例（3307）建库；`init_db()` 应用 **001…016 全部迁移**、50 张表、二次调用「无待应用迁移」 |
| AC-2 | 后端以 `DATABASE_URL=mysql+pymysql://…` 启动；`/api/health` 200、登录 200（服务端会话） |
| AC-3 | 真实运行时经 **`RSI_JUDGE_PROVIDER=cli` + `RSI_CLI_PROVIDER=dsh`** 接入（无 key） |
| AC-4 | 界面 13 条 E2E 全绿：登录 / 任务建单+状态推进 / 收件箱 / 团队建团+加成员+暂停 / 记忆列表(含 CLI 抽取结果)+写入+评审 / 治理开关+手动熔断 / **熔断期建房被 409 拦** / 熔断复位 / 提案探针+影子+人批发布 / **UI 会话内 judge=llm 真调 dsh CLI** |
| AC-5 | MySQL 落表可查：`work_items 18 / teams 8 / memories 9 / promotion_reviews 9 / orchestration_proposals 5 / trace_spans 6` |
| AC-6 | 产品修正：`/shadow/run` 的 `judge_kind` 归一为 `llm_judge`（原返回内部简称 `llm`），补路由用例且**不真调 CLI** |
| AC-7 | E2E 脚本入仓可复现：`scripts/e2e/ui_mysql_e2e.js`（env 参数化）+ `scripts/e2e/seed_l0_mysql.py` |

## 设计要点
- 私有实例：`mysqld --no-defaults --datadir=/tmp/mysql-e2e/data --port=3307`（不碰系统实例、无需 sudo/docker）。
- 后端 env：MySQL URL + `RSI_*_PROVIDER=cli`；L0 抽取由 `scripts/e2e/seed_l0_mysql.py` 用 dsh CLI 真跑（2 条入库）。
- 选择器：卡片用「祖先两层」定位、告警用 `.last()`、治理区在记忆 tab 内（切 tab 会卸载）——这些是 E2E 自身的坑，已在脚本里修掉。

## 范围排除
- 不用系统 MySQL（无凭据）、不用 docker（未安装）；不改产品默认库（仍是 SQLite 本地档）。
- 不覆盖多用户会话（bob 的收件箱）与移动端；不覆盖 hermes（dsh 已证，hermes 单测/试跑记录在 v20-rsi-adapters）。
