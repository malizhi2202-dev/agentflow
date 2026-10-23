# ② RECON · S18 配置/prompt/编排层自优化（不改代码）

> 状态：② RECON · 第6轮 · 2026-10-23 · 联网=web_fetch 直抓（web_search 故障，全程按协议直连 arXiv 摘要页/OpenReview；抓取日 2026-10-23）
>
> 范围裁定：第6轮第0步已定——**代码层自改禁止**，RSI 只作用于产物；本文覆盖「prompt/编排配置/模板」层自优化文献，对照口径=我们「提案制＋人批发布门」。

## 1. 文献表（10 条，全部联网验证）

| 论文(标题·arXiv:ID·年) | 核心机制一句 | 可借鉴 | 不可取/边界 | 验证状态 |
|---|---|---|---|---|
| APE（Large Language Models Are Human-Level Prompt Engineers·arXiv:2211.01910·2022） | LLM 批量产出指令候选→按打分函数选优→由**另一个** LLM 做零样本执行评测 | 「生成候选→评分→选择」三件套雏形；优化者与评测者分离可照抄 | 只优化单条指令，不覆盖拓扑/参数层 | ✅ 直抓（含标题勘误，见核验③） |
| OPRO（Large Language Models as Optimizers·arXiv:2309.03409·2023·ICLR2024） | 把「历史解+得分」写进优化器 prompt，LLM 迭代生成更优解；prompt 优化=自然语言优化问题 | 落地成本最低：一个优化器 prompt+一个评估函数，形状即我们「提案生成器」 | 无梯度约束下易收敛到模板化提案（论文自观察「陷入语言惯性」）；上限=评估集 | ✅ 直抓（摘要含 ICLR 2024 标注） |
| DSPy（Compiling Declarative LM Calls into Self-Improving Pipelines·arXiv:2310.03714·2023） | 声明式模块图+**编译器**自动学习 prompt/示例以最大化给定 metric | 「编译+metric 门」=配置层自优化的工程范式；程序=可版本化文本 | 需显式 metric+训练集；改程序结构仍是改代码——超出配置层边界 | ✅ 直抓 |
| MIPRO（DSPy 中即 MIPROv2·Optimizing Instructions and Demonstrations for Multi-Stage LM Programs·arXiv:2406.11695·2024·EMNLP2024） | 多阶段管线联合优化指令+few-shot；mini-batch 评估做目标代理模型+贝叶斯选择，无需模块级标签 | 「小批量评估代理」直接解我们提案打分的全量执行成本问题 | credit assignment 靠启发式，模块级归因粗糙 | ✅ 直抓（摘要题名 MIPRO，MIPROv2 为 DSPy 实现名） |
| PromptBreeder（Self-Referential Self-Improvement via Prompt Evolution·arXiv:2309.16797·2023） | 进化 task-prompt 种群，且同步进化「驱动变异的 mutation-prompt」本身（自指） | 「模板与改模板的元规则一起进化」，纯配置层；fitness 训练集门=我们的自测门 | 计算开销大；自指进化无收敛保证 | ✅ 直抓 |
| Magentic-One（A Generalist Multi-Agent System·arXiv:2411.04468·2024） | lead Orchestrator 持 task/progress 双 ledger：运行期动态规划、调度子 agent、出错 re-plan | 实证「编排决定权可交给 LLM」——但那是**运行期分步规划权**，非配置发布权；与我们「运行期 LLM 可动态、发布必人批」两层正交 | 控制权交给单一模型，卡死/循环需外层硬控制；无提案持久化与回滚 | ✅ 直抓（择一弃 AutoGen） |
| MT-Bench（Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena·arXiv:2306.05685·2023·NeurIPS2023 D&B） | GPT-4 评判与众包人类偏好一致率>80%（≈人际一致水平），同时系统列 position/verbosity/自增强偏差 | 评测门可用 LLM judge，但须偏置校正（换序等）+人抽检校准 | judge≠真值；推理能力受限场景不可靠 | ✅ 直抓（择一） |
| Self-preference（LLM Evaluators Recognize and Favor Their Own Generations·arXiv:2404.13076·2024） | 自我识别能力与自我偏爱强度线性相关，控制实验支持因果向 | 警示入规：提案生成模型与 judge 同源→分数系统性虚高；门禁用异源/冻结裁判 | 机制结论限于 GPT-4/Llama2 设定 | ✅ 直抓（标题勘误，见核验③） |
| **AFlow（Automating Agentic Workflow Generation·arXiv:2410.10762·2024·ICLR2025 Oral）** | 工作流=「LLM 节点+边」代码化，**MCTS** 其上搜索，代码修改+树结构经验+执行反馈迭代；六基准均+5.7%，小模型 4.55% 成本胜 GPT-4o 部分任务 | 最贴「编排自搜索」：搜索对象是工作流配置表示；移植形态=我们的画布 YAML/模板层提案生成器＋离线评估 fitness | 其搜索空间含**任意代码改写**，须裁剪到声明式配置；benchmark 过拟合；MCTS 预算必须显式限步限钱 | ✅ 直抓＋OpenReview 验 venue（forum z5uVAKwmjf「ICLR 2025 Oral」） |
| GPTSwarm（Language Agents as Optimizable Graphs·arXiv:2402.16823·2024·ICML2024） | agent 系统=计算图：node 优化=prompt，edge 优化=拓扑连接 | 图表示与「画布=图」同构；证明拓扑层（非仅 prompt 层）可自动改进 | edge 优化实证收益较 prompt 优化不稳；无发布/回滚工程 | ✅ 直抓 |

## 2. 核验记录（web_fetch 逐条）

1. **直抓成功（HTTP200·标题对上）**：2211.01910、2309.03409、2310.03714、2406.11695、2309.16797、2411.04468、2306.05685、2404.13076、2410.10762、2402.16823 —— 全部 `arxiv.org/abs/<id>` 摘要页原文。
2. **AFlow·ICLR25**：arXiv 页无 venue → 改 OpenReview API（`api2.openreview.net/notes/search`）命中 ICLR 2025 主会记录，venue 字段「ICLR 2025 Oral」，forum id `z5uVAKwmjf`。✅
3. **题录勘误两处**：①候选清单写「APE（Large Language Models as Optimizers）」——该题是 **OPRO** 的标题，APE 真题经核验为「Large Language Models Are Human-Level Prompt Engineers」(2211.01910)，两篇均保留、各归各题；②候选清单写 Panickssery「LLM Evaluators Learn Biases Not Just Accuracy」——该页 v1 实际题名为「Recognize and Favor Their Own Generations」(2404.13076)，以后者引用。
4. **择一执行**：TextGrad/PromptBreeder 择 PromptBreeder（已验证）；AutoGen/Magentic-One 择 Magentic-One（Orchestrator 语义最直接，已验证）。被择一者未抓取、不引用。
5. 本文弃引：无。

## 3. 三条硬结论（未过⑤人审门，禁进 ROADMAP）

1. **优化器与被优化物分离是文献共识**：APE 用另一 LLM 评测、DSPy/MIPRO 靠外部 metric、MT-Bench 亲列 judge 偏差、Panickssery 证明同源裁判偏爱同源输出。→ 我们设计定为「提案生成（LLM）／离线评估（固定 metric 集+异源 judge）／发布（人批）」三权分离；任何一权不得兼任另一权。
2. **评估集质量决定自优化上限，Goodhart 在配置层同样成立**（OPRO 惯性收敛、benchmark 过拟合风险）。→ 评估集版本化、定期换血，门禁=冻结金标集+线上真实流量双信号；提案分数与金标分数背离即报警。
3. **AFlow 式编排搜索可搬，但加三个限定**：搜索空间裁剪为声明式配置（YAML 拓扑/权重/阈值，禁触代码，呼应第0步裁定）；MCTS/进化预算显式限步限钱；离线门过≠上线——仍走人批+可回滚发布。Magentic-One 表明「运行期 LLM 动态编排」与「发布期人批」是两层正交权限，可并存不冲突。
