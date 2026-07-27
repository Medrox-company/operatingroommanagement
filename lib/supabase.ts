import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials - NEXT_PUBLIC_ prefix makes them available on client-side
// These are inlined at build time by Next.js for both server and client bundles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Singleton pattern for Supabase client to avoid creating multiple instances
let supabaseInstance: SupabaseClient | null = null;
let hospitalRealtimeInstance: SupabaseClient | null = null;
let hospitalAccessToken: string | null = null;

/**
 * Keep PostgREST and the already-open Realtime socket on the same hospital JWT.
 * Supabase reads `accessToken` lazily for HTTP calls, but an existing Realtime
 * client keeps its previous token until `setAuth` is called explicitly.
 */
export async function setSupabaseHospitalToken(token: string | null) {
  hospitalAccessToken = token;
  await Promise.all([
    supabaseInstance?.realtime.setAuth(token),
    hospitalRealtimeInstance?.realtime.setAuth(token),
  ]);
}

/**
 * Dedicated, lazy Realtime singleton. It is intentionally created only after
 * the server has issued a hospital-scoped JWT. This avoids the anonymous auth
 * initialization of the HTTP client racing with the WebSocket channel join.
 * There is still exactly one Realtime socket per browser/device.
 */
export async function getHospitalRealtimeClient(): Promise<SupabaseClient | null> {
  if (!supabaseUrl || !supabaseAnonKey || !hospitalAccessToken) return null;

  if (!hospitalRealtimeInstance) {
    hospitalRealtimeInstance = createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => hospitalAccessToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        // Heartbeat ve workeru není zpomalován skrytou záložkou ani úsporným
        // režimem prohlížeče na dlouhodobě běžících nemocničních stanicích.
        worker: true,
        heartbeatIntervalMs: 25_000,
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }

  await hospitalRealtimeInstance.realtime.setAuth(hospitalAccessToken);
  return hospitalRealtimeInstance;
}

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => hospitalAccessToken,
    realtime: {
      worker: true,
      heartbeatIntervalMs: 25_000,
      params: {
        eventsPerSecond: 20,
      },
    },
  });
  
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
export const isSupabaseConfigured = !!supabase;
