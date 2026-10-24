# TASK: 记忆中心与提案抽屉

- **Change ID**: v20-ui-rsi · 关联 `REQUIREMENT.md` · `DESIGN.md` · `UI-DESIGN.md`

## 波次

```
Wave 1: T01 store（rsi 全量状态与动作）
Wave 2: T02 记忆 tab（列表/写入/评审/检疫/衰减/治理折叠）
Wave 3: T03 提案 tab（列表/新建/探针/影子/会签/发布）
Wave 4: T04 App 挂载 + 用例 + 三件门
```

## 任务清单（要点）

| id | name | write_files | verify | auto |
|---|---|---|---|---|
| T01 | rsi store：memories/reviews/switches/breakers/proposals/surfaces + 动作 | `stores/rsi.ts` | `tsc --noEmit` | ✅ |
| T02 | 记忆 tab（AC-2…AC-7） | `pages/Memory.tsx` | `vitest run src/__tests__/memory-page.test.tsx` | ✅ |
| T03 | 提案 tab（AC-8…AC-11） | `pages/Memory.tsx` | 同上 | ✅ |
| T04 | App 挂载 + 12 条用例 + 三件门（AC-1/AC-12） | `App.tsx` · `__tests__/memory-page.test.tsx` | `tsc && vitest && build` | ✅ |

## Task 门（自评轮）

| task | 研发负责人 | 测试 | 安全 | 结论 |
|---|---|---|---|---|
| T01 | ✅ 纯封装 | ✅ 类型门 | ✅ 无授权逻辑 | 3/3 `true` |
| T02 | ✅ 单文件分区 | ✅ 5 条 AC 可断 | ✅ 错误透传 | 3/3 `true` |
| T03 | ✅ 按状态裁剪 | ✅ 4 条 AC 可断 | ✅ 发布二次确认 | 3/3 `true` |
| T04 | ✅ 4 处挂载 | ✅ 三件门 | ✅ 权限壳 | 3/3 `true` |
