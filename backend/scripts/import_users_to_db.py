#!/usr/bin/env python3
"""把文件态用户档案导入 `app_users` 表（v21 T-07 / 裁定⑦收尾）。

默认 **dry-run**：只报告将导入多少条、与库内差异，不写库。
`--apply` 才执行整表对齐（upsert 全部 + 删除库里多出来的）。

用法：
    cd backend
    DATABASE_URL=... python scripts/import_users_to_db.py                 # dry-run
    DATABASE_URL=... python scripts/import_users_to_db.py --apply          # 真正导入
    DATABASE_URL=... python scripts/import_users_to_db.py --file /path/users.json
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

os.environ.setdefault("ENCRYPTION_KEY", "import-users-key-32bytes!!!!!!!!")


def main() -> int:
    ap = argparse.ArgumentParser(description="users.json → app_users 表")
    ap.add_argument("--file", default=None, help="users.json 路径（默认走 auth 的 data dir）")
    ap.add_argument("--apply", action="store_true", help="真正写库（默认 dry-run）")
    args = ap.parse_args()

    import auth
    from services import user_store

    path = args.file or auth._users_file()
    if not os.path.exists(path):
        print(f"[import-users] 找不到 {path}（没有可导入的文件态数据）")
        return 2

    before = user_store.available()
    out = user_store.import_from_json(path, apply=args.apply)
    print(f"[import-users] 源文件 {out['source']}")
    print(f"[import-users] 文件内用户 {out['found']} 条；导入前表已启用={before}")
    if out["applied"]:
        print(f"[import-users] 已写入：upserted={out['upserted']} deleted={out['deleted']}")
        print(f"[import-users] 导入后表已启用={user_store.available()}")
    else:
        print("[import-users] dry-run：未写库（加 --apply 执行）。表启用后将由表提供用户档案。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
