# TEST: 后端遗留三项收口

## 1. 功能轮（AC → 用例）

| AC | 覆盖 |
|---|---|
| AC-1/2/3 域策略 | `test_domain_policy` 11 条（无策略=现状 / member / team_owner / 个人域 fail-closed / 非法 kind fail-closed / set_policy 校验 / resolve_attribution 走策略 / 路由 GET·PUT·400·404） |
| AC-4/5/6 runner | `test_shadow_runner` 10 条（打分/空/缺字段/达标→awaiting/低于地板→collapsed+熔断/缺金标 409/缺异厂 409/judge 必填/路由 exact_match 自证/路由 409） |
| AC-7/8/9 L0 | `test_l0_extractor` 8 条（默认 dry_run 不写 / 注入落库带 source_ref / 缺字段 no_entry / 抽取器异常响亮 / owner 200 / 非 owner 404 / 管理员可跨所有者 / 缺 id 400） |
| AC-10 迁移+回归 | 见 §2 |

## 2. 全量回归

```text
$ cd backend && ENCRYPTION_KEY=... /tmp/afvenv2/bin/python -m unittest discover -s tests
Ran 434 tests in 77.960s
FAILED (failures=29, errors=12, skipped=6)
$ diff 基线失败清单 本次失败清单 → 无差异（0 新增红）
```

## 3. 安全轮

- 域策略 PUT：管理员或域 owner；越权与不存在统一 404。
- L0：非 owner 404；平台管理员按既有口径可跨所有者；端点强制 dry_run（不产生无依据记忆）。
- runner：不调外部模型；标 `exact_match` 不冒充异厂；缺金标/异厂仍 409。
- 迁移 016 幂等（`create_table_if_missing` + 索引判存在）。

## 4. 未覆盖

- 真实 LLM judge 适配器（需模型凭据/预算裁定）→ 可注入位留好。
- L0 定时作业 → 手动触发。
- 域策略的界面（下一步）。

## 🛡️ 测试门（自评轮）
🧪 ✅ · 🟫 ✅ · 🧑‍💼 ✅（三项默认保守）· 🧑‍🎨 ✅
结果 4/4 → 6-review
