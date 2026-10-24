/**
 * Agent 详情「编辑」标签 = 原型 16 分区配置页（change: ui-parity · P3-2）
 *
 * 为什么把 16 个分区收在一个容器里：保存必须是**一次**提交（常规字段 + 三块运行时配置一起 PUT），
 * 而 env / CLI / MCP 三块是受控编辑态（掩码哨兵、一行一项、JSON 整体替换），状态只有放在
 * 提交者这一层才拿得到；分区组件保持纯展示 + 上抛补丁，避免十六个分区各自持有一份可写状态。
 *
 * 未接入的一律显式标注（`<Unwired>`），不塞示例数据 —— 判据是「后端有没有这一列 + PUT 收不收」，
 * 见 `.specs/ui-parity/P3-agent-config.md` 的字段对照表。
 */
import { useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { AnchorBar } from './Section';
import {
  envRowsFromEnv, envPayloadFromRows, cliArgsFromList, cliArgsPayload,
  mcpTextFrom, parseMcpText,
} from './model';
import type { EnvRow } from './model';
import { IdentitySection, DomainSection, AccessSection } from './BasicsSections';
import { PromptSection } from './PromptSections';
import { RuntimeSection, ExecutionSection, GateSection } from './RuntimeSections';
import { EnvVarsSection, CliArgsSection, McpSection } from './ConfigSections';
import { IntegrationsSection, SkillsSection, KnowledgeSection, OrchestrationSection } from './BindingSections';
import { ProbeSection, DangerSection } from './OpsSections';
import { ScheduledTasksSection } from './ExtraSections';

export interface AgentConfigEditorProps {
  agent: any;
  /** 常规字段（名称/描述/运行时/模型/token 上限/域/人设三件…）的期望态，由页面持有 */
  data: any;
  patch: (p: any) => void;
  onSave: (payload: any) => void;
  onDelete?: () => void;
  saveError?: string | null;
  workflows: any[];
}

/** 已存配置的三个来源：专用列优先，回落到 model_config_json 里同名块（两处都写，读时任意一处命中即可） */
function initialEnv(agent: any): EnvRow[] {
  const byColumn = agent && agent.custom_env;
  const byJson = agent && agent.model_config_json && agent.model_config_json.env_vars;
  return envRowsFromEnv(byColumn && Object.keys(byColumn).length ? byColumn : byJson);
}
function initialCli(agent: any): string[] {
  const byColumn = agent && agent.custom_args;
  const byJson = agent && agent.model_config_json && agent.model_config_json.cli_args;
  return cliArgsFromList(Array.isArray(byColumn) ? byColumn : byJson);
}
function initialMcp(agent: any): any {
  if (agent && agent.mcp_config !== undefined && agent.mcp_config !== null) return agent.mcp_config;
  const byJson = agent && agent.model_config_json && agent.model_config_json.mcp_servers;
  return byJson === undefined ? null : byJson;
}

export default function AgentConfigEditor({ agent, data, patch, onSave, onDelete, saveError, workflows }: AgentConfigEditorProps) {
  const isNew = !agent || !agent.id;
  const agentId: number | undefined = agent && agent.id ? agent.id : undefined;

  const [envRows, setEnvRows] = useState<EnvRow[]>(function () { return initialEnv(agent); });
  const [cliArgs, setCliArgs] = useState<string[]>(function () { return initialCli(agent); });
  const [mcpText, setMcpText] = useState<string>(function () { return mcpTextFrom(initialMcp(agent)); });
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /** 复位三块受控编辑态（「放弃改动」= 回到最近一次已存版本） */
  function resetBlocks() {
    setEnvRows(initialEnv(agent));
    setCliArgs(initialCli(agent));
    setMcpText(mcpTextFrom(initialMcp(agent)));
    setMcpError(null);
    setLocalError(null);
  }

  /**
   * 一次提交：常规字段 + `model_config_json` 三键（env_vars / cli_args / mcp_servers）一起 PUT。
   *
   * 双写口径（为什么要同时写专用列）：`PUT /api/agents/{id}` 的白名单里既有 `model_config_json`
   * 也有 `custom_env / custom_args / mcp_config`；前者是通用配置块（本次新增三键的落点），
   * 后者是 v23 迁移建的专用列（其它页面/后端服务读的是它）。只写一边会造成「本页可见、
   * 别处不生效」的假象，所以两边同源同值。详见 P3 的「双写口径」与遗留风险。
   */
  async function handleSave() {
    setLocalError(null);
    setSavedAt(null);
    const mcp = parseMcpText(mcpText);
    if (!mcp.ok) {
      // fail-closed：JSON 半截不提交，也不静默丢弃用户已写内容
      setMcpError(mcp.error);
      setLocalError('「8 · MCP 服务绑定」JSON 解析失败：' + mcp.error);
      return;
    }
    setMcpError(null);

    const originEnv = (agent && agent.custom_env && Object.keys(agent.custom_env).length)
      ? agent.custom_env
      : (agent && agent.model_config_json && agent.model_config_json.env_vars);
    const envObj = envPayloadFromRows(envRows, originEnv);
    const argsArr = cliArgsPayload(cliArgs);
    const baseJson = (agent && agent.model_config_json) || {};
    const modelConfigJson = Object.assign({}, baseJson, {
      env_vars: envObj,
      cli_args: argsArr,
      mcp_servers: mcp.value,
    });

    const payload: any = {
      name: data.name || '',
      description: data.description || '',
      runtime: data.runtime || '',
      model_name: data.model_name || '',
      system_prompt: data.system_prompt || '',
      role_def: data.role_def || '',
      sop: data.sop || '',
      token_soft_limit: data.token_soft_limit,
      token_hard_limit: data.token_hard_limit,
      domain_id: (data.domain_id === undefined || data.domain_id === '') ? null : data.domain_id,
      avatar_url: data.avatar_url || '',
      thinking_level: data.thinking_level || '',
      service_tier: data.service_tier || '',
      model_config_json: modelConfigJson,
      custom_env: envObj,
      custom_args: argsArr,
      mcp_config: mcp.value,
    };

    if (agentId) {
      setSaving(true);
      try {
        const res = await fetch('/api/agents/' + agentId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          // 后端 detail 原样透传（400「不支持的 runtime」/ 404 / 运行中不可删等），不改写成「保存失败」
          const body = await res.json().catch(function () { return { detail: '保存失败 (' + res.status + ')' }; });
          const detail = body && body.detail !== undefined ? body.detail : ('保存失败 (' + res.status + ')');
          setLocalError(typeof detail === 'string' ? detail : JSON.stringify(detail));
          return;
        }
      } catch (e: any) {
        setLocalError('保存失败（网络错误）：' + ((e && e.message) || String(e)));
        return;
      } finally {
        setSaving(false);
      }
    }

    // 壳层仍需拿到同一份期望态（列表页用它刷新 / 关闭抽屉），保持既有 onSave 契约不变
    onSave(payload);
    setSavedAt(new Date().toLocaleTimeString('zh-CN'));
  }

  const err = localError || saveError || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <AnchorBar />

      <IdentitySection data={data} patch={patch} isNew={isNew} />
      <DomainSection data={data} patch={patch} isNew={isNew} />
      <PromptSection data={data} patch={patch} isNew={isNew} />
      <RuntimeSection data={data} patch={patch} isNew={isNew} />
      <ExecutionSection data={data} patch={patch} isNew={isNew} />
      <EnvVarsSection rows={envRows} setRows={setEnvRows} />
      <CliArgsSection items={cliArgs} setItems={setCliArgs} />
      <McpSection text={mcpText} setText={setMcpText} error={mcpError} />
      <IntegrationsSection agentId={agentId} isNew={isNew} />
      <SkillsSection agentId={agentId} isNew={isNew} />
      <KnowledgeSection agentId={agentId} isNew={isNew} />
      <OrchestrationSection data={data} workflows={workflows} />
      <AccessSection data={data} patch={patch} isNew={isNew} />
      <GateSection data={data} patch={patch} isNew={isNew} />
      <ProbeSection />
      <DangerSection agentId={agentId} agentName={data.name || (agent && agent.name)} onDelete={onDelete} />
      {/* 附：既有「定时任务」能力，原型 16 区没有它，故不编号、不进锚点条（删掉会造成功能退化） */}
      <ScheduledTasksSection agentId={agentId} isNew={isNew} />

      {/* 保存条：页底一次提交（不分「自动保存」——本仓没有草稿槽端点，做自动保存会变成假三态） */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {err ? (
          <div role="alert" style={{ padding: '8px 12px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 4, color: 'var(--red)', fontSize: 12 }}>
            保存失败：{err}
          </div>
        ) : null}
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={13} /> {saving ? '保存中…' : '保存全部'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={resetBlocks} disabled={saving}>
            <RotateCcw size={13} /> 放弃改动
          </button>
          {savedAt ? <span className="chip ok" role="status">{'已存 · ' + savedAt}</span> : null}
          <span className="grow" />
          <span className="chip mono">{isNew ? '新建 · 未落库' : 'PUT /api/agents/' + agentId}</span>
        </div>
        <p className="page-note" style={{ margin: 0 }}>
          一次提交把常规字段与 model_config_json 的 env_vars / cli_args / mcp_servers 一起 PUT 到
          {' '}/api/agents/{'{id}'}；失败时后端 detail 原样显示在按钮上方（不吞成「保存失败」）。
          技能绑定、知识源、IM 通道是即时请求（各自专用端点），不受本按钮与「放弃改动」影响。
        </p>
      </div>
    </div>
  );
}
