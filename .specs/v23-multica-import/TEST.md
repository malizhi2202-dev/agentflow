# TEST: multica → agentflow 迁移（技能含文件包 / Agent / 小队）

- **Change ID**: `v23-multica-import`
- **口径**：只认「自跑输出 + 退出码」；`exit 0 ≠ 断言命中`，故贴命令、计数与回读。

---

## 1. 迁移脚本：dry-run 对账（不写库）

```bash
cd /home/malizhi/ai/agentflow
DATABASE_URL="mysql+pymysql://root@127.0.0.1:3307/agentflow" \
  /home/malizhi/ai/agentflow-data/venv/bin/python scripts/import_multica.py
```

结果：

```
[import] 源：技能 30 · Agent 38 · 小队 2 · 技能文件 145
  tools_created 30 · agents_created 38 · squads_created 2 · members_added 34
[import] 目标库现状：技能 0 · Agent 0 · 小队 0 · 小队成员 0
[import] dry-run：没有写库，加 --apply 才真写
```

## 2. 真写（--apply）与幂等复核

```bash
DATABASE_URL=... python scripts/import_multica.py --apply    # 第一次
DATABASE_URL=... python scripts/import_multica.py --apply    # 第二次（应全 skip）
DATABASE_URL=... python scripts/import_multica.py --apply --update   # 覆盖路径
```

| 跑法 | tools | agents | squads | members |
|---|---|---|---|---|
| 第 1 次 `--apply` | created 29 + skipped 1（第 1 次在建 `bmad-prd` 时撞到 TEXT 上限中断，见 §3） | created 38 | created 2 | added 34 |
| 第 2 次 `--apply` | created 0 / **skipped 30** | created 0 / **skipped 38** | created 0 / **skipped 2** | 0（小队已存在则不重入池） |
| `--apply --update` | **updated 30** | **updated 38** | **updated 2** | skipped 34 |

终态（脚本自报 + 生产库回读一致）：**技能 30 · Agent 38 · 小队 2 · 小队成员 34**。

## 3. 真库撞到并修掉的缺陷（不是设计推演）

第一次 `--apply` 直接失败：

```
sqlalchemy.exc.DataError: (pymysql.err.DataError) (1406, "Data too long for column 'files_json' at row 1")
[SQL: INSERT INTO tools (... files_json ...) ... 'name': 'bmad-prd' ...]
```

原因：`files_json` 建列时用的是 TEXT（MySQL 上限 **65,535 字节**），而 `bmad-prd` 的正文 + 13 个文件
序列化后 >86KB。修法：新增迁移 `021_tool_skill_files_longtext`（仅 MySQL、当前列不是 mediumtext/longtext 时
`ALTER TABLE tools MODIFY COLUMN files_json MEDIUMTEXT`），文件内容不变：

```
[migrate] 已应用 1 个迁移: 021_tool_skill_files_longtext
information_schema: column_type=mediumtext
```

## 4. 逐字节回读核对（30 个技能全量，不抽样）

拿 multica 的 `skill` + `skill_file` 与 agentflow 的 `tools.content_md` + `tools.files_json` 逐键比对：

```
技能逐字节一致：30/30（不一致 0）
目标行数： {'agents': 38, 'squads': 2, 'squad_members': 34}
小队 leader： [('数据小队', '数据架构师'), ('研发交付小队', '交付总调度')]
```

`--apply --update` 之后再跑一遍：**30/30 一致**。

## 5. 真实 HTTP（真 MySQL + 真后端，会话 cookie）

```bash
curl -b cookie 'http://127.0.0.1:8000/api/tools?type=skill'      # 30 条
curl -b cookie 'http://127.0.0.1:8000/api/tools/3'                # bmad-ux，17 个文件
```

| 断言 | 实测 |
|---|---|
| 技能总数 | `total = 30` |
| 列表载荷 | 带 `files_count=17`，`files_json=[]`，响应 **477,969 B**（改前把文件全文塞进列表是 **1,377,046 B**） |
| 详情载荷 | `files_json` 17 条，**94,286 B**，第一个 path `assets/color-themes.md` |
| Agent | `total = 38`；`runtime=hermes` 36 条 + `custom` 2 条，`model_provider=cli`，`model_name` 仅「交付总调度」= `minimax/MiniMax-M3` |
| 小队 | 2 条：`数据小队`（slug `multica-squad-1`，leader 数据架构师，2 成员）、`研发交付小队`（slug `multica-squad-2`，leader 交付总调度，32 成员） |

## 6. 浏览器实测（真前端 5173 + 真后端 + Playwright headless）

脚本 `/tmp/verify_skill_files.js`（截图 `/tmp/v23-shots/01..03`），输出：

```
CHIP=1 文件
REGION=📦 技能文件（17）
FILE_ROWS=17
FILE_BODY_CHARS=1080
PAGE_ERRORS=none
```

即：工具库卡片出现「N 文件」角标 → 点开 `bmad-ux` → 技能文件区显示 17 个文件 → 展开第一个文件正文
1080 字符 → 控制台无报错。**截图我本人无法查看**（当前模型不支持图像输入，只验证了 DOM 断言与文件尺寸
1440×900 / 171KB），所以视觉层面只到「元素存在且可见」这一层，未做像素级人工点检。

## 7. 单测

```bash
cd backend && /home/malizhi/ai/agentflow-data/venv/bin/python -m unittest \
  tests.test_tool_skill_files tests.test_import_multica \
  tests.test_agent_model_from_runtime tests.test_runtime_daemon
```

结果：`Ran 54 tests ... OK`

| 文件 | 用例 | 覆盖 |
|---|---|---|
| `tests/test_tool_skill_files.py` | 14（TF-01..TF-14） | 文件包校验（path/唯一/上限）、创建/更新落库、`content_md` 落库、非法 400、越权 404、列表只给 `files_count`、迁移 020 幂等 |
| `tests/test_import_multica.py` | 13（IM-01..IM-13） | 模型名 `provider:id → provider/id`、运行时映射、slug 派生（中文兜底/撞名/正则）、skill/agent 载荷映射 |
| `tests/test_agent_model_from_runtime.py` | 11 | 上一 change 的 provider 推导（不回归） |
| `tests/test_runtime_daemon.py` | 16 | daemon 模型目录兜底（不回归） |

## 8. 前端门禁

| 门 | 命令 | 结果 |
|---|---|---|
| 类型 | `npx tsc --noEmit` | exit 0（无输出） |
| 用例 | `npx vitest run` | **16 files / 155 tests passed**（新增 `tool-skill-files.test.tsx` 8 条：TS-01..TS-08） |
| 构建 | `npm run build` | `✓ built in …`，exit 0 |

## 9. 未做 / 未迁（如实登记）

- **未迁**：`agent_skill` 绑定、`avatar_url`/`custom_env`/`custom_args`/`mcp_config`/`thinking_level`/
  `service_tier`/`composio_toolkit_allowlist`、`squad_member.role`、`skill.config`（目标表无对应列，见 CHANGE）。
- **未做**：像素级人工点检（截图无法自查）、`/api/tools` 列表瘦身（478KB 的 `content_md` 是既有行为）。

---

## 10. 追加轮：把「没迁的」也全部迁移（用户「都迁移」）

### 10.1 源侧实测量（决定要不要建列）

```sql
select count(*) from agent_skill;                                        -- 104（覆盖 29 个技能 / 35 个 Agent）
select count(*) from agent where avatar_url is not null;                 -- 38（全是 `emoji:🧠` 形态）
select count(*) from agent where custom_env::text <> '{}';               -- 0
select count(*) from agent where custom_args::text <> '[]';              -- 0
select count(*) from agent where mcp_config is not null;                 -- 0
select count(*) from agent where thinking_level is not null;             -- 0
select count(*) from agent where service_tier is not null;               -- 0
select count(*) from agent where composio_toolkit_allowlist is not null; -- 0
select count(*) from skill where config::text <> '{}';                   -- 0
select role, count(*) from squad_member group by 1;                      -- leader 2 / member 20 / expert-reviewer 12
```

### 10.2 新增 schema 与接口

| 迁移 | 内容 |
|---|---|
| `022_tool_config_and_squad_role` | `tools.config_json` TEXT + `squad_members.role` VARCHAR(32) |
| `023_agent_extra_fields` | `agents.avatar_url/custom_env/custom_args/mcp_config/thinking_level/service_tier/composio_toolkit_allowlist` |
| `024_agent_tools` | `agent_tools`（`agent_id`,`tool_id`，唯一键）+ 两个索引 |

接口：`GET/POST /api/agents/{id}/tools`、`DELETE /api/agents/{id}/tools/{tool_id}`；Agent `to_dict`/创建/更新
都带上新增字段；`SquadMember.to_dict` 带 `role`；`Tool.to_dict` 带 `config_json`。

### 10.3 真跑 + 回读（真 MySQL）

```
[import] 源：技能 30 · Agent 38 · 小队 2 · 技能文件 145
  tools_updated 30 · agents_updated 38 · squads_updated 2 · members_skipped 34
  tool_links_added 104 · tool_links_skipped 0
[import] 目标库现状：技能 30 · Agent 38 · 小队 2 · 小队成员 34 · 技能绑定 104
```

逐项回读（按**名字**对，不按 uuid）：

| 断言 | 结果 |
|---|---|
| 绑定集合与源完全一致 | **True**（源 104 / 目标 104；只在源 0，只在目标 0） |
| `avatar_url` 非空 | 38（值原样：`emoji:🚀` / `emoji:🦄` / `emoji:🦁` …） |
| `custom_env` / `custom_args` | 38 行 `{}` / `[]`（源侧就是空值，未伪造内容） |
| `mcp_config` / `thinking_level` / `service_tier` / `composio_toolkit_allowlist` | 全 NULL（源侧空） |
| 小队成员 `role` 分布 | `{leader: 2, member: 20, expert-reviewer: 12}`（= 源） |
| `tools.config_json` 非空 | 0（源侧 30 条全空对象） |

真实 HTTP：

```
GET /api/agents/6/tools         → 4 条：kit-automation / kit-entry / kit-roles / kit-rules
（multica 侧「交付总调度」绑的正是这 4 个 —— 名字逐一对上）
GET /api/squads                 → 数据小队 {leader:1, member:1}；研发交付小队 {leader:1, member:19, expert-reviewer:12}
```

浏览器实测（真前端，Playwright）：

```
REGION=🧩 能力 · 技能（4）
CHIPS=4
PAGE_ERRORS=none
```

### 10.4 单测

```bash
cd backend && python -m unittest tests.test_agent_tools_and_fields tests.test_tool_skill_files tests.test_import_multica
```

`tests/test_agent_tools_and_fields.py` 新增 10 条（AT-01..AT-09，含绑定幂等/越权 404/解绑 404/字段回填/
成员角色/工具 config/022-024 幂等）；`tests/test_import_multica.py` 增到 17 条（IM-14..IM-17：JSON 文本解析、
emoji 头像截断、空配置落 None、skill.config → config_json）。

### 10.5 仍不迁的只剩「非三类资产」

multica 的 `workspace` / `daemon_*` / `chat_*` / `comment_*` / `autopilot_*` / `channel_*` 等**平台运行态**数据
不属于「技能 / Agent / 小队」，不在本次范围（不是漏迁）。
