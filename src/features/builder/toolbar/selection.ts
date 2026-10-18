import { useMemo } from 'react';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { DocElement, ElementType } from '@/types/doc';

/** Value shown when the selected elements disagree. */
export const MIXED = Symbol('mixed');
export type Mixed = typeof MIXED;

export function useSelectedElements(): DocElement[] {
  const selectedIds = useUiStore((s) => s.selectedIds);
  const elements = useDocStore((s) => s.doc.elements);
  return useMemo(
    () => elements.filter((el) => selectedIds.includes(el.id)),
    [elements, selectedIds],
  );
}

export type OfType<T extends ElementType> = Extract<DocElement, { type: T }>;

export function allOfType<T extends ElementType>(els: DocElement[], type: T): els is OfType<T>[] {
  return els.length > 0 && els.every((el) => el.type === type);
}

/** The shared value of `get` across `els`, or MIXED when they differ. */
export function commonValue<E, V>(els: readonly E[], get: (el: E) => V): V | Mixed {
  const [first, ...rest] = els;
  if (first === undefined) return MIXED;
  const value = get(first);
  return rest.every((el) => Object.is(get(el), value)) ? value : MIXED;
}

/** Applies one patch to every element. Each toolbar control goes through here (one undo step). */
export function patchAll(els: readonly DocElement[], patch: Partial<DocElement>): void {
  useDocStore.getState().updateElements(els.map((el) => ({ id: el.id, patch })));
}

export function patchEach(
  els: readonly DocElement[],
  make: (el: DocElement) => Partial<DocElement>,
): void {
  useDocStore.getState().updateElements(els.map((el) => ({ id: el.id, patch: make(el) })));
}
