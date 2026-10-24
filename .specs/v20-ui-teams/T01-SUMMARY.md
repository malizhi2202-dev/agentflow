# SUMMARY: T01 — 协作归属状态层（teams store）

- **Change ID**: v20-ui-teams · **Task ID**: T01 · **完成时间**: 2026-10-24
- **AI 角色**: Dev

## 做了什么

新建 `stores/teams.ts`：团队列表 / 团队详情（team+members+assets）/ 小隊列表 三块状态 + 14 个动作。
读写分工沿用 `stores/collab.ts`：GET 走 `safeFetch`（5s 缓存 + 去重），写走 `dedupedFetch` 并**读取后端 `detail`**（`safeFetch` 会把 4xx 压成 `Server error: 400`），成功后 `invalidateCache()` 再重拉。
类型按 `backend/routes/teams_api.py` 的实际返回形状定义（`_team_dict` / `list_assets` / `_squad_dict`）。

**偏离**：`archive_squad` 后端不收 `reason`（`ts.archive_squad(db, squad)`），初版多传了 body → 已改为无 body，并用 `_reason` 标记未用参数（避免"看起来传了但被忽略"）。

## 改动文件

| 文件 | 性质 | 说明 |
|---|---|---|
| `frontend/src/stores/teams.ts` | 新增 | 状态 + 动作 + 类型 |

## verify 输出

```text
$ cd frontend && npx tsc --noEmit
（无输出，exit 0）
```

## 已知接受 + 理由

- **无 store 单测**：T01 的验证手段是 `tsc` + 后续页面用例（页面用例会覆盖每个动作的请求体/URL）。单独给 store 写 mock 用例属重复（DAMP 优先）。
- `removeSquadMember` 返回 404 时界面文案由后端 `detail` 提供（"成员不存在"）。
