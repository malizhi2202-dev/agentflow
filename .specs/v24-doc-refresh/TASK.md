# TASK: v24-doc-refresh

> 台账即事实。状态标只升不降。

## 主表

| # | 项 | 状态 | verify |
|---|---|---|---|
| T-1 | 四路只读对账（数据模型 / API 端点 / 前端语义 / 文档自述） | 🔄 3/4 已回 | `.specs/v24-doc-refresh/FINDINGS.md` |
| T-2 | 质量门实测（proto_parity / tsc / vitest / build / 后端 unittest） | ✅ | 见 `TEST.md` |
| T-3 | 主档 §1.6 标的声明 + 现状基线表（八维） | ✅ | `PRODUCT-DESIGN.html` §1.6 |
| T-4 | 主档 §1.6.0 波 0 判据降级（「可回滚」→「账本 + 幂等」） | ✅ | 同上 |
| T-5 | 主档 §1.6.7 ① 标 ⛔ 过期（裁定⑧ 冻结已解除） | ✅ | 同上 |
| T-6 | 主档 §1.6.1 P0-4 / P0-5 状态 + §1.6.5 P1-1 状态 | ✅ | 同上 |
| T-7 | 主档 14 节「规划原型 · 未实现」→「已实施」+ 实测口径注（§2.12 / §5.19 / §6.19–6.27 / §6.29–6.31） | ✅ | 同上 |
| T-8 | 主档 §3.3 导语表数 + 16 张表行四态标注 + 分组行 + §4.7 | ✅ | 同上 |
| T-9 | 主档 §6.28 旧运行时宇宙 / §6.30 / §6.31 设计态声明 | ✅ | 同上 |
| T-10 | 主档页眉 chip（v19 → v21）+ 页脚版本链（补 v21/v22） | ✅ | 同上 |
| T-11 | `RULINGS.md` 状态列 6 处 + 头部 2 处 + 术语表 1 处 | ✅ | `RULINGS.md` |
| T-12 | `RULINGS.md` **新增 §五点五「代码 ↔ 设计口径差异挂账」D1–D10** | ✅ | `RULINGS.md` §五点五 |
| T-13 | `INDEX.md` 版本谱系 + 代码基线口径 + 当前有效表 + 章节地图 + 处置台账 | ✅ | `INDEX.md` |
| T-14 | `STATE.md` 全量重写（消除 3 处自相矛盾） | ✅ | `STATE.md` |
| T-15 | 主档 HTML 校验（标签闭合 / 可解析） | ✅ | `TEST.md` |
| T-16 | 工件目录 `.specs/v24-doc-refresh/`（CHANGE / TASK / FINDINGS / TEST / REVIEW） | ✅ | 本目录 |

## 明确不做（已核销）

| # | 项 | 状态 | 说明 |
|---|---|---|---|
| X-1 | 改设计去迁就代码 | ❌ 不做 | D1–D10 一律挂账等裁定；单方面改设计 = 裁撤设计 |
| X-2 | 改代码去迁就设计 | ⚪ 第一批不做 → **第二批按裁定实施** | 用户「都做」授权后按 `RULINGS.md`（本目录）裁定逐条实施 |
| X-3 | 改 `prototype/` 127 页 | ❌ 不做 | 本轮无形态变更 |
| X-4 | 修 `scripts/ci.sh` 解释器 / `test_t07` 断言 / 6 张表未注册 | ✅ **第二批做完**（用户「都做」） | 见下方 C-0 |

## 待裁定（本 change 交付物，但需人工）

`RULINGS.md` §五点五 **D1–D10**。建议裁定顺序：**D5 / D1（设计价值最高）→ D8 / D9（口径直接冲突）→ D2–D4 / D6–D7 / D10（字段级）**。
每条两选项：「改设计对齐代码」或「改代码对齐设计」；裁定后回填 `RULINGS.md` §五点五 与本目录。

---

## 第二批：代码批（2026-10-25 · 用户「都做」授权 · 裁定记录 = 本目录 RULINGS.md）

| # | 项 | 状态 | verify |
|---|---|---|---|
| C-0 | P0 工程断点三修（ci.sh 解释器探测 · test_t07 哈希格式二分 · 6 表注册 Base.metadata） | ✅ | 后端 659 → 676 OK **0 失败**（原 1 红消除）；`Base.metadata.tables` 53→59+ |
| C-1 | D1+D2+D3（迁移 026）：记忆 `domain` 内容域 + `life_status` 生命周期两正交列 · content/confidence/quarantine_until · 来源链真外键（SQLite 开 `PRAGMA foreign_keys=ON`）· surface_manifests 四结构列 | ✅ | `test_rsi_dimensions.py` 17 例 |
| C-2 | D4（迁移 027）：表名统一 `improvement_proposals`（含数据）+ 五列；维度取值裁定保留可读写法并注等价 | ✅ | `test_rsi_proposals.py` 7 例（旧表保行/双表并存兼容） |
| C-3 | D5（迁移 028）：治理账三表；`rule_versions` **接线** create/add_trigger/update_sections；`probe_evidence` **接线** record_probe(evidences)（不传不造数）；`exec_ledgers` 表先行——**宁挂账不伪造恒等式**（R25-3） | ✅ 部分 | `test_governance_ledgers.py` 24 例（含「全表无打分级字段」反断言） |
| C-4 | D6（迁移 029）：触发三型 + `POST …/triggers/{id}/invoke`；投递两键分开（idem/delivery 分记分查，dedup 留兼容） | ✅ | 两键互不吃 ×3 |
| C-5 | D7：`disable_for_squad` 归档级联（状态转换层）· run_gate 独立 disabled 分支 · 恢复必须人点 | ✅ | 级联/不误伤/archived 不动/不自动复活 ×4 |
| C-6 | D8：白名单清 langchain/langgraph/autogen/crewai · runtime 必填 400 · snapshot 去旧宇宙 · 前端类型/fallback 同步 | ✅ | `test_runtime_and_rollback.py` ×5 + MF-03 订正 |
| C-7 | D9：`rollback_to()` + DOWN 026–031；**fix-forward 主纪律维持**（down=登记逃生门，未登记显式拒绝且一版不动）；纪律测试改「up 区扫描」 | ✅ | roundtrip/半截拒/未知拒/noop ×5 |
| C-8 | D10（迁移 030）：`golden_sets`（frozen/produced_by/eval_mark）+ `validate_shadow_gate`（冻结查账 · 异厂厂牌 fail-closed · `gate_evidence` 双口径）| ✅ | `test_golden_sets.py` 12 例（同厂拒/unknown 拒/self_declared 如实标） |
| C-9 | D11（迁移 031）：开关**停用必填原因**（服务+路由双入口 · 审计带因 · 前端管控面输入框 + 记忆中心 prompt 空=取消） | ✅ | 前端两用例含「无原因禁提交/取消不提交/body 带 reason」 |
| C-10 | tools 越权 403→**404**（API 对账唯一纪律违例清零） | ✅ | `routes/tools_api.py` 注 §7 |
| C-11 | 主档 v23 结案回写 + **修复首轮串位注记 3 行** + 端点名订正 3 处 + 页脚 v23 条 | ✅ | lxml OK · 标签全平衡 · memories 注仅存正确行 |
| C-12 | RULINGS §五点五·一 结案表（11 行）+ §五点五·二 残项（R25-1…11） | ✅ | — |
| C-13 | 最终门禁 | ✅ | 后端 **733 OK（0 失败，skipped=6）** · 前端 **tsc 0 · vitest 250/250 · build ✓ 19.9s** · `proto_parity --strict` exit 0 |

### 自造缺陷记录（复盘教训）
1. **补丁以 `def resume` 收尾遮蔽了原 `archive` 函数**（插入点理解错原函数顺序）——由 2 例红抓出。批量文本补丁改完必须「可导入 + 全量用例」双验。
2. **同一调用点被两个模式先后命中 → 重复 kwarg（SyntaxError 级）**——import 冒烟抓出。
3. **文档首轮 `key in plain[:60]` 模糊匹配串位**（memories 注误挂 3 行）——由 v23 补钉锚不命中暴露；表格行定位要行首列精确匹配 + 落位事后审计。
4. **测试硬编码批次版本数**，031 一加入即 3 红——改账本动态取。
5. **SQLite `DROP COLUMN` 不带走索引**（悬空即错）——down 先删索引后删列。
6. **真 MySQL 首跑 1364 连抓两次**（第一跑 `proposal_diff`/`probe_pack`，逐列修后第二跑又抓 `fell_back`）——同族问题逐列点修必漏第三件。终修：搬行前用 `information_schema` **族级枚举**「NOT NULL 且无库级默认且旧表所无」的列一律放可空。教训：真库首跑炸出**类**问题时，一条列 diff 查询就能列全该族，应先列族再修，不打地鼠（→ LESSONS L-014）。
