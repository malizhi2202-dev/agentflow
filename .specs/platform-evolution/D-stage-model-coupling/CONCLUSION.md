# ③ 结论与建议

## 结论

**这不是「要不要阶段模型」的问题，而是「阶段模型写在哪里」的问题。**
「工作流知识产物监控」是 AgentFlow 在 67 个被调研仓库中**唯一的品类独占能力**（护城河③），
**必须保留**；但把它写死在 13 个文件里，会让「不绑定任何开发流程」这句产品定位成为不实陈述。

**核心判断**：阶段模型应当是**产品配置**，不是**产品逻辑**。
配置化的承载物**今天已经存在**（`/api/admin/workflow` + `workflow.json` + 备份轮转），
只是 `scanner` 与前端都不从它读——**这是一处已经建好但没接上的管道**。

## 建议（按执行顺序）

### C1 · 合并两份 scanner 副本 `P0` 难度：中
`backend/scanner.py`(300 行) 与 `backend/runtime/scanner.py`(274 行) 各自维护一套阶段表，
必须**收敛为一份**（`runtime/scanner.py` 改为引用 `scanner.py`，或抽出共享模块）。
- 依据：Multica 的 MUL-3375 正是「删除 handler-local 镜像以防四入口漂移」，处理方式一致。
- **为何是 P0**：双份真相意味着任何阶段调整都要改两处，漏一处即漂移——
  这是当前最容易引入 bug 的结构，且成本低（纯重构，行为不变）。

### C2 · 阶段表抽到配置，`scanner` 从配置读 `P1` 难度：中
把 `STAGES` / `STAGE_FILES` / `ARTIFACTS` / `STAGE_NAMES` 搬到 `workflow.json`，
`scanner.py` 从 `_load_workflow` 读。
- **落点已存在**：`routes/admin_api.py:31-53` 的 `DEFAULT_WORKFLOW` 已含 `stages`(9) 与 `gates`；
  `_load_workflow` / `_save_workflow` / `_backup_file`（保留 5 份）均已实现。
- 需补：**配置 schema 与默认值迁移**（老库无 `workflow.json` 时用默认值生成）。
- 依据：`backend/config.py` 今天**完全没有阶段配置项**，这是「配置层不承认这个概念」的直接证据。

### C3 · 前端 6 处改为读接口 `P1` 难度：中
`ArtifactTab.tsx` / `SearchBar.tsx` / `WorkflowTab.tsx` / `Home.tsx` / `Runtime.tsx` / `SpecsEditor.tsx`
的阶段常量改为从 `GET /api/admin/workflow` 获取。
- 需处理：今天这些是**编译期常量**，改为异步加载后要处理首屏与失败态。
- 依据：Multica `mcp-support.ts:8-31` 的纪律——前端枚举必须与后端对齐，
  且注释明确「否则用户会保存一个运行时静默忽略的值」。**读接口优于对齐注释。**

### C4 · 配置校验：拒绝未知字段，响亮失败 `P1` 难度：低
- `workflow.json` 解析时**拒绝未知字段**（拼写错误不得静默忽略）。
- 阶段配置非法时**一次性列出全部问题**并拒绝启动/保存，而不是静默降级到默认值。
- 依据：Multica `manifest.go:356-387`（`DisallowUnknownFields` + 拒绝尾随 JSON）与
  `capabilities.go:70-100`（「**fails installation loudly** — a silently ignored contribution
  would look installed and never fire」）。
- **当前缺口**：`_load_workflow` **未见校验逻辑**——这是一个具体、可验证的缺口。

### C5 · `_detect_phase` 的未知态处理 `P1` 难度：低
今天 `_detect_phase` 是「文件存在性驱动，最后一个命中者胜出」。
建议：配置损坏或产物命名异常时**保持上一状态或标记为未知**，
**不得静默推断出一个阶段**。
- 依据：Multica `issuestatus.Effective()`「**不可解析就原样返回**，永不被误当成该清扫/该触发」；
  `dispatch/reason.go` 的枚举安全同源——**无法判断时不得推断出更危险的那一侧**。
- 为何重要：阶段推断错误会让「进度」这个核心指标失真，而进度是护城河③的价值所在。

### C6 · 配置版本迁移 `P2` 难度：低
配置结构变更时能识别版本并迁移（`pruneConfig` 思路：删除新结构已无的字段）。
- 依据：Multica 插件升级时 `pruneConfig` 删除孤儿字段，理由「unreachable residue is ciphertext」。

## 明确不做（本轮）

- **不做完整流程引擎（BPMN 式）**：严重过度设计。参照 Multica 明确表态
  「This is **not** a workflow engine」——阶段模型应是配置，不是引擎。
- **不移除阶段概念**（方案 D）：那会砍掉唯一的品类独占能力（护城河③）。
  目标是「可配置」，不是「不存在」。
- **不把阶段枚举放进 DB CHECK 约束**：Multica 的教训是这类约束随迁移被删、
  且会让「加一个阶段」变成一次数据库迁移。权威应在配置文件。

## 与路线图的对应

本结论 = 产品文档 §1.6 **P1-3（知识产物监控升级为可配置流程模型）** +
§1.5.2 护城河③（知识产物监控）+ §1.4「不绑定任何开发流程」的落实。
目标形态原型见产品文档 **§6.19（阶段模型配置）**。
