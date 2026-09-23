import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

// 能力组折叠头 —— 只承载「分组展示」：组名 / 健康概要（N healthy / M total）/ 展开箭头。
// 路由、扩容、排队属**操作面**，按 T-FIX-05（F11）从本组件里拆出去，由调用方经 `actions` 插槽注入，
// 操作态自己从 `stores/domains.ts` 的选择器取，不逐层透传。
//
// ⚠️ 键盘可达 / ARIA 展开态属性属 T-FIX-06，本文件不代为修改（R7.1）：
//    可点击元素今天仍是 div（搬自 AgentControlPlane.tsx 的原折叠头），T-FIX-06 的改造落点就在这里。

export interface CapabilityGroupHeaderProps {
  /** 归一后的能力名（或 `未分类`） */
  capability: string;
  /** 生命周期口径的健康计数（判定语义住在页面层的 isAgentHealthy，F10 要求不得改动） */
  healthyCount: number;
  /** 组内 Agent 总数 */
  totalCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  /** 操作面插槽（路由 / 扩容 / 排队） */
  actions?: ReactNode;
}

export default function CapabilityGroupHeader({
  capability,
  healthyCount,
  totalCount,
  isExpanded,
  onToggle,
  actions,
}: CapabilityGroupHeaderProps) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--s2)',
        padding: 'var(--s2) var(--s3)', cursor: 'pointer',
        background: isExpanded ? 'var(--bg-selected)' : 'var(--bg-input)',
        transition: 'background 0.15s', userSelect: 'none',
        borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
      }}
    >
      <span style={{
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
      }}>
        <ChevronRight size={14} />
      </span>
      <span style={{ fontWeight: 600, fontSize: 12, flex: 1, color: 'var(--text)' }}>
        📦 {capability}
      </span>
      <span style={{
        fontSize: 10, color: healthyCount === totalCount ? 'var(--green)' : 'var(--orange)',
        background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 'var(--r-md)',
        fontWeight: 500,
      }}>
        {healthyCount} healthy / {totalCount} total
      </span>
      {actions}
    </div>
  );
}
