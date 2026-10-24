# TEST · v20-ui-collab

## 1. 新增用例（6 条，全绿）

```
$ cd frontend && npx vitest run src/__tests__/collab-pages.test.tsx
 ✓ src/__tests__/collab-pages.test.tsx (6 tests) 792ms

任务看板（/api/tasks）
  ✓ 按四列状态类别分组，并显示 done 缺证据警告
  ✓ 新建任务：提交标题/负责人/优先级后重新拉列表
  ✓ 非法状态转移：把后端 400 的业务文案显示出来，而不是吞掉
收件箱（/api/inbox）
  ✓ 分两组渲染并显示未读/需处理计数
  ✓ 单条标读只打 read 接口并刷新
  ✓ 批量动作显示条数，失败时报错
```

## 2. 全量前端门

```
$ npx tsc --noEmit          → exit 0
$ npx vitest run            → Test Files 7 passed (7) · Tests 63 passed (63)   # 57 既有 + 6 新增
$ npm run build             → ✓ built in 15.80s
```

## 3. 用例抓到的真 bug（写进提交，不只在测试里）

**`requestDedup` 的缓存键只含 URL，写请求会命中读缓存。**

- 现象：`POST /api/tasks` 在 5s 内紧跟 `GET /api/tasks` 时，**根本没有发出网络请求**，直接返回缓存的 GET 响应，`createTask` 报告成功但任务没建。
- 证据：`新建任务` 用例里 `POST` 调用列表为空（`expected undefined to match object`），改后同一用例通过。
- 根因：`dedupedFetch` 用 `canonicalUrl(url)` 做 cache/in-flight 键，GET 与 POST 同 URL 共键；且非 GET 也会进缓存。
- 修法（根因层，一处）：键改为 `${method} ${canonicalUrl(url)}`，**只有 GET 进缓存**；`invalidateCache(url)` 同时清 `url` 与 `GET url` 两种键。

## 4. 未覆盖（如实记账）

- **没有浏览器视觉验收**：本轮用 jsdom 渲染断言 + 构建门；像素级/交互手感未经人工点检（`v20-release/UAT.md` 也记着同类缺口）。
- **没有真实后端联调**：用例里 fetch 是路由式 mock；接口契约按 `routes/tasks_api.py` / `routes/inbox_api.py` 逐字段对齐，但真实链路的 401/403 跳转未在浏览器复验。
- **团队/小队/记忆/提案页面**不在本 change（见 CHANGE「明确不做」）。
