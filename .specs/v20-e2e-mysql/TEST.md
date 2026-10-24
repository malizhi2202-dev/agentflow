# TEST: MySQL + 真实运行时 E2E

## 1. MySQL 迁移（真实库，非 SQLite）
```text
[migrate] 已应用 16 个迁移: 001_agent_memories_domain_id … 016_domain_attribution_policy
tables: 50          # information_schema 统计
第二次 init_db：[migrate] 无待应用迁移
MySQL 8.0.46-0ubuntu0.22.04.4 @127.0.0.1:3307
```

## 2. 界面 E2E（真实后端 + 真实浏览器 + dsh CLI 运行时）
```text
PASS 登录（MySQL + 服务端会话）
PASS 任务：建单 → 推进到待做
PASS 收件箱：指派进箱 + 标读 — 未读 0 · 需我处理 0
PASS 团队：建团 + 加成员 + 暂停
PASS 记忆：L0 抽取结果已在列表 — 记忆行=22 含502=true
PASS 记忆：写入并返回结果 — 已入库：promoted
PASS 记忆：晋升评审账可查
PASS 治理：skill 开关切换 — running→paused
PASS 治理：手动熔断提交
PASS 治理：熔断期新建提案被拒（409 文案） — 熔断打开（budget）：拒绝新建提案
PASS 治理：熔断复位
PASS 提案：探针 → 影子 → 人批发布 全链路
PASS 运行时：judge=llm 真实调用 dsh CLI — pass_rate=0.5 kind=llm_judge

SUMMARY 13/13 passed
```
说明：`收件箱 未读 0` 是**预期**——自派（assignee==creator）不自我通知；多用户收件箱由 `test_collab` 23 条覆盖。

## 3. MySQL 落表复核
```text
tasks 18 · teams 8 · squads 0 · memories 9 · promotion_reviews 9
orchestration_proposals 5 · trace_spans 6 · change_log 0 · domain_attribution_policies 0
```
（`change_log 0` 因本轮未走 `/api/admin/workflow` PUT；`trace_spans 6` 来自 chat/探测链路真实产生。）

## 4. 产品修正回归
`routes/rsi_api.py`：`judge=llm` 时响应 `judge_kind="llm_judge"`（原为内部简称 `llm`）；新增路由用例用 patch 替身，**单测不真调 CLI**。
```text
$ unittest tests.test_shadow_runner → Ran 13 tests — OK
```

## 未覆盖
- 多用户并发/多副本、移动端、浏览器像素级人工审阅（截图存 `/tmp/e2e-mysql/shots/`）。
- hermes 通道本轮未跑（dsh 已证；hermes 试跑见 `v20-rsi-adapters/LOCAL-TRIAL.md`）。

测试门（自评）🧪✅ 🟫✅ 🧑‍💼✅ 🧑‍🎨✅ → 4/4
