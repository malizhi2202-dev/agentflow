# TASK · v20-release（7-integration）

## T-FIX-01 / `scanner._phase_order` 裸 `STAGES` → `/api/health` 500（完成）

- **发现于**：7-integration UAT（真实 `uvicorn` 启动 + `curl /api/health`）
- **files**：`backend/scanner.py` · `backend/tests/test_regressions.py`(新)
- **根因**：波 0 把阶段表收口到 `stage_config`，`_phase_order` 仍是模块级裸 `STAGES`；`except ValueError` 捕不到 `NameError`，于是每个 change 走 `_next_action` 时炸，探活面 500。
- **改法**：取 `list(stage_config.STAGES).index(phase)`（唯一真源，admin 改配置即生效），注释写明历史坑。
- **verify**：
  ```
  $ pyflakes（undefined name 过滤） → 修复前 scanner.py:52 + metrics_api.py:35，修复后 0 命中
  $ unittest tests.test_regressions -v → Ran 3 tests — OK
  $ 真实服务 curl /api/health → HTTP=200（修复前 HTTP=500 / NameError: STAGES）
  ```
- **done 判据**：health 200 + 回归用例锁死（`_phase_order` 与 `_next_action` 两条）

## T-FIX-02 / `metrics_api._owner_filter` 引用未导入 `SessionMetric`（完成）

- **发现于**：pyflakes 全仓 undefined-name 扫描（UAT 顺手做）
- **files**：`backend/routes/metrics_api.py`
- **根因**：函数体内用 `SessionMetric` 但只在各端点内 `from models.metrics import SessionMetric`；且该函数**全仓零调用**（死代码）。
- **改法**：按 ponytail 删除死代码（不补 import：没人用的函数 + 潜在 NameError = 负资产）。
- **verify**：
  ```
  $ grep -rn "_owner_filter" backend → 修复前仅定义处 1 条；修复后 0 条
  $ pyflakes undefined name → 0 命中
  $ unittest tests.test_api_integration → 与基线同红（该模块本就是 mock 漂移债）
  ```

## T-01 / 交付留痕补齐（完成）

- **files**：`.specs/ALIGNMENT.md` · `.specs/LESSONS.md` · `.specs/CHANGELOG.md` · `.specs/v20-wave{0..7}/SUMMARY.md` · `.specs/v20-release/UAT.md`
- **verify**：8 个 change 目录逐个 `ls` 可见 `SUMMARY.md`；`ALIGNMENT.md` 基线 = `13faefbe`
- **done 判据**：7-integration 自检清单（对齐/自动化/UAT/重试/CHANGELOG/归档）逐条可勾

## T-02 / 文档漂移合并（S-align A1/A2，待确认后执行）

- **files**：`README.md`（API 端点速查 + 功能模块节末标注）
- **done 判据**：ALIGNMENT「已对齐记录」两条有对应提交
