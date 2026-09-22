# STATE — 跨会话状态

> 本文件记录当前进行中的工作与上次断点。**每次会话结束前更新**。
> 最近更新：2026-09-21

## 当前阶段

**产品化调研与文档重写**（code-kit discovery 第 1 轮 + P-product 产物重写）

## 最近完成

| 时间 | 事项 | 产物 |
|---|---|---|
| 2026-09-21 | 剥离 code-kit 耦合、目录扁平化 | 全仓 `code-kit\|codekit\|code_kit\|code-kit-monitor` grep = 0 命中 |
| 2026-09-21 | 竞品调研（67 个开源仓库一手实测） | `.specs/COMPETITIVE-RESEARCH-2026-09-agent-harness.md`（997 行） |
| 2026-09-21 | 参考 Multica 检视可借鉴点 | 已并入调研报告与产品文档 §1.6.5 |
| 2026-09-21 | 重写产品文档与界面原型 | `.specs/product-design/PRODUCT-DESIGN.html`（3,072 行 / 310 KB，零外部依赖，HTML 校验 0 错误） |
| 2026-09-22 | discovery 第 3 轮闭合：S6(7)+S7(12) 过审（原话「都通过」）→ ROADMAP 回写 + **PRODUCT-DESIGN.html v3 执行**（定位句/P1-12·13/盯防重写/§6 全局交互纪律/规划原型注记/FAQ）|
| 2026-09-22 | code-kit 统一改造（D-discovery/P-product 收编为主干前置阶段）+ 本项目产物两轮迁移 + discovery 第 2 轮合规复审 | kit 侧 16 文件；`.specs/platform-evolution/` 5 包 30 文件；HTML 状态标 + 口径更正 3 项 |
| 2026-09-21 | discovery 第 1 轮 5 个子议题落盘 | 旧布局 27 文件 → 同日迁 code-kit 统一命名 → 再按体量红线 R16.8 二次归并：`.specs/platform-evolution/` = `TOPICS.md` + 5 × `D-<子议题>/` 文件包（TOPIC/BRAINSTORM/RECON/CONCLUSION/PANEL/REVIEW）+ `ROADMAP.md`，内容无损 |

## 进行中

- 🆕 **change `small-model-decisions` 立项草案**（2026-09-22，Jev/System One 决策小模型分层 + 对话记忆微调工厂 + 自测闭环）：`.specs/small-model-decisions/CHANGE.md`，澄清已答（A+B+C 首批全要·消费级基线·域内隔离+显式开关·内置基准+用户回放），REQUIREMENT.md 已过需求门（4/4）；**P-product v4 已把产品文档+界面原型补齐并过人审门**（用户原话「通过」2026-09-22；§2.7/§5.19/§6.23/§6.24/术语/FAQ，全标「未实现」）；铁律：两步制显式启用，未绑定=零介入。v5 补三处原型落地（p8/p3/p22）**已过审（原话「好的」2026-09-22）**；**2-design 仍未动——等指令**

无。**当前无未完成的写入任务。**

## 待人工裁定（阻塞后续开发）

| # | 取舍 | 来源 |
|---|---|---|
| 1 | **是否允许用户自定义阶段模型**（允许→改代码；不允许→改产品定位表述） | `D-stage-model-coupling/CONCLUSION.md` |
| 2 | 门禁是否改变现有自动流转行为（Agent 不得自行置终态） | `D-collaboration-layer/` |
| 3 | `work_items` 与 `projects` 合并还是独立 | 同上 |
| 4 | 是否接受「未知身份一律拒绝」的可用性变化 | `D-identity-and-security/` |
| 5 | 是否接受状态外置前先补测试导致的工期延长 | `D-single-process-state/` |
| 6 | 该仓库是否曾推送到公共远端（决定 git 历史审查紧迫度） | 同上（`D-identity-and-security/`） |

## 下一步建议（按 discovery 的硬约束顺序）

1. **修复 32 个 TS 错误**，恢复 `npm run build`（当前必然失败）
2. **`git rm --cached node_modules`**（35,517 / 35,847 个跟踪文件是依赖）
3. **消除 fail-open 身份回退**（`backend/auth.py:181-186` 缺身份回退 admin）
4. 写明「当前必须单副本部署」与「`Domain` 不是安全边界」

完整路线图见 `.specs/platform-evolution/ROADMAP.md`（议题状态账本：同目录 `TOPICS.md`）。

## 环境事实

- 后端：`backend/`，FastAPI + SQLAlchemy 2.0 + SQLite（默认）/ MySQL（可选）
- 前端：`frontend/`，React 18 + TS 5.5 + Vite 5.4 + Zustand
- 虚拟环境：`/home/malizhi/.venv`（Python 3.14.4）
- 启动：后端 `uvicorn main:app --port 8000`；前端 `npm run dev`（5173，代理 `/api` → 8000）
- 默认管理员：`admin` / `123456`（**硬编码，属待修项**）
- 已知缺陷：`npm run build` 失败（32 个 TS 错误）；`node_modules` 被 git 跟踪

## 已知约束

- `.specs/` 是**产品一等数据**（知识产物），**不得删除**
- 读写 `.specs/` 路径一律经 `config.get_specs_dir()`，不要硬编码目录
- 9 阶段模型当前硬编码在 13 个文件中（待配置化）
