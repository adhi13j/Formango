import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

export type AuthOutcome = { ok: true } | { ok: false; message: string } | { ok: 'check-email' };

export interface AuthState {
  user: User | null;
  /** True until the first session check finishes. */
  loading: boolean;
  /** False when the Supabase keys are missing, so the app can say so instead of crashing. */
  configured: boolean;
  signUp: (email: string, password: string) => Promise<AuthOutcome>;
  signIn: (email: string, password: string) => Promise<AuthOutcome>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
