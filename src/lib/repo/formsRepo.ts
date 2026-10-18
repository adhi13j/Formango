import { customAlphabet } from 'nanoid';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logError';
import { getSupabase } from '@/lib/supabase';
import type { FormDoc } from '@/types/doc';
import { parseDoc } from '@/types/doc.schema';
import { fail, ok, toRepoError, type Result } from './result';

export interface FormRecord {
  id: string;
  title: string;
  /** The draft the builder edits. */
  doc: FormDoc;
  /** What respondents see, as of the last publish. */
  publishedDoc: FormDoc | null;
  formRev: number;
  published: boolean;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A form in the list. `doc` is null when its stored data is damaged, so the card can say so. */
export interface FormSummary extends Omit<FormRecord, 'doc' | 'publishedDoc'> {
  doc: FormDoc | null;
}

export interface PublishedForm {
  id: string;
  title: string;
  doc: FormDoc;
  formRev: number;
}

interface FormRow {
  id: string;
  title: string;
  doc: unknown;
  published_doc: unknown;
  form_rev: number;
  published: boolean;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id,title,doc,published_doc,form_rev,published,slug,created_at,updated_at';
const LIST_COLUMNS = 'id,title,doc,form_rev,published,slug,created_at,updated_at';
const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const SLUG_LENGTH = 8;
const SLUG_RETRIES = 3;
const makeSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

function summary(row: Partial<FormRow> & Pick<FormRow, 'id'>): FormSummary {
  const parsed = parseDoc(row.doc);
  return {
    id: row.id,
    title: row.title ?? 'Untitled form',
    doc: parsed.ok ? parsed.doc : null,
    formRev: row.form_rev ?? 0,
    published: row.published ?? false,
    slug: row.slug ?? null,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

function record(row: FormRow): Result<FormRecord> {
  const doc = parseDoc(row.doc);
  if (!doc.ok) {
    logError('a saved form is not valid', doc.errors);
    return fail('invalid', 'This form could not be opened because its saved data is damaged.');
  }
  let publishedDoc: FormDoc | null = null;
  if (row.published_doc !== null && row.published_doc !== undefined) {
    const parsed = parseDoc(row.published_doc);
    if (parsed.ok) publishedDoc = parsed.doc;
  }
  return ok({
    id: row.id,
    title: row.title,
    doc: doc.doc,
    publishedDoc,
    formRev: row.form_rev,
    published: row.published,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function failFrom(error: unknown): Result<never> {
  logError('forms request failed', error);
  const mapped = toRepoError(error);
  return fail(mapped.kind, mapped.message);
}

/** Every method returns a Result, so the UI can show what went wrong without try/catch. */
export function createFormsRepo(client: SupabaseClient = getSupabase()) {
  const uid = async (): Promise<string | null> =>
    (await client.auth.getUser()).data.user?.id ?? null;

  const get = async (id: string): Promise<Result<FormRecord>> => {
    try {
      const { data, error } = await client.from('forms').select(COLUMNS).eq('id', id).single();
      if (error) return failFrom(error);
      return record(data as FormRow);
    } catch (error) {
      return failFrom(error);
    }
  };

  const create = async (doc: FormDoc): Promise<Result<FormRecord>> => {
    try {
      const { data, error } = await client
        .from('forms')
        .insert({ title: doc.title, doc })
        .select(COLUMNS)
        .single();
      if (error) return failFrom(error);
      return record(data as FormRow);
    } catch (error) {
      return failFrom(error);
    }
  };

  return {
    get,
    create,

    async list(): Promise<Result<FormSummary[]>> {
      try {
        const { data, error } = await client
          .from('forms')
          .select(LIST_COLUMNS)
          .order('updated_at', { ascending: false });
        if (error) return failFrom(error);
        return ok((data as FormRow[]).map((row) => summary(row)));
      } catch (error) {
        return failFrom(error);
      }
    },

    /**
     * Saves the draft. With `expectedUpdatedAt` the write only happens if nobody changed the row
     * since it was loaded (one conditional UPDATE, so there is no check-then-write race). Zero
     * rows changed means a conflict. Pass null to overwrite whatever is there.
     */
    async saveDoc(
      id: string,
      doc: FormDoc,
      expectedUpdatedAt: string | null,
    ): Promise<Result<{ updatedAt: string }>> {
      try {
        let query = client.from('forms').update({ doc, title: doc.title }).eq('id', id);
        if (expectedUpdatedAt !== null) query = query.eq('updated_at', expectedUpdatedAt);
        const { data, error } = await query.select('updated_at');
        if (error) return failFrom(error);
        const row = (data as { updated_at: string }[] | null)?.[0];
        if (!row) {
          return expectedUpdatedAt === null
            ? fail('not-found', 'That form was not found.')
            : fail('conflict', 'This form changed somewhere else.');
        }
        return ok({ updatedAt: row.updated_at });
      } catch (error) {
        return failFrom(error);
      }
    },

    async rename(id: string, title: string): Promise<Result<FormRecord>> {
      const current = await get(id);
      if (!current.ok) return current;
      const doc: FormDoc = { ...current.value.doc, title };
      const saved = await this.saveDoc(id, doc, current.value.updatedAt);
      if (!saved.ok) return saved;
      return ok({ ...current.value, doc, title, updatedAt: saved.value.updatedAt });
    },

    async duplicate(id: string): Promise<Result<FormRecord>> {
      const current = await get(id);
      if (!current.ok) return current;
      const title = `${current.value.title} copy`.slice(0, 120);
      return create({ ...current.value.doc, title });
    },

    /** Deletes the form (its responses go with it) and its stored files. */
    async remove(id: string): Promise<Result<true>> {
      try {
        const owner = await uid();
        if (owner) {
          await removeFolder(client, 'form-assets', `${owner}/${id}`);
        }
        await removeFolder(client, 'response-files', id);
        const { error } = await client.from('forms').delete().eq('id', id);
        if (error) return failFrom(error);
        return ok(true);
      } catch (error) {
        return failFrom(error);
      }
    },

    /** Copies the saved draft to the public snapshot. Save any pending edits first. */
    async publish(id: string): Promise<Result<FormRecord>> {
      const current = await get(id);
      if (!current.ok) return current;
      const form = current.value;
      for (let attempt = 0; attempt < SLUG_RETRIES; attempt += 1) {
        const slug = form.slug ?? makeSlug();
        try {
          const { data, error } = await client
            .from('forms')
            .update({
              published_doc: form.doc,
              form_rev: form.formRev + 1,
              published: true,
              published_at: new Date().toISOString(),
              slug,
            })
            .eq('id', id)
            .eq('form_rev', form.formRev)
            .select(COLUMNS);
          if (error) {
            // A taken slug only happens on the first publish: try another one.
            if (error.code === '23505' && form.slug === null) continue;
            return failFrom(error);
          }
          const row = (data as FormRow[] | null)?.[0];
          if (!row) return fail('conflict', 'This form was published from another tab. Try again.');
          return record(row);
        } catch (error) {
          return failFrom(error);
        }
      }
      return fail('unknown', 'Could not create a link. Please try again.');
    },

    async unpublish(id: string): Promise<Result<FormRecord>> {
      try {
        const { data, error } = await client
          .from('forms')
          .update({ published: false })
          .eq('id', id)
          .select(COLUMNS)
          .single();
        if (error) return failFrom(error);
        return record(data as FormRow);
      } catch (error) {
        return failFrom(error);
      }
    },

    /** The public view of a form: the published snapshot only, never the draft. */
    async getPublishedBySlug(slug: string): Promise<Result<PublishedForm>> {
      try {
        const { data, error } = await client.rpc('get_published_form', { p_slug: slug });
        if (error) return failFrom(error);
        const row = (
          data as { id: string; title: string; published_doc: unknown; form_rev: number }[]
        )[0];
        if (!row) return fail('not-found', 'This form is closed or does not exist.');
        const parsed = parseDoc(row.published_doc);
        if (!parsed.ok) return fail('invalid', 'This form could not be shown.');
        return ok({ id: row.id, title: row.title, doc: parsed.doc, formRev: row.form_rev });
      } catch (error) {
        return failFrom(error);
      }
    },

    /** Number of responses per form, in one query. Empty when the count function is not installed. */
    async responseCounts(): Promise<Record<string, number>> {
      try {
        const { data, error } = await client.rpc('my_response_counts');
        if (error) return {};
        return Object.fromEntries(
          (data as { form_id: string; total: number }[]).map((r) => [r.form_id, Number(r.total)]),
        );
      } catch {
        return {};
      }
    },
  };
}

async function removeFolder(client: SupabaseClient, bucket: string, folder: string): Promise<void> {
  const files = await listAll(client, bucket, folder);
  if (files.length > 0) await client.storage.from(bucket).remove(files);
}

async function listAll(client: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const { data } = await client.storage.from(bucket).list(folder, { limit: 1000 });
  const paths: string[] = [];
  for (const item of data ?? []) {
    const path = `${folder}/${item.name}`;
    // Folders have no id. Look inside them too.
    if (item.id === null) paths.push(...(await listAll(client, bucket, path)));
    else paths.push(path);
  }
  return paths;
}

export type FormsRepo = ReturnType<typeof createFormsRepo>;
