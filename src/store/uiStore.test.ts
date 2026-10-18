import { beforeEach, describe, expect, it } from 'vitest';
import { createElement } from '@/lib/elements';
import { useDocStore } from '@/store/docStore';
import { startStoreSync } from '@/store/sync';
import { clampZoom, useUiStore } from '@/store/uiStore';
import { createBlankDoc } from '@/types/doc.schema';

beforeEach(() => {
  useDocStore.getState().loadDoc(createBlankDoc());
  useUiStore.setState({
    selectedIds: [],
    editingId: null,
    recentColors: [],
    zoom: 1,
    fitMode: true,
  });
});

describe('uiStore', () => {
  it('clamps zoom to 25 to 300 percent and rounds to 1 percent', () => {
    expect(clampZoom(0.1)).toBe(0.25);
    expect(clampZoom(9)).toBe(3);
    expect(clampZoom(1.234)).toBe(1.23);
  });

  it('turns fit mode off on manual zoom and keeps it on for fit zoom', () => {
    useUiStore.getState().setZoom(2);
    expect(useUiStore.getState()).toMatchObject({ zoom: 2, fitMode: false });
    useUiStore.getState().setZoom(0.8, { fit: true });
    expect(useUiStore.getState().fitMode).toBe(true);
  });

  it('keeps recent colors newest first, deduped, max 12', () => {
    const { pushRecentColor } = useUiStore.getState();
    for (let i = 0; i < 15; i += 1) pushRecentColor(`#0000${String(i).padStart(2, '0')}`);
    pushRecentColor('#000005');
    const colors = useUiStore.getState().recentColors;
    expect(colors).toHaveLength(12);
    expect(colors[0]).toBe('#000005');
    expect(new Set(colors).size).toBe(12);
  });

  it('toggles selection', () => {
    const { select, toggleSelect } = useUiStore.getState();
    select(['a']);
    toggleSelect('b');
    expect(useUiStore.getState().selectedIds).toEqual(['a', 'b']);
    toggleSelect('a');
    expect(useUiStore.getState().selectedIds).toEqual(['b']);
  });

  it('drops selected ids when their elements disappear (delete, undo)', () => {
    const stop = startStoreSync();
    const el = createElement('rect', useDocStore.getState().doc);
    useDocStore.getState().addElement(el);
    useUiStore.getState().select([el.id]);
    useDocStore.getState().removeElements([el.id]);
    expect(useUiStore.getState().selectedIds).toEqual([]);
    stop();
  });
});
