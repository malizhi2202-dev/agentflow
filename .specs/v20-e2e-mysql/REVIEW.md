# REVIEW: MySQL + 真实运行时 E2E（压缩路径 · 功能轮 + 回归登记）

| 维度 | 结论 |
|---|---|
| AC 覆盖 | ✅ AC-1…AC-7 全有实测输出（见 TEST） |
| 真实库 | ✅ 私有 MySQL 8 实例；16 迁移一次通过，**没有出现 SQLite-only 假设**（dirty 的 `_pk_clause` / 复合索引 / UNIQUE 均正常） |
| 真实运行时 | ✅ UI 会话内 `judge=llm` 经 dsh CLI 真调，`pass_rate=0.5 / judge_kind=llm_judge`；L0 抽取经 CLI 落 2 条 |
| 治理语义 | ✅ 熔断期建房被 409 拦 + 复位后可建，证明「四熔断在状态转换层」不是文案 |
| 产品修正 | ✅ `judge_kind` 归一（原返回内部简称），补用例（patch 替身，不触外网） |
| 测试卫生 | ✅ E2E 脚本入仓并 env 参数化；临时 MySQL 在 /tmp，不碰系统实例 |
| 越界 | 仅 `routes/rsi_api.py` 一行语义修正 + 测试/脚本；无 schema、无迁移变更 |

## E2E 自身踩的坑（已修，记录防复发）
1. 卡片定位不能用根 `div` 过滤（会命中整页祖先）→ 用「标题 span 的 ancestor::div[2]」。
2. 同一 `role=alert` 出现两处（可改面表单与提案表单共享错误）→ 用 `.last()`。
3. 治理区在**记忆 tab** 内（切 tab 会卸载）→ 复位前先切回记忆 tab。
4. 已发布提案不能走影子门 → 运行时用例先新建 generated 提案再跑。

## 遗留
- 多用户/多副本、移动端、像素级视觉未覆盖（截图待人工看）。
- `change_log` 本轮为空（未走 workflow PUT），不是缺陷。

G3/G4（自评）：研发 ✅ 架构 ✅ 测试 ✅ 安全 ✅ → 各 4/4
