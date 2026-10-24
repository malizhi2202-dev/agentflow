# TASK: 前端壳层对齐原型（W1）

- **Change ID**: `v22-ui-align`
- **关联**: `@.specs/v22-ui-align/{ALIGNMENT,CHANGE,UI-DESIGN}.md`

---

## 波次

```
W1（本 change）: T01 壳层与组件 · T02 页面批 1 · T03 口径写回 · T04 门禁与实测
W2 批 2（已完成）: T05 其余 13 视图去重标题（Agent 列表因并行 change 暂缓）
W2 余下（后续）: 逐页骨架（表格/口径注/抽屉）+ Agent 页
W3（后续）: 间距/字号阶 + a11y 复核
```

---

## 任务清单

```xml
<task id="T01" parallel="false" status="done">
  <name>壳层顶栏 + 语义组件 + 样式</name>
  <read_files><PRODUCT-DESIGN.html .app-top 段><prototype/projects.html></read_files>
  <write_files>
    <frontend/src/components/ui/AppTopBar.tsx>
    <frontend/src/components/ui/Chip.tsx>
    <frontend/src/components/ui/Panel.tsx>
    <frontend/src/components/ui/Toolbar.tsx>
    <frontend/src/styles/ui.css>
    <frontend/src/main.tsx>
    <frontend/src/App.tsx>
  </write_files>
  <action>
    `.app-top`（crumb + 右槽）由 App 统一渲染；语义类/组件 token 全取既有变量；
    页面名只在 crumb 出现，`PAGE_LABELS` 覆盖非导航视图。
  </action>
  <verify>cd frontend &amp;&amp; npx tsc --noEmit</verify>
  <done>tsc 0；无头浏览器实测 21 个导航视图全部渲染 44px sticky 顶栏（crumb 文案正确）</done>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="done">
  <name>页面批 1：去重复页名 + 动作行改用工具栏（任务/自动化/项目/运行时/记忆中心）</name>
  <read_files><frontend/src/pages/{Tasks,Automations,ProjectManager,Runtimes,Memory}.tsx></read_files>
  <write_files>同上 5 个文件</write_files>
  <action>
    删除页内大字页名（原 24px/18px/16px 三套），计数改 `.chip mono`，动作行改 `.toolbar`；
    只改无标题断言的页（团队页等留到 W2 连用例一起改）。
  </action>
  <verify>cd frontend &amp;&amp; npx vitest run src/__tests__/automations-runtimes-replay.test.tsx src/__tests__/runtime-discovery.test.tsx</verify>
  <done>5 页无重复页名；相关用例全绿</done>
  <auto>true</auto>
</task>

<task id="T03" parallel="false" status="done">
  <name>6 组侧栏口径写回唯一事实源</name>
  <read_files><RULINGS.md><PRODUCT-DESIGN.html §2.10/§2.11></read_files>
  <write_files>
    <.specs/platform-evolution/RULINGS.md>
    <.specs/product-design/PRODUCT-DESIGN.html>
  </write_files>
  <action>
    RULINGS 加 R9-1（6 组取代原型「工作区/管理」两组）；主档新增 §2.10a（含 6 组表 + 两条纪律）+ 目录锚。
  </action>
  <verify>grep -c "s2-10a" .specs/product-design/PRODUCT-DESIGN.html &amp;&amp; grep -c "R9-1" .specs/platform-evolution/RULINGS.md</verify>
  <done>两处均命中；h3 开闭标签数一致（107/107）</done>
  <auto>true</auto>
</task>

<task id="T04" parallel="false" status="done">
  <name>门禁与浏览器实测</name>
  <read_files><scripts/ci.sh></read_files>
  <write_files><.specs/v22-ui-align/TASK.md></write_files>
  <action>
    tsc / vitest 全量 / build；无头浏览器逐视图取 crumb 与页内重复标题，记录剩余量。
  </action>
  <verify>cd frontend &amp;&amp; npx vitest run</verify>
  <done>130 用例全绿；build ✓；实测 21 视图顶栏全在，剩余 14 视图重复标题已登记 W2</done>
  <auto>true</auto>
</task>
```

---

## W2 批 2 记录（T05）

- 迁移 13 个视图：工具库 / 工作流 / 角色 / 编排 / 监控 / 知识库 / 回放 / 收件箱 / 团队与小队 / 用户管理 / 审计日志 / 审批 / 告警中心
- 同步改的用例：`teams-page.test.tsx` 的页名文本断言 → 改为断言 `role="tablist"`（页名已属壳层）
- 新增守卫用例：`nav-groups.test.tsx` 的 17 条「页内不得出现与页名相同的大字标题」
- 实测（无头浏览器，21 视图逐个点）：重复标题 **1**（仅 Agent 列表，属并行 change 的文件），5xx 无
- 门禁：tsc 0 · vitest **147 passed** · build ✓ 36.41s

## W1 实测结论（本轮浏览器输出）

- 顶栏几何：`{top:0, height:44, sticky:sticky, border:1px}` ✅
- 21 个导航视图 crumb 全部正确 ✅
- 页内重复标题：由 19 处降到 **14 处**（本轮改掉 任务/自动化/项目/运行时/记忆中心 5 处）
- 5xx：无

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| — | — | — | — |
