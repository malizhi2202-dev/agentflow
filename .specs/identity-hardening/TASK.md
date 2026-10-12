# TASK · identity-hardening（波次）

> **⛔ 冻结（裁定⑧ 2026-09-23「不要进入开发阶段」）——未执行任何 T，零代码改动。解冻词=「进入开发」。**
W1: **T01** 依赖+配置面（requirements argon2-cffi；config 6 项+启动校验）[S]
W2(∥): **T02** auth.py 口令引擎+自愈删除+首启引导+_migrate_users [M] ｜ **T03** models/session.py 双表+auth_service（签发/解析/旋转/吊销/PAT/节流）[M]
W3: **T04** main.py 中间件重写（凭证链+active+闸门三值+XFF+health 豁免+CORS 序+uvicorn 参数）+ 6 路由 `_user()` 收编 + cron 直调 [M]
W4(∥): **T05** auth_api 端点群（login 签发/me/logout/sessions/tokens CRUD/list 收口/泛化 401/must_change 403 门）[M] ｜ **T06** 前端（去注入器/credentials//me 真相源/改密弹窗/123456 清零）[M]
W5: **T07** 测试断言反转+新增 5 类用例跑通 + README/CLAUDE.md 同步 + 需求门→dev 全量回归 [S]
gate: 全 T <auto>true</auto>（范围无 `<auto>false</auto>`——无破坏性 git 历史操作；**每波完成即 checkpoint，提交前停一次人审**）；依赖序 T01→{T02,T03}→T04→{T05,T06}→T07。
设计门票形（4 角色）：安✅研✅架✅测✅ 4/4——无未决分歧（设计空间被 AC 锁死）。
