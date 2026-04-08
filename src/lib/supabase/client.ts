import { createBrowserClient } from '@supabase/ssr';

function browserEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/** False when env is missing — avoids throwing on the client (e.g. Vercel without env set). */
export function isSupabaseBrowserConfigured(): boolean {
  return browserEnv() !== null;
}

export function createClient() {
  const env = browserEnv();
  if (!env) {
    throw new Error('Supabase URL and anon key must be set');
  }
  return createBrowserClient(env.url, env.key);
}
