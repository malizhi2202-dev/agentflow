import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { GitBranch, Users, ChevronLeft, PanelLeft, Shield, FileSearch, AlertCircle, Wrench, Bot, Network, FolderKanban, BarChart3, MessageSquare, Radio, Bell, BookOpen } from 'lucide-react';
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
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }, children: [_jsx(AlertCircle, { size: 40, style: { opacity: 0.3 } }), _jsx("p", { style: { fontSize: 14 }, children: "\u6682\u65E0\u6B64\u529F\u80FD\u6743\u9650" }), _jsx("p", { style: { fontSize: 11 }, children: "\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u5206\u914D\u76F8\u5E94\u6743\u9650" })] }));
}
const NAV = [
    { id: 'tools', label: '工具库', icon: _jsx(Wrench, { size: 16 }) },
    { id: 'workflows', label: '工作流', icon: _jsx(GitBranch, { size: 16 }) },
    { id: 'roles-page', label: '角色', icon: _jsx(Users, { size: 16 }) },
    { id: 'agents', label: 'Agent', icon: _jsx(Bot, { size: 16 }) },
    { id: 'chat', label: '💬 对话中心', icon: _jsx(MessageSquare, { size: 16 }) },
    { id: 'control-plane', label: 'Agent 管控', icon: _jsx(Radio, { size: 16 }) },
    { id: 'orchestration', label: '编排', icon: _jsx(Network, { size: 16 }) },
    { id: 'monitor', label: '监控', icon: _jsx(BarChart3, { size: 16 }) },
    { id: 'projects', label: '项目', icon: _jsx(FolderKanban, { size: 16 }) },
    { id: 'knowledge', label: '知识库', icon: _jsx(BookOpen, { size: 16 }) },
    { id: 'approvals', label: '审批', icon: _jsx(Shield, { size: 16 }) },
];
const ADMIN_NAV = [
    { id: 'users', label: '用户管理', icon: _jsx(Shield, { size: 16 }) },
    { id: 'audit', label: '审计日志', icon: _jsx(FileSearch, { size: 16 }) },
];
export default function App() {
    const getInitialNav = () => {
        const path = window.location.pathname;
        if (path.startsWith('/orchestration'))
            return 'orchestration';
        if (path.startsWith('/agents'))
            return 'agents';
        if (path.startsWith('/workflows'))
            return 'workflows';
        return 'projects';
    };
    const [nav, setNav] = useState(getInitialNav);
    const [detailId, setDetailId] = useState(null);
    const [projectDetailId, setProjectDetailId] = useState(null);
    const [workflowDetailId, setWorkflowDetailId] = useState(null);
    const [showWorkflowCreate, setShowWorkflowCreate] = useState(false);
    const [roleDetail, setRoleDetail] = useState(null);
    const [toolDetail, setToolDetail] = useState(null);
    const [agentDetail, setAgentDetail] = useState(null);
    const [agentSaveError, setAgentSaveError] = useState(null);
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
        return _jsx(LoginPage, {});
    }
    useEffect(() => {
        fetchMe().then(() => {
            const state = useAuth.getState();
            if (state.isAdmin)
                fetchUsers();
        });
    }, []);
    const perm = (p) => isAdmin || rolePermissions.includes(p);
    const visibleNav = NAV;
    const visibleAdminNav = ADMIN_NAV.filter(item => {
        switch (item.id) {
            case 'users': return perm('user:manage');
            case 'audit': return perm('audit:view');
            default: return false;
        }
    });
    const navigate = (id) => {
        setNav(id);
        setDetailId(null);
    };
    const openDetail = (changeId) => setDetailId(changeId);
    const renderContent = () => {
        if (agentDetail) {
            var handleSaveAgent = async function (data) {
                var uid = localStorage.getItem('current_user_id') || 'admin';
                setAgentSaveError(null);
                var url = data.id ? '/api/agents/' + data.id : '/api/agents';
                var method = data.id ? 'PUT' : 'POST';
                var res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) });
                if (!res.ok) {
                    var err = await res.json().catch(function () { return { detail: '保存失败 (' + res.status + ')' }; });
                    setAgentSaveError(err.detail || '保存失败');
                    return;
                }
                setAgentDetail(null);
            };
            var handleDeleteAgent = function () {
                if (agentDetail.id) {
                    fetch('/api/agents/' + agentDetail.id, { method: 'DELETE', headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } }).then(function () { setAgentDetail(null); });
                }
            };
            return _jsx(AgentDetail, { agent: agentDetail, onBack: () => { setAgentDetail(null); setAgentSaveError(null); }, onSave: handleSaveAgent, onDelete: agentDetail.id ? handleDeleteAgent : undefined, saveError: agentSaveError });
        }
        if (toolDetail) {
            var handleSaveTool = function (data) {
                var uid = localStorage.getItem('current_user_id') || 'admin';
                if (data.id) {
                    fetch('/api/tools/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function () { setToolDetail(null); });
                }
                else {
                    fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function () { setToolDetail(null); });
                }
            };
            var handleDeleteTool = function () {
                if (toolDetail.id) {
                    fetch('/api/tools/' + toolDetail.id, { method: 'DELETE', headers: { 'X-User-Id': localStorage.getItem('current_user_id') || 'admin' } }).then(function () { setToolDetail(null); });
                }
            };
            return _jsx(ToolDetail, { tool: toolDetail, onBack: () => setToolDetail(null), onSave: handleSaveTool, onDelete: toolDetail.id ? handleDeleteTool : undefined });
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
            var handleSaveRole = function (data) {
                var uid = localStorage.getItem('current_user_id') || 'admin';
                if (data.id) {
                    fetch('/api/roles/custom/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function () { setRoleDetail(null); });
                }
                else {
                    fetch('/api/roles/custom', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Id': uid }, body: JSON.stringify(data) }).then(function () { setRoleDetail(null); });
                }
            };
            var handleDeleteRole = function () {
                if (roleDetail.id) {
                    var uid = localStorage.getItem('current_user_id') || 'admin';
                    fetch('/api/roles/custom/' + roleDetail.id, { method: 'DELETE', headers: { 'X-User-Id': uid } }).then(function () { setRoleDetail(null); });
                }
            };
            return _jsx(RoleDetail, { role: roleDetail, templates: builtinTemplates, onBack: () => setRoleDetail(null), onSave: handleSaveRole, onDelete: roleDetail.id ? handleDeleteRole : undefined });
        }
        if (showWorkflowCreate)
            return _jsx(WorkflowCreate, { onBack: () => setShowWorkflowCreate(false), onCreated: (id) => { setShowWorkflowCreate(false); setWorkflowDetailId(id); } });
        if (workflowDetailId)
            return _jsx(WorkflowDetail, { workflowId: workflowDetailId, onBack: () => setWorkflowDetailId(null) });
        if (projectDetailId)
            return _jsx(ProjectDetail, { projectId: projectDetailId, onBack: () => setProjectDetailId(null), onNavigateAgent: (agent) => {
                    setProjectDetailId(null);
                    setNav('agents');
                    setAgentDetail(agent);
                } });
        if (detailId)
            return _jsx(Detail, { changeId: detailId, onBack: () => setDetailId(null) });
        switch (nav) {
            case 'home': return _jsx(Home, { onSelect: openDetail });
            case 'workflow': return perm('project:write') ? _jsx(WorkflowEditor, {}) : _jsx(EmptyPerm, {});
            case 'roles': return perm('project:write') ? _jsx(Roles, {}) : _jsx(EmptyPerm, {});
            case 'specs': return perm('project:read') ? _jsx(SpecsEditor, { onSelect: (id) => setDetailId(id) }) : _jsx(EmptyPerm, {});
            case 'runtime': return perm('project:read') ? _jsx(Runtime, {}) : _jsx(EmptyPerm, {});
            case 'docs': return perm('project:write') ? _jsx(DocEditor, {}) : _jsx(EmptyPerm, {});
            case 'users': return perm('user:manage') ? _jsx(UserManagement, {}) : _jsx(EmptyPerm, {});
            case 'audit': return perm('audit:view') ? _jsx(AuditLog, {}) : _jsx(EmptyPerm, {});
            case 'tools': return perm('project:read') ? _jsx(ToolMarket, { onSelect: (t) => setToolDetail(t) }) : _jsx(EmptyPerm, {});
            case 'workflows': return perm('project:write') ? _jsx(WorkflowList, { onSelect: function (id) { setWorkflowDetailId(id); }, onCreate: () => setShowWorkflowCreate(true) }) : _jsx(EmptyPerm, {});
            case 'roles-page': return perm('project:read') ? _jsx(RoleMarket, { onSelectRole: (r) => setRoleDetail(r) }) : _jsx(EmptyPerm, {});
            case 'agents': return perm('project:read') ? _jsx(AgentBuilder, { onSelect: (a) => setAgentDetail(a) }) : _jsx(EmptyPerm, {});
            case 'chat': return perm('project:read') ? _jsx(ConversationCenter, {}) : _jsx(EmptyPerm, {});
            case 'control-plane': return _jsx(AgentControlPlane, {});
            case 'orchestration': {
                if (!perm('project:write'))
                    return _jsx(EmptyPerm, {});
                const path = window.location.pathname;
                if (path === '/orchestration/new' || path.match(/\/orchestration\/\d+\/edit/)) {
                    return _jsx(OrchestrationPage, {});
                }
                if (path.match(/\/orchestration\/\d+\/(md|yaml)/)) {
                    return _jsx(OrchDocPage, {});
                }
                return _jsx(OrchestrationListPage, {});
            }
            case 'templates': return perm('project:read') ? _jsx(TemplateMarket, {}) : _jsx(EmptyPerm, {});
            case 'monitor': return perm('project:read') ? _jsx(MonitoringDashboard, {}) : _jsx(EmptyPerm, {});
            case 'projects': return perm('project:read') ? _jsx(ProjectManager, { onSelect: (id) => setProjectDetailId(id) }) : _jsx(EmptyPerm, {});
            case 'profile': return _jsx(UserCenter, { onBack: () => navigate('projects') });
            case 'alerts': return _jsx(AlertsPage, {});
            case 'knowledge': return perm('project:read') ? _jsx(KnowledgeBase, {}) : _jsx(EmptyPerm, {});
            case 'approvals': return perm('project:read') ? _jsx(ApprovalPage, {}) : _jsx(EmptyPerm, {});
            default: return _jsx(ProjectManager, { onSelect: (id) => setProjectDetailId(id) });
        }
    };
    return (_jsxs("div", { style: { display: 'flex', height: '100vh', width: '100vw' }, children: [_jsxs("aside", { style: {
                    width: collapsed ? 48 : 200,
                    background: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column',
                    transition: 'width var(--normal) var(--ease)',
                    flexShrink: 0, overflow: 'hidden',
                }, children: [_jsxs("div", { style: { padding: collapsed ? '12px 10px' : '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { style: { color: 'var(--blue)', fontWeight: 800, fontSize: 16, flexShrink: 0 }, children: "\u25C8" }), !collapsed && _jsx("span", { style: { fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }, children: "AI \u5F00\u53D1\u5E73\u53F0" })] }), _jsxs("nav", { style: { flex: 1, padding: '8px' }, children: [visibleNav.map(item => (_jsxs("button", { onClick: () => navigate(item.id), "aria-label": item.label, style: {
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                                    marginBottom: 2, borderRadius: 'var(--r-sm)',
                                    background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                                    border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                                    cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                                    transition: 'all var(--fast)',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                }, children: [item.icon, !collapsed && _jsx("span", { children: item.label })] }, item.id))), visibleAdminNav.length > 0 && (_jsxs(_Fragment, { children: [!collapsed && (_jsx("div", { style: { padding: '4px 10px', marginTop: 8, marginBottom: 4, fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.06 }, children: "\u7BA1\u7406" })), visibleAdminNav.map(item => (_jsxs("button", { onClick: () => navigate(item.id), "aria-label": item.label, style: {
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                                            marginBottom: 2, borderRadius: 'var(--r-sm)',
                                            background: nav === item.id && !detailId ? 'var(--bg-selected)' : 'transparent',
                                            border: 'none', color: nav === item.id && !detailId ? 'var(--blue)' : 'var(--text-secondary)',
                                            cursor: 'pointer', fontSize: 13, fontWeight: nav === item.id && !detailId ? 600 : 400,
                                            transition: 'all var(--fast)',
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                        }, children: [item.icon, !collapsed && _jsx("span", { children: item.label })] }, item.id)))] }))] }), _jsxs("div", { style: { padding: '8px', borderTop: '1px solid var(--border)' }, children: [_jsxs("button", { onClick: () => navigate('alerts'), "aria-label": "\u544A\u8B66\u4E2D\u5FC3", style: {
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    width: '100%', padding: collapsed ? '8px 0' : '7px 10px',
                                    marginBottom: 6, borderRadius: 'var(--r-sm)',
                                    background: nav === 'alerts' ? 'var(--bg-selected)' : 'transparent',
                                    border: 'none', color: nav === 'alerts' ? 'var(--blue)' : alertCount > 0 ? 'var(--red)' : 'var(--text-secondary)',
                                    cursor: 'pointer', fontSize: 13, fontWeight: nav === 'alerts' ? 600 : 400,
                                    transition: 'all var(--fast)',
                                    justifyContent: collapsed ? 'center' : 'flex-start',
                                    position: 'relative',
                                }, children: [_jsx(Bell, { size: 16 }), !collapsed && _jsx("span", { children: "\u544A\u8B66\u4E2D\u5FC3" }), alertCount > 0 && (_jsx("span", { style: {
                                            position: 'absolute', top: 2, right: collapsed ? -2 : 8,
                                            background: 'var(--red)', color: '#fff', borderRadius: 10,
                                            padding: '0px 5px', fontSize: 10, fontWeight: 700,
                                            minWidth: 16, textAlign: 'center', lineHeight: '16px',
                                        }, children: alertCount > 99 ? '99+' : alertCount }))] }), _jsx(UserArea, { collapsed: collapsed, onNavigateProfile: () => navigate('profile') }), _jsx("button", { onClick: () => setCollapsed(!collapsed), className: "btn btn-ghost btn-sm", style: { width: '100%', marginTop: 6, justifyContent: collapsed ? 'center' : 'flex-start' }, children: collapsed ? _jsx(PanelLeft, { size: 14 }) : _jsxs(_Fragment, { children: [_jsx(ChevronLeft, { size: 14 }), !collapsed && ' 收起'] }) })] })] }), _jsx("main", { style: { flex: 1, overflow: 'auto', background: 'var(--bg-main)' }, children: _jsx(ErrorBoundary, { children: renderContent() }) })] }));
}
