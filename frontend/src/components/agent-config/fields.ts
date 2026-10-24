/**
 * 十六分区共用的表单排布常量。
 *
 * 为什么不做成组件库：输入框/下拉/多行框的**视觉**已经由 tokens.css 全局接管
 * （`input, select, textarea { background/border/radius/padding }`），这里只补排布
 * （标签、两列/三列网格、等宽框、说明文字），避免十六个分区各写一份内联对象。
 */
import type { CSSProperties } from 'react';

export const F = {
  label: { fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 } as CSSProperties,
  full: { width: '100%', boxSizing: 'border-box' } as CSSProperties,
  hint: { fontSize: 10.5, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.6 } as CSSProperties,
  err: { fontSize: 11, color: 'var(--red)', margin: '4px 0 0' } as CSSProperties,
  mono: { fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.6, resize: 'vertical', width: '100%', boxSizing: 'border-box' } as CSSProperties,
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as CSSProperties,
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } as CSSProperties,
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 } as CSSProperties,
  /** 环境变量的行：键 + 值 + 改值/还原 + 删除 */
  envRow: { display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 6, alignItems: 'center' } as CSSProperties,
  /** CLI 参数的行：一项 + 删除 */
  lineRow1: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'center' } as CSSProperties,
};
