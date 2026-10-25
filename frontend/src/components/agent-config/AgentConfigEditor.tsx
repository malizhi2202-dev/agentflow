/**
 * Agent 详情/创建 ·「能力 / 设置」草稿渲染面（change: v26-agent-ui · 前身是 16 分区平铺页）
 *
 * 为什么不再是平铺大页：改造前这里纵向堆 16 个分区 + 锚点条，是一根超长页（用户原话
 * 「平铺直序到一个超级大页面上…用一个大 tab 点击展示进入」）。现在按原型
 * `agent-detail.html` 的两级 tab 收口：能力 5 子栏 / 设置 7 子栏（创建态裁掉探活与危险区），
 * 一次只渲一个子栏；sticky 保存条常驻两栏底部，覆盖所有走草稿的字段。
 *
 * 保存仍是**一次**提交——三块受控态与 commit 逻辑已提到壳层（`useAgentDraft`），
 * 本组件只按 `group + paneId` 渲染分区子集；分区组件保持纯展示 + 上抛补丁，**一行不改**。
 * 「分区直达」锚点条退场：直达职责由 5+7 子栏承接（meta.ts 的 secN 编号与锚点 id 保留，
 * 与升格原型 agent-detail__config.html 仍可对照深链）。
 *
 * 未接入的一律显式标注（`<Unwired>`），不塞示例数据 —— 判据是「后端有没有这一列 + PUT 收不收」。
 */
import { Save, RotateCcw } from 'lucide-react';
import { IM_ANCHOR_NOTE } from './meta';
import type { AgentDraft } from './useAgentDraft';
import { IdentitySection, DomainSection, AccessSection } from './BasicsSections';
import { PromptSection } from './PromptSections';
import { RuntimeSection, ExecutionSection, GateSection } from './RuntimeSections';
import { EnvVarsSection, CliArgsSection, McpSection } from './ConfigSections';
import { IntegrationsSection, SkillsSection, KnowledgeSection, OrchestrationSection } from './BindingSections';
import { ProbeSection, DangerSection } from './OpsSections';
import { CAP_PANES, SET_PANES, SET_PANES_CREATE, type PaneId } from '../agent-detail/panes';

export interface AgentConfigEditorProps {
  agent: any;
  /** 常规字段（名称/描述/运行时/模型/token 上限/域/人设三件…）的期望态，由壳层持有 */
  data: any;
  patch: (p: any) => void;
  onSave: (payload: any) => void;
  onDelete?: () => void;
  saveError?: string | null;
  workflows: any[];
  /** 草稿容器（壳层 useAgentDraft 的结果）——切栏切组都不重新挂载状态 */
  draft: AgentDraft;
  /** 顶层栏归属：cap=能力 5 子栏 / set=设置 7 子栏 */
  group: 'cap' | 'set';
  paneId: PaneId;
  onSelectPane: (id: PaneId) => void;
}

export default function AgentConfigEditor({
  agent, data, patch, onSave, onDelete, saveError, workflows,
  draft, group, paneId, onSelectPane,
}: AgentConfigEditorProps) {
  const isNew = !agent || !agent.id;
  const agentId: number | undefined = agent && agent.id ? agent.id : undefined;
  const panes = group === 'cap' ? CAP_PANES : (isNew ? SET_PANES_CREATE : SET_PANES);
  const err = draft.localError || saveError || null;

  function renderPane() {
    switch (paneId) {
      // ── 能力（5 子栏）──
      case 'instr':
        return <PromptSection data={data} patch={patch} isNew={isNew} />;
      case 'skill':
        return <SkillsSection agentId={agentId} isNew={isNew} />;
      case 'mcp':
        return (
          <McpSection
            text={draft.mcpText} setText={draft.setMcpText} error={draft.mcpError}
          />
        );
      case 'int':
        return (
          <>
            <div className="page-note" style={{ marginBottom: 8 }}>{IM_ANCHOR_NOTE}</div>
            <IntegrationsSection agentId={agentId} isNew={isNew} />
          </>
        );
      case 'know':
        return (
          <>
            <KnowledgeSection agentId={agentId} isNew={isNew} />
            <OrchestrationSection data={data} workflows={workflows} />
          </>
        );
      // ── 设置（7 子栏；创建态裁掉探活与危险区）──
      case 'gen':
        return (
          <>
            <IdentitySection data={data} patch={patch} isNew={isNew} />
            <DomainSection data={data} patch={patch} isNew={isNew} />
            <RuntimeSection data={data} patch={patch} isNew={isNew} />
            <ExecutionSection data={data} patch={patch} isNew={isNew} />
          </>
        );
      case 'acc':
        return <AccessSection data={data} patch={patch} isNew={isNew} />;
      case 'env':
        return <EnvVarsSection rows={draft.envRows} setRows={draft.setEnvRows} />;
      case 'cli':
        return <CliArgsSection items={draft.cliArgs} setItems={draft.setCliArgs} />;
      case 'gate':
        return <GateSection data={data} patch={patch} isNew={isNew} />;
      case 'probe':
        return <ProbeSection />;
      case 'danger':
        return (
          <DangerSection agentId={agentId} agentName={data.name || (agent && agent.name)} onDelete={onDelete} />
        );
      default:
        return null;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="tab-bar sub" aria-label={group === 'cap' ? '能力子栏' : '设置子栏'}>
        {panes.map(function (p) {
          return (
            <button key={p.id} type="button" aria-current={paneId === p.id ? 'page' : undefined}
              className={'tab' + (paneId === p.id ? ' active' : '')}
              onClick={function () { onSelectPane(p.id); }}>
              {p.label}
            </button>
          );
        })}
      </div>

      {group === 'cap' ? (
        <div className="page-note" style={{ margin: 0 }}>
          保存语义分级：<span className="chip ok">低敏即存</span> 技能绑定 · 知识源 · IM 通道（行级即时落库，不受保存条影响）｜
          <span className="chip warn">高敏草稿</span> 指令 · 环境变量 · CLI · MCP · 常规字段——切栏不丢，走底部「保存全部」一次落库。
        </div>
      ) : null}

      {renderPane()}

      {/* sticky 保存条：覆盖能力⇄设置两栏（草稿字段只在这两栏；概览/工作/记忆/对话不显示） */}
      <div className="panel" style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        position: 'sticky', bottom: 0, zIndex: 2,
      }}>
        {err ? (
          <div role="alert" style={{ padding: '8px 12px', background: 'var(--red-bg)', border: '1px solid var(--red)', borderRadius: 4, color: 'var(--red)', fontSize: 12 }}>
            保存失败：{err}
          </div>
        ) : null}
        <div className="toolbar">
          <button type="button" className="btn btn-primary" onClick={function () { void draft.commit(data, onSave); }} disabled={draft.saving}>
            <Save size={13} /> {draft.saving ? '保存中…' : '保存全部'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={draft.reset} disabled={draft.saving}>
            <RotateCcw size={13} /> 放弃改动
          </button>
          {draft.savedAt ? <span className="chip ok" role="status">{'已存 · ' + draft.savedAt}</span> : null}
          {!draft.savedAt && draft.dirty ? <span className="chip warn">有未保存改动</span> : null}
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
