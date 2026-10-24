"""把 `squads.created_by` 为空的历史小队回填到指定 owner（**默认 dry-run**）。

背景：`v20-squad-authz` 之后，空 `created_by` 的小队只有平台管理员能改。
历史数据需要一次回填才能让 creator 自己管。回填**必须由人指定 owner**——脚本不猜。

用法：
    python scripts/backfill_squad_creator.py                    # 只列出需要回填的行
    python scripts/backfill_squad_creator.py --apply --owner alice
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal            # noqa: E402
from models.teams import Squad               # noqa: E402


def run(db, owner: str, apply: bool) -> dict:
    rows = db.query(Squad).filter((Squad.created_by == "") | (Squad.created_by.is_(None))).all()
    targets = [{"id": s.id, "slug": s.slug, "name": s.name} for s in rows]
    if apply and targets:
        for s in rows:
            s.created_by = owner
        db.commit()
    return {"scanned": len(targets), "applied": bool(apply), "owner": owner if apply else None,
            "targets": targets}


def main() -> int:
    ap = argparse.ArgumentParser(description="回填 squads.created_by")
    ap.add_argument("--owner", default="", help="回填成的 user id（--apply 时必填）")
    ap.add_argument("--apply", action="store_true", help="真的写库（默认 dry-run）")
    args = ap.parse_args()
    if args.apply and not args.owner.strip():
        print("--apply 必须同时给 --owner（脚本不猜归属）", file=sys.stderr)
        return 2
    db = SessionLocal()
    try:
        out = run(db, args.owner.strip(), args.apply)
    finally:
        db.close()
    print(f"扫描到 {out['scanned']} 条空 created_by 的小队")
    for t in out["targets"]:
        print(f"  #{t['id']} {t['slug']} {t['name']}")
    print("已回填" if out["applied"] else "dry-run：未写库（加 --apply --owner <uid> 执行）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
