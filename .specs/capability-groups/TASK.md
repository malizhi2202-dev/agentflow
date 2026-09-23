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

---

## 修复任务（6-review 产出 · 2026-09-23）

> 来源：`@.specs/capability-groups/REVIEW.md`（F1-F15）。Reviewer 未改任何代码（R3.3）。
> 执行回 `4-dev`；**T-FIX-00 是回退任务（5-test），完成前本 change 不得重进 6-review**。
> 每条含 `verify`（R2.3）。`write_files` 之外的改动须先更新本 TASK 或开新 CHANGE（R7.1）。

### T-FIX-00: 回 5-test — 补 `TEST.md`（5 轮金字塔）+ `test_backend.py` 🔴门禁
- **read_files**: `.specs/capability-groups/REQUIREMENT.md`, `DESIGN.md`, `REVIEW.md`
- **write_files**: `.specs/capability-groups/TEST.md`, `.specs/capability-groups/test_backend.py`
- **action**: 从 FR1-FR5 / NFR1-NFR3 派生用例（R5.1，禁止从实现代码派生）；必须把 REVIEW.md 里已复现的三个 FR1 反例固化成回归（跨 key 假阳性、`_` 通配符、`%` 绕过）；声明 5 轮状态，跳过的轮次给理由（R5.4）；`_quick_test.py` 那种 print 式脚本不作数
- **verify**: `cd backend && /home/malizhi/.venv/bin/python -m pytest tests/ -q -k capab` 通过，且 `.specs/capability-groups/TEST.md` 存在
- 状态: [ ]

### T-FIX-01: FR1 单一真相 — 弃 JSON 文本 LIKE，改数组成员判定 🔴
- **read_files**: `backend/routes/agents_api.py`, `backend/services/k8s_routing_service.py`, `.specs/capability-groups/DESIGN.md`
- **write_files**: `backend/routes/agents_api.py`, `backend/services/capability_service.py`(新建), `.specs/capability-groups/test_backend.py`
- **action**: `agents_api.py:36-38` 的 `contains(f'"{capability}"')` 换成 `_extract_capabilities(a)` + `in` 判定（DESIGN.md:54-66 给的「Python 端过滤」方案）；删除手写双引号拼接；若因数据量须走 `JSON_CONTAINS`，先把 MySQL/SQLite 双方言结论写进 DESIGN 再实现
- **verify**: 新回归断言「`capabilities` 为空、但别的 key 的值恰等于该 capability」的 Agent 不被返回，且 `?capability=%` 返回 0 条；`cd backend && /home/malizhi/.venv/bin/python -m pytest tests/ -q`
- 状态: [ ]

### T-FIX-02: 复用既有抽象 + 业务逻辑下沉 services（R3/R5）🔴
- **read_files**: `backend/routes/domain_api.py`, `backend/services/k8s_routing_service.py`
- **write_files**: `backend/routes/domain_api.py`, `backend/services/k8s_routing_service.py`, `backend/services/capability_service.py`
- **action**: 删 `domain_api.py:110-118` 的内联派生，改调本文件 `:9` 已 import 的 `_extract_capabilities`；把该 helper 去下划线提为公开 API（或移入新建 `services/capability_service.py`，含 `capabilities_of` / `distinct_capabilities`）；**改公共导出前先 grep 全部引用点**（R4.6）；routes 只留校验与鉴权
- **verify**: `cd backend && grep -rn 'cfg.get("capabilities"' routes/ services/ | wc -l` 结果为 1（仅 helper 内部）+ `python -m pytest tests/ -q`
- 状态: [ ]

### T-FIX-03: 健康口径统一（R3 附 · F10）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `.specs/capability-groups/DESIGN.md`
- **write_files**: `frontend/src/lib/agentHealth.ts`(新建), `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 抽 `isAgentHealthy(status)` 与 `probeHealthOf(probe)` 两个具名函数（DESIGN.md:97-104 为唯一口径源）；把 `:156-157` 与 `:1137` 的 `agent.status === 'healthy'`（恒假死分支 —— `healthy` 从不是 Agent.status 的取值）改为 `isAgentHealthy(agent.status)`
- **verify**: `cd frontend && grep -c "status === 'healthy'" src/pages/AgentControlPlane.tsx` 为 0；`./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"` 仍为 32（不新增）
- 状态: [ ]

### T-FIX-04: `:110` 补 owner/visibility 过滤（安全 · F4）🔴
- **read_files**: `backend/routes/domain_api.py`, `backend/models/agent.py`, `CLAUDE.md`
- **write_files**: `backend/routes/domain_api.py`, `.specs/capability-groups/test_backend.py`
- **action**: 本 change 面内只修新增的第 7 处（`:110`）—— 域内 Agent 查询加 owner/visibility 条件。**其余 6 处（`:34,91,143,172,208,279`）与「`visibility` 是否全局执行」属跨端点统一修复，须按 REVIEW.md 待裁定项 5 由人拍板后开新 CHANGE，本任务内禁止顺手改**（R7.1）
- **verify**: 新用例断言「非域 owner 且非 admin 的用户不能从 `GET /api/domains/{id}/capabilities` 读到他人 private Agent 的 capability」；`python -m pytest tests/ -q`
- 状态: [ ]

### T-FIX-05: 拆 `CapabilityGroupRow`（R1 · F11）🟡
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/components/capability/CapabilityGroupHeader.tsx`(新建), `frontend/src/components/capability/GroupOpsBar.tsx`(新建), `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 分组展示（名/数量/健康概要/箭头）与操作面（自动路由/扩容/排队/loading）拆开，14 个 props 降到 ≤6；操作态从 `stores/domains.ts` 取，不逐层透传
- **verify**: `cd frontend && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "AgentControlPlane\|CapabilityGroup"` 为 0；`wc -l < src/pages/AgentControlPlane.tsx` 较 1428 下降
- 状态: [ ]

### T-FIX-06: 键盘可达 + 对比度实测（UI 3.4 · F9）🔴
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/styles/tokens.css`
- **write_files**: `frontend/src/pages/AgentControlPlane.tsx`, `frontend/src/styles/tokens.css`
- **action**: 能力组头 `<div onClick>`（`:411-413`）改 `<button>`（或 `role="button" tabIndex={0}` + Enter/Space `onKeyDown`），补 `aria-expanded` / `aria-controls`；确认 `prefers-reduced-motion` 有降级；用工具（非肉眼）实测 `#fff` on `var(--blue)` 与 `fontSize: 10` 的 WCAG 2.1 AA 对比度并记入 TEST.md 第 4 轮
- **verify**: `cd frontend && grep -c "aria-expanded" src/pages/AgentControlPlane.tsx` ≥ 1；对比度数字 + 判定写入 `.specs/capability-groups/TEST.md`
- 状态: [ ]

### T-FIX-07: 清 `#fff` 硬编码（UI 3.1 · F5）🔴
- **read_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **action**: `tokens.css` 增加倾斜中性前景 token（禁纯白，ui-anti-patterns 颜色类），替换 `:457,473`（本 change 面）；`:850,962,1012,1225` 属 pre-existing 同形，一并替换须在 verify 里证明无回归
- **verify**: `cd frontend && grep -c "#fff\b\|#ffffff\b" src/pages/AgentControlPlane.tsx` 为 0
- 状态: [ ]

### T-FIX-08: 补字号/间距/圆角 scale token（UI 3.1 · F6）🔴
- **read_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/styles/tokens.css`, `frontend/src/pages/AgentControlPlane.tsx`
- **action**: `tokens.css` 现仅 `--s1`/`--r-sm`，**无字号与间距 scale token** → 先定 scale（建议非线性，避开 4/8/12/16/20 cliché），再让 `CapabilityGroupRow` 引用。不做即等于「用 token」物理上不可用，届时按 R2.5 走人工「已知接受」
- **verify**: `cd frontend && grep -c "fontSize: [0-9]" src/pages/AgentControlPlane.tsx` 较当前下降，且所引 token 在 `tokens.css` 有定义
- 状态: [ ]

### T-FIX-09: 三层树去卡片化（UI 3.2 · F7）🔴
- **read_files**: `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 域卡片 > 能力组卡片 > Agent 行 = 卡片嵌套卡片（anti-pattern 布局类）。Level 2/3 去掉 `border + borderRadius`（`:402-403`），改用缩进 + 单条分隔线承载层级；若人工判定「三层卡是产品形态」→ 按 R2.5 走「已知接受」签字，不留空
- **verify**: `cd frontend && grep -n "borderRadius" src/pages/AgentControlPlane.tsx | sed -n '1,40p'` 中能力组层不再带边框卡片样式；截图复核结论记 TEST.md UAT 段
- 状态: [ ]

### T-FIX-10: 组顺序两端一致（F14）🟢
- **read_files**: `backend/routes/domain_api.py`, `frontend/src/pages/AgentControlPlane.tsx`
- **write_files**: 上述二者之一
- **action**: `domain_api.py:119` 与 `AgentControlPlane.tsx:666` 各自 `sort()`，中文 `未分类` 落位依赖 locale → 固定规则（`未分类` 恒末位，其余按原值升序）且只在一处定义
- **verify**: 同一份种子数据下，`GET /api/domains/{id}/capabilities` 与画布分组顺序逐位相同
- 状态: [ ]

### T-FIX-11: FR2 端点消费者与验收口径（F12）🟡
- **read_files**: `backend/routes/domain_api.py`, `frontend/src/stores/domains.ts`, `frontend/src/pages/AgentControlPlane.tsx`, `.specs/capability-groups/REQUIREMENT.md`
- **write_files**: `frontend/src/stores/domains.ts`, `frontend/src/pages/AgentControlPlane.tsx`
- **action**: 二选一 —— (a) 前端改为消费该端点作为组名来源；(b) 承认「本地派生」即实现、把该端点定位为纯外部集成面并在 REQUIREMENT 写清其验收方式。当前「实现了但零消费者 + 零测试」使 FR2/用户故事 4 不可验。**注意：选 (b) 需改 REQUIREMENT，属 R3.2 红线（Reviewer/Dev 不得改需求）→ 由人工拍板后交 1-requirement 执行**
- **verify**: 选定后 TEST.md 第 1 轮有对应 AC 用例，或 REQUIREMENT 明确该端点验收口径
- 状态: [ ]

### T-FIX-12: 登记议题（不入本 change）🟢
- **read_files**: `.specs/CONTEXT.md`, `frontend/src/styles/tokens.css`, `STATE.md`
- **write_files**: `STATE.md`, `.specs/platform-evolution/TOPICS.md`
- **action**: 按 R18.4 登记三条 —— ① `tokens.css:43` `--font` 含 **Roboto**（字体类强制禁忌，全局既有、非本 change）；② `visibility="private"` 全后端从未被执行（跨 7 端点 + 模型字段存废）；③ `CONTEXT.md` 已 **79 天**未更新、无「技术债」段、§3 规模表与现实偏离（实测 117 py / 100 ts·tsx vs 记录 112 / 96）→ 可重跑 intel-scan
- **verify**: 三条在 `STATE.md` 或 `TOPICS.md` 可 grep 到
- 状态: [ ]
