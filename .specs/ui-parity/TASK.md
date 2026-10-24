# TASK: ui-parity

## 台账（进度即事实）

| # | 项 | 状态 | verify |
|---|---|---|---|
| P0-1 | 127 页→35 族清单 + 差距矩阵 + 导航生成 | ✅ | `python3 scripts/proto_parity_check.py`；`.specs/ui-parity/{INVENTORY,GAP}.md` |
| P1-1 | 阶段模型配置页（真接口，PUT 带 If-Match） | ✅ | `vitest ui-parity-pages` 3 例；412 文案透传 |
| P1-2 | 执行隔离页（真契约 + 档位可用性 + 预检） | ✅ | 2 例（可用/未实现 + POST validate） |
| P1-3 | 对外集成页（六通道 + A2A 静态卡） | ✅ | 1 例（真 `GET /api/agents/{id}/channels` + `/api/a2a/.../card`） |
| P1-4 | 决策模型 / 微调工厂 / 环境参谋（规划原型页） | ✅ | 3 例（必须显示「后端未接入 + 示例数据」） |
| P1-5 | 导航/路由接线（+6 页） | ✅ | `tsc` 0；`proto_parity_check` 缺失族 0 |
| P2-1 | Agent 详情独立页（原型 6.4 四标签 + config 分区） | ⬜ | vitest + E2E |
| P2-2 | 小队中心独立页（原型 6.29 + 12 节点时间线） | ⬜ | vitest + E2E |
| P3-* | 逐族深度（自动化 9 节、看板 5 变体页…） | ⬜ | 每族用例 + 截图 |
| P4-* | 决策模型/微调/环境参谋后端端点（先契约后实现） | ⬜ | 契约测试 |
| P5-1 | `--strict` 接 CI（缺失/部分清零才算过） | ⬜ | `.github/workflows/ci.yml` |
