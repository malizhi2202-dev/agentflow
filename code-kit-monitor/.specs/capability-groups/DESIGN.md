# capability-groups — 设计文档

> 版本: 1.0
> 状态: draft
> 创建: 2026-07-06

## 架构概览

```
┌─────────────────────────────────────────────────┐
│                  DomainTreeTab                   │
│  ┌───────────────────────────────────────────┐  │
│  │  🏠 默认域  ──────── 5 个 Agent           │  │
│  │  ┌─ 📦 code-review  (2 healthy / 3)  ▸   │  │
│  │  │  ├─ Agent A: running  gpt-4            │  │
│  │  │  └─ Agent B: standby  gpt-4            │  │
│  │  ├─ 📦 python  (1 healthy / 2)  ▸        │  │
│  │  │  ├─ Agent A: running  gpt-4            │  │  ← Agent A 同时出现
│  │  │  └─ Agent C: dead  claude-3           │  │
│  │  └─ 📦 未分类  (1 healthy / 1)  ▸        │  │
│  │     └─ Agent D: running  gpt-3.5         │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  🔵 生产域  ──────── 3 个 Agent           │  │
│  │  ┌─ 📦 code-review  (2/2)  ▸             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 数据模型

### 无新增表 — 虚拟分组

分组完全从 `agents.model_config_json` 派生：

```json
{
  "capabilities": ["code-review", "python"],
  "temperature": 0.7
}
```

### 分组逻辑

```
agents[]
  → 按 domain_id 分组 → 域
    → 按 model_config_json.capabilities 展开 → capability 组
      → 组内 Agent 列表
```

一个 Agent 有多个 capabilities → 出现在多个组中。

## API 设计

### 增强: GET /api/agents

新增查询参数 `capability`:

```
GET /api/agents?capability=code-review
GET /api/agents?domain_id=1&capability=python
```

后端实现：JSON_CONTAINS 或 Python 端过滤

### 新增: GET /api/domains/{id}/capabilities

```
GET /api/domains/1/capabilities
→ {
    "domain_id": 1,
    "capabilities": ["code-review", "python", "frontend"]
  }
```

从该域内所有 Agent 的 `model_config_json.capabilities` 中提取去重。

## 前端组件结构

```
DomainTreeTab
  ├─ DomainCard ("默认域")
  │   ├─ CapabilityGroupRow ("code-review")
  │   │   └─ AgentRow[]
  │   └─ CapabilityGroupRow ("未分类")
  └─ DomainCard (自定义域)
      └─ CapabilityGroupRow[]
```

### 展开状态

三层展开状态：
- `expandedDomains: Set<string>` — 域级展开（已有）
- `expandedGroups: Set<string>` — 能力组展开 — key 格式 `"{domainKey}:{capability}"`

## 健康状态定义

Agent `status` 字段：
- `running` → healthy
- `standby` → healthy  
- `dead` / `error` → unhealthy
- 其他 → unhealthy

健康概要：N healthy / M total
