import { useLayoutEffect, useRef } from 'react';
import { MAX_LABEL_LENGTH, MAX_TEXT_LENGTH } from '@/lib/constants';
import { labelHeight } from '@/lib/fields';
import { FONTS } from '@/lib/fonts';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';

const fontStack = (family: string) => `"${family}", ui-sans-serif, system-ui, sans-serif`;

/**
 * Edits text in place: a textarea for text elements, a single-line input for a field's label.
 * Rendered inside the page, so it scales with zoom exactly like the element underneath it.
 * Esc, Ctrl+Enter, or clicking away commits.
 */
export function InlineEditor() {
  const editingId = useUiStore((s) => s.editingId);
  const el = useDocStore((s) => s.doc.elements.find((e) => e.id === editingId));
  if (!el || (el.type !== 'text' && el.type !== 'field')) return null;
  return el.type === 'text' ? (
    <TextEditor key={el.id} id={el.id} />
  ) : (
    <LabelEditor key={el.id} id={el.id} />
  );
}

function useCommit(id: string, kind: 'text' | 'label') {
  const done = useRef(false);
  return (value: string) => {
    if (done.current) return;
    done.current = true;
    const fallback = kind === 'text' ? 'Text' : 'Untitled';
    const next = value.trim() === '' ? fallback : value;
    useDocStore.getState().updateElement(id, kind === 'text' ? { text: next } : { label: next });
    useUiStore.getState().setEditingId(null);
  };
}

function TextEditor({ id }: { id: string }) {
  const el = useDocStore((s) => s.doc.elements.find((e) => e.id === id));
  const ref = useRef<HTMLTextAreaElement>(null);
  const commit = useCommit(id, 'text');

  const grow = () => {
    const node = ref.current;
    if (!node) return;
    node.style.height = '0px';
    node.style.height = `${node.scrollHeight}px`;
  };
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.focus();
    node.select();
    grow();
  }, []);

  if (!el || el.type !== 'text') return null;
  return (
    <textarea
      ref={ref}
      aria-label="Edit text"
      defaultValue={el.text}
      maxLength={MAX_TEXT_LENGTH}
      spellCheck={false}
      onInput={grow}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
          event.preventDefault();
          commit(event.currentTarget.value);
        }
      }}
      className="doc-text"
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        minHeight: el.height,
        margin: 0,
        padding: 0,
        border: 'none',
        outline: '1px solid var(--selection)',
        outlineOffset: 2,
        resize: 'none',
        overflow: 'hidden',
        background: 'transparent',
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        fontFamily: fontStack(FONTS[el.fontFamily].family),
        fontSize: el.fontSize,
        fontWeight: el.fontWeight,
        color: el.color,
        textAlign: el.align,
        lineHeight: `${el.fontSize * el.lineHeight}px`,
        zIndex: 10,
      }}
    />
  );
}

function LabelEditor({ id }: { id: string }) {
  const el = useDocStore((s) => s.doc.elements.find((e) => e.id === id));
  const ref = useRef<HTMLInputElement>(null);
  const commit = useCommit(id, 'label');
  useLayoutEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  if (!el || el.type !== 'field') return null;
  const ls = el.labelStyle;
  const height = labelHeight(ls.fontSize);
  return (
    <input
      ref={ref}
      aria-label="Edit label"
      defaultValue={el.label}
      maxLength={MAX_LABEL_LENGTH}
      spellCheck={false}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter') {
          event.preventDefault();
          commit(event.currentTarget.value);
        }
      }}
      className="doc-text"
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height,
        margin: 0,
        padding: 0,
        border: 'none',
        outline: '1px solid var(--selection)',
        outlineOffset: 2,
        background: 'transparent',
        boxSizing: 'border-box',
        fontFamily: fontStack(FONTS[ls.fontFamily].family),
        fontSize: ls.fontSize,
        fontWeight: ls.fontWeight,
        color: ls.color,
        lineHeight: `${height}px`,
        zIndex: 10,
      }}
    />
  );
}
