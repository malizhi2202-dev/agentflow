# ③ 结论与建议 · S22 multica 代码层（第 8 轮 2026-10-23）
> 状态：待审⑤ · 证据=同包 `RECON-server.md`/`RECON-client.md`（全带行号）· 硬约束：糅合进既有件零新页（R19 阶梯律）、纯文档/原型层（裁定⑧）
> 与文档轮关系：v16 已吸收 46 篇 docs 机制；本包全部是**代码里文档没写或写得不同**的增量，无一条复述 v16。

## 裁定候选

**R8-1 · 基线校正（最高优先）：multica 已有 Triage 正交列，我方口径必须改**（RECON-server 🟢1/🔴1）
- 事实：`triage_state` 可空列+守卫+专属准入码+重复豁免已落地（483/issue_triage_guard/dispatch reason），docs 全树零命中=**后端先行、文档没跟上**；死开关 flag 佐证功能在推进。
- 改法：① RECON-MULTICA-DOCS 纠偏四则第①条改口径「7 态×4 类 + Triage 正交列（代码实证，docs 滞后）；我方『待受理』轴由『自研正交轴』升格为**同构实证+三条更细规则可并**」；② 并入三条：占位对象永不为终态**不得挂进 barrier 作用域**（吊死防）/Triage 条目**永不构成活跃重复挡他人**/@mention 手工指名**不受准入拒**；③ 顺带校正 webhook 重放口径：代码只挡 rejected/无效签名/无 body（**queued 可重放**，重放行 dedupe_key 置 NULL=故意绕开账本）——automations.html 投递账两行按此改。
- 落点：RECON-MULTICA-DOCS.md、PRODUCT-DESIGN §6.20/§6.29、automations.html、board 系列注记。

**R8-2 · 人责归因瀑布并入 run 溯源与门禁**（server 🟢2/🟢15）
- 八档 source 词表；**originator（授权值）⟂ accountable（审计值）双列分离+不变量「originator 非空⇒accountable=originator」**；**armed trigger 的 created_by 就是授权人**（「武装自动化=点击 run now 的延期」——与我方 spec_version 自证条款同调，互为印证）；delegation 跨 hop **复制不链**（环无害）；**策略读不出也按 fail-closed**；订阅者白名单校验**链根 32 跳封顶**非链上值；rule 版本只在实质发布追加不可变行（改名写描述不转移责任）、published_by **不能当授权输入**（编辑者静默借权）→ 授权/审计双列各司其职、无主故意 NULL 不给恢复路径。
- 落点：§7（Access 四钥匙后新增「归因瀑布」小节级段落，非新页）、§6.13 自动化责任段、PRODUCT §3.3 `runs`+`rule_versions` 列注。

**R8-3 · 多副本控制面形状（治我方三处进程内存的解冻期设计档）**（server 🟢3/🟢4）
- 两阶段预留家族：outbox 六态 intent+operation_token 全局幂等+lease+dead_letter+worker 原子 claim；per-ws 双层锁（进程内 gate+钉连 advisory，**钉连≤min(4,pool/4) 防容量饿死主池**）；配额 period 行 used+reserved 双计数、**拒绝路径也提交、通知挪事务后**、孤儿 reservation 释放重留。
- sys_cron：一行=租约+审计（唯一键 (job,scope,plan_time) 防双跑、**stale 非状态**=谓词化单 UPDATE 偷租约、fencing 三谓词 0 行停手、claim 之上再 (trigger,planned_at) 局部唯一防重入、**迟到>5min 补发直接丢**）。
- 落点：§6.30 或 control-plane.html 加「解冻后形状」注记段（现状「三处进程内存」缺陷句保留，补目标态）。

**R8-4 · 搜索/视图一揽子**（server 🟢5/🟡浮点位）
- 十级秩首键=cancelled 沉底（指名豁免：标题全等/编号精确）；候选先行+planner 围栏+首 CTE 故意不 MATERIALIZED（快 28-68% 实measure）；**cursor 内嵌查询 sha256 指纹，不符 409 不静默错页（显式空数组≠缺省入指纹）**；rows/facets/groups 共享一个快照事务；facet 帽 32+计数自摘本维；involves 四支 UNION 排 member 直派保三 tab 互斥；浮点排序位间距耗尽 **409 宁死不静默重排邻居**；EXISTS 必带 ws 谓词下推（32.3s→1.8ms 实录）。
- 落点：§6.x 搜索/过滤段 + search/board 原型注（分页游标指纹、tab 互斥、沉底秩三处可见）。

**R8-5 · 自定义字段类型系统**（server 🟢6）
- 定义写**只许人类 admin**（agent 在角色检查前先拒）、值写全员、**错误文案枚举合法值供 agent 自纠**；选项 id 服务端发 UUID→**改名永不回写数据行**；删选项与写值共用一把 advisory lock 闭 TOCTOU（固定 ws→property 加锁序）；`__op__` 标记键拼不出 UUID 故永不撞 jsonb 包含；排序字面 `::numeric` 被下游字符串嗅探决定 cursor cast——**写错静默断分页**（教训句）；检索预筛「长度不作条件」（1-2 字 CJK 正是索引存在理由）。
- 落点：§3.3 字段系统行注 + §8 术语（选项 ID 稳定性）。

**R8-6 · IM 投递状态机与媒体账本**（server 🟢7/🟢8）
- 二维状态机 phase×send_state 按**轮次链根**（WITH RECURSIVE 找 retry 链根）键控：**重试必须续写上一 attempt 的回复而非旁路再答**；send_state→unknown 刻意去 owner 校验（过期进程也要留证据）且 unknown 全线终止（无幂等键渠道不可重发）；媒体：**PUT 之前写 pending 行、「bind⇔账本消失」、引用检查在 claim 翻态之后**；墓碑递进重删 {15m,1h,6h,24h}；**deadline 全交 SQL INTERVAL（副本时钟漂移免疫）**。
- 落点：§6.27 四区渠道段补注 + IM 集成文档句。

**R8-7 · 运行凭据与活性门族**（server 🟢9/🟢10/🟢13）
- mat_ 铸造 fail-closed：owner 缺失→**取消任务而非回退 owner 凭据**；**token 缓存 TTL=min(10m,剩余寿命)**+Redis 挂降级直查；mcn_ 在线验+60s 缓存=**有意撤销窗**、未配置回 401 不回 503；X-Actor-Source 服务端独占注入、机器凭据禁入计费面；**能力协商用 capability 不用版本号**（版本够新≠实现存在）+缺省按最老客户端 fail-closed 且明文禁做安全判断；三层探测节奏 2/30/10min；**解析失败的 profile 也落行**（缺了就失明）；双源存活**常量大链不等式写明改常量须重算**；WS RPC uncertain（帧已发+断线）**禁止 HTTP 兜底防双 claim**；max_tasks 0=合法不强升 1；poisoned 四类指纹宁漏不误判+**output_truncated 三态（nil=未测，「记成 complete 是这份数据唯一不许说的话」**）；终态回调重放队列**永不带 token（重放用当前凭据）**、连 3 拒**且存活≥10min**才隔离。
- 落点：§6.x run 凭据段（run-scoped token 已并，本条补 fail-closed 语义与活性节奏）、runtimes/monitoring 注。

**R8-8 · 插件与扩展层 V2（docs 零命中的最大空白）**（server 🟢14 + client ②）
- 三关系封闭 Action/Hook/Resource、触发⟂能力正交；**事件必须与读作用域成对（推送不得比拉取多给数据）**；双闸门=授予作用域∩用户本可做什么（插件代发以用户身份+via_plugin 且**不触发 mention 派发**）；opaque-origin iframe+CSP 按 net: 生成不声明=零网络；**升级=第二次同意**（版本不可变+added_scopes 增量高亮+**预览做成 mutation 不可缓存**）；MCP 安装≠授权：全集钉住/schema 摘要漂移即停调/空集=撤回/「打开面板本身就是刷新」；**granted==manifest 全等，部分同意=静默残废**；无签名无信任层级（管理员读清单=信任决策本身）；**不存在每轮前后必跑的钩子位**（第三方不得按住主循环）；bundle 与清单同事务/secret 单独表 by-construction 读不到/密钥按域派生不能哈希/invocation 账本 TTL 扫不存 body/V1 反例（14 表伺候一份 SKILL.md）。
- 落点：§7 工具库与授权层（我方「插件不越界」句扩成八点细则）+ 术语若干。**这是 v16 文档轮完全没碰的面——纯增量。**

**R8-9 · 技能来源刷新+模板市场导出闭环**（client ①⑥）
- `config.origin` 钉来源+**refresh 原地换内容保留 id 与全部绑定**（我方快照句缺「同一身份换内容」路径）；先鉴权再联网（拒了不烧 45s 抓取预算）；只合并写 origin 键不整体覆盖；同名冲突=**四态菜单 fail|overwrite|rename|skip 且 overwrite 权限窄于编辑权限**（creator 独占，导入覆盖≠编辑权——同一资源两条写路径权限不同）；runtime 复制技能=**复制即脱离**；大 payload 分级读（元数据默认/正文显式取，摘要不含正文防拖垮慢链路）；`slash://skill/<id>` 显式引用抽 ID 不猜名；**kit-export 字节稳定「git diff 即评审」+runtime_id 剥离+本地字段非空即停发+种子同事务 claim 败者当成功**=我方模板市场缺的导出/校验闭环。
- 落点：§6.23 技能段+模板市场段（五句主线④的「上传取快照」句旁边补「换内容保身份」半句）。

**R8-10 · 观察与负结论（登记不并入）**（client ③④⑤⑦ + server 🟡）
- **移动侧零推送零审批零插件面**（实测负结论）——我方「移动审批」如做即**自研差异区**，文档不得再引 multica 为据；desktop 崩溃恢复阶梯/通知主进程权威/API 兼容 zod+parseWithFallback/乐观更新四前置=客户端工程约定，我方无客户端页 → 挂 ROADMAP「解冻后客户端工程规约」观察条；VISION 11 句中取 2 句进 §1 题记（「共享操作系统」收束句+反 inbox 增殖句）+**文档诚实条款结构**（「写的是正在构建的未来不是功能清单；能用的见 README」）进 PRODUCT-DESIGN 页首免责；quick_action「权限只在 Run 一处校验、列表端点不过滤（两人看同一 issue 不该看到不同侧栏）」+建议生成帽 16 超限**丢弃不排队（迟到等于无用）**→ 并 §6.20 注；「CLAUDE.md 只 @AGENTS.md+改流程同一变更改指令」与我方约定同构=外部佐证，引一句。
- 🔴 不采登记：skills-lock.json 语义（外部工具锁且已漂移）；负面清单式禁读（FORBIDDEN 全仓无引用，正向白名单已覆盖）；其「DB 禁外键」纪律（与我方字典 FK 裁定相反——采其迁移幂等+记账，不采禁 FK）；编译期硬编码应急封禁名单（反面教材）；「装完 CLI 重启 daemon」等 8 处文档-代码不一致=引用其 docs 前的复核清单（已在 RECON 🔴 节）。
