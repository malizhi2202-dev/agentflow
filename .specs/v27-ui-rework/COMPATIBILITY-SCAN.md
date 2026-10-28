# T11 兼容性与 anti-slop 扫描

- **Change**: `v27-ui-rework`
- **日期**: 2026-10-27
- **范围**: 未列入首批的低频页面与共享样式；仅登记，不扩大代码修改。

## 命令与结果

```bash
grep -R -n -e '--bg-panel' -e '#000' -e '#fff' -e 'gradient' -e 'emoji' frontend/src/styles frontend/src/pages > /tmp/v27-ui-scan.txt || true
```

结果：`52` 条命中，原始输出保留于 `/tmp/v27-ui-scan.txt`。

## 分类登记

| 命中 | 位置 | 判断 | 处理 |
|---|---|---|---|
| `--bg-panel` | `frontend/src/styles/tokens.css:76`、若干旧页面 | 兼容别名/旧页面仍在使用 | T02 已提供别名；本批不改非首批页面 |
| `#fff` | 多个低频页面及首批旧内联按钮 | 既有旧内联样式，主要用于按钮文字/状态 chip | 不扩大 v1 范围；新迁移页面使用语义 token |
| `emoji` | `frontend/src/pages/Roles.tsx` | 旧角色市场数据模型字段，不是本批新增装饰 | 保留兼容，不改低频页面 |
| `gradient` | 本次 grep 未命中 | 无 | — |
| `#000` | 本次 grep 未命中 | 无 | — |

## 结论

- 首批页面的共享主题 token、PageHeader、focus-visible 与 reduced-motion 已由 T02/T03 负责。
- 扫描命中集中在未列入首批的旧页面或兼容变量；按 CHANGE 范围排除，不在本批重写。
- 未发现本批新增的渐变、纯黑背景或 emoji 装饰。
