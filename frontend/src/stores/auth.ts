import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';

export interface UserInfo {
  id: string; name: string; role: string;
  project_ids: string[]; custom_permissions: string[]; created_at: string; active: boolean;
}

interface AuthState {
  currentUser: UserInfo | null;
  userList: UserInfo[];
  isAdmin: boolean;
  /** true = 已向服务端问过身份（无论有没有会话）；页面据此决定登录页/主体 */
  loaded: boolean;
  /** 服务端 must_change_password：true 时除 /api/auth/* 外全被 403 */
  mustChangePassword: boolean;
  rolePermissions: string[];
  permissionDefs: Record<string, { name: string; description: string; dangerous: boolean }>;
  fetchMe: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  currentUser: null,
  userList: [],
  isAdmin: false,
  loaded: false,
  mustChangePassword: false,
  rolePermissions: [],
  permissionDefs: {},

  /**
   * 身份的**唯一真相源**是服务端会话（HttpOnly cookie）：
   * 不再读 localStorage，也不再有「本地有 id 就算登录」。
   */
  fetchMe: async () => {
    // redirectOn401:false —— 探针自己处理 401，不能触发 safeFetch 的整页刷新
    const result = await safeFetch('/api/auth/me', { credentials: 'same-origin' }, { redirectOn401: false });
    if (result.ok && result.data) {
      const u = result.data.user;
      set({
        currentUser: u,
        isAdmin: u?.role === 'admin',
        loaded: true,
        mustChangePassword: !!result.data.must_change_password,
        rolePermissions: result.data.role_permissions || [],
        permissionDefs: result.data.permissions || {} });
    } else {
      set({
        currentUser: null, isAdmin: false, loaded: true, mustChangePassword: false,
        rolePermissions: [], permissionDefs: {} });
    }
  },

  fetchUsers: async () => {
    const result = await safeFetch('/api/auth/users', { credentials: 'same-origin' });
    if (result.ok && result.data) {
      set({ userList: result.data.users || [] });
    } else if (result.status === 403) {
      set({ userList: [] });
    }
  },

  logout: async () => {
    // 先吊销服务端会话，再清前端状态（顺序反了会留下「服务端还认为你登录着」）
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // 网络失败也要把界面退回登录页
    }
    set({
      currentUser: null, isAdmin: false, loaded: true, mustChangePassword: false,
      rolePermissions: [], permissionDefs: {}, userList: [] });
    window.location.reload();
  } }));

/** 请求头（身份由 cookie 携带，这里只声明 JSON）。 */
export function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}
