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
| 2026-10-24 | `v20-ui-teams` | 团队与小隊页（首个走完整 code-kit 链：0→1→2→2a→3→4→5→6，四道规划门 + G3/G4 留票）；修资产释放 kind 误用与小隊归档多余 body | 见「feat(ui-teams)」提交 | — |
| 2026-10-24 | `v20-ui-collab` | 任务看板 + 收件箱接入界面（波 3 的表第一次上界面）；顺带修 `requestDedup` 缓存键缺 method 的写静默失效（L-005） | 见「feat(ui-collab)」提交 | L-005 |
| 2026-10-24 | `v20-release` | **7-integration 收口**：S-align 首次对齐（`ALIGNMENT.md`）+ 8 份 SUMMARY + 程序级 UAT（8 条全绿）+ LESSONS L-001…L-004 + 本表；UAT 暴露并修掉 2 个已上线 bug（`/api/health` 500 · metrics_api 死代码）；README 端点/能力同步；P0-5 停止跟踪 node_modules/dist | 见「docs(closeout)」「chore(repo)」提交 | L-001…L-004 |

## 说明

- **`v20-wave0…7` 未归档**：按 S-align 裁决 V4 建议「保留原目录」（项目既有惯例：`identity-hardening`、`k8s-final` 等亦未归档）；如需归档，动作是移动到 `.specs/archive/2026-10-24-<change-id>/` 并在此表加备注。
- **轮次账本**与 CHANGELOG 分工：本表是 change 级交付索引；议题 / 裁定轮次见 `.specs/platform-evolution/ROADMAP.md` 与 `TOPICS.md`。
