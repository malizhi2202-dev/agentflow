# TASK: multica → agentflow 迁移（技能含文件包 / Agent / 小队）

- **Change ID**: `v23-multica-import`

---

## 任务清单

```xml
<task id="T01" parallel="false" status="done">
  <name>schema：files_json 两段迁移（020 建列 / 021 MySQL 拓宽 MEDIUMTEXT）</name>
  <write_files><backend/migrations.py></write_files>
  <action>020 add_column_if_missing(tools, files_json, TEXT)；021 仅 MySQL 且当前列类型非 mediumtext/longtext 时 MODIFY。</action>
  <verify>cd backend &amp;&amp; DATABASE_URL=mysql+pymysql://root@127.0.0.1:3307/agentflow python -c "from database import init_db; init_db()"</verify>
  <done>信息模式 column_type=mediumtext；二次执行幂等</done>
  <auto>true</auto>
</task>

<task id="T02" parallel="false" status="done">
  <name>后端：Tool.files_json + 校验 + content_md 落库 + 列表/详情载荷分离</name>
  <write_files>
    <backend/models/tool.py>
    <backend/services/tool_service.py>
    <backend/routes/tools_api.py>
    <backend/services/agent_channel.py>
    <backend/routes/agents_api.py>
    <backend/tests/test_tool_skill_files.py>
  </write_files>
  <action>normalize_files_json 单点校验（path 唯一、≤200、≤2MB）；create/update 落 content_md+files_json；
  非法 400；to_dict(with_files=False) 让列表只返回 files_count；provider 推导抽到 services/agent_channel（导入脚本共用同一口径）。</action>
  <verify>cd backend &amp;&amp; python -m unittest tests.test_tool_skill_files</verify>
  <done>14 条用例全绿（TF-01..TF-14）</done>
  <auto>true</auto>
</task>

<task id="T03" parallel="true" status="done">
  <name>前端：ToolDetail 技能文件区 + ToolMarket 文件数</name>
  <write_files>
    <frontend/src/pages/ToolDetail.tsx>
    <frontend/src/pages/ToolMarket.tsx>
    <frontend/src/__tests__/tool-skill-files.test.tsx>
  </write_files>
  <action>详情按 id 拉 files_json；path + 正文可编辑、增删、保存前预校验；列表卡片用 files_count。</action>
  <verify>cd frontend &amp;&amp; npx vitest run src/__tests__/tool-skill-files.test.tsx</verify>
  <done>TS-01..TS-09 全绿</done>
  <auto>true</auto>
</task>

<task id="T04" parallel="false" status="done">
  <name>导入脚本 + 映射单测 + 真跑迁移</name>
  <write_files><scripts/import_multica.py><backend/tests/test_import_multica.py></write_files>
  <action>psql --csv 读源；ORM 写目标；dry-run 默认 / --apply / --update；幂等；告警不静默。</action>
  <verify>python scripts/import_multica.py --apply</verify>
  <done>30 技能 / 38 Agent / 2 小队 / 34 成员入库；二次 --apply 全 skip；逐字节回读一致</done>
  <auto>true</auto>
</task>

<task id="T05" parallel="false" status="done">
  <name>门禁 + 浏览器点检 + 工件（TEST / REVIEW / STATE）</name>
  <write_files>
    <.specs/v23-multica-import/TEST.md>
    <.specs/v23-multica-import/REVIEW.md>
    <STATE.md>
  </write_files>
  <action>tsc / vitest / build / 后端相关单测；无头浏览器点开一个技能看「技能文件」区；数字原样贴 TEST.md。</action>
  <verify>cd frontend &amp;&amp; npx tsc --noEmit &amp;&amp; npx vitest run &amp;&amp; npm run build</verify>
  <done>各门 exit 0；实测输出落 TEST.md</done>
  <auto>true</auto>
</task>
```

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
| — | — | — | — |
