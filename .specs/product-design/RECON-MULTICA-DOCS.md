# RECON · multica 文档层事实侦查（供 PRODUCT-DESIGN v16 落档引用）

> **审核状态**：事实档 · 未过 ⑤ 人审门（R16.3）——只作 v16 文档改写的证据底座，不据此立项、不写进 ROADMAP。
> **日期**：2026-10-23　**对象**：multica 官方文档（Next/fumadocs `.mdx`，英文为权威版，`.zh/.ja/.ko` 仅对照不计数）
> **出处写法**：下表 `file:line` 除标注外均相对 `apps/docs/content/docs/`；仓库根运维文档写作 `docs/maintenance-jobs.md`，服务器代码写作 `server/…`。
> **范围（如实）**：申报 **46 篇**，实测英文 **45 篇** = 顶层 42 + `developers/` 3；另有 **2 篇不在 docs 树内**的仓库根运维文档（`docs/maintenance-jobs.md`、`docs/issue-status-lifecycle-rollout.md`）本次一并取证，故「46」按「45 + 1 运维」不成立——**记为勘误 E-1**，v16 引用时按实数走。
> **方法**：① 逐篇全文读（约 20 篇核心 + 10 篇抽样）；② 每条机制锁 `file:line`，写前 `sed -n 'Np'` 抽 10 处复验（见附录 C）；③ 「multica 无」类断言一律用全库 `grep -rn`（排除译本）取 0 命中为证；④ 文档与代码分歧不合并、不美化，单列（易抄歪 ⑤、勘误 E-2）。

## 四条纠偏（本档的结论骨架）

> **〔2026-10-23 更新 · 第 8 轮代码层扫描（D-S22）〕**附录 A「multica 无」清单**①（无 triage 态）与③（无规则版本账本）两条已被代码层实证翻转**（本档已就地改文，警示保留于该两条内）；四则其余与清单其余「multica 无」条目**仍然有效**。其 docs 系统性滞后于后端——**引用前查码**（证据：`.specs/platform-evolution/D-S22-multica-code/RECON-server.md` / `RECON-client.md`，全带行号）。

| # | 纠偏 | 证据 |
|---|---|---|
| **纠偏①** | **状态由 Agent 在运行中显式写**，服务端不因 run 起/止翻状态；只有两条系统例外（失败回收、PR 合并置 done）。 | `issues.mdx:66`、`issues.mdx:69-72`、`tasks.mdx:86`、`assigning-issues.mdx:68` |
| **纠偏②** | **「打断」永远是显式动作**：改派、改状态、归档小队都不停在跑 run；只有**删除任务**与**归档 Agent**连带取消未完成 run。v14 我方按竞品代码写「归档小队=取消在跑」为误。 | `tasks.mdx:75`、`squads.mdx:93-95`（归档只转交前 leader，无取消句）、`agents.mdx:81`（Agent 归档才取消）、`issues.mdx:120`（删除才取消） |
| **纠偏③** | **触发器只有 `schedule` 与 `webhook` 两类**；API / CLI 是**通路**不是第三型，`Run now` 是第三**入口**不是触发器。 | `autopilots.mdx:22`、`autopilots.mdx:24`、`autopilots.mdx:39`（`autopilot trigger-update` 是唯一单触发器启停途径） |
| **纠偏④** | multica **没有「统一调和引擎」**：八条各自独立的小收敛机制 + 全库批量写走**人批维护作业**，二者边界清楚。 | 八条见域二/域三/域五各行；`docs/maintenance-jobs.md:4`、`:12`、`:64`、`:84`、`:90`、`:184`、`:216` |

## 域一 · 任务与状态生命周期

| 机制 | multica 出处 | 一句话 | agentflow 关系 |
|---|---|---|---|
| 七内置态 × 四生命周期类别 | `issues.mdx:43-51` | `unstarted{backlog,todo} / started{in_progress,in_review,blocked} / done{done} / closed{cancelled}` | 已覆盖（§6.20 状态列） |
| 类别固定、具体态驱动界面 | `issues.mdx:52`、`:92-93` | 类别只为推理简单，看板/列表/泳道分栏一律用**具体状态**；类别建后不可改（编辑器只读） | 深化（写进状态编辑器说明） |
| backlog 是唯一停车态 | `issues.mdx:56`；`assigning-issues.mdx:51` | 挂 backlog 只入队不建 run；**自定义 unstarted 不停车**——停车语义只绑内置 key | 深化（易抄歪 ②） |
| 无固定流转路径 | `issues.mdx:64` | 成员与 Agent 可直接改任何状态，平台不设工作流约束 | 已覆盖（不锁路径） |
| Agent 自己写状态 | `issues.mdx:66` | 开工即 `in_progress`，评审/阻塞按实况写 | 深化（纠偏①） |
| 两条系统例外 | `issues.mdx:69-72` | ① run 失败且无其他活跃 run 且无重试 → `in_progress` 回 `todo`；② 带 close intent 的 PR 合并且无其他开放/草稿 PR → `done` | 已覆盖（两例外须逐条写名） |
| 自定义态只继承生命周期、不继承四个内置行为 | `issues.mdx:86` | Backlog 停车 / In Review 结束自动化 / Blocked 失败处理 / In Progress 回收——**一 key 一行为，只挂内置态** | 深化（§6.20 表加「挂在该 key 上的内置行为」列） |
| 内置态锁定 | `issues.mdx:94` | 名称/颜色/类别不可改、不可归档；不开该页就永远是出厂看板 | 已覆盖 |
| 归档态=下架不删 | `issues.mdx:95` | 已在该态的 issue 保留其名与色、行为不变，只是不再被选中 | 已覆盖；与代码 409 前置有分歧（易抄歪 ⑤） |
| 建单只需标题 | `issues.mdx:25` | 其余属性皆可后补，含状态 | 已覆盖 |
| 指派三目标语义 | `issues.mdx:31-37` | 人=拿跟进不建 run；Agent=建 run；Squad=leader 收并决定谁干；离线则排队等心跳 | 已覆盖（§6.29） |
| 指派不绕过 Access | `issues.mdx:39`；`squads.mdx:83` | 指小队时**校验的是 leader 的 Access**；leader 归档 → 该队不可指派 | 深化（§7 四把钥匙） |
| stage barrier 只唤醒不动状态 | `issues.mdx:109` | 最早未完成批次全部 `done/cancelled` → 给**父 issue 发通知**，不改父状态；父指派须为 Agent 才有 run | 已覆盖（§6.29 stage 记账） |
| 父子状态互不联动 | `issues.mdx:107` | 父保持总目标，子独立推进 | 已覆盖 |
| 删除 ⟂ 关闭 | `issues.mdx:120` | 删除**连带取消未完成 run**；`cancelled` 是保留记录的终态 | 深化（纠偏②的对照组） |

## 域二 · 运行、失败与底座

| 机制 | multica 出处 | 一句话 | agentflow 关系 |
|---|---|---|---|
| run 八态 | `tasks.mdx:39-46` | `deferred / queued / dispatched / waiting_local_directory / running / completed / failed / cancelled` | 深化（§6.20 八态表） |
| 队列双条件过期 | `tasks.mdx:48`、`:153` | runtime 静默**超过重连宽限** **且** 该 run 排队同样久 → 才判失败；换机器接手拿**完整宽限**重计 | 深化（「机器忙≠机器没了」） |
| 触发前即时拒绝 | `tasks.mdx:51` | runtime 已知离线 → 触发那一刻就拒，不塞进队列 | 已覆盖（管控/运行时在线判定） |
| `dispatched` > 5 分钟判败 | `tasks.mdx:154` | 认领了但工具没起来，超 5 分钟即失败 | 深化 |
| `running` 无时长上限、活性随心跳 | `tasks.mdx:54`、`:156` | 15s 一次心跳，最迟约 3 分钟判离线 | 已覆盖 |
| 目录锁等待无自有超时 | `tasks.mdx:42`、`troubleshooting.mdx:86` | 等的是 **daemon 内存里**的目录互斥，重启即释放；锁本身不超时 | 深化（坦白：内存态=单副本才成立） |
| 重试政策 2 / 3 + 豁免 | `tasks.mdx:80`、`:158-167` | 常规最多 2 次（首跑+1 重试）；工具网络中断最多 3 且末次延后约 5s；auth/quota/config/model **永不自动重试** | 已覆盖（阈值原值入文） |
| `run_only` 不自动重试 | `tasks.mdx:84`；`autopilots.mdx:129` | 避免与下一次定时重叠 | 已覆盖 |
| 重跑两语义 | `tasks.mdx:128`、`:130`、`:138` | 执行日志行 retry=**当时那个 Agent**、尽量续 session、保留已写文件；issue 头 rerun=**当前 assignee** + 全新 session 与工作目录 | 深化 |
| 错误码=处置说明书 | `tasks.mdx:94-124` | 每个平台 reason code 自带「下一步怎么办」列 | 深化（§6.0 纪律句） |
| 执行日志贴任务右栏 | `tasks.mdx:56-58` | run 记录在 issue 右侧执行日志，明写「**不在任何独立页面或 tab**」；活动 run 置顶、日志实时刷新（`:60`） | 已覆盖（§6.22 无独立列表页） |
| 可停止 / 可重试的行集合 | `tasks.mdx:66-68` | 停止只针对 deferred/queued/starting/waiting/running 的**这一条**；retry 只针对 failed/cancelled 的行；跑完的不受牵连 | 已覆盖（纠偏②同源） |
| 对话侧按消息入队 | `tasks.mdx:28`、`:158` | 「在 chat 里给 Agent 发一条消息」就是一个 run 来源；自动重试只覆盖 issue 或 chat 挂载的 run | 已覆盖（§6.8） |
| 推送只降延迟、DB 才是终态 | `developers/architecture.mdx:99`、`:108` | PostgreSQL 为唯一权威（Redis 可选）；WS 断了回落轮询，重连后一律以查询校准 | 已覆盖（§6.0 ⑧ + 管控双通道句） |
| daemon 重启 reclaim | `daemon-runtimes.mdx:64-65` | 重启后 re-register 并 **reclaim 未干净结束的 run**；在跑的判失败、可自动重试 | 深化（管控节） |
| 7 天僵尸清理 | `daemon-runtimes.mdx:66` | 离线 >7 天且无 Agent 绑定（含已归档）的 runtime 自动清理 | 深化 |
| 并发 20 / 6 取小 | `daemon-runtimes.mdx:72`；`troubleshooting.mdx:70` | 全局默认 ≤20、单 Agent ≤6，**两条取最小** | 已覆盖 |
| runtime 默认私有、公开≠共享凭据 | `daemon-runtimes.mdx:78-80` | 只有 owner 能建 Agent 与转公开；管理员也只能改名/删除 | 已覆盖（§7） |
| 集成契约只算 5 个变量 + 子进程继承警告 | `daemon-runtimes.mdx:92`（表内 96-100）；`:110-111` | 其余为 informational 非契约；**子进程默认继承全部 env 含 `MULTICA_TOKEN`** | 深化（安全坦白） |

## 域三 · 自动化（autopilot / 触发器 / 投递 / 熔断）

| 机制 | multica 出处 | 一句话 | agentflow 关系 |
|---|---|---|---|
| 三要素 | `autopilots.mdx:10`、`:17-22` | 一条自动化 = Runbook（目标/背景/约束/步骤）+ 负责人（Agent 或 Squad）+ N 个触发器 | 已覆盖（§6.29 ⑥） |
| 两类触发器 | `autopilots.mdx:22` | 只有 `schedule` 与 `webhook` | 纠偏③ + **api 自扩展声明** |
| Run now 是入口不是触发器 | `autopilots.mdx:24` | 走同一 Runbook、同一执行模式，不计入触发器数 | 已覆盖 |
| create_issue ⟂ run_only | `autopilots.mdx:28-31`、`:33` | 前者挂任务/讨论/状态，后者只进运行史；并发三策略 skip/queue/replace | 深化（取舍表进 §6.31） |
| 离线即 skipped 不留等待任务 | `autopilots.mdx:35` | run_only 触发时负责人必须在线 | 已覆盖（与「人派的活不凭空消失」对照写） |
| 单触发器启停只有 CLI | `autopilots.mdx:39` | UI 只能启停整条规则 | **自研差异**：我方给行内开关（竞品已知缺口补位） |
| 幂等键去重 | `autopilots.mdx:75` | `Idempotency-Key` 命中 → `200 duplicate`；GitHub 另按 `X-GitHub-Delivery`，两键分开记账 | 已覆盖 |
| 事件过滤 | `autopilots.mdx:81`、`:83` | 一行 = event + 可选 actions；任一行匹配即跑；**空规则=全收** | 已覆盖（界面须明写这句） |
| Rotate URL | `autopilots.mdx:88`、`:91-92` | 泄露即轮换，旧 URL 立即失效；全 URL 仅创建者/owner/admin/协作者可见，UI 遮蔽 token | 已覆盖（写-only 三原则） |
| 200 四态响应 | `autopilots.mdx:99-102` | `accepted / skipped / ignored / duplicate` | 已覆盖（熔断分母只算完结，见易抄歪 ④） |
| 业务性不跑返 200 | `autopilots.mdx:110` | 暂停/归档/过滤未命中一律 200，**防上游重试风暴** | 深化 |
| 六步事件推断 | `autopilots.mdx:112-119` | body `event` → `X-GitHub-Event`+`action` → `X-Gitlab-Event` → `X-Event-Type` → body `type/action` → 兜底 `webhook.received` | 深化 |
| 载荷上限 | `autopilots.mdx:106` | >256 KiB → `413`，不截断后照跑 | 深化 |
| 两级账本 | `autopilots.mdx:123` | 运行史（跑了什么，含 skipped 原因）⟂ webhook 投递记录（外面投了什么，跑没跑都记） | 已覆盖 |
| Replay 语义 | `autopilots.mdx:125` | 重放**永远新建**投递与运行、不改旧记录，**不参与去重** | 深化 |
| 失败率熔断（阈值原值） | `autopilots.mdx:131` | 近 7 天 **≥50** 次完结且失败率 **≥90%** → **自动暂停并通知创建者**，修复后**人工恢复** | 已覆盖（不自动 resume） |
| 暂停 ⟂ 归档 | `autopilots.mdx:133` | 暂停停 schedule+webhook+Run now；「删除」实为归档，历史全留只读 | 已覆盖 |
| 管≠跑 | `autopilots.mdx:137-141` | 任何成员可建；创建者+owner/admin 可改；协作者可管**不可转授权**；能管不等于能跑（Access 另判） | 已覆盖（§7） |
| 规则版本账本 | **文档全篇无 `version`/`snapshot` 字样**（grep 0 命中） | Runbook 每次运行读**当前值** | **自研差异 + 自证**（见易抄歪 ①，不引竞品背书） |

## 域四 · 消息、mention 与小队协作

| 机制 | multica 出处 | 一句话 | agentflow 关系 |
|---|---|---|---|
| mention 路由矩阵（五目标） | `comments.mdx:34-40` | member=只通知人；agent=触发 run；squad=通知+触发 leader；issue=**仅链接不路由**；`@all`=只通知人 | 深化（§6.21 矩阵表） |
| 结构化 @ 是硬契约 | `comments.mdx:42` | 纯文本 `@name` 不生成 mention；issue key 自动成链接 | 已覆盖 |
| 引文里的 @ 不路由 | `comments.mdx:20` | 引用他人原文中的 @ 既不通知也不触发 | 深化（易抄歪 ⑤） |
| 平回复三步路由 | `mentioning-agents.mdx:38-44` | ① 回 Agent 评论→该 Agent；② 回被 @ 者/其子线程→沿用该目标；③ 顶层无 @→issue 的 Agent 负责人（是 Squad 则 leader）；**评论里显式 @ 别的即取消兜底** | 深化 |
| 回复不换目标、不自动补位 | `mentioning-agents.mdx:46` | 目标 Agent 离线也照投，平台不超时改派负责人 | 已覆盖 |
| 合流 / steering 回执 / follow-up | `mentioning-agents.mdx:48-54` | queued 合流进同一次运行；running 送进当轮并给「已送达」回执；未达则标 follow-up；**回落无损**；Stop 与合流彼此独立 | 深化 |
| 每 Agent 各一次运行 + 同刻去重 | `mentioning-agents.mdx:56`；`squads.mdx:64`；`mentioning-agents.mdx:77` | 多目标各起各的 run；已有 queued/dispatched 则不重复入队 | 已覆盖 |
| trigger preview 可反选 | `mentioning-agents.mdx:24-30` | 发之前列出「谁会醒」，勾掉=**仅本次不触发**（不改内容权限） | 深化（§6.21 预览） |
| `/note` 与 `@all` | `mentioning-agents.mdx:62-65`、`:67` | `/note` 开头谁都不唤醒；`@all` 不覆盖 Agent，且**关掉本条的自动触发** | 已覆盖 |
| 批注规则 | `comments.mdx:20`、`:22` | 首条钉死目标；≤20 条、单条 ≤4000 字；草稿只在本设备、30 天；来源被删则禁发 | 已覆盖（§6.20 批注） |
| resolved 唯一结论 | `comments.mdx:26-28` | 一条线程只能有一个结论；新回复自动重开 | 已覆盖 |
| Agent 评论只可删不可改 | `comments.mdx:58` | 人写的可编辑，Agent 写的只有删除 | 深化（差异注） |
| 删除占位仅顶层 | `comments.mdx:63` | 删顶层评论留占位；删子回复不留 | 深化 |
| 评论者自动订阅 | `comments.mdx:50` | 评论即订阅后续活动与 @ | 已覆盖 |
| Agent 可互相 @、**无轮次上限** | `mentioning-agents.mdx:73`、`:77` | Access 不因小队/委派被绕过；agent-to-agent 不设上限 | 已覆盖（如实写，不粉饰） |
| 指派小队=机械入队 leader 任务 | `squads.mdx:31`、`:36`、`:40` | 非 backlog 即入队；leader 用 `squad activity … --reason` 写 evaluated 留痕；无成员抢单 | 已覆盖（§6.29） |
| squad 归档的连带面 | `squads.mdx:93-95` | 移出列表/选择器/@ 菜单，存量指派与自动化**转交前 leader**，历史保留——**没有一句说取消在跑 run** | 纠偏②的直接依据 |
| 「同一时刻只唤醒 leader 一次」 | `squads.mdx:62`（同刻去重）、`:49`（须结构化 @） | 跨引用与引文不唤醒 leader | 深化 |

## 域五 · 通知与收件箱

| 机制 | multica 出处 | 一句话 | agentflow 关系 |
|---|---|---|---|
| 收件箱是**指针不是副本** | `inbox.mdx:8` | 只放「需要注意的」，全量在活动流/issue 里 | 已覆盖（定位句） |
| 七类入箱 | `inbox.mdx:12-20` | 新指派 / 被 @ / 订阅 issue 的评论 / 状态变化 / 你名下 run 失败 / 自动化被暂停 / 需你澄清或交接（`action_required`） | 深化（七行清单） |
| 合并键=issue | `inbox.mdx:22` | 同一 issue 的多条冒泡合并为一条 | 深化 |
| 五类自动订阅源 | `inbox.mdx:26-32` | 创建者 / 新负责人 / 评论者 / 描述里新 @ 的人 / 自动化预设订阅者；改派**不摘**既有订阅 | 深化 |
| 退订与穿透 | `inbox.mdx:34` | 退订后普通更新不再通知，**直接 @ 仍然通知** | 已覆盖 |
| 冒泡不对称 | `inbox.mdx:37` | 子 issue 状态变化冒到父 issue 订阅者；评论/优先级/日期**不冒** | 深化 |
| Agent 永不用收件箱 | `inbox.mdx:40-44` | 收件箱只给人；Agent 要动就直接建 run | 已覆盖 |
| 自愈归档 + blocked 例外 | `inbox.mdx:48` | run 失败通知在其恢复后自动归档；**因 blocked 而失败的不自动归** | 深化（例外必须点名） |
| 未读语义 | `inbox.mdx:50` | 标未读只翻读态，不改归档态 | 已覆盖 |
| 批量归档含终态 | `inbox.mdx:55-57` | 可对 `done`/`cancelled` 的通知一键批量归档 | 已覆盖 |
| 六组开关 + 三类恒定 | `inbox.mdx:63-72` | 指派/状态/评论/@/优先级日期/Agent 活动六组可关；关组**只停通知不停记录**；reactions、quick-create 结果、autopilot 暂停等少数类型**恒定投递** | 深化（穿透句） |
| 三层要分清 | `inbox.mdx:72` + `issues.mdx:19` | **记录（活动流）⟂ 收件箱（要看的）⟂ 横幅（此刻要答的）** | 深化（§6.21 三层句） |

## 域六 · 权限 · 安全坦白 · 渠道与对话

| 机制 | multica 出处 | 一句话 | agentflow 关系 |
|---|---|---|---|
| 角色只管「怎么运营」 | `members-roles.mdx:8`、`:24` | owner/admin/member 的差别在管理面，**不给运行权**、不绕过 Access | 已覆盖（四把钥匙之一） |
| 最后 owner 锁 | `members-roles.mdx:21` | 不能降级/移除最后一个 owner | 已覆盖 |
| 邀请 7 天有效 | `members-roles.mdx:33` | 过期可重发 | 已覆盖 |
| 移除成员 blast radius | `members-roles.mdx:45-48` | 移人连带：在飞 run 处置、其私有 runtime 失去主人、其 Agent 归属、其订阅与指派、**重邀不复活**旧绑定 | 深化（五连清单） |
| Access 默认「仅我」 | `agents.mdx:51-57` | 新 Agent 默认只有 owner 能调用，三档可扩 | 已覆盖 |
| Admin 不可绕过、仅 owner 可改 | `agents.mdx:60`、`:63` | 管理员也不能绕过 Access；改 Access 是 owner 独占 | 已覆盖 |
| 归档 Agent ≠ 离线，但取消运行 | `agents.mdx:74`、`:78`、`:81` | 归档会取消该 Agent 全部未完成 run（含 queued 与 running） | 已覆盖（与 squad 归档成对写） |
| 无文件系统沙箱保证 | `security-model.mdx:12-18` | Agent 跑在与 daemon 同权限的本地进程里，平台**不承诺** FS 隔离 | 深化（坦白扩写） |
| 半吊子沙箱为何更糟 | `security-model.mdx:20` | 给一层假隔离感，比直说「没有」更容易让人做错决定 | 深化（这句是坦白的理由，不是免责） |
| 三档建议 | `security-model.mdx:28-30` | 独立 Unix 用户 → 专用机器 → 虚拟机，由轻到重 | 深化 |
| run-scoped 短票四锚 + 24h | `auth-tokens.mdx:80`；`daemon-runtimes.mdx:108` | `mat_` 票绑「用户 × workspace × Agent × run」，≤24h，run 结束即清 | **问责机制的实体**（替代口号） |
| 短票够不到「仅人」操作 | `auth-tokens.mdx:82` | 以 Agent 身份行事，用户/owner 专属操作不可达 | 已覆盖 |
| 自动应答审批=没有人在环 | `security-model.mdx:44` | 配了 `danger-full-access` / `bypassPermissions` 等于取消 HITL，文档明写 | 深化（管控节引用） |
| 域不是安全边界（同款坦白） | `security-model.mdx:12-22` + `members-roles.mdx:24` | multica 没有 workspace 内的「域」概念，隔离靠 runtime 归属 + Access + 短票 | 已覆盖（扩写为完整坦白） |
| Bot ↔ Agent 1:1 死绑定 | `channels.mdx:26` | 一个 Bot 只服务一个 Agent；要多 Agent 就多接 Bot | 已覆盖（P4 第四区） |
| 群里不 @ = 不触发**也不进上下文** | `channels.mdx:44`、`:49` | 未 @Bot 的群消息既不唤醒 Agent，也不并入其会话上下文；Agent 永不自动读整群历史 | 深化（P4 三句硬口径） |
| 命令表与 `/issue` 是命令不是对话轮 | `channels.mdx:14-22`、`:51` | 五平台命令矩阵；Slack 侧 `/issue` 先整理再建单，结果回原平台**不入 Chat** | 深化 |
| `/clear` 的语义差 | `channels.mdx:57` | 只清 Agent 可见上下文，平台侧全量历史仍在 | 深化（易被抄成「删历史」） |
| 绑定每条消息重校验 | `channels.mdx:75` | 每条入站都重校验外部账号↔平台身份绑定，离空间即失效 | 深化（redeem 双因子同链） |
| 丢弃指标坦白 | `channels.mdx:106` | 单一持有进程 + 多副本重连窗口内的回复**会丢**，计入 `dropped_total` 不藏 | 深化（watch 页同链） |
| 断开=软撤销保记录 | `channels.mdx:85` | 解绑/断开后既有会话与运行记录保留 | 已覆盖（§6.4 三原则） |
| chat 定位六条 | `chat.mdx:10`、`:27`、`:38`、`:42-44`、`:54-61` | 私密、不自动建单；仅创建者可见；按消息续接 session；starters ≤3 **只填不发**；置顶/归档/删除，**归档即断渠道绑定** | 已覆盖（§6.8 + starters 句） |
| 维护作业纪律（人批面） | `docs/maintenance-jobs.md:4`、`:12`、`:64`、`:84`、`:90`、`:141-152`、`:184`、`:216` | 无启动即回填、无调度器、无自动重启；API 只绑 `127.0.0.1` 且不可改；`writers_upgraded=true` 是**运维显式担保不是自动证据**；建作业默认 dry-run、每请求只推进**一个短事务**、批量/延时/双 SQL 超时必填；暂停的**不 `--resume` 就不自己回来**；失败向前修（fix forward）不回滚 | **自研差异**：我方 reconcile 的边界条款（见易抄歪 ③） |
| 迁移/回填纪律 | `troubleshooting.mdx:188-197` | 常规升级自动回填；`--dry-run` 预览不写、`--sleep-between-slices` 分片限速 | 深化（管控节引用） |

## 易抄歪五条

1. **`spec_version` 没有竞品背书。** multica 文档全篇无版本/快照概念，Runbook 每次运行读当前值（`autopilots.mdx:17-22`）。我方做版本快照的**唯一理由**是：熔断自动暂停后，人要点开「触发当时是哪一版规则」——不写「multica 也有」，也不把版本账本说成行业基线。
2. **停车语义别从 `backlog` 抄到「unstarted 类别」。** 内置行为只挂固定 key（`issues.mdx:86`、`assigning-issues.mdx:51`）；把「未开始都停车」写进我方状态机，等于让自定义态静默吞掉 run。
3. **「自动调和」不是一台引擎。** multica 的八条独立小收敛（失败回收 / PR 合并置 done / 自动化熔断暂停 / 队列双条件过期 / dispatched>5min / 心跳判活 / restart reclaim / 7 天清理）全部**只碰单个对象的状态回收**；**全库批量写**一律走人批维护作业（`docs/maintenance-jobs.md:4/12/64/84/184`）。把两者揉成「统一调和引擎」，就是把不可逆批量写挂到没人批的后台。
4. **`skipped` 不是失败，`200` 不是成功。** 响应四态里三种都是「业务性不跑」（`autopilots.mdx:99-102`、`:110`）；熔断分母只算**完结**（完成+失败），replace 取消的 run 与「门」类拒绝（`401`）都不进分母（`autopilots.mdx:131` 的阈值语义 + 我方 §6.31 口径句）。照抄 HTTP 码做失败率，等于用重试风暴当指标。
5. **引文里的 @ 与 `/note`、`@all`、issue 交叉引用都不路由**（`comments.mdx:20`、`mentioning-agents.mdx:62-67`、`squads.mdx:62`）。若只抄「@ 触发」这一条，会做出「复制粘贴一段别人的评论就把三个 Agent 全叫醒」的事故。

## 附录 A · 勘误与「multica 无」清单

- **E-1｜范围计数**：申报 46 篇，实测英文 45 篇（顶层 42 + `developers/` 3）；`docs/maintenance-jobs.md`、`docs/issue-status-lifecycle-rollout.md` 在仓库根 `docs/`、不在 docs 树内。v16 一律写「45 篇文档 + 2 篇运维文档」。
- **E-2｜文档 ⟂ 代码分歧（归档状态是否须迁空）**：`.mdx` 只说「归档=下架不删、在其上的 issue 保留」（`issues.mdx:95`），**没有任何 409 前置**；409 在代码里——`server/internal/handler/issue_status.go:427-431` 返回 `code=issue_status_in_use` + `issue_count` 与 "move them to another status first"，内置态 403；`server/pkg/db/queries/issue_status.sql:106-118` 的计数注释明写 "Archive precondition, **including terminal issues**"，并 `LockIssueStatusCatalog` 取 EXCLUSIVE。→ 文档层为「不阻塞」，代码层为「须迁空」，v16 采**代码口径**并标注分歧来源为代码非文档。
- **E-3｜拼写**：multica 用英式双 l `cancelled`（`issues.mdx:50`、`tasks.mdx:46`、`developers/conventions.mdx:204` 明文规定）。我方 PRODUCT-DESIGN.html v15 **零** `cancel*` 命中，v16 起在 run 八态、删除⟂关闭、熔断分母三处统一写 `cancelled`。
- **「multica 无」清单（grep 全库英文正文 0 命中为证）**：
  ① **无 `triage` 态 → 已翻转（2026-10-23 · D-S22 代码层实证）**：`triage_state` 可空列＋`issue_triage_guard` 守卫＋dispatch 专属拒因已实装（483 迁移 / `reason.go`），docs 全树零命中＝**后端先行、文档没跟上**——我方「待受理」轴由「自研、不得写对齐 multica」**获同构实证**（三条更细规则可并，见 D-S22 R8-1）。**其 docs 滞后，引用前查码**；
  ② **无 `reconcile` 一词**（无调和引擎、无自愈总闸，见易抄歪 ③）；
  ③ **无自动化规则版本账本 → 已翻转（2026-10-23 · D-S22 代码层实证）**：`rule_versions` 不可变行实存（迁移 186/189/449）——语义＝**只有实质发布（启停 / 改触发 / 改目标 / 改指令）追加行**，改名写描述不转移责任；`created_by` 专供授权、`published_by` 纯审计不得当授权输入；回填刻意不精确、无主老 trigger 故意 NULL 让派发 fail-closed（不给恢复路径）。**其 docs 滞后（本轮取证 43 篇主题零命中），引用前查码**；
  ④ **无「链顶人类」措辞**——它的问责实现是 run-scoped `mat_` 短票四锚（用户 × workspace × Agent × run）+ ≤24h + run 结束即焚（`auth-tokens.mdx:80`）、够不到仅人操作（`:82`）；我方保留该措辞但**必须挂在同一组机制上**，不作口号用；
  ⑤ **无 Guest 角色**（只有 owner/admin/member 三档，`members-roles.mdx:8`）；
  ⑥ **无「单触发器 UI 启停」**（`autopilots.mdx:39` 只有整条规则在 UI，单个触发器仅 CLI）；
  ⑦ **无「Quick Action / 保存的提示词一键即跑」这一等实体**——文档层只有 inbox 提到 `quick-create` 结果一类通知（`inbox.mdx:72`），全库英文正文 `quick.?action` **0 命中**；我方 `quick_action` 表（v14 设计新表）是**自研**，不得写「对齐 multica」；
  ⑧ **无 workspace 内的「域 / 分区」隔离概念**（英文正文 `domain` 命中全为邮件域与 `COOKIE_DOMAIN`，无对象分组层）——它的隔离只有 runtime 归属 + Agent Access + 短票三件（`daemon-runtimes.mdx:78-80`、`agents.mdx:60`）；
  ⑨ **无「Autopilot 挂团队」的归属字段**（`autopilots.mdx:137-141` 只有创建者 / owner / admin / 协作者四类，`:19` 至多挂 Project）——与我方「不挂 team_id、归属看目标」是**不同解法**，不作竞品背书。

## 附录 B · spot-check 记录（写前逐条 `sed -n 'Np'` 复验）

| # | 引用点 | 结果 |
|---|---|---|
| 1 | `issues.mdx:43-51` 七态×四类别 | ✔ 无出入 |
| 2 | `issues.mdx:86` 自定义态不继承四内置行为 | ✔ 无出入 |
| 3 | `assigning-issues.mdx:51` 自定义 unstarted 不停车 | ✔ 无出入 |
| 4 | `issues.mdx:69-72` 两条系统例外 | ✔ 无出入 |
| 5 | `tasks.mdx:75` 改派/改状态不停 run、删除才取消 | ✔ 无出入 |
| 6 | `squads.mdx:93-95` 小队归档只转交前 leader，无取消在跑句 | ✔ 无出入（纠偏②成立） |
| 7 | `autopilots.mdx:131` 7d ≥50 且失败率 ≥90% → 暂停 + 通知创建者 + 人工恢复 | ✔ 阈值原值一致 |
| 8 | `autopilots.mdx:22` / `:39` 两类触发器 / 单触发器仅 CLI | ✔ 无出入 |
| 9 | `auth-tokens.mdx:80` `mat_` 四锚 ≤24h run 结束清理 | ✔ 无出入 |
| 10 | `docs/maintenance-jobs.md:4/12/84/184` 无启动回填 · 只绑 127.0.0.1 · 默认 dry-run · 不自动 resume | ✔ 无出入（但**不在 45 篇 docs 树内**，见 E-1） |

**另 30+ 处**逐条复验结论与**已发现的四处出入**（本档已按实修，v16 引用以下列为准）：

| 出入 | 原口径 | 复验结果 |
|---|---|---|
| A-1 | 「停止 run 保留已完成」记在 `tasks.mdx:60` | 该行实为「日志实时更新」；**可停止的行集合**在 `tasks.mdx:66-68`，已按此改写 |
| A-2 | 「chat 每条消息一个 session」记在 `tasks.mdx:63` | 该行为空；run 来源清单在 `tasks.mdx:28`，重试范围在 `:158`，已按此改写 |
| A-3 | 「订阅源五条」记在 `inbox.mdx:27-32` | 清单一行是 `inbox.mdx:26-32`（26 是引导句），已按此改写 |
| A-4 | 「子进程继承 every environment variable」记在 `daemon-runtimes.mdx:111` | 原句为「inherits all of them, including `MULTICA_TOKEN`」，语义一致、措辞已按原文收紧 |

另：`developers/` 下 3 篇（architecture / contributing / conventions）计入范围；E-1（46→45 篇）、E-2（归档态 409 只在代码不在文档）两处按附录 A 执行。

> **RECON 指针（2026-10-23 · 第 8 轮）**：本档=文档层事实档；**代码层**事实（含附录 A ①③ 两处翻转的全部行号证据，及「引用其 docs 前须复核代码」清单）见 `.specs/platform-evolution/D-S22-multica-code/RECON-server.md` / `RECON-client.md`，裁决见同包 `CONCLUSION.md`。
