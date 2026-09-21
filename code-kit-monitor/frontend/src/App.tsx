import { useState, useEffect } from 'react';
import { Activity, GitBranch, Users, ChevronLeft, PanelLeft, Shield, FileSearch, User as UserIcon, AlertCircle, Wrench, Bot, Network, FolderKanban, BarChart3, Link2, MessageSquare, Radio, Bell, BookOpen } from 'lucide-react';
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
import UserArea from './components/UserSelect';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './stores/auth';
import { safeFetch } from './utils/requestDedup';

function EmptyPerm() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }}>
      <AlertCircle size={40} style={{ opacity: 0.3 }} />
      <p style={{ fontSize: 14 }}>暂无此功能权限</p>
      <p style={{ fontSize: 11 }}>请联系管理员分配相应权限</p>
    </div>
  );
}

type NavItem = { id: string; label: string; icon: React.ReactNode };
const NAV: NavItem[] = [
  { id: 'tools', label: '工具库', icon: <Wrench size={16} /> },
  { id: 'workflows', label: '工作流', icon: <GitBranch size={16} /> },
  { id: 'roles-page', label: '角色', icon: <Users size={16} /> },
  { id: 'agents', label: 'Agent', icon: <Bot size={16} /> },
  { id: 'chat', label: '💬 对话中心', icon: <MessageSquare size={16} /> },
  { id: 'control-plane', label: 'Agent 管控', icon: <Radio size={16} /> },
  { id: 'orchestration', label: '编排', icon: <Network size={16} /> },
  { id: 'monitor', label: '监控', icon: <BarChart3 size={16} /> },
  { id: 'projects', label: '项目', icon: <FolderKanban size={16} /> },
  { id: 'knowledge', label: '知识库', icon: <BookOpen size={16} /> },
  { id: 'approvals', label: '审批', icon: <Shield size={16} /> },
];

const ADMIN_NAV: NavItem[] = [
  { id: 'users', label: '用户管理', icon: <Shield size={16} /> },
  { id: 'audit', label: '审计日志', icon: <FileSearch size={16} /> },
];

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
  | { page: 'approvals' };

export default function App() {
  const getInitialNav = () => {
    const path = window.location.pathname;
    if (path.startsWith('/orchestration')) return 'orchestration';
    if (path.startsWith('/agents')) return 'agents';
    if (path.startsWith('/workflows')) return 'workflows';
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
  const { isAdmin, rolePermissions, fetchMe, fetchUsers, loaded } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  // 轮询告警数量（接入去重层，降低频率 15s → 30s）
  useEffect(() => {
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
  }, []);

  // 未登录 → 显示登录页
  const userId = localStorage.getItem('current_user_id');
  if (!userId) {
    return <LoginPage />;
  }

  useEffect(() => {
    fetchMe().then(() => {
      const state = useAuth.getState();
      if (state.isAdmin) fetchUsers();
    });
  }, []);

  const perm = (p: string) => isAdmin || rolePermissions.includes(p);
  const visibleNav = NAV;
  const visibleAdminNav = ADMIN_NAV.filter(item => {
    switch (item.id) {
      case 'users': return perm('user:manage');
      case 'audit': return perm('audit:view');
      default: return false;
    }
  });

  const navigate = (id: string) => {
    setNav(id);
    setDetailId(null);
  };

  const openDetail = (changeId: string) => setDetailId(changeId);

  const renderContent = () => {
    if (agentDetail) {
      var handleSaveAgent = async function(data: any) {
        var uid = localStorage.getItem('current_user_id') || 'admin';
        setAgentSaveError(null);
        var url = data.id ? '/api/agents/' + data.id : '/api/agents';
        var method = data.id ? 'PUT' : 'POST';
        var res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) });
        if (!res.ok) {
          var err = await res.json().catch(function() { return { detail: '保存失败 (' + res.status + ')' }; });
          setAgentSaveError(err.detail || '保存失败');
          return;
        }
        setAgentDetail(null);
      };
      var handleDeleteAgent = function() {
        if (agentDetail.id) { fetch('/api/agents/' + agentDetail.id, { method: 'DELETE', headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } }).then(function() { setAgentDetail(null); }); }
      };
      return <AgentDetail agent={agentDetail} onBack={() => { setAgentDetail(null); setAgentSaveError(null); }} onSave={handleSaveAgent} onDelete={agentDetail.id ? handleDeleteAgent : undefined} saveError={agentSaveError} />;
    }
    if (toolDetail) {
      var handleSaveTool = function(data: any) {
        var uid = localStorage.getItem('current_user_id') || 'admin';
        if (data.id) {
          fetch('/api/tools/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function() { setToolDetail(null); });
        } else {
          fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function() { setToolDetail(null); });
        }
      };
      var handleDeleteTool = function() {
        if (toolDetail.id) { fetch('/api/tools/' + toolDetail.id, { method: 'DELETE', headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } }).then(function() { setToolDetail(null); }); }
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
        var uid = localStorage.getItem('current_user_id') || 'admin';
        if (data.id) {
          fetch('/api/roles/custom/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function() { setRoleDetail(null); });
        } else {
          fetch('/api/roles/custom', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function() { setRoleDetail(null); });
        }
      };
      var handleDeleteRole = function() {
        if (roleDetail.id) {
          var uid = localStorage.getItem('current_user_id') || 'admin';
          fetch('/api/roles/custom/' + roleDetail.id, { method: 'DELETE', headers: { 'X-User-Id': uid } }).then(function() { setRoleDetail(null); });
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
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '12px 10px' : '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--blue)', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>◈</span>
          {!collapsed && <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>AI 开发平台</span>}
        </div>

        {/* 导航 */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {visibleNav.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-label={item.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                marginBottom: 2, borderRadius: 'var(--r-sm)',
                background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                transition: 'all var(--fast)',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}

          {/* Admin only nav */}
          {visibleAdminNav.length > 0 && (
            <>
              {!collapsed && (
                <div style={{ padding: '4px 10px', marginTop: 8, marginBottom: 4, fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06 }}>
                  管理
                </div>
              )}
              {visibleAdminNav.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  aria-label={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                    marginBottom: 2, borderRadius: 'var(--r-sm)',
                    background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                    border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                    transition: 'all var(--fast)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                  }}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* 底部：用户信息 + 登出 + 状态 + 折叠 */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border)' }}>
          {/* 告警按钮 */}
          <button
            onClick={() => navigate('alerts')}
            aria-label="告警中心"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
              marginBottom: 6, borderRadius: 'var(--r-sm)',
              background: nav === 'alerts' ? 'var(--bg-selected)' : 'transparent',
              border: 'none', color: nav === 'alerts' ? 'var(--blue)' : alertCount > 0 ? 'var(--red)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13, fontWeight: nav === 'alerts' ? 600 : 400,
              transition: 'all var(--fast)',
              justifyContent: collapsed ? 'center' : 'flex-start',
              position: 'relative' as const,
            }}
          >
            <Bell size={16} />
            {!collapsed && <span>告警中心</span>}
            {alertCount > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: collapsed ? -2 : 8,
                background: 'var(--red)', color: '#fff', borderRadius: 10,
                padding: '0px 5px', fontSize: 10, fontWeight: 700,
                minWidth: 16, textAlign: 'center', lineHeight: '16px',
              }}>
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
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
        <ErrorBoundary>{renderContent()}</ErrorBoundary>
      </main>
    </div>
  );
}
