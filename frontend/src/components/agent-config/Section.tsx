/**
 * 分区外壳与辅助件（v26-agent-ui 起：页首「分区直达」锚点条 AnchorBar 已退场）。
 *
 * 为什么需要外壳：各分区必须**同一个形态**（panel + 分区标题 + 说明 + 可选「未接入」标），
 * 否则每区各自写内联块就会重演「27 页 h1/19 页 h2 混用」那笔债。这里只暴露三个口子：
 * 锚点 id（与升格原型 secN 对齐）、编号标题、可选的「未接入」说明。
 *
 * 为什么删了 AnchorBar：详情/创建改成分组 tab 后，「分区直达」的职责由 5+7 子栏承接
 * （见 `components/agent-detail/panes.ts`）；`meta.ts` 的 SECTIONS 编号与 secN 锚点 id **保留**，
 * 与原型 `agent-detail__config.html` 仍可逐字对照、深链 #secN 在所在子栏内依然有效。
 */
import type { ReactNode } from 'react';

/** 分区外壳：`<section class="panel" id="secN">`，标题用 h3（页面名归壳层 .crumb，这里只是分区标题） */
export function Section({ id, no, title, note, extra, children }: {
  id: string;
  no: number;
  title: string;
  note?: ReactNode;
  /** 标题右侧的 chip（数据来源 / 写路径 / 未接入标记） */
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel" id={id} aria-labelledby={id + '-title'} style={{ scrollMarginTop: 56 }}>
      <div className="toolbar" style={{ marginBottom: 6 }}>
        <h3 className="section-title" id={id + '-title'} style={{ fontSize: 13, color: 'var(--text)', margin: 0 }}>
          {no ? no + ' · ' + title : title}
        </h3>
        <span className="grow" />
        {extra}
      </div>
      {note ? <div className="page-note" style={{ marginBottom: 8 }}>{note}</div> : null}
      {children}
    </section>
  );
}

/**
 * 「未接入」标：原型里凡后端无对应能力的字段都必须如实标注，禁止塞示例数据冒充。
 * 口径统一走这一个组件，验收时数「未接入」个数即可，不用逐区猜文案。
 */
export function Unwired({ children }: { children?: ReactNode }) {
  return (
    <p className="page-note" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '6px 0' }}>
      <span className="chip warn" style={{ flex: '0 0 auto' }}>未接入</span>
      <span>{children}</span>
    </p>
  );
}

/** 只读字段行（「标签 + 值」的紧凑两列），用于 ID / 状态 / owner / 创建时间这类不可编辑项 */
export function ReadRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr', gap: 8, alignItems: 'baseline', padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
      <span className={mono ? 'chip mono' : undefined} style={mono ? { justifySelf: 'flex-start' } : { fontSize: 12 }}>
        {value}
      </span>
    </div>
  );
}
