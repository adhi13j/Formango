import { create } from 'zustand';
import { RECENT_COLORS_MAX, ZOOM_MAX, ZOOM_MIN } from '@/lib/constants';
import type { DocElement } from '@/types/doc';

export type RailItem = 'fields' | 'elements' | 'templates' | 'uploads';
export type EditorMode = 'edit' | 'preview';
export type PreviewDevice = 'desktop' | 'phone';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UiState {
  selectedIds: string[];
  editingId: string | null;
  zoom: number;
  fitMode: boolean;
  activeRail: RailItem | null;
  mode: EditorMode;
  previewDevice: PreviewDevice;
  snapEnabled: boolean;
  gridEnabled: boolean;
  clipboard: DocElement[];
  pasteCount: number;
  saveStatus: SaveStatus;
  layersOpen: boolean;
  recentColors: string[];
  sizeDialogOpen: boolean;
  shortcutsOpen: boolean;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setEditingId: (id: string | null) => void;
  /** Clamps to the zoom range and rounds to 1%. Turns fit mode off unless `fit` is passed. */
  setZoom: (zoom: number, options?: { fit?: boolean }) => void;
  setActiveRail: (item: RailItem | null) => void;
  toggleRail: (item: RailItem) => void;
  setMode: (mode: EditorMode) => void;
  setPreviewDevice: (device: PreviewDevice) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setGridEnabled: (enabled: boolean) => void;
  setClipboard: (els: DocElement[]) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLayersOpen: (open: boolean) => void;
  pushRecentColor: (hex: string) => void;
  setRecentColors: (colors: string[]) => void;
  setSizeDialogOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
}

export function clampZoom(zoom: number): number {
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) * 100) / 100;
}

export const useUiStore = create<UiState>()((set) => ({
  selectedIds: [],
  editingId: null,
  zoom: 1,
  fitMode: true,
  activeRail: null,
  mode: 'edit',
  previewDevice: 'desktop',
  snapEnabled: true,
  gridEnabled: true,
  clipboard: [],
  pasteCount: 0,
  saveStatus: 'idle',
  layersOpen: false,
  recentColors: [],
  sizeDialogOpen: false,
  shortcutsOpen: false,

  select: (ids) =>
    set((state) => {
      const same =
        ids.length === state.selectedIds.length &&
        ids.every((id, i) => id === state.selectedIds[i]);
      return same ? state : { selectedIds: ids, editingId: null };
    }),
  toggleSelect: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id],
      editingId: null,
    })),
  clearSelection: () =>
    set((state) =>
      state.selectedIds.length === 0 && state.editingId === null
        ? state
        : { selectedIds: [], editingId: null },
    ),
  setEditingId: (editingId) => set({ editingId }),
  setZoom: (zoom, options) => set({ zoom: clampZoom(zoom), fitMode: options?.fit ?? false }),
  setActiveRail: (activeRail) => set({ activeRail }),
  toggleRail: (item) => set((state) => ({ activeRail: state.activeRail === item ? null : item })),
  setMode: (mode) => set({ mode, editingId: null, activeRail: null }),
  setPreviewDevice: (previewDevice) => set({ previewDevice }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setGridEnabled: (gridEnabled) => set({ gridEnabled }),
  setClipboard: (clipboard) => set({ clipboard, pasteCount: 0 }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLayersOpen: (layersOpen) => set({ layersOpen }),
  pushRecentColor: (hex) =>
    set((state) => ({
      recentColors: [hex, ...state.recentColors.filter((c) => c !== hex)].slice(
        0,
        RECENT_COLORS_MAX,
      ),
    })),
  setRecentColors: (recentColors) =>
    set({ recentColors: recentColors.slice(0, RECENT_COLORS_MAX) }),
  setSizeDialogOpen: (sizeDialogOpen) => set({ sizeDialogOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));
