import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
test('verification retains auth gating and accessible status with the accepted mobile backdrop', () => {
  const app = read('App.tsx');
  const css = read('components/mobile/mobile-auth-loading.css');
  assert.match(app, /if \(appAccessLoading\)/);
  assert.match(app, /aria-label="Ověřuji přihlášení"/);
  assert.match(app, /role="status"/);
  assert.match(css, /max-width: 767px/);
  assert.match(css, /#00000066/);
  assert.match(css, /mobile-orbit-background-v3\.png/);
  assert.match(css, /backdrop-filter: blur\(12px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});
