import { create } from 'zustand';
import { temporal } from 'zundo';
import { HISTORY_LIMIT, MAX_ELEMENTS, MAX_TITLE_LENGTH } from '@/lib/constants';
import { newElementId, pageForPreset } from '@/lib/elements';
import { slugify, uniqueSlug } from '@/lib/slug';
import { normalizeDoc, normalizeElement, shallowEqual } from '@/lib/normalize';
import type { DocElement, FormDoc, PagePreset, PageSettings } from '@/types/doc';
import { createBlankDoc } from '@/types/doc.schema';

export type ReorderMode = 'front' | 'forward' | 'backward' | 'back';

/** Fields that can change on any element type. Used by the typed `patch` of updateElement. */
export type ElementPatch = Partial<DocElement>;

export interface DocState {
  doc: FormDoc;
  /** Replaces the document and forgets all history (startup, restore). */
  loadDoc: (doc: FormDoc) => void;
  /** Replaces the document as one undoable step (import, template, new design). */
  replaceDoc: (doc: FormDoc) => void;
  newDoc: (preset: PagePreset) => void;
  setTitle: (title: string) => void;
  setPage: (patch: Partial<PageSettings>) => void;
  switchPreset: (preset: PagePreset) => void;
  /** Returns false when the element limit is reached. */
  addElement: (el: DocElement) => boolean;
  addElements: (els: DocElement[]) => number;
  updateElement: (id: string, patch: ElementPatch) => void;
  updateElements: (patches: { id: string; patch: ElementPatch }[]) => void;
  removeElements: (ids: string[]) => void;
  /** Returns the ids of the new copies. */
  duplicateElements: (ids: string[]) => string[];
  reorder: (ids: string[], mode: ReorderMode) => void;
  setLocked: (ids: string[], locked: boolean) => void;
  setHidden: (ids: string[], hidden: boolean) => void;
  renameElement: (id: string, name: string) => void;
}

export const DUPLICATE_OFFSET = 16;

function withElements(doc: FormDoc, elements: DocElement[]): FormDoc {
  return elements === doc.elements ? doc : normalizeDoc({ ...doc, elements });
}

function reorderElements(
  elements: DocElement[],
  ids: ReadonlySet<string>,
  mode: ReorderMode,
): DocElement[] {
  const selected = elements.filter((el) => ids.has(el.id));
  const others = elements.filter((el) => !ids.has(el.id));
  if (selected.length === 0) return elements;
  if (mode === 'front') return [...others, ...selected];
  if (mode === 'back') return [...selected, ...others];
  const result = [...elements];
  if (mode === 'forward') {
    for (let i = result.length - 2; i >= 0; i -= 1) {
      const current = result[i];
      const above = result[i + 1];
      if (current && above && ids.has(current.id) && !ids.has(above.id)) {
        result[i] = above;
        result[i + 1] = current;
      }
    }
  } else {
    for (let i = 1; i < result.length; i += 1) {
      const current = result[i];
      const below = result[i - 1];
      if (current && below && ids.has(current.id) && !ids.has(below.id)) {
        result[i] = below;
        result[i - 1] = current;
      }
    }
  }
  return result;
}

export const useDocStore = create<DocState>()(
  temporal(
    (set, get) => {
      /** Applies `update` to the doc. Skips the write (and so the history entry) if nothing changed. */
      const commit = (update: (doc: FormDoc) => FormDoc): void => {
        const current = get().doc;
        const next = update(current);
        if (next !== current) set({ doc: next });
      };

      const patchElements = (patches: { id: string; patch: ElementPatch }[]): void =>
        commit((doc) => {
          const byId = new Map(patches.map((p) => [p.id, p.patch]));
          let changed = false;
          const elements = doc.elements.map((el) => {
            const patch = byId.get(el.id);
            if (!patch) return el;
            const candidate = normalizeElement(
              { ...el, ...patch, id: el.id, type: el.type } as DocElement,
              doc.page,
            );
            // Keep the original reference when nothing really changed, so no history entry is made.
            const next = shallowEqual(el, candidate) ? el : candidate;
            if (next !== el) changed = true;
            return next;
          });
          return changed ? { ...doc, elements } : doc;
        });

      return {
        doc: createBlankDoc('mobile'),

        loadDoc: (doc) => {
          set({ doc: normalizeDoc(doc) });
          useDocStore.temporal.getState().clear();
        },

        replaceDoc: (doc) => commit(() => normalizeDoc(doc)),

        newDoc: (preset) => commit(() => createBlankDoc(preset)),

        setTitle: (title) =>
          commit((doc) => {
            const next = title.trim().slice(0, MAX_TITLE_LENGTH) || 'Untitled form';
            return next === doc.title ? doc : { ...doc, title: next };
          }),

        setPage: (patch) =>
          commit((doc) => {
            return normalizeDoc({ ...doc, page: { ...doc.page, ...patch } });
          }),

        switchPreset: (preset) =>
          commit((doc) =>
            doc.page.preset === preset
              ? doc
              : normalizeDoc({ ...doc, page: pageForPreset(preset, doc.page) }),
          ),

        addElement: (el) => {
          if (get().doc.elements.length >= MAX_ELEMENTS) return false;
          commit((doc) => withElements(doc, [...doc.elements, el]));
          return true;
        },

        addElements: (els) => {
          const room = MAX_ELEMENTS - get().doc.elements.length;
          const accepted = els.slice(0, Math.max(0, room));
          if (accepted.length > 0)
            commit((doc) => withElements(doc, [...doc.elements, ...accepted]));
          return accepted.length;
        },

        updateElement: (id, patch) => patchElements([{ id, patch }]),
        updateElements: (patches) => patchElements(patches),

        removeElements: (ids) =>
          commit((doc) => {
            // The submit button can never be removed.
            const buttons = new Set(
              doc.elements.filter((el) => el.type === 'button').map((el) => el.id),
            );
            const remove = new Set(ids.filter((id) => !buttons.has(id)));
            const elements = doc.elements.filter((el) => !remove.has(el.id));
            return elements.length === doc.elements.length ? doc : withElements(doc, elements);
          }),

        duplicateElements: (ids) => {
          const doc = get().doc;
          const source = doc.elements.filter((el) => ids.includes(el.id) && el.type !== 'button');
          const room = MAX_ELEMENTS - doc.elements.length;
          const usedKeys = new Set(
            doc.elements.flatMap((el) => (el.type === 'field' ? [el.key] : [])),
          );
          const copies = source.slice(0, Math.max(0, room)).map((el): DocElement => {
            const copy = {
              ...el,
              id: newElementId(),
              name: `${el.name} copy`,
              x: el.x + DUPLICATE_OFFSET,
              y: el.y + DUPLICATE_OFFSET,
              locked: false,
            };
            if (copy.type === 'field') {
              copy.key = uniqueSlug(slugify(copy.key, 'field'), usedKeys);
              usedKeys.add(copy.key);
            }
            return copy;
          });
          if (copies.length > 0) commit((d) => withElements(d, [...d.elements, ...copies]));
          return copies.map((c) => c.id);
        },

        reorder: (ids, mode) =>
          commit((doc) => {
            const elements = reorderElements(doc.elements, new Set(ids), mode);
            const same = elements.every((el, i) => el === doc.elements[i]);
            return same ? doc : { ...doc, elements };
          }),

        setLocked: (ids, locked) => patchElements(ids.map((id) => ({ id, patch: { locked } }))),
        setHidden: (ids, hidden) => patchElements(ids.map((id) => ({ id, patch: { hidden } }))),
        renameElement: (id, name) =>
          patchElements([{ id, patch: { name: name.trim().slice(0, 120) || 'Untitled' } }]),
      };
    },
    {
      limit: HISTORY_LIMIT,
      partialize: (state) => ({ doc: state.doc }),
      // Same document reference means nothing changed, so no history entry.
      equality: (past, current) => past.doc === current.doc,
    },
  ),
);

export const temporalStore = useDocStore.temporal;

export function undo(): void {
  temporalStore.getState().undo();
}

export function redo(): void {
  temporalStore.getState().redo();
}

export interface HistoryBatch {
  startDoc: FormDoc;
}

/**
 * Groups many store writes (a slider drag, held arrow keys) into ONE undo step. Writes made
 * between beginBatch and endBatch are not recorded individually.
 */
export function beginBatch(): HistoryBatch {
  temporalStore.getState().pause();
  return { startDoc: useDocStore.getState().doc };
}

export function endBatch(batch: HistoryBatch): void {
  const temporal = temporalStore.getState();
  temporal.resume();
  if (useDocStore.getState().doc === batch.startDoc) return;
  temporalStore.setState((state) => ({
    pastStates: [...state.pastStates, { doc: batch.startDoc }].slice(-HISTORY_LIMIT),
    futureStates: [],
  }));
}
