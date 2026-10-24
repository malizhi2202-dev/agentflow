/**
 * 分区外壳与页首锚点条。
 *
 * 为什么需要外壳：十六个分区必须**同一个形态**（panel + 分区标题 + 说明 + 可选「未接入」标），
 * 否则每区各自写内联块就会重演「27 页 h1/19 页 h2 混用」那笔债。这里只暴露三个口子：
 * 锚点 id（与原型 secN 对齐）、编号标题、可选的「未接入」说明。
 */
import type { ReactNode } from 'react';
import { SECTIONS, IM_ANCHOR_NOTE } from './meta';

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

/**
 * 页首「分区直达」锚点条。
 *
 * 16 条链接对应 16 个分区锚点；9A（集成 · IM 通道）不单列链接，用一条说明对齐原型编号
 * （见 meta.ts IM_ANCHOR_NOTE）。链接用真 `<a href="#...">`，因此浏览器原生跳转/复制 URL 都可用，
 * 不额外写 scrollIntoView 脚本。
 */
export function AnchorBar() {
  return (
    <nav className="panel" aria-label="分区直达" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span className="chip info">分区直达</span>
      {SECTIONS.map(function (s) {
        return (
          <a key={s.id} href={'#' + s.id} className="chip" style={{ textDecoration: 'none' }}>
            {s.no} {s.title}
          </a>
        );
      })}
      <span className="page-note" style={{ flexBasis: '100%', marginTop: 4 }}>{IM_ANCHOR_NOTE}</span>
    </nav>
  );
}
