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
| P2-1 | Agent 详情独立页（原型 6.4 四标签） | ✅ | `AgentDetailPage` + 列表/选中/返回用例；复用四标签详情本体 |
| P2-2 | 小队中心独立页（原型 6.29） | ✅ | 成员/加成员/指派任务真端点 + 时间线区块显式「未接入」；4 例 |
| P3-1 | 自动化中心 9 节 | ✅ | 迁移 020 四表 · 后端 26 例 · 前端 18 例 · E2E 入口（9 节可见 + 真落库）· `P3-automations.md` |
| P3-2 | Agent 详情 config 十六分区 + 锚点条 | ✅ | 组件拆 12 文件 · 9 例（16 标题/16 锚点/掩码/危险区二次确认/三键一次 PUT/400 透传/MCP fail-closed）· `P3-agent-config.md` |
| P3-3 | 看板 5 变体页（board__af-109/116/assign/mark-done/task-new） | ⬜ | 变体态用例 |
| P3-4 | 对话中心四路由 / 知识库两层 / 管控面 6 变体 | ⬜ | 用例 |
| P4-1 | 决策模型后端：迁移 019 `decision_models` + 登记/绑定/启停/重探 | ✅ | 6 例（默认未绑定+未探测、重名 400、绑定持久化、owner 隔离 404、重探 fail-closed） |
| P4-2 | 微调批次后端：`finetune_batches` + 三指标门禁（硬件→准确率→ECE） | ✅ | 5 例（ECE 超门禁 / 过门槛 / 硬件不过 / 缺指标 / 倒序+归属） |
| P4-3 | 环境参谋后端：只读画像 + 分层方案（零执行） | ✅ | 1 例（画像字段 + 方案含 why/steps） |
| P4-4 | 三页从「规划原型」切到真后端 | ✅ | 前端 14 例（未探测/绑定开关/门禁两态/画像） |
| P5-1 | `--strict` 接 CI（缺失/部分清零才算过） | ✅ | `scripts/ci.sh` + `.github/workflows/ci.yml` 已接 `proto_parity_check.py --strict` |
| P5-2 | E2E 可达（新 8 页进导航 + a11y） | ✅ | E2E **39/39**（含 8 页族可达与每页 a11y；壳层 crumb 改 h1 修掉「页面无标题」） |
