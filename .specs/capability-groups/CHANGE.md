# capability-groups — CHANGE.md

> 版本: 1.0
> 状态: active
> 创建: 2026-07-06
> 基于: agent-domains (completed)

## 变更概述

在 agent-domains 基础上，引入 **能力分组（Capability Groups）**：在域卡片内部，按 Agent 的 capabilities 自动分组展示 Agent 实例。

### 变更类型

- [x] 后端 API 增强（capability 过滤 + 域内能力列表端点）
- [x] 前端 UI 增强（DomainTreeTab 三层树形结构）
- [x] 无新增数据库表（虚拟分组）
- [x] 向后兼容

### 变更范围

| 模块 | 文件 | 变更 |
|------|------|------|
| backend | `routes/agents_api.py` | 新增 `capability` 查询参数过滤 |
| backend | `routes/domain_api.py` | 新增 `GET /api/domains/{id}/capabilities` |
| frontend | `pages/AgentControlPlane.tsx` | DomainAccordionRow 重构为三层树 |
| test | `.specs/capability-groups/test_backend.py` | 后端集成测试 |
| test | `.specs/capability-groups/TEST.md` | 测试报告 |

### 设计原则

1. **虚拟分组**: 不新建数据库表，分组完全从 `agents.model_config_json.capabilities` 字段派生
2. **多层归属**: 一个 Agent 拥有多个 capability（如 `["code-review","python"]`），会同时出现在多个能力组中
3. **自动派生**: capability 组名直接从 Agent 数据中提取，无需配置
4. **向后兼容**: 现有 API 全部保持不变，仅新增参数和端点
