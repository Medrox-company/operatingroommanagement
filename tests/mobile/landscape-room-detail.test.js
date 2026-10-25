import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const globals = read('app/globals.css');
const short = globals.slice(globals.indexOf('@media (min-width: 768px) and (max-height: 520px)'));

test('rozvržení s menu (iPhone na šířku, iPad) drží obsah v bezpečné oblasti', () => {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    assert.match(globals, new RegExp(`--safe-${side}: env\\(safe-area-inset-${side}, 0px\\);`));
  }
  assert.match(read('App.tsx'), /className="app-shell-safe flex h-dvh/);
  assert.match(globals, /\.app-shell-safe \{\s*padding: var\(--safe-top\) var\(--safe-right\) var\(--safe-bottom\) var\(--safe-left\);/);
  assert.match(globals, /\.content-safe \{[^}]*top: var\(--safe-top\);[^}]*right: var\(--safe-right\);[^}]*bottom: var\(--safe-bottom\);[^}]*left: calc\(6rem \+ var\(--safe-left\)\);/);
});

test('detail sálu na nízké obrazovce nemá překryvy a skrývá popisky fází', () => {
  assert.ok(short.length > 0, 'chybí pravidla pro nízkou obrazovku');
  const detail = read('components/RoomDetail.tsx');
  for (const name of ['room-detail-desktop', 'room-detail-rail-top', 'room-detail-rail-bottom', 'room-detail-rail-warning', 'room-detail-staff-row', 'room-detail-phase-indicator', 'room-detail-phase-label', 'room-detail-circle-content']) {
    assert.ok(detail.includes(name), name);
  }
  // Upozornění jen v prostoru mezi horní a spodní dvojicí tlačítek.
  assert.match(short, /\.room-detail-rail-warning \{[^}]*top: calc\(var\(--rd-edge\) \+ 2 \* var\(--rd-btn\) \+ 2 \* var\(--rd-gap\)\) !important;[^}]*bottom: calc\(var\(--rd-edge\) \+ 2 \* var\(--rd-btn\) \+ 2 \* var\(--rd-gap\)\) !important;[^}]*translate: none !important;/);
  // Úprava času hned pod kruhem, popisky průběhu cyklu skryté.
  assert.match(short, /\.room-detail-time-controls \{[^}]*top: calc\(50% \+ var\(--rd-circle\) \/ 2 \+ 6px\) !important;/);
  assert.match(short, /\.room-detail-phase-label \{\s*display: none !important;/);
  assert.match(read('components/room/RapidSurgeryWarning.tsx'), /rapid-warning-rail__detail/);
});

test('postranní menu se na nízké obrazovce vejde celé bez posouvání', () => {
  const sidebar = read('components/sidebar-project.css');
  const rules = sidebar.slice(sidebar.indexOf('@media (min-width: 768px) and (max-height: 520px)'));
  assert.match(rules, /\.sidebar-project__button \{ height: 44px;/, 'dotyková plocha zůstává 44 px');
  assert.match(rules, /\.sidebar-project__actions \{ flex-direction: row;/);
});
