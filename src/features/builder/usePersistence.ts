import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logError } from '@/lib/logError';
import { loadPrefs, loadSavedDoc, savePrefs, saveDocToStore } from '@/lib/persistence';
import { useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';

const SAVE_DELAY_MS = 500;

/**
 * Restores the saved design on mount, then autosaves every change after a short pause.
 * Saving never blocks typing. A failed save keeps the design in memory and shows a banner.
 */
export function usePersistence(): { ready: boolean } {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ui = useUiStore.getState;
    let active = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const save = async () => {
      timer = undefined;
      try {
        await saveDocToStore(useDocStore.getState().doc);
        ui().setSaveStatus('saved');
        ui().setStorageError(null);
      } catch (error) {
        logError('autosave', error);
        ui().setSaveStatus('error');
        ui().setStorageError(
          error instanceof Error && error.message
            ? error.message
            : 'Your browser could not save this design.',
        );
      }
    };

    const schedule = () => {
      ui().setSaveStatus('saving');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void save(), SAVE_DELAY_MS);
    };

    const unsubscribeDoc = useDocStore.subscribe((state, previous) => {
      if (active && state.doc !== previous.doc) schedule();
    });
    const unsubscribePrefs = useUiStore.subscribe((state, previous) => {
      if (state.recentColors !== previous.recentColors)
        savePrefs({ recentColors: state.recentColors });
    });
    const flush = () => {
      if (document.visibilityState === 'hidden' && timer) {
        clearTimeout(timer);
        void save();
      }
    };
    document.addEventListener('visibilitychange', flush);

    void (async () => {
      ui().setRecentColors(loadPrefs().recentColors);
      const result = await loadSavedDoc();
      if (cancelled) return;
      switch (result.status) {
        case 'ok':
          useDocStore.getState().loadDoc(result.doc);
          ui().setSaveStatus('saved');
          break;
        case 'empty':
          ui().setSizeDialogOpen(true);
          break;
        case 'invalid':
          ui().setRestoreBackup(result.raw);
          toast.error("Couldn't restore your last design. A backup is available to download.");
          ui().setSizeDialogOpen(true);
          break;
        case 'error':
          ui().setSaveStatus('error');
          ui().setStorageError('Your browser is blocking saving, so changes will not be kept.');
          break;
        default: {
          const unreachable: never = result;
          return unreachable;
        }
      }
      active = true;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
        void save();
      }
      unsubscribeDoc();
      unsubscribePrefs();
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  // Warn before leaving only while the last save failed, because then work could be lost.
  const saveStatus = useUiStore((s) => s.saveStatus);
  useEffect(() => {
    if (saveStatus !== 'error') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  return { ready };
}
