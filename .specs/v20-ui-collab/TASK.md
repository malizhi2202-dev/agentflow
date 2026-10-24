# TASK · v20-ui-collab

## T-01 / 协作状态层（store）

- **files**：`frontend/src/stores/collab.ts`(新)
- **边界**：只封装 HTTP 与状态；不做状态机判定（权威在后端）
- **verify**：`npx tsc --noEmit` 0 错
- **done 判据**：AC-8.7 / AC-8.8

## T-02 / 任务看板页

- **files**：`frontend/src/pages/Tasks.tsx`(新)
- **verify**：`npx vitest run src/__tests__/collab-pages.test.tsx` 全绿
- **done 判据**：AC-8.2…AC-8.4

## T-03 / 收件箱页

- **files**：`frontend/src/pages/Inbox.tsx`(新)
- **verify**：同上
- **done 判据**：AC-8.5 / AC-8.6

## T-04 / 挂载与回归

- **files**：`frontend/src/App.tsx` · `frontend/src/__tests__/collab-pages.test.tsx`(新)
- **verify**：
  ```
  npx tsc --noEmit       → exit 0
  npx vitest run         → 全绿（含既有 57 条）
  npm run build          → ✓ built
  ```
- **done 判据**：AC-8.1 / AC-8.9
