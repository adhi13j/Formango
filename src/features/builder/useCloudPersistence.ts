import { useEffect, useState } from 'react';
import { logError } from '@/lib/logError';
import { loadPrefs, savePrefs } from '@/lib/persistence';
import { uploadDataUrlImages } from '@/lib/repo/assets';
import { createFormsRepo, type FormRecord } from '@/lib/repo/formsRepo';
import { getSupabase } from '@/lib/supabase';
import { useCloudStore } from '@/store/cloudStore';
import { temporalStore, useDocStore } from '@/store/docStore';
import { useUiStore } from '@/store/uiStore';
import type { FormDoc } from '@/types/doc';

const SAVE_DELAY_MS = 1500;
const RETRY_DELAY_MS = 5000;

export type CloudLoad =
  { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

/** Swaps the document without making an undo step or clearing history (used after image uploads). */
function replaceQuietly(doc: FormDoc): void {
  const temporal = temporalStore.getState();
  temporal.pause();
  useDocStore.setState({ doc });
  temporal.resume();
}

function meta(record: FormRecord) {
  return {
    formId: record.id,
    published: record.published,
    slug: record.slug,
    formRev: record.formRev,
    publishedDoc: record.publishedDoc,
  };
}

/**
 * Loads a saved form into the builder and autosaves the draft. Saves wait 1.5 seconds after the
 * last change and only write when something changed. Each save is a conditional update, so if the
 * form was changed in another tab the save stops and the conflict banner asks what to do.
 */
export function useCloudPersistence(formId: string): CloudLoad {
  const [state, setState] = useState<CloudLoad>({ status: 'loading' });

  useEffect(() => {
    const ui = useUiStore.getState;
    const repo = createFormsRepo();
    let updatedAt: string | null = null;
    let active = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let saving: Promise<boolean> | null = null;
    let lastSaved: FormDoc | null = null;
    let stopped = false; // true while a conflict waits for a decision

    const applyRecord = (record: FormRecord) => {
      updatedAt = record.updatedAt;
      lastSaved = record.doc;
      useDocStore.getState().loadDoc(record.doc);
      useCloudStore.getState().setMeta(meta(record));
      ui().setSaveStatus('saved');
      ui().setStorageError(null);
      ui().setConflict(false);
      stopped = false;
    };

    const runSave = async (overwrite: boolean): Promise<boolean> => {
      let doc = useDocStore.getState().doc;
      if (!overwrite && doc === lastSaved) {
        ui().setSaveStatus('saved');
        return true;
      }
      try {
        const { data } = await getSupabase().auth.getUser();
        const owner = data.user?.id;
        if (owner) {
          const uploaded = await uploadDataUrlImages(getSupabase(), doc, owner, formId);
          if (uploaded !== doc) {
            doc = uploaded;
            replaceQuietly(uploaded);
          }
        }
      } catch (error) {
        logError('preparing images', error);
      }
      const result = await repo.saveDoc(formId, doc, overwrite ? null : updatedAt);
      if (result.ok) {
        updatedAt = result.value.updatedAt;
        lastSaved = doc;
        ui().setStorageError(null);
        ui().setConflict(false);
        // Edits made while saving are saved next.
        if (useDocStore.getState().doc !== doc) {
          schedule();
        } else {
          ui().setSaveStatus('saved');
        }
        return true;
      }
      ui().setSaveStatus('error');
      if (result.error.kind === 'conflict') {
        stopped = true;
        ui().setConflict(true);
      } else {
        ui().setStorageError(result.error.message);
        timer = setTimeout(() => void save(false), RETRY_DELAY_MS);
      }
      return false;
    };

    const save = (overwrite: boolean): Promise<boolean> => {
      timer = undefined;
      saving ??= runSave(overwrite).finally(() => {
        saving = null;
      });
      return saving;
    };

    function schedule() {
      if (stopped) return;
      ui().setSaveStatus('saving');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void save(false), SAVE_DELAY_MS);
    }

    const flush = async (): Promise<boolean> => {
      if (timer) clearTimeout(timer);
      if (saving) await saving;
      return save(false);
    };

    const unsubscribeDoc = useDocStore.subscribe((next, previous) => {
      if (active && next.doc !== previous.doc) schedule();
    });
    const unsubscribePrefs = useUiStore.subscribe((next, previous) => {
      if (next.recentColors !== previous.recentColors)
        savePrefs({ recentColors: next.recentColors });
    });
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && timer) void flush();
    };
    document.addEventListener('visibilitychange', onHidden);
    const warn = (event: BeforeUnloadEvent) => {
      if (timer || saving || ui().saveStatus === 'error') event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);

    // The conflict banner calls these through the store-free event below.
    const onResolve = (event: Event) => {
      const choice = (event as CustomEvent<'reload' | 'overwrite'>).detail;
      void (async () => {
        if (choice === 'overwrite') {
          stopped = false;
          await save(true);
          return;
        }
        const fresh = await repo.get(formId);
        if (fresh.ok) applyRecord(fresh.value);
      })();
    };
    window.addEventListener('formango:resolve-conflict', onResolve);

    useCloudStore.getState().setFlush(flush);
    ui().setRecentColors(loadPrefs().recentColors);
    void (async () => {
      const result = await repo.get(formId);
      if (cancelled) return;
      if (!result.ok) {
        setState({ status: 'error', message: result.error.message });
        return;
      }
      applyRecord(result.value);
      active = true;
      setState({ status: 'ready' });
    })();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
        void save(false);
      }
      unsubscribeDoc();
      unsubscribePrefs();
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('formango:resolve-conflict', onResolve);
      useCloudStore.getState().setMeta(null);
      useCloudStore.getState().setFlush(() => Promise.resolve(true));
    };
  }, [formId]);

  return state;
}
