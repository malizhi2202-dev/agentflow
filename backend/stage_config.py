"""阶段模型单一事实源（P0-6 / P0-7）。

**为什么要有这个模块**
- P0-6：9 个阶段与产物文件名此前硬编码在 12 个文件里；`/api/admin/workflow` + `workflow.json`
  是**已存在但没接上**的配置落点。本模块把它接上：默认值只有一份，运行时以 `workflow.json` 为准。
- P0-7：`scanner.py` 与 `runtime/scanner.py` 各自维护一套 `STAGE_FILES` / `STAGE_NAMES`，
  改一处漏一处。两份扫描器现在都从这里取表，不再各存一份。

**约定**
- `STAGES / STAGE_FILES / STAGE_NAMES / ARTIFACTS` 是**派生快照**，由 `apply(workflow)` 重建；
  调用方一律 `import stage_config as sc` 后**取属性**（不要 `from stage_config import STAGES`，
  否则热更新拿不到新值）。
- 校验失败**响亮抛出**（S7-C4 纪律：拒绝未知/残缺字段，不静默降级）；调用方决定是回退默认还是报错。
- 纯标准库，可在无第三方依赖的机器上跑测试。
"""
from __future__ import annotations

import json
import os

from config import get_specs_dir

# ── 唯一默认值（原 routes/admin_api.py:31 的副本已删，改从这里取）──
DEFAULT_WORKFLOW: dict = {
    "stages": [
        {"id": "0-change", "name": "变更提案", "gate": "G1", "prompt": "prompts/0-change.md", "order": 0},
        {"id": "1-requirement", "name": "需求分析", "gate": "需求门", "prompt": "prompts/1-requirement.md", "order": 1},
        {"id": "2-design", "name": "技术设计", "gate": "G2", "prompt": "prompts/2-design.md", "order": 2},
        {"id": "2a-ui-design", "name": "UI 设计", "gate": "G2a", "prompt": "prompts/2a-ui-design.md", "order": 3},
        {"id": "3-task", "name": "任务拆分", "gate": "Task", "prompt": "prompts/3-task.md", "order": 4},
        {"id": "4-dev", "name": "开发执行", "gate": "G3", "prompt": "prompts/4-dev.md", "order": 5},
        {"id": "5-test", "name": "测试验证", "gate": "测试门", "prompt": "prompts/5-test.md", "order": 6},
        {"id": "6-review", "name": "代码审查", "gate": "G4", "prompt": "prompts/6-review.md", "order": 7},
        {"id": "7-integration", "name": "集成归档", "gate": None, "prompt": "prompts/7-integration.md", "order": 8},
    ],
    "gates": [
        {"id": "G1", "name": "G1 需求方向门", "experts": ["高级产品经理", "资深用户评测员", "架构师", "安全审计师"]},
        {"id": "需求门", "name": "需求质量门", "experts": ["高级产品经理", "资深用户评测员", "架构师", "安全审计师"]},
        {"id": "G2", "name": "G2 方案门", "experts": ["架构师", "研发负责人", "领域专家", "安全审计师"]},
        {"id": "G2a", "name": "G2a UI设计门", "experts": ["资深 UI 设计师", "资深用户体验官", "前端架构师", "无障碍专家"]},
        {"id": "Task", "name": "Task 门", "experts": ["工程效能专家", "架构师", "研发负责人", "资深测试工程师"]},
        {"id": "G3", "name": "G3 代码门", "experts": ["研发负责人", "架构师", "资深测试工程师", "安全审计师"]},
        {"id": "测试门", "name": "测试门", "experts": ["资深测试工程师", "研发负责人", "高级产品经理", "资深用户体验官"]},
        {"id": "G4", "name": "G4 审查门", "experts": ["资深测试工程师", "架构师", "领域专家", "安全审计师"]},
    ],
}

# 阶段 → 产物文件（配置里没有额外声明时按此推断）
_STAGE_FILE_BY_ID: dict[str, str] = {
    "0-change": "CHANGE.md",
    "1-requirement": "REQUIREMENT.md",
    "2-design": "DESIGN.md",
    "2a-ui-design": "UI-DESIGN.md",
    "3-task": "TASK.md",
    "5-test": "TEST.md",
    "6-review": "REVIEW.md",
}

# 派生快照（由 apply() 重建；初值 = 默认工作流）
STAGES: list[str] = []
STAGE_FILES: dict[str, str] = {}
STAGE_NAMES: dict[str, str] = {}
ARTIFACTS: list[str] = []


def workflow_file() -> str:
    """`workflow.json` 的位置：与 `.specs/` 同级（沿用 admin_api 既有落点）。"""
    return os.path.join(os.path.dirname(get_specs_dir().rstrip(os.sep)), "workflow.json")


def validate(workflow: dict) -> list[dict]:
    """校验并返回归一化后的 stages（按 order 排序、id 唯一）。

    失败即抛 ValueError——不猜、不静默丢阶段（S7-C4「配置校验必须响亮失败」）。
    """
    if not isinstance(workflow, dict) or not isinstance(workflow.get("stages"), list):
        raise ValueError("workflow.stages 缺失或不是数组")
    stages = []
    seen = set()
    for i, raw in enumerate(workflow["stages"]):
        if not isinstance(raw, dict):
            raise ValueError(f"stages[{i}] 不是对象")
        sid = raw.get("id")
        if not sid or not isinstance(sid, str):
            raise ValueError(f"stages[{i}] 缺少 id")
        if sid in seen:
            raise ValueError(f"阶段 id 重复: {sid}")
        seen.add(sid)
        stages.append({
            "id": sid,
            "name": raw.get("name") or sid,
            "order": raw.get("order", i),
            "gate": raw.get("gate"),
            "prompt": raw.get("prompt"),
        })
    if not stages:
        raise ValueError("workflow.stages 为空")
    stages.sort(key=lambda s: (s["order"], s["id"]))
    return stages


def apply(workflow: dict) -> dict:
    """用一份工作流配置重建派生快照，返回归一化后的 workflow（含 stages）。"""
    stages = validate(workflow)
    global STAGES, STAGE_FILES, STAGE_NAMES, ARTIFACTS
    STAGES = [s["id"] for s in stages]
    STAGE_NAMES = {s["id"]: s["name"] for s in stages}
    STAGE_FILES = {s["id"]: _STAGE_FILE_BY_ID[s["id"]] for s in stages if s["id"] in _STAGE_FILE_BY_ID}
    ARTIFACTS = [STAGE_FILES[s] for s in STAGES if s in STAGE_FILES]
    return {"stages": stages, "gates": list(workflow.get("gates") or DEFAULT_WORKFLOW["gates"])}


def load_workflow() -> dict:
    """读 `workflow.json`；文件不存在则用默认值。**内容非法时抛出**（由调用方决定回退）。"""
    path = workflow_file()
    if not os.path.exists(path):
        return DEFAULT_WORKFLOW
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def reload() -> dict:
    """重新读盘并应用（admin 保存配置后调用）。配置非法 → 抛 ValueError，保留旧快照。"""
    return apply(load_workflow())


# 进程启动即用默认值建快照：导入本模块即可拿到可用常量（不依赖落盘文件）
apply(DEFAULT_WORKFLOW)
