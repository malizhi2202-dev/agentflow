/**
 * Agent 详情/创建 · 壳（change: v26-agent-ui · 原型 agent-detail.html 两级 tab 的落点）
 *
 * 形态（用户三裁 2026-10-26）：
 * - 详情六栏：概览 / 工作 / 能力(5 子栏) / 设置(7 子栏) / 记忆 / 对话——监控并入概览；
 *   原型是四栏，记忆/对话是本仓既有真功能（CRUD/ChatWindow），保留为顶层栏并登记差异（RULINGS §五点六 R26-2）。
 * - 创建两栏：能力 / 设置（同骨架 tab 化，「两种入口一份配置」R5-1）；探活/危险区不进创建页（§6.4）。
 * - 侧栏「Agent 详情」二级入口已移除：列表点卡片即进本壳（AgentDetailPage.tsx 连同删除）。
 *
 * 状态纪律（CFG-06 的命门）：草稿容器 useAgentDraft 住在**本壳层**——切栏/切组都不卸载它，
 * 保存必须一次提交；分区组件零改动、pane 组件不许再持有可写草稿态。
 * 页面名归壳层 .crumb，页内不写 h1/h2。
 */
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import AgentConfigEditor from '../components/agent-config/AgentConfigEditor';
import { useAgentDraft } from '../components/agent-config/useAgentDraft';
import OverviewPane from '../components/agent-detail/OverviewPane';
import WorkPane from '../components/agent-detail/WorkPane';
import MemoryPane from '../components/agent-detail/MemoryPane';
import ChatPane from '../components/agent-detail/ChatPane';
import PageHeader from '../components/ui/PageHeader';
import {
  TOP_TABS_DETAIL, TOP_TABS_CREATE,
  DEFAULT_TOP_DETAIL, DEFAULT_TOP_CREATE,
  DEFAULT_CAP_PANE, DEFAULT_SET_PANE,
  type CapPaneId, type SetPaneId, type TopTabId,
} from '../components/agent-detail/panes';

export default function AgentDetail({ agent, onBack, onSave, onDelete, saveError, onOpenBoard }: {
  agent: any; onBack: () => void; onSave: (data: any) => void; onDelete?: () => void;
  saveError?: string | null; onOpenBoard?: () => void;
}) {
  var isNew = !agent || !agent.id;
  // 常规字段的期望态（壳层持有）：能力/设置两栏的分区通过 patch 改它，保存时由草稿容器组装
  var [data, setData] = useState<any>(Object.assign({
    name: '', description: '', runtime: '', model_name: '',
    workflow_ids: [], token_soft_limit: 800000, token_hard_limit: 1000000,
    io_filter: 'none', system_prompt: '', role_def: '', sop: '',
  }, agent || {}));
  var draft = useAgentDraft(agent);
  var feedbackRef = useRef<HTMLDivElement>(null);
  var configRef = useRef<HTMLDivElement>(null);
  // 顶层栏 + 两栏各自的子栏选中态（切栏不丢草稿：状态在本壳层，draft 也在）
  var [tab, setTab] = useState<TopTabId>(isNew ? DEFAULT_TOP_CREATE : DEFAULT_TOP_DETAIL);
  var [capPane, setCapPane] = useState<CapPaneId>(DEFAULT_CAP_PANE);
  var [setPane, setSetPane] = useState<SetPaneId>(DEFAULT_SET_PANE);
  var [workflows, setWorkflows] = useState<any[]>([]);
  // 对话（一条消息 = 一个 run，回复写回同一会话；messages 留壳层——切栏不丢会话显示）
  var [chatMessages, setChatMessages] = useState<any[]>([]);
  var [chatLoading, setChatLoading] = useState(false);
  var [chatError, setChatError] = useState<string | null>(null);
  var [chatConversationId, setChatConversationId] = useState<number | null>(null);

  /** 分区 → 期望态：函数式更新，避免多个分区在同一 tick 内互相覆盖；顺手标脏 */
  var patch = function (p: any) {
    setData(function (prev: any) { return Object.assign({}, prev, p); });
    draft.touch();
  };

  /** 概览/对话卡的「去编辑 ▸」：跳到目标栏+目标子栏 */
  var goto = function (top: 'cap' | 'set', pane: string) {
    setTab(top);
    if (top === 'cap') setCapPane(pane as CapPaneId);
    else setSetPane(pane as SetPaneId);
  };

  useEffect(function () {
    fetch('/api/workflows').then(function (r) { return r.json(); }).then(function (d) { setWorkflows(d.workflows || []); });
  }, []);

  var sendChatMessage = function (content: string) {
    setChatLoading(true); setChatError(null);
    var tempMsg = { id: Date.now(), role: 'user', content: content, status: 'done', created_at: new Date().toISOString() };
    setChatMessages(function (prev: any[]) { return prev.concat([tempMsg]); });
    fetch('/api/agents/' + agent.id + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content, conversation_id: chatConversationId }),
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d.ok) {
        setChatMessages(function (prev: any[]) { return prev.filter(function (m) { return m.id !== tempMsg.id; }).concat([d.user_message, d.agent_message]); });
        setChatConversationId(d.conversation_id);
        if (d.agent_message && d.agent_message.status === 'error') setChatError(d.agent_message.content);
      } else {
        setChatError(d.detail || '发送失败');
      }
      setChatLoading(false);
    }).catch(function () { setChatLoading(false); setChatError('网络错误'); });
  };

  var effectiveSaveError = saveError || draft.localError || null;
  // 错误由壳层统一呈现，避免保存条和页面摘要各自“报错”；草稿与输入仍来自同一个 draft。
  var editorDraft = Object.assign({}, draft, {
    localError: null,
    savedAt: effectiveSaveError ? null : draft.savedAt,
    dirty: draft.dirty || Boolean(effectiveSaveError),
  });

  useEffect(function () {
    if (!effectiveSaveError) return;
    var feedback = feedbackRef.current;
    if (feedback) feedback.focus();
    else {
      var alert = configRef.current?.querySelector('[role="alert"]') as HTMLElement | null;
      if (alert) {
        alert.tabIndex = -1;
        alert.focus();
      }
    }
  }, [effectiveSaveError]);

  var retrySave = function () {
    var saveButton = Array.from(configRef.current?.querySelectorAll('button') || [])
      .find(function (button) { return (button.textContent || '').includes('保存全部'); }) as HTMLButtonElement | undefined;
    if (saveButton) saveButton.click();
    window.setTimeout(function () { feedbackRef.current?.focus(); }, 0);
  };

  var topTabs = isNew ? TOP_TABS_CREATE : TOP_TABS_DETAIL;
  var pageTitle = isNew ? '创建 Agent' : (data.name || agent?.name || 'Agent');
  var pageSummary = effectiveSaveError
    ? '保存未完成，输入仍保留在草稿中。请检查错误并重试。'
    : draft.savedAt
      ? '保存成功，配置已提交。'
      : isNew
        ? '配置 Agent 的身份、运行时与能力。'
        : '查看 Agent 运行状态，或进入能力与设置进行编辑。';

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <PageHeader
        title={pageTitle}
        context={isNew ? 'Agent / 创建' : 'Agent / 详情 · ID ' + agent.id}
        summary={pageSummary}
        autoFocus
        action={
          <button type="button" onClick={onBack} aria-label="返回" title="返回 Agent 列表" className="btn btn-ghost">
            <ArrowLeft size={16} aria-hidden="true" /> 返回列表
          </button>
        }
      />

      <div style={{ padding: '0 28px 28px' }}>
        {effectiveSaveError && (
          <div
            ref={feedbackRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 20, border: '1px solid var(--red)', borderRadius: 6, background: 'var(--red-bg)', color: 'var(--red)' }}
          >
            <span style={{ flex: 1 }}>保存失败：{effectiveSaveError} 输入未丢失。</span>
            {!isNew && tab === 'set' || tab === 'cap' ? (
              <button type="button" className="btn btn-sm" onClick={retrySave}>
                <RotateCcw size={13} aria-hidden="true" /> 重新保存
              </button>
            ) : null}
          </div>
        )}

        <nav className="tab-bar" aria-label="Agent 详情标签">
          {topTabs.map(function (t) {
            return (
              <button key={t.id} type="button" aria-current={tab === t.id ? 'page' : undefined} className={'tab' + (tab === t.id ? ' active' : '')}
                onClick={function () { setTab(t.id); }}>
                {t.label}
              </button>
            );
          })}
        </nav>

        <main aria-label="Agent 详情主工作区">
          {tab === 'overview' && !isNew && (
            <OverviewPane agent={agent} goto={goto} />
          )}

          {tab === 'work' && !isNew && (
            <WorkPane agent={agent} onOpenBoard={onOpenBoard} />
          )}

          {(tab === 'cap' || tab === 'set') && (
            <div ref={configRef} aria-label="Agent 配置主工作区">
              <AgentConfigEditor
                agent={agent}
                data={data}
                patch={patch}
                onSave={onSave}
                onDelete={onDelete}
                saveError={null}
                workflows={workflows}
                draft={editorDraft}
                group={tab}
                paneId={tab === 'cap' ? capPane : setPane}
                onSelectPane={function (id) { if (tab === 'cap') setCapPane(id as CapPaneId); else setSetPane(id as SetPaneId); }}
              />
            </div>
          )}

          {tab === 'memory' && !isNew && <MemoryPane agentId={agent.id} />}

          {tab === 'chat' && !isNew && agent && agent.id && (
            <ChatPane
              agentId={agent.id}
              agentName={agent.name}
              messages={chatMessages}
              loading={chatLoading}
              error={chatError}
              onSend={sendChatMessage}
              onRetry={function () { setChatError(null); }}
              onGoChannel={function () { goto('cap', 'int'); }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
