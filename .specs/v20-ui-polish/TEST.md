# TEST: 遗留小项收口

## 功能轮
| AC | 用例 |
|---|---|
| AC-1 手动熔断 | 「手动熔断：需填原因，提交到 trip 端点」（空原因禁用 → 填原因 → POST body `{reason}`） |
| AC-2 Tabs 方向键 | 「Tabs 支持方向键切换且 roving tabindex」（初始 `tabindex 0/-1` → ArrowRight → 提案 selected） |
| AC-3 surface 新建 | 「管理员新建可改面 → POST /api/rsi/surfaces」（body `{name, allow_edit:[...]}`） |
| AC-4 回填脚本 | `tests.test_backfill_squad_creator` 2 条（dry-run 不写 / apply 幂等 + 回填后 creator 可写） |

## 全量门
```text
$ npx tsc --noEmit        → exit 0
$ npx vitest run          → Test Files 9 passed (9) · Tests 89 passed (89)
$ npm run build           → ✓ built in 27.18s
$ cd backend && unittest discover -s tests
Ran 436 tests in 114.388s
FAILED (failures=29, errors=12, skipped=6)
$ diff 基线失败清单 本次失败清单 → 无差异（0 新增红）
```

## 未覆盖
- 团队页 Tabs 方向键（另一文件，留 v2）。
- trip 的审计记录（后端无该端点）。
- surface 编辑/删除（后端无端点）。

## 测试门（自评）
🧪 ✅ · 🟫 ✅ · 🧑‍💼 ✅ · 🧑‍🎨 ✅ → 4/4
