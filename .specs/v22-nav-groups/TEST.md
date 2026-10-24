# TEST: 侧栏导航按业务大类分组

- **Change ID**: `v22-nav-groups`
- **测试日期**: 2026-10-24
- **路径**: 压缩路径（`0→3→4→6`），五轮金字塔只交**功能轮 + 回归登记**；其余三轮给 N/A 理由

---

## 1. 功能轮（必跑）

| # | 断言 | 手段 | 结果 | 证据 |
|---|---|---|---|---|
| F1 | 6 个父级分组按序出现：构建 / 运行 / 协作 / 知识 / 观测 / 治理 | RTL `getAllByRole('group')` | ✅ | `nav-groups.test.tsx` · 7 passed (7) |
| F2 | 组内条目集合正确（分组不丢条目） | 逐组读 `aria-label` 集合 | ✅ | 同上 |
| F3 | member 的「治理」只剩「审批」（用户管理 / 审计日志不渲染） | RTL + 真登录 bob | ✅ | 用例 + 浏览器：`治理=["审批"]` |
| F4 | 告警中心落在「观测」组，未确认角标 = 3 | RTL 角标文本 | ✅ | 用例 |
| F5 | 折叠态隐藏组标题、条目仍可用 `aria-label` 定位 | 点「收起」后查询 | ✅ | 用例 |
| F6 | 「文档资料 · 原型」仅 admin 可见 | RTL + 真登录双账号 | ✅ | admin `原型链接=1` / bob `原型链接=0` |
| F7 | 每个分组首项点击后进入对应页面（路由未因分组改变） | 无头 Chromium 真点击 | ✅ | 工具库 / Agent 编排 / 项目管理 / 知识库 / 监控 / 人工审批 |
| F8 | `/api/runtime/*` 不再 500（上一轮修复的回归） | 浏览器收集 5xx | ✅ | `5xx: 无` |

## 2. 门禁

| 门 | 命令 | 结果 |
|---|---|---|
| 类型 | `cd frontend && npx tsc --noEmit` | **exit 0** |
| 单测 | `npx vitest run` | **13 files / 116 tests passed** |
| 构建 | `npx vite build` | **✓ built in 18.72s** |
| 后端回归 | `python -m unittest tests.test_runtime_scanner` | **Ran 9 tests, OK**（上一轮修复，未受本次影响） |

## 3. 性能 / 安全 / 兼容 / 可观测（N/A 及理由）

| 轮次 | 状态 | 理由 |
|---|---|---|
| 2 性能 | N/A | 纯静态数组渲染 + 一次 `filter`，无新增请求、无循环内 IO；条目数 18 不变 |
| 3 安全 | N/A（无新增面） | 未新增接口/入参；权限语义未改（`perm` 只是原 `ADMIN_NAV.filter` 的搬家）；原型入口改为**不渲染**，比原先更严 |
| 4 兼容 | ✅ | `View` 值、`navigate` 语义、`renderContent` 分支零改动；E2E 脚本按 `aria-label` 点名，名字未变 |
| 5 可观测 | N/A | 无新增后台作业/指标；告警角标轮询逻辑原样 |

## 4. 回归登记

- 前置修复（本 change 之前同会话完成，未重复验证）：`nav` 不可滚动导致底部条目被 `aside{overflow:hidden}` 裁切；`/api/runtime/*` 因 `.specs` 缺失 500。
- 本 change 未触碰：后端任何文件、`frontend/src/pages/*`、权限中间件。
