# D-S23 · RECON · harness2 internals 二遍增量（只读 · 2026-10-23）
> 首包崩溃后重扫（分面推进）。前轮已覆盖（tree/SurfaceSpec/五护栏/pool/盲评/恒等式/library/judge 隔离/runmark/防污染/不该抄 12）不复述。本轮实质增量=**校验落点与顺序 + 参数化常量表**。路径相对 /home/malizhi/project/harness2/。

## ① 钩子/编译/模板面
- hook_events 十事件白名单（codex.py:59-72）：PreToolUse/PostToolUse/PermissionRequest/PreCompact/PostCompact/SessionStart/SubagentStart/SubagentStop/UserPromptSubmit/Stop → 🟢 我方 runtime 生命周期事件表（现无名单）
- check_hooks **七个失败模式**（tree.py:216-251，2026-10-23 二遍更正）：JSON 不可解析/顶层缺非空 hooks dict/事件不在白名单（报错列全可派发集）/entries 不是 list/entry 非 dict 或缺 hooks list/type≠"command"（框架侧 async·prompt·agent 静默跳过）/command 空——**按 7 条做用例矩阵**。理由成文：**坏 hook 不报错而是不触发→必须在校验层提前失败** → 🟢🟢 我方「静默失效的门禁注册期校验」原则（配「人批规则加状态转换层」）
- compile_skill_scripts（tree.py:364-370,254-264）：surface 开启才编译 `<skill>/scripts/*.py`（compile(src,rel,"exec")，不 import 不执行），SyntaxError 名+行号截 160 字 → 🟢 技能上传「编译但不执行」
- 引用一致性（tree.py:320-333,:71）：文本里 `python3 …/scripts/x.py` 引用必须真在树，RESERVED(:34) 豁免 → 🟢 skill→脚本/工具引用完整性
- 帽带理由进数据结构：always_on_max=8000 + **always_on_cap_reason**（「整体注入每轮且 codex 32768 字节静默截断」codex.py:39-46）→ 🟢
- compose_prompt（opencode.py:140-170）：always-on+索引（只 name: description 行；脚本报名+安装路径）Jinja 拼接 `\n\n---\n\n`；_frontmatter_desc 只扫前 600 字符缺省 `(no description)`(:127) → 🟢 市场卡片「只暴露 name+desc 正文按需读」
- **assert_jinja_safe 三不变式**（opencode.py:99-124，调用序 :207-217 compose→移动 guidance→**先 assert 再落盘**）：`{{ instruction }}` 恰 1 次、模板 rstrip 后以它结尾、其余任何 `{{`/`{%`/`{#` 一律拒（StrictUndefined 下多余花括号 trial 前死；`{#` **静默删文本**；双占位符二次注入任务）→ 🟢🟢 我方 config/prompt 渲染前断言（花括号出现即拒）

## ② 反退化钳/白名单读入/泄漏集
- validate_tree 钳**渲染后产物**：oc 用 subprocess 调被测框架自己的渲染器（内嵌源码 _RENDER_CHECK_SRC，300s）拿 rendered.prompt 再查缺词；cx 查 AGENTS.md 正文；渲染失败也 raise "harness does not render"（lab.py:845-904,374-386,866-869）；错误文案=**祈使式可执行指令**（"Add the output/ rule back…"），且明写 message 原样回灌做重试反馈（spec.py:242-245）→ 🟢🟢 我方 .specs 校验同法
- _tool_gate_problems（lab.py:906-931）：同一 run 两份配置交叉校验必互为 expect、文件不存在不算冲突 → 🟢「同一不变量两处独立校验」模板
- **_admit 正向白名单读入**（wb_render.py:33-38,:64-86）：每 subset 一组允许路径；未知 subset/trial 外/名单外三各自 raise 且**把白名单原文印进错误**；每次读都过 admit(:90) → 🟢 证据读取入口；FORBIDDEN 负面清单(:41-53 全仓无引用)→🔴 不采（负面清单随布局漂移）
- 判决词三级嗅探成本递增（wb_render.py:94-135）：文件名前缀→头部 4000 字符 7 条 verifier 所有权短语→全文 5 条 marker；无 verifier 落盘处直接 None → 🟢 judge 隔离补「文件名前缀」层
- 命中=**丢弃+记因清单**（withheld "<name>: <reason>"，raw_files 同决策按名过滤，不打标记不留 stub）（:350-419）→ 🟢 比标注保留安全
- 「不可见即声明」渲染（:165-221）：图片永不内联只 name+size（base64/OCR 猜测诱导没人看过的像素推理）；xlsx formula+data_only 双 facet、无缓存明写 `(no cached value; a data_only reader sees this cell as EMPTY)` → 🟢 trace/产物渲染
- 降级必显式（:316-341）：缺 openpyxl 且无桥→报错印「降级成 (binary, not rendered) 与'啥也没产出'不可区分会整片清空证据」→ 🟢 文档解析禁降级为空白
- leak_globs 实测集：wb code=tests/solution/environment、web/office=tests/environment、jb=RUBRICS.json,eval_result,expected,reference、lab=task.json、demo=reference_answer.txt；匹配**双形态 `g` 与 `*/g`** 防嵌套漏判（workbuddy.py:91,99,108; jobbench.py:518; lab.py:490; demo.py:52; context.py:205-209）→ 🟢 我方起步集

## ③ 桥/续跑身份/告警阈值
- token 桥：port+key 落盘**优先复用已存值**、secrets.token_urlsafe(24)+bind(host,0)、chmod 0600、master_key 用 env 间接引用不进 yaml（bridge.py:48-61,29-39）→ 🟢 PAT/网关凭据件（复用+0600+env 间接）
- **续跑身份文件可整体照抄**（run_sweep.py:209-235）：namespace 目录写 config.json、比较式 `json.loads(old)!=json.loads(json.dumps(new))`（**JSON 往返归一 tuple/list**）；身份 12 项含 method_version/executor/improver/judge/…/**完整 (domain,task) 流**/…/seed；不一致唯一出路换 RUNS_DIR 不做合并提示 → 🟢🟢
- 判据前置（:22-27,145）：真跑前先离线校 judge（「跑完才发现缺 judge=付两遍钱」；边界：只兜未配不兜不能服务）；**零任务在 dry-run 阶段就 `return 0 if stream else 1`**（入口 :136-139、打印流序 :91-118；真实跑的「拒绝报成功」在 :183-190、退出码分层 :204-206）；退出码 0 全绿/2 有 failed/1 有 domain 死 → 🟢 preflight+CI 契约
- 报表对坏行「记因跳过」不整体失败（cli/report.py:37-55,87-95）→ 🟢
- 退化告警四判据一注（core/report.py）：chose_final≤25%警告（池外抄参考）/kept_base≥80%警告/fell_back>0 提示先读 stage errors/混分制警告（「差约 20pt，重判 fallback 行前别与任何已发布数比」:156）/k=1 差=NOISE FLOOR(:122-131)；**未评与未完成行从分母剔除非计 0**（:17-19,91-99）→ 🟢 阈值直接进我方指标看板
- _kind 产物谱系分类（:68-77）：base 前缀/agg=final/seq 恰 c1..ck=final（「每个 seq checkpoint 都是 composed final」）→ 🟢 .specs 产物 lineage 标签

## ④ 反思/附件/成本
- _distil 增量件（selection.py:454-505）：喂模型前 copytree(ignore=selection.json)+assert；成文后再扫一次判决词（**输入输出端各扫一次**）；失败仍 `sel.usd += exc.cost_usd` 记账；键白名单四、前三缺一整条丢（我方已采）→ 🟢「两端各扫+忽略自身判决文件+失败记账」并入
- source/ 附件化（context.py:191-216）：adapter 可选 task_files（getattr+callable 探测），无→返 0 不报错；跳 __pycache__、leak 双形态过滤、copy2 保 mtime、dst 再过 assert；计数决定 layout 是否列出 → 🟢
- 证据装配「**全失败必显式失败**」（:171-175：所有 rollout 渲染失败→RuntimeError「proposer 将在 nothing 上改」，部分失败进 failed 列表；:219- 只 catch 轨迹读取器——其失败本身是证据）→ 🟢
- mission() 两条不变式可直抄（:521-546）：「每个轨迹事件都在、未为适配 mission 裁剪；截断标记是**我们的**别诊断成 solver 故障」「**每个改动必须能指到具体轨迹时刻，指不到的就是 speculation**」；layout 只描述实际落盘、故意不给内容处明说（:60-99）→ 🟢🟢 进我方生成/评审提示词
- 成本三元组收口（proposer.py:162-251,486-504）：claude 取 total_cost_usd 单值、opencode 逐行累加 part.cost round6、失败 Reply 也带 cost_usd、跨 attempt 累加 → 🟢 双通道同 `(text,cost,err)` 签名
- **内容寻址缓存两细节**（:143-147,507-534; recursion.py:202）：键含 context 绝对路径（「两模式证据逐字节相同也必须仍是独立抽样」）、require_workspace 才许命中、命中 cost=0.0+cached=True、**spent_calls 未命中才计次** → 🟢🟢 我方续跑去重+预算计数
- 通道卫生（:44-49,271-232）：剥 5 个 ANTHROPIC_* 再按通道重注入；临时 XDG 目录+external_directory deny；system>120k 走 stdin 块+指针式 append → 🟢 子进程 env 白名单
- **两层重试分离+零改动=合法**（recursion.py:108-231）：内层 TRANSPORT=2 只管空回包/超时，外层 STAGE=2 管语义拒绝（回灌 `# YOUR PREVIOUS ATTEMPT WAS REJECTED`）；三类文案各自成；diff 零改→**kept_base（无变更是合法结果非错误，报告里不可隐身）**→ 🟢🟢 我方状态转换层：Agent 交回空变落入 kept 态可见

## ⑤ 契约测试→我方验收断言候选（tests/test_workflow.py 5 条+demo.py 零模型全链路）
- A 配置缺失在**装配期**失败（resolve 可空 model，构造即 ValueError；空串≠未覆盖）:50-57 → 🟢
- B 恒等式对 agg/seq 各成立+选中件**字节级**断言 :58-79 → 🟢
- C 同参重跑执行数与调用数**都不增**、全 skipped、k=1 零选择会话（trivial_selection 同 schema 落 selection.json 让 watcher 只找一次）:80-94 → 🟢🟢
- D **篡改检测重算**：事后改选中件/删答案→该任务回 "ok" 重算而兄弟仍 skipped=「内容指纹驱动失效而非时间戳」:95-106 → 🟢🟢 .specs 产物账本
- E 反思证据树 8 件齐备+判决注入后全树零副本+raise+库目录前缀因果 :108-129 → 🟢🟢 judge 隔离三条验收
- F 连续两次会话 XDG db 都不存在（mock 自证隔离）:130-146 → 🟢 会话串味断言
- G 退稿回灌+成本跨 attempt 累加可断言 (fell_back,attempts,usd)=(False,2,3) :148-185 → 🟢
- H/I NO_ENTRY/reflection 失败绝不进库、selection 失败仍记账、**判分器全程不调、行 (False,None)** :187-225 → 🟢🟢「失败/无教训绝不进分母」
- 🟡 全部绕开真实 CLI/网络（Demo adapter）——我方无 CI 且 build 必败，**先建 DemoAdapter 形状零模型端到端**比散点单测划算

## ⑥ 常量表（预算帽参数参考）
- R=4k/P=3k **参数化写法（按 k 线性）**（ledger.py:15-27,90-103）→ 🟢
- config：METHOD_VERSION 进身份；PHASE_WIDTH=2/TRANSPORT_ATTEMPTS=2/PROPOSER_CONCURRENCY=2（**0=不限** 语义）、线性退避 sleep(10*(n-1))、DEPENDENCY_PINS(4 sha)+ASSETS.json **独立 checksum 双表**（check_provenance.py:21-38 校并列 Changed/missing）→ 🟢 三处：0=关闭语义/退避式/**pin+checksum 双表**
- 截断四层帽体系（LAB_DELIV_CAP=60k 注「CAP=0 不截；裁过的视图会对被判内容致盲」lab.py:336-339; JB_OBS 50k; 轨迹总帽分档 1e9/8M/2M; 单文件 200k 带**可见**截断标记 jobbench.py:525,929）→ 🟢🟢 我方预算帽表照分：**always-on 帽/单观察帽/单文件帽/轨迹总帽+截断必留可见标记**
- ChannelSpec(kind,model,effort,steps=120,timeout=3600)+**channel 与 model 必成对覆盖**（裸 id 与带前缀错配=下游静默失败）、opencode 必带 provider/、claude 必不带（spec.py:36-86）→ 🟢 模型路由
- BenchSpec 校验（:129-173）：obs_trunc<10_000 直接 raise「**该区间会凭空造出缺陷**，用 ≥10k」=「帽有下限+下限的理由」同入代码；reserved_scripts 必裸 basename（含 / 即拒）；channels 必含 proposer+selector → 🟢🟢 我方 config.py 最缺的一类
- BenchPrompts 六字段禁词扫（"benchmark/evaluation/grader/rubric/score"，报错语「必须描述 WORK 不是它的测量」）（:89-127）→ 🟢🟢 .specs 模板组装期：评测词不得进任务提示
- RunView 无分数字段+score 注释范式（None=judge 失败不是 0 永不缓存成 0；只在 selection 提交后调用）+execute 按 run_id 幂等（:176-250）→ 🟢 接口注释范式
- 轨迹归一化（codex.py:231-41,264-94,340-69）：统一截断标记常量、剥 \x00、**按 item.id 去重（末态覆盖内容首现保留位置）**、junk 前缀白容忍、折叠连续重复、AGENTS.md user 角色回流坑单列 `[HARNESS AGENTS.md]` → 🟢 trace 归一（去重+角色纠偏必抄）
- 🟡 preflight 真连一次 socket.create_connection(5s)+主动 pop OPENAI_BASE_URL（「自定义 provider 来自 HOME 非全局 URL」:207-228）→ 🟢 离线 TCP 探活形状；两个 dangerously 旗标=评测室特权不外推

## ⑦ 三条最高优先并入项（扫描者自报）
1. `run_sweep.py:209-235` JSON 归一的**整包续跑身份**（12 项含完整任务流）
2. `recursion.py:108-134`+`report.py:141` **空变更=合法 kept 态**且被 0.8 阈值告警兜住（不失败也不隐身）
3. `tests/test_workflow.py:95-106` **内容篡改触发精确重算**的状态机验收（内容指纹驱动失效，非时间戳）
