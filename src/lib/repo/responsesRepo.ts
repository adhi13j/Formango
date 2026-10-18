import { z } from 'zod';
import { nanoid } from 'nanoid';
import { logError } from '@/lib/logError';
import { idbStore, type KeyValueStore } from '@/lib/persistence';
import type { Answers } from '@/types/doc';

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
