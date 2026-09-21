# capability-groups — 需求文档

> 版本: 1.0
> 状态: draft
> 创建: 2026-07-06

## 概述

在 agent-domains 基础上，为隔离域视图增加 **能力分组（Capability Groups）** 中间层。Agent 按其 `model_config_json.capabilities` 自动分组，在域卡片展开后以能力组为单位组织 Agent 列表。

## 用户故事

1. **作为管理员**，我希望在域视图中看到 Agent 按能力自动分组（如 code-review、python、frontend），而非扁平列表。
2. **作为管理员**，我希望每个能力组显示健康概要（N healthy / M total），快速了解该能力组的状态。
3. **作为管理员**，我希望展开/折叠能力组查看其下的 Agent 实例列表。
4. **作为开发者**，我希望通过 API 按 capability 过滤 Agent（如 `?capability=code-review`），以便外部集成。

## 功能需求

### FR1: Agent 按 capability 过滤
- `GET /api/agents?capability=code-review` 返回 `model_config_json.capabilities` 包含该 capability 的 Agent
- 可与已有 `domain_id` 参数组合使用

### FR2: 域内能力列表
- `GET /api/domains/{id}/capabilities` 返回该域内所有 Agent 去重后的 capability 列表
- 返回格式：`{"domain_id": 1, "capabilities": ["code-review", "python", "frontend"]}`

### FR3: 三层域树视图
- Level 1: 域卡片（DomainCard / DomainAccordionRow）— 已存在
- Level 2: capability 组 — 自动从 Agent 数据派生
- Level 3: Agent 实例列表

### FR4: 能力组展示
- 能力组名称（如"code-review"）
- Agent 数量统计
- 健康概要：N healthy / M total
- 展开/折叠箭头

### FR5: 无能力 Agent
- 没有 capabilities 的 Agent 归入 "未分类" 组
- 没有域归属的 agent 归入 "默认域"

## 非功能需求

### NFR1: 零新增 TypeScript 错误
- 所有前端变更不引入编译错误

### NFR2: 向后兼容
- 现有 API 端点不受影响
- 现有 UI 功能保持正常

### NFR3: 虚拟分组
- 不创建新数据库表
- 分组完全从 `agents.model_config_json.capabilities` 派生
