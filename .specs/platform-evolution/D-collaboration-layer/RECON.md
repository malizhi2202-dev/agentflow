# ② 竞品侦察

> 共享证据底座：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`
> 本节只摘与「协作层」直接相关的部分。

## 1. Multica（主参照，Go + PostgreSQL + 本地守护进程）

**已上线能力**（`README.zh.md`「组一支队伍 / 把活交出去 / 看得见，也管得住」）：

| 能力 | 原文要点 |
|---|---|
| 工作项 + 负责人 | 「像挑同事一样挑个智能体当负责人」——**负责人可以是人或 Agent** |
| 小队 Squad | 「人和智能体混编成队，leader 决定谁来接活」 |
| 收件箱 Inbox | 「只在智能体需要你拍板时提醒你，而不是每一步都来烦你」 |
| 执行日志 | 「每次工具调用、命令和报错都带时间戳，**可以完整回放**」 |
| Token 用量 | 「每次运行花了多少，按智能体、按任务都看得到」 |
| 人来验收 | 「活先进入审核中，不直接进 main。上不上线你说了算」 |
| Skills | 「解决过一次的问题沉淀下来，全团队的智能体都能复用」 |
| 历史关联 | 「从最初的想法，到中间的每一次执行、每一个决定，再到最后的 diff，**全都挂在同一个任务下**」 |

**四类状态生命周期**（`docs/issue-status-lifecycle-rollout.md`）：

| 存储类别 | 内置固定状态 |
|---|---|
| `unstarted` | `backlog`, `todo` |
| `started` | `in_progress`, `in_review`, `blocked` |
| `done` | `done` |
| `closed` | `cancelled` |

原文两条硬规矩（**可直接照搬**）：
- 「**A status's label does not grant behavior**」——状态标签不授予行为
- 「**Merely entering a custom Started status is not an instruction to start, finish or fail an agent**」
- 「This is not a workflow engine」

**归档语义**：自定义状态只有在所有引用它的工作项（含已完成/已取消）迁走后才能归档；
否则返回 **409 + `code: issue_status_in_use` + `issue_count`**。

**⚠️ 已核实的一处实现缺口（反面教材）**：
「`done` 保留给人」**只写在注入给 Agent 的指令里**（`daemon/execenv/runtime_config_sections.go:786`），
其 `handler/` 与 `service/` 中**没有任何校验**阻止 Agent actor 直接把工作项置为 `done`。
全部 `"done"` 出现点属四类：触发过滤、父子屏障、GitHub 同步回写、枚举/分组。
→ 产品承诺（「You decide what ships」）与实现之间存在缺口，**全靠 Agent 守约**。

## 2. 控制面赛道：协作层是不是空白？

| 项目 | 有 Team/工作项对象吗 | 证据 |
|---|---|---|
| **kagent** | **没有** | 其 API reference 关键词计数：`Team` 0 · `Graph` 0 · `Workflow` 0 · `Queue` 0 · `Quota` 0 · `Lease` 0（`Namespace` 27、`Route` 4） |
| **Google AX** | 无公开证据 | 四原语为 `Task`/`Workspace`/`Gateway`/`Model`；`Task` 是执行任务，非团队工作项 |
| **agent-sandbox** | 无 | 只有 Sandbox 系列 CRD |
| **Claude Code Agent Teams** | **实验特性** | 「experimental and disabled by default」，需 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`；v2.1.178 起 `TeamCreate`/`TeamDelete` 已被移除 |
| **Cline Agent Teams** | 有，但**无配额/隔离域/审计** | — |

**结论**：**「Team 作为一等对象 + 团队级配额与审计」是完全空白的组合**（路线图 W-2）。

## 3. 行业主流形态（用来校准，别照抄错的）

- **多 Agent 的真实主流是「星型委派 + 只回摘要」，不是团队**：
  Amp 官方原文「they **can't communicate with each other**, you **can't guide them mid-task**」；
  OpenHands 子 Agent **同步阻塞**、只回 `TaskObservation`；Codex spawn → wait all → consolidated。
  官方对 Subagents 与 Agent Teams 的对比原文值得记住：
  「Subagents report results back to the main agent. **In agent teams, teammates share a task list, claim work, and communicate directly with each other.**」
- **并发节流是普遍短板**：只有 Amp 明确数量化（「burst of **20** metered orbs… **one new orb every five minutes**… **wait instead of failing**」）
  与 Roo Code Cloud Pro（「Unlocks concurrent agent execution and priority queueing」）；
  GitHub Copilot cloud agent **没有任何公开并发上限**，只有 59 分钟硬上限 + 单分支 + 单 PR + 单仓库。

## 4. 可借鉴清单

| # | 借鉴点 | 证据 | 对 AgentFlow 的落点 |
|---|---|---|---|
| 1 | 负责人可以是**人或 Agent**，用类型字段区分 | Multica assignee 模型 | `work_items.assignee_type` ∈ {user, agent} |
| 2 | 四类状态 + 内置锁定 + 自定义可扩展 | `issue-status-lifecycle-rollout.md` | 直接采用四类；内置不可改名/删 |
| 3 | **状态不授予行为** | 同上原文 | 状态列与触发表**分列** |
| 4 | 归档前检查引用计数，占用则 409 | 同上 | 归档接口按同一把锁计数 |
| 5 | Inbox 只在需拍板时通知 | README.zh.md | 与现有「告警中心」分工：告警=系统异常，收件箱=人决策 |
| 6 | 执行日志可完整回放、按工作项聚合 | README.zh.md | 现有 `trace_spans` 按会话，需补按工作项视图 |
| 7 | 交付物 = 计划/文档/改动/测试结果/**未解决问题** | VISION.zh.md | 验收界面必须呈现「未解决问题」，不能只有「已完成」 |
| 8 | Skills：解决过的问题沉淀为团队可复用资产 | README.zh.md | 已有角色市场/模板市场，缺「从一次解决中沉淀」的回路 |
