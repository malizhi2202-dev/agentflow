# CHANGE · identity-hardening（身份三连修复 P0-1/2/3）

> 状态: 已立项 · 2026-09-23 · 依据=用户指令「1，2，3，4」之 ② + ROADMAP §五裁定 #4「接受」+ v8 已审 P0-1/2/3（参数级修法）

## 1 Why
认证三层 fail-open（X-User-Id 缺省 admin / get_current_user+凭空 _default_admin / 6 路由 _user() 字面量）；localhost 闸门无 XFF/可信代理处理且反代后大门敞开；无盐 sha256+出厂 123456+「缺 hash 自愈重置」分支。**公开仓库+README 教 --host 0.0.0.0 = 组合风险已外溢**（§五 #6 裁定）。

## 2 What
P0-1 身份改服务端凭证交换（session cookie+PAT 双轨，debug header 三重 opt-in）；P0-2 口令 argon2id+废出厂+删自愈+首启引导+混存渐进迁移；P0-3 DEPLOY_MODE 三值+可信代理显式化+health 豁免+CORS 提最外。工作量 ≈2d/1.5d/0.5d（v8 已审档）。

## 3 边界
做：backend 认证/口令/中间件/配置 + 前端去 localStorage 注头改 cookie 凭证 + 测试断言反转。**不做**：RBAC 扩面（另 change）、A2A M1（§1.6.5 ⑬ 闸=本 change 完成才开）、git 历史重写（扫描结论：无泄露，不需要）。〔裁定⑦修正〕sessions/PAT/users 全部 MySQL 建表，users.json 经迁移进 users 表后退役。〔裁定⑧〕**冻结于 3-task，未进入 4-dev，零代码改动**。追加候选 AC（随扫描）：encryption_service KDF 修复。
迁移双数据面分开：sessions 表走 SQLite（SessionLocal），口令迁移=重写 users.json（幂等脚本+5 份既有备份回滚）。

## 4 影响面
`main.py:193-212`（中间件重写）、`auth.py`（哈希/加载/自愈分支）、`auth_api.py`（login/logout/tokens/me）、6 路由 `_user()` 收编 `Depends(current_user)`、`config.py`（AUTH_DEBUG_HEADER_*/DEPLOY_MODE/TRUSTED_PROXY_IPS）、`frontend/src/main.tsx:11-21`+`stores/auth.ts`（凭证形态）、`tests/test_api_integration.py:269` 断言反转+开关对照用例。行为破坏性：无凭证 401（用户裁定 #4=接受，脚本走 debug header/PAT）。

## 5 门禁记录
0-change 门：方向已由用户原话（裁定#4）+v8 过审背书，范围无歧义 → 立项直通；1-requirement 见 REQUIREMENT.md 专家门记录。
