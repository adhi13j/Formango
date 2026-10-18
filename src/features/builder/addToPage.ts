import { toast } from 'sonner';
import { MAX_ELEMENTS } from '@/lib/constants';
import { createElement, type NewElementKind } from '@/lib/elements';
import { rectOf, rectsIntersect, type Point } from '@/lib/geometry';
import { findSubmitButton, SUBMIT_GAP } from '@/lib/submitButton';
import { beginBatch, endBatch, useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';
import { getCanvas } from './canvasBridge';

const SPOT_GAP = 16;

/**
 * Centers a new element on `center`. If that would cover something already on the page, it slides
 * below what it overlaps, so repeated adds never stack on top of each other.
 */
function placeAt(el: DocElement, center: Point): DocElement {
  const { elements, page } = useDocStore.getState().doc;
  // On growing (mobile) pages the submit button moves down instead of blocking new elements.
  const blockers = page.autoHeight ? elements.filter((other) => other.type !== 'button') : elements;
  const x = Math.round(center.x - el.width / 2);
  let y = Math.round(center.y - el.height / 2);
  for (let attempt = 0; attempt < elements.length + 1; attempt += 1) {
    const candidate = { x, y, width: el.width, height: el.height };
    const blocker = blockers.find(
      (other) => !other.hidden && rectsIntersect(candidate, rectOf(other)),
    );
    if (!blocker) break;
    y = blocker.y + blocker.height + SPOT_GAP;
  }
  return { ...el, x, y };
}

/**
 * On a mobile form the submit button sits at the end. When something is added at or below it,
 * the button slides down to stay last (in the same undo step as the add).
 */
function keepSubmitBelow(addedId: string): void {
  const { doc } = useDocStore.getState();
  const added = doc.elements.find((el) => el.id === addedId);
  const button = findSubmitButton(doc);
  if (!added || !button || button.locked || !doc.page.autoHeight || added.type === 'button') return;
  const bottom = added.y + added.height + SUBMIT_GAP;
  if (bottom > button.y) useDocStore.getState().updateElement(button.id, { y: bottom });
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
  const batch = beginBatch();
  const accepted = store.addElement(placed);
  if (accepted) keepSubmitBelow(placed.id);
  endBatch(batch);
  if (!accepted) return null;
  // The store normalizes (clamps) on add, so read the final element back for selection and reveal.
  const added = useDocStore.getState().doc.elements.find((e) => e.id === placed.id);
  useUiStore.getState().select([placed.id]);
  if (added) getCanvas()?.reveal(added);
  getCanvas()?.focus();
  return placed.id;
}
