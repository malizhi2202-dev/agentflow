# SUMMARY: T04 — App 挂载 + 页面用例 + 回归门

- **Change ID**: v20-ui-teams · **Task ID**: T04 · **完成时间**: 2026-10-24
- **AI 角色**: Dev

## 做了什么

- `App.tsx`：NAV 加「团队与小隊」、`View` 加 `teams`、渲染分支 `perm('project:read') ? <Teams /> : <EmptyPerm />`、初始路径 `/teams`。
- 新增 `src/__tests__/teams-page.test.tsx` 11 条用例（列表/空态/非法 slug 不发请求/409 透传/抽屉我的角色/成员增删/archived 禁用/转让 confirm/资产挂载/释放 kind/小队建队/小队归档 409）。
- 跑三件门并留证。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/App.tsx` | 修改 | NAV/View/分支/初始路径（4 处） |
| `frontend/src/__tests__/teams-page.test.tsx` | 新增 | 11 条用例 |

## verify 输出（必填 · 真实粘贴）

```text
$ cd frontend && npx tsc --noEmit
exit 0（无输出）

$ npx vitest run
 Test Files  8 passed (8)
      Tests  74 passed (74)        # 既有 63 + 本 change 11

$ npm run build
✓ built in 18.30s
```

## 已知接受 + 理由

- 用例为路由式 `fetch` mock（与 `collab-pages.test.tsx` 同构），**未做真实后端联调**；接口形状按 `routes/teams_api.py` 逐字段对齐。
- 无浏览器人工视觉验收（无头浏览器未接）→ 记入 `UAT.md` 未覆盖项。

## 🛡️ G3 代码门（4-dev 出口 · 自评轮）

```
🗳️ G3 代码门: 四个 task 的实现是否通过？

   🟫 研发负责人(M): ✅ 触碰面与 DESIGN §0.5.1 一致（1 store + 1 page + App 4 处 + 1 用例文件）；无越界、无顺手改后端。
   🟩 架构师: ✅ 沿用既有 store/page/抽屉骨架，未引入新模式；读写分工与 L-005 教训一致（写不缓存、读 null）。
   🧪 资深测试工程师: ✅ 每条 AC 都有可断言行为；11 条用例覆盖 4xx 透传与禁用态；发现并修复的释放 kind bug 有回归用例。
   🔴 安全审计师: ✅ 前端零授权判断；错误透传不吞；未引入凭据面；`archived` 禁用有 title 原因。

   结果: 4/4 → 全票通过 ✅ 进入 5-test
```
