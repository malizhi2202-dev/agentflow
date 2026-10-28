import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** 页面唯一的一级标题 */
  title: ReactNode;
  /** 标题下方的页面上下文，例如资源类型、范围或当前模式 */
  context?: ReactNode;
  /** 标题下方的真实摘要或状态说明 */
  summary?: ReactNode;
  /** 标题区最多一个主动作 */
  action?: ReactNode;
  /** 挂载后将焦点移入标题，适用于详情 / 编辑覆盖态 */
  autoFocus?: boolean;
  className?: string;
}

export default function PageHeader({
  title,
  context,
  summary,
  action,
  autoFocus = false,
  className,
}: PageHeaderProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shouldFocus = autoFocus;

  useEffect(function focusPageTitle() {
    if (shouldFocus) {
      titleRef.current?.focus();
    }
  }, [shouldFocus]);

  return (
    <header className={className ? `app-body page-header ${className}` : 'app-body page-header'}>
      <div className="toolbar">
        <div className="grow">
          <h1 ref={titleRef} className="page-title" tabIndex={-1}>
            {title}
          </h1>
          {context && <div className="page-note">{context}</div>}
          {summary && <div className="page-note">{summary}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
