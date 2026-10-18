import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';

/**
 * Keeps UI state valid when the document changes (undo, delete, import): selected ids that no
 * longer exist are dropped. Call once when the builder mounts. Returns an unsubscribe function.
 */
export function startStoreSync(): () => void {
  return useDocStore.subscribe((state, previous) => {
    if (state.doc.elements === previous.doc.elements) return;
    const { selectedIds, editingId, select, setEditingId } = useUiStore.getState();
    const ids = new Set(state.doc.elements.map((el) => el.id));
    const stillThere = selectedIds.filter((id) => ids.has(id));
    if (stillThere.length !== selectedIds.length) select(stillThere);
    if (editingId && !ids.has(editingId)) setEditingId(null);
  });
}
