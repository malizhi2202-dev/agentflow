# ③ 结论与建议 · S11 A2A 协议面
> 状态：已过审（第 4 轮 · 2026-09-23 用户原话「通过」）· 依据 RECON 事实 1-29 + ★三处口径修正

- **C11-0 口径修正（v8 必改，三处）**：① kagent HITL 扩展 URI 是标识符非 URL（页面 404），引用改注仓库文档路径；② **#2149 Elicitation 已关闭未合并（09-22）且不改 TaskState**——「在途移动靶」论据弱化，「只映射不追协议」纪律**反而被实证更安全**，P1-12 不需等 v1.1；③ 差距④叙事校准：v1.0.1 收敛+ACP 并入（一手横幅）属实，但官方**明文不做 curated registry** →「无法被发现」比「无法被调用」更准，且**目录治理留白=我们的差异化地盘**（namespace+RBAC+配额）。
- **C11-1 M0 建议条（≈1 人日）**：静态 `/.well-known/agent-card.json`（必填 8 项、protocolVersion="1.0"、capabilities 全 false）；敏感卡 MUST 鉴权（GetExtendedAgentCard 后置）；默认卡只含 public 可见域 Agent。URL 指向不存在端点=信誉成本，宁缺页不空挂。
- **C11-2 M1-lite 严格前置**：SendMessage+GetTask+INPUT_REQUIRED 挂起→**同 task 续跑**（映射层自证、不引 SDK、不承诺 transport）；**前置两硬闸**=P0-1 身份修复完成 + 单副本承诺书面化——**P0-1 未落地前禁止暴露任何对外写端点**（新纪律句入 §1.6.5）。六态↔TaskState 映射表（pending→SUBMITTED…error→FAILED…拒≠REJECTED）落库为枚举对照。
- **C11-3 P1-12 强化**：SDK AgentExecutor 契约已把「发 INPUT_REQUIRED→return 让出→输入后续跑」写实 + kagent HITL 语义页原文钉住（无第二 task 模型/非提示词重建）——映射从「设计自洽」升级为「与官方契约同构」。
- **C11-4 M2 冻结**：SSE 长连×单副本冲突+webhook SSRF 面与「出网 deny」正面冲突+规范内部矛盾；盯 #1991/#1995 出 v1.1 再议。
- 文档落点：1.5.2 差距④升级句（按 C11-0③ 校准）；1.6.2 P1-12 行补「契约同构」证据+URL 修正；新增建议条「M0 AgentCard」「M1-lite 及前置闸」（编号待 ⑤）；§1.6.5 加 P0-1 前置纪律句；p4 详情「A2A 卡片」tab+p27 协议区=原型落点；Q21 新 FAQ（为何停 M0）。
