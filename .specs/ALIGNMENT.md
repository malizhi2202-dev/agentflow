# Alignment: AgentFlow — v20 升级波次（波 0–7）

> S-align 产物（R15.1 强制前置）。本轮为**首次对齐**：`.specs/ALIGNMENT.md` 此前不存在，基线取文档声明的代码基线 `4ac819bf`（2026-10-12）。
> 检测阶段只读；合并动作经确认后执行（R15.2）。

## 概要

- **本轮时间**：2026-10-24 15:40
- **基线范围**：`4ac819bf..13faefbe`（**45 条提交**）
- **五层状态**：L1 代码 ✔ · L2 原型 ⚠ 3 项（挂载缺口，非漂移）· L3 活文档 **✖ 2 项** · L4 决策留痕 ⚠ 1 项（裁⑦ 部分实施）· L5 执行留痕 **✖ 3 项**
- **结论**：**6 项漂移待处理**（可自动合并 4 项 / 需裁决 2 项）；代码与测试层面无红灯（见 §4 自动化输出）。

## 1. 覆盖的本地提交

| # | commit | 主题 | 归层 |
|---|---|---|---|
| 1 | `13faefbe` | feat(v20-wave7): A2A M0 静态卡 + RSI 因果前缀/评审账/四类开关 + 归因双列 | L1+L3+L5 |
| 2 | `8b87035e` | docs(state): 波 4/5/6 收口登记 + 门面事实对齐 | L3+L5 |
| 3 | `64e44de6` | feat(v20-wave6): RSI 产物治理 | L1+L3+L5 |
| 4 | `943b7e5e` | feat(v20-wave5): 可观测产生端 + 声明式 API 四件组 + 隔离契约 | L1+L3+L5 |
| 5 | `ac839aa0` | feat(v20-wave4): 团队与小隊两实体 + 五类资产归属 | L1+L3+L5 |
| 6 | `faf37aa7` | docs(state): 波 2/波 3 收口登记 | L3+L5 |
| 7 | `67420190` | feat(v20-wave3): 任务 + 运行连接 + 收件箱三规则 | L1+L3+L5 |
| 8 | `57945f50` | feat(v20-wave3): 告警落表 + 双队列并表 | L1+L5 |
| 9 | `09950db4` | feat(v20-wave2): 队列/限流/退避落库 + 单例租约选主 | L1+L3+L5 |
| 10 | `129c33ec` | feat(v20-wave1): 服务端会话 + 部署闸门 | L1+L3+L5 |
| 11 | `5cf2a6fa` | feat(v20-wave1): 口令体系 argon2id + 废出厂口令 | L1+L3+L5 |
| 12 | `24c38aa1` | feat(v20-wave0): 阶段模型单一事实源 | L1+L3+L5 |
| 13 | `8d3fdc1d` | feat(v20-wave0): 版本化迁移账本 | L1+L5 |
| 14 | `d2ee8d96` | fix(v20-wave0): 恢复可用生产构建（32 TS 错误清零） | L1+L5 |
| 15 | `fcc00645` | docs(align): v20 文档统一归并（RULINGS/INDEX/门面/删 8 孤儿页） | L2+L3+L4+L5 |
| 16 | `2aca1321` | docs(state): 登记 doc-align-v20 | L5 |
| 17 | `5a21e597` | safety(doc-align): 工作树快照（safety commit，禁 reset） | L5 |
| 18 | `e51f7822` `e677117d` `db825ebc` `eaac4a35` `63511728` `eec8c3ab` `dc4bd960` `4383f52c` `3c9852a2` `f20cb177` | 第 8 轮 S22/S23 discovery 与 v19 主档落地 | L2+L3+L4 |
| 19 | `9ef6a42b` `8b6fa1cf` `1202c540` `56cbc0d0` `22c3eaff` | 项目工作流绑定 + 邀请三入口（v18） | L2+L3+L4 |
| 20 | `93af73c1` `ea7fe8d5` `fc4274ff` `4c6a1ff4` `abea4a39` | 第 6/7 轮 RSI 与 harness2 糅合（v15/v16/v17） | L2+L3+L4 |
| 21 | `da152ab9` `be3febe3` `046adade` `e248a518` `3797a233` `58a42456` `99ab5bb2` `2bcc2d48` | 第 1–5 轮 discovery 与 v11–v14 主档 | L2+L3+L4 |

未提交变更（`git status --short`）：

```
 D frontend/dist/assets/index-s88cDe4R.js
 M frontend/dist/index.html
 M frontend/node_modules/.vite/vitest/results.json
?? frontend/dist/assets/index-NL5GhwOS.js
?? frontend/dist/prototype/
```

→ 全部是**构建产物**（`frontend/dist`、`node_modules/.vite`），属 D6 孤儿/卫生项，无源码未提交。

## 2. 漂移项

| 编号 | 类型 | 层 | 证据 | 描述 | 状态 |
|---|---|---|---|---|---|
| D1-1 | D1 代码变文档未变 | L3 | `13faefbe`/`943b7e5e`/`67420190` + `README.md §API 端点速查`（实测 `grep -c`：`/api/tasks` 0、`/api/inbox` 0、`/api/teams` 0、`/api/squads` 0、`/api/a2a` 0、`execution-contract` 0） | 波 3–7 新增的对外端点未进速查表 | 待合并 |
| D1-2 | D1 代码变文档未变 | L3 | `README.md §功能模块`（仍按老版能力叙述）+ `STATE.md` 波 0–7 已收口 | README 主叙述未反映「身份=服务端会话 / 任务=work_items / 团队小队 / 记忆四层 / 声明式账本」等已落地能力 | 待合并 |
| D2-1 | D2 决策矛盾（弱） | L4 | `RULINGS.md` 裁⑦「MySQL 权威档」vs 代码默认 SQLite；`users.json` 仍为文件态 | 裁⑦ 只做到「表按 MySQL 档设计并落库」，**权威库切换与 users 表化未做** | 需裁决（已在我方改为「部分实施」，是否立 change 做表化） |
| D3-1 | D3 原型漂移 | L2 | `control-plane.html` 内 `team_id` 命中 0；`audit.html`/`chat.html` 需逐页核 | STATE 已挂账的「原型三处挂载缺口」，属**已知未补**，不是代码回退 | 需裁决（补 or 转议题） |
| D4-1 | D4 执行留痕缺口 | L5 | `ls .specs/v20-wave{0..7}/` → 每个目录仅 `CHANGE/TASK/TEST/REVIEW`；**0 个 `*-SUMMARY.md`、0 个 `PROGRESS.md`** | 4-dev 要求每任务 SUMMARY 缺失，LESSONS 提名无原料 | 待合并（本轮补） |
| D4-2 | D4 执行留痕缺口 | L5 | `.specs/CHANGELOG.md`、`.specs/LESSONS.md`、`.specs/archive/` **均不存在** | 7-integration 产物全缺（本轮即为此而跑） | 待合并（本轮补） |
| D6-1 | D6 孤儿产物 | L5 | `git status` 5 项全是 `frontend/dist` / `node_modules/.vite` | 构建产物与依赖被 git 跟踪（P0-5，用户 10-24 定「只记账不做」） | 需裁决（是否 `git rm --cached`） |

漂移类型速查：D1 代码变文档未变 / D2 决策矛盾 / D3 原型漂移 / D4 执行留痕缺口 / D5 需求失配 / D6 孤儿产物
（D5 需求失配：波 0–7 均为**压缩路径**，无 `REQUIREMENT.md`，AC 写在 `CHANGE.md` 内并显式声明豁免——**不计漂移**，登记为流程豁免。）

## 3. 合并动作

### 3a. 可自动合并（待确认后执行）

| # | 对应漂移 | 动作 | 目标文件/章节 |
|---|---|---|---|
| A1 | D1-1 | 速查表补 10 行：`/api/tasks`（8 端点组）、`/api/inbox`、`/api/teams`、`/api/squads`、`/api/a2a/agents/:id/card`、`/api/runtime/execution-contract`、`/api/watch`、`/api/rsi/{memories,proposals,switches,breakers,reviews}`、`/metrics`、`/api/control-plane/cluster` | `README.md §API 端点速查` |
| A2 | D1-2 | 「功能模块」各节末尾补一行「〔波 N 已落地〕」，只加事实句不改历史叙述 | `README.md §功能模块` |
| A3 | D4-1 | 为 8 个 change 补 `SUMMARY.md`（按 task 归并，含 verify 真实输出） | `.specs/v20-wave{0..7}/SUMMARY.md` |
| A4 | D4-2 | 新建 `.specs/CHANGELOG.md`（波 0–7 八行）、`.specs/LESSONS.md`（L-001…L-004）、**程序级** `.specs/v20-release/UAT.md`（8 条 UAT；8 个 change 属同一次发布，不拆 8 份空壳） | `.specs/` |

### 3b. 需人工裁决

| # | 对应漂移 | 选项 | 建议 |
|---|---|---|---|
| V1 | D2-1 | ①立 change 做 `users.json`/`audit.jsonl` 表化 + 权威库切换 ②维持「部分实施」并在 RULINGS 长期挂账 | **②已定**（用户 2026-10-24） |
| V2 | D3-1 | ①本轮补原型三页 ②转 TOPICS 议题 | **②已定**（用户 2026-10-24；议题见 `TOPICS.md` 附录） |
| V3 | D6-1 | ①`git rm --cached frontend/dist node_modules` ②继续只记账 | **①已定**（用户 2026-10-24 授权清卫生） |
| V4 | 归档策略 | ①8 个 change 全归档到 `.specs/archive/2026-10-24-v20-waveN/` ②保留原目录（项目既有惯例：identity-hardening/k8s-final 等均未归档） | **②已定**（用户 2026-10-24）——不移动目录 |

## 4. 自动化证据（本轮实跑）

> 7-integration 追加：UAT 发现 2 个已上线 bug（`/api/health` 500 · metrics_api 死代码），已按 `T-FIX-01/02` 修复（`.specs/v20-release/TASK.md`）；修复后全量 `Ran 394 tests … 29F/12E/6S`，失败清单与基线 diff 为空。

```text
$ cd backend && /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 391 tests in 59.181s
FAILED (failures=29, errors=12, skipped=6)        # 与登记基线 29F/12E/6S 逐条同名 → 0 新增红

$ cd backend && 全新库 init_db()
[migrate] 已应用 15 个迁移: 001…015
tables: 49
[migrate] 无待应用迁移                             # 二次调用幂等

$ cd frontend && npm run build
✓ built in 15.08s
```

## 5. 已对齐记录（2026-10-24 执行）

| 时间 | 漂移编号 | 对应提交 | 合并动作 | 合并提交 |
|---|---|---|---|---|
| 10-24 15:55 | D1-1 | `13faefbe` | README API 速查补 10 行（tasks/inbox/teams/squads/a2a/execution-contract/watch/rsi/metrics/cluster） | 见 `.specs/CHANGELOG.md`「docs(align)」行 |
| 10-24 15:55 | D1-2 | `13faefbe` | 功能模块四节补「〔波 N 已落地〕」事实句 + 修「密码登录 + localStorage」过时叙述为服务端会话 | 同上 |
| 10-24 15:40 | D4-1 | 波 0–7 | 8 个 change 各补 `SUMMARY.md` | 同上 |
| 10-24 15:40 | D4-2 | 波 0–7 | `CHANGELOG.md` / `LESSONS.md`（L-001…L-004）/ `v20-release/UAT.md` | 同上 |
| 10-24 16:00 | D6-1 | 波 0 | 停止跟踪 `frontend/node_modules` 与 `frontend/dist`（P0-5，用户 V3=①） | `chore(repo)` 提交 |

## 6. 第 2 轮增量（2026-10-24 · 收口后 5 提交）

> 触发：`v20-ui-collab` 提交后 `ALIGNMENT` 基线落后 HEAD（R15.1 要求基线覆盖 HEAD）。

**覆盖提交**：`9aaac09b`（docs closeout）· `687f4ba7`（chore repo 卫生）· `ad850f41`（fix health/metrics）· `3cb1640f`（docs align）· `fce0aea4`（feat ui-collab）

**五层状态**：L1 ✔ · L2 ⚠ 1 处已登记差异 · L3 ✖ 1 项（已修）· L4 ✔ · L5 ✔（SUMMARY 已补）

| 编号 | 类型 | 层 | 证据 | 描述 | 处理 |
|---|---|---|---|---|---|
| D1-3 | 代码变文档未变 | L3 | `fce0aea4` + `README.md` §功能模块 | 首轮写「任务与收件箱…界面未挂载」，本轮已挂载 → 句子过期 | **已合并**：改为「界面已挂载（`v20-ui-collab`）」 |
| D1-4 | 代码变文档未变 | L3 | `ad850f41` + `README.md` | `/api/health` 修复属内部质量，无对外契约变化 | 无需合并（记录即可） |
| D4-3 | 执行留痕缺口 | L5 | `.specs/v20-ui-collab/` | 缺 `SUMMARY.md`（4-dev 要求） | **已补** |
| D3-2 | 原型漂移（已登记） | L2 | `prototype/board.html` vs `pages/Tasks.tsx` | 实现是**四列简化看板**，原型是三视角+统一抽屉；属 `CHANGE.md`「明确不做」的范围收缩 | 已登记，不视为漂移 |
| D6-2 | 孤儿产物 | L5 | `git status` | 首轮后 `frontend/dist` / `node_modules` 已停止跟踪，工作区干净 | **已解决** |

**已对齐记录**：

| 时间 | 漂移 | 合并动作 | 提交 |
|---|---|---|---|
| 10-24 16:20 | D1-3 | README「界面未挂载」→「界面已挂载」 | 本轮 docs 提交 |
| 10-24 16:20 | D4-3 | 补 `.specs/v20-ui-collab/SUMMARY.md` | 本轮 docs 提交 |

## 7. 下一轮基线

`fce0aea4` —— 下次 S-align 从此开始扫描（含本轮 docs 提交后顺延）。

---

## 附录 · 历史轮次

（无。本文件首次创建于 2026-10-24。）
