import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const globals = read('app/globals.css');
const short = globals.slice(globals.indexOf('@media (min-width: 768px) and (max-height: 520px)'));

test('rozvržení s menu (iPhone na šířku, iPad): pozadí přes celou obrazovku, obsah v bezpečné oblasti', () => {
  for (const side of ['top', 'right', 'bottom', 'left']) {
    assert.match(globals, new RegExp(`--safe-${side}: env\\(safe-area-inset-${side}, 0px\\);`));
  }
  // Odsazený kořen by iOS použil i jako ořez detailu sálu (černý rám kolem).
  const app = read('App.tsx');
  assert.match(app, /<div className="flex h-dvh md:h-screen w-full font-sans overflow-hidden bg-black text-white">/);
  assert.doesNotMatch(app + globals, /app-shell-safe/);
  assert.match(globals, /\.content-safe \{[^}]*top: var\(--safe-top\);[^}]*right: var\(--safe-right\);[^}]*bottom: var\(--safe-bottom\);[^}]*left: calc\(6rem \+ var\(--safe-left\)\);/);
  // Moduly odsazují obsah samy.
  assert.match(globals, /\.app-module-shell \{\s*padding-left: calc\(128px \+ var\(--safe-left\)\);\s*padding-right: calc\(40px \+ var\(--safe-right\)\);\s*padding-top: calc\(40px \+ var\(--safe-top\)\) !important;/);
  assert.match(globals, /\.app-module-fill \{\s*padding-bottom: calc\(1\.5rem \+ var\(--safe-bottom\)\);/);
  assert.match(globals, /\.mobile-safe-top \{\s*padding-top: calc\(2\.5rem \+ var\(--safe-top\)\) !important;/);
  assert.equal(app.match(/app-module-shell app-module-fill w-full h-full overflow-hidden p-0/g)?.length, 2, 'tok pacienta a časová osa');
});

test('detail sálu na nízké obrazovce nemá překryvy a skrývá spodní průběh fází', () => {
  assert.ok(short.length > 0, 'chybí pravidla pro nízkou obrazovku');
  const detail = read('components/RoomDetail.tsx');
  for (const name of ['room-detail-desktop', 'room-detail-rail-top', 'room-detail-rail-bottom', 'room-detail-rail-warning', 'room-detail-staff-row', 'room-detail-phase-indicator', 'room-detail-phase-label', 'room-detail-circle-content']) {
    assert.ok(detail.includes(name), name);
  }
  // Upozornění jen v prostoru mezi horní a spodní dvojicí tlačítek.
  assert.match(short, /\.room-detail-rail-warning \{[^}]*top: calc\(var\(--rd-edge\) \+ 2 \* var\(--rd-btn\) \+ 2 \* var\(--rd-gap\)\) !important;[^}]*bottom: calc\(var\(--rd-edge\) \+ 2 \* var\(--rd-btn\) \+ 2 \* var\(--rd-gap\)\) !important;[^}]*translate: none !important;/);
  // Úprava času hned pod kruhem, spodní průběh cyklu (úseky i popisky) skrytý.
  assert.match(short, /\.room-detail-time-controls \{[^}]*top: calc\(50% \+ var\(--rd-circle\) \/ 2 \+ 6px\) !important;/);
  assert.match(short, /\.room-detail-phase-indicator \{\s*display: none !important;/);
  assert.match(read('components/room/RapidSurgeryWarning.tsx'), /rapid-warning-rail__detail/);
});

test('postranní menu se na nízké obrazovce vejde celé bez posouvání', () => {
  const sidebar = read('components/sidebar-project.css');
  const rules = sidebar.slice(sidebar.indexOf('@media (min-width: 768px) and (max-height: 520px)'));
  assert.match(rules, /\.sidebar-project__button \{ height: 44px;/, 'dotyková plocha zůstává 44 px');
  assert.match(rules, /\.sidebar-project__actions \{ flex-direction: row;/);
});

test('okno notifikací a dialogy modulů se na šířku vejdou vedle menu a mimo výřez', () => {
  const overlay = read('components/NotificationOverlay.tsx');
  for (const name of ['notification-overlay-desktop', 'notification-overlay-close', 'notification-overlay-row', 'notification-overlay-circle', 'notification-overlay-label']) {
    assert.ok(overlay.includes(name), name);
  }
  assert.match(globals, /\.notification-overlay-close \{\s*top: calc\(2rem \+ var\(--safe-top\)\);\s*right: calc\(2rem \+ var\(--safe-right\)\);/);
  assert.match(short, /\.notification-overlay-desktop \{[^}]*padding: var\(--safe-top\) calc\(var\(--safe-right\) \+ 72px\) var\(--safe-bottom\) calc\(96px \+ var\(--safe-left\)\);/);
  assert.match(short, /\.notification-overlay-circle \{\s*width: var\(--no-circle\);\s*height: var\(--no-circle\);/);
  assert.match(short, /main \.fixed\.inset-0:is\(\.justify-center, \.justify-end\):not\(\.notification-overlay-desktop\) \{\s*padding-left: calc\(96px \+ var\(--safe-left\) \+ 8px\);/);
  assert.match(read('components/statistics/RoomActivityPanels.tsx'), /paddingRight:'var\(--safe-right\)'/);
});

test('upozornění na dlouhý úklid se měří podle průměru kruhu a zůstává uvnitř prstence', () => {
  const detail = read('components/RoomDetail.tsx');
  const warning = detail.slice(detail.indexOf('key="cleaning-warning"'), detail.lastIndexOf('Tento krok bude automaticky ukončen.'));
  assert.ok(warning.length > 0, 'chybí upozornění na dlouhý úklid');
  assert.doesNotMatch(warning, /\d+(?:\.\d+)?vw/, 'velikosti podle šířky okna by text vytlačily přes prstenec');
  assert.match(warning, /text-\[clamp\(1rem,8\.5cqw,3rem\)\]/);
  assert.match(warning, /room-detail-circle-note text-\[clamp\(0\.75rem,3\.6cqw,1\.125rem\)\][^"]*max-w-\[62cqw\]/);
  assert.match(globals, /\.room-detail-circle-current \{\s*container-type: inline-size;/);
  assert.match(globals, /@container \(max-width: 300px\) \{\s*\.room-detail-circle-note \{\s*display: none;/);
});
