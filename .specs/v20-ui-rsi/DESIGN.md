# DESIGN: 记忆中心与提案抽屉

- **Change ID**: v20-ui-rsi · 上游 `REQUIREMENT.md`（需求门 4/4）
- **阶段**: 2-design（2026-10-24）

## 0. 技术栈

不重选栈（React 18 + TS + Vite + Zustand + 内联样式/tokens）。零新增依赖。

## 0.5 既有架构对齐

### 0.5.1 触碰模块

| 模块 | 路径 | 方式 |
|---|---|---|
| 状态层 | `frontend/src/stores/rsi.ts` | 新增（与 `collab.ts`/`teams.ts` 同构） |
| 页面 | `frontend/src/pages/Memory.tsx` | 新增（双 tab） |
| 应用壳 | `frontend/src/App.tsx` | NAV + View + 分支 + 路径 |
| 测试 | `frontend/src/__tests__/memory-page.test.tsx` | 新增 |
| 后端 | `routes/rsi_api.py` | 只读契约，不改 |

### 0.5.2 沿用抽象

| 需要什么 | 既有 | 做法 |
|---|---|---|
| 服务端状态 | zustand store（`teams.ts`） | 同构；读写分工一致（GET `safeFetch` / 写 `dedupedFetch` + `detail`） |
| 双 tab 骨架 | `Teams.tsx`（role=tablist） | 复用同一 DOM 结构与交互 |
| 折叠区 | `DetailDrawer` 的 Section 思路 | `aria-expanded` + 计数 |
| 错误呈现 | 页面横幅（读）+ 就地（写） | 同 `collab.ts` |

### 0.5.3 沿用 vs 新模式

沿用全部既有模式；**新增模式：无**。唯一新组件是"按状态裁剪的动作组"（纯条件渲染）。

## 1. 决策清单

| ID | 决策 | 备选 | 理由 |
|---|---|---|---|
| D1 | **双 tab（记忆/提案）+ 治理折叠区**放在记忆 tab 顶部 | 三 tab | 用户已选双 tab；治理是低频动作，折叠不占主视觉 |
| D2 | 提案动作**按 status 裁剪**（只渲染下一步合法动作） | 全按钮 + 后端拦 | 减少误操作；后端仍是权威（不可绕） |
| D3 | 发布：**非管理员置灰 + title 原因 + 二次确认** | 只靠后端 403 | AC-11 明确要求；与「前端零授权判断」的例外写在此处 |
| D4 | 其余写动作（开关/熔断/检疫）不置灰，403 文案透传 | 全部置灰 | 与 D5 全局约定一致；只有发布被产品明确要求置灰 |
| D5 | evidence 用**文本域按行解析**成 `[{ref}]` | 动态行编辑器 | 省一个复杂组件；`shortcut` 注释写明上限 |
| D6 | 评审账**按需**拉（点记忆行） | 列表带评审 | 避免 N+1 |
| D7 | 不提供 surface 新建 | 加管理员表单 | 本波范围排除；提案创建只从既有 surface 选 |
| D8 | 探针/影子表单字段按后端最小契约 | 全字段 | 只收后端读的字段，避免造无用输入 |

## 2. 数据流

```
Memory.tsx
 ├─ useRsi()
 │   ├─ memories / reviews(memory_id) / switches / breakers / noiseFloor / surfaces / proposals
 │   └─ 动作 → writeJson() → 成功即重拉对应集合
 └─ requestDedup（GET 缓存 / 写不缓存）
```

## 3. 状态机（后端为准，界面只裁剪）

```
提案：generated ──probe──▶ probed ──shadow(过噪声地板)──▶ awaiting_approval ──人批──▶ published
                                   └─shadow(低于地板)──▶ collapsed（终态，界面说明）
              探针超预算 ─▶ blocked（终态，界面说明）
记忆：三字段缺一 → no_entry；拿不准/命中污染 → confounded；否则 promoted；检疫 → quarantined
```

## 4. ADR

不新增项目级 ADR。

## 5. 风险

| # | 风险 | 缓解 |
|---|---|---|
| R1 | 提案动作多导致误操作 | D2 裁剪 + 发布二次确认 |
| R2 | evidence 解析不健壮 | 空行忽略；解析失败给行内错误，不发请求 |
| R3 | 治理区藏在折叠里被忽略 | 折叠标题显示开关状态计数（如「1 个已暂停」） |
| R4 | 非管理员点开关被 403 | 文案透传（符合 D4） |

## 6. 不在范围

同 CHANGE 范围排除 1–4。

## 9. 架构沉淀建议

- 9.1 `writeJson` 已在 `collab.ts`/`teams.ts`/`rsi.ts` 出现三次 → 建议下一轮抽 `utils/writeJson.ts`（本 change 不抽，避免动已发页面）。
- 9.2–9.5 无。

## 🛡️ G2 方案门（自评轮）

```
🟩 架构师(M) ✅（D1/D2 有清晰边界，动作裁剪在后端状态机之上）| 🟫 研发负责人 ✅（1 store + 1 page + 挂载）|
🟪 领域专家 ✅（记忆四层/提案三权分离语义正确，未越权自动发布）| 🔴 安全审计师 ✅（发布二次确认 + 管理员门，例外有理由）
结果: 4/4 → 进入 2a-ui-design
```
