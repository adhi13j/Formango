import { toast } from 'sonner';
import { MAX_ELEMENTS } from '@/lib/constants';
import { createElement, type NewElementKind } from '@/lib/elements';
import { rectOf, rectsIntersect, type Point } from '@/lib/geometry';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';
import { getCanvas } from './canvasBridge';

const SPOT_GAP = 16;

/**
 * Centers a new element on `center`. If that would cover something already on the page, it slides
 * below what it overlaps, so repeated adds never stack on top of each other.
 */
function placeAt(el: DocElement, center: Point): DocElement {
  const { elements } = useDocStore.getState().doc;
  const x = Math.round(center.x - el.width / 2);
  let y = Math.round(center.y - el.height / 2);
  for (let attempt = 0; attempt < elements.length + 1; attempt += 1) {
    const candidate = { x, y, width: el.width, height: el.height };
    const blocker = elements.find(
      (other) => !other.hidden && rectsIntersect(candidate, rectOf(other)),
    );
    if (!blocker) break;
    y = blocker.y + blocker.height + SPOT_GAP;
  }
  return { ...el, x, y };
}

/** Adds an element and selects it. Click adds at the visible center, drag-and-drop passes `at`. */
export function addElementToPage(kind: NewElementKind, at?: Point): string | null {
  return addPreparedElement(kind, createElement(kind, useDocStore.getState().doc), at);
}

export function addPreparedElement(_kind: string, el: DocElement, at?: Point): string | null {
  const store = useDocStore.getState();
  if (store.doc.elements.length >= MAX_ELEMENTS) {
    toast.error(`A form can have up to ${MAX_ELEMENTS} elements.`);
    return null;
  }
  const center = at ?? getCanvas()?.visibleCenter() ?? { x: el.x, y: el.y };
  const placed = at
    ? { ...el, x: Math.round(at.x - el.width / 2), y: Math.round(at.y - el.height / 2) }
    : placeAt(el, center);
  if (!store.addElement(placed)) return null;
  // The store normalizes (clamps) on add, so read the final element back for selection and reveal.
  const added = useDocStore.getState().doc.elements.find((e) => e.id === placed.id);
  useUiStore.getState().select([placed.id]);
  if (added) getCanvas()?.reveal(added);
  getCanvas()?.focus();
  return placed.id;
}
