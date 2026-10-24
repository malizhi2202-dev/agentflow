# REVIEW: RSI 适配器
| 轮 | 结论 |
|---|---|
| spec | AC-1…AC-6 全绿；D1–D5 落实（显式配置/预算帽/可替换打分器/循环默认关闭/错误 400） |
| 工程 | 复用既有门禁（`record_shadow`）；未改前端；新增 5 个配置项集中在 config.py；`_map` 三类错不再 500 |
| 安全 | 未配置 fail-closed；预算帽硬停；无隐式调用；provider 可注入（测试不碰外网） |
| 遗留 | 真实厂商/预算未定 → 保持未配置；judge 缓存与 L0 prompt 调优属 v2；前端暂无 judge 模式开关 |

发现的问题：`JudgeError/RunnerError/ExtractorError` 原本会被冒泡成 500 → 已在 `_map` 统一 400（测试锁死）。
G3/G4（自评）：研发 ✅ 架构 ✅ 测试 ✅ 安全 ✅ → 各 4/4
