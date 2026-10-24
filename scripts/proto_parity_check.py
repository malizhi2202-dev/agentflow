#!/usr/bin/env python3
"""原型 ⟂ 前端 对齐检查（只读，不改任何文件）。

用途：
- 给「按 127 页原型对齐」一个可复跑的基线：每页族是否已有实现视图、导航是否齐全；
- 供 E2E / 阶段验收引用（数字来自实测，不手填）。

用法：
    python3 scripts/proto_parity_check.py            # 人类可读表
    python3 scripts/proto_parity_check.py --json     # 机器可读（给 CI/工件）
    python3 scripts/proto_parity_check.py --strict   # 有「缺失」族时退出码 1（后续接 CI 用）
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTO = os.path.join(ROOT, ".specs/product-design/prototype")
APP = os.path.join(ROOT, "frontend/src/App.tsx")

# 页族 → (已实现视图 id, 形态)。形态：
#   page    = 独立页面（App.tsx 有 case + 导航项）
#   partial = 只以抽屉/子 tab 形态存在，不是原型那种独立页
#   meta    = 不是业务视图（壳/登录流程/文档页），不计入“缺失页”
#   None    = 缺失
# 口径：本脚本只判「有没有对应实现形态」，页面深度是否达标由 change 的验收用例决定。
FAMILY_VIEW = {
    "control-plane": ("control-plane", "page"), "agents": ("agents", "page"),
    "agent-detail": ("agent-detail", "page"),
    "runtimes": ("runtimes", "page"), "canvas": ("orchestration", "page"),
    "workflows": ("workflows", "page"), "tools": ("tools", "page"),
    "chat": ("chat", "page"), "knowledge": ("knowledge", "page"),
    "runtime": ("runtime", "page"), "alerts": ("alerts", "page"),
    "metrics": ("monitor", "page"), "projects": ("projects", "page"),
    "roles": ("roles-page", "page"), "audit": ("audit", "page"),
    "users": ("users", "page"), "approvals": ("approvals", "page"),
    "board": ("tasks", "page"), "inbox": ("inbox", "page"),
    "replay": ("replay", "page"), "teams": ("teams", "page"),
    "squads": ("squads", "page"),
    "memory": ("memory", "page"), "automations": ("automations", "page"),
    # 缺失
    "workbench": ("home", "page"),             # 工作台 = 变更总览（Home.tsx）
    "stage-model": ("stage-model", "page"), "decision-models": ("decision-models", "page"),
    "finetune": ("finetune", "page"), "env-advisor": ("env-advisor", "page"),
    "isolation": ("isolation", "page"), "integration": ("integration", "page"),
    # 元页面（不算业务缺失）
    "index": ("shell", "meta"), "login": ("login", "meta"),
    "discipline": ("discipline", "meta"), "relations": ("relations", "meta"),
}


def proto_nav():
    html = open(os.path.join(PROTO, "index.html"), encoding="utf-8").read()
    return re.findall(r'data-frame="([a-z_.-]+\.html)"[^>]*>([^<]+)<', html)


def proto_families():
    fams = {}
    for f in sorted(x for x in os.listdir(PROTO) if x.endswith(".html")):
        fams.setdefault(f.split("__")[0].replace(".html", ""), []).append(f)
    return fams


def app_views():
    if not os.path.exists(APP):
        return set(), []
    src = open(APP, encoding="utf-8").read()
    ids = set(re.findall(r"case '([a-z0-9-]+)':", src))
    # 侧栏出现过的 id（出现顺序即展示顺序）：NAV_GROUPS / NAV / ADMIN_NAV 里的 { id: 'x' }
    nav_ids = re.findall(r"\{\s*id:\s*'([a-z0-9-]+)'", src)
    return ids, nav_ids


def main() -> int:
    nav = proto_nav()
    fams = proto_families()
    views, nav_ids = app_views()

    rows = []
    for fam, pages in fams.items():
        entry = FAMILY_VIEW.get(fam)
        view, kind = (entry if isinstance(entry, tuple) else (None, None))
        rows.append({
            "family": fam,
            "pages": len(pages),
            "view": view,
            "kind": kind,
            "routed": bool(view and view in views),
            "in_nav": bool(view and view in nav_ids),
            "prototype_url": f"/prototype/{fam}.html",
        })

    missing = [r["family"] for r in rows if r["kind"] is None]
    partial = [r["family"] for r in rows if r["kind"] == "partial"]
    meta = [r["family"] for r in rows if r["kind"] == "meta"]
    not_routed = [r["family"] for r in rows if r["kind"] in ("page", "partial") and not r["routed"]]
    summary = {
        "prototype_pages": sum(r["pages"] for r in rows),
        "prototype_families": len(rows),
        "nav_items": len(nav),
        "implemented_families": sum(1 for r in rows if r["kind"] == "page" and r["routed"]),
        "partial_families": partial,
        "missing_families": missing,
        "meta_families": meta,
        "declared_but_not_routed": not_routed,
        "app_nav_items": len(nav_ids),
    }

    if "--json" in sys.argv:
        print(json.dumps({"summary": summary, "rows": rows}, ensure_ascii=False, indent=2))
    else:
        print(f"原型：{summary['prototype_pages']} 页 / {summary['prototype_families']} 页族；导航 {summary['nav_items']} 项")
        print(f"实现：独立页面页族 {summary['implemented_families']}；部分实现 {len(partial)}；"
              f"App.tsx 导航项 {summary['app_nav_items']}")
        print(f"缺失页族（{len(missing)}）：{' / '.join(missing) or '无'}")
        print(f"部分实现（{len(partial)}）：{' / '.join(partial) or '无'}")
        print(f"元页面（不计缺失，{len(meta)}）：{' / '.join(meta) or '无'}")
        if not_routed:
            print(f"映射存在但未接路由（{len(not_routed)}）：{' / '.join(not_routed)}")
        print()
        print(f"{'页族':<18}{'原型页':>4}  {'视图':<16}{'路由':<4}{'导航':<4}")
        for r in rows:
            kind = {"page": "页面", "partial": "部分", "meta": "元页", None: "缺失"}[r["kind"]]
            print(f"{r['family']:<18}{r['pages']:>4}  {(r['view'] or '—'):<16}{kind:<4}"
                  f"{('✓' if r['routed'] else '·'):<4}{('✓' if r['in_nav'] else '·'):<4}")

    if "--md" in sys.argv:
        lines = ["# 差距矩阵（原型 35 页族 ⟂ 现有前端）", "",
                 "> 机器生成：`python3 scripts/proto_parity_check.py --md > .specs/ui-parity/GAP.md`。",
                 "> 口径：**页面** = 独立页面且已接路由；**部分** = 只以抽屉/子 tab 形态存在；"
                 "**元页** = 壳/登录流程/文档页（不计缺失）；**缺失** = 无对应实现。", "",
                 f"- 原型 {summary['prototype_pages']} 页 / {summary['prototype_families']} 页族"
                 f"（导航 {summary['nav_items']} 项）",
                 f"- 已实现独立页 {summary['implemented_families']} 族 · 部分 {len(partial)} 族 · "
                 f"缺失 {len(missing)} 族 · 元页 {len(meta)} 族",
                 "",
                 "| 页族 | 原型页 | 现有视图 | 形态 | 路由 | 导航 |", "|---|---|---|---|---|---|"]
        for r in rows:
            kind = {"page": "页面", "partial": "部分", "meta": "元页", None: "缺失"}[r["kind"]]
            lines.append(f"| `{r['family']}` | {r['pages']} | {r['view'] or '—'} | {kind} | "
                         f"{'✓' if r['routed'] else '·'} | {'✓' if r['in_nav'] else '·'} |")
        lines += ["", "## 缺失页族（要先做）", ""] + [f"- `{x}`" for x in missing]
        open(os.path.join(ROOT, ".specs/ui-parity/GAP.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
        print("已写 .specs/ui-parity/GAP.md")

    if "--strict" in sys.argv and missing:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
