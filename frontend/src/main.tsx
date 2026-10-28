import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/ui.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';

// v27：浅色是默认主题；保留用户已选择的主题，并在 React 挂载前同步根节点，避免首屏闪烁。
const initialTheme = window.localStorage.getItem('theme') || 'light';
if (!window.localStorage.getItem('theme')) window.localStorage.setItem('theme', initialTheme);
document.documentElement.setAttribute('data-theme', initialTheme);

// P0-1：身份由服务端签发、随 HttpOnly cookie 自动携带（同源 fetch 默认带 cookie）。
// 原来的「全局注入 X-User-Id」拦截器已删除——它让前端自己声明自己是谁。

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
