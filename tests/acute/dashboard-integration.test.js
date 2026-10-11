import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const app = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name) {
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(app) === name) result = node.initializer.getText(app);
    ts.forEachChild(node, visit);
  }
  visit(app);
  assert.ok(result, name);
  return result;
}
function evaluate(name, values) {
  const compiled = ts.transpileModule(`module.exports = ${expression(name)};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', ...Object.keys(values), compiled)(module, ...Object.values(values));
  return module.exports;
}

test('dashboard acute reads require enabled hospital module, login, settled permissions and both module accesses', () => {
  const state = { currentView: 'dashboard', isAuthenticated: true, hospitalLoading: false, permissionsLoading: false,
    modules: [{ id: 'acute-requests', is_enabled: true }], hasModuleAccess: () => true };
  assert.equal(evaluate('acuteDashboardDataEnabled', state), true);
  for (const overrides of [{ currentView: 'settings' }, { isAuthenticated: false }, { hospitalLoading: true },
    { permissionsLoading: true }, { modules: [] }, { modules: [{ id: 'acute-requests', is_enabled: false }] },
    { hasModuleAccess: id => id !== 'acute-requests' }, { hasModuleAccess: id => id !== 'dashboard' }]) {
    assert.equal(evaluate('acuteDashboardDataEnabled', { ...state, ...overrides }), false);
  }
  assert.match(source, /useAcuteRequests\(acuteDataEnabled\)/);
  assert.match(source, /useAcuteCycleLinks\(acuteDataEnabled\)/);
  assert.match(source, /acuteByRoom=\{acuteByRoom\}/);
});

test('dashboard map never reports waiting requests while either authoritative source is unverified', () => {
  const calls = [], empty = new Map(), expected = new Map([['room', {}]]);
  const state = { acuteDashboardDataEnabled: true,
    acuteRoom: { requests: [], loading: false, error: null }, acuteCycles: { links: [], loading: false, error: null },
    rooms: [{ id: 'room' }], activeHospitalId: 'hospital', EMPTY_ACUTE_BY_ROOM: empty,
    useMemo: callback => callback(), getAcuteDashboardByRoom: (...args) => { calls.push(args); return expected; } };
  assert.equal(evaluate('acuteByRoom', state), expected);
  assert.deepEqual(calls[0], [state.acuteRoom.requests, state.acuteCycles.links, state.rooms, 'hospital']);
  for (const overrides of [{ acuteDashboardDataEnabled: false }, { acuteRoom: { loading: true } },
    { acuteRoom: { error: 'unavailable' } }, { acuteCycles: { loading: true } }, { acuteCycles: { error: 'unavailable' } }]) {
    calls.length = 0;
    assert.equal(evaluate('acuteByRoom', { ...state, ...overrides }), empty);
    assert.deepEqual(calls, []);
  }
});

test('room order warning is derived only after both queue and complete cycle evidence are verified', () => {
  const calls = [], expected = { selectedRequest: { id: 'selected' } };
  const state = { acuteDetailDataEnabled: true, acuteRoomEnabled: true,
    acuteRoom: { requests: [], loading: false, error: null }, acuteCycles: { links: [], loading: false, error: null },
    selectedAcuteRoom: { requestId: 'selected' }, selectedRoomId: 'room', rooms: [{ id: 'room' }], activeHospitalId: 'hospital',
    useMemo: callback => callback(), getAcuteRoomContext: (...args) => { calls.push(args); return expected; } };
  assert.equal(evaluate('acuteRoomContext', state), expected);
  for (const overrides of [{ acuteDetailDataEnabled: false }, { selectedRoomId: null },
    { acuteRoom: { loading: true } }, { acuteRoom: { error: 'failed' } },
    { acuteCycles: { loading: true } }, { acuteCycles: { error: 'failed' } }]) {
    calls.length = 0;
    assert.equal(evaluate('acuteRoomContext', { ...state, ...overrides }), null);
    assert.deepEqual(calls, []);
  }
});
