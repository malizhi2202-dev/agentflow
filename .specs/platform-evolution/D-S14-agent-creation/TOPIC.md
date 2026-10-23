# D-S14-agent-creation — Agent 创建链路

> 审核: **通过（2026-10-23 · 用户「d14和d15同意」）· 残余细则见 DICT-agent-resource-model.md §五**（第5轮 2026-09-23）

## 一句话议题

一个 Agent 平台里「创建 Agent」到底该有几个入口、几种形态、哪几步必填、走什么生命周期、归谁所有——补上原型与代码里都缺失的创建链路。

## 依据

- **用户原话（拆解合法性来源）**：「我的agent要能被创建的啊」。
- **代码事实（本包 RECON.md 全文核验，含 file:line）**：`backend/routes/agents_api.py:42-43` 已有 `POST /api/agents` 但为裸 `dict` payload 直建；`backend/models/agent.py:13-36` 24 字段中真正阻塞创建的只有 `name`；前端 `frontend/src/pages/AgentBuilder.tsx:41` 的「创建 Agent」按钮只把一个预填对象交给同一个详情表单（`frontend/src/App.tsx:161-177`，`data.id ? PUT : POST`）——无向导、无形态选择、无模板实例化、无发布态。
- **原型缺口**：任务书给定「原型侧 97+28 页里创建只有 toast/弹层，无创建向导页」（`PRODUCT-DESIGN.html` 为禁改禁读项，此条按任务书原话引用，未自行核验页面内容）。
- **与任务书底座的三处出入（已在 RECON.md「零·事实校正」纠正）**：`frontend/src/pages/AgentCreate.tsx` 实际为 `AgentBuilder.tsx`；`backend/services/assembly_service.py` 不存在（实际是 `backend/routes/assembly_api.py`，且语义是「角色×工作流节点绑定」不是「Agent 组装」）；RoleMarket 无「实例化为 Agent」按钮，只有「基于此创建」→ 造自定义角色。

## 调研问题（四问）

1. **入口与形态**：空白创建 / 模板实例化 / 从对话蒸馏 / 复制既有 / 导入外部定义（YAML·DSL）——应该几个、哪几个？
2. **生命周期与权限**：草稿→测试→发布→运行→归档怎么切；谁能建、建完归谁、能否共享与转让。
3. **最小必填集 vs 渐进完善**：24 字段里哪些必须在创建时出现，哪些必须延后；人格字段与闸门字段的写入路径怎么补。
4. **api_key 出现步骤**：现在模型 `nullable=False` 但路由用 `or "not_set"` 占位（`backend/routes/agents_api.py:45`），凭据该在创建流哪一步、以什么形态出现。

## 成员文件（R16.8）

`TOPIC.md`（本文件）· `BRAINSTORM.md`（①）· `RECON.md`（②）· `CONCLUSION.md`（③）· `PANEL.md`（④）· `REVIEW.md`（⑤ 待主会话呈审）

## 硬约束声明

本轮**零代码改动**（R16.1 + 裁定⑧ 开发冻结）：全部结论止于文档/原型层建议，标注为「解冻后可立项」；对 `backend/`、`frontend/` 仅做只读扫描。
