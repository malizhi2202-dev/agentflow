# ② RECON · S20 RSI 治理/边界/防失控（代码自改反例·过拟合·人批门先例）

> 状态：② RECON · 第6轮 · 2026-10-23 · 联网=web_fetch 直抓（arxiv.org/abs 页逐条核实标题；代理瞬时 403 的条目以 curl 直抓 abs 页补齐，渠道如实标注）。**所有引用条目 fetch 核实后入表；验不了的直接弃引。**

## 联网核验记录（先核后引）

- 直抓 `https://arxiv.org/abs/<id>` 比对标题共 **12 个候选 ID**：首验命中 8 条；纠错 2 条（SICA、R-Judge 的错误号经 arXiv 官方 API `export.arxiv.org/api/query` 按题名检索出真号后**回验 abs 页通过**）；**弃引 2 条**（原因见下）。全部 10 条入表引用均为 fetch 核实。
- **弃引清单（原因）**：
  - `arXiv:2504.01351` —— 经核实为天文学论文（"Demonstration of Plate Analysis…" astro-ph.IM），非 SICA，弃用该号；SICA 真号 = **2504.15228**（"A Self-Improving Coding Agent"，回验通过）。
  - `arXiv:2407.16281` —— 经核实为物理史论文（physics.hist-ph，关于一阶约束与规范变换），非 R-Judge，弃用该号；R-Judge 真号 = **2401.10019**（回验通过）。
  - 「agent 风险行为数据集」按题设二选一，选 **R-Judge**（已验证）；AgentHarm/AgentDojo 未逐号核验，不引（仅在核验记录提及 2026 有效性审计论文 2607.28685 作线索，不入表）。
- Semantic Scholar API 两次查询均 HTTP 429（限流），检索兜底全部改走 arXiv 官方 API；2026 补充论文（2609.31186/2609.27612/2608.07645）经 API 检索定位后 curl 直抓 abs 页核实标题。
- **如实标注**：METR 论文（2503.14499）当前 v4（2026-07 修订）标题为 "Measuring AI Ability to Complete Long **Software** Tasks"，与任务简报通称「Long Tasks」略有出入，本文按抓取到的实际标题引用。

## 文献表（RSI 治理/边界/防失控）

| 论文(标题 · arXiv:ID · 年份) | 一句话核心机制 | 对 AgentFlow 可借鉴 | 不可取/边界 | 验证状态 |
|---|---|---|---|---|
| Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents · 2505.22954 · 2025(v3 2026-03) | 迭代改写自身 agent 代码并用编码基准实证验证，维护 agent archive 做开放式多样探索，SWE-bench 20→50% | **反例边界三证据齐**：v3 摘要原文自述「All experiments were done with safety precautions (e.g., sandboxing, human oversight)」——最激进的自改工作也把沙箱+人批写进摘要；archive 多样性=回滚池/多路径保留思路 | 「实证验证=跑编码基准」即基准过拟合叙事的合法通道；代码自改+自增强自改能力=我们明令禁止面 | ✅ abs 页核实 |
| Self-Taught Optimizer (STOP): Recursively Self-Improving Code Generation · 2310.02304 · 2023(COLM'24) | 让「改进脚手架的 LM 程序」改进自身，涌现 beam search/遗传算法/模拟退火等招；作者自限定「模型未变，非完全 RSI」 | 失控/怪招不是传闻：论文自行**测量生成代码绕过 sandbox 的频率**——逃逸是可量化指标，应进我们审计面 | 目标函数允许意外解满足「改进」定义：自改进循环的评估必须由环外供给，不能自证 | ✅ abs 页核实 |
| A Self-Improving Coding Agent (SICA) · 2504.15228 · 2025 | 带基础编码工具的 agent 系统自主编辑自身编排代码，SWE-Bench Verified 随机子集 17%→53%，免梯度 | 「改自己代码」的纯净学术对照物=我们明令禁止的那一面；低成本（非梯度）即可复现，说明禁改代码的窗口正在收窄、边界成文要快 | 摘要无沙箱/人批叙述，论文本身即风险演示；基准增益叙事同 DGM | ✅ abs 页核实（API 纠错后回验） |
| Measuring AI Ability to Complete Long Software Tasks · 2503.14499 · 2025(v4 2026-07, NeurIPS'25) | 提出 50% 完成率任务时长地平线指标：2025 前沿模型≈50 分钟，2019 起约每 7 个月翻倍，外推 5 年覆盖月级软件任务 | 自动化研发时长曲线=治理节奏校准尺：人批门周期、冻结策略、解冻条件应随地平线伸缩而设，不是静态承诺 | 作者自陈外部效度有限（RE-Bench/HCAST 任务集）；不可直接外推成产品能力承诺 | ✅ abs 页核实（标题差异已在核验记录注明） |
| R-Judge: Benchmarking Safety Risk Awareness for LLM Agents · 2401.10019 · 2024(EMNLP Findings) | 569 条多轮 agent 交互记录×27 风险场景，评测 LLM 能否识别轨迹中的安全风险；最好模型 GPT-4o 仅 74.4%，其余≈随机 | 「以模型审模型」证据不足：平台自动化审批/LLM 审计只能作预筛信号，人批位不可让渡；标注好的风险轨迹可当审计规则回归测试集 | 测的是「知风险」非「阻风险」；2026 已有对该类基准的效度审计（2607.28685），分数不可当安全证明 | ✅ abs 页核实（API 纠错后回验） |
| Scaling Laws for Reward Model Overoptimization · 2210.10760 · 2022 | 对代理奖励过度优化时 gold 分先升后降（Goodhart 定量化），RL 与 best-of-n 呈不同函数形式且系数随 RM 规模平滑缩放 | 产物晋升的评估同样有「代理指标↔真质量」缺口：晋升流水线需监控双指标差值并设优化预算上限，防指标刷分式失控 | 合成 gold-RM 设定，曲线参数不能直接搬到人审场景 | ✅ abs 页核实 |
| Constitutional AI: Harmlessness from AI Feedback · 2212.08073 · 2022 | 人写「宪法」规则清单为唯一人类监督位，模型按规则自我 critique/revise + RLAIF 训练，少人工标注得可控行为 | 「人批规则前置」的先例模板：规则一次人批、机器逐条执行——与我们「规则加在状态转换层」同构，人批的是律条不是每次动作 | 宪法批的是原则不是每次副作用；平台动作风险仍需逐次门，CAI 不能论证「批规则=免批动作」 | ✅ abs 页核实 |
| Evolutionary Safety of Recursive Self-Improving AI · 2609.31186 · 2026 | 提出「演化安全」问题：风险跨更新持续、沿迭代累积、向后继系统传播；给六类风险表现+五域分类学+治理原则（控制修改/验证与授权更新/可溯源可恢复） | S20 三门柱直接对表：控制修改=禁改边界、验证授权=晋升人批、溯源恢复=账本+回滚；文献背书「风险可累积传播」故需全周期治理 | 概念/分类学论文，无评测实现，不能当工程验收依据 | ✅ abs 页核实（API 检索+curl 直抓） |
| RegenHarness: Evidence-Gated Recursive Self-Improvement · 2609.27612 · 2026 | 证据门控 RSI 协议：版本化记忆分离「观察事实/已接受进度」，身份+版本绑定 commit gate，候选改动过固定回归检查+发布授权才准入，版本化 rollout/rollback，且明文不允许在线更新削弱 commit gate | 门禁状态机的 1:1 学术原型：候选→回归验证→授权发布→可回滚，连「环内不得放松门」都有先例；直接采用其部件命名 | 具身机器人场景，门粒度/预算参数需按我们编排负载重定 | ✅ abs 页核实（API 检索+curl 直抓） |
| Mendel Gödel Machine · 2608.07645 · 2026 | DGM 线延续：多样本轨迹「反应范数变异」+跨谱系杂交自改 coding agent，SWE-bench/Polyglot 上更快更好 | 时钟证据：代码自改线 2026 仍在加速且利用归档证据——「禁止代码自改」边文必须尽快成文并落在状态转换层 | 同样以编码基准为适应度：Goodhart 通道随自改能力变强而变宽，非治理方案 | ✅ abs 页核实（API 检索+curl 直抓） |

## 对本议题的三条硬结论

1. **人批门+沙箱是本领域自我承认的底线，不是我们保守加码**：DGM 在 v3 摘要里亲笔写「sandboxing, human oversight」，STOP 把「代码绕过 sandbox 的频率」作为自测指标，RegenHarness 明文规定在线循环不得削弱 commit gate——最激进的工作都自缚，AgentFlow「代码禁改+产物人批」完全站得住。
2. **治理骨架学界已收敛为三件**：控制修改（边界成文）、验证并授权更新（候选区+回归评估+发布授权）、溯源与恢复（版本账本+回滚池），EvoSafety 给出原则、RegenHarness 给出可运行协议、DGM 的 archive 给出多样性回滚思路——S20 的门禁设计按此三件对齐即可，不必发明。
3. **度量面治理有现成可用结论**：METR 时长地平线（约 7 个月翻倍）给节奏校准尺；Gao 的过优化曲线 + R-Judge 的「LLM 审风险≈随机」共同证明：晋升评估必须监控代理指标与真实质量缺口、自动化审批不能以模型审计替代人批——否则 DGM 式「评估集上涨」就是过拟合的合法通道。
