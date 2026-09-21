"""GET /api/git/safety — Git 安全网检查点."""
import subprocess
from fastapi import APIRouter

router = APIRouter()


@router.get("/api/git/safety")
async def git_safety():
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "--grep=safety(", "-1"],
            capture_output=True, text=True, timeout=5, cwd="../../../.."
        )
        if result.returncode != 0 or not result.stdout.strip():
            return {"latest_safety_commit": None, "distance": None, "message": "no safety commit found"}
        safety_hash, *msg = result.stdout.strip().split(" ", 1)
        dist = subprocess.run(
            ["git", "rev-list", "--count", f"{safety_hash}..HEAD"],
            capture_output=True, text=True, timeout=5, cwd="../../../.."
        )
        return {
            "latest_safety_commit": {
                "hash": safety_hash,
                "message": " ".join(msg) if msg else "",
            },
            "distance": int(dist.stdout.strip()) if dist.returncode == 0 else None,
        }
    except Exception as e:
        return {"latest_safety_commit": None, "distance": None, "error": str(e)}
