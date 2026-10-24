# REQUIREMENT: 记忆中心与提案抽屉

- **Change ID**: v20-ui-rsi · 上游 `CHANGE.md`（G1 4/4）

## 用户故事

1. 作为平台管理员，我要看记忆四层都有什么、哪些是 `confounded`/`no_entry`，并知道为什么。
2. 作为管理员，我要能写一条记忆（cue/lesson/evidence），并立刻看到它是否入库或 `no_entry`。
3. 作为管理员，我要能按来源撤回（检疫）与看待衰减候选，避免库烂掉。
4. 作为管理员，我要能一键暂停某类自动体（开关）并在熔断后复位。
5. 作为管理员，我要能推进提案：录探针 → 录影子重放 → 领域会签 → 人批发布。
6. 作为普通用户，我不该能发布提案（按钮置灰并说明原因）。

## AC

| AC | 判据 |
|---|---|
| AC-1 | 侧栏出现「记忆中心」；页面双 tab（记忆 / 提案）；`project:read` 权限壳 |
| AC-2 | 记忆列表：按 layer/status 筛选、显示 cue/lesson/status/confounded/source_seq/pollution 标记；空态文案 |
| AC-3 | 写入：三字段任一为空 → 提交后显示 `no_entry` 与缺字段；三字段齐 + 有把握 → `promoted` |
| AC-4 | 因果前缀：`cites_seq >= source_seq` 时显示后端 409 文案 |
| AC-5 | 晋升评审台：点记忆行查看 `promotion_reviews`（verdict / fields_complete / causal / pollution / reviewer） |
| AC-6 | 检疫：输入 `source_ref` 批量检疫并显示条数；衰减队列按天数列出候选（只列不删） |
| AC-7 | 治理区：四类开关可切换（非管理员 403 文案可见）；四熔断显示状态 + 复位（trip 也提供，需填原因） |
| AC-8 | 提案列表：显示 title/dimension/status/预算与已用；空态文案 |
| AC-9 | 提案动作按状态裁剪：`generated` 只给探针；`probed` 给影子；`awaiting_approval` 给人批发布；`domain` 维需会签；其它状态给说明 |
| AC-10 | 探针/影子录入表单：探针含 steps/tokens；影子含 judge/golden_set_frozen/cross_vendor/pass_rate/baseline，缺金标或异厂 → 409 文案 |
| AC-11 | 发布：仅管理员可点（非管理员置灰 + title 原因）；必须二次确认；成功后状态变 published |
| AC-12 | 质量门：`tsc` 0、`vitest` 全绿（既有 74 + 新增）、`build` 绿、零新增依赖 |

## 范围切分

- **v1**：AC-1…AC-12。
- **v2**：surface 新建表单（管理员）、记忆检索（语义）、提案 diff 展示、影子历史对比。
- **out**：执行器（跑批/judge）、记忆编辑/删除、提案 Apply 执行。

## NFR

- 安全：发布二次确认 + 管理员门（后端仍拦）；错误文案透传；不缓存凭据。
- 性能：切换 tab 才拉对应数据；评审账按记忆按需拉。
- 无障碍：label/aria/role=alert|status；折叠区 aria-expanded；发布确认可键盘。

## 依赖与假设

- 依赖 `/api/rsi/*`（波 6/7）与 `requestDedup` 读写分工。
- 假设：`surfaces` 列表已由管理员建好（本波不建）。
- 假设：开关/熔断写操作限管理员（后端 `is_admin`），前端只按 AC-11 对发布置灰。

## 🛡️ 需求门（自评轮）

```
🟫 ✅ AC 全部可验证 | 🟦 ✅（保留：治理区折叠） | 🟩 ✅ 不改后端/无迁移 | 🔴 ✅ 发布门 + 二次确认 + 文案透传
结果: 4/4 → 通过，进入 2-design
```
