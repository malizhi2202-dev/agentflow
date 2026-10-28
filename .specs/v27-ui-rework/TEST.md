# TEST — v27 UI 重构与导航交互统一

- **Change ID**: `v27-ui-rework`
- **日期**: 2026-10-27

## 本次测试范围声明

| 轮次 | 状态 | 范围 | 跳过理由 |
|---|---|---|---|
| 第 1 轮 · 功能 | ✅ 必跑 | 页面回归、导航、详情/编辑、状态与无障碍测试 | — |
| 第 2 轮 · 性能 | ⚠️ 部分 | 生产构建产物大小记录 | REQUIREMENT 未给出 LCP/CLS/INP 预算，未运行 Lighthouse 基线 |
| 第 3 轮 · 安全 | ⚠️ 部分 | 生产依赖 audit、常见凭据模式扫描 | SAST/OWASP 端到端需后端与专用工具；audit 有既有依赖告警 |
| 第 4 轮 · 兼容 | ⚠️ 部分 | parity 严格检查、E2E 前置检查 | 后端不可用，无法执行 Playwright 多浏览器/多视口 |
| 第 5 轮 · 可观测 | ❌ 跳过 | — | 本 change 只改前端呈现与导航，不新增日志、指标、告警或健康检查契约 |

## 第 1 轮 · 功能

### 自动化结果

```text
cd frontend && npm test
Test Files  27 passed (27)
Tests       278 passed (278)
Duration    25.96s
```

重点新增/修复回归：

| 范围 | 命令 | 结果 |
|---|---|---|
| PageHeader / ConfirmDialog / Escape / Tab | `npx vitest run src/__tests__/v27-ui-rework.test.tsx` | 3/3 passed |
| 导航清理与标题责任 | `npx vitest run src/__tests__/nav-groups.test.tsx` | 34/34 passed |
| Agent 详情/创建 | `npx vitest run src/__tests__/agent-detail-tabs.test.tsx src/__tests__/agent-config-sections.test.tsx` | 16/16 passed |
| 项目/协作 | `npx vitest run src/__tests__/collab-pages.test.tsx src/__tests__/frontend-edge-cases.test.tsx` | 26/26 passed |
| 自动化 | `npx vitest run src/__tests__/automations-nine-sections.test.tsx src/__tests__/automations-runtimes-replay.test.tsx` | 24/24 passed |
| 任务看板 | `npx vitest run src/__tests__/board-variants.test.tsx` | 11/11 passed |
| 编排 | `npx vitest run src/__tests__/ui-parity-pages.test.tsx src/__tests__/ui-parity-pages2.test.tsx` | 17/17 passed |

### AC 映射

| AC | 证据 | 状态 |
|---|---|---|
| AC-01 | `nav-groups.test.tsx` 10 条跨入口路径 | ✅ |
| AC-02 | Agent/项目/自动化/任务/编排定向回归 | ✅ |
| AC-03 | `nav-groups.test.tsx` 切换后旧覆盖态不可见 | ✅ |
| AC-04 | 现有路径/页面初始化测试；浏览器深链未完成 | ⚠️ 自动化部分 |
| AC-05 | PageHeader、PageHeader 页面回归、全量构建 | ✅ |
| AC-06～AC-09 | 各页面 loading/empty/error/success 定向 fixture | ✅ |
| AC-10 | 本 change 未改服务端授权；前端未授权 API 专项由 E2E/后端回归承担 | ⚠️ 未完成端到端 |
| AC-11 | `v27-ui-rework.test.tsx`、已有 tab 键盘测试、reduced-motion 样式 | ✅ 自动化部分 |
| AC-12 | 各页面写操作保存/失败反馈定向测试 | ✅ |

### 测试质量自检（T1–T6）

- T1 测试可读性：✅ 用例名按场景描述，新增测试断言外部行为。
- T2 脆弱性：✅ 避免断言内部 state；导航测试断言用户可见 heading/active/覆盖态。
- T3 重复：⚠️ 既有 nav 页面族用例存在重复渲染，但属于历史回归矩阵，本批未扩大。
- T4 Mock：⚠️ 页面单测使用 fetch fixture；真实端到端另走 `npm run e2e`。
- T5 覆盖幻觉：✅ 新增测试均有可观察断言；没有只断言“不抛错”。
- T6 架构错配：✅ 组件键盘行为用 jsdom 单测；浏览器级行为不以单测冒充。

## 第 2 轮 · 性能

生产构建：

```text
npm run typecheck && npm run build
✓ 3049 modules transformed.
index-CBJyFnX2.js  2,031.29 kB │ gzip: 601.55 kB
index-DJsTaUAT.css 58.11 kB │ gzip: 20.72 kB
✓ built in 15.67s
```

- ✅ typecheck 通过。
- ⚠️ Vite 提示主 chunk 超过 500 kB；这是已有 SPA 单包结构，本 change 未引入新的依赖或拆包策略。
- ⚠️ 未运行 Lighthouse：需求未提供性能预算，且当前 E2E 后端不可用。

## 第 3 轮 · 安全

```text
npm audit --omit=dev --audit-level=high
5 vulnerabilities (4 moderate, 1 high)
```

告警来自既有依赖链：`js-yaml` high、`esbuild` moderate、`prismjs/refractor` moderate；自动修复将触发 breaking change，未在本 change 中擅自升级。需另立依赖升级任务。

常见凭据模式扫描：

```text
grep ... frontend/src .specs/v27-ui-rework
无输出
```

## 第 4 轮 · 兼容

```text
python3 scripts/proto_parity_check.py --strict
缺失页族（0）：无
部分实现（0）：无
exit 0
```

E2E：

```text
npm run e2e
后端 http://127.0.0.1:8000 不可用
exit 2
```

未声称浏览器走查通过；Chrome/Firefox/Safari、多视口、深链和后端授权场景仍需在后端可用后执行。

## 第 5 轮 · 可观测性

本 change 不新增运行时日志、指标、告警或健康检查；按适用矩阵跳过。

## 回归登记

- 修复 `OrchDocPage.tsx` 中不可达状态比较导致的 TypeScript 错误。
- 修复任务空态中两个同名“新建任务”按钮造成的测试歧义，空态按钮改为“开始创建任务”。
- 更新 `nav-groups.test.tsx` 以匹配 PageHeader 迁移后的页面标题责任，并补充审计 API fixture。
- 新增 `v27-ui-rework.test.tsx` 覆盖唯一 h1、PageHeader 焦点、ConfirmDialog ARIA、Escape 与 Tab 循环。

## 未覆盖的 UAT

- UAT-1：启动后端和前端，按 10 条跨入口路径逐条点击，确认浏览器真实焦点与历史行为。
- UAT-2：在 ≥1280、768–1279、<768 三档窗口核对布局、横向溢出与按钮可达性。
- UAT-3：切换浅色/深色主题并人工检查对比度、focus ring 和 reduced-motion。
- UAT-4：使用未登录/普通成员直接访问详情、编辑和写 API，确认既有 401/403/404 语义不变。

T13 latest attempt: backend startup also blocked because `/usr/bin/python3` has no `uvicorn`, and no reusable project Python environment was found.
