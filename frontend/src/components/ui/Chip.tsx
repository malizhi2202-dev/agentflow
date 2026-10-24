/** 状态/元信息 chip（v22-ui-align W1）——对应原型 `.chip`，语义类见 styles/ui.css。 */
import type { ReactNode } from 'react';

export type ChipTone = 'default' | 'ok' | 'bad' | 'warn' | 'info' | 'mono';

export default function Chip({ tone = 'default', children, title }:
  { tone?: ChipTone; children: ReactNode; title?: string }) {
  const cls = tone === 'default' ? 'chip' : `chip ${tone}`;
  return <span className={cls} title={title}>{children}</span>;
}
