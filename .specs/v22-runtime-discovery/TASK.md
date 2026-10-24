# TASK: 运行时发现（daemon 多机版）

- **Change ID**: `v22-runtime-discovery`
- **关联**: `@.specs/v22-runtime-discovery/{CHANGE,REQUIREMENT,DESIGN,UI-DESIGN}.md`

---

## 波次划分

```
Wave 1: T01（迁移 + ORM + 服务层 + 单测）
Wave 2: T02（daemon 上报端点 + 鉴权/白名单 + 单测）      ← depends T01
        T03（daemon 脚本 + systemd 模板 + 本机实跑留证）  ← depends T02
Wave 3: T04（前端 store + 页面区块 + 用例）              ← depends T02
Wave 4: T05（全量门 + 浏览器实测 + REVIEW + STATE）
```

---

## 任务清单

```xml
<task id="T01" parallel="false" status="pending">
  <name>迁移 019 + runtime_registry ORM + 服务层（upsert/list/visibility/offline/bound_agents）</name>
  <read_files>
    <backend/migrations.py>
    <backend/models/user.py>
    <backend/services/user_store.py>
    <backend/models/agent.py>
  </read_files>
  <write_files>
    <backend/migrations.py>
    <backend/models/runtime_registry.py>
    <backend/services/runtime_registry.py>
    <backend/tests/test_runtime_registry.py>
  </write_files>
  <action>
    按 DESIGN D1/D4/D5/D6/D7/D9 落地：唯一键 (machine_id, cli, protocol_family) 幂等 upsert；
    status 在读侧按 RUNTIME_OFFLINE_AFTER_SECONDS(180) 计算，不落列；models/models_error 分列；
    list_runtimes(owner_id) 返回本人全部 + 任何 public，并附 bound_agents（agents.runtime==cli 计数）；
    set_visibility 服务层单点判定，非 owner 抛 NotFound（404 口径）。
  </action>
  <verify>cd backend &amp;&amp; python -m unittest tests.test_runtime_registry</verify>
  <done>迁移 up/down 幂等；AC-1/AC-3/AC-4/AC-5/AC-6/AC-9 的服务层断言全绿</done>
  <depends_on></depends_on>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="pending">
  <name>daemon 上报端点 + /api/runtimes + 可见性端点（鉴权 fail-closed + 字段白名单）</name>
  <read_files>
    <backend/main.py>
    <backend/routes/teams_api.py>
    <backend/services/deploy_guard.py>
    <backend/auth.py>
  </read_files>
  <write_files>
    <backend/routes/daemon_api.py>
    <backend/routes/runtimes_api.py>
    <backend/main.py>
    <backend/config.py>
    <backend/tests/test_runtime_registry.py>
  </write_files>
  <action>
    POST /api/daemon/report：X-Daemon-Token 与 AF_DAEMON_TOKEN hmac 比较；未配置 → 503，不符 → 401；
    只取白名单键（token/api_key/password/account 等一律忽略，AC-7）；幂等 upsert 后返回 registered 数。
    GET /api/runtimes：会话鉴权，返回 mine + public（AC-4）。
    PUT /api/runtimes/{id}/visibility：{public:bool}，服务层判定，非 owner 404。
  </action>
  <verify>cd backend &amp;&amp; python -m unittest tests.test_runtime_registry</verify>
  <done>AC-1/AC-2/AC-4/AC-7/AC-8 端点级断言全绿</done>
  <depends_on>T01</depends_on>
  <auto>true</auto>
</task>

<task id="T03" parallel="false" status="pending">
  <name>daemon 脚本 + systemd 单元模板 + 本机实跑留证</name>
  <read_files>
    <deploy/systemd/user/agentflow-backend.service.in>
    <scripts/serve_lan.sh>
    <backend/config.py>
  </read_files>
  <write_files>
    <scripts/runtime-daemon.py>
    <deploy/systemd/user/af-runtime-daemon.service.in>
    <README.md>
  </write_files>
  <action>
    探测三来源（env 覆盖 → PATH → 已知路径，含 node &lt;js&gt; 形态）；machine_id 落 ~/.agentflow/daemon.json 复用；
    --version / --list-models 带 timeout（8s），失败写 models_error；模型目录本地缓存 10min；
    15s 上报 + 指数退避封顶；只上报路径/版本/模型名，不上报凭据。
  </action>
  <verify>python scripts/runtime-daemon.py --once --dry-run</verify>
  <done>本机输出含 hermes(0.18.0) 与 dsh(0.1.3-alpha.2) 两行；--once 实报后注册表 2 行</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>

<task id="T04" parallel="false" status="pending">
  <name>前端：「执行环境 · 自动发现」区（store + 页面 + 用例）</name>
  <read_files>
    <frontend/src/pages/Runtimes.tsx>
    <frontend/src/stores/runtimes.ts>
    <frontend/src/utils/requestDedup.ts>
    <frontend/src/__tests__/automations-runtimes-replay.test.tsx>
  </read_files>
  <write_files>
    <frontend/src/stores/runtimes.ts>
    <frontend/src/pages/Runtimes.tsx>
    <frontend/src/__tests__/runtime-discovery.test.tsx>
  </write_files>
  <action>
    按 UI-DESIGN：区块 + 6 列表格 + 状态矩阵 + 空态给动作 + 可见性按钮（仅 mine）+ 刷新；
    store 加 fetchRegistry / setVisibility 动作，沿用 safeFetch 与既有错误透传口径。
  </action>
  <verify>cd frontend &amp;&amp; npx vitest run src/__tests__/runtime-discovery.test.tsx</verify>
  <done>AC-9 用例全绿（有记录 / 空态 / 离线 / 不可读 / 置公开）</done>
  <depends_on>T02</depends_on>
  <auto>true</auto>
</task>

<task id="T05" parallel="false" status="pending">
  <name>全量门 + 浏览器实测 + 6-review + STATE</name>
  <read_files>
    <scripts/ci.sh>
    <frontend/package.json>
  </read_files>
  <write_files>
    <.specs/v22-runtime-discovery/TEST.md>
    <.specs/v22-runtime-discovery/REVIEW.md>
    <STATE.md>
  </write_files>
  <action>
    backend 全量 unittest + frontend tsc/vitest/build；无头浏览器实测「执行环境」区（有 daemon 数据的在线行 + 停 daemon 后的离线行）；
    落 TEST.md（功能轮 + 五轮登记）、REVIEW.md、STATE.md。
  </action>
  <verify>bash scripts/ci.sh</verify>
  <done>四道门全绿；浏览器实测有输出；工件齐</done>
  <depends_on>T01,T02,T03,T04</depends_on>
  <auto>true</auto>
</task>
```

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| — | — | — | — |
