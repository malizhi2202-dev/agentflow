# TEST · v20-wave0（压缩路径：功能轮 + 回归登记）

> 环境：`/home/malizhi/ai/agentflow/frontend` · Node 侧 `tsc`/`vite`/`vitest` 均取自仓内既有依赖（**未新增任何依赖**）
> 说明：本 change 无新增业务逻辑，验证以「编译契约 + 既有回归」为准，不另造假用例。

## 一、命令与真实输出

### 1. TypeScript 契约

```
$ npx tsc --noEmit 2>&1 | grep -c "error TS"
0
```
（改前同一命令 = `32`）

### 2. 生产构建（AC-1 的核心判据）

```
$ npm run build        # = tsc && vite build
dist/assets/index-CZSLGUsZ.css     50.79 kB │ gzip:  19.44 kB
dist/assets/index-Cn2ncDMb.js   1,770.22 kB │ gzip: 508.92 kB
✓ built in 18.46s
```
退出码 0。**这是本仓第一次有可用的生产构建**（改前 `tsc` 32 错必定中断）。

### 3. 回归

```
$ npm test
 ✓ src/__tests__/ConversationCenter.test.tsx (5 tests)
 Test Files  5 passed (5)
      Tests  52 passed (52)
   Duration  21.51s
```

## 二、AC 对照

| AC | 判据 | 结果 |
|---|---|---|
| AC-1 构建通过 | `npm run build` 退出 0 且 `error TS` = 0 | ✅ |
| AC-2 不改行为 | diff 仅：类型补字段 / 闭包收窄 / 常量提取 / `global`→`globalThis` / 导出类型 | ✅（无逻辑改写，52 用例全绿） |
| AC-3 不加依赖、不放宽 strict | `package.json` diff 为空；`tsconfig.json` diff 为空 | ✅ |
| AC-4 存量缺陷登记不修 | `TASK.md` T-05 含 `agents_api.py:84`、`models/agent.py`、`AgentDetail.tsx:19,262,266` 三处证据 | ✅ |

## 三、回归范围与未覆盖

- **后端未改动** → 未跑 `pytest`。理由：本次 diff 零 `backend/` 文件（`git diff --name-only` 已比对）。
- **未新增前端用例**：本次是编译期修复，行为等价；既有 52 用例即回归网。若日后补 `role_def/system_prompt` 落库（T-05），那一波必须补「保存→刷新→仍在」的用例。
- **构建产物未入库**：`frontend/dist/` 与 `node_modules/.vite/` 的改动已 `git checkout --` 还原（生成物不入提交；`dist` 被 git 跟踪本身属 P0-5 仓库卫生待办）。
