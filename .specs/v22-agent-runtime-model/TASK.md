# TASK: 创建 Agent 不再选模型 Provider / API Key

- **Change ID**: `v22-agent-runtime-model`
- **关联**: `@.specs/v22-agent-runtime-model/{CHANGE,TEST,REVIEW}.md`

---

## 任务清单

```xml
<task id="T01" parallel="false" status="done">
  <name>后端：创建/更新不再收 api_key，provider 由运行时推导；cli 通道跟随 runtime</name>
  <write_files>
    <backend/routes/agents_api.py>
    <backend/services/llm_providers.py>
    <backend/services/cli_provider.py>
    <backend/services/chat_service.py>
    <backend/tests/test_agent_model_from_runtime.py>
  </write_files>
  <action>
    api_create_agent：去掉 api_key 读取与 encrypt()，api_key_encrypted 落空串；
    provider 走 `_checked_provider(runtime, payload.model_provider)`（未传→按运行时推导：CLI 运行时=cli，其余=openai；
    显式传入仍校验，非法 400）。api_update_agent：显式 provider 优先；否则**仅在 runtime 变化时**跟随推导；
    去掉 api_key 写入分支。
    llm_providers.get_provider(name, runtime=None)：cli 通道按 runtime 选 CLI；runtime 不在 CLI_KINDS 即 ValueError。
    cli_provider 增加 CLI_KINDS 单一事实源。chat_service 两处调用都传 agent.runtime。
  </action>
  <verify>cd backend &amp;&amp; /tmp/afvenv2/bin/python -m unittest tests.test_agent_model_from_runtime -v</verify>
  <done>11 条用例全绿（MF-01..MF-11）</done>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="done">
  <name>前端：运行时 + 模型区块（模型目录来自运行时，删 Provider / API Key）</name>
  <write_files>
    <frontend/src/stores/runtimeRegistry.ts>
    <frontend/src/pages/AgentDetail.tsx>
    <frontend/src/pages/AgentBuilder.tsx>
    <frontend/src/__tests__/agent-model-from-runtime.test.tsx>
  </write_files>
  <action>
    新 store：GET /api/runtimes 只读 + uniqueRuntimesByCli（在线优先）+ modelsForRuntime / modelsErrorForRuntime。
    AgentDetail：删 Provider / API Key 两个字段；运行时下拉来自已发现运行时（离线 disabled）；
    模型下拉 = 该运行时 models（可留空=运行时默认；models_error 显式提示；⟳ 刷新）；
    新建时默认第一个在线运行时；切换运行时清空失效模型并把 model_provider 置 undefined（让服务端重推）。
    AgentBuilder：新建不复用旧默认值；卡片模型为空显示「随运行时默认」。
  </action>
  <verify>cd frontend &amp;&amp; npx vitest run src/__tests__/agent-model-from-runtime.test.tsx</verify>
  <done>AG-01..AG-07 全绿</done>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="done">
  <name>daemon：模型目录真能读到（不再恒空）</name>
  <write_files>
    <scripts/runtime-daemon.py>
    <backend/tests/test_runtime_daemon.py>
  </write_files>
  <action>
    `--list-models` 仍优先；失败时读运行时自己的模型来源兜底：
    hermes（~/.hermes/provider_models_cache.json + hermes config show 的默认 provider）、
    dsh（--profile &lt;平台执行模板同一 profile&gt; --dump-config 里 agent-default-model 的 provider/model）。
    模型 id 统一 `provider/model`；两条路都读不到才写 models_error。解析逻辑做成纯函数并单测。
  </action>
  <verify>python scripts/runtime-daemon.py --once --dry-run</verify>
  <done>dry-run 里 hermes / dsh 的 models 非空、models_error 不再出现</done>
  <auto>true</auto>
</task>

<task id="T04" parallel="false" status="done">
  <name>门禁 + 工件（TEST / REVIEW / STATE）</name>
  <write_files>
    <.specs/v22-agent-runtime-model/TEST.md>
    <.specs/v22-agent-runtime-model/REVIEW.md>
    <STATE.md>
  </write_files>
  <action>
    tsc --noEmit / vitest run / npm run build / 后端相关单测全跑；数字与输出原样贴 TEST.md；
    REVIEW 记「发现但不在本 change 范围内」的缺陷（chat_service._generate 无生产调用点等）。
  </action>
  <verify>cd frontend &amp;&amp; npx tsc --noEmit &amp;&amp; npx vitest run &amp;&amp; timeout 300 npm run build</verify>
  <done>各门 exit 0；TEST.md 贴真实输出；真链路（真 MySQL + 真 CLI）另见 TEST.md §4b</done>
  <auto>true</auto>
</task>
```

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| — | — | — | — |
