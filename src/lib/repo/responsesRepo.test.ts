import { describe, expect, it } from 'vitest';
import type { KeyValueStore } from '@/lib/persistence';
import { createLocalResponsesRepo } from './responsesRepo';

function memoryStore(): KeyValueStore & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    get: async (key) => data.get(key),
    set: async (key, value) => void data.set(key, value),
    del: async (key) => void data.delete(key),
  };
}

describe('local responses repo', () => {
  it('starts empty and stores two submissions in order', async () => {
    const store = memoryStore();
    const repo = createLocalResponsesRepo(store);
    expect(await repo.list()).toEqual([]);
    const first = await repo.create({ a: 'Asha' });
    const second = await repo.create({ a: 'Ben', b: ['x', 'y'] });
    const all = await repo.list();
    expect(all.map((r) => r.id)).toEqual([first.id, second.id]);
    expect(all[1]?.answers).toEqual({ a: 'Ben', b: ['x', 'y'] });
    expect(new Date(first.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('survives a new repo over the same store (a reload)', async () => {
    const store = memoryStore();
    await createLocalResponsesRepo(store).create({ a: '1' });
    expect(await createLocalResponsesRepo(store).list()).toHaveLength(1);
  });

  it('ignores corrupted data instead of crashing', async () => {
    const store = memoryStore();
    store.data.set('formango:builder:responses:v1', [{ nope: true }]);
    const repo = createLocalResponsesRepo(store);
    expect(await repo.list()).toEqual([]);
    await repo.create({ a: 'ok' });
    expect(await repo.list()).toHaveLength(1);
  });
});
