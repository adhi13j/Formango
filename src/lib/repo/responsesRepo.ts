import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getAnswerFile } from '@/lib/fileAnswers';
import { logError } from '@/lib/logError';
import { getSupabase } from '@/lib/supabase';
import { idbStore, type KeyValueStore } from '@/lib/persistence';
import type { Answers } from '@/types/doc';
import { fail, ok, toRepoError, type Result } from './result';

export interface StoredResponse {
  id: string;
  /** ISO 8601 */
  createdAt: string;
  answers: Answers;
}

/**
 * Where submitted answers go. Phase 2 saves them in this browser; Phase 3 swaps in Supabase
 * without the fill page changing.
 */
export interface ResponsesRepo {
  create: (answers: Answers) => Promise<StoredResponse>;
  list: () => Promise<StoredResponse[]>;
}

export const LOCAL_RESPONSES_KEY = 'formango:builder:responses:v1';

const storedSchema = z.array(
  z.object({
    id: z.string().min(1),
    createdAt: z.string().min(1),
    answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  }),
);

/** Responses kept in IndexedDB (signatures are images, which are too big for localStorage). */
export function createLocalResponsesRepo(
  store: KeyValueStore = idbStore,
  key: string = LOCAL_RESPONSES_KEY,
): ResponsesRepo {
  const read = async (): Promise<StoredResponse[]> => {
    const raw = await store.get(key);
    if (raw === undefined || raw === null) return [];
    const parsed = storedSchema.safeParse(raw);
    if (!parsed.success) {
      logError('responses are not valid, starting a new list', parsed.error);
      return [];
    }
    return parsed.data;
  };
  return {
    list: read,
    create: async (answers) => {
      const response: StoredResponse = {
        id: nanoid(10),
        createdAt: new Date().toISOString(),
        answers,
      };
      const all = await read();
      await store.set(key, [...all, response]);
      return response;
    },
  };
}

// ---- Supabase ---------------------------------------------------------------------------------

/** Answers go in as one row. Files go to the private `response-files` bucket next to it. */
export function createSupabaseResponsesRepo(
  target: { formId: string; formRev: number; fileFieldIds: readonly string[] },
  client: SupabaseClient = getSupabase(),
): ResponsesRepo {
  return {
    list: () => Promise.resolve([]), // respondents cannot read responses, by design
    create: async (answers) => {
      const id = crypto.randomUUID();
      const { error } = await client
        .from('responses')
        .insert({ id, form_id: target.formId, form_rev: target.formRev, answers });
      if (error) throw new Error(error.message);
      for (const fieldId of target.fileFieldIds) {
        const file = getAnswerFile(fieldId);
        if (!file || answers[fieldId] === undefined) continue;
        const path = `${target.formId}/${id}/${fieldId}`;
        const { error: uploadError } = await client.storage
          .from('response-files')
          .upload(path, file, { contentType: file.type || undefined, upsert: false });
        // The answers are already saved. Keep going, and let the log show what failed.
        if (uploadError) logError('uploading a response file', uploadError);
      }
      return { id, createdAt: new Date().toISOString(), answers };
    },
  };
}

export interface ResponseRow {
  id: string;
  formRev: number;
  createdAt: string;
  answers: Answers;
}

/** What the form owner can do with the responses of one form. */
export function createResponsesAdmin(client: SupabaseClient = getSupabase()) {
  return {
    /** Newest first, up to `limit` rows, plus the real total. */
    async list(
      formId: string,
      limit = 1000,
    ): Promise<Result<{ rows: ResponseRow[]; total: number }>> {
      try {
        const { data, error, count } = await client
          .from('responses')
          .select('id,form_rev,answers,created_at', { count: 'exact' })
          .eq('form_id', formId)
          .order('created_at', { ascending: false })
          .range(0, limit - 1);
        if (error) {
          const mapped = toRepoError(error);
          return fail(mapped.kind, mapped.message);
        }
        const rows = (
          data as { id: string; form_rev: number; answers: unknown; created_at: string }[]
        ).flatMap((row) => {
          const parsed = storedSchema.element.shape.answers.safeParse(row.answers);
          return parsed.success
            ? [
                {
                  id: row.id,
                  formRev: row.form_rev,
                  createdAt: row.created_at,
                  answers: parsed.data,
                },
              ]
            : [];
        });
        return ok({ rows, total: count ?? rows.length });
      } catch (error) {
        const mapped = toRepoError(error);
        return fail(mapped.kind, mapped.message);
      }
    },

    async remove(
      formId: string,
      responseId: string,
      fileFieldIds: readonly string[],
    ): Promise<Result<true>> {
      try {
        const { error } = await client.from('responses').delete().eq('id', responseId);
        if (error) {
          const mapped = toRepoError(error);
          return fail(mapped.kind, mapped.message);
        }
        if (fileFieldIds.length > 0) {
          await client.storage
            .from('response-files')
            .remove(fileFieldIds.map((fieldId) => `${formId}/${responseId}/${fieldId}`));
        }
        return ok(true);
      } catch (error) {
        const mapped = toRepoError(error);
        return fail(mapped.kind, mapped.message);
      }
    },

    /** A link that works for an hour, for opening an uploaded file. */
    async fileUrl(formId: string, responseId: string, fieldId: string): Promise<string | null> {
      const { data } = await client.storage
        .from('response-files')
        .createSignedUrl(`${formId}/${responseId}/${fieldId}`, 3600);
      return data?.signedUrl ?? null;
    },
  };
}
