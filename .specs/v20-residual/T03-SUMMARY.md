# SUMMARY: T03 — L0 抽取器

- **Change ID**: v20-residual · T03 · 2026-10-24

## 做了什么

`services/l0_extractor.py`：读会话最近 N 条消息 → 可注入 extractor；**默认 dry_run 不写库**。
注入且三字段齐 → 走 `rsi_service.propose_memory`（`source_ref=conversation:<id>`、机器抽取默认 `confounded`）；
缺字段 → `no_entry` 留档；抽取器异常 → 响亮失败。端点 `POST /api/rsi/l0/extract` 永远 dry_run，
真实抽取需服务层注入适配器（避免未配置就花钱/写脏数据）。

## verify

```text
$ unittest tests.test_l0_extractor
Ran 8 tests — OK   # 服务 4 + 路由 4
```
