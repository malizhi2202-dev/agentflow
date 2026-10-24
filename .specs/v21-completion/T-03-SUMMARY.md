# T-03 · 修基线红至全绿（完成）

- **Change**: v21-completion · 2026-10-24
- **结果**：基线 **29F / 12E** → **0 失败**（`Ran 477 tests — OK (skipped=6)`）

## 根因与处置（不是放宽断言，而是对齐现行契约 + 修 1 个产品脆弱点）

| 类别 | 数量 | 根因 | 处置 |
|---|---|---|---|
| chat/channel API 集成 | 26 | 用 `X-User-Id` 裸传身份；波 1 后 debug 通道需三重 opt-in → 403 | chat 类：模块生命周期内开启 debug 三重 opt-in + 固定身份；channel 类：**改用真实内存库 + 真实登录**（`AuthHarness`），更接近真实链路 |
| 旧 urllib mock | 15 | 直接 patch `chat_service.urllib.request.urlopen`；代码早已改为 provider 抽象 | 全部改为 `patch("services.chat_service.get_provider")` 假 provider（成功/抛错两态） |
| 旧文案断言 | 1 | 期望「暂不支持」 | 改为现行「不支持的模型提供者…支持: …」 |
| 期望口径 | 4 | 解析类错误（`ValueError`）实际是**友好回退**（done+原因），传输层才是 error | 按现行双路径分别断言：解析错→done+原因；`RuntimeError/HTTP500`→error+可重试文案 |

## 顺带修掉的产品脆弱点（真实 bug）

`chat_service` 里 **埋点异常会把整条回复打成 error**：单元测试环境没有 `metrics_raw` 表时，
`tracer.trace_model_call` 抛 `OperationalError` → 用户看到"Agent 暂时无法回复"。
修法：埋点包进自己的 try/except（**可观测性不参与业务成败**），失败只打印警告。

## 测试工程化修正

`test_api_integration` 原来在**模块导入期**设置 `app.dependency_overrides[get_db]`——会被其它模块
`tearDown` 的 `pop` 清掉，导致"单跑绿、全量红"。改为 `setUpModule/tearDownModule` 生命周期内设置与清理；
debug 身份 patch 同样成对开关（否则会泄漏给后续模块，实测曾让 40+ 条无关用例变红）。

## verify（真实输出）

```text
$ cd backend && ENCRYPTION_KEY=... /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 477 tests in 89.237s
OK (skipped=6)
```

（基线对照：`Ran 477 · FAILED (failures=29, errors=12, skipped=6)`）
