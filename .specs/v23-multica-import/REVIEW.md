# REVIEW: multica → agentflow 迁移

- **Change ID**: `v23-multica-import`
- **审法**：先看源码/真库，再实现，然后用**真库真跑**反过来打自己的实现（有 4 个缺陷是这么被抓到的）。

---

## 1. 实现中自己抓到并已修

| # | 缺陷 | 怎么发现的 | 修法 |
|---|---|---|---|
| R1 | 读源 SQL 用了 `squad.created_by`，multica 实际列名是 `creator_id` | 第一次 dry-run 直接报 `ERROR: column "created_by" does not exist` | 改列名；顺带把 `--csv` 读源失败按 `SystemExit` 报出（不吞） |
| R2 | `files_json` 用 TEXT 落列，MySQL 上限 64KB；`bmad-prd`（正文 + 13 文件 > 86KB）写入即 `Data too long` | 第一次 `--apply` 失败在第 2 个技能 | 新增迁移 `021` 把该列拓宽到 `MEDIUMTEXT`（仅 MySQL、幂等）；服务层上限（2MB）保持不变 |
| R3 | 列表接口把 `files_json` 一起返回——30 个技能实测 **1,377,046 B** | 迁移后直接量 `/api/tools?type=skill` 的 `size_download` | `Tool.to_dict(with_files=False)`：列表只给 `files_count`，详情才给全文（现 477,969 B / 94,286 B） |
| R4 | **`content_md` 从来没落库**：`create_tool` / `update_tool` 的字段清单里都没有它 | 写 `files_json` 校验时顺手看 create/update 才发现；意味着迁移只搬文件的话正文会全丢 | 两处都补上 `content_md`；新用例 TF-07/TF-10 锁死 |

## 2. 发现但不在本 change 范围（挂账）

| # | 事实 | 影响 | 建议 |
|---|---|---|---|
| L1 | `/api/tools` 列表仍 478KB：`content_md` 全文（最多 27KB/条）跟着列表走，是**既有**行为 | 工具库页首屏偏慢（尤其内网） | 列表改为 `content_preview`（前 200 字符），详情取全文；前端 ToolDetail 已具备按 id 拉详情的能力，可直接复用 |
| L2 | **技能 ↔ Agent 绑定没迁**：multica 有 `agent_skill`，agentflow 没有关联表 | 30 个技能进库了，但不会自动挂到任何 Agent；用户要手动关联（目前也无入口） | 另立 change：`agent_tools` 关联表 + Agent 详情「能力 · 技能」区（原型 `.specs/product-design/prototype/agents__new.html` §5 已画） |
| L3 | 迁入的 2 个 Agent（runtime=`custom`，multica 里没有 runtime_id）在 agentflow 里选不了模型也聊不了 | 打开详情会看到运行时=「当前值 · 未被发现」 | 在 Agent 详情里手动选 dsh/hermes 即可；导入侧不替用户猜运行时（**故意的**） |
| L4 | `squad_members.role`（leader / member / expert-reviewer）丢了 | 小队的「外部评审者」角色语义在 agentflow 里没有承载 | 若产品需要，先加 `role` 列再回填；当前如实记在 CHANGE「不迁」清单 |
| L5 | `agent_probe_latest` / `conversations` 对 `agents` 的 FK 是 `NO ACTION` → `DELETE /api/agents/{id}` 500 | 删有会话/探针的 Agent 会报 500（上一 change 已记 L6） | 需产品裁定：级联删 / 软删 / 409 + 文案 |

## 3. 安全与边界

- **只读源**：脚本只对 multica 执行 `SELECT`（`psql --csv`），不写不改；`--apply` 只影响目标库。
- **不落凭据**：导入不写 `api_key_encrypted`（空串），provider 由 `services/agent_channel` 推导（CLI → `cli`）。
- **文件包校验单点**：`normalize_files_json` 同时被 API 与导入脚本使用（path 非空/唯一/≤512、≤200 文件、≤2MB），
  非法 → 400 + 具体原因；导入侧则**跳过并告警**，不中断整批。
- **告警不静默**：非 Agent 成员、leader 未迁移、文件包超限都打 `[import] ⚠` 列表，不假装迁成功。

## 4. 结论

- **已实施**：schema（020/021）、后端字段与校验、列表/详情载荷分离、前端技能文件区与文件数角标、
  导入脚本（dry-run/--apply/--update 幂等）、真库迁移 30/38/2/34、逐字节核对、浏览器实测。
- **未实施（挂账）**：见 §2 的 L1–L5。
