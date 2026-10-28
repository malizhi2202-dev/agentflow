# DESIGN: AgentFlow UI 重构与导航交互统一

- **Change ID**: v27-ui-rework
- **关联**: `.specs/v27-ui-rework/CHANGE.md`、`.specs/v27-ui-rework/REQUIREMENT.md`、`.specs/CONTEXT.md`
- **作者**: AI（Architect）+ 人工 review

---

## 0. 技术栈选定

- **选定**：沿用现有 React SPA 栈
- **前端**：React 18 + TypeScript 5.5 + Vite 5.4
- **状态**：沿用 Zustand 4.5；不新增状态管理库
- **样式**：沿用现有 CSS tokens / 语义类 / 页面样式；逐步把视觉规则收敛到 `frontend/src/styles/`
- **图标**：沿用 `lucide-react`
- **后端 / 数据库 / 部署**：本 change 不触碰
- **关键依赖**：React、TypeScript、Vite、Zustand、lucide-react（均已存在）
- **理由**：需求是既有 SPA 的导航协调和视觉层级重构，现有栈已满足 AC；引入新框架只增加迁移面和回归风险。
- **明确排除**：React Router 等新路由框架（v1 不重设计 URL/history）；新的 UI 组件库（现有语义组件和 CSS tokens 足够）。

---

## 0.5 既有架构对齐

### 0.5.1 本次 change 触碰的既有模块

```text
触碰模块（实际存在）：
- frontend/src/App.tsx（全局导航、详情态优先级和页面渲染入口）
- frontend/src/styles/tokens.css（全局颜色、间距、字号、动效 token）
- frontend/src/styles/ui.css（壳层、面板、表格、工具栏等语义样式）
- frontend/src/components/ui/*（现有壳层语义组件）
- frontend/src/pages/AgentBuilder.tsx、ProjectManager.tsx、Automations.tsx、Tasks.tsx、OrchestrationListPage.tsx（首批页面）
- frontend/src/pages/AgentDetail.tsx、ProjectDetail.tsx、OrchestrationPage.tsx、WorkflowDetail.tsx（首批详情/编辑入口）
- frontend/src/__tests__/*（现有页面、导航和状态回归）

新增模块：
- `frontend/src/components/ui/PageHeader.tsx`（五类首批页面复用的标题区）
- `frontend/src/__tests__/v27-ui-rework.test.tsx`（本 change 的跨页面结构 / 无障碍回归；若现有测试可承载则不新建）

禁动清单：
- backend/**、backend/migrations.py、数据库 schema、API 路由与服务
- frontend/src/stores/**（除非测试证明导航协调无法在壳层完成，并先重新登记范围）
- frontend/src/components/agent-config/**（Agent 配置分区逻辑保持不变，只允许由壳层提供视觉容器）
- .specs/product-design/**、prototype/**（本批不改产品原型口径）
```

### 0.5.2 既有抽象沿用对照表

| 本次需要 | 既有有没有？ | 决定 |
|---|---|---|
| 全局导航 | `App.tsx` 中现有 `NAV_GROUPS`、`navigate`、`renderContent` | 沿用并收敛详情态清理，不另造路由层 |
| 视觉 token | `frontend/src/styles/tokens.css` | 沿用文件，重写为极简 token 契约 |
| 语义壳层 | `AppTopBar`、`.app-top`、`.app-body`、`.panel`、`.toolbar` | 沿用并扩展层级规则 |
| 图标 | `lucide-react` | 沿用 |
| 测试 | Vitest + Testing Library | 沿用 |
| 异步数据 | 各页面现有 fetch / store | 沿用，不新增网络层 |
| toast / 状态反馈 | 先 grep 现有通知模式，优先复用；若首批无统一模式，新增最小无依赖状态区域而非引库 | 任务阶段以实际 grep 结果为准 |

### 0.5.3 沿用模式 vs 引入新模式

- 导航协调：沿用 `App.tsx` 的壳层状态模型，改为一个明确的“切换入口先清理覆盖态”边界；不引入新路由框架。
- 页面结构：沿用现有页面组件，通过统一标题区 / 工具栏 / 主工作区 / 辅助区语义类收敛，不复制业务逻辑。
- 视觉层级：沿用 CSS token 和现有语义类，先改 token 与共享样式，再迁移首批页面。
- 异步与权限：沿用现有请求和服务端权限链；不在客户端新增安全判断。

---

## 1. 决策清单

| # | 决策 | 备选 | 选择理由 | 取舍代价 |
|---|---|---|---|---|
| D1 | 先修壳层导航协调，再迁移页面视觉 | 逐页独立修补 | 根因在 `App.tsx` 多详情态优先级；先修可避免页面继续错位 | 首批视觉迁移需等待壳层回归 |
| D2 | 以 token + 语义布局类作为视觉事实源 | 每页继续内联样式 | 仓库已有 `tokens.css` / `ui.css`，复用成本最低 | 遗留内联样式需渐进清理 |
| D3 | 页面采用“标题上下文 → 摘要/状态 → 主动作 → 主工作区 → 辅助区” | 继续面板顺序堆叠 | 直接对应 AC-05，能让用户先理解目标再操作 | 个别高密度页面需要重新编排内容 |
| D4 | 五类入口先做垂直切片 | 一次重做全站 | 符合 R19，减少范围和回归面 | 低频页面暂时保持旧层级 |
| D5 | 状态反馈沿用现有请求生命周期并补最小可读状态区 | 引入全局数据层 / toast 库 | 不增加依赖，保持页面数据语义 | 需要逐页确认请求状态 |

R19 停点：已有抽象和已装依赖足够，本 change 不新增运行时依赖；没有设计“以后可能用到”的扩展点。

## 2. 数据流 / 架构图

```text
左侧一级入口点击
        │
        v
App 壳层导航协调
  ├─ 设置目标 nav
  ├─ 清理不属于目标入口的详情 / 编辑 / 创建覆盖态
  └─ 保留既有 URL 初始化语义，不新增 URL/history 写入
        │
        v
目标页面
  ├─ 页面标题 + 上下文
  ├─ 摘要 / 状态
  ├─ 主要动作
  ├─ 主工作区
  └─ 辅助信息
        │
        v
现有页面请求 / store / 服务端授权链
```

边界：不改变 backend、API、数据库、权限和 URL/history 协议；不把客户端导航状态当作授权依据。

## 3. 关键状态机

```text
列表
 ├─ open detail → 详情
 ├─ open create → 创建 / 编辑
 └─ select another nav → 目标列表 + 清理旧覆盖态

详情
 ├─ edit → 编辑
 ├─ back → 列表
 └─ select another nav → 目标列表 + 清理详情态

编辑
 ├─ cancel → 详情
 ├─ save success → 该资源详情
 ├─ save error → 编辑（保留输入 + 错误 + 重试）
 └─ select another nav → 目标列表 + 清理编辑态
```

## 4. ADR 索引

- 无新的不可逆架构决策；v1 不改变路由协议、公共 API、数据模型或状态管理基础。

## 5. 风险

| # | 风险 | 影响 | 概率 | 缓解 |
|---|---|---|---|---|
| R1 | 详情态分散在多个 `useState`，清理遗漏 | 左侧切换仍显示旧页面 | 高 | 先写导航回归，覆盖 10 条正反切换并检查旧内容不可见 |
| R2 | token 改动影响大量旧页面 | 非首批页面视觉回归 | 中 | 先保留语义变量兼容，逐项跑全量 Vitest / build，再做人工走查 |
| R3 | 页面重编排误改业务请求或表单行为 | 功能回归 | 中 | 业务子组件接口尽量不动；diff 边界和现有测试双重检查 |
| R4 | 状态反馈仅做视觉而缺少读屏语义 | 无障碍退步 | 中 | 使用可读状态区域、键盘走查和测试断言，不以截图替代验证 |
| R5 | 五类页面首批过大导致交付拖延 | 视觉和导航均未收口 | 中 | 波次按壳层 → token → 五类页面垂直切片，低频页面明确不纳入 |

## 6. 不在范围

- URL 参数、浏览器 history、深链协议的统一重设计（v2）。
- 未列入首批的低频页面全面迁移。
- 后端 API、数据库、权限规则、状态机和业务能力变更。
- 新增 UI 框架、状态库、图标库、远程字体。

## 9. 架构沉淀建议

本 change 无架构层面沉淀建议；如果最终形成跨页面复用的语义布局组件，由后续 `A-evolve` 单独评估是否写入项目上下文。
