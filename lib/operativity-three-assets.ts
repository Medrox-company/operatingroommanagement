/** Locally vendored, immutable runtime used only by the isolated planning frame. */
export const OPERATIVITY_THREE_RUNTIME_URL = '/planning/vendor/three-r128-runtime.txt';
export const OPERATIVITY_THREE_RUNTIME_VERSION = '0.128.0';
export const OPERATIVITY_THREE_RUNTIME_SHA256 = '3c3acae8ddf36e5cd71fdb201e3b025dc0ae6eb9a29bba45eb1ccf260ed95896';

/** Never embed a stale, truncated or altered runtime in the planning frame. */
export async function validateOperativityThreeRuntime(source: string): Promise<string> {
  if (typeof source !== 'string' || source.length === 0) {
    throw new Error('Knihovna 3D zobrazení není dostupná.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  if (actual !== OPERATIVITY_THREE_RUNTIME_SHA256) {
    throw new Error('Kontrola knihovny 3D zobrazení selhala. Obnovte podklady.');
  }
  return source;
}
