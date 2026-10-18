import { toast } from 'sonner';
import { MAX_ELEMENTS } from '@/lib/constants';
import { createElement, type NewElementKind } from '@/lib/elements';
import type { Point } from '@/lib/geometry';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';
import { getCanvas } from './canvasBridge';

let lastAdd: { kind: string; count: number } = { kind: '', count: 0 };

/** Centers a new element on `center`, then offsets repeated adds so they never stack exactly. */
function placeAt(el: DocElement, center: Point, kind: string): DocElement {
  lastAdd = lastAdd.kind === kind ? { kind, count: lastAdd.count + 1 } : { kind, count: 0 };
  const offset = (lastAdd.count % 8) * 16;
  return {
    ...el,
    x: Math.round(center.x - el.width / 2 + offset),
    y: Math.round(center.y - el.height / 2 + offset),
  };
}

/** Adds an element and selects it. Click adds at the visible center, drag-and-drop passes `at`. */
export function addElementToPage(kind: NewElementKind, at?: Point): string | null {
  return addPreparedElement(kind, createElement(kind, useDocStore.getState().doc), at);
}

export function addPreparedElement(kind: string, el: DocElement, at?: Point): string | null {
  const store = useDocStore.getState();
  if (store.doc.elements.length >= MAX_ELEMENTS) {
    toast.error(`A form can have up to ${MAX_ELEMENTS} elements.`);
    return null;
  }
  const center = at ?? getCanvas()?.visibleCenter() ?? { x: el.x, y: el.y };
  const placed = at
    ? { ...el, x: Math.round(at.x - el.width / 2), y: Math.round(at.y - el.height / 2) }
    : placeAt(el, center, kind);
  if (!store.addElement(placed)) return null;
  // The store normalizes (clamps) on add, so read the final element back for selection and reveal.
  const added = useDocStore.getState().doc.elements.find((e) => e.id === placed.id);
  useUiStore.getState().select([placed.id]);
  if (added) getCanvas()?.reveal(added);
  return placed.id;
}
