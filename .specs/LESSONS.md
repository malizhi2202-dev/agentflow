# LESSONS — 跨任务失败知识库

> 项目级常驻文件，位置：`.specs/LESSONS.md`
> **每个新任务开工前必扫**（R1.8）；任务完成后按本文件末尾「提名条件」决定是否新增。
> 首次建档：2026-10-24（v20 升级波次 7-integration，漂移 D4-2 补齐）。

## 标签索引

- `arch` 架构决策类 · `lib` 第三方库 / 陷阱 · `tool` 构建 / 测试 / 工具链 · `data` 数据建模 / 迁移
- `perf` 性能 · `a11y` 可访问性 · `sec` 安全 · `ux` 交互 / 视觉 · `ops` 部署 / 运维 · `proc` 流程 / 协作

## 使用方式

写代码前用任务的 `files` + `action` 关键词 grep 本文件；命中条目必须在执行计划里显式声明
「已查阅 L-NNN，本次方案与之差异是 X」或「已查阅，确认仍适用，因此不重试该方案」。

---

### L-001 · [proc] 并行 agent 同仓写入会互相吞掉改动

- **首发**: v20-wave5/wave6（并行会话）· 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: 本仓全部（多 agent / 多会话协作）
- **状态**: active
- **关键词**: 并行 agent 覆盖 STATE 台账 git add -A 抢占

**问题场景**
用户同时开了两个会话做同一批需求，两边都在改 `backend/` 与 `.specs/`。

**当时尝试的方案**
两边各自写自己的文件，都认为自己"没冲突"。

**为什么不行**
后提交的一方 `git add -A` 会把对方未提交的文档改动一起卷进自己的提交，且共享台账（`STATE.md`/`CLAUDE.md`）被后写者整体覆盖——本轮 `CLAUDE.md` 被覆盖两次（我的两条现状行被对方版本替换）。

**当前推荐做法**
开工先 `ps aux | grep -E "unittest|python -m"` + `git log -1 --format=%ad` + 目标文件 mtime 判断是否有并发会话；有则**先只读取证**，不与对方抢同一文件；提交前 `git status` 逐项确认归属，`git add` 用显式文件清单而不是 `-A`。

**何时可重新评估**
引入文件级锁或 worktree 隔离（每会话一个 git worktree）之后。

---

### L-002 · [tool] 集成测试别依赖「环境里恰好有一份已迁移的库」

- **首发**: v20-wave5（新端点读 `change_log`）· 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: backend pytest/unittest + FastAPI TestClient + SQLite
- **状态**: active
- **关键词**: TestClient lifespan init_db no such table 测试隔离 get_db override

**问题场景**
`test_auth_sessions` 用 `TestClient(app)` 直接打真实 app，但**没有**覆盖 `get_db`，也没跑 lifespan（未 `with TestClient`），于是请求落到仓库里那份**可能没迁移**的库。

**当时尝试的方案**
用例里 `Base.metadata.create_all(自建内存 engine)` 就算"隔离好了"。

**为什么不行**
路由用的是 `database.SessionLocal`/`get_db`，跟用例自建 engine 完全两套。波 5 让 `/api/admin/workflow` 读 `change_log` 后，该用例在"没有已迁移库"的环境直接报 `sqlite3.OperationalError: no such table: change_log`（2 errors），而在"碰巧有库"的环境又能过——**顺序/环境依赖的假绿**。

**当前推荐做法**
凡打真实 app 的用例，`setUp` 里同时做三件：patch `database.SessionLocal`、`app.dependency_overrides[get_db]` 指向内存库、`tearDown` pop override（见 `tests/test_collab.py` 与修好的 `test_auth_sessions.py`）。判断标准：删掉本地 `*.db` 后单跑该模块仍应全绿。

**何时可重新评估**
测试改成统一 fixture（`conftest.py` 级别）之后。

---

### L-003 · [proc] 实现类提交必须同批改「现行口径表」

- **首发**: v20-wave5/6 · 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: 本仓 `.specs/platform-evolution/RULINGS.md` 与任何"状态列"文档
- **状态**: active
- **关键词**: RULINGS 状态列 未实施 口径漂移 D1 D2 文档滞后

**问题场景**
波 5/6 已把隔离契约、RSI 治理、可观测等做成代码并提交，但 `RULINGS.md` 的「状态」列仍写 `未实施`。

**当时尝试的方案**
先做代码，文档"最后统一收尾"。

**为什么不行**
收尾时没人再读状态列 → 读者据文档判断"这些能力不存在"，与代码事实冲突（本轮 S-align 判为 D1/D2 漂移，19 行要逐条回填）。文档说"未实施"就会被当成事实。

**当前推荐做法**
每个实现提交的最后一个 hunk 里改 `RULINGS.md` 对应行的状态列（并写明提交号与"契约已落地/执行器未做"的边界）；`STATE.md` 同步一行。判据：`grep -n "未实施" RULINGS.md` 的结果必须与代码现状一致。

**何时可重新评估**
状态列改成由脚本从代码/测试生成之后。

---

### L-004 · [tool] 跑测试必须固定环境变量，否则用例集合都会变

- **首发**: v20-wave5 · 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: backend unittest + `ENCRYPTION_KEY`
- **状态**: active
- **关键词**: ENCRYPTION_KEY 用例数不一致 flaky 基线 327 336 391

**问题场景**
同一棵代码树连续两次全量跑，`Ran 327` 与 `Ran 336` 不一致，失败集合也不同（多出 `test_declarative` 的 SSE 用例）。

**当时尝试的方案**
直接 `python -m unittest discover`（未设 `ENCRYPTION_KEY`）。

**为什么不行**
各测试模块在 import 期 `os.environ.setdefault("ENCRYPTION_KEY", ...)`，先 import 的模块先设；模块发现顺序一变，先设与否就变，加密相关用例的行为随之变化 → 用例数/失败集合漂移，基线不可比。

**当前推荐做法**
统一入口：`cd backend && ENCRYPTION_KEY=test-key-for-ci-32bytes!! /tmp/afvenv2/bin/python -m unittest discover -s tests`。贴基线时同时贴"用例数 + 失败/错误数 + 失败清单 diff"三件。

**何时可重新评估**
环境变量集中到 `tests/__init__.py`（或 conftest）统一设置之后。

---

### L-005 · [tool] 请求去重的缓存键必须带 method，否则写请求命中读缓存

- **首发**: `v20-ui-collab` · T-01/T-02 · 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: frontend `src/utils/requestDedup.ts`（`dedupedFetch` / `safeFetch` / `invalidateCache`）
- **状态**: active
- **关键词**: 去重 缓存 GET POST 写请求静默失效 requestDedup clone

**问题场景**
页面「读列表 → 用户新建/改状态」是同一个 URL 的 GET 与 POST；两者相隔 5s 内（缓存 TTL）。

**当时尝试的方案**
`dedupedFetch` 用 `canonicalUrl(url)` 做 cache/in-flight 键，并且不分 method 一律进缓存。

**为什么不行**
`POST /api/tasks` 命中 `GET /api/tasks` 的缓存条目，**请求根本没发出**，却拿到一份列表响应并报告成功（`createTask` 认为建好了）。
用例里表现为 `POST` 调用列表为空（`expected undefined to match object`）——这只有在「同 URL 的读写」时才炸，所以很容易漏到线上。

**当前推荐做法**
键 = `${method} ${canonicalUrl(url)}`；**只有 GET 进缓存**（写不缓存、也不复用 in-flight）；`invalidateCache(url)` 同时清 `url` 与 `GET url` 两种键。
判据：任何「写接口与读接口同路径」的页面，都写一条「写入后 GET 次数增加」的用例。

**何时可重新评估**
换成 TanStack Query / SWR 等有 mutation 语义的库之后。

---

### L-006 · [lib] 小模型输出形状会漂，解析必须容错且不猜

- **首发**: `v20-rsi-adapters`（本地 Ollama 试运行）· 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: 任何把 LLM 输出当结构化数据的地方（`services/l0_llm_extractor.py`、judge、抽取器）
- **状态**: active
- **关键词**: LLM 输出 JSON 形状 三元组 解析 静默丢失 candidate

**问题场景**
让 `qwen2.5:3b` 输出 `[{"cue","lesson","evidence"}]`，它实际回了 `[[cue, lesson, evidence]]`（数组套数组）。

**当时尝试的方案**
解析器只认 dict，其它形状 `continue` 丢弃。

**为什么不行**
候选被静默丢光（`candidates: 0`），上层看到"模型什么都没抽到"——**看起来像模型能力问题，其实是解析太窄**。
同类风险：judge 只认回复以 `1` 开头，模型回 "1." / "1（等价）" / 解释性长文都会判 0。

**当前推荐做法**
- prompt 里给**对象形状的 few-shot**；解析器同时接受对象与**三元组**，其它形状丢弃（不猜）。
- 判分用"是否以 1 开头"这类**宽松但明确**的规则，并在响应里标明 `judge_kind`。
- 关键：**容错发生在入口**（不可信外部输入），三字段门与噪声地板仍在后面把关。

**何时可重新评估**
接入结构化输出（JSON Schema / function calling）且模型保证形状之后。

---

### L-007 · [tool] 缓存的「失效」必须能作废**在途**请求，否则写后读会读到旧值

- **首发**: `v21-completion` T-04（真实浏览器 E2E，MySQL）· 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: 任何「读缓存 + 写后刷新」（`frontend/src/utils/requestDedup.ts`）
- **状态**: active
- **关键词**: 缓存失效 在途请求 写后读 竞态 stale 我创了但列表没有

**问题场景**
E2E 建团队后等卡片出现，偶发 20s 都等不到；DB 里数据已写入、POST 返回 200、详情 GET 也 200。
3 轮复现 1 轮（`ROUND2 ok=false`，网络里只有 1 次 `GET /api/teams` 且条数是创建前的）。

**当时尝试的方案**
`writeJson()` 成功后调 `invalidateCache()` 清空缓存 Map，再 `fetchTeams()`。

**为什么不行**
清空只对**已在缓存里**的条目生效。若「挂载时的 GET」仍在途，它 settle 后的
`.then()` 会把响应**重新写回缓存**（时间戳还是新鲜的），随后写后读命中这条旧缓存；
同时 in-flight Map 里也还挂着那个旧 Promise，去重逻辑直接复用了它。
净效果：创建成功，列表 5s 内看不到新对象——用户侧就是「我明明建了」。

**当前推荐做法**
- 缓存加**代际**（generation）：`invalidateCache()` 自增；请求发起时记下代际，
  settle 时 `gen !== generation` 就不写缓存；查 in-flight 时代际不符也不复用。
- 回归用例要构造「旧读挂起 → invalidate → 新读 → 旧读才回来」的顺序（`request-dedup.test.ts`）。
- 别只测「invalidate 之后缓存为空」——那只覆盖了已落盘的那一半。

**何时可重新评估**
换成 TanStack Query / SWR 等自带 mutation 语义与失效传播的库之后。

---

### L-008 · [proc] 端到端验证必须跑「自己造的那个对象」，别跑近似目标

- **首发**: `v21-completion` T-04（E2E seed 与 L0 抽取）· 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: 所有 E2E / 冒烟脚本（`scripts/e2e/*`）
- **状态**: active
- **关键词**: E2E 假阴性 seed 目标漂移 prompt 逃生口 candidates=0 算绿

**问题场景**
`seed_l0_mysql.py` 调 `l0_job.run_once(max_conversations=1)` 期待「抽自己种的那段对话」。
跑过几轮后 `run_once` 按「最近更新」挑到别的会话，输出 `candidates: 0` 却被当成通过；
随后界面断言用「列表里已有历史记忆」兜底，也绿了。同一段对话换 hermes 又稳定抽 0 条。

**当时尝试的方案**
加断言「记忆行里有 502 字样」——历史上第一次跑确实有，所以一直是绿的。

**为什么不行**
两处都在**验证别的东西**：一处验的是「库里有旧数据」，一处验的是「库里有别的会话的抽取结果」。
真出问题（CLI 抽不出、解析丢光）时脚本照样退出 0，等于没有验证。

**当前推荐做法**
- seed/脚本直接对**自己创建的 id** 调用（`l0_extractor.extract(db, conv, extractor=...)`），
  不依赖「最近一条 / 默认第一条」这类选择器。
- 抽取不到候选时**按失败退出**（`SystemExit(3)`），并在脚本里重试 2 次——CLI 模型有抖动，
  用「重试后仍为空」区分「模型判定无价值」和「链路坏了」。
- prompt 里的「抽不出就输出 []」是**逃生口**：保守模型会稳定选它。改成正面界定
  「现象/排查顺序/结论都算可复用」，同一段对话从 0 条变 1 条（evidence 仍需引用原话，不许编）。
- 验证脚本的产物要能一眼看出「跑了谁的、抽了几条、落库几条」。

**何时可重新评估**
接结构化输出 / 固定 seed 的模型后，可去掉重试。

---

### L-009 · [ops] 交给 systemd 之前，先确认端口没被“上一轮手工进程”占着

- **首发**: agentflow 服务化（systemd user units）· 2026-10-24
- **上次复核**: 2026-10-24
- **适用栈**: 任何「手工起过一阵 → 改成 systemd 托管」的进程
- **状态**: active
- **关键词**: systemd restart loop uvicorn exit 3 address already in use 端口占用 双份进程

**问题场景**
把 MySQL/后端/前端从手工 `&` 启动改成 `systemctl --user` 托管后，`agentflow-backend` 三秒一重启，
journal 里只有正常启动日志 + `[monitor] 关闭.`，然后 `status=3/NOTIMPLEMENTED`；前端 vite 报 `EADDRINUSE`。

**当时尝试的方案**
先怀疑 unit 写错（EnvironmentFile/路径/权限），逐项核对都正常。

**为什么不行**
不是 unit 的问题：**上一轮手工启动的 uvicorn / vite 还活着并占着 8000/5173**。
uvicorn 绑定失败时退出码就是 **3**（STARTUP_FAILURE），日志里不打印明显的 “address in use”，
于是看起来像「服务自己退了」。端口探测误报「up」也是同一个原因——那是旧进程。

**当前推荐做法**
- 切 supervisor 前先确认端口归属：`ss -lptn 'sport = :8000'`，看 pid 是否是**当前** supervisor 的子进程。
- 用 `systemctl --user reset-failed` 清掉 failed 计数再 `restart`，否则看不到干净状态。
- 判断「服务真的起来了」用「pid 属于该 unit + 端口探测 + 一次真实请求」，三者对齐；
  只看端口会被旧进程骗过。
- 安装脚本里可以对端口做归属校验（`systemd` 的 `MainPID` vs 监听 pid 不一致即报错退出）。
