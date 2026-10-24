/**
 * 壳层顶栏（v22-ui-align W1）
 *
 * 对照原型 `.app-top`：左侧 `.crumb`（页面名 · 可选上下文），右侧 `.right`（chip + 主/次动作）。
 * 为什么由 App 统一渲染：127 页原型里这一条是**壳层**，不是页面自己的东西；
 * 页面各写一份 header 就是「切换页面像换了个产品」的根因。
 */
import type { ReactNode } from 'react';

export interface AppTopBarProps {
  /** 页面名（必填，来自导航） */
  crumb: string;
  /** 面包屑里的上下文，例如「当前：agentflow」 */
  context?: string;
  /** 右侧信息 chip（只读元信息） */
  chips?: ReactNode;
  /** 右侧动作（按钮） */
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
