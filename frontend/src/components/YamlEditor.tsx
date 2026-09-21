import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  minHeight?: string;
}

export default function YamlEditor({ value, onChange, readOnly, minHeight = '400px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        yaml(),
        oneDark,
        updateListener,
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly || false)),
        EditorView.theme({
          '&': { height: '100%', fontSize: '12px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" },
          '.cm-scroller': { overflow: 'auto', minHeight },
          '.cm-gutters': { backgroundColor: '#0b0c10', color: '#5d6068', borderRight: '1px solid rgba(255,255,255,0.06)' },
          '.cm-activeLineGutter': { backgroundColor: 'rgba(84,140,240,0.08)' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => view.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly || false)),
      });
    }
  }, [readOnly]);

  useEffect(() => {
    const current = viewRef.current;
    if (current && value !== current.state.doc.toString()) {
      current.dispatch({
        changes: { from: 0, to: current.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
        background: '#0b0c10',
      }}
    />
  );
}
