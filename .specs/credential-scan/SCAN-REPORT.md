# 凭据泄露调查报告 — agentflow git 历史

> **未过审 · 调查产物**（只读历史扫描，2026-09 时点；未经人工审核门，禁止直接引作结论性工件）
> 调查范围：本地 clone 可见的全部 git 历史（main + 3 个已推送 origin/agent/* 分支，共 56 commits）。
> 方法：`git rev-list --all --objects` 全路径枚举 + `git grep` 跨全部 56 rev 的多模式内容扫描 + 专项 blob 转储。未做任何 git 写操作。

## 结论（三行）

1. **未发现真实凭据泄露**：全历史 56 个 rev（node_modules 排除后 588 个唯一路径）中，所有 `sk-` / `xoxb-` / `ghp_` / webhook / ENCRYPTION_KEY 命中均为测试占位符、mock 值或压缩产物误匹配；`users.json`、`.env`、`*.pem/*.key/id_rsa/.npmrc` 类文件**从未以对象形式出现在任何历史中**。置信度：高。
2. **最高风险项（非泄露）**：`backend/services/encryption_service.py:12` 短密钥 `ljust(32,"0")` 零填充、无 KDF —— 这是**代码强度缺陷**而非凭据入库；若生产 `ENCRYPTION_KEY` 曾弱/短，密文可被暴力还原，但历史本身不暴露该值。次级：提交元数据含个人邮箱 `malizhi@360.cn`（隐私暴露，非凭据）。
3. **建议动作**：无需紧急轮换任何"已入库凭据"（因为没有）；改为 ①核查生产 `ENCRYPTION_KEY` 是否短/弱（是则轮换并修 KDF），②仓库开启 GitHub Secret Scanning/push protection，③（可选）以 gitleaks 补扫二进制 blob 与 PR refs 作二次确认。

## 高置信泄露清单

**（空）** —— 无一条命中"形似真实服务商 key/token/webhook 私钥"的凭据。

## 中低置信与误报样本（各一句）

- `sk-1234567890abcdef`（`.specs/agent-control-plane/_test_functional.py:33` 等）— 脱敏函数单测的合成样例，**误报**。
- `xoxb-123-456-789`、`xoxb-test`、`app_secret: "very-long-secret-key-12345"`（`backend/tests/test_round6_api_edges.py:138-139` 等）— Slack 样式测试假值，**误报**。
- `oapi.dingtalk.com/robot/send?access_token=xxx`（`ChannelConfig.tsx:16` placeholder、`test_agent_channel.py:264`）— UI 占位/测试 URL，token 段为字面 `xxx`，**误报**。
- `ENCRYPTION_KEY="your-32-byte-key"`（`README.md:234`）— 文档示例占位符，**误报**。
- `"test-key-for-ci-32bytes!!"`（6 个 `backend/tests/*.py` 的 `os.environ.setdefault`）— CI 测试专用密钥；仅当生产恰好复用此值才构成风险，历史无法证明，列为**低置信观察项**。
- `mock_app_secret` / `mock_access_token_<uuid>`（`backend/services/oauth_mock.py:50-52`）— 明确命名的 mock，**误报**。
- `password: '123456'`（`frontend/src/pages/UserManagement.tsx:25`）— 与 CLAUDE.md 记载一致的默认演示口令前端表单初值，文档已公开声明，不算泄露（属产品缺陷）。
- `frontend/dist/assets/index-*.js/css` 中 `sk-stroke-color-props` 等 — react-flow CSS 变量名压缩后恰好命中 `sk-[a-z-]{16,}` 正则，**误报**（已用 `-o` 提取匹配子串核实）。
- `api_key: ''`、`api_key = payload.get(...) or "not_set"`、`decrypt(agent.api_key_encrypted)` — 均为空串/运行时读取路径，真实 LLM key 只进数据库（`*.db*` 在 .gitignore 且从未入库），**误报**。
- `backend/data/audit.jsonl`（d5a70feb 入库，仍在 HEAD）— 审计事件演示数据，全文无 key/token/secret 字样，含 `admin/管理员` 用户名（非机密），**低危数据入库**而非凭据泄露。
- `backup/CHANGE.md.20260702-183905` — 24 字节 `# TEST EDIT\n保存成功`，无害。
- `.specs/small-model-decisions/runtime.jsonl` — 纯流程事件日志，无凭据字段。

## 覆盖度声明

- **rev 覆盖：100%，非抽样** —— `git rev-list --all` = 56 rev（含 origin/main 与 3 个 origin/agent/* 分支的全部提交；main 仅 5 个，其余 50+ 个独有内容全在已推送的 agent/* 分支上，均已扫）。
- **模式集**：`sk-[A-Za-z0-9_-]{16,}`、`sk-proj-`、`ghp_/gho_/github_pat_`、`xox[bap]-`、`AKIA`、`LTAI`、`AIza`、`sk-ant-`、`glpat-`、`BEGIN …PRIVATE KEY`、`Bearer {25,}`、`api_key|secret|password|token|webhook|ENCRYPTION_KEY = 引号值`、`access_token=[20,]`、URL query token、32+位 hex/base64 长串、`ssh-rsa AAAA`、client_secret —— 全部作用于非 node_modules 路径。
- **文件名覆盖**：`rev-list --all --objects` 全历史路径（含 node_modules）中 `.env*`、`users.json`、`id_rsa/*id_ed25519`、`*.pem/*.key/*.p12/*.pfx/*.jks/.htpasswd/.npmrc` **零命中**。
- **node_modules**：35,517 个跟踪文件，自 d5a70feb 引入、仅 `.vite/deps/_metadata.json` 在 40ff2151 变化，故对 HEAD 树全量扫高精度凭据模式（PRIVATE KEY/sk-28+/ghp-/AKIA/xoxb-/glpat-）= 0 命中；`git grep -I` 跳过二进制，**node_modules 二进制包内嵌凭据未逐字节扫**（依赖自带 fixture 即使存在也属 npm 公开内容，非本仓泄露）。
- **漏区风险**：① GitHub 远端可能有本地未 fetch 的 refs（PR heads `refs/pull/*`、已删分支的服务端残留），API 匿名查询被限流、未能枚举远端分支清单——如远端仅这 4 个分支则无漏；② 不可达对象（以 SHA 直推的悬空 blob）无法从本地历史证明不存在；③ 非压缩产物中的低熵真实口令（如明文 `secret=Abc12345!` 类无厂商标记的值）不在模式覆盖内。
- 工作区/远端推送配置：origin 为 SSH URL，token 不入库；提交作者邮箱 `malizhi@360.cn` 公开可见（隐私暴露，已列入处置）。

## 轮换/处置建议（逐项）

| # | 项 | 建议 |
|---|---|---|
| 1 | 任何服务商 API key / 平台 token / webhook | **无需轮换**（无证据入库）；若你个人记忆中存在"曾在某次测试里用过真 key"的实例，告知后可按 blob 精查 |
| 2 | 生产 `ENCRYPTION_KEY` | **观察→条件轮换**：确认其长度≥32 且非 `test-key-for-ci-32bytes!!`/弱口令；短/弱则视同已泄露处理并轮换，同时修 `encryption_service.py` 零填充为 HKDF/PBKDF2 |
| 3 | 平台账号口令（admin/123456） | **立即处置**：这不是 git 泄露，但 fail-open 认证 + 无盐 SHA-256 + 硬编码默认口令的组合已被公开仓库文档自我披露，任何联网部署实例应视为弱口令暴露 |
| 4 | 个人邮箱 `malizhi@360.cn`（提交元数据） | **观察**：隐私级；介意为其重写历史代价高（4 分支全推），建议后续用 noreply 邮箱 + 开启 secret scanning |
| 5 | `backend/data/audit.jsonl` 演示数据仍在 HEAD | **无需**（无凭据字段）；欲洁癖可移出版本库 |
| 6 | 防再犯 | **建议**：开启 GitHub Secret Scanning + push protection；本地加 gitleaks pre-commit；`node_modules` 跟踪问题与本调查无关但放大扫描噪声 |
