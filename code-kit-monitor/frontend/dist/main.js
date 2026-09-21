import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
// ── 全局 fetch 拦截器：自动注入 X-User-Id ──
// 从此所有 fetch 调用无需手动加 authHeaders()，身份自动携带。
// 登录页（无 current_user_id）不注入 header，后端默认 admin。
const _fetch = window.fetch;
window.fetch = function (input, init) {
    const uid = localStorage.getItem('current_user_id');
    if (uid) {
        init = init || {};
        const headers = new Headers(init.headers || {});
        if (!headers.has('X-User-Id')) {
            headers.set('X-User-Id', uid);
        }
        init.headers = headers;
    }
    return _fetch(input, init);
};
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
