# 差距矩阵（原型 35 页族 ⟂ 现有前端）

> 机器生成：`python3 scripts/proto_parity_check.py --md > .specs/ui-parity/GAP.md`。
> 口径：**页面** = 独立页面且已接路由；**部分** = 只以抽屉/子 tab 形态存在；**元页** = 壳/登录流程/文档页（不计缺失）；**缺失** = 无对应实现。

- 原型 127 页 / 35 页族（导航 34 项）
- 已实现独立页 22 族 · 部分 2 族 · 缺失 7 族 · 元页 4 族

| 页族 | 原型页 | 现有视图 | 形态 | 路由 | 导航 |
|---|---|---|---|---|---|
| `agent-detail` | 6 | agents | 部分 | ✓ | ✓ |
| `agents` | 2 | agents | 页面 | ✓ | ✓ |
| `alerts` | 5 | alerts | 页面 | ✓ | ✓ |
| `approvals` | 1 | approvals | 页面 | ✓ | ✓ |
| `audit` | 7 | audit | 页面 | ✓ | ✓ |
| `automations` | 1 | automations | 页面 | ✓ | ✓ |
| `board` | 5 | tasks | 页面 | ✓ | ✓ |
| `canvas` | 6 | orchestration | 页面 | ✓ | ✓ |
| `chat` | 1 | chat | 页面 | ✓ | ✓ |
| `control-plane` | 6 | control-plane | 页面 | ✓ | ✓ |
| `decision-models` | 4 | — | 缺失 | · | · |
| `discipline` | 1 | discipline | 元页 | · | · |
| `env-advisor` | 5 | — | 缺失 | · | · |
| `finetune` | 3 | — | 缺失 | · | · |
| `inbox` | 2 | inbox | 页面 | ✓ | ✓ |
| `index` | 1 | shell | 元页 | · | · |
| `integration` | 5 | — | 缺失 | · | · |
| `isolation` | 6 | — | 缺失 | · | · |
| `knowledge` | 2 | knowledge | 页面 | ✓ | ✓ |
| `login` | 2 | login | 元页 | · | · |
| `memory` | 1 | memory | 页面 | ✓ | ✓ |
| `metrics` | 1 | monitor | 页面 | ✓ | ✓ |
| `projects` | 4 | projects | 页面 | ✓ | ✓ |
| `relations` | 1 | relations | 元页 | · | · |
| `replay` | 3 | replay | 页面 | ✓ | ✓ |
| `roles` | 5 | roles-page | 页面 | ✓ | ✓ |
| `runtime` | 5 | runtime | 页面 | ✓ | · |
| `runtimes` | 1 | runtimes | 页面 | ✓ | ✓ |
| `squads` | 1 | teams | 部分 | ✓ | ✓ |
| `stage-model` | 8 | — | 缺失 | · | · |
| `teams` | 2 | teams | 页面 | ✓ | ✓ |
| `tools` | 7 | tools | 页面 | ✓ | ✓ |
| `users` | 7 | users | 页面 | ✓ | ✓ |
| `workbench` | 7 | — | 缺失 | · | · |
| `workflows` | 3 | workflows | 页面 | ✓ | ✓ |

## 缺失页族（要先做）

- `decision-models`
- `env-advisor`
- `finetune`
- `integration`
- `isolation`
- `stage-model`
- `workbench`
