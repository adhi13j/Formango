import { del, get, set } from 'idb-keyval';
import { MAX_DOC_BYTES } from '@/lib/constants';
import { downloadText } from '@/lib/download';
import { logError } from '@/lib/logError';
import { slugify } from '@/lib/slug';
import { parseDoc } from '@/types/doc.schema';
import type { FormDoc } from '@/types/doc';

/** Where the guest design lives: IndexedDB, so a 4 MB design with images fits (see decisions.md). */
export const DOC_KEY = 'formango:builder:doc:v1';
export const PREFS_KEY = 'formango:prefs:v1';

/** The tiny slice of a key-value store that persistence needs. Tests pass an in-memory one. */
export interface KeyValueStore {
  get: (key: string) => Promise<unknown>;
  set: (key: string, value: unknown) => Promise<void>;
  del: (key: string) => Promise<void>;
}

export const idbStore: KeyValueStore = {
  get: (key) => get(key),
  set: (key, value) => set(key, value),
  del: (key) => del(key),
};

export type LoadResult =
  | { status: 'empty' }
  | { status: 'ok'; doc: FormDoc }
  /** Something was stored but it is not a valid design. `raw` stays downloadable. */
  | { status: 'invalid'; raw: string; errors: string[] }
  | { status: 'error'; error: unknown };

export async function loadSavedDoc(store: KeyValueStore = idbStore): Promise<LoadResult> {
  try {
    const stored = await store.get(DOC_KEY);
    if (stored === undefined || stored === null) return { status: 'empty' };
    const raw = typeof stored === 'string' ? stored : JSON.stringify(stored);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { status: 'invalid', raw, errors: ['The saved design is not valid JSON.'] };
    }
    const result = parseDoc(json);
    return result.ok
      ? { status: 'ok', doc: result.doc }
      : { status: 'invalid', raw, errors: result.errors };
  } catch (error) {
    logError('loadSavedDoc', error);
    return { status: 'error', error };
  }
}

export function serializeDoc(doc: FormDoc): string {
  return JSON.stringify(doc);
}

/** Throws when the design is too big or the browser refuses the write (quota, private mode). */
export async function saveDocToStore(doc: FormDoc, store: KeyValueStore = idbStore): Promise<void> {
  const text = serializeDoc(doc);
  if (text.length > MAX_DOC_BYTES) {
    throw new Error('This design is too large to save. Remove or shrink some images.');
  }
  await store.set(DOC_KEY, text);
}

export async function clearSavedDoc(store: KeyValueStore = idbStore): Promise<void> {
  await store.del(DOC_KEY);
}

// ---- JSON export and import -----------------------------------------------------------------

export function exportFilename(doc: Pick<FormDoc, 'title'>): string {
  return `${slugify(doc.title)}.formango.json`;
}

export function exportJson(doc: FormDoc): void {
  downloadText(JSON.stringify(doc, null, 2), exportFilename(doc));
}

export type ImportResult = { ok: true; doc: FormDoc } | { ok: false; errors: string[] };

/** Reads and validates a .formango.json file. Never throws, never changes the current design. */
export async function importJsonFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_DOC_BYTES * 1.5) {
    return { ok: false, errors: ['That file is too large to be a Formango design.'] };
  }
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return { ok: false, errors: ['That file is not valid JSON.'] };
  }
  const result = parseDoc(json);
  return result.ok ? { ok: true, doc: result.doc } : { ok: false, errors: result.errors };
}

// ---- small preferences (localStorage) -------------------------------------------------------

interface Prefs {
  recentColors: string[];
}

export function loadPrefs(): Prefs {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null');
    if (typeof parsed === 'object' && parsed !== null && 'recentColors' in parsed) {
      const colors = (parsed as { recentColors: unknown }).recentColors;
      if (Array.isArray(colors)) {
        return {
          recentColors: colors.filter(
            (c): c is string => typeof c === 'string' && /^#[0-9A-F]{6}$/.test(c),
          ),
        };
      }
    }
  } catch {
    // Missing or unreadable preferences are fine: start empty.
  }
  return { recentColors: [] };
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience. Ignore quota and private-mode errors.
  }
}
