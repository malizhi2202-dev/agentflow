# TASK · v26 笔账

> TaskCreate 工具在本会话不可用（报 No such tool available），按惯例改落本文件记账。

| 笔 | 内容 | 状态 | 入库 |
|---|---|---|---|
| 笔1 | `feat(v26-agent-detail)`：六栏壳 + panes.ts + useAgentDraft + 四 pane + AgentConfigEditor 改造 + 删侧栏项/独立页 + 五测试文件随行 | ✅ | 并入 `66aed2d5`（用户自提，消息「修改前端页面」） |
| 笔2 | `feat(v26-agent-create)`：TOP_TABS_CREATE + isNew 分支（探活/危险区不渲、默认栏含必填）| ✅ | **与笔1 同码同提交**（壳层交织，无法事后拆分；CFG-10 随行）——登记于此 |
| 笔3 | `test(v26)`：`agent-detail-tabs.test.tsx` AD-01~06 | ✅ | `68c54285` |
| 笔4 | `docs(v26-agent-ui)`：RULINGS §五点六（R26-1…4）· 主档 §5.4/§6.4〔v26 实现注〕· INDEX（谱系注 + §五 13 行 + 工件行）· STATE · 本目录 | ✅ | 本笔提交 |
| 部署实测 | systemctl 三件在位 + HTTP 探活 | ✅（点击走查 ❌ 留人工） | TEST.md |

## 后继批次（用户已裁 · 2026-10-26 同日，另立 `v27`）

1. **小队去重**：SquadsPage「指派任务」并入 Teams·squads tab，删侧栏「小队中心」项 + 页面文件。
2. **8 个不可达遗留视图全删**：home/detail/specs/runtime/workflow/roles/docs/templates——case + View 成员 + 仅它们引用的页面文件 + nav 回归锁；parity 涉及时按 agent-detail 先例走 declared_but_not_routed 保持 exit 0。
3. **平铺大页 tab 化（v26 同款骨架）**：Automations（1023 行）与 ProjectDetail（509 行）；MonitoringDashboard/KnowledgeBase 本批不动。
