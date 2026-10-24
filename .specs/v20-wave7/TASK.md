# TASK · v20-wave7

## T-01 / A2A M0 静态 AgentCard（R4-2）

- **files**：`backend/services/agent_card.py`(新) · `backend/routes/a2a_api.py`(新) · `backend/main.py` · `backend/tests/test_a2a_card.py`(新)
- **verify**：`unittest tests.test_a2a_card -v` → 卡片形状 / 白名单无凭据 / 越权 404 / 归档态如实
- **done 判据**：AC-7.1…7.4

## T-02 / RSI 补列与开关（R7-4 · R7-5 · R6-4）

- **files**：`backend/models/rsi.py` · `backend/services/rsi_service.py` · `backend/routes/rsi_api.py` · `backend/migrations.py`(014) · `backend/tests/test_rsi_governance.py`(新) · `backend/tests/test_rsi.py`（不回归）
- **verify**：`unittest tests.test_rsi_governance tests.test_rsi -v` → 因果前缀拒绝 / 双扫标记 / 评审账落行 / 三类开关 409 / 审计
- **done 判据**：AC-7.5…7.13

## T-03 / 归因双列与瀑布（R8-2）

- **files**：`backend/models/collab.py` · `backend/services/attribution.py`(新) · `backend/routes/tasks_api.py` · `backend/migrations.py`(015) · `backend/tests/test_attribution.py`(新)
- **verify**：`unittest tests.test_attribution tests.test_collab -v` → 瀑布三例（member/agent 链/fail-closed）+ 双列落库 + test_collab 不回归
- **done 判据**：AC-7.14…7.17

## T-04 / 收口

- **files**：`.specs/v20-wave7/{CHANGE,TASK,TEST,REVIEW}.md` · `STATE.md` · `RULINGS.md`（三条状态改「已实施」）
- **verify**：全量 `unittest discover -s tests` → 与基线同红（29F/12E/6S），0 新增红
- **done 判据**：工件齐 + STATE 阶段/下一步一致
