import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';
import {
  copySelection,
  cutSelection,
  deleteSelection,
  duplicateSelection,
  endNudge,
  nudgeSelection,
  pasteClipboard,
  redo,
  reorderSelection,
  selectAll,
  selectedElements,
  undo,
  zoomIn,
  zoomOut,
  zoomTo,
  zoomToFit,
} from './editorActions';
import { hasModifier, isTypingTarget } from './keys';

/** True while a dialog or popover is open, so Esc and typing keys belong to it. */
function overlayOpen(): boolean {
  return (
    document.querySelector(
      '[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper], [data-state="open"][role="listbox"]',
    ) !== null
  );
}

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** Every builder shortcut, attached once at the builder root. */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUiStore.getState();
      if (ui.mode === 'preview') {
        if (event.key === 'Escape') ui.setMode('edit');
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === 'Escape') {
        if (overlayOpen()) return;
        if (ui.activeRail) ui.setActiveRail(null);
        else if (ui.layersOpen) ui.setLayersOpen(false);
        else ui.clearSelection();
        return;
      }
      if (overlayOpen()) return;

      const mod = hasModifier(event);
      const key = event.key;
      const handled = (action: () => void) => {
        event.preventDefault();
        action();
      };

      if (mod) {
        switch (key.toLowerCase()) {
          case 'z':
            return handled(event.shiftKey ? redo : undo);
          case 'y':
            return handled(redo);
          case 'd':
            return handled(duplicateSelection);
          case 'c':
            return handled(copySelection);
          case 'x':
            return handled(cutSelection);
          case 'v':
            return handled(pasteClipboard);
          case 'a':
            return handled(selectAll);
          case ']':
            return handled(() => reorderSelection('front'));
          case '[':
            return handled(() => reorderSelection('back'));
          case '=':
          case '+':
            return handled(zoomIn);
          case '-':
            return handled(zoomOut);
          case '0':
            return handled(zoomToFit);
          case '1':
            return handled(() => zoomTo(1));
          default:
            return;
        }
      }
      if (event.altKey) return;

      const arrow = ARROWS[key];
      if (arrow) {
        if (selectedElements().length === 0) return;
        const step = event.shiftKey ? 10 : 1;
        return handled(() => nudgeSelection(arrow[0] * step, arrow[1] * step));
      }
      switch (key) {
        case 'Delete':
        case 'Backspace':
          return handled(deleteSelection);
        case ']':
          return handled(() => reorderSelection('forward'));
        case '[':
          return handled(() => reorderSelection('backward'));
        case 'Enter': {
          const [only] = selectedElements();
          if (
            only &&
            selectedElements().length === 1 &&
            !only.locked &&
            (only.type === 'text' || only.type === 'field')
          ) {
            return handled(() => ui.setEditingId(only.id));
          }
          return;
        }
        case '0':
          return handled(zoomToFit);
        case '1':
          return handled(() => zoomTo(1));
        case '?':
          return handled(() => ui.setShortcutsOpen(true));
        default:
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key in ARROWS) endNudge();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', endNudge);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', endNudge);
      endNudge();
    };
  }, []);
}
