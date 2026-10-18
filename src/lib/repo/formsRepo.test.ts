import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createBlankDoc } from '@/types/doc.schema';
import { createFormsRepo } from './formsRepo';

type Response = { data: unknown; error: unknown };
type Call = [string, ...unknown[]];

/** A stand-in for the Supabase client: records every call and answers from a queue. */
function fakeClient(responses: Response[]) {
  const calls: Call[] = [];
  const next = (): Response => responses.shift() ?? { data: null, error: null };
  const builder: Record<string, unknown> = {};
  for (const name of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'single',
    'list',
    'remove',
  ]) {
    builder[name] = (...args: unknown[]) => {
      calls.push([name, ...args]);
      return builder;
    };
  }
  builder.then = (resolve: (value: Response) => unknown) => resolve(next());
  const client = {
    from: (table: string) => {
      calls.push(['from', table]);
      return builder;
    },
    rpc: (name: string, args: unknown) => {
      calls.push(['rpc', name, args]);
      return Promise.resolve(next());
    },
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
    storage: { from: () => builder },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const doc = createBlankDoc('mobile');
const row = (patch: Record<string, unknown> = {}) => ({
  id: 'f1',
  title: 'Untitled form',
  doc,
  published_doc: null,
  form_rev: 0,
  published: false,
  slug: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...patch,
});

describe('formsRepo', () => {
  it('gets a form and validates its document', async () => {
    const { client } = fakeClient([{ data: row(), error: null }]);
    const result = await createFormsRepo(client).get('f1');
    expect(result.ok && result.value.doc.page.preset).toBe('mobile');
  });

  it('reports a damaged document instead of crashing', async () => {
    const { client } = fakeClient([{ data: row({ doc: { nope: 1 } }), error: null }]);
    const result = await createFormsRepo(client).get('f1');
    expect(!result.ok && result.error.kind).toBe('invalid');
  });

  it('maps a missing row to not-found', async () => {
    const { client } = fakeClient([{ data: null, error: { code: 'PGRST116', message: 'none' } }]);
    const result = await createFormsRepo(client).get('nope');
    expect(!result.ok && result.error.kind).toBe('not-found');
  });

  it('maps network failures to a friendly offline error', async () => {
    const { client } = fakeClient([{ data: null, error: { message: 'Failed to fetch' } }]);
    const result = await createFormsRepo(client).list();
    expect(!result.ok && result.error.kind).toBe('offline');
  });

  it('lists forms and marks a damaged one with a null doc', async () => {
    const { client } = fakeClient([{ data: [row(), row({ id: 'f2', doc: 5 })], error: null }]);
    const result = await createFormsRepo(client).list();
    expect(result.ok && result.value.map((f) => f.doc !== null)).toEqual([true, false]);
  });

  it('saves with a conditional update on updated_at and returns the new time', async () => {
    const { client, calls } = fakeClient([{ data: [{ updated_at: 'T2' }], error: null }]);
    const result = await createFormsRepo(client).saveDoc('f1', doc, 'T1');
    expect(result.ok && result.value.updatedAt).toBe('T2');
    expect(calls).toContainEqual(['eq', 'updated_at', 'T1']);
  });

  it('treats zero updated rows as a conflict, and overwrites when no time is given', async () => {
    const conflict = fakeClient([{ data: [], error: null }]);
    const result = await createFormsRepo(conflict.client).saveDoc('f1', doc, 'T1');
    expect(!result.ok && result.error.kind).toBe('conflict');
    const force = fakeClient([{ data: [{ updated_at: 'T3' }], error: null }]);
    await createFormsRepo(force.client).saveDoc('f1', doc, null);
    expect(force.calls.some((c) => c[0] === 'eq' && c[1] === 'updated_at')).toBe(false);
  });

  it('publishes: first publish creates an 8 character slug and bumps the revision', async () => {
    const { client, calls } = fakeClient([
      { data: row(), error: null },
      {
        data: [row({ published: true, form_rev: 1, slug: 'abcd1234', published_doc: doc })],
        error: null,
      },
    ]);
    const result = await createFormsRepo(client).publish('f1');
    expect(result.ok && result.value.formRev).toBe(1);
    const update = calls.find((c) => c[0] === 'update')?.[1] as Record<string, unknown>;
    expect(update.form_rev).toBe(1);
    expect(update.published).toBe(true);
    expect(String(update.slug)).toMatch(/^[0-9a-z]{8}$/);
  });

  it('retries with a new slug when the first one is taken', async () => {
    const { client, calls } = fakeClient([
      { data: row(), error: null },
      { data: null, error: { code: '23505', message: 'duplicate' } },
      { data: [row({ published: true, form_rev: 1, slug: 'zzzz9999' })], error: null },
    ]);
    const result = await createFormsRepo(client).publish('f1');
    expect(result.ok).toBe(true);
    expect(calls.filter((c) => c[0] === 'update')).toHaveLength(2);
  });

  it('keeps the same slug when republishing', async () => {
    const { client, calls } = fakeClient([
      { data: row({ slug: 'keepme12', published: true, form_rev: 2 }), error: null },
      { data: [row({ slug: 'keepme12', published: true, form_rev: 3 })], error: null },
    ]);
    await createFormsRepo(client).publish('f1');
    expect((calls.find((c) => c[0] === 'update')?.[1] as Record<string, unknown>).slug).toBe(
      'keepme12',
    );
  });

  it('reads a public form only through the RPC', async () => {
    const { client, calls } = fakeClient([
      { data: [{ id: 'f1', title: 'T', published_doc: doc, form_rev: 4 }], error: null },
    ]);
    const result = await createFormsRepo(client).getPublishedBySlug('abc');
    expect(result.ok && result.value.formRev).toBe(4);
    expect(calls).toEqual([['rpc', 'get_published_form', { p_slug: 'abc' }]]);
  });

  it('says a closed or unknown form is not found', async () => {
    const { client } = fakeClient([{ data: [], error: null }]);
    const result = await createFormsRepo(client).getPublishedBySlug('closed');
    expect(!result.ok && result.error.kind).toBe('not-found');
  });

  it('duplicates a form with a copy title', async () => {
    const { client, calls } = fakeClient([
      { data: row({ title: 'Mine' }), error: null },
      { data: row({ id: 'f2', title: 'Mine copy' }), error: null },
    ]);
    const result = await createFormsRepo(client).duplicate('f1');
    expect(result.ok && result.value.id).toBe('f2');
    expect((calls.find((c) => c[0] === 'insert')?.[1] as { title: string }).title).toBe(
      'Mine copy',
    );
  });

  it('returns empty counts when the count function is missing', async () => {
    const { client } = fakeClient([{ data: null, error: { message: 'function not found' } }]);
    expect(await createFormsRepo(client).responseCounts()).toEqual({});
  });
});
