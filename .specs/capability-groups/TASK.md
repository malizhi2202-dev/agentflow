# capability-groups — 任务拆解

> 对应 REQUIREMENT.md v1.0

## 任务列表

### T1: 后端 — Agent capability 过滤
- 修改 `backend/routes/agents_api.py` 的 `api_list_agents`
- 新增 `capability` 查询参数
- 过滤逻辑：检查 `model_config_json.capabilities` JSON 数组是否包含指定 capability
- 可与 `domain_id` / `status` 组合使用
- 状态: [ ]

### T2: 后端 — 域内能力列表端点
- 修改 `backend/routes/domain_api.py`
- 新增 `GET /api/domains/{id}/capabilities`
- 查询该域内所有 Agent，提取 `model_config_json.capabilities`，去重返回
- 状态: [ ]

### T3: 前端 — capability 组组件
- 新增 `CapabilityGroupRow` 组件
- Props: domainKey, capability, agents[], isExpanded, onToggle
- 显示：组名、Agent 数量、健康概要 (N healthy / M total)、展开/折叠箭头
- 展开后显示 Agent 实例列表（复用现有表格样式）
- 状态: [ ]

### T4: 前端 — DomainTreeTab 三层树
- 修改 `DomainTreeTab` 组件
- 新增 `expandedGroups` state（Set<string>）
- 域展开后：按 Agent 的 capabilities 自动分组
- 无 capabilities 的 Agent → "未分类" 组
- 每个能力组用 `CapabilityGroupRow` 渲染
- 状态: [ ]

### T5: 后端测试
- 创建 `.specs/capability-groups/test_backend.py`
- 测试 capability 过滤
- 测试 capabilities 端点
- 测试跨模块兼容性
- 状态: [ ]

### T6: 前端测试
- 浏览器验证三层树展开
- 验证能力组渲染
- 验证健康概要计算
- 验证零 JS 错误
- 状态: [ ]

### T7: 跨模块验证 + TEST.md
- 验证现有端点仍然工作
- 验证 TypeScript 编译无新增错误
- 编写 TEST.md
- 状态: [ ]
