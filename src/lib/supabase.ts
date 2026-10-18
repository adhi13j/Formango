import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/**
 * The one Supabase client. Only the public anon key is ever used here: Row Level Security is what
 * protects the data. The service_role key must never appear in this project.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url: string | undefined = import.meta.env.VITE_SUPABASE_URL;
  const key: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not set up. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    );
  }
  client = createClient(url, key);
  return client;
}
