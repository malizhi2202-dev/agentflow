# ② 竞品侦察 — harness 品类 2026-08/09 新态势

> 取证方式：并行 web 侦察 agent 于 2026-09-22 实抓（GitHub Search/Repo API、releases.atom、commits.atom、raw README、官方博客/文档站）；未抓到字段标「未找到公开信息」。完整报告含全部来源 URL，本节录结论性事实。

## 头部池 9 月内的重大动作（择要）

- **multica 51,081★**：9 月连发 v0.4.41→v0.5.1（6 个 release）；README 今证六件套齐备（Squads/Issue/Inbox/Review gates/逐调用回放/token per run·issue/多端+渠道）
- **AgentTeams（agentscope-ai，5,655★）**：v1.2.2-1.2.4（08-08→09-20）——人工干预**记录审计元数据+变更前快照**+干预时间线+Worker checkpoint 图（1.2.3）；**任务状态机**（状态转换历史/事件/进度）；workflow DAG **只读 Mermaid 渲染**；L2 团队权限
- **OpenHands（org 更名，官网 88.8K★）**：重心转 Agent Canvas 产品（v1.20 起 release 附桌面安装包）；Jira Cloud 组织集成（08-26）；入 NVIDIA Open Secure AI Alliance（08-10）
- **AutoGen → 维护态**（microsoft/autogen 最后重要提交 2026-04-06 "maintenance mode banner"）；后继 microsoft/agent-framework 周更
- **swarms / MetaGPT**：2026-07 以来无 release（swarms 停 6.8.1@2024-12；MetaGPT 停 v0.8.2@2025-03，产品化转闭源 MGX）
- **agno v3.0.0**（08 下旬发版，特性细节未公开）
- **K8s 阵营立标准**：agent-sandbox **v1.0.0 GA（08-28）**；google/ax v0.3.0（09-20，README 自述 sandbox+网络围栏，跑 Agent Substrate）；kagent v1.0.0-alpha1 + **HITL 已升格为 A2A 扩展**（`https://kagent.dev/extensions/hitl/v1`：input-required 暂停→人类回复**延续同一 task**；tool approval / ask user 两形态）；kagent×agentgateway 上 AWS/Azure/GCP marketplace（08-27）
- **A2A 协议层**：08-27 加入 AAIF；roadmap（09-15 更新）v1.1 项含 **task timeline 细化/事件过滤、Elicitation 与多轮 HITL（#2149/#2143）、a2a-cli**
- **agentgateway v1.5.0**（09-02，附 agctl）；**agntcy/dir v1.7.1**（09-22）

## 新崛起的同类（2026 立、本月核实）

| 项目 | ★ | 一句话定位 | 对位 AgentFlow |
|---|---|---|---|
| oh-my-claudecode | 39,297 | Claude Code 的 teams-first 插件层编排（无 Web UI） | 团队编排可作插件层长出——佐证 runtime 注册路线 |
| vibe-kanban | 28,159 | kanban 派活给多 coding agent 的本地工作台 | "工作项+负责人"界面范式先行者 |
| amux | 491 | 开源 agent 控制平面：**CAS 原子认领、done 需证据、peer 复核、per-card budget** | 质量/成本门禁下沉到卡片粒度——与 W-1 空白直接对位 |
| Puppetmaster | 449 | durable-state swarm 控制平面：**leases + artifacts + 成本审计** | Reconcile+产物谱系的工程雏形 |
| ClawManager | 1,896 | K8s-native 实例控制平面（管 OpenClaw 群） | 与"隔离域+管控面"最同构的新对手（无工作项层） |
| OCTO | 1,060 | IM 原生人机工作场所（agent=工位数字分身） | 第三条路线（IM 为内核），不跟进但记录 |
| dsh-agent-teams | 1,766 | 本月最速新星："One prompt. A working team." harness 内嵌团队层+Web UI | "对话中心+编排"融合方向的社区验证 |
| agent-teams-ai | 2,157 | 免费桌面"老板-团队"低门槛版 | 下沉市场信号 |

背景噪声级：OpenClaw 390,237★（催生二级生态管理工具群）；claude-squad 8,516★ 放缓。

## 品类收敛形态（六件套=入场券）与空白（本日 20+ 项目核实）

**事实标准**：①工作项+负责人（可为 Agent）②收件箱+审批门（只 ping 拍板人）③可回放执行时间线 ④成本按 run/agent/issue/card 归因 ⑤runtime 注册+代码不出本机 ⑥协议化（A2A/MCP/AGNTCY）。**审批语义从产品功能走向协议规范是本季最重要信号。**

**空白（零先例，v2 §1.6.4 判断全部存活且更硬）**：编排画布双向可编辑+对账（最强竞品 AgentTeams 只有只读 Mermaid）；知识产物谱系+晋级门禁+版本账本（品类无对应物）；Reconcile 自愈×协作界面融合（会 reconcile 的没工作台，有工作台的只会 retry）；**域=配额+沙箱+RBAC 三合一强制边界（没人组装）**；agent+runtime+工具三合一产品级目录（A2A 明文不定义 registry）；团队/域级跨协作度量。
