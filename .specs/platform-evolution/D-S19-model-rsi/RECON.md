# ② RECON · S19 对话/经验数据回流微调（决策微模型自进化）

> 状态：② RECON · 第6轮 · 2026-10-23 · 联网=web_fetch 直抓（web_search 故障，全程直连 arXiv 摘要页 + export.arxiv.org API；抓取日 2026-10-23）
>
> 范围衔接：`.specs/small-model-decisions/`（REQUIREMENT 4/4·两步制铁律）已过审——本文只补文献侧证据与门禁缺口，不重做设计。

## 1. 文献表（9 条，全部联网验证）

| 论文(标题·arXiv:ID·年) | 核心机制一句 | 可借鉴 | 不可取/边界 | 验证状态 |
|---|---|---|---|---|
| STaR（Bootstrapping Reasoning with Reasoning·arXiv:2203.14465·2022） | 生成推理链→只对答对的留样本、答错的给答案反向「合理化」→再微调，循环 bootstrap | 「生成-按结果过滤-重训」=数据回流管线最简骨架 | 过滤仅凭最终答案对错的单信号，链可「对果错程」；无任何上线门/回滚概念 | ✅ 直抓 |
| Self-Rewarding LM（arXiv:2401.10020·2024·ICML2024） | 模型经 LLM-as-judge 给自己的输出打奖励，迭代 DPO；指令跟随与自评能力同涨 | 「策略模型兼裁判」在小决策模型上省一套独立 RM；迭代轮次可数的克制（仅 3 轮）符合我们预算思路 | 奖励与策略同源→漂移无外部锚（作者自认开放问题）；评测靠 AlpacaEval 榜 | ✅ 直抓 |
| SPIN（Self-Play Fine-Tuning Converts Weak LMs to Strong LMs·arXiv:2401.01335·2024·ICML2024） | 上一代模型自产数据 vs 人标数据做判别式自博弈，无需新增人标偏好 | 「旧模型产物当负样本」=对话日志回流的配对构造法，省人工标注 | 论文自证上限=人标 SFT 数据分布，不能凭空超越；起点仍依赖人标 | ✅ 直抓 |
| ReST / ReST^EM（Reinforced Self-Training for Language Modeling·arXiv:2308.08998·2023） | grow 阶段离线生成样本按 reward 过滤成可复用数据集→improve 阶段离线 RL 批量重训（EM 变体见正文） | 「生成-过滤-重训-数据复用」与我们候选模型影子生产节拍同构；批量离线=天然适配灰度节奏 | 质量门=单一 reward model 分数；止步离线指标，无 holdout 回归/回滚工程 | ✅ 直抓（ReST^EM 为正文变体，摘要未展开——已标注） |
| WizardLM / Evol-Instruct（Empowering large pre-trained LMs to follow complex instructions·arXiv:2304.12244·2023·ICLR2024） | LLM 把初始指令逐步改写为更深/更广的复杂指令，混合生成数据微调 | 「对话→难度递进训练集」的数据进化模板，可用于微模型场景扩充 | 进化的是指令非答案质量；评测用 GPT-4 judge，偏差未控（S18 Panickssery 同型风险） | ✅ 直抓 |
| Absolute Zero / AZR（Reinforced Self-play Reasoning with Zero Data·arXiv:2505.03335·2025） | 模型自出题自解题，**代码执行器**同时当任务校验与答案验证=零外部数据的可验证奖励源 | 「外部可执行真值替代自评」正解我们「谁当裁判」难题：执行日志/probe 回放即可验证奖励 | 前提是存在自动验证器（代码/数学）；对话与决策类结果不可执行验证→仅搬思路不搬机制 | ✅ 直抓（重验 id 命中） |
| SEAL（Self-Adapting Language Models·arXiv:2506.10943·2025） | 模型对每个新输入自生成「self-edit」（数据+优化超参+更新指令），SFT 持久改权重，RL 以下游表现奖励该自编辑 | 作为**激进端边界证据**入档：优化器内化为模型自身、监督信号自造 | 逐输入持久改权重=不可审计、不可回滚、无 holdout——正是第0步裁定禁止的方向；生产平台不可取 | ✅ 直抓 |
| Reward 过优化（Scaling Laws for Reward Model Overoptimization·arXiv:2210.10760·2022） | 对代理 RM 优化越狠，gold 分数先升后降；该 Goodhart 曲线随 RM 规模平滑可外推 | 给「金标 holdout 必留」提供定量依据：按优化预算预留 gold 评估配额、监控 proxy-gold 背离 | 合成设定（gold=固定 RM），真实人类偏好上曲线形状未必照搬 | ✅ 直抓（reward hacking 对照篇，Skalse 弃引见核验④） |
| GenAI 遗忘（Machine Unlearning in Generative AI: A Survey·arXiv:2407.20516·2024） | 系统梳理生成模型 unlearning：判别式方法不可迁移，需新问题表述与评估（成员推断/提取攻击） | 「对话→训练数据」必须内置撤回通道：数据按用户级溯源打标是回流管线的前置约束 | 综述级：精确删除仍≈全量重训，无生产级廉价方案 | ✅ 经 export.arxiv.org API 验证（题录+摘要） |

## 2. 核验记录（web_fetch 逐条）

1. **直抓成功（arxiv.org/abs HTTP200·标题对上）**：2203.14465、2401.10020、2401.01335、2308.08998、2304.12244、2505.03335、2506.10943、2210.10760（8 条）。2401.10020/2401.01335 的 ICML2024、2304.12244 的 ICLR2024 均见 arXiv 页 comments/journal-ref 字段。
2. **隐私/撤回条**：经 arXiv 官方 export API 题名检索命中「Machine Unlearning in Generative AI: A Survey」(2407.20516·2024) 与「A Survey of Machine Unlearning」(2209.02299·2022，RTBF 表述一致)，引用前者、后者作备查。
3. **择一执行**：数据进化候选 WeLM/WizardLM 择 WizardLM（id 可直抓验证）；WeLM 未验证不引。
4. **弃引（2 条）**：①Skalse「Defining and Characterizing Reward Hacking」——猜 id 2209.13083 抓回为无关题（几何复杂度论文），S2 API 持续 429 无法修正 id→弃，reward hacking 对照由 Gao 2210.10760（已验）承担；②Ginart「Can Machines Forget Data?」——arXiv 题名检索 0 命中（疑无 arXiv 版）→弃，RTF 缺口由 2407.20516 补。
5. 工具故障备案：Semantic Scholar 仅 search 端点成功一次，paper 端点全程 429；dblp 被反爬挡；均不影响本文结论（OpenReview 完成 AFlow venue 补验，见 S18 记录）。

## 3. 三条硬结论（未过⑤人审门，禁进 ROADMAP）

1. **自进化文献通病=自产数据回灌的漂移与自我强化，且普遍止步离线指标**（SR 自评无锚、Gao 的 Goodhart 曲线、SEAL 不可审计）。→ 回流派生模型必须过**双门**：冻结金标 holdout + 行为回归集；proxy 分与 gold 分背离即熔断；回流轮次设预算上限（对标 SR 仅迭代 3 轮）。
2. **两步制（候选影子跑→灰度→回滚）在学界没有现成对应物，恰是我们已过审 REQUIREMENT 的强项**。文献给出的是「生成-过滤-重训」内环（ReST/STaR），外环（上线门/回滚/账本）全靠自研——结论：**只接线不重做**：回流管线产物直接喂进 small-model-decisions 既有两步制门，不新建第二套发布通道。
3. **信号源与撤回能力是回流数据的两条前置约束**：奖励优先取外部可验证源（AZR 思路→执行日志/probe 回放），自评仅作补充；对话进训练集前按用户级溯源打标，使 right-to-be-forgotten 触发的 unlearning 有账可查（unlearning 综述结论：无溯源=只能全量重训）。此两条应写入 REQUIREMENT 约束层，而非事后补。
