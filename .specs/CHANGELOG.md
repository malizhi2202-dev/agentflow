# CHANGELOG

> 变更账本（change 级）。一行一 change：日期 / change-id / 一句话 / 提交 / 新增 LESSONS。
> 归档到 `.specs/archive/` 的 change 在此保留索引行（不在归档时删除本表）。

| 日期 | Change | 摘要 | 提交 | 新增 LESSONS |
|---|---|---|---|---|
| 2026-10-24 | `v20-wave0` | 波 0 止血：32 个 TS 错误清零（build 复绿）· 迁移账本 001…· 阶段模型单一事实源 + 两份 scanner 合一 | `d2ee8d96` `8d3fdc1d` `24c38aa1` | L-002（衍生） |
| 2026-10-24 | `v20-wave1` | 波 1 身份三连：服务端会话（cookie>PAT>401）· argon2id + 废出厂口令 · 部署闸门（DEPLOY_MODE/XFF） | `5cf2a6fa` `129c33ec` | — |
| 2026-10-24 | `v20-wave2` | 波 2 单副本事实固化：队列/限流/退避/偏移落库 + 任务租约 + 单例循环租约选主 + 集群条 | `09950db4` | — |
| 2026-10-24 | `v20-wave3` | 波 3 协作层最小集：告警落表 + 双队列并表 · work_items/work_item_runs/订阅/收件箱三规则 | `57945f50` `67420190` | — |
| 2026-10-24 | `v20-wave4` | 波 4 团队与小隊：Team ⟂ Squad 两实体 + 五类资产归属（配额/转让/释放）+ leader 任务指派 | `ac839aa0` | — |
| 2026-10-24 | `v20-wave5` | 波 5 差距能力：可观测产生端 + /metrics · 声明式四件组（ETag→412/conditions/change_log/watch SSE）· 执行隔离契约 fail-closed | `943b7e5e` | L-002 L-003 L-004 |
| 2026-10-24 | `v20-wave6` | 波 6 RSI 治理：记忆四层晋升门 · 提案三权分离（探针不作发布依据）· 可改面 · 四熔断 + NOISE FLOOR | `64e44de6` | — |
| 2026-10-24 | `v20-wave7` | 波 7 遗留项收口：A2A M0 静态卡 · 因果前缀 + 晋升评审账 + 防污染双扫 · 四类开关 · 归因双列 + 瀑布 fail-closed | `13faefbe` | L-001 |
| 2026-10-24 | `doc-align-v20` | 文档归并：RULINGS/INDEX 建档、门面改齐、删 8 张孤儿原型页（135→127） | `fcc00645` | — |
| 2026-10-24 | `v20-rsi-adapters` | 真实 judge 适配器（显式配置 + 预算帽 + 可注入）+ L0 定时抽取作业（默认关闭）；三类业务错由 500 改正 400 | 见「feat(rsi-adapters)」提交 | — |
| 2026-10-24 | `v21-completion`（收口） | 8 项任务全部完成（T-01…T-08）；最终 CI 全绿：后端 **523 OK**（services/routes 覆盖 50%）、前端 **109 例**（语句 18.22% / 分支 67.74%）、build ✓；真实 MySQL + 真实 CLI E2E **23/23**；收口报告含诚实边界（a11y 非 axe / 无 down 迁移 / dsh 本轮外部不可用 / 门禁为自评轮） | 见「feat(v21-t07)」「docs(v21-closeout)」提交 | L-007 L-008 |
| 2026-10-24 | `v21-completion` T-07 | 裁定⑦收尾：迁移 018 建 `app_users`/`audit_log`；用户档案与审计权威源切表（文件降为导入源/兜底）；导入脚本 dry-run/--apply 幂等；删掉 `users.json` 后真实 MySQL + hermes E2E 仍 **23/23** | 见「feat(v21-t07)」提交 | — |
| 2026-10-24 | `v21-completion` T-06 | a11y 五页 0 违规（自研轻量审计，抓出 2 处误报并校正审计器）· 多用户 bob 视角（列表不可见 + 详情 404）· 多副本租约 5 例（独占/续租/过期接管/释放/待命 tick）· 迁移纪律 6 例（expand-only，禁破坏性 SQL）；E2E 16→**23/23** | 见「test(v21-t06)」提交 | — |
| 2026-10-24 | `v21-completion` T-08 | 五条小项：域策略界面 · 可改面编辑/删除（PUT/DELETE，404 不再混 400）· 熔断 trip/reset 落审计（顺带统一审计落盘路径）· **squad 指派改为 leader 入队**（原先只写负责人字段=没人接）· 团队页 Tabs 方向键 | 见「feat(v21-t08)」提交 | — |
| 2026-10-24 | `v21-completion` T-05 | 前端三页补齐：自动化中心（新聚合口 `GET /api/automations` + 启停/删除）· 运行时（summary/stats/sessions + 重试）· 回放（任务运行时间线）；看板核实为已有（Tasks.tsx 四列）；E2E 13→**16/16** | 见「feat(v21-t05)」提交 | — |
| 2026-10-24 | `v21-completion` T-04 | 测试基建：本地 CI 四道门 + GH workflow + 前后端覆盖率 + E2E 入脚本（`npm run e2e`）；hermes 通道纳入 E2E（13/13）；修**写后读竞态**（缓存代际）、抽取器真实 CLI 形状容错、抽取 prompt 逃生口、seed 假阴性 | 见「test(v21-t04)」提交 | L-007 L-008 |
| 2026-10-24 | `v21-completion` T-03 | 基线红 29F/12E → **0 失败**（477 用例 OK）：旧身份/urllib mock/旧文案逐条对齐；修「埋点异常打挂聊天回复」；修 dependency_overrides 生命周期缺陷 | 见「fix(v21-t03)」提交 | — |
| 2026-10-24 | `v21-completion` T-02 | Agent 真实运行时执行通道（hermes/dsh/codex，默认关闭、fail-closed、不经 shell、不降级）；真 CLI 冒烟 hermes/dsh 均回 '1' | 见「feat(v21-t02)」提交 | — |
| 2026-10-24 | `v21-completion` T-01 | T-05 人设三件落库（迁移 017 · 创建/更新/读取 + chat 取值可测）；程序级收口范围与「不做清单」立项 | 见「feat(t05)」提交 | — |
| 2026-10-24 | `v20-e2e-mysql` | **MySQL 真实库 + 真实运行时（dsh CLI）界面 E2E**：16 迁移/50 表一次通过、二次幂等；13 条界面 E2E 全绿（含熔断期拒绝/复位、提案全链路、UI 内 judge=llm 真调 CLI）；修 `judge_kind` 归一为 llm_judge；E2E 脚本入仓 | 见「test(e2e-mysql)」提交 | — |
| 2026-10-24 | `v20-rsi-adapters`（本地 CLI 通道） | 新增 `cli` provider：直接用本地 **dsh headless / hermes -z** 当模型（免 key、不走 shell、超时/非零退出响亮失败）；dsh 试跑 L0 2 条 + judge 0.5、hermes 1 条 + 0.5 均 → awaiting_approval | 见「feat(cli-provider)」提交 | L-006 |
| 2026-10-24 | `v20-rsi-adapters`（本地试运行） | Ollama qwen2.5:3b 真实跑通 judge（1/0 → pass_rate 0.5 → awaiting_approval）与 L0 抽取（1 条 confounded 入库）；修 judge few-shot 与抽取器形状容错；ollama 免 key | 见「feat(rsi-adapters-local)」提交 | L-006 |
| 2026-10-24 | `v20-ui-polish` | 遗留小项：熔断手动 trip · Tabs 方向键+roving tabindex · 管理员新建可改面 · 小队 `created_by` 回填脚本（默认 dry-run） | 见「feat(ui-polish)」提交 | — |
| 2026-10-24 | `v20-residual` | 后端遗留三项：域级 accountable 策略（迁移 016，fail-closed）+ 影子重放 runner（exact_match 自证，沿用影子门）+ L0 抽取器（默认 dry_run） | 见「feat(residual)」提交 | — |
| 2026-10-24 | `v20-ui-rsi` | 记忆中心 + 提案抽屉（双 tab）：记忆四层列表/写入/晋升评审账/检疫/衰减 + 治理折叠（四开关/四熔断）+ 提案状态机/探针/影子/会签/人批发布；实现中修 surfaces 未拉取与写入结论被覆盖两个 bug | 见「feat(ui-rsi)」提交 | — |
| 2026-10-24 | `v20-squad-authz` | 小队写操作授权：creator 或平台管理员（4 个写端点接门 + 建队落 `created_by`）；修 `v20-ui-teams` 发现的权限缺口 | 见「fix(squad-authz)」提交 | — |
| 2026-10-24 | `v20-ui-teams` | 团队与小隊页（首个走完整 code-kit 链：0→1→2→2a→3→4→5→6，四道规划门 + G3/G4 留票）；修资产释放 kind 误用与小隊归档多余 body | 见「feat(ui-teams)」提交 | — |
| 2026-10-24 | `v20-ui-collab` | 任务看板 + 收件箱接入界面（波 3 的表第一次上界面）；顺带修 `requestDedup` 缓存键缺 method 的写静默失效（L-005） | 见「feat(ui-collab)」提交 | L-005 |
| 2026-10-24 | `v20-release` | **7-integration 收口**：S-align 首次对齐（`ALIGNMENT.md`）+ 8 份 SUMMARY + 程序级 UAT（8 条全绿）+ LESSONS L-001…L-004 + 本表；UAT 暴露并修掉 2 个已上线 bug（`/api/health` 500 · metrics_api 死代码）；README 端点/能力同步；P0-5 停止跟踪 node_modules/dist | 见「docs(closeout)」「chore(repo)」提交 | L-001…L-004 |

## 说明

- **`v20-wave0…7` 未归档**：按 S-align 裁决 V4 建议「保留原目录」（项目既有惯例：`identity-hardening`、`k8s-final` 等亦未归档）；如需归档，动作是移动到 `.specs/archive/2026-10-24-<change-id>/` 并在此表加备注。
- **轮次账本**与 CHANGELOG 分工：本表是 change 级交付索引；议题 / 裁定轮次见 `.specs/platform-evolution/ROADMAP.md` 与 `TOPICS.md`。
