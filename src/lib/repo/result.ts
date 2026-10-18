/** What can go wrong when talking to the server, in words the UI can show. */
export type RepoErrorKind = 'not-found' | 'conflict' | 'offline' | 'denied' | 'invalid' | 'unknown';

export interface RepoError {
  kind: RepoErrorKind;
  message: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: RepoError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (kind: RepoErrorKind, message: string): Result<never> => ({
  ok: false,
  error: { kind, message },
});

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
}

/** Turns whatever Supabase (or fetch) threw into a RepoError with a friendly message. */
export function toRepoError(error: unknown): RepoError {
  const e = (typeof error === 'object' && error !== null ? error : {}) as SupabaseLikeError;
  const text = (e.message ?? '').toLowerCase();
  if (
    text.includes('failed to fetch') ||
    text.includes('network') ||
    text.includes('load failed')
  ) {
    return {
      kind: 'offline',
      message: 'Could not reach the server. Check your connection and try again.',
    };
  }
  if (e.code === 'PGRST116') return { kind: 'not-found', message: 'That form was not found.' };
  if (e.code === '42501' || e.status === 401 || e.status === 403) {
    return { kind: 'denied', message: 'You do not have access to that.' };
  }
  if (e.code === '23505') return { kind: 'conflict', message: 'That already exists.' };
  return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
}
