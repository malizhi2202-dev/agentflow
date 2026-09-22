# ② 侦察 — multica 第二波深读（2026-09-22 · 只读，证据=path:line 相对 /home/malizhi/project/multica）

> 深读 agent 全程未改 multica 任何文件；已排除第 1 轮借鉴的 9 点。今日 star 读数 489（昨日 51,072 为误报？两者相差悬殊——**采信本日报告：本项目是本地 checkout，非 GitHub 同名镜像**；网络那份 multica-ai/multica 51,081★ 是产品化上游仓，本地 ~/project/multica 是同源开发仓，star 不矛盾，报告主体取证全部来自本地代码，可信度更高）。

## 体量事实（校准"值不值得学"）

Go 1.26(Chi+sqlc+pgx+WS+cron+Prometheus) / Next.js 16 前端 / PG17（Redis 可选降级）；**115 实体、537 对迁移+schema_migrations 账本、25 内置 provider、109 事件名、46 页面、.env.example 91 变量逐条带权衡说明**；4 类进程（server / daemon / 每任务 CLI 子进程 / 隔离 helper re-exec）。

## 六大新层面（择要，全量见会话报告）

**A. 协作主链模型**：`issue` 带 **revision 乐观锁 + triage_state + acceptance_criteria/context_refs/properties/metadata JSONB + stage + position**；`agent_task_queue` 68 列是运行枢纽——一次运行同时挂 5 种上下文（issue/chat/autopilot/squad/comment 线程），**coalesced（计划并入）vs delivered（实际投喂）分开记账=计划 vs 收据**；会话续用键是 (agent_id,issue_id) 对而非 task，故意含 cancelled 排除 poisoned；4 套租约并存（prepare 15s 续租 / DB 触发器清 overlay / channel WS 租约 / 入站幂等 claim_token）。
**B. 状态=目录数据+4 语义锚**：7 内置 key 归 4 category（unstarted/started/done/closed），迁移 337 **删掉 status 枚举 CHECK** 换应用层 Resolve；自定义状态"只继承生命周期、不继承停车/评审/失败恢复行为"，category 建后不可改（防静默重写机器语义）；**status 与 triage 是两根正交轴**（483 显式反悔："Triage 回答这算不算活，塞进 status 逼每个读者重答"）；窄 CHECK 故意只剩 pending 让扩展成为有意改动；NOT VALID→在线后校验避开全表锁。Triage 门只拦"从工作项推导执行者"的 run，放行"人手点名"。
**C. 协作机制**：mention 是 Markdown 链接非裸 @（纯文本谁也不触发）；评论→agent **7 级路由优先级**（/note 豁免→显式@＞@all→隐式规则→线程续聊→assignee 兜底）；**Steering 独立状态机**（候选须同工作项+同线程根+running+head_sha 相同+provider 白名单+能力位，**恰好 1 候选才注册，宁可不插话不歧义注入**）；合并重打身份与能力（originator/overlay/connected_apps 随合并换主，MUL-4195 教训）；去重键含 head_sha；**改派/取消不杀在飞 run**；提醒层无 SLA/到期 digest（反面事实），亮点在"何时值得打扰"分层 + 读失败故意 fail-open 多发 + task_failed 批量归档自愈；升级=deferred 定时行带部分索引、UI 隐藏但表保留供审计；autopilot 熔断（7 天≥50 次且失败率≥0.9→自动 pause+attention 收件箱，pause 也进规则版本表留痕）。
**D. 成本与授权**：**originator_user_id（只鉴权）与 accountable_user_id（只审计/成本）双列** + 8 级归属瀑布 + `attribution_fail_closed`（解析不到精确责任人直接拒跑）；配额预留/消费两态、**已消费不退还**、拒绝计数 JSONB、observe/enforce 降级语义；成本 1e-10 USD 整数 ticks + 小时物化 7 维 + dirty 队列/watermark。
**E. 运行时 harness**：Backend 单方法接口，25 provider 各一文件，**适配器诚实性写字段注释**（"上次枚举烂掉了"）；7 个独立超时预算各司一问；resume 落空必须披露"上下文可能没带过来"且 fires-once-then-clears；slot-before-claim 先占槽再领取；三重并发闸一条 SKIP LOCKED SQL；workdir 空目录+agent 自助 checkout（未提交工作保留、taskKey 用 UUIDv7 随机尾防并发误删 #7328）；**能力位而非版本判断**（in_place/worktree，保存时即校验不留运行期静默降级）；失败分类学 27 值带事故编号、wire=label=Prometheus 三位一体；poisoned session 4 类黑名单+320 字符上限的**错判代价不对称**论证；活性信号取代墙钟 TTL（健康长任务穿过网络分区）；终态回调磁盘 outbox 重放；**无 OS 沙箱是明写决定**（bypassPermissions+禁 AskUserQuestion+custom_args 黑名单；真隔离=独立 workdir+运行级 CODEX_HOME+mat_ 短票；签名密钥不下机；远程 MCP just-in-time 换票+SchemaDigest 钉死）；prompt 缓存前缀纪律+教 agent 按预算取上下文（先 roots-only 摘要再 thread tail）。
**F. 留痕与纪律**：`issue_source_context` 不可变快照（pending→attached 两阶段+属主交叉校验回滚+30 天 abandoned）；**append-only 版本表+不可变 principal**（trigger.created_by_id 建后冻结——"编辑触发器不能把运行重新授权成编辑者"）；AGENTS.md 工程纪律（禁 FK 级联/一文件一 CONCURRENTLY 索引+对全部 537 对迁移跑机械不变量测试/UI 消费 JSON 必过 zod 禁 as T/**改一处说明必须同次改动里同步引用处**/CI 双端生成物漂移检查/PR 强制 AI Disclosure）；术语治理一页权威（issue=任务 vs Run=运行 任何语言不得同词）；**rollout 反自证三重话术**（"ledger≠回填证明、快照≠当前证据、attestation≠proof"）；feature flag 退役政策（retire-but-publish）；DB 化调度器 JobSpec（Cadence/CatchUpMode/AllowStaleReentry=false 给非幂等/UUIDv7 主键+随机 v4 租约 token 写成断言测试）。
**G. 库内自证**：本机自部署 multica 实例把整套阶段流程做成 **kit-0-change…kit-7-integration 等 20 个 skill 挂给 34 个 agent**（含"reference 禁整读、首轮≤150 行"预算律与四挡位报价）——**流程=可挂载技能**在竞品环境里跑通了（与 code-kit 同构，AgentFlow 模板市场方向的直接证据）。
**H. 反面清单（照抄会踩）**：acceptance_criteria 有列无服务端校验；issue_dependency 建表补索引**从未接线**；emoji 反应不承载审批语义（别用 👍 当门禁）；无自动指派/负载均衡（路由只由 assignee/@/leader/autopilot 四者决定）；workspace 隔离是租户过滤不是安全边界（真边界=daemon 的 OS 用户）。


---

# ②-B 侦察补遗 — multica UI 层全量页清单与交互原语（同日第二轮，只读）

**对 ② 的三处修正（留痕不溯改）**：①`/{ws}/billing` 是调试页非成品，真订阅 UI 在 Settings→Billing；②Autopilot 详情**不展示**规则版本历史——DB 有 append-only 表但界面不可见（"留痕有、UI 无"是 multica 自己的缺口，我们落 #8 时必须两步齐）；③路由规模完整口径 55 个文件（上条报 46 page.tsx 为窄口径）。

**新证据块（UI/交互层）**：
- **详情统一骨架**：左 inspector（自动保存三态"保存中/已存/失败"）+ 右 `?view=` 分段 + 无权限走页内 `CapabilityBanner`/`Lock read-only` 不改 URL（`agent-overview-pane.tsx:78-99`、`agent-detail-inspector.tsx:150-345`）
- **保存视图=筛选快照(10 字段 FilterSnapshot)+`?view=<id>` 双向同步⇒视图即链接**（`view-store.ts:122-133`、`use-issue-view-url-sync.ts:13-49`）；分组含 `property:<id>`（自定义属性直接当看板列）；表列带 `TableCalculation`；属性值按定义 id 存袋，改名不动数据
- **Runtime 健康四态** online/recently_lost/offline/long_offline，**心跳 45s/离线 75s 阈值写进产品文案**；工作量折进健康列；Cost·7d 带环比；缺价模型显式告警+CSV 导出
- **失败三件套入口**：`Retry with context` / `Edit as advanced form`(回填原 prompt) / 升级到人（`inbox-page.tsx:749-792`）；`Run now` 先跑**权限/运行时/配额/归因四道门**、拒因原样 toast（`run_blocked_*`）；缺运行时→琥珀横幅+Bind runtime 直跳
- **Quick Actions**：管理员命名 prompt→Agent 动作、点击即跑无输入框、public/private+use_count+归档；"合并进已有运行"用中性措辞不谎报启动（`quick-actions-tab.tsx`、`quick-actions-section.tsx:29-45`）
- **权限渲染**：纯函数规则表+`{allowed, reason}` 枚举集中出文案，"为什么不能点"不解析字符串（`core/permissions/rules.ts`）；`AccessCell` 由 permission_mode+invocation_targets **推导**有效范围而非读 visibility 字段
- **草稿/滚动位一等状态**：两种创建形态互不覆盖槽位+共享附件池、评论草稿键随对象走、详情滚动 memento 恢复、未完成草稿入口页顶部聚合横幅
- **iframe sandbox 渲染边界**：附件预览 `sandbox="allow-scripts"+srcdoc`——与"运行时不做 FS 沙箱"不矛盾，**边界放渲染端**（`attachment-preview-page.tsx`）
- 导航 4 组 IA（个人|Work|AI Team|工具）；图标由路径反查单一真源；UUID→`MUL-123` 改写+`#comment` 深链定位；连续活动折叠"N activities"；时间线交织评论/运行/活动于一种流；Execution Log `Show past runs (N)`+每 run tokens/USD
- 工程侧顺带：声明式快捷键表(可重录/重置)、i18n parity 测试锁 5 语言、`t(($)=>$.a.b)` 代理式防错 key、`.env` 91 变量带权衡

---

# ②-C 终版合并净增（深读 agent 最终报告 vs 已呈审 ②/②-B，仅录差量）

1. **实时同步契约**：`internal/realtime`（推用户）与 `daemonws`（推 daemon）分工；**WS 只降延迟、DB 才是最终态**；重连后靠查询重新校准、WS 事件必须与 REST **完全相同形状**否则"下次查询到达时 UI 闪烁"（`core/realtime/use-realtime-sync.ts:11-24`）。
2. **RBAC 三个反直觉点**：private agent **连 workspace admin 也不能派活**（`core/permissions/rules.ts:64-66`）；`invocation_targets` 的 **team 枚举预留但 INERT 永不授予**（:69-75）；`visibility` 降级为派生遗留字段不再是鉴权源（`models.go:49-50`）。
3. **实测运行分布证据**（本机库）：139 次运行 **132 次由评论触发**；5 任务同时 `waiting_local_directory`（活路径非死代码）；issue revision 24-59 高频变更。
4. **远程策略三版本语义**（`internal/entitlement/README.md:12-38`）：schema_version / policy_revision / subscription_version 各司一问、TTL 单调钟封顶 5 分钟、"valid_until 只是诊断永不用于延长强制"。
