# TEST — v25-r25-clearance 验收账（2026-10-25）

> 五道门全绿才收口；**真 MySQL 重放不可省**（L-014：SQLite 宽松会掩盖 FK 静默忽略 / NOT NULL 无默认 1364 / 半截态三类问题）。

## 一 · 门禁终值

| 门 | 命令 | 结果 |
|---|---|---|
| 后端全量 | `venv/bin/python -m unittest discover -s tests -t .`（前台） | **Ran 774 tests · OK (skipped=6)**（211.8s） |
| 迁移纪律 | `test_migrations_discipline`（随全量） | 032–037 up 区禁词扫描 0 · 每版两遍幂等 · DOWN 登记清单通过 |
| 前端类型 | `npx tsc --noEmit` | **0 错** |
| 前端单测 | `npx vitest run` | **25 文件 · 259/259**（v25 新增/改造 4 个测试文件） |
| 前端构建 | `npm run build` | **✓**（25.8s，仅 chunk 尺寸告警——非门禁） |
| 原型对齐 | `python3 scripts/proto_parity_check.py --strict` | **exit 0**（127 页无回退） |

新增后端用例（41）：`test_v25_shape.py` 12（global 行一次 · 列在 PRAGMA · FK RESTRICT inspect · dflt_value · UNIQUE · 透传）· `test_v25_governance.py` 20（总闸短路/缺行合成开/原因必填/词表三型/合取/exclusions 压制/cap 仅有 content/畸形写拒读拒/HMAC 全链路六态/rotate 失效/api 型无签名）· `test_v25_assign_run.py` 9（停车闸/人轨/小队注/双入口/失败半成文案）。

## 二 · 真 MySQL 重放与形状验收

```
[migrate] 无待应用迁移 · INIT_DB-OK    （dialect: mysql——DATABASE_URL 经 env 文件流入进程，不落 transcript）
```

收口复跑 `init_db()` 时账本报「无待应用迁移」（032–037 在库上已全部应用且本批无半截态）；**不据账本沉默判过**，按 L-014 以 `information_schema` 实测形状为准（九项全 ✓）：

| # | 验收项 | 实测 |
|---|---|---|
| 1 | pending 清单 | `[]` |
| 2 | `squads.avatar_url` / `leader_agent_id` | True / True |
| 3 | `squad_members.created_by` | True |
| 4 | `squads` 表级 FK | `['fk_squads_leader_agent']`（RESTRICT；inline REFERENCES 在 MySQL 无效——已按纪律走表级） |
| 5 | `scheduler_queue` 七列 | True（trigger_comment_id/coalesced_comment_ids/handoff_note/fire_at/is_leader_task/squad_id/workflow_id） |
| 6 | `automations` 三列 + `automation_triggers.signing_secret` | True / True |
| 7 | `mention_targets` / `im_bindings` 存在 | 两表在 |
| 8 | 订阅泛化列 `subject_type`/`subscriber_type` | True（旧 UNIQUE 保留——expand-only） |
| 9 | `rsi_switches` global 行 | `('global', enabled=1)` |

**L-014 前移验证**：本批 032–037 在真库首跑即过（批量设计时按三纪律书写——新列 DEFAULT 或可空（TEXT 一律可空）/ FK 表级 ADD CONSTRAINT / 存在性预检幂等），对照 v24 批 026–031 首跑炸三件——教训生效的实证。

## 三 · 如实边界（不许读成「全做完了」）

- 「表先行·写侧挂账」族：队列 coalesce 四列 / `mention_targets` 收据 / `im_bindings` 入站绑定 / `concurrency_policy` skip·replace 消费 / `issue_title_template`·`created_by`·squads `avatar_url` 写侧——**列与表在、数据不伪造**（继承清单见 RULINGS §五点五·三）。
- `rollback_to` 的 032–037 DOWN 已登记并经 SQLite roundtrip；**未在生产 MySQL 上演练回滚**——生产禁用，先测试库。
- 规则版本「回滚」按钮不做（后端只读账）；界面已显式标注。
- webhook **token 通道未退役**（双通道过渡态，`legacy_token` 记因持续可见）。
- `exec_ledgers` 仍只建不写（R25-3 用户裁挂起）。

## 四 · 测试基建备忘（本批踩坑）

- 后台 `bash + grep` 管道两次输出文件为空却 exit 0（v24 收口期）——**空输出不作绿灯证据**，本批全量与重放一律前台跑（timeout 600s）。
- Bash 安全分类器瞬时超时多次复现：等待期转只读探查（grep/Read 不受限），恢复后原命令重发即可。
- 前端断言撞文本：`getByText('rule')` 会命中筛选 select 的同值 option——改按行内 chip 的 `title` 选路。
- content 摘要渲染在 lesson 尾串 `<span> · {content}</span>`：精确 `getByText` 不中，用 `/· 一句话/`。
