# ③ 结论与建议

## 结论

**AgentFlow 缺的不是「协作功能」，而是「协作的记录对象」。**
它已经有两半：一半是管控面（Agent / 编排 / 探针 / 调和），一半是知识产物（`.specs/<change-id>/`），
**但两半之间没有 join key**——`conversations`/`messages` 不引用 `change_id`，于是 Agent 的执行史
与产物的交付史各自独立，谁都回答不了「这件事为什么变成现在这样」。

因此建议的主线不是「加一个看板」，而是：**引入工作项实体，并让 `change_id` 成为它与知识产物之间的键。**

## 建议（按优先级）

### C1 · 引入 `work_items` 一等实体 `P1` 难度：高
最小字段集：
`id / project_id / change_id / title / description / status / status_category /
assignee_type(user|agent) / assignee_id / created_by / parent_id / created_at / updated_at`

- `change_id` **可空但唯一**，指向 `.specs/<change-id>/`——这是打通运行史与产物史的关键一列。
- `status_category` ∈ {`unstarted`,`started`,`done`,`closed`}，与 `status` **分列**（吸收 Multica 的四类模型，
  使自定义状态不破坏聚合统计）。

### C2 · 状态与触发严格分列，门禁落在状态转换层 `P1` 难度：中
- 表结构上：`status` 只表达语义；触发规则**不进状态列**。
- 服务端显式校验「**动作者类型 × 目标状态**」：例如 **Agent actor 不得自行置 `done`**。
- **明确拒绝**把门禁写成注入给 Agent 的提示词——Multica 的 `done` 门就是这个反例（其 handler/service 层零校验）。

### C3 · `work_item_events` 时间线（不可变追加） `P1` 难度：中
记录 创建 / 状态变更 / 负责人变更 / 评论 / 关联产物变更 / 决议。
这是「历史不随会话结束而消失」的物理载体，也是 §6.20 看板与 §6.22 回放的数据源。

### C4 · 收件箱：只在需要人拍板时通知 `P1` 难度：低
与现有「告警中心」明确分工：**告警中心 = 系统异常（30 秒巡检）；收件箱 = 需要人决策的工作流节点**。
聚合项：受阻待决 / 待验收 / `dangerous` 级调和待批。

### C5 · 团队级对象（Squad）登记为议题，不在本轮 `P2` 难度：中
路线图 W-2。需先有 C1–C4 才能谈编队与 leader 路由。

## 明确不做（本轮）

- 不把 `conversations` 改造成工作项（方案 A，语义错位）。
- 不用 `.specs` 文件系统充当工作项（方案 C，无法承载状态/并发/审计）。
- 不引入完整工作流引擎——Multica 明确写「This is not a workflow engine」，AgentFlow 也不该在这里变成 BPM。

## 与路线图的对应

本结论 = 产品文档 §1.6 **P1-4**（协作层最小集）+ §1.6.5 纪律①（提示词契约 ≠ 门禁）+ 空白 **W-2**（Team 一等对象）。
目标形态原型见产品文档 **§6.20（工作项看板）**、**§6.21（收件箱）**、**§6.22（执行回放）**。
