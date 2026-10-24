# REVIEW: 团队与小队页

- **Change ID**: v20-ui-teams
- **阶段**: 6-review（2026-10-24）
- **diff 范围**：`frontend/src/{App.tsx, stores/teams.ts, pages/Teams.tsx, __tests__/teams-page.test.tsx}` + `.specs/v20-ui-teams/*`

## 第 1 轮 · spec 合规（对 AC / DESIGN / UI-DESIGN）

| AC | 结论 | 证据 |
|---|---|---|
| AC-1 入口与形态 | ✅ | NAV/View/分支/初始路径 4 处；`role="tablist"` |
| AC-2 列表 + 我的角色 | ✅（口径已改） | 后端 `_team_dict` 不返回角色 → 角色落在抽屉摘要；REQUIREMENT 已同步，不是"忘了做" |
| AC-3 建团 | ✅ | 前端同正则先拦（不发请求）+ 409 透传 + 成功后刷新 |
| AC-4 状态 | ✅ | 归档二次点击 + archived 禁用 + `title` 原因 |
| AC-5 成员 | ✅ | 四档角色下拉（排除 owner）；owner 行移除禁用并给原因 |
| AC-6 转让 | ✅ | 必须勾选 confirm；请求体 `{new_owner, confirm:true}` |
| AC-7 资产配额 | ✅（含修复） | 挂载/释放请求体正确；**释放 kind bug 已修**（见「发现的问题」#1） |
| AC-8 小队 | ✅ | 建队/入池/移出/归档；`leader_bound` 透传；无"取消在跑运行"字样 |
| AC-9 可见性 | ✅ | 前端零授权判断，列表只用后端结果 |
| AC-10 错误/空态 | ✅ | 读失败横幅 / 写失败就地 / 四类空态 |
| AC-11 质量门 | ✅ | tsc 0 · vitest 74 · build 18.30s |

**DESIGN 偏离**：D2（详情按需）✅ 落实；D3（写请求读 detail）✅；D4（资产手填 id）✅ 且写 `shortcut` 注释；D5（零授权判断）✅；D6（不改后端权限）✅ 如实留档；D7（二次确认）✅。

**UI-DESIGN 偏离**：§6.6「Tabs 方向键切换」**未实现**（见遗留 #3）；其余色板/间距/组件/文案/无障碍项落实。

## 第 2 轮 · 工程质量

| 维度 | 结论 | 说明 |
|---|---|---|
| 类型 | ✅ `tsc --noEmit` 0 错 | 类型按后端返回形状定义 |
| 错误处理 | ✅ 不吞 4xx（读横幅 / 写就地，保留 `detail`） | 与 L-005 同族的写读分工 |
| 缓存一致性 | ✅ 写后 `invalidateCache()` + 重拉 | `teams` 列表与 `detail` 同时刷新 |
| 越界 | ✅ 无后端改动、无新依赖、未动公共工具签名 | `git diff --name-only` |
| 可读性 | ✅ 与 `Tasks.tsx`/`collab.ts` 同构；分区注释 | — |
| 测试质量 | ✅ 断言行为（请求体/URL/禁用态/文案），不断言内部调用 | 11 条 |

## 第 3 轮 · UI / 无障碍

| 检查 | 结论 |
|---|---|
| 只用既有 token、单强调色 | ✅ |
| 无卡片套卡片 / 彩色侧条 / 渐变 | ✅ |
| label 不与 placeholder 混用 | ✅ 所有输入都有 `<label htmlFor>` + `aria-label` |
| 不可逆动作确认 | ✅ 归档团队/小队、转让 owner 三处 |
| 状态不只靠颜色 | ✅ chip 有文字、配额有数字 |
| `role=alert/status` | ✅ 错误用 alert |
| Esc 关闭抽屉 | ✅ `keydown` 监听 + 清理 |
| 方向键切 tab | ❌ **未实现**（遗留 #3） |
| 焦点可见 | ✅ 沿用全局 `:focus-visible`（未自定义覆盖） |

## 发现的问题（本 change 内处理）

| # | 问题 | 处理 |
|---|---|---|
| 1 | **释放资产时统一传 `kind='agents'`**：agents/workflows 混排时，工作流会被按 Agent 释放（后端按 kind 查模型 → 会释放错对象或报"资产不存在"） | **已修**：五类平铺、各自带 `kind`；补「释放资产用各自 kind」回归用例 |
| 2 | `archive_squad` 后端不收 `reason`，store 初版多传 body | **已修**：store 改为无 body，参数标 `_reason` |
| 3 | Tabs 方向键切换未实现 | 记为遗留（本波 Tab 键可达，不阻塞） |
| 4 | Tabs 未做 `role="tab"` 的 `tabIndex` 管理（全部可 Tab 聚焦而非 roving tabindex） | 记为遗留（与全站其他 tab 一致，属全局模式问题） |

## 遗留（如实记账，不假装完成）

1. **真实后端联调未做**（mock 契约）。
2. **浏览器视觉/响应式未实测**（≤900px 堆叠只到代码层）。
3. Tabs 键盘模式（方向键 + roving tabindex）未做。
4. ~~**squads 路由无权限校验**（后端现状）~~ → **已在 `v20-squad-authz` 修复**（`f55e53c7`）：写操作限 creator 或平台管理员（403），建队落 `created_by`。原文保留作历史。
5. 资产候选选择器（需后端 unclaimed 列表）。

## 🛡️ G4 审查门（自评轮）

```
🗳️ G4 审查门: REVIEW.md 是否通过？

   🧪 资深测试工程师(M): ✅ AC 全绿且每轮都有证据；发现的 2 个 bug 已修并有回归用例；遗留 5 条写明不阻塞理由。
   🟩 架构师: ✅ 无越界、无新模式、无依赖变化；写读分工与上一 change 的教训一致。
   🟪 领域专家: ✅ 领域语义正确（Team 不可指派 / Squad 不拥有资产 / 归档只停未来指派 / 入池不授权）。
   🔴 安全审计师: ✅ 前端零授权判断；遗留 #4（squads 无权限）已明确记录并建议另立 change，不在本 change 擅改。

   结果: 4/4 → 全票通过 ✅ 进入 7-integration
```
