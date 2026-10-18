import type { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { logError } from '@/lib/logError';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuthContext, type AuthOutcome, type AuthState } from './authContext';
import { friendlyAuthError, validateCredentials } from './authErrors';

/** Keeps the signed-in user in React state. Tokens stay inside the Supabase client and are never logged. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    const supabase = getSupabase();
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  const submit = useCallback(
    async (mode: 'signUp' | 'signIn', email: string, password: string): Promise<AuthOutcome> => {
      const problem = validateCredentials(email, password, mode === 'signUp');
      if (problem) return { ok: false, message: problem };
      try {
        const supabase = getSupabase();
        const credentials = { email: email.trim(), password };
        if (mode === 'signIn') {
          const { error } = await supabase.auth.signInWithPassword(credentials);
          return error ? { ok: false, message: friendlyAuthError(error.message) } : { ok: true };
        }
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) return { ok: false, message: friendlyAuthError(error.message) };
        // With email confirmation on, there is no session until the link is clicked.
        return data.session ? { ok: true } : { ok: 'check-email' };
      } catch (error) {
        logError('auth', error);
        return {
          ok: false,
          message: friendlyAuthError(error instanceof Error ? error.message : ''),
        };
      }
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured,
      signUp: (email, password) => submit('signUp', email, password),
      signIn: (email, password) => submit('signIn', email, password),
      signOut: async () => {
        await getSupabase().auth.signOut();
      },
    }),
    [user, loading, configured, submit],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
