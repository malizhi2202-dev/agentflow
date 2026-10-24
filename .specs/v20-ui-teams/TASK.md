# TASK: 团队与小隊页

- **Change ID**: v20-ui-teams
- **关联**: `@.specs/v20-ui-teams/REQUIREMENT.md`、`@.specs/v20-ui-teams/DESIGN.md`、`@.specs/v20-ui-teams/UI-DESIGN.md`

---

## 波次划分

```
Wave 1: T01（store 层，其余任务都依赖它）
Wave 2: T02（团队 tab：列表/建团/状态/成员/转让/资产配额）
Wave 3: T03（小隊 tab：列表/建队/成员/归档）
Wave 4: T04（App 挂载 + 页面用例 + 回归门）
```

> 同 wave 可并行；跨 wave 顺序执行。本 change 只有一条串行链（同一 page 文件逐波生长）。

---

## 任务清单

```xml
<task id="T01" parallel="false" status="pending">
  <name>协作归属状态层（teams store）</name>
  <read_files>
    <frontend/src/stores/collab.ts（同构基线）>
    <frontend/src/utils/requestDedup.ts（safeFetch / dedupedFetch / invalidateCache）>
    <backend/routes/teams_api.py（只读契约）>
  </read_files>
  <write_files>
    <frontend/src/stores/teams.ts>
  </write_files>
  <action>
    新建 zustand store：teams（摘要列表）/ detail（team+members+assets）/ squads；
    动作：fetchTeams / createTeam / fetchTeam / setTeamStatus / addMember / removeMember /
    transferOwner / claimAsset / releaseAsset / fetchSquads / createSquad /
    addSquadMember / removeSquadMember / archiveSquad。
    读写分工沿用 collab.ts：GET 走 safeFetch，写走 dedupedFetch 并**读取后端 detail**，成功后
    invalidateCache() 再重拉。类型按 routes/teams_api.py 的返回形状定义（members/assets/squads）。
  </action>
  <verify>cd frontend && npx tsc --noEmit</verify>
  <done>AC-9 / AC-10（状态层部分）</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="pending">
  <name>团队 tab：列表 / 建团 / 状态 / 成员 / 转让 / 资产配额</name>
  <read_files>
    <frontend/src/pages/Tasks.tsx（列表+表单同构基线）>
    <frontend/src/pages/AlertsPage.tsx（分组/空态基线）>
    <frontend/src/styles/tokens.css>
  </read_files>
  <write_files>
    <frontend/src/pages/Teams.tsx>
  </write_files>
  <action>
    单页双 tab 的第一个 tab。左列表卡片（名称/slug/状态 chip/我的角色/成员数/资产数）；右侧抽屉
    摘要 + 「成员」「资产与配额」「危险区」三分区：成员增删（四档角色下拉）、五类资产计数与三条配额、
    挂载/释放（kind 下拉 + asset_id 手填，附 shortcut 注释）、状态切换（archived 需确认、不可逆提示）、
    owner 转让（新 owner 输入 + confirm 勾选）。archived 后加成员/挂资产按钮 disabled 且给 title 原因。
    错误一律就地显示后端 detail。
  </action>
  <verify>cd frontend && npx vitest run src/__tests__/teams-page.test.tsx</verify>
  <done>AC-2…AC-7 · AC-9 · AC-10</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="false" status="pending">
  <name>小隊 tab：列表 / 建队 / 成员混编 / 归档</name>
  <read_files>
    <frontend/src/pages/Teams.tsx（T02 产出）>
    <backend/models/teams.py（Squad / SquadMember 字段）>
  </read_files>
  <write_files>
    <frontend/src/pages/Teams.tsx>
  </write_files>
  <action>
    第二个 tab：小隊列表（slug/name/leader/成员数/状态）、建队表单（slug+name+leader_agent_id+指令）、
    成员混编增删（member_kind ∈ agent|member）、归档（二次确认；409 leader_bound 文案透传）。
    界面**不得**出现「归档会取消在跑运行」字样（R8-4：只停未来指派）。
  </action>
  <verify>cd frontend && npx vitest run src/__tests__/teams-page.test.tsx</verify>
  <done>AC-8</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="false" status="pending">
  <name>App 挂载 + 页面用例 + 回归门</name>
  <read_files>
    <frontend/src/App.tsx（NAV/View/渲染分支）>
    <frontend/src/__tests__/collab-pages.test.tsx（用例基线：路由式 fetch mock）>
  </read_files>
  <write_files>
    <frontend/src/App.tsx>
    <frontend/src/__tests__/teams-page.test.tsx>
  </write_files>
  <action>
    App.tsx 加 NAV「团队与小隊」、View 值、渲染分支（project:read 权限壳）、初始路径 /teams。
    写用例：列表渲染与字段、建团校验（非法 slug 不发请求）、409 文案透传、archived 禁用按钮、
    成员添加/移除、转让需 confirm、资产挂载请求体、小隊建队/加成员/归档 409、空态文案。
    跑三件门：tsc / vitest / build。
  </action>
  <verify>cd frontend && npx tsc --noEmit && npx vitest run && npm run build</verify>
  <done>AC-1 · AC-11</done>
  <depends_on>T02,T03</depends_on>
  <auto>true</auto>
</task>
```

---

## Task 门（自评轮 · 逐 task 自动化投票）

> 投票者：研发负责人 + 资深测试工程师 + 安全审计师（R13.3 格式）。

| task | 研发负责人 | 资深测试工程师 | 安全审计师 | 结论 | `<auto>` |
|---|---|---|---|---|---|
| T01 store | ✅ 面小、纯封装 | ✅ 类型即验证（tsc） | ✅ 不新增授权逻辑 | 3/3 | `true` |
| T02 团队 tab | ✅ 单文件、结构清楚 | ✅ 6 条 AC 都有可断言行为 | ✅ 错误透传不吞、archived 禁用 | 3/3 | `true` |
| T03 小隊 tab | ✅ 复用 T02 骨架 | ✅ 归档 409 可断言 | ✅ 不改后端权限 | 3/3 | `true` |
| T04 挂载+用例 | ✅ 只加一行 NAV 与分支 | ✅ 三件门可复现 | ✅ 权限壳沿用 `EmptyPerm` | 3/3 | `true` |

**为什么全 `true`**：四个 task 都在单一前端文件/单一 store 内，且每个 task 都有可执行 verify（tsc / vitest / build）；没有不可逆外部动作、没有 schema、没有凭据面。

## 状态字段说明

`status`: pending → in_progress → done（另有 blocked，需在「阻塞日志」记原因与解阻条件）。

## 阻塞日志

（空）

## Fix 任务（来自 REVIEW / INTEGRATION）

（空 · 由 6-review / 7-integration 追加）
