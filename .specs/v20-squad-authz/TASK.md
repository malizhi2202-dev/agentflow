# TASK: 小队写操作授权

- **Change ID**: v20-squad-authz
- **关联**: `REQUIREMENT.md` · `DESIGN.md`

## 波次划分

```
Wave 1: T01（服务层判定）
Wave 2: T02（路由接线 + 错误映射）
Wave 3: T03（用例 + 全量回归）
```

## 任务清单

```xml
<task id="T01" parallel="false" status="pending">
  <name>服务层加 SquadForbidden + assert_can_manage_squad</name>
  <read_files>
    <backend/services/team_service.py>
    <backend/models/teams.py（Squad.created_by / _is_admin）>
  </read_files>
  <write_files>
    <backend/services/team_service.py>
  </write_files>
  <action>
    新增异常 SquadForbidden（不继承 TeamError，避免被映射成 400）；新增
    assert_can_manage_squad(db, squad, user)：created_by == user["id"] 或 _is_admin(user) 放行，
    否则 raise SquadForbidden("只有小队创建者或平台管理员可以修改该小队")。
  </action>
  <verify>cd backend && python -c "import services.team_service"</verify>
  <done>AC-1 / AC-2 / AC-3（判定部分）</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="pending">
  <name>路由 5 个写端点接入判定 + 403 映射</name>
  <read_files>
    <backend/routes/teams_api.py>
  </read_files>
  <write_files>
    <backend/routes/teams_api.py>
  </write_files>
  <action>
    _map_error 追加 SquadForbidden → 403；在 add_squad_member / remove_squad_member /
    archive_squad / assign_squad 四处（加成员、移成员、归档、指派）调用
    ts.assert_can_manage_squad；GET 两处不动。create_squad 不校验（任何登录用户可建）。
  </action>
  <verify>cd backend && python -c "import routes.teams_api"</verify>
  <done>AC-3 / AC-4</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="false" status="pending">
  <name>用例 + 全量回归</name>
  <read_files>
    <backend/tests/test_teams.py（夹具与风格）>
    <backend/tests/test_collab.py（真实 app + 登录 harness）>
  </read_files>
  <write_files>
    <backend/tests/test_squad_authz.py>
  </write_files>
  <action>
    服务层用例：creator 通过 / 非 creator 成员被拒（异常类型 + 文案）/ 平台管理员通过 /
    空 created_by 只有管理员可过。
    路由用例：用真实 app + 登录（alice=admin, bob=member），bob 改 alice 建的小队 → 403 + detail；
    GET /api/squads 对 bob 仍 200。
  </action>
  <verify>cd backend && /tmp/afvenv2/bin/python -m unittest tests.test_squad_authz tests.test_teams -v</verify>
  <done>AC-1…AC-4 · AC-5（同批再跑全量）</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>
```

## Task 门（自评轮）

| task | 研发负责人 | 资深测试工程师 | 安全审计师 | 结论 | `<auto>` |
|---|---|---|---|---|---|
| T01 服务层 | ✅ 10 行判定 | ✅ 4 类用例可断 | ✅ 唯一真源 | 3/3 | `true` |
| T02 路由接线 | ✅ 5 处、无重构 | ✅ 403 可断 | ✅ 读不动 | 3/3 | `true` |
| T03 用例 | ✅ 不改夹具 | ✅ 覆盖 4 角色 | ✅ 拒绝路径可复现 | 3/3 | `true` |

## 状态字段说明 / 阻塞日志 / Fix 任务

status：pending → in_progress → done。阻塞日志空；Fix 任务由 REVIEW 追加。
