# D-S16-team-entity — S16 · Team 组织实体（第 5 轮）

> 〔口径注 2026-10-23 · v20 归并〕本包为**历史评审记录**（成文早于 v20）；现行有效口径以 `platform-evolution/RULINGS.md` 与 `product-design/PRODUCT-DESIGN.html` **v20** 为准——与本文冲突处让位 RULINGS，**原文不改写**（历史保留纪律）。

> 审核: **通过·追认（第 5 轮议题，2026-10-23 收口）** · 用户原话：「现在有team/小队的概念了」（对照 09-23 开题原话「没有 team 的概念」；Team⟂Squad 已按小队轮 multica 方案落地 v14，与 R2 冲突处以 2026-10-23 修订行为准）
> 状态：①②③④ 已落盘，⑤ 已过审（2026-10-23 追认）。未过审前禁止进 ROADMAP、禁止立项引用（R16.3/R16.7）。

## 一句话议题

**「Team」要先裁定成一个词还是两个词，若作组织实体，它到底"管哪些资源、哪些实体"，以及 16 张表上那个单值 `owner_id` 怎么长进多成员模型而不推翻现有 Domain / Project / User 三层语义。**

## 拆解依据（R16.4 事实底座）

| 类型 | 事实 | 出处 |
|---|---|---|
| 用户原话① | 「agent 要有 team 的概念的」 | 第 5 轮申报原话，`.specs/platform-evolution/TOPICS.md`「第 5 轮申报（2026-09-23）」表 S16 行 |
| 用户原话② | 「team 可以管理由哪些资源 或者哪些实体」 | 同上 |
| 代码 | 全仓 `team` 零命中（后端+前端 `grep -rin 'team' backend/ frontend/src/` = 0 行），只存在于 `.specs/` 提案文本 | 本轮实测 2026-09-23 |
| 代码 | `Domain` 是 4 字段壳（id/name/owner_id/created_at），无成员、无配额、无策略列 | `backend/models/domain.py:8-14` |
| 代码 | 归属靠单值字符串列 `owner_id: String(64)`，出现在 16 张表上（agent/domain/project/orchestration_instances/orchestration_templates/tool/workflow/knowledge_source/knowledge_tag/agent_memory/channel_config/conversation/human_approval/scheduled_task/metrics×2/role_custom） | `backend/models/*.py`（`grep -rn 'owner_id' backend/models/`），26 表清单见 `backend/models/__init__.py:9-33` |
| 代码 | 平台**已有**一个"半个 Team"：用户记录带 `project_ids`（人对项目的可见范围白名单，admin 空值=全看）——它是当前唯一的跨用户授权机制，但挂在人身上、存在 `users.json` 文件里 | `backend/auth.py:104-118`、`backend/auth.py:243-245`、`backend/config.py:40,64`、`backend/routes/admin_api.py:198` |
| 代码 | 过滤模式是每份路由各写一遍的 `_filter_owner`（非 admin 只看 `owner_id == 自己`） | `backend/routes/domain_api.py:19-22`；同类 10 个路由文件 |
| 代码 | 「团队」的另一义（多 Agent 协作）**已有实体**：编排实例持有 `agent_ids` 成员清单 + token 配额 + 失败策略 | `backend/models/orchestration.py:14,22,24-25,28` |
| 既有事实 | 「Domain 不是安全边界（4 字段壳）」+ 认证 fail-open（`X-User-Id` 自述、缺身份回退 admin） | `CLAUDE.md` 现状表；`backend/main.py:196-199`（仅 localhost 闸门）；`backend/auth.py:181-186` |
| 既有裁定 | 裁定⑦：可计量追踪数据（含用户表）权威库 = MySQL，`users.json` 将表化退役 → Team 成员表按 MySQL + 真外键书写；裁定⑧：开发冻结，本轮零代码改动 | `CLAUDE.md` 现状表 |
| 前轮已审结论 | 「Team 作为一等对象 + 团队级配额与审计」在控制面赛道是空白组合，登记为路线图 W-2；S1-C5 曾裁定"团队级对象（Squad）需先有 work_items，不在第 1 轮做" | `D-collaboration-layer/RECON.md:54`、`D-collaboration-layer/CONCLUSION.md` C5、`ROADMAP.md:116` |
| 前轮已审结论 | `owner_id` 全平台只有一处语义=归属/租户，与「负责人」是两个概念；`human_approvals.task_id` 无 FK 无约束是反面教材 | `D-collaboration-layer-2/RECON.md` §① |

## 调研问题（先做语义辨析，两种 Team 都要覆盖）

**(a) 组织团队 = 协作与资产归属单元**
1. 管哪些资源：Agents / 知识源 / 工具 / 工作流 / 编排实例与模板 / 角色人设 / 渠道 / 定时任务 / 会话 / 凭据（模型 Key）/ 成本配额？哪些必须进、哪些不该进？
2. 与 `Domain`（运行时隔离与路由调度域）、`Project`（一次工作）、RBAC `User`（`users.json` 里的 role/permissions）——正交还是重合？谁吞谁、谁改职责？
3. 单值 `owner_id` → 多成员的迁移路径：新列、连接表、还是多态归属？如何与裁定⑦的 MySQL 用户表关联（外键、不双写文件态）？
4. 团队级配额 / 审批 / 可见性继承的最小闭环是什么， enforcement 落在哪一层（内存态限流在多副本会各自为政——S4 已审事实）。

**(b) 执行协作组 = 多 Agent 编排团队（supervisor / swarm / crew / group chat）**
5. 与 `OrchestrationInstance` + YAML↔画布是什么关系？它是新实体、是实例上的一个字段、还是模板属性？
6. 是否与组织团队复用同一个词「Team」？竞品怎么命名、混用踩过什么坑。

## 成员文件（R16.8）

`TOPIC.md`（本文件）· `BRAINSTORM.md`（①）· `RECON.md`（②竞品，含联网验证状态声明）· `CONCLUSION.md`（③结论+预演失败打磨）· `PANEL.md`（④GD 议题门）· `REVIEW.md`（⑤人审门占位，待主会话呈审）

**硬约束回执**：本包全程只读扫描 `backend/ frontend/ .specs/`，零代码改动、零冻结解除；写入仅限本目录。
