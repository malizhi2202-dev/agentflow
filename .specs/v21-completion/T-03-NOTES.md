# T-03 修基线红 · 诊断与进度（进行中）

基线（HEAD 前）：**29F / 12E / 6S**，集中在 4 个模块。根因已定位（非产品回归，是测试跟着旧契约写死）：

| 模块 | 数量 | 根因 | 处理 |
|---|---|---|---|
| `test_api_integration` | 26 | 用 `X-User-Id` 直传身份；波 1 后 debug 通道需**三重 opt-in**（localhost + 开关 + admit 名单），默认关闭 → 全部 403 | 待改：模块改用**真实登录 + 内存库**（与 `_auth_harness` 同构），不再用 MagicMock DB |
| `test_agent_channel_supplement` | 4 | 直接 patch `services.chat_service.urllib.request.urlopen`；chat_service 早已改为 provider 抽象 | ✅ 已改为 patch `get_provider(...).chat` |
| `test_edge_cases` | 5 | 同上 urllib + 旧文案「暂不支持」 | 4 处已改 provider；文案断言已改「不支持的模型提供者」；emoji 1 处仍在 |
| `test_round6_api_edges` | 5 | 同上 urllib | 3 处已改；2 处期望值需对齐（provider 抛错后 status/error 字段） |

## 已有进展（本轮）
- 已将 **7 处** `urllib` patch 改为 `get_provider` 假 provider（supplement 4 + edge 3 + round6 3，实际 10 处替换，其中部分未命中）。
- 文案断言从「暂不支持」→「不支持的模型提供者…支持」。

## 剩余（下轮继续）
1. `test_api_integration` 26 条：改用真实登录夹具（`_auth_harness` 模式）+ 真实内存库；顺带修它**模块级 `app.dependency_overrides[get_db]` 污染全局**的问题。
2. 3 个模块里剩 6 条：对齐「provider 抛错 → status=error / error 字段」的期望（不要放宽成 always-true）。
3. 全量目标：`unittest discover` → **0 失败**（不只 0 新增红）。
