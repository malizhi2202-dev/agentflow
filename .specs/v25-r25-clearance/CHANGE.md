# CHANGE: R25 残项清账批（v25-r25-clearance）

- **Change ID**：`v25-r25-clearance`
- **创建日期**：2026-10-25
- **权威源**：`.specs/product-design/PRODUCT-DESIGN.html`（本批后 **v24**）+ `.specs/platform-evolution/RULINGS.md` §五点五·二（挂账源）→ **§五点五·三**（结案账）
- **代码基线**：`75d32a89`（v24-doc-refresh 收口）之上五笔
- **状态**：**收口**（五笔入库 + 真 MySQL 重放 + 台账回写；push 留用户定）

---

## Why

v24-doc-refresh 把「代码 ↔ 设计」的十条口径分歧（D1–D10）裁给「都做」并落了迁移 026–031；两路对账随后又发现 **R25-1…11** 挂账（`RULINGS.md` §五点五·二）——其中四条含**真分歧/待裁**（R25-3 预算帽、R25-5 HMAC、R25-7 全局总闸、批次范围），七条是纯残项（前端接线、治理消费、列形态族）。用户裁定进入下一批代码开发，四裁原文（AskUserQuestion）：

| 裁项 | 用户裁定 |
|---|---|
| 批次范围 | **全做 A+B+C**（A 前端接线 R25-1/4/6/8 · B 治理 R25-2/5/7 · C 列形态族 R25-11） |
| R25-5 webhook 签名 | **实装 HMAC-SHA256，token 双通道过渡** |
| R25-7 全局总闸 | **落表：全局一行总闸** |
| R25-3 预算帽生成器 | **表挂起，exec_ledgers 继续只建不写** |

探查实锤的两处口径也随批修正：R25-8「两头有、中间没有」（`trigger_agent_run` 无 WorkItem 关联、`POST /tasks/{id}/runs` 只是登记账）⇒ 升级为「前端确认层 + 后端 `run_from_assignment`」；R25-11 列形态族 ⇒ 「按主档判据逐项补，无需逐条裁定」。

## What（五笔）

| 笔 | 提交 | 内容 |
|---|---|---|
| ① shape | `bb54ea48` | **迁移 032–037**（全部 expand-only · DOWN 逐版登记）：032 `rsi_switches` global 行（存在性预检 + INSERT enabled=1）· 033 squad 形态族（`avatar_url`/`created_by` + MySQL 表级 FK `fk_squads_leader_agent` RESTRICT）· 034 队列七列（`trigger_comment_id`/`coalesced_comment_ids`/`handoff_note`/`fire_at` 可空 · `is_leader_task` · `squad_id`/`workflow_id` + 两索引，`to_dict` 透传）· 035 automations 三列（`concurrency_policy DEFAULT 'queue'`/`issue_title_template`/`created_by`）+ triggers `signing_secret` · 036 `mention_targets` 表 + 订阅泛化列（旧 UNIQUE **不删**）· 037 `im_bindings` 表（UNIQUE(workspace,external_user,external_tenant)+3 索引）；`CHANNEL_TYPES` 8 值（+wecom/self_hosted_im/lark，lark=feishu 同义）；两新表注册 `models/__init__` |
| ② governance | `92e62cc7` | **总闸短路**（`assert_category_running` 先查 global，off ⇒ 一切类目拒）+ **structure_rules 进门禁**（`assert_editable` 消费四结构列，判定链 path_pattern→exclusions→structure_rules（合取）→cap_bytes（仅有 content 时判）；写侧同词表校验；畸形 fail-closed；词表成文 RULINGS §五点五·三之一）+ **webhook HMAC 双通道**（`signing_secret` 密文落库/明文回显一次/rotate 同换；带 `X-Webhook-Signature` ⇒ HMAC-SHA256+compare_digest，不带 ⇒ legacy_token；投递账记因）+ 路由放行 `POST /api/rsi/switches/global` |
| ③ assign-run | `66913ab1` | `run_from_assignment`（人轨拒 · 小队走 leader 任务如实注 · **停车闸 backlog/未开始拒开跑** · `trigger_agent_run` · `record_run(status=queued, 触发源=指派)`）+ `POST /api/tasks/{id}/assign` 收 `start`（服务+路由**双入口**）；失败=「指派已入账，开跑被拒：…」 |
| ④ fe-wiring | `9531ed8b` | 前端四件：R25-1 记忆列（词表/表单三输入/筛选两 select/行三 chip 有值才渲）· R25-4 规则版本 v1…vN **只读 diff**（回滚未接入如实标）· R25-6 `GoldenSetsCard` + 影子重放选冻结集（platform_validated/self_declared 双口径）· R25-8 `AssignConfirm` 确认层（只做一份；parked 置灰、人轨不弹）+ 总闸真行读写（无真行如实「派生 · 」回退）+ 可改面四结构列画真值（诚实呈现翻案） |
| ⑤ docs | 本批 | RULINGS §五点五·二 结案指针 + **§五点五·三 结案表** + **§五点五·三之一 词表** · 主档 **v24**（chip/页脚链/§3.3 十一行注/§1.6 复测 65 表 · 38 版 · 33 模块/§6.30 与术语两处注）· INDEX §〇 v24 行 + §五 第 12 行 + §七 台账 · STATE 陈旧块全清（挂账→历史快照、待裁→0 条、四裁入册、下一步重写）· 本工件目录 |

## 明确不做

- **R25-3 预算帽生成器**（用户裁挂起，`exec_ledgers` 继续只建不写）· **019 撞号不改号**（R25-9，改号=已部署库重放）
- **破坏性 rename 与表重构**：squads/队列列名形态差保留（v23 已认账）；订阅旧 UNIQUE 不删（多行形态待表重建）
- **webhook token 退役**不本批裁（双通道是过渡态）
- 规则版本**回滚按钮**不做（后端只读账，无回滚端点）
- 无真实写入位点不造数：coalesce 投喂 / 提及收据 / IM 入站绑定 / `concurrency_policy` 消费——**表先行挂账**（同 exec_ledgers 模式）

## 门禁终值（详见 TEST.md）

后端 **774 OK（skipped=6）** · tsc **0** · vitest **25 文件 259/259** · build ✓ · `proto_parity --strict` **exit 0** · **真 MySQL pending=[] + 形状 9 项验收全过**（032–037 首跑即过=L-014 三纪律前移生效）。
