# ui-parity · 只读盘点与复核（不属于并行会话的实现范围）

- **状态**：**实现中**（P1 完成；P2+ 进行）
- **实现归属**：本 change 接管；前置设计/壳层由并行会话 `v22-ui-align`（W1/W2 已交付）+ `v22-nav-groups` / `v22-runtime-discovery` / `v22-agent-runtime-model` 落地
- **并行会话已收工**：用户确认后由本 change 接管；L-001 教训仍生效——同仓多会话写同一批文件会互相吞掉，接管前已确认对方工作已落树。

## 当前基线（`scripts/proto_parity_check.py` 实测）

```text
$ python3 scripts/proto_parity_check.py
原型：127 页 / 35 页族；导航 34 项
实现：独立页面页族 31；部分实现 0；App.tsx 导航项 41
缺失页族（0）：无
部分实现（2）：agent-detail（现为列表抽屉）/ squads（现为团队页 tab）
元页面（不计缺失，4）：discipline / index / login / relations
```

## 工具

| 文件 | 作用 |
|---|---|
| `scripts/proto_parity_check.py` | 原型 index 导航 + 页族 ⟂ `App.tsx` 的 case/导航 id，输出人与机器两种格式；`--md` 重写本目录 `GAP.md`，`--strict` 在有缺失族时退出 1（可接 CI） |
| `scripts/gen_proto_nav.py` | 从原型 `index.html` 生成导航清单（顺序/编号以原型为准，避免手抄漂移） |
| `INVENTORY.md` / `inventory.json` | 127 页 → 35 页族的机器清单（含每族变体页） |
| `GAP.md` | 机器生成的差距矩阵（`--md` 输出） |

## 口径（避免自欺）

- **页面** = App.tsx 有独立 case 且进导航；**部分** = 只有抽屉/子 tab；
  **元页** = 壳、登录流程、文档型页（不算业务缺失）；**缺失** = 无对应实现。
- 本工具只判「有没有对应实现形态」，**不冒充**页面深度验收；每页族的深度验收（节/交互/E2E）由 v22 会话的用例负责。

## 复核建议（给 v22 会话/验收用）

```bash
python3 scripts/proto_parity_check.py          # 看差距
python3 scripts/proto_parity_check.py --md     # 刷新 GAP.md（随实现推进同步）
python3 scripts/proto_parity_check.py --strict # 后续接 CI：缺失族未清零即失败
```
