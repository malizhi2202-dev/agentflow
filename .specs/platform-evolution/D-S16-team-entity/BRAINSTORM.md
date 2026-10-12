# ① 头脑风暴 · S16 Team 组织实体（第 5 轮）

技法三条并用：**类比迁移**（K8s namespace / RBAC / ResourceQuota = 我们的自述隐喻）、**SCAMPER**（对现有 4 张实体表做合并/改造/另作他用）、**假设反转**（把「必须有 Team」与「Team 必须是大表」都翻一遍）。产出 14 个候选，每条标注回应的调研问题（a1-a4 / b5-b6）与事实锚。

## 候选清单

| # | 候选方向 | 技法 | 回应 | 一句话理由 |
|---|---|---|---|---|
| K1 | **Team = 新的顶层归属容器**，`Domain`/`Project` 都挂到 Team 之下（Team→Namespace 类比） | 类比迁移 | a1 a2 | 用户原话「team 可以管理由哪些资源或者哪些实体」最直白的读法；K8s 正是「teams 用不同 namespace」 |
| K2 | **Team = 纯配额/成本边界**，只管 token 与费用，不管资产归属（ResourceQuota 单独类比） | 类比迁移 | a1 a4 | 现状配额已在 Agent 与编排实例两级（`agent.py:25-26`、`orchestration.py:24-25`），缺的正是团队汇总 |
| K3 | **Team = 人的编队（RBAC 容器）**，资产一律不改归属，只加「哪些人能看哪些资源」的授权层 | SCAMPER-另作他用 | a2 a3 | 类比 GitHub org→team→repo：Team 是**授权对象**不是资产父容器；改动面最小 |
| K4 | **Team 吞掉 Domain**：Domain 现为 4 字段壳、不是安全边界，直接改名为 Team 加成员表，避免第三层容器 | SCAMPER-合并 | a2 | 否决过「域=安全边界」的定位（`CLAUDE.md` 既有事实），Team 若也是壳则两壳叠加更糊 |
| K5 | **Team 只管运行、不管所有权**：Team=Agent 运行时分组，与"谁拥有资源"正交 | 假设反转 | a2 b5 | 把「Team 管资源」的假设反转，看执行协作组语义是否已足够；对应 AutoGen/CrewAI 的 team 全部是运行期概念 |
| K6 | **Project 升格为 Team 的容器**：Project 已有 `visibility` + 三 FK，Team 只作 Project 的成员扩展 | SCAMPER-改造 | a1 a3 | 代码里 Project 才是「有资源装配关系的那个壳」（`project.py:17-19,21`），Team 可能只是它的复数 |
| K7 | **不建 Team，建"成员表 + 归属多态"**：`resource_acls(user_id, resource_type, resource_id, role)`，Team 只是其中一种 principal 类型 | 假设反转 | a3 | 最小可组合形态，与裁定⑦（用户表 MySQL 化）天然对齐；风险是「team 管哪些资源」在界面上不可见 |
| K8 | **两个 Team 分词**：组织团队叫 Team，执行协作组叫 Crew/Squad（不共用词） | 类比迁移（命名语义） | a1 b6 | 竞品里 AutoGen/MetaGPT/Claude Code 的 team 全是执行期；GitHub/Dify/Langfuse 的 team/org 是组织期——同词双义是既有混乱源 |
| K9 | **Team 作 Agent 的装配根**：一个 Agent 必属一个 Team，Team 决定可用模型/工具/知识默认集（"继承"类比 Dify workspace 默认模型） | SCAMPER-改造 | a1 | 直接回答用户「agent 要有 team 的概念」，且 `api_key_encrypted` 挂在单 Agent 上（`agent.py:21`）本就是成本失控的根源 |
| K10 | **Team = 席位/商业单位**（Coze 企业版席位、Dify 计划人数上限类比） | 类比迁移 | a1 | 商业化视角：Team 是计费与开通单位，资源归属只是副产物；对单机自托管平台是否成立需质疑 |
| K11 | **Team 先做虚拟视图，不做实体**：由 `owner_id` 反查 + 用户组标签生成「团队」列表页 | 假设反转 | a3 | 检验「必须建表」的必要性；若够用则省掉迁移，但答不了「team 管哪些资源」 |
| K12 | **Team = 审批与闸门主体**：现有 `human_approvals` + 三处安全闸门把「审批人」从个人升级为团队角色 | SCAMPER-另作他用 | a1 a4 | 与已审结论「必须人批的动作加在状态转换层」同构（`CLAUDE.md` 约定条） |
| K13 | **Team 作为知识产物 `.specs/` 的读写边界**：change 归属团队，团队决定谁能改哪层文档 | 类比迁移 | a1 | 知识产物是一等数据（`CLAUDE.md` 约定），但今天任何人改任何 change 无门禁 |
| K14 | **Team = 多租户安全边界（补齐 Domain 的未竟语义）**：Team 进 SQL 谓词、进凭据作用域，成为真正的 tenant | SCAMPER-改造 | a2 a3 | 直面 fail-open 现实；但身份修复（P0-1）未解冻前是空中楼阁，需要排程依赖 |

## 收敛前的三条张力（留给 ②③ 裁决）

1. **「管资源」vs「管人」**：K1/K9/K14（Team 拥有资源）与 K3/K7（Team 只是授权主体）互斥——同一个词只能选一种主语。
2. **第三层容器 vs 替换既有壳**：K4/K6 消灭一层，K1 增加一层；我们已经有 `Domain`（4 字段壳）+ `Project`（装配壳）+ `OrchestrationInstance`（运行壳），再加第四个壳的成本必须在结论里显式计价。
3. **一词双义**：K5/K8 决定 b 类语义的处置，直接影响前端文案与画布（编排）是否要改名。

## 未采纳即弃（记录否决线索）

- 「Team = 组织架构树（部门/汇报线）」：无任何代码事实与用户原话支撑，六帽中「白帽」缺据，不列为候选。
