# REVIEW · v20-wave0（6-review 压缩：功能轮 + 回归登记）

> 豁免：UI 轮（无 UI 变更）、性能轮（无热路径改动）、安全轮（无鉴权/输入面改动）。理由见 `CHANGE.md` §四。

## 一、功能轮

| 维度 | 结论 | 依据 |
|---|---|---|
| **正确性：类型是否与真实契约一致** | ✅ 除 T-05 三项外一致 | `Project.orchestration_id` ↔ `backend/models/project.py:19,31`；`Agent.workflow_ids` ↔ `agent.py:24` |
| **诚实性：不确定的字段** | ✅ 标为可选并加注释 | `role_def / system_prompt / sop` 后端无列（`agent.py` 全文无此三列、`to_dict()` 不返回）→ 类型可选 + `// 后端暂未落库 → T-03 待修` |
| **行为等价** | ✅ | diff 仅四类：补类型字段、闭包内重新收窄、提取常量、`global`→`globalThis` |
| **边界：闭包收窄** | ✅ 三处逐一处理 | `ToolMarket`（`f.name` → `fileName`；`deleteId` 内重判）；`AgentBuilder`（同）；`WorkflowCreate`（`wf.id` → `wfId`） |
| **边界：可选链二次解引用** | ✅ | `ProjectDetail`：`orchId = project?.orchestration_id ?? null`、`modelTotals = metrics?.model_totals ?? {}` |
| **可读性** | ✅ | 新增 4 处行内注释说明「为何可选」「为何提取」，未引入魔法值 |
| **测试充分性** | ✅ 编译修复类 | 52 个既有用例全绿；本 change 无新逻辑，不新增假用例（避免为通过而写测试） |

## 二、越界比对（TASK write_files vs 实际 diff）

基准 `git diff --name-only`（提交前）：12 个文件，全部在 `CHANGE.md` §三「触碰模块」清单内；**零 `backend/` 改动、零 `tsconfig`/`package.json` 改动、零 UI 文案改动**。

## 三、遗留风险（不隐藏）

1. **T-05 数据丢失（高）**：`AgentDetail` 编辑的 `system_prompt / role_def / sop` **后端不落库**——用户保存后刷新即丢。本 change 只让类型编译通过，**未修**。下一波（Agent 能力/指令）必须按 expand/contract 补列 + update 白名单 + `to_dict` + 迁移，并补「保存→刷新→仍在」用例。
2. **T-05 变体**：`AgentDetail` 的 `sop` 字段同样未被任何后端逻辑消费，需在下一波确认是「待实现」还是「该删」。
3. **构建产物被 git 跟踪**：`frontend/dist/`、`frontend/node_modules/` 仍在版本库中（P0-5）；本 wave 只还原、未治理。
4. **`ProjectDetail` 的 monitor 块**处于 `tab === 'monitor' && false`（死代码）。本次仅做类型收口，未删除——删除属清理任务，另立。

## 四、裁决

**功能轮通过**（构建 + 回归双绿、diff 未越界、遗留项已登记）。可提交。
