/** 页面级工具行：承载筛选、搜索、视图切换和次要动作，不重复页面标题。 */
import type { ReactNode } from 'react';

export interface ToolbarProps {
  children: ReactNode;
  /** 保持现有布局兼容：将内容放入可伸展区域。 */
  grow?: ReactNode;
}

export default function Toolbar({ children, grow }: ToolbarProps) {
  return (
    <div className="toolbar">
      {children}
      {grow !== undefined && <span className="grow">{grow}</span>}
    </div>
  );
}
