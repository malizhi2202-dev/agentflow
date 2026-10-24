# CHANGE · v20-wave0 —— 波 0 止血：恢复可用生产构建

> 来源：`PRODUCT-DESIGN.html` §1.6.0「升级波次」波 0（P0-4 构建修复）· 用户 2026-10-24 指令「按照最新的设计文档实现代码」
> 路由：**压缩路径**（0→3→4→6）。规模 < 150 行、单会话，按 code-kit §1.2 规模速判在 `CHANGE.md` 内写「最小需求/AC」与「最小设计/触碰模块」，显式声明豁免完整 REQUIREMENT/DESIGN 两件。
> 前置：裁定⑧（开发冻结）由用户 10-24「实现代码吧」解除；`backend/` `frontend/` 自本 change 起可改。

## 一、为什么是波 0 而不是先做团队/小队

设计档自己定的顺序（§1.6.0）：**波 0 不修，后面全是空中楼阁**——`npm run build` 必然失败意味着本仓**没有可用的生产构建**，任何新功能都无法验证「是否真的能交付」。波 1 身份三连、波 3 协作层、波 4 团队/小队都排在其后。

## 二、最小需求与验收（替代 REQUIREMENT.md）

| # | 需求 | 验收（可执行） |
|---|---|---|
| AC-1 | `npm run build`（`tsc && vite build`）**通过** | 命令退出码 0；`npx tsc --noEmit \| grep -c "error TS"` = **0** |
| AC-2 | 修法**只收口类型与空值**，不改运行时行为 | diff 不含业务逻辑改写；既有测试全绿 |
| AC-3 | 不新增依赖、不改 `tsconfig` 严格档 | `package.json` 依赖清单不变；`strict: true` 保留 |
| AC-4 | 发现的存量缺陷**登记不修**（越界则另立 task） | `TASK.md` 有 T-03 记录，含 file:line 证据 |

## 三、最小设计与触碰模块（替代 DESIGN.md）

**根因分类（32 个错误）**，逐类对症、不做「一刀切 `as any`」：

| 类 | 数量 | 根因 | 修法 |
|---|---|---|---|
| A. 前端类型落后于后端模型 | 18 | `stores/projects.ts` 缺 `orchestration_id`；`stores/agents.ts` 缺 `workflow_ids / role_def / system_prompt / sop`（后端 `project.py:19`、`agent.py:24` 已有/UI 已在用） | **补可选字段**，让类型与真实契约一致 |
| B. 闭包内失去空值收窄 | 6 | `deleteId && <ConfirmDialog onConfirm={() => deleteTool(deleteId)}>`、`setTimeout(() => onCreated(wf.id))`、`FileReader.onload` 里用 `f.name` | 闭包内**重新收窄**或**提前取常量**（`const id = ...`） |
| C. 测试用 `global`（无 `@types/node`） | 6 | `global.fetch = ...` | 改 `globalThis`（零新依赖） |
| D. 测试消息字面量未标注类型 | 4 | `role: string` 宽于 `Message['role']` 联合 | 从 `ChatWindow` 导出 `Message`，测试数组显式标注 |
| E. 嵌套可选导致的二次解引用 | 5 | `metrics?.model_totals && Object.keys(metrics.model_totals)` | 组件体内 `const modelTotals = metrics?.model_totals ?? {}` 收口 |

**触碰模块**（严格清单，越界即回滚）：
- `frontend/src/stores/projects.ts`（+1 行）
- `frontend/src/stores/agents.ts`（+1 行）
- `frontend/src/components/ChatWindow.tsx`（`interface` → `export interface`）
- `frontend/src/pages/ProjectDetail.tsx`（收窄与常量提取）
- `frontend/src/pages/ProjectManager.tsx`（随类型自愈，可能 0 改动）
- `frontend/src/pages/ToolMarket.tsx`、`WorkflowCreate.tsx`、`AgentBuilder.tsx`（闭包收窄）
- `frontend/src/__tests__/{ChatWindow,ChannelConfig,ConversationCenter,chat-store,frontend-edge-cases}.*`（`globalThis` + 类型标注）

**不做**：不改 `tsconfig`、不加 `@types/node`、不加 `as any`、不动 `backend/`、不动 UI 文案与交互。

## 四、豁免声明（压缩路径）

- 豁免 `REQUIREMENT.md` / `DESIGN.md` 独立成文：内容已在本节 §二/§三。
- 6-review 只交**功能轮 + 回归登记**（构建 + 测试双绿），不做 UI 轮（无 UI 变更）。
