import { create } from 'zustand';
import { safeFetch } from '../utils/requestDedup';
function getUserId() {
    return localStorage.getItem('current_user_id') || '';
}
export const useAuth = create((set, get) => ({
    currentUser: null,
    userList: [],
    isAdmin: false,
    loaded: false,
    rolePermissions: [],
    permissionDefs: {},
    fetchMe: async () => {
        const uid = getUserId();
        if (!uid) {
            set({ loaded: true });
            return;
        }
        const result = await safeFetch('/api/auth/me');
        if (result.ok && result.data) {
            const u = result.data.user;
            set({
                currentUser: u,
                isAdmin: u?.role === 'admin',
                loaded: true,
                rolePermissions: result.data.role_permissions || [],
                permissionDefs: result.data.permissions || {},
            });
        }
        else if (result.status === 401) {
            localStorage.removeItem('current_user_id');
            set({ loaded: true });
        }
        else {
            set({ loaded: true });
        }
    },
    fetchUsers: async () => {
        const uid = getUserId();
        if (!uid)
            return;
        const result = await safeFetch('/api/auth/users');
        if (result.ok && result.data) {
            set({ userList: result.data.users || [] });
        }
        else if (result.status === 403) {
            set({ userList: [] });
        }
        // silently ignore other errors
    },
    logout: () => {
        localStorage.removeItem('current_user_id');
        set({ currentUser: null, isAdmin: false, loaded: false, rolePermissions: [], userList: [] });
        window.location.reload();
    },
}));
export function authHeaders() {
    const uid = localStorage.getItem('current_user_id') || 'admin';
    return { 'X-User-Id': uid, 'Content-Type': 'application/json' };
}
