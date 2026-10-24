# TASK: 侧栏导航按业务大类分组

- **Change ID**: `v22-nav-groups`
- **关联**: `@.specs/v22-nav-groups/CHANGE.md`（压缩路径：需求/AC 与最小设计写在 CHANGE 内）

---

## 波次划分

```
Wave 1: T01
Wave 2: T02   (depends on T01)
Wave 3: T03   (depends on T01；用户追加：原型入口仅 admin)
```

---

## 任务清单

```xml
<task id="T01" parallel="false" status="done">
  <name>侧栏分组数据结构 + 渲染（含折叠态 / 权限过滤 / 告警角标）</name>
  <read_files>
    <frontend/src/App.tsx>
    <frontend/src/components/UserSelect.tsx>
    <frontend/src/styles/tokens.css>
  </read_files>
  <write_files>
    <frontend/src/App.tsx>
  </write_files>
  <action>
    1. 用 `NavGroup { key, title, items: NavItem[] }` 取代平铺的 `NAV` + `ADMIN_NAV`；
       `NavItem` 增加可选 `perm`（治理组两项用 `user:manage` / `audit:view`）与 `badge: 'alerts'`。
    2. 分组口径见 CHANGE 表格：构建 / 运行 / 协作 / 知识 / 观测 / 治理；
       「告警中心」从侧栏底部移入「观测」，未确认角标保留（同一 `alertCount` 状态）。
    3. 渲染：每组 `<div role="group" aria-label="<组名>">` + 父级标题（`collapsed` 时隐藏标题），
       组内条目按 `perm` 过滤；组过滤后为空则不渲染该组。
    4. 抽一个组内按钮的渲染函数，消掉原先 `NAV` / `ADMIN_NAV` 两份逐行重复的内联样式。
    5. 底部只留「用户中心 + 收起」；`nav` 保持滚动容器（flex:1 / minHeight:0 / overflowY:auto）。
    6. 不改 `View` 值、`navigate` 语义、`renderContent` 分支与任何页面组件。
  </action>
  <verify>cd frontend &amp;&amp; npx tsc --noEmit</verify>
  <done>tsc 0 错误；侧栏 6 组渲染，折叠态无组标题，权限过滤与角标行为不变</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="done">
  <name>回归用例 + 门禁 + 浏览器实测</name>
  <read_files>
    <frontend/src/App.tsx>
    <frontend/src/stores/auth.ts>
    <frontend/src/__tests__/automations-runtimes-replay.test.tsx>
    <scripts/e2e/ui_mysql_e2e.js>
  </read_files>
  <write_files>
    <frontend/src/__tests__/nav-groups.test.tsx>
  </write_files>
  <action>
    1. 新增 `nav-groups.test.tsx`：渲染 App（stub `/api/auth/me`、`/api/agents`、`/api/projects`、
       `/api/alerts/count` 等启动期请求），断言：
       ① 6 个 `role="group"` 出现且 `aria-label` 命中；② 每个组的条目标签集合正确；
       ③ `role=member` 时「用户管理 / 审计日志」不渲染、仅剩「审批」；
       ④ 告警在「观测」组内且角标显示未确认数；⑤ 点「收起」后组标题消失、图标仍在（`aria-label` 可查）。
    2. 全量门：`npx tsc --noEmit` + `npx vitest run` + `npx vite build`。
    3. 浏览器实测（无头 Chromium，真登录）：1280×720 下侧栏滚动可达 6 组全部条目，
       逐组点首项各自进页面；`/api/runtime/*` 无 5xx。
  </action>
  <verify>cd frontend &amp;&amp; npx vitest run src/__tests__/nav-groups.test.tsx</verify>
  <done>新用例全绿；全量 vitest 通过；build ✓；浏览器实测有输出为证</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="false" status="done">
  <name>「文档资料 · 原型」入口仅管理员可见</name>
  <read_files>
    <frontend/src/App.tsx>
    <frontend/src/__tests__/nav-groups.test.tsx>
  </read_files>
  <write_files>
    <frontend/src/App.tsx>
    <frontend/src/__tests__/nav-groups.test.tsx>
  </write_files>
  <action>
    侧栏顶部的 `/prototype/index.html` 链接由无条件渲染改为 `isAdmin &amp;&amp; <a>`：
    成员侧**不渲染**（不是 CSS 隐藏），不新增权限点（沿用 role === 'admin'）；
    注释写明理由（原型含内部设计口径与未实现面）。用例补两条：admin 可见且 href 正确 / member 不可见。
  </action>
  <verify>cd frontend &amp;&amp; npx vitest run src/__tests__/nav-groups.test.tsx</verify>
  <done>7 用例全绿；浏览器实测 bob 登录后无「文档资料 · 原型」</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>
```

---

## 状态字段说明

- `status="pending"` — 未开始
- `status="in_progress"` — 进行中
- `status="done"` — 已完成（verify 通过）
- `status="blocked"` — 阻塞（必须在「阻塞日志」记录）

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| — | — | — | — |
