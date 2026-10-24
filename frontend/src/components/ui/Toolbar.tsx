/** 页面级工具行（v22-ui-align W1）：动作与筛选放这里，页面名只出现在壳层 .crumb。 */
import type { ReactNode } from 'react';

export default function Toolbar({ children, grow }: { children: ReactNode; grow?: ReactNode }) {
  return (
    <div className="toolbar">
      {children}
      {grow !== undefined && <span className="grow">{grow}</span>}
    </div>
  );
}
