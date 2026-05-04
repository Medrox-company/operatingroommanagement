import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials - NEXT_PUBLIC_ prefix makes them available on client-side
// These are inlined at build time by Next.js for both server and client bundles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Singleton pattern for Supabase client to avoid creating multiple instances
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
export const isSupabaseConfigured = !!supabase;
