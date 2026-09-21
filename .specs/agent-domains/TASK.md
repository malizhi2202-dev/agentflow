# agent-domains — 任务拆解

> 对应 REQUIREMENT.md v1.0
> 分支: agent-domains

## 任务列表

### T1: Domain 数据模型
- 创建 `backend/models/domain.py`
- 字段: id, name, owner_id, created_at
- 在 `backend/models/__init__.py` 注册
- 状态: [ ] 

### T2: Agent 模型扩展
- 在 `backend/models/agent.py` 添加 `domain_id` 字段
- 在 `to_dict()` 中输出 domain_id
- 更新 `backend/routes/agents_api.py`：PUT 支持 domain_id 更新
- 数据库迁移：`ALTER TABLE agents ADD COLUMN domain_id INTEGER REFERENCES domains(id)`
- 状态: [ ]

### T3: Domain API
- 创建 `backend/routes/domain_api.py`
- GET /api/domains — 列出所有域（普通用户只看到自己的，admin 看到全部）
- POST /api/domains — 创建域
- PUT /api/domains/{id} — 更新域
- DELETE /api/domains/{id} — 删除域（Agent 的 domain_id 置 NULL）
- 在 `backend/main.py` 注册路由
- 状态: [ ]

### T4: Agent 域过滤增强
- 修改 `backend/routes/agents_api.py` 的 GET /api/agents 支持 `domain_id` 查询参数
- domain_id=0 表示查询无域 Agent（domain_id IS NULL）
- 状态: [ ]

### T5: 默认域自动创建
- 修改 `backend/main.py` 的 lifespan 启动函数
- 在 `init_db()` 后检查默认域是否存在，不存在则创建
- 默认域: name='默认域', owner_id='admin'
- 状态: [ ]

### T6: 前端 Domain Store
- 创建 `frontend/src/stores/domains.ts`（Zustand）
- fetchDomains, createDomain, updateDomain, deleteDomain
- 状态: [ ]

### T7: 控制面板域视图
- 修改 `frontend/src/pages/AgentControlPlane.tsx`
- 将 Agent 列表改为域手风琴视图
- 顶部：域列表 + 创建/删除域按钮
- 点击域展开 Agent 列表
- 无域 Agent 显示在"默认域"下
- 确保 key props 唯一: `domain-{id}`, `agent-{id}`
- 状态: [ ]

### T8: 后端测试
- 验证域 CRUD 工作正常
- 验证 Agent 域过滤
- 验证域删除后 Agent 回归默认域
- 状态: [ ]

### T9: 前端测试
- 验证域树渲染
- 验证点击展开/折叠
- 验证 Agent 按域过滤显示
- 状态: [ ]

### T10: 跨模块验证
- 验证现有端点仍然工作
- 验证 TypeScript 编译无新增错误
- 状态: [ ]
