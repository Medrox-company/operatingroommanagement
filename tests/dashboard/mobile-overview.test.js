import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Execute the actual pure display helpers. The only import is a type, so any
// accidental runtime dependency (especially a database client) fails this suite.
const helperSource = readFileSync(new URL('../../lib/mobile-room-display.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(helperSource, {
  fileName: 'mobile-room-display.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const mod = { exports: {} };
new Function('require', 'exports', 'module', outputText)(name => {
  assert.fail(`Pure mobile display helpers must not load a runtime dependency: ${name}`);
}, mod.exports, mod);
const { mobileRoomPhase, normalizeRoomSearch, filterMobileRooms, mobileElapsed, mobileEndTime } = mod.exports;

// These are already enabled/sorted statuses. Their original database positions
// deliberately differ from their current index in the filtered workflow.
const statuses = [
  { name: 'Sál připraven', title: 'Připraven', color: '#12A584', order_index: 10 },
  { name: 'Chirurgický výkon', title: 'Probíhá výkon', color: '#EE0000', accent_color: '#B51A68', order_index: 30 },
  { name: 'Úklid sálu', color: '#9A7BDB', order_index: 90 },
];
const room = (id, currentStepIndex, extra = {}) => ({ id, name: `Sál ${id}`, department: 'Chirurgie', currentStepIndex, ...extra });

test('mobile phase follows the filtered workflow index and the configured title/accent', () => {
  assert.deepEqual(mobileRoomPhase(room('pcho', 1), statuses), {
    title: 'Probíhá výkon', color: '#B51A68', ready: false, active: true,
  });
  assert.deepEqual(mobileRoomPhase(room('cleaning', 2), statuses), {
    title: 'Úklid sálu', color: '#9A7BDB', ready: false, active: true,
  });
  const extended = Array.from({ length: 9 }, (_, index) => ({ name: `Vlastní fáze ${index}`, color: '#377BAA', order_index: index * 10 }));
  assert.equal(mobileRoomPhase(room('custom-seven', 7), extended).active, true, 'An actual phase at index 7 is not automatically prepared');
});

test('prepared rooms are ready, never active, including a configured nonzero ready position', () => {
  assert.deepEqual(mobileRoomPhase(room('ready', 0), statuses), {
    title: 'Připraven', color: '#12A584', ready: true, active: false,
  });
  const custom = [{ name: 'Příjezd' }, { name: 'SÁL PŘIPRAVEN', title: 'Volný sál' }];
  assert.equal(mobileRoomPhase(room('other-ready', 1), custom).ready, true);
  assert.equal(mobileRoomPhase(room('other-ready', 1), custom).active, false);
});

test('pause is an active operational state and emergency/lock take precedence', () => {
  assert.deepEqual(mobileRoomPhase(room('paused', 0, { isPaused: true }), statuses), {
    title: 'Pauza', color: '#20ACD5', ready: false, active: true,
  });
  assert.deepEqual(mobileRoomPhase(room('locked', 1, { isLocked: true, isPaused: true }), statuses), {
    title: 'Sál uzamčen', color: '#B88512', ready: false, active: false,
  });
  assert.deepEqual(mobileRoomPhase(room('emergency', 1, { isEmergency: true, isLocked: true, isPaused: true }), statuses), {
    title: 'Nouzový stav', color: '#E5484D', ready: false, active: false,
  });
});

test('missing workflow data retains a readable neutral state, not a fabricated active phase', () => {
  assert.deepEqual(mobileRoomPhase(room('unknown', 99), statuses), {
    title: 'Stav není k dispozici', color: '#7890A8', ready: false, active: false,
  });
  assert.equal(mobileRoomPhase(room('not-loaded', 1), []).active, false);
  assert.equal(mobileRoomPhase(room('ready-fallback', 0), []).ready, true);
});

test('search normalizes Czech diacritics, case, surrounding space and decomposed Unicode', () => {
  assert.equal(normalizeRoomSearch('  ŽLUŤOUČKÝ SÁL Č. 2  '), 'zlutoucky sal c. 2');
  assert.equal(normalizeRoomSearch('SÁL'.normalize('NFD')), 'sal');
  assert.equal(normalizeRoomSearch('   '), '');
  const rooms = [room('1', 1, { name: 'PCHO sál č. 2', department: 'Dětská chirurgie' }), room('2', 0, { name: 'Ortopedie' })];
  assert.deepEqual(filterMobileRooms(rooms, statuses, 'all', 'SAL C. 2').map(item => item.id), ['1']);
  assert.deepEqual(filterMobileRooms(rooms, statuses, 'all', 'detska').map(item => item.id), ['1']);
});

test('state filter and search combine without changing room order or source data', () => {
  const rooms = [
    room('active', 1, { name: 'PCHO sál č. 1' }),
    room('ready', 0, { name: 'PCHO sál č. 2' }),
    room('paused', 1, { name: 'PCHO sál č. 3', isPaused: true }),
    room('other', 1, { name: 'Ortopedie' }),
    room('emergency', 1, { name: 'PCHO sál č. 4', isEmergency: true }),
    room('locked', 1, { name: 'PCHO sál č. 5', isLocked: true }),
  ];
  const unchanged = JSON.stringify(rooms);
  const ids = (filter, query) => filterMobileRooms(rooms, statuses, filter, query).map(item => item.id);
  assert.deepEqual(ids('active', 'PCHO'), ['active', 'paused']);
  assert.deepEqual(ids('ready', 'pcho'), ['ready']);
  assert.deepEqual(ids('all', 'PCHO'), ['active', 'ready', 'paused', 'emergency', 'locked']);
  assert.deepEqual(ids('all', '   '), rooms.map(item => item.id));
  assert.deepEqual(ids('active', 'nenalezeno'), []);
  assert.deepEqual(filterMobileRooms([], statuses, 'all', ''), []);
  assert.equal(JSON.stringify(rooms), unchanged);
});

test('elapsed time formats whole hours/minutes, handles missing dates and clamps future starts', () => {
  const now = Date.parse('2026-09-15T12:00:00Z');
  assert.equal(mobileElapsed('2026-09-15T10:36:00Z', now), '01:24');
  assert.equal(mobileElapsed('2026-09-15T11:59:01Z', now), '00:00');
  assert.equal(mobileElapsed('2026-09-14T11:00:00Z', now), '25:00');
  assert.equal(mobileElapsed('2026-09-15T12:00:00Z', now), '00:00');
  assert.equal(mobileElapsed('2026-09-15T13:00:00Z', now), '00:00');
  for (const missing of [null, undefined, '', 'not-a-date']) assert.equal(mobileElapsed(missing, now), '—');
});

test('estimated end uses the local 24-hour clock and invalid or missing input is a dash', () => {
  // Construct local instants to keep expectations portable across test timezones.
  assert.equal(mobileEndTime(new Date(2026, 8, 15, 17, 10).toISOString()), '17:10');
  assert.equal(mobileEndTime(new Date(2030, 8, 15, 8, 5).toISOString()), '08:05', 'A valid future estimate remains visible');
  assert.equal(mobileEndTime(new Date(2020, 8, 15, 17, 10).toISOString()), '17:10', 'Formatting does not silently erase an overdue estimate');
  for (const missing of [undefined, '', 'invalid-date']) assert.equal(mobileEndTime(missing), '—');
});

// Navigation checks below are intentionally static wiring guards. They do not
// claim to simulate Drawer focus behavior, React effects or a native device.
const navigationSource = readFileSync(new URL('../../components/MobileNav.tsx', import.meta.url), 'utf8');
const navigationAst = ts.createSourceFile('MobileNav.tsx', navigationSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes(root, predicate) {
  const found = [];
  const visit = node => { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(root);
  return found;
}
function variable(name) {
  const declaration = nodes(navigationAst, node => ts.isVariableDeclaration(node) && node.name.getText(navigationAst) === name)[0];
  assert.ok(declaration, `Missing navigation declaration: ${name}`);
  return declaration.initializer;
}
const compact = node => node.getText(navigationAst).replace(/\s+/g, ' ').trim();

test('MobileNav retains four authorized primary destinations and a More drawer entry', () => {
  const primary = variable('PRIMARY_IDS');
  assert.ok(ts.isNewExpression(primary) && primary.expression.getText(navigationAst) === 'Set');
  assert.deepEqual(primary.arguments[0].elements.map(node => node.text), ['dashboard', 'flow', 'timeline', 'statistics']);
  assert.match(navigationSource, /aria-label="Hlavní navigace"/);
  assert.match(navigationSource, /primaryItems\.map\(item\s*=>/);
  assert.match(navigationSource, /aria-label="Více možností"\s+aria-expanded=\{moreOpen\}\s+aria-haspopup="dialog"/);
  assert.match(navigationSource, /<Drawer\s+open=\{moreOpen\}/);
});

test('both primary and More items derive exclusively from the permission-filtered collection', () => {
  assert.match(compact(variable('enabledItems')), /SIDEBAR_ITEMS\.filter\(item => isSuperAdmin \|\| hasModuleAccess\(item\.id\)\)/);
  assert.equal(compact(variable('primaryItems')), 'enabledItems.filter(item => PRIMARY_IDS.has(item.id))');
  assert.equal(compact(variable('moreItems')), 'enabledItems.filter(item => !PRIMARY_IDS.has(item.id))');
  assert.match(navigationSource, /moreItems\.map\(item\s*=>/);
  assert.doesNotMatch(navigationSource, /SIDEBAR_ITEMS\.map\(/, 'No unfiltered list may be rendered separately');
  assert.match(navigationSource, /onClick=\{\(\) => onNavigate\(item\.id\)\}/);
  assert.match(navigationSource, /closeMore\(\); onNavigate\(item\.id\);/);
});

test('More retains real logout with pending/error states and does not gate it behind module permissions', () => {
  assert.match(navigationSource, /hasModuleAccess, logout\s*\}\s*= useAuth\(\)/);
  const logoutStart = navigationSource.indexOf('disabled={loggingOut}');
  assert.ok(logoutStart >= 0, 'Logout needs its pending guard');
  const logout = navigationSource.slice(logoutStart, navigationSource.indexOf('</button>', logoutStart));
  assert.match(logout, /await logout\(\); closeMore\(\)/);
  assert.match(logout, /catch\s*\{\s*setLogoutError\('Odhlášení se nezdařilo\. Zkuste to znovu\.'\)/);
  assert.match(logout, /finally\s*\{\s*setLoggingOut\(false\)/);
  assert.match(logout, /loggingOut \? 'Odhlašuji…' : 'Odhlásit se'/);
  assert.doesNotMatch(logout, /hasModuleAccess|isSuperAdmin/);
  assert.match(navigationSource, /logoutError && <p role="alert">\{logoutError\}<\/p>/);
});

test('open More intercepts native Back in capture phase and removes the identical listener on cleanup', () => {
  const [effect] = nodes(navigationAst, node => ts.isCallExpression(node)
    && node.expression.getText(navigationAst) === 'useEffect'
    && node.getText(navigationAst).includes('nativeBackButton'));
  assert.ok(effect, 'Missing More native-back effect');
  const code = compact(effect);
  assert.match(code, /if \(!moreOpen\) return;/);
  assert.match(code, /event\.preventDefault\(\); event\.stopImmediatePropagation\(\); closeMore\(\);/);
  assert.match(code, /window\.addEventListener\('nativeBackButton', onNativeBack, \{ capture: true \}\)/);
  assert.match(code, /return \(\) => window\.removeEventListener\('nativeBackButton', onNativeBack, \{ capture: true \}\)/);
  assert.equal(compact(effect.arguments[1]), '[moreOpen, closeMore]');
  assert.match(compact(variable('closeMore')), /setMoreOpen\(false\); moreRef\.current\?\.focus\(\)/);
});
