# SUMMARY: T04 — App 挂载 + 用例 + 三件门

- **Change ID**: v20-ui-rsi · **Task ID**: T04

## 做了什么

`App.tsx` 加「记忆中心」NAV（`Brain` 图标）+ `View` + `perm('project:read')` 分支 + `/memory` 初始路径。
新增 `__tests__/memory-page.test.tsx` 12 条（记忆列表/写入 no_entry/409 透传/评审/检疫/衰减/治理开关+复位/
提案空态/状态裁剪/影子 409/非管理员发布置灰/管理员发布确认/新建提案 body）。

## verify 输出（真实粘贴）

```text
$ npx tsc --noEmit
exit 0

$ npx vitest run
 Test Files  9 passed (9)
      Tests  86 passed (86)      # 既有 74 + 本 change 12

$ npm run build
✓ built in 16.07s
```

## 🛡️ G3 代码门（自评轮）

```
🟫 研发负责人 ✅（1 store + 1 page + App 4 处）；🟩 架构师 ✅（复用双 tab/读写分工，无新模式）；
🧪 测试 ✅（12 条覆盖 12 个 AC）；🔴 安全 ✅（发布二次确认+管理员门，开关 403 透传）
结果: 4/4 → 进入 5-test
```
