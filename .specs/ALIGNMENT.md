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

## 7. 第 3 轮增量（2026-10-24 · 团队与小隊页）

> 触发：首个**按 GO.md 走完整链**的 change（`v20-ui-teams`）落地。

**覆盖提交**：`5ed535b5`（feat ui-teams）+ 本轮 docs 提交

| 编号 | 类型 | 层 | 证据 | 描述 | 处理 |
|---|---|---|---|---|---|
| D1-5 | 代码变文档未变 | L3 | `5ed535b5` + `README.md` §功能模块 | 「团队与小隊」上线前只写"已落地"未写界面入口 | **已合并**：补侧栏入口与四项能力 |
| D4-4 | 执行留痕缺口（已改善） | L5 | `.specs/v20-ui-teams/` | 本 change 补齐了 REQUIREMENT / DESIGN / UI-DESIGN / T01–T04-SUMMARY / TEST / REVIEW / UAT + 四道门票 | **已闭环**（单 change 维度） |
| D4-5 | 执行留痕缺口（历史债） | L5 | `.specs/v20-wave0…7`、`v20-ui-collab` | 这 9 个 change 仍无 REQUIREMENT / DESIGN / UI-DESIGN / 门禁记录（当时走压缩路径） | **不动历史**：不伪造补档；作为流程债登记，后续新 change 一律走完整链 |
| D3-3 | 原型漂移（已登记） | L2 | `prototype/teams.html` vs `pages/Teams.tsx` | 原型是双 tab + 组织八区；实现是双 tab + 列表/抽屉（组织八区未做） | 已登记（CHANGE「范围排除」） |
| D5-1 | 需求失配（无） | L3 | `REQUIREMENT.md` AC-2 | AC 写"列表显示我的角色"，实现后发现后端不返回该字段 → **回写 AC-2**（角色移入抽屉） | 已按"改需求不改后端"处理，避免顺手扩契约 |

**已对齐记录**：

| 时间 | 漂移 | 合并动作 | 提交 |
|---|---|---|---|
| 10-24 17:10 | D1-5 | README 团队与小隊节补界面入口与能力 | 本轮 docs 提交 |
| 10-24 17:10 | D4-4 | 单 change 维度产物补齐（SUMMARY×4 + 门票） | `5ed535b5` |

## 8. 第 4 轮增量（2026-10-24 · 小队授权补漏）

**覆盖提交**：`f55e53c7`（fix squad-authz）+ 本轮 docs 提交

| 编号 | 类型 | 层 | 证据 | 描述 | 处理 |
|---|---|---|---|---|---|
| D1-6 | 代码变文档未变 | L3 | `f55e53c7` + `README.md` §API 速查 | `/api/squads` 行为变了（写需 creator/admin），速查表未写 | **已合并**：该行补「写操作限 creator 或平台管理员（403）」 |
| D4-6 | 执行留痕 | L5 | `.specs/v20-squad-authz/` | 新 change 产物齐（CHANGE/REQUIREMENT/DESIGN/TASK/SUMMARY×3/TEST/REVIEW + G1/G2/Task/G3/测试/G4 门票） | **已闭环** |
| D5-2 | 需求失配（修复型） | L3 | `v20-ui-teams/REVIEW.md` 遗留 #4 | 指出的权限缺口本轮修掉；UI-teams 的 REVIEW 已加指针 | 已处理（不改历史正文，只加指针） |

> 流程债（历史 9 个 change 缺 REQUIREMENT/DESIGN/门票）状态不变：**不伪造补档**，后续新 change 走完整链。

**已对齐记录**：

| 时间 | 漂移 | 合并动作 | 提交 |
|---|---|---|---|
| 10-24 17:40 | D1-6 | README `/api/squads` 行补授权口径 | 本轮 docs 提交 |
| 10-24 17:40 | D5-2 | `v20-ui-teams/REVIEW.md` 遗留 #4 标注"已在 v20-squad-authz 修" | 本轮 docs 提交 |

## 9. 第 5 轮增量（2026-10-24 · 记忆中心与提案抽屉）

**覆盖提交**：`8c3f1906`（feat ui-rsi）+ 本轮 docs 提交

| 编号 | 类型 | 层 | 证据 | 描述 | 处理 |
|---|---|---|---|---|---|
| D1-7 | 代码变文档未变 | L3 | `8c3f1906` + `README.md` §RSI 产物治理 | 治理面上线，README 仍只写后端 | **已合并**：标题补「界面已挂载 `v20-ui-rsi`」 |
| D4-7 | 执行留痕 | L5 | `.specs/v20-ui-rsi/` | 产物齐（CHANGE/REQUIREMENT/DESIGN/UI-DESIGN/TASK/SUMMARY×4/TEST/REVIEW + G1/需求/G2/G2a/Task/G3/测试/G4） | **已闭环** |
| D4-8 | 执行留痕 | L5 | `v20-ui-rsi/REVIEW.md` | 实现中抓到 2 个自造 bug（surfaces 未拉取 / setResult 覆盖）并留回归用例 | 已记录 |

> 流程债：历史 9 个 change 仍缺 REQUIREMENT/DESIGN/门票（不伪造），后续新 change 继续走完整链。

**已对齐记录**：

| 时间 | 漂移 | 合并动作 | 提交 |
|---|---|---|---|
| 10-24 18:20 | D1-7 | README RSI 节标题补界面挂载 | 本轮 docs 提交 |

## 10. 第 6 轮增量（2026-10-24 · 后端遗留三项 + 遗留小项 + E2E 留证）

**覆盖提交**：`cc14e6f8`（E2E 留证）· `7d698e18`（residual）· 本轮 `v20-ui-polish` 提交

| 编号 | 类型 | 层 | 证据 | 处理 |
|---|---|---|---|---|
| D1-8 | 代码变文档未变 | L3 | `7d698e18` | README API 速查尚无域策略/runner/L0 端点 → **已合并**（补三行） |
| D4-9 | 执行留痕 | L5 | `.specs/v20-residual/`、`v20-ui-polish/` | 两 change 产物齐（含 SUMMARY/TEST/REVIEW + 门票） |
| D6-3 | 孤儿/噪声 | L5 | `git status` | 构建产物已 ignore，工作区干净 |

**已对齐记录**：
| 时间 | 漂移 | 动作 | 提交 |
|---|---|---|---|
| 10-24 18:50 | D1-8 | README 补域策略 / shadow run / l0 extract 三行 | 本轮 docs |

## 11. 第 7 轮增量（2026-10-24 · S24 原型三缺口）

**覆盖**：`prototype/{audit,control-plane,chat}.html`（3 处挂载缺口）+ TOPICS/STATE

| 编号 | 类型 | 层 | 证据 | 处理 |
|---|---|---|---|---|
| D3-4 | 原型漂移（已闭合） | L2 | `grep -c team_id control-plane.html`：修复前 0 → 修复后 4；`pp-team` 弹层 2 处；`同刻合并 2 条` 2 处 | **已闭合**（S24 实施） |
| D3-5 | 原型漂移 | L2 | `audit.html` 团队筛选 | 已闭合（筛选条 + 弹层 + NULL 项） |

## 12. 第 8 轮增量（2026-10-24 · RSI 适配器）

**覆盖提交**：`06ea9150`（feat rsi-adapters）+ 本轮 docs

| 编号 | 类型 | 层 | 证据 | 处理 |
|---|---|---|---|---|
| D1-9 | 代码变文档未变 | L3 | `06ea9150` + `README.md §配置` | 新增 5 个 env（judge 四件 + L0 两件） | **已合并**：配置表补 3 行（judge 合并一行） |
| D4-10 | 执行留痕 | L5 | `.specs/v20-rsi-adapters/` | 产物齐（CHANGE/REQUIREMENT/DESIGN/TASK/TEST/REVIEW + 门票） | 已闭环 |

## 13. 下一轮基线

`v20-ui-polish` 提交（见 `git log`）—— 下次 S-align 从此开始扫描。

---

## 附录 · 历史轮次

（无。本文件首次创建于 2026-10-24。）
