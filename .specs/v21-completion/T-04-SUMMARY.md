# T-04 · 测试基建（CI / 覆盖率 / E2E 接脚本 / hermes 通道 / L0 循环）—— 完成

- **Change**: v21-completion · 2026-10-24
- **结论**：`scripts/ci.sh` 一条命令跑完 4 道门（pyflakes 未定义名 / 后端全量单测 / 前端 tsc+vitest+coverage / 生产构建），
  真实输出 **全绿**；界面 E2E 在 **dsh 与 hermes 双通道各 13/13** 通过（真实 MySQL + 真实 CLI + 真实浏览器）。

## 交付物

| 类别 | 文件 | 说明 |
|---|---|---|
| 本地 CI | `scripts/ci.sh` | `--with-coverage` / `--with-e2e`；每步打印真实命令与输出，失败非 0 退出 |
| 远端 CI | `.github/workflows/ci.yml` | 与本地同源步骤（后端单测 → 前端 tsc/vitest/build）；E2E 需外部 MySQL，不进默认 job |
| 覆盖率 | `frontend/vite.config.ts` + `backend/requirements-dev.txt` | 前端 v8（include `src/**`，排除测试/入口）；后端 `coverage` 7.x（`--source=.`） |
| E2E 入口 | `scripts/e2e/run_e2e.sh` | 前置体检 → 用 CLI 真跑一次 L0 抽取 → 13 条界面 E2E；`npm run e2e` 转调 |
| 前端脚本 | `frontend/package.json` | `typecheck` / `coverage` / `e2e` |
| 循环用例 | `backend/tests/test_l0_job.py`（含 `TestTick` 3 例） | 租约优先、备用实例返回 None、正常 tick 落库 |
| 文档 | `scripts/e2e/README.md` | 补 `RSI_JUDGE_MODEL`（缺它 judge=llm 直接 400 fail-closed，本轮踩过） |

## 实测证据（本轮真实输出）

```text
$ bash scripts/ci.sh --with-coverage
===== 后端：pyflakes（未定义名） =====        （undefined name 命中数 = 0）
===== 后端：全量单测（目标 0 失败） =====
Ran 482 tests in 102.335s
OK (skipped=6)
后端覆盖率（services/routes）：TOTAL 7340 语句 / 3774 未覆盖 → 49%
===== 前端：类型检查 =====                    npx tsc --noEmit → 0 错误
===== 前端：单测 =====                        Tests 93 passed (93)
Statements : 15.36% ( 2226/14486 ) · Branches : 67.7% ( 520/768 ) · Functions : 43.8% ( 138/315 )
===== 前端：生产构建 =====                    ✓ built in 16.17s
CI ✅ 全绿
```

```text
$ E2E_CLI=hermes bash scripts/e2e/run_e2e.sh          # 后端同时用 hermes 当 provider/judge
L0 第 1 次：candidates=1 stored=1
PASS ×13 → SUMMARY 13/13 passed
  · 记忆：L0 抽取结果已在列表 — 记忆行=32 含502=true
  · 运行时：judge=llm 真实调用 hermes CLI — pass_rate=0.5 kind=llm_judge

$ E2E_CLI=dsh bash scripts/e2e/run_e2e.sh
L0 job: {"conversation_id": 1, "dry_run": false, "candidates": 1, "created": 1}
PASS ×13 → SUMMARY 13/13 passed
  · 运行时：judge=llm 真实调用 dsh CLI — pass_rate=0.5 kind=llm_judge
```

## 过程中修掉的 3 个真缺陷（不是调脚本）

1. **写后读竞态**（产品 bug，`frontend/src/utils/requestDedup.ts`）：
   `invalidateCache()` 只清缓存 Map，**在途中**的读请求 settle 后会把旧响应写回缓存，
   列表 5s 内看不到刚创建的对象。修法：缓存代际（generation），旧代际响应不写不再复用。
   回归用例 `frontend/src/__tests__/request-dedup.test.ts`（4 例，含「旧读挂起 → 失效 → 新读 → 旧读回来」顺序）。
2. **抽取器解析太窄**（`backend/services/l0_llm_extractor.py`）：
   真实 CLI 会把候选包在 `{"experiences":[...]}` 里、字段叫 `title/content/notes`。新增 `parse_reply`
   兼容容器键与字段别名、evidence 单字符串包装；缺字段仍直接丢（不猜）。3 个新用例。
3. **抽取 prompt 自带逃生口**：写「抽不出就输出 []」时 hermes 对故障复盘对话**稳定回 0 条**；
   改成正面界定「现象/排查顺序/结论都算可复用」后同段对话稳定 1 条（evidence 仍须引用原话）。

另外修 `seed_l0_mysql.py` 的**假阴性**：原来调 `run_once` 取「最近更新会话」，多轮后抽的不是自己种的那段；
改为对自建会话直接 `l0_extractor.extract`，抽不到候选按失败退出（重试 2 次区分模型抖动与链路故障）。

## 教训

- **L-007**：缓存失效要能作废在途请求（否则写后读读到旧值）——本轮由 3 轮 E2E 复现抓到。
- **L-008**：端到端验证必须跑「自己造的那个对象」，否则假阴性会被当成绿。
