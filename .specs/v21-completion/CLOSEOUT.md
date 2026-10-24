# v21-completion · 收口报告（8 项任务全部完成）

- **Change**: `v21-completion` · 2026-10-24
- **范围**：`.specs/v21-completion/CHANGE.md` 的 T-01…T-08（「明确不做」清单内的废弃/冻结项未复活）
- **最终门禁**：`bash scripts/ci.sh --with-coverage` → **CI ✅ 全绿**

## 一、任务台账（逐项证据文件）

| # | 任务 | 结果 | 证据 |
|---|---|---|---|
| T-01 | 人设三件落库（system_prompt/role_def/sop） | ✅ | 迁移 017 · chat 取值 · `test_agent_prompt_persist` |
| T-02 | Agent 真实运行时执行（hermes/dsh/codex，默认关闭、fail-closed） | ✅ | `test_runtime_exec` / `test_chat_runtime` · 真 CLI 冒烟 |
| T-03 | 修基线 29F/12E → 0 | ✅ | `T-03-SUMMARY.md` |
| T-04 | 测试基建（CI/覆盖率/E2E 入脚本/hermes/L0 循环） | ✅ | `T-04-SUMMARY.md` |
| T-05 | 前端三页（自动化/运行时/回放）+ 看板核实已有 | ✅ | `T-05-SUMMARY.md` |
| T-06 | a11y / 多用户 / 多副本租约 / 迁移纪律 | ✅ | `T-06-SUMMARY.md` |
| T-07 | `users.json` / `audit.jsonl` 表化（裁定⑦收尾） | ✅ | `T-07-SUMMARY.md` |
| T-08 | 五条小项（其中 3 条为行为修正） | ✅ | `T-08-SUMMARY.md` |

## 二、最终实测（本轮真实输出）

```text
$ bash scripts/ci.sh --with-coverage
后端 pyflakes（undefined name）= 0
Ran 523 tests in 121.782s
OK (skipped=6)
后端 coverage（services/routes）：TOTAL 7572 语句 / 未覆盖 3781 → 50%
前端 tsc --noEmit → 0 错误
前端 vitest → Test Files 12 passed · Tests 109 passed
前端 coverage → Statements 18.22% · Branches 67.74% · Functions 47.07%
前端 npm run build → ✓ built in 16.95s
CI ✅ 全绿
```

```text
$ E2E_CLI=hermes bash scripts/e2e/run_e2e.sh        # 真实 MySQL + 真实 CLI + 真实浏览器
SUMMARY 23/23 passed
  · 23 条含：登录 / 任务建单推进 / 收件箱 / 团队建团加成员暂停 / 自动化新建落库 / 运行时可达 /
    回放时间线 / a11y 五页 0 违规 / 多用户 bob 视角 2 条 / 记忆 L0+写入+评审 /
    治理开关+熔断+熔断期拒绝+复位 / 提案探针→影子→人批发布 / judge=llm 真调 CLI
```

E2E 规模演进：13 条（T-04）→ 16 条（T-05）→ **23 条**（T-06 a11y + 多用户）。
用户在 E2E 中的真实要求（**MySQL 而非 SQLite、真实运行时**）在每一轮都成立。

## 三、本轮修掉的真实缺陷（不是补测试凑绿）

1. **写后读竞态**（`requestDedup`）：缓存失效不能作废在途请求 → 创建后列表 5s 看不到新对象。修：缓存代际 + 4 例回归（L-007）。
2. **squad 指派语义错**：`assignee_kind=squad` 只写负责人字段，不建 leader 任务 → 任务落到小队没人接。修：走 `assign_task_to_squad`（去重/归档 400/404）。
3. **熔断无审计** + **两处各算一遍审计落盘路径**：有后果的动作 0 留痕。修：单一写入器 + 单一路径。
4. **抽取器对真实 CLI 输出太窄**（容器键/字段别名/单串 evidence）→ 候选被静默丢光；prompt 的「抽不出就 []」是逃生口，hermes 稳定回 0 条。修：`parse_reply` 容错 + prompt 正面界定（0 → 1 条）。
5. **E2E 假阴性**：seed 用 `run_once` 取「最近会话」，多轮后抽的不是自建会话，0 候选也算绿。修：直连自建会话 + 抽不到即失败（L-008）。
6. **迁移/审计/用户三处文件态权威**与裁定⑦不符 → 表化（T-07），删掉 `users.json` 后 E2E 仍全绿。

## 四、诚实边界（不要按需求清单之外的想象读这份报告）

- **a11y 不是 axe**：离线环境不引依赖，用自研轻量审计（按钮可达名/控件标签/img alt/标题层级/正 tabindex/tab aria）。覆盖面弱于 axe，已在 T-06 写明。
- **没有 down 迁移**：本仓是 expand-only + fix-forward（P0-8 设计），T-06 守的是「禁止破坏性 SQL + 逐条幂等 + 失败不入账」，不是「能 undo」。
- **dsh CLI 本轮外部不可用**（`NO_ADAPTER: no adapter registered for provider "local-anthropic"`），最终 E2E 用 hermes 通道；dsh 通道此前各轮均有绿的证据。
- **门禁是自评轮**：本轮 8 道门与 G1–G4 均为单 agent 自评（无独立审核 agent），与历史 change 的「自评轮」标注一致。
- 历史 9 个 change 缺 REQUIREMENT/DESIGN 的流程债仍记在 `.specs/ALIGNMENT.md`，本轮未伪造补齐。

## 五、下一步建议

1. 用真实用户跑一轮 UAT（T-05 三页与 T-07 表化后的用户管理路径最值得手点）。
2. 联网环境可把 a11y 换成 axe 并锁定版本（同时避免 T-04 那种 peer 依赖漂移）。
3. 若要多副本上线：先按 `T-06` 的租约用例在真实 MySQL 上复跑双实例（当前是文件型 SQLite 双会话）。
