import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

// Při contentInset 'automatic' iOS odsadí celé webové zobrazení od výřezu a
// spodní lišty; nahoře i dole pak zůstanou pruhy v barvě pozadí obalu.
test('iOS aplikace zobrazuje obsah přes celou obrazovku jako web', () => {
  assert.match(read('capacitor.config.ts'), /ios:\s*\{[\s\S]*?contentInset:\s*'never'/);
  assert.match(read('mobile/index.html'), /viewport-fit=cover/);
});

test('mobilní obrazovky odsazují obsah od výřezu i spodní lišty samy', () => {
  const shell = read('components/mobile/MobileShell.tsx');
  assert.match(shell, /env\(safe-area-inset-top/);
  assert.match(shell, /env\(safe-area-inset-bottom/);
  assert.match(read('components/mobile/mobile-orbit-navigation.css'), /env\(safe-area-inset-bottom/);
  assert.match(read('components/mobile/mobile-room-orbit.css'), /env\(safe-area-inset-top/);
  assert.match(read('components/mobile/mobile-login-wheel.css'), /env\(safe-area-inset-top/);
});
