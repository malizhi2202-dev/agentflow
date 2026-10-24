#!/usr/bin/env python3
"""从原型 index.html 生成前端导航清单（frontend/src/generated/protoNav.ts）。

为什么要生成：导航顺序/编号是原型的一部分（6.0…6.31），手抄会漂移。
改原型 → 重跑本脚本 → 前端导航自动跟上；test_nav_parity 用例会比对两者。
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = os.path.join(ROOT, ".specs/product-design/prototype/index.html")
OUT = os.path.join(ROOT, "frontend/src/generated/protoNav.ts")

html = open(IDX, encoding="utf-8").read()
nav = re.findall(r'data-frame="([a-z_.-]+\.html)"[^>]*>([^<]+)<', html)
items = []
for frame, label in nav:
    family = frame.split("__")[0].replace(".html", "")
    label = re.sub(r"\s+", " ", label).strip()
    code = label.split(" ")[0] if label[:1].isdigit() else ""
    items.append({"code": code, "label": label, "frame": frame, "family": family})

os.makedirs(os.path.dirname(OUT), exist_ok=True)
body = "// 自动生成，勿手改：scripts/gen_proto_nav.py（源=.specs/product-design/prototype/index.html）\n"
body += "export interface ProtoNavItem { code: string; label: string; frame: string; family: string }\n"
body += "export const PROTO_NAV: ProtoNavItem[] = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n"
open(OUT, "w", encoding="utf-8").write(body)
print(f"已生成 {OUT}（{len(items)} 项）")
