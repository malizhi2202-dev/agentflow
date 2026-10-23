# D-S22 · RECON-client · multica 客户端/扩展体系深扫（只读 · 2026-10-23）
> 源=/home/malizhi/project/multica/ · 全部路径相对该根 · 已吸收项（IM 渠道语义/心跳 15s~3min/waiting_local_directory/目录锁/run token/chat→runtime 路由）不复述

## 地形
「一个 Go 控制面 + 三种本地运行时 + 两套客户端」：server/=唯一权威；desktop 与 CLI daemon 共享本地执行面（Electron 自带二进制+专属 profile daemon）；**mobile 故意零共享**（无 MCP/插件 UI/审批/系统推送）。扩展两包互不相同：`packages/plugin-sdk`=第三方（iframe 面板+签名钩子+钩子伪装成 MCP 工具喂 agent，封闭作用域枚举、零凭据下发）；`packages/core`=自家无头逻辑层；views 含插件安全边界代码（surface-document/surface-bridge）。**skills-lock.json 与产品无关**（管仓库自己开发期 .agents/skills/，外部 CLI 锁）。

## ① skills 体系
- 🟢 技能=工作区级+内容即文件集合+**来源可刷新三件套**：`config.origin{type,source_url}` 钉来源→`skill refresh` 原地重下载，**保留 skill id 与全部 agent 绑定**只换内容（skill_refresh.go:113-120,172-184）——我方快照句缺「同一身份换内容」路径
- 🟢 refresh 先鉴权再联网（防烧 45s 抓取预算）；URL 已钉住→管理员不能借 refresh 注入任意内容（:117-143）；只合并写 origin 键不整体覆盖 config（:95-111），与导入的 wholesale 替换两条码路（:97-99）
- 🟢 来源三家+裸 slug 默认 clawhub：clawhub.ai（版本/stats/安装量）/skills.sh/github（tree API 优先→conventional 前缀→frontmatter name 匹配→截断树保守策略）（skill.go:950-1053,1289-1500,1652-1800）
- 🟢 同名冲突=**四态菜单 fail|overwrite|rename|skip** 非报错；**overwrite 权限窄于编辑权限**（导入覆盖仅限 creator，能编辑的 admin 也不能经导入覆盖）（skills.mdx:39 + skill.go:582-605）——「同一资源两条写路径、权限不同」是其明写语义
- 🟢 runtime 复制技能=**快照那一瞬的文件**，本地变更不自动同步需重导（skills.mdx:31）——「复制即脱离」非「引用即跟随」
- 🟢 大 payload 分级读：get/files 默认只回元数据（路径/字节/哈希），--with-content 才带正文；API ?include= 缺省仍回 content 保旧客户端不变（CLI_AND_DAEMON.md:1086-1103）；摘要类型故意不含正文——正文 50-200KB 曾拖超时高延迟 CLI（types/agent.ts:845-871 GH#2174）
- 🟢 技能正文 `[标签](slash://skill/<id>)` 显式引用，daemon 从消息抽 ID 不猜名字（slash_skill.go:8-31, prompt.go:652）
- 🟡 技能→运行时落地按 provider 分叉：QwenPaw 物化+skill.json / MiniMax 注入 / Hermes per-task HERMES_HOME 覆盖层（memory 持久跨 issue）/ **Codex 链接而非拷贝**（拷贝=100MB×每任务）（CLI_AND_DAEMON.md:378-398; codex_user_skills.go:10-18）
- 🟡 本地技能=心跳反向 RPC+客户端轮询：pending_local_skill(s) ack 批次上限 10，客户端 500ms 轮/发现 30s/导入 4min，**超时不变量写成 并发×心跳周期 ≤ pending 超时**（daemon.go:1195-1204,1042-1049; local-skills.ts:15-93）；conflict 是**终态非错误**带结构化元数据供四态菜单（runtime_local_skills.go:31-37）
- 🟡 user-invocable/allowed-tools 只在 onboarding 技能声明，Go 解析器只取 name/description（frontmatter.go:17-19）——**不是宿主契约**
- 🔴 skills-lock.json 零产品引用且锁已漂移（4 条 vs 树 1 条；computedHash 公式在外部工具）——**勿抄字段语义**（lock:1-26 + git 历史 e07e29462/acf9c625e）

## ② plugin-sdk（第三方扩展契约）
- 🟢 三关系封闭：**Action(插件→宿主)/Hook(宿主→插件)/Resource(静态贡献如技能)**；「谁触发」⟂「调什么能力」正交，钩子声明一次可被勾选的任一触发器调（plugincontract/manifest.go:5-10）
- 🟢 作用域**枚举封闭非前缀即拒**（issues/comments/tasks 读写+agents/members:read+storage:user|workspace+net:<域名>，≤64 禁重，manifest.go:92-105,449-479）；**事件必须与读作用域成对**（订 comment.created 就要 comments:read，解析期即拒——「推送不得比拉取多给数据」:141-151,655-660）
- 🟢 **双闸门**：管理员授的作用域 ∧ 当前用户本来能做什么（成员看不到的 issue 面板里同样 404）；插件代发评论以**用户**身份+via_plugin 标注且**不触发 @mention 派发**（面板不能靠发文本启动 run）（plugin-sdk/README.md:52-67）
- 🟢 iframe `sandbox="allow-scripts"` **不给 allow-same-origin**（opaque origin/无 localStorage/Origin: null）；CSP 按 manifest net: 生成，**不声明=完全不能发网络请求**（README:26-40）；身份靠私有 MessagePort 非 event.origin；protocol.ts SDK/宿主各复制一份防版本错装（protocol.ts:1-27）
- 🟢 版本=**升级要第二次同意**：发布不可变（sha256 digest 双方核对），安装钉 package_version_id，发新版不动已装；同意页高亮 **added_scopes 增量**；「**无签名无信任层级：管理员读作用域清单本身就是信任决策**」（plugin.ts:103-141; plugins-tab.tsx:448）；**预览做成 mutation 非 query**（同意流程的一半，不可缓存重放）（mutations.ts:11-20）
- 🟢 MCP 工具同意=**钉住完整集合**（存全集非 delta，[]撤整条钩子）；schema 摘要变=drifted，默认不勾、daemon 拒启漂移连接；工具列表永不预取、staleTime 5s——「**打开面板本身就是刷新，因为漂移就是它存在的理由**」（plugin-mcp-approval.tsx:27-45; queries.ts:66-81）
- 🟢 钩子出站四把锁宿主一处收口：HMAC 签名 v1/±300s 窗/10s 超时/1MiB 响应上限、重试 3 退避 2s、**熔断（窗口 5 败停后台投递）**、每钩子限流 120/min；**验签函数导出给插件作者用同一实现**（「只有一侧能实现的方案等于没人能审阅」）（plugin_hook.go:37-64,480-482）
- 🟢 agent 触发器：宿主不主动调；钩子渲染成本地 MCP 工具（描述/schema=manifest 原文作者写宿主不改，名带 installation 前缀防撞），**调用回流服务端再签名出站**——daemon 在个人笔记本，密钥下发=每台机器能冒充服务端；一条码路保限流/熔断/账本不漂移（plugin_agent_tools.go:16-45 等三处）
- 🟢 定调可引：反案「每轮前后必跑的钩子」=第三方把产品主循环按住不放，**因此该位置根本不存在**（plugin_agent_tools.go:18-23）
- 🟢 能力位门：声明了宿主没开的能力→**安装期响亮失败**（静默忽略的贡献像装好却永不触发）；sidebar_panel 无挂载位保持关（capabilities.go:8-36）
- 🟡 触发器五种 ui|manual|agent|event|schedule；event/schedule 异步永不阻塞用户请求；**schedule 是轮询原语非高频定时器，cron 下限 5min**（manifest.go:45-62）
- 🟡 契约小面：入口 .js/.mjs 单文件无模块图（宿主生成文档注入 CSP——插件自带 HTML 会带自家 CSP 让 net: 变空话）；surface 只 web/desktop；≤2MiB；config=JSON Schema 极小子集含 **secret 型**（密钥单独加密表、任何端点只回 configured_secrets 字段名）（manifest.go:575-596,205-207; bundle.go:28-29; plugin.ts:72-75）
- 🟡 开发通道不换语义：PLUGIN_DIR 发布仍产普通不可变版本（无「面板直读目录」第二渲染路径）、重发自动 +dev.N（plugin_package.go:71-84）
- 🟡 调用账本 TTL 清扫**不存请求/响应体**（「留着每 payload 的表=工作区内容第二份副本，还没删除路径」）；refused=根本没发出（plugin.ts:191-208）

## ③ CLI/daemon 本地侧
- 🟢 本地目录授权：**服务端看不见文件系统，desktop 是唯一校验者**——IPC pick+validate（绝对路径/是目录/R_OK/W_OK 类型化原因码）+选择时沿路找 .git（文件或目录都算，覆盖 linked worktree）；daemon 任务时刻再权威复核（local-directory.ts:27-121）
- 🟢 磁盘回收六套并存+护栏「永不删活动环境、local_directory 环境绝不整删」；关键增量：**重跑不复活被回收 checkout 而是开新环境，但 per-issue Codex 会话存 WORKSPACES_ROOT 之外仍续上下文**；活跃根护栏不保护已排队未领取（CLI_AND_DAEMON.md:280-300）
- 🟢 `.repos/` 共享对象库+任务目录=worktree（.git 是指针文件）；驱逐三条件齐；**旧缓存不按年龄算**（时钟从首次被 GC 看见起算，升级不清场）；驱逐错=损失一次 clone 非失败；reflog/gc 只在空闲做（:290-292）；disk-usage 单列 .repos 免双计（:300）
- 🟢 断线增量：WS 推送唤醒、HTTP 轮询兜底——30s catch-up+「健康 WS 领取轮询」3min 独立变量+**向下抖动 2m30~2m45s**（旧服务端/不确定领取仍走普通轮询）（:238,249-250）；存活 Redis TTL 90s（容忍约 6 拍）**故意短于** sweeper 150s DB 陈旧窗（daemon.go:1052-1060）
- 🟢 MCP 注入走 ACP `session/new`+每次 resume（resume vs load 按 runtime 分表），**不读写 runtime 自家配置文件**——「agent 的服务随任务旅行而非按机器安装」（:364-368）；canonical 信封 {"mcpServers":{...}}（native 嵌套键存下但零工具+警告）；远程 transport 取决于 initialize 声明（ACP v1 缺省=不支持；Hermes **二进制级**已验证例外，同族自定义 profile 不继承）（:370-375）
- 🟢 CLI 命令面增量（docs 未提）：issue=…pull-requests/children/reorder/comment resolve|unresolve/subscriber/runs(--active,--siblings)/run-messages(--since)/usage/cancel-task/search；agent=…avatar/skills(list|set|**add**：整体替换 vs 增量两条码路)/env(**唯一**读写 custom_env 通道走审计端点，值=**** 保留原条目——agent get/update 已不再把 env 上线)；runtime=usage/activity/rename(--machine)/delete(默认拒删有活跃 agent，--cascade 才解绑+取消在跑保配置历史)；autopilot=trigger-add…|rotate-url，run_only 不建 issue；**JSON 里 triggers 与 autopilot 平级顶层键（易踩）**（cmd_issue.go:167-391; cmd_agent.go:22-131; cmd_runtime*.go:19-74; CLI_AND_DAEMON.md:873-963）
- 🟢 上下文省钱细节：--fields **客户端**过滤（未知字段先拒不静默丢）；--output json 的 total **不可用于翻页收尾**（计数不健康退化为页长→满页恒报 has_more:true，「宁可多一次空页，不要提前收摊的遍历」）；游标随分页模式变、**模式不匹配即拒游标防静默 no-op**；--since 叠加游标比水印旧即停（:511-538,657-679）
- 🟢 排序契约：整表走必须 --sort created_at（默认 position 会被看板拖动重排）；**reorder 与看板拖拽同一套取值算法**（CLI/UI 落点必然一致）（:517,572-583）
- 🟢 错误面=单一翻译器：友好单行+保留服务端校验原文+默认不泄 URL/状态行/JSON/内部动词链；exit 0/1/2 网络/3 401·403/4 404/5 400·422；按 locale 中英（:985-1036）；**传输超时与无进展超时分开**：技能命令「15s 无字节判 stalled、有字节放行到 10min 顶」——总时长超时会**惩罚正在工作的传输**（:1061-1084）
- 🟢 自更新与「谁拥有二进制」解耦：daemon 比对自身编译版 vs 将要 re-exec 的 CLI 版，**等任务跑完才重启进新版（永不打断在跑任务）**，忙则推迟并在 status 说明；Agent CLI 升级不重启只重探重注册；desktop 托管时两者忽略（:128-154）
- 🟡 profile 隔离（默认 ~/.multica/、具名 profiles/<name>/ 各自 config/state/健康端口/工作区根）；**daemon logs 先打绝对路径到 stderr 再打内容**（「两份看着都像的日志里猜哪份是最贵的错误」）（:104-120,180-199）
- 🟡 mcp_config canonical 信封、--mcp-config 0600 per-run 文件退出即删；MULTICA_*_ARGS POSIX shellword、应用顺序固定「内置默认→daemon 级→per-agent custom_args」（:362,400）
- 🟡 支持 25 个 agent CLI 含 **dsh（需 --profile multica，读 AGENTS.md+.dsh/skills/）**；Qoder --yolo --acp；QwenPaw/MCode **故意无 model 覆盖项**（set_model 写共享持久配置非会话）（:231,361,378-380）
- 🔴 CLI_INSTALL.md 受支持清单停在 9 个 vs daemon 指南 25 个——同一事实两份文档不同版本，**抄用以 daemon 指南为准**（CLI_INSTALL.md:9,169-188）

## ④ desktop/mobile
- 🟢 desktop=「daemon 的托管人」：专属 profile 名从 API host 派生 desktop-<host>（**未解析就抛异常不静默回落**）；健康端口 profile 字符串求和派生+注释要求与 Go 端同步；.desktop-user-id 侧车独写发现账户切换（daemon-profile.ts:4-73）
- 🟢 CLI 二进制解析 cached→bundled→managed→自动下载→PATH；下载**按 goreleaser checksums 校 sha256、无校验和拒装**、macOS ad-hoc codesign（cli-bootstrap.ts:17,93-144）；版本决策：**相等或任一未知→放行（fail-safe）**；不同且有活跃任务→defer 到排空；不同且空闲→重启（version-decision.ts:24-37）
- 🟢 崩溃恢复阶梯可照抄：5s 轮询、**连续 3 次 stopped 才认死**、稳定 60s 免除失败计数、退避 15s/30s/2m/10m、30min 内 5 次→**硬停等人**；陈旧 PID 3×30s 后交 CLI 健康检查+OS 端口绑定裁决；每 await 后重检用户意图（晚到成功会回滚）；生命周期 Gate 串行化（前台排队后台忙则丢）（daemon-recovery.ts:5-306）
- 🟢 「外部托管」判定靠 /health os 字段 vs 本机 OS，失败**保守视为可管理**；专治 WSL2（localhost 转发的 health 全好但碰不到 PID 命名空间）；**必须实时读禁缓存轮询值**（daemon-os.ts:1-67; daemon-manager.ts:1020-1041,598-611）
- 🟢 鉴权=「JWT 换不过期 PAT + **只有 401 才算过期**」：renderer JWT 30min，故铸 PAT 给 daemon、.desktop-user-id 匹配才复用；卡 starting 10s 宽限后用 daemon 那把 token 打 /api/me，**网络/5xx 判 unknown——一次抖动绝不触发重登录**；auth_expired 粘住（daemon-manager.ts:644-760; daemon-auth-probe.ts:43-58）
- 🟢 通知权威在主进程：只在实时 inbox:new 触发（不是「完成/需要输入」类），按**来源工作区**静音偏好过滤；每窗各有 WS→主进程按 itemId 去重（1000 FIFO）+「任一窗聚焦就不弹」；点击路由带会话代际守卫（A 的横幅不能在切到 B 后导航）；载荷逐字段限长（use-realtime-sync.ts:560-627,1100; notification-gate.ts:1-58; index.ts:779-820）
- 🟢 **移动侧无审批/无推送**（重要负结论：无 expo-notifications、零 push token 注册；「通知」页=WS 在线应用内收件箱+与桌面共享静音偏好；无 agent 审批面；运行界面只读；登录=邮箱+6 位码入 secure-store 不走 cookie/CSRF；无扫码登录）（mobile/package.json; settings/notifications.tsx:2-5; app/(auth)/*; AGENTS.md:65）
- 🟢 移动「零共享」=成文纪律：自持 UI/state/hooks/i18n/build，只 import type 核心类型+纯工具，禁 import web/desktop store/Query 工厂/WS updater；对齐「先看 web 实现、匹配语义非 UI」；乐观更新只留收件箱标已读一个例外；CI 无 IPA 无渲染验证源码自装（7 天重签）（mobile/AGENTS.md:7-89; README:5-105）
- 🟡 插件面契约只 web/desktop（manifest platforms 枚举 :586-588）——移动不渲染第三方面板是契约决定
- 🟡 desktop 自更新按架构分频道+关偏好时**清定时器非仅回调守卫**；渲染崩溃 reload 提示+主进程 freeze-breadcrumb 下次启动回灌（updater.ts:1-206; renderer-recovery.ts:9-51）

## ⑤ VISION 可引定调句（VISION.md/zh 一一对应）
1.「让人和 AI 智能体成为一支真正的团队」(:11) 2.名字押注：分时回归，「用户」同时包含人与智能体(:28-31) 3.「两个工程师带一队智能体，能有二十个人的推进速度」(:38-39) 4.反 inbox 增殖：每多用一个智能体多一个要盯的窗口、上下文留某人脑子、决定沉聊天记录(:45-49) 5.「AI 带来的不是更多工具和窗口，是一支更强更能协作的团队」(:51) 6.任务清楚就推进，涉产品行为/风险/取舍**先把合适的人请进来再走**；人定方向、定义什么叫好、对结果负责(:58-60) 7.「把已明确的事实和仍需判断的问题分开」(:54-56) 8.评审对象是工作本身（计划/文档/实现/diff/预览/测试/未决问题）非状态汇报；人可纠偏提标准叫停；agent 维持协调**但不隐藏做什么为什么**(:67-70) 9.历史随工作留下非随会话消失：下一个 agent 要能懂「为什么」(:72-75) 10.收束：「不是超出人类控制的自治公司，是人与智能体共同做有后果之工作的共享操作系统」（system of record and action for human-agent work）(:83-90) 11.**文档诚实条款**：「写的是正在构建的未来不是功能清单；今天能用的见 README」——免责结构可直接抄(:96-98)

## ⑥ examples/e2e（模板市场形状）
- 🟢 5 示例插件覆盖 4 触发器×2 transport×skill resource：hello-panel（无 net:→CSP 字面无法外泄）/schedule-pulse（**至少一次投递**：delivery_id 跨重试稳、invocation_id 每次尝试变、先落盘再回 200、重复={duplicate:true}）/triage-notify（触发器身份矩阵；event 不阻塞因监听器跑在发布请求 goroutine 上）/deploy-sentinel（4 钩子全触发器+adopt 外部 MCP+secret config+resources:[{type:skill}]→普通工作区技能**卸载时移除**）
- 🟢 作者侧可跑验签参照（triage-notify/server/handler.mjs:24-157）：HMAC over `timestamp+"."+rawBody`、**先对原始字节验签再 parse**、常数时间比较、接收方自建重放缓存（宿主替你做不了的那件事）、载荷信封含 issue_id **权威覆盖客户端所传**、callback token 生命周期=一个 HTTP 往返、异步须换常设 mpi_ 安装 token
- 🟢 「**schedule 不是数据作用域**」：net: 是唯一出口，定时唤醒本身不授读数据（schedule-pulse/README:16）
- 🟢 平台操作手册技能形状：builtin_skills/multica-platform/references/{issues,mentions,…8 篇}——SKILL.md 明写「**不要全读**」按域只开一两篇（:12-25）；starterkit/fixtures/=从真实工作区 `make kit-export` 导出「技能+agent+squad 出厂件」、`make kit-check` 只问答是否漂移（Makefile:366-380）——**正是我方模板市场缺的导出/校验闭环**
- 🔴 e2e 已失效两处勿当契约（plugin-surface-document.spec import 了已移除的 buildSurfaceDocument：srcdoc 构建器 bedad9e22 已删；agent-mcp.spec 测 Composio 工具箱≠agent.mcp_config——两个「MCP」不同物）
- 🟡 插件面安全契约被断言化：桥只中继一个端口/两个插件面互读不到(SecurityError)/连接闸五条件同立（type+version===2+challenge+ports[0]+source）/token 单次使用中继后清零/敌意导航不记账/桥**路径白名单+方法白名单**（「是 allowlist，不是『是不是字符串』」）resize≤4000px（surface-document.ts:64-150; surface-security.spec:26-103; surface-bridge.ts:25-57）
- 🟡 性能护栏哲学：只守一条回归（3 路流式下长 issue 打字）、**无延迟阈值「a report, not a gate」**、fixture 版本+喂入字节 sha256 随报告（摘要相同才可比）、独立 perf config（README:29-86）
- 🟡 造数混合式（真 HTTP 建 auth+直连 pg 批量）；1001 行单事务 RETURNING+INSERT…SELECT unnest WITH ORDINALITY（走 create 端点 setup 会主导时长）；quiescence=等 >750ms 无请求后**保留监听器清已收流量**防启动噪音伪通过（fixtures.ts:1-332; helpers.ts:5-54）

## ⑦ 他们的 agent 约定（dogfood）
- 🟢 CLAUDE.md 全文只有一行 `@AGENTS.md`；规则明文「共享规则放 AGENTS.md、平台专属各端文件、**改流程与工作流必须同一变更更新指令**」（CLAUDE.md:1; AGENTS.md:7-9）——我方三段式同构+这句纪律可引
- 🟢 禁止静默降级写成结构：包边界表逐格「不许 import 什么」（core 无 UI 库/react-dom/localStorage/process.env，持久化必须 StorageAdapter；views 无 store/next/router）；测试层「一个行为只有一个权威测试层」+「DOM-free 测试首行 @vitest-environment node 否则静默切 SSR 路径」（AGENTS.md:13-27,113-116）
- 🟢 API 兼容硬约束：已装 desktop 可能连更新后台→**UI 消费的 JSON 必须过 zod+parseWithFallback 禁 `as T`**，加端点同加 schema+畸形响应测试（:63-70）；DB 层禁外键/级联、并发索引单语句、跳过迁移仍记账、DDL 幂等（:71-76）※与我方字典 FK 裁定冲突——**采其「每个迁移幂等+记账」不采其「禁 FK」**
- 🟢 安全闸做到测试层：默认测试**不得解析/执行用户装的 agent CLI**（须传假可执行）；新内置命令进白名单位文件；真机 smoke 要 -tags + env 双闸+显式点名——**比「别跑真 agent」提示词强**（:119-120）
- 🟢 reserved slugs 变更=同变更改 json+跑生成+提交生成物；「生成物也是源码」（:126; Makefile:366）
- 🟡 语言契约：代码注释英文、中文文案先读 conventions.mdx；UI 文案规则（默认可省/禁复述标题/权限成本破坏性后果执行前置**必须可见**/冗余不塞 sr-only）（:96-100,124）
- 🟡 显式禁令「不加内部 shim/双写/回退/legacy adapter」+紧跟限定「不放松 API 响应兼容」——防 agent 混淆两条的预补丁（:125）
- 🟡 状态规则细到可执行：Query 独占服务端数据/Zustand 独占客户端态/持久化只放耐久偏好；WS 只 patch 缓存不放服务端载荷进 Zustand；**乐观更新四前置**（结果可预测/失败罕见/回滚平凡/留当前屏）+先快照后 patch+settle 失效不确定投影；创建/删除/确认流必须等服务端再导航（:50-61）
- 🟡 enum 漂移降级不崩：精确匹配→粗家族→undefined（后台分类法独立于已发行客户端生长）；presence 拆两正交轴组装（availability 只看可达、load 只看计数，终态历史不放）（failure-reason.ts:3-39; derive-presence.ts:1-142）

## 附 · 三处反向结论（直接相关）
1. 第三方扩展**不参与 agent 主循环**：无 before/after-turn 钩子位，只有 agent 自选的 MCP 工具位（plugin_agent_tools.go:18-23）
2. 事件推送数据量必须=拉取授权（event→read scope 成对）；宿主禁发任何插件收不到的事件（两清单一致且只一个权威）（manifest.go:141-166）
3. 「同意」只有三载体：人读作用域增量/MCP 工具全集+schema 摘要漂移即失效/发布版本不可变（无 live 目录直读）；**无签名无信任层级无市场审核**，公开目录「另需 review/report/takedown 是另一件事」（plugin.ts:103-146）
