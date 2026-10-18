import type { CSSProperties } from 'react';
import type { DocElement } from '@/types/doc';

/**
 * edit: inert, the canvas layer handles pointers. preview: interactive, nothing is saved.
 * fill: interactive and validated, answers are submitted.
 */
export type ElementMode = 'edit' | 'preview' | 'fill';

export type AnswerValue = string | string[];

export interface ElementViewProps {
  el: DocElement;
  mode: ElementMode;
  /** Current answer for fields in preview and fill modes. */
  value?: AnswerValue | undefined;
  /** Validation message for fields in fill mode. */
  error?: string | undefined;
  /** Called with undefined when the answer becomes empty. Must be a stable function. */
  onAnswer?: ((id: string, value: AnswerValue | undefined) => void) | undefined;
  /** Repeating groups only: errors of single cells, keyed by cell id. */
  cellErrors?: Record<string, string> | undefined;
  /** Called when the submit button is pressed in preview and fill modes. Must be stable. */
  onSubmit?: (() => void) | undefined;
  /** Hide the text because an in-place editor is drawn on top of it. */
  editing?: boolean | undefined;
}

export function rootStyle(el: DocElement): CSSProperties {
  return {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.width,
    height: el.height,
    boxSizing: 'border-box',
  };
}

export function fontStack(family: string): string {
  return `"${family}", ui-sans-serif, system-ui, sans-serif`;
}
