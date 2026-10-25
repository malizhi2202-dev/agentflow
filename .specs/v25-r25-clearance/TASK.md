# TASK — v25-r25-clearance 任务账（五笔 · 全部完成）

> 纪律：迁移 expand-only + DOWN 登记（`test_migrations_discipline` 自动扫 up 区禁词 / 两遍幂等 / 登记清单）；服务层+路由**双入口**校验；规则加在**状态转换层**；动 schema 必在**权威方言 MySQL** 实跑（L-014）。

## ① `bb54ea48` feat(v25-shape) — 迁移 032–037 + 模型 ✅

- [x] 032 `m032_rsi_global_switch`：存在性预检 + INSERT global 行（方言占位符）
- [x] 033 `m034`… squad 形态族：`avatar_url`/`created_by`（DEFAULT ''）+ MySQL 表级 `add_fk_if_missing(fk_squads_leader_agent, RESTRICT)`；DOWN 先摘约束
- [x] 034 `m034_queue_shape`：七列 + 两索引（TEXT 列全可空——MySQL TEXT 无 DEFAULT，L-014）；`to_dict` 透传（coalesced JSON 解析）
- [x] 035 `m035_automation_shape`：`concurrency_policy DEFAULT 'queue'` / `issue_title_template` / `created_by` / triggers `signing_secret`
- [x] 036 `m036_collab_receipts`：`mention_targets` 表（`comment_id` 普通可空列——**无评论实体表不造引用目标**；`route_kind` 五值词表 `MENTION_ROUTE_KINDS`）+ 订阅 `subject_type`/`subscriber_type`（**旧 UNIQUE 不删**）
- [x] 037 `m037_im_bindings`：表 + UNIQUE(workspace,external_user,external_tenant) + 3 索引 + `IM_BINDING_STATUSES`
- [x] 模型/词表：`teams.py`/`scheduler_queue.py`/`automation.py`/`collab.py`/`im_binding.py`(新)/`channel_config.py`（8 值）/`models/__init__.py`；`channel_api.py` lark=feishu 双名归一
- [x] 测试：`test_v25_shape.py` 12 例（global 行一次 · PRAGMA 列在 · ORM FK RESTRICT inspect · dflt_value `'queue'` · UNIQUE 生效 · to_dict 透传）；`test_runtime_and_rollback.py` 改 `test_rollback_roundtrip_top_two`（target 动态）+ DOWN 清单扩至 037；`test_agent_channel_supplement.py` UT-35 len 5→8
- 坑（已绕）：自测断言瞬态 ORM 属性 ⇒ 改断 PRAGMA `dflt_value`（default= 是**客户端默认**，裸 SQL 带不上——L-014 第二形状）

## ② `92e62cc7` feat(v25-governance) — 总闸 + structure_rules + HMAC ✅

- [x] `rsi_service`：`SWITCH_GLOBAL="global"`；`assert_category_running` 先查总闸（off→GateError）；`switches()` global 领衔（缺行合成开）；`set_switch` 放行 global；`_pattern_matches`/`_rule_matches`/`_validate_structure_rules`（词表=RULINGS §五点五·三之一）；`assert_editable(db, surface_name, target, content=None)` 四结构列消费
- [x] `rsi_api`：category 校验放行 global（非类目非 global→400）
- [x] `automation_service`：`_new_webhook_token()` 四件套（token/hashed/masked/signing_plain）；webhook 分支密文落 `signing_secret`；rotate 同换；`reveal_webhook_secrets`；`ingest_webhook` 认证闸（键解析后、413 前）——带签名验签、不带回落、未配却带 ⇒ `signature_unconfigured`
- [x] `automations_api`：`_secret_payload` 附 `signing_secret` + `signature_note`（add/rotate 两路）
- [x] 测试：`test_v25_governance.py` 20 例（总闸短路×类目 · 缺行=开 · 原因必填 · switches 领衔 · fnmatch/三型规则/合取/exclusions 压制/cap 仅有 content/畸形写拒读拒 · HMAC 回显一次 · 密文落库 · valid 202 auth=hmac · invalid 401 记因 · 无头 legacy_token · 未配带签 401 · rotate 旧 URL 404 · api 型无签名）；`test_rsi_governance.py` 断言改 `[global, *categories]`
- 坑（已绕）：HMAC 门首版会打断存量 token 用例 ⇒ 按裁定文案改「不带签名回落 legacy_token」——**实现服从裁定文字**，不服从第一直觉

## ③ `66913ab1` feat(v25-assign-run) — 指派开跑 ✅

- [x] `collab_service.run_from_assignment`：非 agent 轨 ValueError（人轨无 run；小队走 leader 任务如实注）；停车闸（`STATUS_CATEGORY=="unstarted"`）拒；`trigger_agent_run(..., db=db)`；`record_run(status="queued", summary="指派开跑（触发源=指派 · actor=…）")`
- [x] `tasks_api` assign：`start` 缺省=只登记直接返回；kind≠agent→400；停车闸→400；开跑失败→400「指派已入账，开跑被拒：…」；成功 `{ok,task,run}`（服务+路由双入口）
- [x] 测试 `test_v25_assign_run.py` 9 例（服务 6 + 路由 3）
- 坑（已绕）：夹具「已指派但未改状态」逻辑写反致 1 红 ⇒ 夹具无条件置状态

## ④ `9531ed8b` feat(v25-fe-wiring) — 前端四件 ✅

- [x] R25-1：`stores/rsi.ts` 词表 + Memory 四字段 + fetchMemories query 透传；`Memory.tsx` WriteForm 三输入（置信 0–1 校验）+ 筛选两 select + 行三 chip（有值才渲）
- [x] R25-4：`stores/automations.ts` `ruleVersions`/`ruleVersionsError`（失败**不污染主 error**）；`Automations.tsx` 节②末 v1…vN + `diffSpecs` 两版对比 + 「回滚未接入」chip
- [x] R25-6：`stores/rsi.ts` goldenSets 三动作；新组件 `control/GoldenSetsCard.tsx` 挂 `AgentControlPlane`；`Memory.tsx` 影子重放选已冻结集→`golden_set_id`（自报勾选禁用），不选保 self_declared
- [x] R25-8：`AssigneePicker` 拆出 `AssignConfirm`（三按钮 · parked 灰置 + title · 人轨不弹）；`NewTaskForm`（parked 恒真）/`TaskCard`（`parked=backlog|todo`）复用；`stores/collab.ts` assign 透传 start
- [x] R25-7 前端：`stores/controlPlane.ts` `setRsiMaster` 有 global 行单发真端点、无则逐类目回退；`RsiSwitchesCard` 总闸真行 + 「—（未配置）」诚实口径 + SurfaceSpec 画真值
- [x] 测试：`memory-page`（+5 顶层例）· `board-variants`（确认层三例改造 + 三新例）· `control-plane-cards`（global 单发/派生回退/真值断言 + `not.toContain('该字段后端未提供')`）· `automations-nine-sections`（RuleVersions 夹具）
- 坑（已绕）：等价编辑吃掉闭合 `});` 两次（memory-page 嵌套 / control-plane 回退用例）⇒ tsc 语法门抓出 + brace-balance 复核；`getByText('rule')` 撞筛选 option 文本 ⇒ 测试改按 chip `title` 选路

## ⑤ docs 批 — 台账回写 ✅（本笔）

- [x] RULINGS：§五点五·二 结案指针 · §五点五·三 结案表 · §五点五·三之一 词表
- [x] 主档 v24：chip · 页脚链 v24 条 · §3.3 十一行注（1306/1307/1310/1311/1312/1313/1314/1316/1319/1320/1322/1323）· §1.6 两行复测 · §3.3 导语 · §6.30 金标句 · §8 指派确认术语行 · 3889 automations 页坦白句
- [x] INDEX：最新版/谱系 v24 行/§一/§二/§五 第 12 行/§七 三行
- [x] STATE：会话四字段 · 事件表 v25 行 · 进行中（两 change 收口）· 挂账表转历史快照 · 四裁入册 · 待裁 0 条 · 下一步重写 · 环境事实终值（65 表/38 版/774/259）
- [x] 工件目录本四件（CHANGE/RULINGS/TASK/TEST/REVIEW）
