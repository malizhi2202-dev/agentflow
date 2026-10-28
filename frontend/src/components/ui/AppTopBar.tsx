/**
 * 壳层顶栏（v27-ui-rework）：只承载全局上下文与全局动作。
 * 页面级标题由 PageHeader 负责，避免壳层与页面重复渲染 h1。
 */
import type { ReactNode } from 'react';

export interface AppTopBarProps {
  /** 全局壳层标签（通常来自导航），不是页面级标题 */
  crumb: string;
  /** 壳层上下文，例如「当前：agentflow」或「详情」 */
  context?: string;
  /** 右侧全局只读信息 */
  chips?: ReactNode;
  /** 右侧全局动作 */
  actions?: ReactNode;
}

export default function AppTopBar({ crumb, context, chips, actions }: AppTopBarProps) {
  return (
    <div className="app-top" role="banner">
      <span className="crumb">
        {crumb}
        {context && <span className="dim"> · {context}</span>}
      </span>
      {(chips || actions) && (
        <span className="right">
          {chips}
          {actions}
        </span>
      )}
    </div>
  );
}
