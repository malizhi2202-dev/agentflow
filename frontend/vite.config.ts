import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 本机 inotify watch 预算被多套 dev server / 编辑器吃满时，vite 会以 ENOSPC 起不来
  // （2026-10-25 实测：max_user_watches=65152）。所以显式忽略 node_modules/dist（3.6 万文件的坑），
  // 并允许用 VITE_WATCH_POLLING=1 退回轮询（不占 inotify watch）。
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
    watch: process.env.VITE_WATCH_POLLING === '1'
      ? { usePolling: true, interval: 400, ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'] }
      : { ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    // 覆盖率门：只统计 src，排除测试与入口（v21 T-04）
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/main.tsx'],
    },
  },
});
