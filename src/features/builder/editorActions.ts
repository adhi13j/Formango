import { toast } from 'sonner';
import { MAX_ELEMENTS } from '@/lib/constants';
import { newElementId } from '@/lib/elements';
import { alignElements, distributeElements, type AlignMode, type Axis } from '@/lib/geometry';
import { slugify, uniqueSlug } from '@/lib/slug';
import {
  beginBatch,
  endBatch,
  redo,
  undo,
  useDocStore,
  type HistoryBatch,
  type ReorderMode,
} from '@/store/docStore';
import { clampZoom, useUiStore } from '@/store/uiStore';
import type { DocElement } from '@/types/doc';
import { getCanvas } from './canvasBridge';

export const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
export const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2];
export const PASTE_OFFSET = 16;

export function selectedElements(): DocElement[] {
  const { selectedIds } = useUiStore.getState();
  return useDocStore.getState().doc.elements.filter((el) => selectedIds.includes(el.id));
}

export function deleteSelection(): void {
  const ids = selectedElements()
    .filter((el) => !el.locked)
    .map((el) => el.id);
  if (ids.length === 0) return;
  useDocStore.getState().removeElements(ids);
  useUiStore.getState().clearSelection();
}

export function duplicateSelection(): void {
  const ids = selectedElements().map((el) => el.id);
  if (ids.length === 0) return;
  const copies = useDocStore.getState().duplicateElements(ids);
  if (copies.length < ids.length) toast.error(`A form can have up to ${MAX_ELEMENTS} elements.`);
  if (copies.length > 0) useUiStore.getState().select(copies);
}

export function copySelection(): void {
  const els = selectedElements();
  if (els.length > 0) useUiStore.getState().setClipboard(structuredClone(els));
}

export function cutSelection(): void {
  copySelection();
  deleteSelection();
}

export function pasteClipboard(): void {
  const ui = useUiStore.getState();
  if (ui.clipboard.length === 0) return;
  const step = ui.pasteCount + 1;
  const doc = useDocStore.getState().doc;
  const usedKeys = new Set(doc.elements.flatMap((el) => (el.type === 'field' ? [el.key] : [])));
  const copies = ui.clipboard.map((el): DocElement => {
    const copy = {
      ...structuredClone(el),
      id: newElementId(),
      x: el.x + PASTE_OFFSET * step,
      y: el.y + PASTE_OFFSET * step,
    };
    if (copy.type === 'field') {
      copy.key = uniqueSlug(slugify(copy.key, 'field'), usedKeys);
      usedKeys.add(copy.key);
    }
    return copy;
  });
  const added = useDocStore.getState().addElements(copies);
  if (added < copies.length) toast.error(`A form can have up to ${MAX_ELEMENTS} elements.`);
  useUiStore.setState({ pasteCount: step });
  if (added > 0) ui.select(copies.slice(0, added).map((c) => c.id));
}

export function selectAll(): void {
  const ids = useDocStore
    .getState()
    .doc.elements.filter((el) => !el.locked && !el.hidden)
    .map((el) => el.id);
  useUiStore.getState().select(ids);
}

export function reorderSelection(mode: ReorderMode): void {
  const ids = selectedElements().map((el) => el.id);
  if (ids.length > 0) useDocStore.getState().reorder(ids, mode);
}

export function alignSelection(mode: AlignMode): void {
  const els = selectedElements().filter((el) => !el.locked);
  const patches = alignElements(els, mode);
  useDocStore.getState().updateElements(patches.map(({ id, ...patch }) => ({ id, patch })));
}

export function distributeSelection(axis: Axis): void {
  const els = selectedElements().filter((el) => !el.locked);
  const patches = distributeElements(els, axis);
  useDocStore.getState().updateElements(patches.map(({ id, ...patch }) => ({ id, patch })));
}

// ---- nudging: holding an arrow key is one undo step -----------------------------------------

let nudgeBatch: HistoryBatch | null = null;

export function nudgeSelection(dx: number, dy: number): void {
  const els = selectedElements().filter((el) => !el.locked);
  if (els.length === 0) return;
  nudgeBatch ??= beginBatch();
  useDocStore
    .getState()
    .updateElements(els.map((el) => ({ id: el.id, patch: { x: el.x + dx, y: el.y + dy } })));
}

export function endNudge(): void {
  if (!nudgeBatch) return;
  endBatch(nudgeBatch);
  nudgeBatch = null;
}

// ---- zoom -----------------------------------------------------------------------------------

export function zoomIn(): void {
  const { zoom, setZoom } = useUiStore.getState();
  setZoom(ZOOM_STEPS.find((step) => step > zoom + 0.001) ?? zoom);
}

export function zoomOut(): void {
  const { zoom, setZoom } = useUiStore.getState();
  setZoom([...ZOOM_STEPS].reverse().find((step) => step < zoom - 0.001) ?? zoom);
}

export function zoomTo(value: number): void {
  useUiStore.getState().setZoom(clampZoom(value));
}

export function zoomToFit(): void {
  useUiStore.setState({ fitMode: true });
}

export { undo, redo, getCanvas };
