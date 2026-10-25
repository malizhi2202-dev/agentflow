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
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import AgentConfigEditor from '../components/agent-config/AgentConfigEditor';
import { useAgentDraft } from '../components/agent-config/useAgentDraft';
import OverviewPane from '../components/agent-detail/OverviewPane';
import WorkPane from '../components/agent-detail/WorkPane';
import MemoryPane from '../components/agent-detail/MemoryPane';
import ChatPane from '../components/agent-detail/ChatPane';
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

  var topTabs = isNew ? TOP_TABS_CREATE : TOP_TABS_DETAIL;

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={onBack} aria-label="返回" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          {isNew ? '创建 Agent' : (data.name || agent?.name || 'Agent')}
        </span>
        {!isNew && <span className="chip mono">{'ID ' + agent.id}</span>}
      </div>

      <div className="tab-bar" aria-label="Agent 详情标签">
        {topTabs.map(function (t) {
          return (
            <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} className={'tab' + (tab === t.id ? ' active' : '')}
              onClick={function () { setTab(t.id); }}>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && !isNew && (
        <OverviewPane agent={agent} goto={goto} />
      )}

      {tab === 'work' && !isNew && (
        <WorkPane agent={agent} onOpenBoard={onOpenBoard} />
      )}

      {(tab === 'cap' || tab === 'set') && (
        <AgentConfigEditor
          agent={agent}
          data={data}
          patch={patch}
          onSave={onSave}
          onDelete={onDelete}
          saveError={saveError}
          workflows={workflows}
          draft={draft}
          group={tab}
          paneId={tab === 'cap' ? capPane : setPane}
          onSelectPane={function (id) { if (tab === 'cap') setCapPane(id as CapPaneId); else setSetPane(id as SetPaneId); }}
        />
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
    </div>
  );
}
