/** 面板容器（v22-ui-align W1）——对应原型 `.panel`，替代每页重复的 panel 内联对象。 */
import type { CSSProperties, ReactNode } from 'react';

export default function Panel({ children, label, style }:
  { children: ReactNode; label?: string; style?: CSSProperties }) {
  return (
    <section className="panel" aria-label={label} style={style}>
      {children}
    </section>
  );
}
