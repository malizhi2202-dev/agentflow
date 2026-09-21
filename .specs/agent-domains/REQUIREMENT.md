# agent-domains — 需求文档

> 版本: 1.0
> 状态: draft
> 创建: 2026-07-06

## 概述

为 Agent 控制面板增加 **隔离域（Domain）** 功能，允许用户将 Agent 按域（如：开发域、测试域、生产域）分组管理。每个域内 Agent 独立可见，域之间互相隔离。

## 用户故事

1. **作为管理员**，我希望创建隔离域（如"生产域"、"开发域"），将不同环境的 Agent 分组管理。
2. **作为管理员**，我希望在控制面板中按域查看 Agent，而非单一的扁平列表。
3. **作为管理员**，我希望删除域时，域内的 Agent 不会被删除，而是自动回归默认域。
4. **作为普通用户**，我只能看到自己拥有的域和域内的 Agent（继承现有 owner 权限模型）。

## 功能需求

### FR1: 域 CRUD
- 创建域：name（必填）、owner_id（默认当前用户）
- 列出所有域
- 更新域名
- 删除域：将域内所有 Agent 的 domain_id 置为 NULL（回归默认域）

### FR2: Agent 归属域
- Agent 表新增 `domain_id` 字段（可为 NULL）
- GET /api/agents?domain_id=X 按域过滤
- Agent 创建/更新时支持指定 domain_id

### FR3: 默认域
- 系统启动时自动创建"默认域"（name='默认域', owner='admin'）
- 所有 domain_id=NULL 的 Agent 视为属于默认域

### FR4: 控制面板域视图
- 顶部显示域卡片/手风琴列表
- 点击域展开显示该域内的 Agent 列表
- 无域 Agent 显示在"默认域"下
- 支持创建/删除域的内联 UI

## 非功能需求

### NFR1: 向后兼容
- 现有 Agent（domain_id=NULL）自动归属默认域
- 现有 API 端点不受影响

### NFR2: 权限
- 域归属于 owner（创建者）
- 管理员可管理所有域
- 删除域时检查 ownership

### NFR3: 数据完整性
- Agent 的 domain_id 外键引用 domains(id)
- 删除域时 Agent 的 domain_id 置 NULL（SET NULL），不级联删除

## 数据模型

### domains 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PK | 主键 |
| name | VARCHAR(128) | 域名称 |
| owner_id | VARCHAR(64) | 所有者 |
| created_at | DATETIME | 创建时间 |

### agents 表变更
- 新增 `domain_id INTEGER REFERENCES domains(id) ON DELETE SET NULL`

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/domains | 列出所有域 |
| POST | /api/domains | 创建域 |
| PUT | /api/domains/{id} | 更新域 |
| DELETE | /api/domains/{id} | 删除域（Agent 回归默认域） |
| GET | /api/agents?domain_id=X | 按域过滤 Agent（已有端点增强） |

## 验收条件

- [ ] 域 CRUD API 正常工作
- [ ] Agent 可按域过滤
- [ ] 删除域后 Agent 回归默认域
- [ ] 控制面板显示域手风琴视图
- [ ] 现有 API 端点不受影响
- [ ] TypeScript 无新增编译错误
