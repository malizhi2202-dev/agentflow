# ② 竞品侦察

> 共享证据底座：`.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`
> 本议题是**唯一的品类独占**：67 个被调研仓库中，**无任何一个**做「工作流知识产物监控」。

## 1. 空白确认：知识产物监控无人做

调研结论（§4 空白与机会）：**「工作流知识产物监控」在 67 个仓库中无一涉及**。
最接近的几类都不是同一件事：

| 项目 | 它做的是什么 | 为什么不是同一件事 |
|---|---|---|
| **Spec Kit**（GitHub） | 规格驱动开发的**模板与命令**（`/specify` `/plan` `/tasks`） | 是流程脚手架，**不监控产物进度**，无阶段状态模型 |
| **OpenSpec** | 规格变更的**目录约定** | 是约定，不是可观测的进度模型 |
| **BMAD Method** | 多角色 Agent 的**流程编排**（PM/架构师/开发/QA） | 编排角色，不聚合产物状态 |
| **Kiro** | 规格 → 任务的**转换** | 转换一次，不持续监控 |
| **Claude Code / Codex 的 `/plan`** | 生成计划文档 | 生成即结束，无阶段推进状态 |

**结论**：这是 AgentFlow **唯一的品类独占能力**（护城河③）。
本议题的目标不是「弱化阶段模型」，而是**让它可配置**——把独占能力从「写死的实现」升级为「可配置的产品」。

## 2. 「配置化 vs 硬编码」的行业纪律

### 2.1 扩展点的权威位置（Multica）
Multica 的 `pkg/plugincontract/manifest.go` 把 surface / trigger / transport / resource /
config 类型 / scope 全闭集**定义在 Go 常量**里：
- surface `:43-47`（`issue_panel`/`sidebar_panel`/`modal`）
- trigger `:52-58`（`ui`/`manual`/`agent`/`event`/`schedule`）
- transport `:69-72`（`http`/`mcp`）
- resource `:75-77`（只有 `skill`）
- scope 全闭集 `:91-106`

**而 DB 侧的 CHECK 约束随迁移被删**（`migrations/285:57` 的
`plugin_contribution.type CHECK (type IN ('agent.skill.v1'))` 及 `319:8-10` 的扩展，
随 `344_plugin_v2_reset` 删除）。

→ **启示**：枚举的权威应在**一处常量或配置**，而不是散落在 DB 约束、多个模块与前端里。
AgentFlow 的阶段枚举今天散落在 13 个文件——正是这条纪律的反面。

### 2.2 前端必须显式声明与后端对齐（Multica）
`packages/core/agents/mcp-support.ts:8-31` 列了 21 个 provider，注释原文：
> 「The MCP config tab is hidden for every other provider so **a user can't save a value the runtime will silently ignore**. **Keep this list in sync with the backends in `server/pkg/agent/`**」

→ 对 AgentFlow：前端 6 处阶段引用应当**从接口读**（而非各自硬编码），
或至少在一处集中定义并**注释声明是后端配置的镜像**。

### 2.3 配置化后必须有的配套（Multica 的插件配置经验）
- **`DisallowUnknownFields` + 拒绝尾随 JSON**（`manifest.go:356-387`）：
  让拼写错误不能静默削弱配置。
- **`pruneConfig`**：升级时删除新配置已无的字段，避免孤儿残留。
- **发布前预检并一次性列出全部缺失项**（`capabilities.go:70-100`）：
  「Anything a manifest declares that is not listed here **fails installation loudly** —
  a silently ignored contribution would look installed and never fire」。

→ 对 AgentFlow：`workflow.json` 若有无法识别的阶段字段，**应当报错而不是静默忽略**。
今天的 `_load_workflow` 是否校验？**未见校验逻辑**——这是一个具体缺口。

### 2.4 状态判定的安全性（Multica）
`internal/issuestatus/issuestatus.go:374-397` `Effective()` 的 fail-safe：
**不可解析就原样返回**，永不被误当成「该清扫/该触发」。
`dispatch/reason.go` 的枚举安全同源：**无法判断时不得推断出更危险的那一侧**。

→ 对 AgentFlow：`_detect_phase` 今天的行为是「最后一个命中者胜出」。
若阶段配置损坏或产物文件命名异常，**不应静默推断出一个阶段**——应保持上一状态或标记为未知。

## 3. 「两份副本」问题的行业对照

Multica 有一条直接对应的教训（`handler/squad.go:1176-1186`，MUL-3375）：
> **旧 handler-local 镜像已被删除以防四入口漂移**（原文要点）

即 Multica 也曾因同一逻辑存在多个镜像而产生漂移风险，**处理方式是删除镜像、收敛到单点**。
→ 对 AgentFlow：`backend/scanner.py` 与 `backend/runtime/scanner.py` 的双份阶段表
**必须收敛为一份**，这与 Multica 的处理完全一致。

## 4. 可借鉴清单

| # | 借鉴点 | 证据 | 对 AgentFlow 的落点 |
|---|---|---|---|
| 1 | 枚举权威集中在一处（常量/配置），不放 DB CHECK | Multica `manifest.go:43-106` | 阶段表单一权威 |
| 2 | 前端枚举显式声明与后端对齐 | `mcp-support.ts:8-31` 注释 | 前端 6 处改为读接口 |
| 3 | 配置解析拒绝未知字段 + 拒绝尾随 JSON | `manifest.go:356-387` | `workflow.json` 加校验 |
| 4 | 升级时 prune 已废弃配置字段 | Multica `pruneConfig` | 配置版本迁移 |
| 5 | 预检失败要「响亮失败」并一次列全 | `capabilities.go:70-100` | 阶段配置非法即报错 |
| 6 | 不可解析就原样返回，不推断危险侧 | `issuestatus.Effective()` | `_detect_phase` 的未知态处理 |
| 7 | **删除镜像、收敛单点**（防多入口漂移） | `squad.go:1176-1186` MUL-3375 | 合并两份 scanner |
