# TASK · v20-wave0

> 波次：**波 0（止血）** · 全部单会话可完成，无并行依赖。
> 每个 task 的 `verify` 必须真跑并贴输出。

## T-01 类型契约对齐（A 类 · 18 错误）

- **files**：`frontend/src/stores/projects.ts`、`frontend/src/stores/agents.ts`
- **do**：`Project` 加 `orchestration_id?: number | null`；`Agent` 加 `workflow_ids?: number[]`、`role_def?: string`、`system_prompt?: string`、`sop?: string`（可选 + 注释「后端暂未落库，见 T-03」）
- **verify**：`cd frontend && npx tsc --noEmit 2>&1 | grep -c "error TS"` → 预期 18→14（余下由 T-02/T-03 处理）

## T-02 闭包收窄 + 嵌套解引用（B/E 类 · 11 错误）

- **files**：`ProjectDetail.tsx`、`ToolMarket.tsx`、`WorkflowCreate.tsx`、`AgentBuilder.tsx`、`ProjectManager.tsx`
- **do**：① 组件体取 `const orchId = project?.orchestration_id ?? null`、`const modelTotals = metrics?.model_totals ?? {}`；② 闭包前取 `const id = deleteId` / `const name = f.name` / `const wfId = wf.id`；③ 不改行为
- **verify**：`npx tsc --noEmit` 中 `src/pages` 错误 = 0

## T-03 测试可编译（C/D 类 · 10 错误）

- **files**：`ChatWindow.tsx`（导出 `Message`）、`__tests__/*5 个文件*`
- **do**：`global` → `globalThis`；消息数组标注 `Message[]`
- **verify**：`npx tsc --noEmit` = 0 错误

## T-04 回归（构建 + 测试双绿）

- **verify**：
  - `cd frontend && npm run build`（退出码 0）
  - `cd frontend && npm test`（全绿）
- **失败则**：按 `engineering.md` §2 建红回路，不得改断言迁就实现

## T-05 存量缺陷登记（**不修**，留给下一波）

- **证据（file:line 实测）**：
  - `backend/routes/agents_api.py:84` 的 update 白名单**不含** `system_prompt / role_def / sop`
  - `backend/models/agent.py`（1–60 行）**无这三列**；`to_dict()` 也不返回
  - 但 `frontend/src/pages/AgentDetail.tsx:19,262,266` 在编辑并提交这三个字段 → **用户改了会静默丢失**
- **处置**：本 change 只把类型标注为可选（`T-01`），**不落库、不迁移**；缺陷进 `TASK.md` 待下一波（Agent 能力/指令轮）按 `expand/contract` 补列 + 白名单 + 序列化 + 迁移。
- **理由**：改 schema 需 model+migration+API+UI 同批验证，属独立 task；混进「构建修复」会让波 0 无法一小时验收。
