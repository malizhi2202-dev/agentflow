# CHANGE: 把 multica 的技能 / Agent / 小队搬进 agentflow

- **Change ID**: `v23-multica-import`
- **提出**: 2026-10-25 用户原话
  > 把multical中的skill和agent以及小队都搬到agentflow这个项目
- **范围澄清（用户单选 B）**：连**多文件技能包**一起搬——即给工具库补「技能文件」能力（字段 + 详情区），
  不只是把正文当一条 markdown。

## 源与目标（已实测）

| | multica（本机实例） | agentflow |
|---|---|---|
| 库 | Postgres 17 @ 127.0.0.1:**5433**（`multica` / `multica_dev_pw`） | MySQL 8 @ 127.0.0.1:**3307**（`agentflow`） |
| 技能 | `skill` **30** 条 + `skill_file` **145** 个文件（单技能最多 17 个文件，正文最大 27KB） | `tools`（`type='skill'`）+ 新增 `files_json` |
| Agent | `agent` **38** 条（`instructions` 0～2.7KB；36 个绑 hermes、2 个未绑运行时） | `agents`（人设三件 + 运行时 + 模型） |
| 小队 | `squad` **2** 条 + `squad_member` **34** 个 Agent 成员（2 / 32） | `squads` + `squad_members` |

## 做法

1. **schema**：迁移 `020_tool_skill_files`（`tools.files_json` TEXT，方言无关）+
   `021_tool_skill_files_longtext`（MySQL 拓宽到 MEDIUMTEXT）——真库第一次 `--apply` 就撞到
   `Data too long for column 'files_json'`：某技能正文 + 12 个文件序列化后 >86KB，TEXT 上限 64KB。
2. **后端**：`Tool.files_json` 落 JSON；`tool_service.normalize_files_json` 单点校验
   （path 非空/唯一/≤512、content 必须是字符串、≤200 文件、总 ≤2MB），并把 **`content_md` 真正落库**
   （此前 create/update 都丢正文，技能正文根本存不进去）；非法形状 → **400 + 具体原因**。
   列表接口只给 `files_count`（30 个技能全带文件包会把 `/api/tools` 撑到 1.3MB，实测 1,377,046B），
   详情接口给全文（94,286B）。
3. **前端**：`ToolDetail` 增加「📦 技能文件」区（path + 正文可改、可增删、保存前本地预校验、折叠查看），
   已有技能挂载后按 id 拉详情拿 `files_json`；`ToolMarket` 卡片显示 `N 文件`。
4. **迁移脚本** `scripts/import_multica.py`：`psql --csv` 读源（离线机器不引入 psycopg2）、ORM 写目标，
   **默认 dry-run**、`--apply` 才写、`--update` 覆盖已存在；按 name 幂等；未知/非 Agent 成员**告警不静默**。
5. **真跑**：先 dry-run 对账，再 `--apply`，然后逐字节回读 + 真实 HTTP 验列表/详情。

## 明确不做（如实挂账）

- ~~不迁 `agent_skill` 绑定~~ → **追加轮已迁**（`agent_tools` 关联表 + 绑定接口 + Agent 详情「能力 · 技能」区）。
- ~~不迁 `avatar_url` / `custom_env` / `custom_args` / `mcp_config` / `thinking_level` / `service_tier` /
  `composio_toolkit_allowlist` / `squad_member.role` / `skill.config`~~ → **追加轮已全部迁**（迁移 022/023 + 对应接口）。
- **仍不迁**：multica 的 `workspace` / `daemon_*` / `chat_*` / `comment_*` / `autopilot_*` / `channel_*`
  等平台运行态数据（不属于「技能 / Agent / 小队」三类资产）。
- **不替人决定团队归属**：全体落 `owner_id='admin'` / `owner_kind='personal'` / `team_id=NULL`。
- **不动 multica 侧数据**：只读，不删不改（「搬」= 复制，不是搬家）。
- **不改列表接口的 content_md 体积**：478KB 的 `/api/tools` 是既有行为（正文预览），本次只挡住新增的 1MB 文件包；
  列表瘦身另行排期。
