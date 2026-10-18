import { beforeEach, describe, expect, it } from 'vitest';
import {
  DOC_KEY,
  exportFilename,
  importJsonFile,
  loadPrefs,
  loadSavedDoc,
  savePrefs,
  saveDocToStore,
  type KeyValueStore,
} from '@/lib/persistence';
import { createBlankDoc } from '@/types/doc.schema';

function memoryStore(
  initial: Record<string, unknown> = {},
): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => void data.set(key, value),
    del: async (key) => void data.delete(key),
  };
}

describe('loadSavedDoc', () => {
  it('reports an empty store', async () => {
    expect(await loadSavedDoc(memoryStore())).toEqual({ status: 'empty' });
  });

  it('restores a saved design', async () => {
    const store = memoryStore();
    const doc = { ...createBlankDoc('a4'), title: 'My form' };
    await saveDocToStore(doc, store);
    const result = await loadSavedDoc(store);
    expect(result.status === 'ok' && result.doc.title).toBe('My form');
  });

  it('keeps the raw text when the stored value is corrupt, instead of throwing', async () => {
    const store = memoryStore({ [DOC_KEY]: '{not json' });
    const result = await loadSavedDoc(store);
    expect(result).toMatchObject({ status: 'invalid', raw: '{not json' });
  });

  it('keeps the raw text when the stored design fails validation', async () => {
    const store = memoryStore({ [DOC_KEY]: JSON.stringify({ version: 1, title: '' }) });
    const result = await loadSavedDoc(store);
    expect(result.status).toBe('invalid');
    expect(result.status === 'invalid' && result.errors.length).toBeGreaterThan(0);
  });

  it('reports storage errors without throwing', async () => {
    const broken: KeyValueStore = {
      get: async () => Promise.reject(new Error('denied')),
      set: async () => undefined,
      del: async () => undefined,
    };
    expect((await loadSavedDoc(broken)).status).toBe('error');
  });
});

describe('saveDocToStore', () => {
  it('rejects designs over the size limit with a helpful message', async () => {
    const doc = { ...createBlankDoc(), title: 'x'.repeat(10) };
    const huge = { ...doc, junk: 'y'.repeat(4_100_000) } as unknown as typeof doc;
    await expect(saveDocToStore(huge, memoryStore())).rejects.toThrow(/too large/);
  });

  it('propagates storage failures so the caller can show the error banner', async () => {
    const full: KeyValueStore = {
      get: async () => undefined,
      set: async () => Promise.reject(new Error('QuotaExceededError')),
      del: async () => undefined,
    };
    await expect(saveDocToStore(createBlankDoc(), full)).rejects.toThrow('QuotaExceededError');
  });
});

describe('export and import', () => {
  it('names files from a lowercase ascii slug of the title', () => {
    expect(exportFilename({ title: 'Event Registration 2026!' })).toBe(
      'event-registration-2026.formango.json',
    );
    expect(exportFilename({ title: '日本語' })).toBe('form.formango.json');
  });

  it('round-trips a design through a file', async () => {
    const doc = { ...createBlankDoc(), title: 'Round trip' };
    const file = new File([JSON.stringify(doc)], 'x.formango.json');
    const result = await importJsonFile(file);
    expect(result.ok && result.doc.title).toBe('Round trip');
  });

  it('explains broken files and does not throw', async () => {
    const notJson = await importJsonFile(new File(['hello'], 'x.json'));
    expect(notJson).toEqual({ ok: false, errors: ['That file is not valid JSON.'] });
    const wrong = await importJsonFile(new File([JSON.stringify({ version: 1 })], 'x.json'));
    expect(wrong.ok).toBe(false);
  });
});

describe('preferences', () => {
  beforeEach(() => localStorage.clear());
  it('saves and loads recent colors, ignoring invalid entries', () => {
    savePrefs({ recentColors: ['#FF9F1C', '#2A1805'] });
    expect(loadPrefs().recentColors).toEqual(['#FF9F1C', '#2A1805']);
    localStorage.setItem(
      'formango:prefs:v1',
      JSON.stringify({ recentColors: ['#FF9F1C', 'red', 5] }),
    );
    expect(loadPrefs().recentColors).toEqual(['#FF9F1C']);
  });
  it('survives unreadable preferences', () => {
    localStorage.setItem('formango:prefs:v1', '{oops');
    expect(loadPrefs().recentColors).toEqual([]);
  });
});
