import { useState, useEffect } from 'react';
import { Activity, GitBranch, Users, ChevronLeft, PanelLeft, Shield, FileSearch, User as UserIcon, AlertCircle, Wrench, Bot, Network, FolderKanban, BarChart3, Link2, MessageSquare, Radio, Bell, BookOpen, ListTodo, Inbox as InboxIcon, Brain, Timer, Boxes, RotateCcw } from 'lucide-react';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Roles from './pages/Roles';
import WorkflowEditor from './pages/WorkflowEditor';
import DocEditor from './pages/DocEditor';
import SpecsEditor from './pages/SpecsEditor';
import Runtime from './pages/Runtime';
import UserManagement from './pages/UserManagement';
import AuditLog from './pages/AuditLog';
import LoginPage from './pages/LoginPage';
import UserCenter from './pages/UserCenter';
import ToolMarket from './pages/ToolMarket';
import ToolDetail from './pages/ToolDetail';
import WorkflowList from './pages/WorkflowList';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowCreate from './pages/WorkflowCreate';
import RoleMarket from './pages/RoleMarket';
import RoleDetail from './pages/RoleDetail';
import AgentBuilder from './pages/AgentBuilder';
import AgentDetail from './pages/AgentDetail';
import OrchestrationPage from './pages/OrchestrationPage';
import OrchestrationListPage from './pages/OrchestrationListPage';
import AgentControlPlane from './pages/AgentControlPlane';
import OrchDocPage from './pages/OrchDocPage';
import TemplateMarket from './pages/TemplateMarket';
import MonitoringDashboard from './pages/MonitoringDashboard';
import ConversationCenter from './pages/ConversationCenter';
import ProjectManager from './pages/ProjectManager';
import ProjectDetail from './pages/ProjectDetail';
import AlertsPage from './pages/AlertsPage';
import KnowledgeBase from './pages/KnowledgeBase';
import ApprovalPage from './pages/ApprovalPage';
import Tasks from './pages/Tasks';
import Inbox from './pages/Inbox';
import Teams from './pages/Teams';
import Memory from './pages/Memory';
import StageModel from './pages/StageModel';
import DecisionModels from './pages/DecisionModels';
import Finetune from './pages/Finetune';
import Isolation from './pages/Isolation';
import Integration from './pages/Integration';
import EnvAdvisor from './pages/EnvAdvisor';
import AgentDetailPage from './pages/AgentDetailPage';
import SquadsPage from './pages/SquadsPage';
import Automations from './pages/Automations';
import Runtimes from './pages/Runtimes';
import Replay from './pages/Replay';
import UserArea from './components/UserSelect';
import ForcePasswordChange from './components/ForcePasswordChange';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './stores/auth';
import { useStageConfig } from './stores/stageConfig';
import { safeFetch } from './utils/requestDedup';
import AppTopBar from './components/ui/AppTopBar';

function EmptyPerm() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }}>
      <AlertCircle size={40} style={{ opacity: 0.3 }} />
      <p style={{ fontSize: 14 }}>暂无此功能权限</p>
      <p style={{ fontSize: 11 }}>请联系管理员分配相应权限</p>
    </div>
  );
}

type NavItem = { id: string; label: string; icon: React.ReactNode; perm?: string; badge?: 'alerts' };
type NavGroup = { key: string; title: string; items: NavItem[] };

/**
 * 侧栏信息架构（v22-nav-groups）：父级标题 = 业务链的一段，组内顺序即使用顺序。
 * 阅读顺序：造（构建）→ 跑（运行）→ 一起干（协作）→ 沉淀（知识）→ 看（观测）→ 管（治理）。
 * `id` 与 `View` 值一一对应：分组只改变呈现，不改路由、不改权限语义
 * （治理组两项仍由 `user:manage` / `audit:view` 过滤，`perm` 不填 = 登录即可见）。
 */
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'build', title: '构建', items: [
      { id: 'tools', label: '工具库', icon: <Wrench size={16} /> },
      { id: 'workflows', label: '工作流', icon: <GitBranch size={16} /> },
      { id: 'roles-page', label: '角色', icon: <Users size={16} /> },
      { id: 'agents', label: 'Agent', icon: <Bot size={16} /> },
      { id: 'agent-detail', label: 'Agent 详情', icon: <Bot size={16} /> },
      { id: 'stage-model', label: '阶段模型配置', icon: <ListTodo size={16} /> },
      { id: 'decision-models', label: '决策模型目录', icon: <Brain size={16} /> },
      { id: 'finetune', label: '微调工厂', icon: <Wrench size={16} /> },
    ],
  },
  {
    key: 'run', title: '运行', items: [
      { id: 'orchestration', label: '编排', icon: <Network size={16} /> },
      { id: 'control-plane', label: 'Agent 管控', icon: <Radio size={16} /> },
      { id: 'runtimes', label: '运行时', icon: <Boxes size={16} /> },
      { id: 'replay', label: '回放', icon: <RotateCcw size={16} /> },
      { id: 'automations', label: '自动化', icon: <Timer size={16} /> },
      { id: 'isolation', label: '执行隔离', icon: <Shield size={16} /> },
      { id: 'integration', label: '对外集成', icon: <Link2 size={16} /> },
      { id: 'env-advisor', label: '环境参谋', icon: <Network size={16} /> },
    ],
  },
  {
    key: 'collab', title: '协作', items: [
      { id: 'projects', label: '项目', icon: <FolderKanban size={16} /> },
      { id: 'tasks', label: '任务', icon: <ListTodo size={16} /> },
      { id: 'inbox', label: '收件箱', icon: <InboxIcon size={16} /> },
      { id: 'teams', label: '团队与小队', icon: <Users size={16} /> },
      { id: 'squads', label: '小队中心', icon: <Users size={16} /> },
      { id: 'chat', label: '💬 对话中心', icon: <MessageSquare size={16} /> },
    ],
  },
  {
    key: 'knowledge', title: '知识', items: [
      { id: 'knowledge', label: '知识库', icon: <BookOpen size={16} /> },
      { id: 'memory', label: '记忆中心', icon: <Brain size={16} /> },
    ],
  },
  {
    key: 'observe', title: '观测', items: [
      { id: 'monitor', label: '监控', icon: <BarChart3 size={16} /> },
      { id: 'alerts', label: '告警中心', icon: <Bell size={16} />, badge: 'alerts' },
    ],
  },
  {
    key: 'govern', title: '治理', items: [
      { id: 'approvals', label: '审批', icon: <Shield size={16} /> },
      { id: 'users', label: '用户管理', icon: <Shield size={16} />, perm: 'user:manage' },
      { id: 'audit', label: '审计日志', icon: <FileSearch size={16} />, perm: 'audit:view' },
    ],
  },
];

/** 壳层面包屑文案（v22-ui-align W1）：页面名只在这里出现一次，页面内不再写大字标题。 */
const PAGE_LABELS: Record<string, string> = {
  home: '工作台', detail: '变更详情', specs: '规格', runtime: '运行时数据', workflow: '工作流画布',
  roles: '角色', docs: '文档', profile: '用户中心',
};

type View =
  | { page: 'home' }
  | { page: 'detail'; changeId: string }
  | { page: 'specs' }
  | { page: 'runtime' }
  | { page: 'workflow' }
  | { page: 'roles' }
  | { page: 'docs' }
  | { page: 'tools' }
  | { page: 'workflows' }
  | { page: 'roles-page' }
  | { page: 'agents' }
  | { page: 'orchestration' }
  | { page: 'control-plane' }
  | { page: 'monitor' }
  | { page: 'projects' }
  | { page: 'users' }
  | { page: 'audit' }
  | { page: 'templates' }
  | { page: 'profile' }
  | { page: 'alerts' }
  | { page: 'knowledge' }
  | { page: 'approvals' }
  | { page: 'tasks' }
  | { page: 'inbox' }
  | { page: 'teams' }
  | { page: 'memory' }
  | { page: 'stage-model' }
  | { page: 'decision-models' }
  | { page: 'finetune' }
  | { page: 'isolation' }
  | { page: 'integration' }
  | { page: 'env-advisor' }
  | { page: 'agent-detail' }
  | { page: 'squads' };

export default function App() {
  const getInitialNav = () => {
    const path = window.location.pathname;
    if (path.startsWith('/orchestration')) return 'orchestration';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/workflows')) return 'workflows';
    if (path.startsWith('/tasks')) return 'tasks';
    if (path.startsWith('/inbox')) return 'inbox';
    if (path.startsWith('/teams')) return 'teams';
    if (path.startsWith('/memory')) return 'memory';
    return 'projects';
  };
  const [nav, setNav] = useState(getInitialNav);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [projectDetailId, setProjectDetailId] = useState<number | null>(null);
  const [workflowDetailId, setWorkflowDetailId] = useState<number | null>(null);
  const [showWorkflowCreate, setShowWorkflowCreate] = useState(false);
  const [roleDetail, setRoleDetail] = useState<any>(null);
  const [toolDetail, setToolDetail] = useState<any>(null);
  const [agentDetail, setAgentDetail] = useState<any>(null);
  const [agentSaveError, setAgentSaveError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin, rolePermissions, fetchMe, fetchUsers, loaded, currentUser, mustChangePassword } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  // 身份真相源：服务端会话（cookie）。挂载时问一次 /api/auth/me
  useEffect(() => {
    fetchMe().then(() => {
      const state = useAuth.getState();
      if (state.isAdmin) fetchUsers();
    });
  }, []);

  // 阶段模型：登录后再拉（后端单一事实源，失败回退默认表）
  const fetchStageConfig = useStageConfig((st) => st.fetchStageConfig);
  useEffect(() => { if (currentUser) fetchStageConfig(); }, [currentUser, fetchStageConfig]);

  // 轮询告警数量（接入去重层，降低频率 15s → 30s）；未登录不轮询
  useEffect(() => {
    if (!currentUser) return;
    const pollAlerts = () => {
      safeFetch('/api/alerts/count').then(result => {
        if (result.ok && result.data) {
          setAlertCount(result.data.unacknowledged || 0);
        }
      });
    };
    pollAlerts();
    const t = setInterval(pollAlerts, 30000);
    return () => clearInterval(t);
  }, [currentUser]);

  // 所有 hook 之后再决定渲染哪个壳（不能像旧代码那样在 hook 之间 return）
  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', background: 'var(--bg-app)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>正在确认登录状态...</p>
      </div>
    );
  }
  if (!currentUser) return <LoginPage />;
  if (mustChangePassword) return <ForcePasswordChange />;

  const perm = (p: string) => isAdmin || rolePermissions.includes(p);

  const navigate = (id: string) => {
    setNav(id);
    setDetailId(null);
  };

  const openDetail = (changeId: string) => setDetailId(changeId);

  const renderContent = () => {
    if (agentDetail) {
      var handleSaveAgent = async function(data: any) {
        setAgentSaveError(null);
        var url = data.id ? '/api/agents/' + data.id : '/api/agents';
        var method = data.id ? 'PUT' : 'POST';
        var res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) {
          var err = await res.json().catch(function() { return { detail: '保存失败 (' + res.status + ')' }; });
          setAgentSaveError(err.detail || '保存失败');
          return;
        }
        setAgentDetail(null);
      };
      var handleDeleteAgent = function() {
        if (agentDetail.id) { fetch('/api/agents/' + agentDetail.id, { method: 'DELETE' }).then(function() { setAgentDetail(null); }); }
      };
      return <AgentDetail agent={agentDetail} onBack={() => { setAgentDetail(null); setAgentSaveError(null); }} onSave={handleSaveAgent} onDelete={agentDetail.id ? handleDeleteAgent : undefined} saveError={agentSaveError} />;
    }
    if (toolDetail) {
      var handleSaveTool = function(data: any) {
        if (data.id) {
          fetch('/api/tools/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function() { setToolDetail(null); });
        } else {
          fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function() { setToolDetail(null); });
        }
      };
      var handleDeleteTool = function() {
        if (toolDetail.id) { fetch('/api/tools/' + toolDetail.id, { method: 'DELETE' }).then(function() { setToolDetail(null); }); }
      };
      return <ToolDetail tool={toolDetail} onBack={() => setToolDetail(null)} onSave={handleSaveTool} onDelete={toolDetail.id ? handleDeleteTool : undefined} />;
    }
    if (roleDetail) {
      var builtinTemplates = [
        { id: 'architect', name: '架构师' }, { id: 'senior-pm', name: '高级产品经理' },
        { id: 'user-evaluator', name: '资深用户评测员' }, { id: 'security-auditor', name: '安全审计师' },
        { id: 'domain-expert', name: '领域专家' }, { id: 'ui-designer', name: '资深UI设计师' },
        { id: 'ux-officer', name: '资深用户体验官' }, { id: 'frontend-architect', name: '前端架构师' },
        { id: 'a11y-expert', name: '无障碍专家' }, { id: 'eng-efficiency', name: '工程效能专家' },
        { id: 'dev-lead', name: '研发负责人' }, { id: 'test-engineer', name: '资深测试工程师' },
      ];
      var handleSaveRole = function(data: any) {
        if (data.id) {
          fetch('/api/roles/custom/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function() { setRoleDetail(null); });
        } else {
          fetch('/api/roles/custom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function() { setRoleDetail(null); });
        }
      };
      var handleDeleteRole = function() {
        if (roleDetail.id) {
          fetch('/api/roles/custom/' + roleDetail.id, { method: 'DELETE' }).then(function() { setRoleDetail(null); });
        }
      };
      return <RoleDetail role={roleDetail} templates={builtinTemplates} onBack={() => setRoleDetail(null)} onSave={handleSaveRole} onDelete={roleDetail.id ? handleDeleteRole : undefined} />;
    }
    if (showWorkflowCreate) return <WorkflowCreate onBack={() => setShowWorkflowCreate(false)} onCreated={(id) => { setShowWorkflowCreate(false); setWorkflowDetailId(id); }} />;
    if (workflowDetailId) return <WorkflowDetail workflowId={workflowDetailId} onBack={() => setWorkflowDetailId(null)} />;
    if (projectDetailId) return <ProjectDetail projectId={projectDetailId} onBack={() => setProjectDetailId(null)} onNavigateAgent={(agent) => {
      setProjectDetailId(null); setNav('agents'); setAgentDetail(agent);
    }} />;
    if (detailId) return <Detail changeId={detailId} onBack={() => setDetailId(null)} />;
    switch (nav) {
      case 'home': return <Home onSelect={openDetail} />;
      case 'workflow': return perm('project:write') ? <WorkflowEditor /> : <EmptyPerm />;
      case 'roles': return perm('project:write') ? <Roles /> : <EmptyPerm />;
      case 'specs': return perm('project:read') ? <SpecsEditor onSelect={(id) => setDetailId(id)} /> : <EmptyPerm />;
      case 'runtime': return perm('project:read') ? <Runtime /> : <EmptyPerm />;
      case 'docs': return perm('project:write') ? <DocEditor /> : <EmptyPerm />;
      case 'users': return perm('user:manage') ? <UserManagement /> : <EmptyPerm />;
      case 'audit': return perm('audit:view') ? <AuditLog /> : <EmptyPerm />;
      case 'tools': return perm('project:read') ? <ToolMarket onSelect={(t) => setToolDetail(t)} /> : <EmptyPerm />;
      case 'workflows': return perm('project:write') ? <WorkflowList onSelect={function(id) { setWorkflowDetailId(id); }} onCreate={() => setShowWorkflowCreate(true)} /> : <EmptyPerm />;
      case 'roles-page': return perm('project:read') ? <RoleMarket onSelectRole={(r) => setRoleDetail(r)} /> : <EmptyPerm />;
      case 'agents': return perm('project:read') ? <AgentBuilder onSelect={(a) => setAgentDetail(a)} /> : <EmptyPerm />;
      case 'chat': return perm('project:read') ? <ConversationCenter /> : <EmptyPerm />;
      case 'control-plane': return <AgentControlPlane />;
      case 'orchestration': {
        if (!perm('project:write')) return <EmptyPerm />;
        const path = window.location.pathname;
        if (path === '/orchestration/new' || path.match(/\/orchestration\/\d+\/edit/)) {
          return <OrchestrationPage />;
        }
        if (path.match(/\/orchestration\/\d+\/(md|yaml)/)) {
          return <OrchDocPage />;
        }
        return <OrchestrationListPage />;
      }
      case 'templates': return perm('project:read') ? <TemplateMarket /> : <EmptyPerm />;
      case 'monitor': return perm('project:read') ? <MonitoringDashboard /> : <EmptyPerm />;
      case 'projects': return perm('project:read') ? <ProjectManager onSelect={(id) => setProjectDetailId(id)} /> : <EmptyPerm />;
      case 'profile': return <UserCenter onBack={() => navigate('projects')} />;
      case 'alerts': return <AlertsPage />;
      case 'knowledge': return perm('project:read') ? <KnowledgeBase /> : <EmptyPerm />;
      case 'approvals': return perm('project:read') ? <ApprovalPage /> : <EmptyPerm />;
      case 'tasks': return perm('project:read') ? <Tasks /> : <EmptyPerm />;
      case 'inbox': return <Inbox />;
      case 'automations': return perm('project:read') ? <Automations /> : <EmptyPerm />;
      case 'runtimes': return perm('project:read') ? <Runtimes /> : <EmptyPerm />;
      case 'replay': return perm('project:read') ? <Replay /> : <EmptyPerm />;
      case 'teams': return perm('project:read') ? <Teams /> : <EmptyPerm />;
      case 'memory': return perm('project:read') ? <Memory /> : <EmptyPerm />;
      case 'stage-model': return perm('project:write') ? <StageModel /> : <EmptyPerm />;
      case 'decision-models': return perm('project:read') ? <DecisionModels /> : <EmptyPerm />;
      case 'finetune': return perm('project:read') ? <Finetune /> : <EmptyPerm />;
      case 'isolation': return perm('project:read') ? <Isolation /> : <EmptyPerm />;
      case 'integration': return perm('project:read') ? <Integration /> : <EmptyPerm />;
      case 'env-advisor': return perm('project:read') ? <EnvAdvisor /> : <EmptyPerm />;
      case 'agent-detail': return perm('project:read') ? <AgentDetailPage /> : <EmptyPerm />;
      case 'squads': return perm('project:read') ? <SquadsPage /> : <EmptyPerm />;
      default: return <ProjectManager onSelect={(id) => setProjectDetailId(id)} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* ── 左侧边栏 ── */}
      <aside style={{
        width: collapsed ? 48 : 200,
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width var(--normal) var(--ease)',
        flexShrink: 0, overflow: 'hidden' }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '12px 10px' : '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--blue)', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>◈</span>
          {!collapsed && <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>AI 开发平台</span>}
        </div>

        {/* 文档资料入口 → 产品文档与交互原型（静态资源，见 .specs/product-design/prototype → public 软链）。
            仅平台管理员可见：原型里含内部设计口径与未实现面，对普通成员/业务使用者是误导源。 */}
        {isAdmin && (
          <a
            href="/prototype/index.html"
            target="_blank"
            rel="noreferrer"
            title="产品文档与交互原型（新标签打开）"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: collapsed ? '8px 14px' : '8px 16px',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            <span style={{ flexShrink: 0 }}>📄</span>
            {!collapsed && <span>文档资料 · 原型</span>}
          </a>
        )}

        {/* 导航：条目多于视口高度时必须可滚动——aside 是 overflow:hidden，
            不在这里给滚动容器，底部分组会被裁掉看不见。 */}
        <nav style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px' }}>
          {NAV_GROUPS.map(group => {
            // 先按权限过滤，组空则整组不渲染（普通成员不会看到空的「治理」之外的空壳）
            const items = group.items.filter(item => !item.perm || perm(item.perm));
            if (items.length === 0) return null;
            return (
              <div key={group.key} role="group" aria-label={group.title} style={{ marginBottom: 8 }}>
                {!collapsed && (
                  <div style={{
                    padding: '4px 10px', marginBottom: 2, fontSize: 9.5, color: 'var(--text-muted)',
                    fontWeight: 700, letterSpacing: 0.06 }}>
                    {group.title}
                  </div>
                )}
                {items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    aria-label={item.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                      marginBottom: 2, borderRadius: 'var(--r-sm)',
                      background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                      border: 'none',
                      color: nav === item.id && !detailId ? 'var(--blue)'
                        : item.badge === 'alerts' && alertCount > 0 ? 'var(--red)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                      transition: 'all var(--fast)',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      position: 'relative' as const }}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                    {item.badge === 'alerts' && alertCount > 0 && (
                      <span style={{
                        position: 'absolute', top: 2, right: collapsed ? -2 : 8,
                        background: 'var(--red)', color: '#fff', borderRadius: 10,
                        padding: '0px 5px', fontSize: 10, fontWeight: 700,
                        minWidth: 16, textAlign: 'center', lineHeight: '16px' }}>
                        {alertCount > 99 ? '99+' : alertCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* 底部：用户信息 + 登出 + 折叠（告警已移入「观测」组，角标随之） */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
          <UserArea collapsed={collapsed} onNavigateProfile={() => navigate('profile')} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', marginTop: 6, justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            {collapsed ? <PanelLeft size={14} /> : <><ChevronLeft size={14} />{!collapsed && ' 收起'}</>}
          </button>
        </div>
      </aside>

      {/* ── 右侧内容区 ── */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-main)' }}>
        {/* 壳层顶栏（原型 .app-top）：页面名 + 上下文 + 右侧 chip/动作。页面自己的动作留在页面工具栏。 */}
        <AppTopBar
          crumb={PAGE_LABELS[nav] || (NAV_GROUPS.flatMap(g => g.items).find(i => i.id === nav)?.label ?? nav)}
          context={detailId || projectDetailId || workflowDetailId || agentDetail || toolDetail || roleDetail
            ? '详情' : undefined}
        />
        <ErrorBoundary>{renderContent()}</ErrorBoundary>
      </main>
    </div>
  );
}
