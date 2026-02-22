import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _initError: Error | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  if (_initError) throw _initError;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    _initError = new Error(
      "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server."
    );
    throw _initError;
  }

  try {
    _client = createClient(url.trim(), key.trim());
    return _client;
  } catch (e) {
    _initError = e instanceof Error ? e : new Error(String(e));
    throw _initError;
  }
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getClient() as unknown as Record<string, unknown>)[prop as string];
  },
});
