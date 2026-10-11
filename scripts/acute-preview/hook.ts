// Alias exists only in this fixture's Vite configuration. Never import Auth, Supabase or credentials here.
export function useAcuteRequests(): never {
  throw new Error('Živý API hook je v izolovaném QA zakázán. Předávejte lokální controller.');
}
