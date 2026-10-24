# CHANGE: 遗留小项收口（压缩路径 0→3→4→6）

- **Change ID**: v20-ui-polish · 2026-10-24 · 规模 small（~200 行）· **显式声明压缩路径豁免**（SKILL §1.2：50–150 行档；本条跨前后端但每项 < 50 行）

## Why
三处 v2 遗留 + 一处数据回填工具，都是"看得见的小窟窿"：熔断只能复位不能手动触发、Tabs 只能 Tab 键移焦、
可改面只能走 API 建、历史小队 `created_by` 为空只能管理员改。

## What（最小需求 / AC）
| AC | 判据 |
|---|---|
| AC-1 | 治理区可**手动熔断**（选熔断器 + 填原因，空原因按钮禁用），成功提示；错误透传 |
| AC-2 | 记忆中心 Tabs 支持 **←/→ 切换**，且 roving tabindex（仅当前 tab `tabIndex=0`） |
| AC-3 | 管理员可在提案 tab **新建可改面**（名称 + 逗号分隔白名单），禁改前缀说明在表单内 |
| AC-4 | 回填脚本 `scripts/backfill_squad_creator.py`：默认 dry-run；`--apply` 必须带 `--owner`；幂等；回填后 creator 能写 |

## 最小设计 / 触碰模块
- `frontend/src/pages/Memory.tsx`（3 处 UI）· `frontend/src/stores/rsi.ts`（`createSurface`）
- `backend/scripts/backfill_squad_creator.py`（新）· `backend/tests/test_backfill_squad_creator.py`（新）
- 测试：`frontend/src/__tests__/memory-page.test.tsx` 追加 3 条

## 范围排除
团队页 Tabs 方向键（另一文件，下次）；trip 的审计（后端无该端点）；surface 编辑/删除（后端无）。

## 验收线
三条新用例 + 回填 2 条用例全绿；tsc/vitest/build/后端全量同基线。
