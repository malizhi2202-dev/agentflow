# D-S21 · RECON · Harness² 设计+代码事实（2026-10-23）

> 源：/home/malizhi/project/harness2（Google，arXiv 2610.14224）· README+docs 3 篇+39 个 .py（13,367 行）全读 · 全部结论带 `文件:行号`
> 方法：静态精读 + 确定性 demo 取证（/tmp/h2demo）；两 png 图按 alt 文本+代码重建；.env.example 缺失等漂移实测

## 0 一句话
模型权重固定，**递归改的只有 harness（prompt/工具/记忆/技能/编排=声明式文件树）**；任务级 Propose–Probe–Compose 出「无真值行为差异证据」，harnessing 级把它沉淀进按域物理分库的 improvement harness。

## 1 本体（可编辑面）
- 8 组件 c1 prompt/c2 guardrails/c3 memory/c4 工具引导/c5 subagents/c6 skills/c7 scripts/c8 plugins（README:70-77；`harness.yaml` 声明）；温度/steps=FROZEN 平台侧不入面（agent_config_values:{}）
- 序列化=一棵「路径→文本」树（core/tree.py:31）；**每个面的可写路径正则+字符 cap+frontmatter 规则由 SurfaceSpec 声明**（tree.py:41-60；opencode cap 24k / codex cap 8k）
- INV⟂DOM 二分**只在提示层**：两句判别式（prompts.py:516「换了主题就不成立→领域类」/:542「换行业仍有用→不变量类」）；代码只有标签无校验器（recursion.py:135）——**真硬边界只有路径白名单**（tree.py:92 is_allowed + 越界收集回报 :127）

## 2 PPC 环
- 编辑器五道护栏（recursion.py:108 _accept_tree）：触发行自动补/无改动记 kept_base/树校验（cap·空面·未触发的 skill 判错·script 引用必须附带·hooks 白名单）/基准硬不变量（validate_tree，违例**原文回喂重试 ≤2 次，仍败 fell_back 继承旧树**）/防作弊扫描
- Probe=**同一任务真跑** k base+2k 候选+k 终身（`expected_rollouts=4k` 恒等式断言，ledger.py:26-38）；证据布局=每候选 `harness.diff+rollout.md+produced.md`（context.py:290），**无打分器，把差异摆给模型读**；口径写进提示：**「方差即信号」「单 rollout=弱证据」「无产出必须显式说」**（prompts.py:589/725/911）
- 选择=盲评（sha1 播种乱序、base 故意不在池=「结构上无从弃权」，selection.py:71/93）；k=1 免选择会话
- 并行=广度（iid 共享 base 证据、k 份独立聚合+**候选塌缩探测 line-Jaccard**，recursion.py:407）；串行=深度（轮 t 携带终身+累积 decisions）；**无早停，k 是唯一预算旋钮**

## 3 improvement harness（经验库）
- `<run-tag>/<mode>/<domain>/harnesses/<task>/{harness 整树, EXPERIENCE.md}`+INDEX 一行一 cue（library.py:15-24）；**「整棵树随取，从不摘要」**；全量 copytree 进下一任务上下文（context.py:161-165），靠「先复验再引用」纪律（「那里是事实，此处是假说」prompts.py:569）
- 准入两道（library.py:43/121）：**cue+lesson+evidence 三字段齐才可入库，否则采纳也丢弃**；反思器 verdict 词表 helped|hurt|no-effect|**confounded（拿不准优先选它——「编造归因会毒化库」）**+「**仅靠采纳本身不能证明有用或可迁移**」+`NO_ENTRY` 是合法输出（prompts.py:1105-1146）
- **无衰减/无检疫/无负例库**（只有 forget/retain 手动前缀裁剪）；因果前缀唯一硬规则=`retain(task_ids[:i-1])`「**经验只许来自早于自己的任务**」（schedule.py:701）

## 4 评测纪律
- judge 与改进完全隔离：「**方法里没有任何东西 import 本模块**…判分失败=None 不是 0，None 不记分母」（core/judge.py:15-19）；换 judge 模型=换度量（RUNS_DIR 隔离，cli/judge.py:169）；k=1 差值声明为 **NOISE FLOOR**（report.py:122）+终身被选率≤25%/base≥80% 等退化告警（:133-164）
- **防污染闸**：评测回流内容（pass_rate/deterministic_eval_summary/Judge findings…）与 leak 路径（tests/expected/reference/**）双扫，**晋升前+入库后再扫**（context.py:419-493，自陈「是绊线不是防御本身」）
- 指纹幂等：`.adapt_complete.<fp>.mark`——不同配置绝不复用旧 rollout；编辑会话内容寻址缓存（runmark.py）；**探针执行成本不计量**（cost_usd 从不赋值，ledger 只算会话钱）——自曝缺口

## 5 安全（坦白账）
- 人在环路=**完全不存在**（全仓 approve/confirm 0 命中；「notes 给人读不给机器执行」是唯一人因）；采纳=整树原子替换
- 执行器宽权限：codex `--dangerously-bypass-approvals-and-sandbox`（substrate/codex.py:166）+出口不限（EXPERIMENTS.md:93-109 实测 rollout 自行下载了 RUBRICS.json）；编辑会话反而有目录级 deny（OPENCODE_PERMISSION external deny）
- 「度量与改进同模型族」是默认（HARNESS2_IMPROVER_MODEL=执行器）——自我评估风险自带

## 6 基准=LAB/JobBench/WorkBuddy；README 增益句（+11.5/+4.5/+11.8pp）未能本地复现（py3.12 门槛），demo≠方法有效

→ 映射与裁决见 CONCLUSION.md
