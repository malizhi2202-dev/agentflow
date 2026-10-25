# TEST · v26 门禁与部署实测记录

## 一 · 门禁时间线（均跑在 `66aed2d5` 已提交的树上）

| 门 | 结果 | 时点（本地） |
|---|---|---|
| `npx tsc --noEmit` | **exit 0** | 10-26 02:2x（笔1 期）与 02:3x（AD 后）各跑一次，均 0 |
| `npx vitest run` | **Test Files 26 passed · Tests 265 passed**（基线 259 + AD 6） | AD 落地后全量 |
| 定向（CFG/AS/AG/nav/parity-pages2 五文件） | 48/48 | 改造期先行 |
| `npm run build` | **✓ built in 32.37s**（chunk>500kB 告警为既有非门禁项） | 02:33 |
| `python3 scripts/proto_parity_check.py --strict` | **exit 0**；`agent-detail` 落「映射存在但未接路由（1）」提示位——与预判一致（删 case 不触红，missing 只看 FAMILY_VIEW 表成员） | 02:33 |
| 原型与脚本 0 diff | `git status --short .specs/product-design/prototype/ scripts/` 为空 | 02:33 |
| GAP.md | 本批**不再生成**（口径改动未同步原型，登记待 ui-parity 下轮统一再生） | — |

## 二 · 部署实测（用户点名的纪律）

```
systemctl --user is-active agentflow-frontend agentflow-backend agentflow-mysql
→ active / active / active
curl http://127.0.0.1:5173/            → 200
curl http://127.0.0.1:8000/api/health  → 200
```

前端 = vite dev :5173（`VITE_WATCH_POLLING=1` 轮询热更）——`66aed2d5` 的代码已被 dev server 现取现编译；后端本批零改动，无需 restart。

## 三 · 浏览器点击走查 —— **未做，留人工**

本会话无浏览器操作工具，以下六项需人工在 5173 走查后回销：

1. 侧栏「构建」组内**无**「Agent 详情」项；
2. Agent 列表点卡片 → 落**概览**：会话表/breakdown 为真数据、代替口径注可见、「未接入」处显式标；
3. 能力 5 子栏（指令/技能/MCP/集成/知识源与编排）与设置 7 子栏（通用/Access/环境/CLI 参数/闸门/探活/危险区）逐一点通；
4. 改「环境」一行 → 切任意栏 → **sticky 保存条常驻**、Network 面板恰 1 个 PUT；
5. 项目详情「查看详情」进入的也是新壳（覆盖态同一实例）；
6. 新建入口：仅填 名称 + 运行时/模型档位 即可创建（创建态只有 能力/设置 两栏）。

> 如实口径：单测/构建/parity/服务在位均为真；**交互式走查没有做，不报「部署验证完成」**。
