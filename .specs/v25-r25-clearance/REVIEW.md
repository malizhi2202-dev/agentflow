# REVIEW — v25-r25-clearance 自评（两遍）

> 自评轮，非独立 agent 验收。**判据先行，结论后置**。

## 第一遍 · 方向与授权

| 问题 | 结论 |
|---|---|
| 本批凭什么动代码？ | 四条人工裁定（全做 A+B+C / HMAC 双通道 / 总闸落表 / exec_ledgers 挂起）+「制定计划进入代码开发」授权；计划经 ExitPlanMode 批准，五笔拆分按 C→B→A→docs 顺序执行。 |
| 有没有单方面改设计？ | 没有。D 批口径反转两处（status 列名契约、表保留）在 v24 已记录；本批只把「残项清账」写入结案表，词表定义（fnmatch 等）是**裁定成文**不是设计改写。 |
| 有没有过度交付？ | 有一处主动升级（R25-8 从「前端补弹窗」升级为「+后端 `run_from_assignment`」）——依据是探查实锤「两头有、中间没有」，前端确认层若无后端开跑语义就是假按钮。已在 CHANGE 登记，非擅自扩权。 |

## 第二遍 · 质量与诚实

| 判据 | 结果 |
|---|---|
| 双入口校验 | `assign start`（服务+路由）· `set_switch` global（服务+路由）· 结构规则（写侧 create/update + 读侧 assert_editable）——全部两处分立校验 ✓ |
| fail-closed | 未配置签名却带签名头 ⇒ 401 `signature_unconfigured`；畸形结构规则 ⇒ 写拒、读拒（坏配置≠全放行）；总闸缺行 ⇒ 合成开（与「行不存在=未停用」的账本语义一致，**非 fail-open 误伤**——判定发生在存在性语义层）✓ |
| 诚实呈现 | 前端不再把后端已落库字段标「未接入」（SurfaceSpec 画真值 + 「—（未配置）」）；不伪造 golden_set / mention 收据 / exec_ledgers 恒等式 / coalesce 投喂——**写侧无位点就挂账**；界面「回滚未接入」显式标注 ✓ |
| 门禁证据 | 空输出不算过（后台管道教训）——本批全量/重放全前台取到明确 `Ran 774 OK` / 九项 True ✓ |
| L-014 执行 | 动 schema 在权威方言实跑 + information_schema 形状验收，未以 SQLite 绿为收口依据 ✓ |

## 缺陷账（本批内发现即修，均不遗留）

| # | 缺陷 | 处置 |
|---|---|---|
| 1 | HMAC 门首版会把存量 token 通道打成 401——**实现与裁定文字冲突** | 改为「不带签名头回落 legacy_token」，与裁定「双通道并存」对齐；补 `无头 202 auth=legacy_token` 用例锁死 |
| 2 | 自测用例断言瞬态 ORM 属性（`default=` 客户端默认，裸 SQL 带不上） | 改断 PRAGMA `dflt_value`——正是 L-014 的第二形状，用例留作教学 |
| 3 | 迁移纪律测试硬编码「最新两版」语义过期（rolled 8 ≠ 2） | `test_rollback_roundtrip_top_two` 全动态（target=`versions[-3]`） |
| 4 | 前端测试等价编辑两次吃掉闭合 `});`（memory-page / control-plane 回退用例） | tsc 语法门抓出 + brace-balance 复核至 0；教训入 TEST §四 |
| 5 | `getByText('rule')` 撞筛选 select 的同值 option、content 尾串精确匹配不中 | 断言改按 chip `title` 与 `/· …/` 正则——测的是行内回显，不是全页唯一文本 |
| 6 | 文档吹过头一处：「source 词表补 `automation_preset`」实际代码是名差保留同义放行 | 主档 1313 注与 RULINGS §五点五·三 同步改实（**落笔前查码**，不据计划反推实现） |

## 遗留与风险（继承给下一批）

- 「表先行·写侧挂账」族 6 项（RULINGS §五点五·三 R25-11 残位列）；评论实体表缺口是其中两项的前置裁定。
- `rollback_to` DOWN 未经生产 MySQL 演练；001–025 无 down（按需补登，不假装全量可 undo）。
- webhook token 退役待新裁定；`concurrency_policy` replace 需引擎抢占语义设计。
- `node_modules` 仍被 git 跟踪（历史欠账，与本批无关，CI 门未受影响）。
