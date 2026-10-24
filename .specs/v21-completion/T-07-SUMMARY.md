# T-07 · `users.json` / `audit.jsonl` 表化（裁定⑦收尾）—— 完成

- **Change**: v21-completion · 2026-10-24
- **结论**：迁移 `018_users_and_audit_tables` 建 `app_users` + `audit_log`；用户档案与审计的**权威源切到表**，
  文件态降级为「导入源 / 本地兜底」。在真实 MySQL 上验证：**删掉 `users.json` 后整条 E2E 仍 23/23 全绿**。

## 口径（不静默回退）

| 数据 | 旧 | 新 |
|---|---|---|
| 用户档案 | `users.json`（文件锁 + 备份） | **表非空 → 表是权威源**（登录/权限/用户管理都读表；保存写表）<br>表空 → 迁移期退回 `users.json`（行为与旧版一致，导入后表恒非空） |
| 审计 | `audit.jsonl` 追加 | **写表 `audit_log`**（同时保留 jsonl 一份，便于离线排查/导出）；`GET /api/audit` 以表为准，表化前的历史行从文件补入并去重 |
| 口令 | 哈希存文件 | 哈希存表；导入脚本**原样搬运**，不重算、不改写 |

判定只看「表里有没有行」——不逐字段合并、不猜，避免双源分叉。

## 交付物

- `backend/models/user.py`：`AppUser` / `AuditLog`（`project_ids`、`custom_permissions` 以 JSON 存，SQLite/MySQL 通用）。
- `backend/migrations.py`：`m018_users_and_audit_tables`（建两表 + 三个索引）。
- `backend/services/user_store.py`：`available/load_all/get/upsert/replace_all/import_from_json`。
- `backend/auth.py`：`load_users`/`_save_users` 走表；`write_audit` 收敛为**单一写入器**（委托 `audit_service.log_audit`）；
  `read_audit` 表优先 + 文件历史合并去重（历史不丢）。
- `backend/services/audit_service.py`：`_write_db`（失败不阻断业务）+ `read_rows`。
- `backend/scripts/import_users_to_db.py`：默认 dry-run，`--apply` 整表对齐（upsert + 删除多余），可重复执行。

## 实测证据

```text
# 1) 真实 MySQL 上应用 018（幂等）
$ python - <<'PY' ... apply_migrations(raw_conn, "mysql") ... PY
applied: ['018_users_and_audit_tables']
pending: []
app_users cols: id name role password_hash must_change_password project_ids custom_permissions active created_at updated_at
audit_log cols: id timestamp user_id user_name action target target_type detail ip result

# 2) 导入脚本（dry-run → apply → 再 apply 幂等）
[import-users] 文件内用户 2 条；导入前表已启用=False
[import-users] dry-run：未写库（加 --apply 执行）
[import-users] 已写入：upserted=2 deleted=0
[import-users] 已写入：upserted=2 deleted=0        （第二次仍 2/0，不重复不删除）

# 3) 把 users.json 移走，重启后端 —— 仍能登录（证明读表）
login(no users.json)=200

# 4) 表化后的完整 E2E（hermes 通道；users.json 全程不在）
SUMMARY 23/23 passed

# 5) 库内实际数据
audit_rows=7（auth:login ×3、rsi.breaker.trip/reset、scheduled_task.create、rsi:switch）
app_users: admin(admin) / bob(member)
```

```text
$ backend: unittest discover -s tests
Ran 523 tests in 113.483s      （T-06 基线 510 → +13：迁移 1 + 用户存储/鉴权 8 + 审计 3 + 真实登录 1）
OK (skipped=6)
```

## 说明与边界

- **dsh CLI 本轮不可用**：`dsh: NO_ADAPTER: no adapter registered for provider "local-anthropic"`
  （外部 CLI 的模型路由配置问题，与本仓代码无关），因此第 4 步改用 **hermes** 通道；
  dsh 通道在 T-04/T-06 已各有一轮 13/13、23/23 的绿的证据。
- 文件态没有删除：`users.json` 仍是「没有表时的兜底 / 导入样例」，`audit.jsonl` 仍是本地可 grep 的副本。
  这不是双写权威——读路径以表为准，文件不再被查询。
- 用户表化后 `_save_users` 不再写文件；因此 `--file` 导入需在表为空时先跑（脚本已按此顺序提示）。
