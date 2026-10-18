import { isMac } from './keys';

export type ShortcutGroup = 'Edit' | 'Selection' | 'Arrange' | 'View' | 'Help';

export interface ShortcutInfo {
  id: string;
  group: ShortcutGroup;
  label: string;
  /** Display keys. "Mod" means Cmd on Mac and Ctrl elsewhere. */
  keys: string[];
}

/** The single source for the shortcut dialog and tooltips, so the docs never drift from the code. */
export const SHORTCUTS: ShortcutInfo[] = [
  { id: 'undo', group: 'Edit', label: 'Undo', keys: ['Mod', 'Z'] },
  { id: 'redo', group: 'Edit', label: 'Redo', keys: ['Mod', 'Shift', 'Z'] },
  { id: 'delete', group: 'Edit', label: 'Delete', keys: ['Delete'] },
  { id: 'duplicate', group: 'Edit', label: 'Duplicate', keys: ['Mod', 'D'] },
  { id: 'copy', group: 'Edit', label: 'Copy', keys: ['Mod', 'C'] },
  { id: 'cut', group: 'Edit', label: 'Cut', keys: ['Mod', 'X'] },
  { id: 'paste', group: 'Edit', label: 'Paste', keys: ['Mod', 'V'] },
  { id: 'edit-text', group: 'Edit', label: 'Edit text', keys: ['Enter'] },
  { id: 'select-all', group: 'Selection', label: 'Select all', keys: ['Mod', 'A'] },
  { id: 'deselect', group: 'Selection', label: 'Deselect, close panel', keys: ['Esc'] },
  {
    id: 'add-to-selection',
    group: 'Selection',
    label: 'Add to selection',
    keys: ['Shift', 'Click'],
  },
  { id: 'nudge', group: 'Arrange', label: 'Move 1 px', keys: ['Arrow keys'] },
  { id: 'nudge-10', group: 'Arrange', label: 'Move 10 px', keys: ['Shift', 'Arrow keys'] },
  { id: 'forward', group: 'Arrange', label: 'Bring forward', keys: [']'] },
  { id: 'backward', group: 'Arrange', label: 'Send backward', keys: ['['] },
  { id: 'front', group: 'Arrange', label: 'Bring to front', keys: ['Mod', ']'] },
  { id: 'back', group: 'Arrange', label: 'Send to back', keys: ['Mod', '['] },
  { id: 'no-snap', group: 'Arrange', label: 'Move without snapping', keys: ['Hold Alt'] },
  { id: 'zoom-in', group: 'View', label: 'Zoom in', keys: ['Mod', '+'] },
  { id: 'zoom-out', group: 'View', label: 'Zoom out', keys: ['Mod', '-'] },
  { id: 'zoom-fit', group: 'View', label: 'Fit page to window', keys: ['0'] },
  { id: 'zoom-100', group: 'View', label: 'Zoom to 100%', keys: ['1'] },
  { id: 'zoom-wheel', group: 'View', label: 'Zoom with the wheel', keys: ['Mod', 'Scroll'] },
  { id: 'pan', group: 'View', label: 'Pan', keys: ['Space', 'Drag'] },
  { id: 'help', group: 'Help', label: 'Show shortcuts', keys: ['?'] },
];

export function shortcutKeys(id: string): string[] {
  return SHORTCUTS.find((s) => s.id === id)?.keys ?? [];
}

export function formatKey(key: string): string {
  const mac = isMac();
  if (key === 'Mod') return mac ? '⌘' : 'Ctrl';
  if (key === 'Shift' && mac) return '⇧';
  if (key === 'Alt' && mac) return '⌥';
  return key;
}

export function formatShortcut(id: string): string {
  const mac = isMac();
  return shortcutKeys(id)
    .map(formatKey)
    .join(mac ? '' : '+');
}
