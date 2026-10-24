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

---

## 五、P0-8 追加复审（T-06）

| 维度 | 结论 | 依据 |
|---|---|---|
| 失败语义翻转 | ✅ 旧「静默跳过」→ 新「失败即抛 + 不落账」 | `test_failure_is_not_recorded` |
| 幂等 | ✅ 重跑 `[]`、账本行数不变 | `test_idempotent_second_run` |
| 新库/老库同路径 | ✅ 幂等基元「先查后改」，不写分支 | `test_fresh_db_applies_all` + `test_legacy_db_expands` |
| 方言正确性 | ✅ 显式传 `dialect`，不按连接类名猜 | `test_works_through_proxy_connection`（代理对象） |
| 依赖 | ✅ 纯标准库；未引入 Alembic | `requirements.txt` diff 空 |
| 只增不减 | ✅ 5 个迁移全为 expand（加列/建表/建索引） | `MIGRATIONS` 清单 |
| 遗留 | ⚠ MySQL 端到端未验（本机无依赖）；MySQL 建表未写外键约束（SQLite 的 inline REFERENCES 在 MySQL 无效），靠应用层 | 已在 REVIEW 明写 |

---

## 六、P0-6/P0-7 追加复审（T-07）

| 维度 | 结论 | 依据 |
|---|---|---|
| 单一事实源 | ✅ 默认值只剩 `stage_config.DEFAULT_WORKFLOW` 一份（admin_api 副本已删） | `grep -c "DEFAULT_WORKFLOW = {"` = 1 |
| 两份扫描器合一 | ✅ 本地 `STAGE_FILES/STAGE_NAMES` 删除，改取属性（热更新可达） | 10 号用例 + `hasattr` 断言 |
| 热更新 | ✅ admin PUT → `validate` → 落盘 → `apply()`；scanner/前端立即生效 | `routes/admin_api.py` update_workflow |
| 响亮失败 | ✅ 非法配置 400 且**不写盘**；`apply` 失败不改旧快照 | `test_rejects_missing_or_bad` / `test_invalid_apply_keeps_old_snapshot` |
| 首屏不阻塞 | ✅ 前端先渲染 `DEFAULT_STAGES`，fetch 失败只记 `error` 不弹窗 | `stores/stageConfig.ts` |
| 类型诚实 | ✅ 自定义阶段 `file=null`，不猜文件名 | `normalizeStages` 用例 |
| **越界** | ⚠ `WorkflowTab` 的 `what/tasks`（编辑性文案）仍硬编码 —— 配置 schema 无此字段，**刻意不塞**；若要做，属下一轮「阶段配置 v2」 | REVIEW 明写 |
| 遗留 | ⚠ 后端集成测试未实跑（依赖装不上），`GET/PUT` 端到端只做了静态审查 | 同波 0 既有边界 |
