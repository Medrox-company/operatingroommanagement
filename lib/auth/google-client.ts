'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Samostatný Supabase klient pouze pro přihlášení superadministrátora
 * (Google + dvoufázové ověření).
 *
 * Proč nesdílí klienta z lib/supabase.ts: tam se používá volba `accessToken`
 * pro JWT omezený na jednu nemocnici. Supabase v tom režimu zakazuje volání
 * auth metod, takže signInWithOAuth ani mfa.* by tam nefungovaly. Vlastní
 * klient s vlastním storageKey obě větve čistě odděluje.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const STORAGE_KEY = 'orm-superadmin-auth';

let instance: SupabaseClient | null = null;

export function getGoogleAuthClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (instance) return instance;

  instance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: STORAGE_KEY,
    },
    // Realtime řeší hlavní klient; tady by jen držel zbytečné spojení.
    realtime: { params: { eventsPerSecond: 0 } },
  });

  return instance;
}

/**
 * Úklid po dokončeném i po přerušeném přihlášení.
 * Google relace je jen průchozí krok k or_session cookie — nemá důvod
 * v prohlížeči přežívat.
 */
export async function clearGoogleAuthSession(): Promise<void> {
  try {
    await instance?.auth.signOut();
  } catch {
    // Odhlášení u Supabase může selhat offline; lokální úklid stačí.
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Prohlížeč může mít lokální úložiště zakázané.
  }
}

/** Kam se má Google vrátit po přihlášení. */
export function getGoogleRedirectUrl(): string {
  return `${window.location.origin}/prihlaseni/google`;
}
