import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Lazy-init server-side Supabase client se SERVICE ROLE klíčem.
 * Bypassuje RLS — NIKDY nepoužívej na klientu.
 *
 * Volání `getSupabaseAdmin()` dovnitř handleru; pokud nejsou env proměnné
 * nastavené, vyhodí runtime chybu (neshodíš build).
 */
let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase není nakonfigurovaný — chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  _client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/**
 * Vrátí `true`, pokud je Supabase admin client nakonfigurovaný.
 * Použití pro optional endpointy, které degradují na fallback.
 */
export function isSupabaseAdminConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return !!(url && key);
}
