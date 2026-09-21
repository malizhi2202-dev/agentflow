# README.md 一致性检查报告

> 扫描日期：2026-07-06
> 方法：grep / find / wc -l / sqlite3 精确计数
> 结论：**README 大面积过时，10 项数据中有 8 项不准确**

---

## 逐项对照

| # | README 声称 | 实际扫描 | 偏差 | 状态 |
|---|---|---|---|---|
| 1 | 后端 **97** .py | **112** .py（含 tests） | +15 | ❌ 过时 |
| 2 | 前端 **89** ts/tsx | **96** ts/tsx（含测试） | +7 | ❌ 过时 |
| 3 | **12** 个测试文件 | **12**（7 后端 + 5 前端） | 0 | ✅ 准确 |
| 4 | **24** 个 API 路由 | **27** 路由模块（+ __init__.py） | +3 | ❌ 过时 |
| 5 | **13** 个 ORM 模型 | **15** 模型模块（+ __init__.py） | +2 | ❌ 过时 |
| 6 | **20** 个业务服务 | **25** 服务模块（+ __init__.py） | +5 | ❌ 过时 |
| 7 | **20** 个页面 | **32** 页面 | +12 | ❌ 严重过时 |
| 8 | **25** 个组件 | **28** 组件（不含 edges/ 子目录） | +3 | ❌ 过时 |
| 9 | **9** 个 Zustand Store | **11** Store | +2 | ❌ 过时 |
| 10 | **13** 种连线策略 | **13** 种（yaml_schema.py enum 验证） | 0 | ✅ 准确 |

**准确率：2/10（20%）**

---

## README 遗漏的新模块

### 后端路由（+4）
| 路由 | 端点数 | 功能 |
|---|---|---|
| `alerts_api.py` | 4 | 告警管理 |
| `control_plane_api.py` | 7 | Agent 控制面 |
| `domain_api.py` | 9 | 域管理 |
| `gateway_api.py` | 2 | 网关管理 |

### 后端模型（+3）
| 模型 | 对应表 |
|---|---|
| `agent_probe.py` | `agent_probes` |
| `domain.py` | `domains` |
| `scheduler_queue.py` | `scheduler_queue`, `scheduling_queue` |

### 后端服务（+6）
| 服务 | 职责 |
|---|---|
| `agent_probe_service.py` | Agent 探针 |
| `alert_service.py` | 告警 |
| `host_metrics.py` | 主机指标 |
| `k8s_routing_service.py` | K8s 路由 |
| `llm_providers.py` | LLM 提供商 |
| `scheduler_service.py` | 调度 |

### 前端页面（+12）
| 页面 | 功能 |
|---|---|
| `AgentControlPlane.tsx` | Agent 控制面 |
| `AlertsPage.tsx` | 告警页 |
| `SpecsEditor.tsx` | Specs 编辑器 |
| `TemplateMarket.tsx` | 模板市场 |
| `ToolDetail.tsx` | 工具详情 |
| `ToolMarket.tsx` | 工具市场 |
| `UserCenter.tsx` | 用户中心 |
| `UserManagement.tsx` | 用户管理 |
| `WorkflowCreate.tsx` | 工作流创建 |
| `WorkflowDetail.tsx` | 工作流详情 |
| `WorkflowEditor.tsx` | 工作流编辑器 |
| `WorkflowList.tsx` | 工作流列表 |

### 前端组件（+3）
| 组件 | 功能 |
|---|---|
| `AgentProbePanel.tsx` | Agent 探针面板 |
| `ReconcileConsole.tsx` | Reconcile 控制台 |
| `SchedulerConfig.tsx` | 调度配置 |

### Zustand Store（+2）
| Store | 职责 |
|---|---|
| `controlPlane.ts` | 控制面状态 |
| `domains.ts` | 域管理状态 |

---

## 端点总数

README 列出 28 个端点（速查表），实际端点总数 **153**（grep 精确计数）。README 速查表也遗漏了 `alerts`、`control-plane`、`domains`、`gateway` 相关的端点。

---

## 数据库

README 未声明数据库表数量。实际 SQLite 数据库包含 **21 张表**。

---

## 建议

1. **立即修正**：用实际扫描数字更新 README.md 中「代码规模」行（97→112, 89→96）
2. **结构更新**：补充 4 个新路由、3 个新模型、6 个新服务、12 个新页面、3 个新组件、2 个新 Store
3. **端点速查表**：补充 alerts/control-plane/domains/gateway 端点
4. **架构图**：更新项目结构树

---

*报告生成：2026-07-06 · I-intel-scan*
