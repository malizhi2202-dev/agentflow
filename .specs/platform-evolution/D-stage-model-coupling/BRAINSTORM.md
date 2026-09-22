# ① 头脑风暴

## 问题定义

产品定位写明「**不绑定任何特定的开发流程或框架**」（CLAUDE.md 与产品文档 §1.4），
但 **9 阶段与产物文件名硬编码在 13 个文件里**。

### 事实依据

**① 硬编码分布（13 个文件）**——`grep -rl "0-change" --include=*.py --include=*.ts --include=*.tsx backend frontend/src`

| 层 | 文件 | 硬编码内容 |
|---|---|---|
| 后端 | `backend/scanner.py` | `STAGES`(9) / `STAGE_FILES` / `ARTIFACTS` / `STAGE_NAMES`（中文名） |
| 后端 | `backend/runtime/scanner.py` | **另一套完整阶段表**（274 行近似副本） |
| 后端 | `backend/runtime/adapter.py` | 阶段判定 |
| 后端 | `backend/routes/admin_api.py` | `DEFAULT_WORKFLOW` 的 9 个 stage + gates |
| 后端 | `backend/routes/search.py` | 阶段过滤 |
| 后端 | `backend/routes/change_detail.py` | 阶段聚合 |
| 前端 | `components/ArtifactTab.tsx` | 产物 → 阶段映射 |
| 前端 | `components/SearchBar.tsx` | 阶段筛选选项 |
| 前端 | `components/WorkflowTab.tsx` | 阶段展示 |
| 前端 | `pages/Home.tsx` | 阶段统计 |
| 前端 | `pages/Runtime.tsx` | 阶段标签 |
| 前端 | `pages/SpecsEditor.tsx` | 阶段编辑 |

**② `backend/scanner.py:12-21`** 硬编码：`STAGES`（9 个）、`STAGE_FILES`、`ARTIFACTS`、`STAGE_NAMES`。
`_detect_phase` 是**文件存在性驱动**（最后一个命中者胜出），如 `T01-SUMMARY.md` / `T00-SUMMARY.md` → `4-dev`。

**③ `backend/config.py` 无任何阶段/产物配置项**——配置层完全没有这个概念。

**④ 两份近似副本**：`backend/scanner.py`(300 行) 与 `backend/runtime/scanner.py`(274 行)
**各自维护一套阶段表**。这是双份真相，任何阶段调整都要改两处。

**⑤ 已有落点未被用起来**：`GET/PUT /api/admin/workflow` + `workflow.json`
（`routes/admin_api.py:31-53` 的 `DEFAULT_WORKFLOW` 已含 `stages`(9) 与 `gates`），
即**配置化的承载物已经存在，但 scanner 与前端都不从它读**。

## 为什么这是问题（三层）

1. **定位矛盾**：对外说「不绑定任何开发流程」，实际 9 阶段写死在代码里。
   任何用户想用「需求 → 开发 → 测试」三段流程，都得改源码。
2. **R15 五层漂移**：同一概念（阶段）散落在**代码 / 原型 / 活文档 / 决策 / 执行**五层，
   改一处必然漏几处。今天已经能看到后果：两份 scanner 副本。
3. **产品化障碍**：阶段模型是「产品配置」而非「产品逻辑」，
   写死在代码里意味着每加一种流程都要发版。

## 发散：可选方案

### 方案 A · 全部改为从 `workflow.json` 读取（**推荐**）
把 `STAGES`/`STAGE_FILES`/`ARTIFACTS`/`STAGE_NAMES` 从代码搬到配置文件，
`scanner.py`、`runtime/scanner.py`、前端 6 处全部从 `GET /api/admin/workflow` 读。
- 优点：**落点已存在**（`/api/admin/workflow` + `workflow.json` + `_load_workflow`/`_save_workflow` 已实现，
  含 5 份备份轮转）；改动集中在「读」侧；用户可自定义流程而不改源码。
- 缺点：前端需处理异步加载阶段表（今天编译期就有常量）；需定义配置 schema 与默认值迁移。
- 判断：**是**。这是唯一让「不绑定流程」从口号变成事实的方案。

### 方案 B · 保留硬编码，但收敛到单一模块
只把两份 scanner 合并为一份，仍硬编码。
- 优点：改动最小，消除双份真相。
- 缺点：**没有解决定位矛盾**——用户仍不能自定义流程。
- 判断：**作为方案 A 的第一步**（合并副本），但不作为终局。

### 方案 C · 引入完整流程引擎（BPMN 式）
- 判断：**否**。严重过度设计。参照 Multica 的明确表态：
  「This is **not** a workflow engine」——阶段模型应是**配置**，不是引擎。

### 方案 D · 彻底移除阶段概念
不做阶段，只做「产物文件监控」。
- 优点：最通用。
- 缺点：**丢掉了产品的差异化护城河③**（工作流知识产物监控，67 个仓库中无一涉及）。
  阶段模型正是这项能力的价值所在——它把散落的文档变成可观测的进度。
- 判断：**否**。要保留能力，只去掉硬编码。

## 关键设计约束

| 约束 | 来源 | 说明 |
|---|---|---|
| **扩展点的权威应在常量/配置，不在 DB CHECK 约束** | Multica：`pkg/plugincontract/manifest.go` 的 surface/trigger/transport 枚举是 Go 常量，DB CHECK 随迁移被删 | 阶段枚举应在一个地方权威定义 |
| **前端枚举必须显式声明与后端对齐** | Multica `packages/core/agents/mcp-support.ts:8-31`：「The MCP config tab is hidden for every other provider… **Keep this list in sync with the backends**」 | 前端 6 处阶段引用需此纪律 |
| **配置必须有默认值与迁移路径** | 现有 `workflow.json` 已有 5 份备份轮转（`_backup_file`） | 用户改坏配置要能恢复 |
| **扫描判定不能只依赖文件存在性** | `_detect_phase` 是「最后一个命中者胜出」 | 并发写入下不可靠，应结合 `workflow.json` 的显式阶段状态 |

## 初步判断

**方案 A 为主，方案 B 为其第一步**（先合并两份 scanner，再抽到配置）。
顺序：**先合并副本（消除双份真相）→ 再抽配置（消除硬编码）→ 再让前端读接口（消除前端硬编码）**。
方案 D 明确否——阶段模型是护城河③的载体，不能为了「通用」而砍掉差异化能力。
