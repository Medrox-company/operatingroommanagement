import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function evaluate(source, dependencies = {}) {
  const module = { exports: {} };
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', ...Object.keys(dependencies), output)(module, module.exports, ...Object.values(dependencies));
  return module.exports;
}
const app = ts.createSourceFile('App.tsx', read('App.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name) {
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(app) === name) expression = node.initializer.arguments[0].getText(app);
    ts.forEachChild(node, visit);
  }
  visit(app);
  assert.ok(expression);
  return expression;
}
function handler(overrides = {}) {
  const calls = [];
  const dependencies = {
    selectedRoomId: 'room', activeHospitalId: 'hospital', user: { id: 'user' },
    roomsRef: { current: [{ id: 'room', currentStepIndex: 0, stateRevision: 5 }] },
    acuteRoomEnabled: true, acuteRoomContext: { selectedRequest: { id: 'request' } },
    acuteCycles: { loading: false, error: null, refresh: async () => calls.push('refresh-links') },
    acuteStartInFlightRef: { current: false }, acuteScopeRef: { current: { hospitalId: 'hospital', userId: 'user' } },
    toast: { error: message => calls.push(['error', message]) },
    startAcuteRoomCycle: async (...args) => { calls.push(['start', ...args]); return { room: { state_revision: 6, id: 'room' } }; },
    markRoomLocallyUpdated: id => calls.push(['mark', id]),
    setRooms: fn => { calls.push(['rooms', fn([{ id: 'room', stateRevision: 5 }])]); },
    transformSingleRoom: row => ({ stateRevision: row.state_revision, currentStepIndex: 1 }),
    window: { dispatchEvent: event => calls.push(['event', event.type, event.detail]) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    refreshRooms: async () => calls.push('refresh-rooms'),
    updateRoomStep: (...args) => calls.push(['ordinary', ...args]),
    ...overrides,
  };
  return { calls, dependencies, run: evaluate(`module.exports = ${callback('handleStepChange')}`, dependencies) };
}

test('explicit ready→arrival atomically starts selected acute cycle, with no ordinary phase write', async () => {
  const { run, calls } = handler();
  assert.equal(await run(1, 'green'), true);
  assert.deepEqual(calls[0], ['start', 'hospital', 'request', 'room', 5]);
  assert.ok(calls.some(call => call[0] === 'rooms'));
  assert.ok(calls.some(call => call[0] === 'event' && call[1] === 'acuteCycleLinked'));
  assert.ok(!calls.some(call => call[0] === 'ordinary'));
});

test('a displayed order warning does not block an explicitly selected non-head request or reorder the queue', async () => {
  const { run, calls } = handler({ acuteRoomContext: { selectedRequest: { id: 'selected-third' },
    orderWarning: { selectedPosition: 3, firstRequest: { id: 'first' } } } });
  assert.equal(await run(1), true);
  assert.deepEqual(calls[0], ['start', 'hospital', 'selected-third', 'room', 5]);
  assert.ok(calls.every(call => call[0] !== 'ordinary'));
  assert.ok(calls.every(call => call[0] !== 'reorder'));
});

test('normal phases, full completion and dashboard-only arrival keep the ordinary clinical handler', async () => {
  for (const [index, overrides] of [[2, {}], [0, {}], [1, { acuteRoomEnabled: false }], [1, { roomsRef: { current: [{ id: 'room', currentStepIndex: 2 }] } }]]) {
    const { run, calls } = handler(overrides);
    assert.equal(await run(index, 'blue'), true);
    assert.deepEqual(calls, [['ordinary', 'room', index, 'blue']]);
  }
});

test('unverified or already-bound selection cannot silently start a normal cycle', async () => {
  for (const overrides of [{ acuteRoomContext: null }, { acuteRoomContext: { selectedRequest: { id: 'request' }, cycleLink: {} } },
    { acuteCycles: { loading: true } }, { acuteCycles: { error: 'unavailable' } }, { roomsRef: { current: [{ id: 'room', currentStepIndex: 0 }] } }]) {
    const { run, calls } = handler(overrides);
    assert.equal(await run(1), false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'error');
  }
});

test('start failure returns false, reports failure and reconciles without an optimistic phase', async () => {
  const { run, calls, dependencies } = handler({ startAcuteRoomCycle: async () => { throw new Error('CAS conflict'); } });
  assert.equal(await run(1), false);
  assert.deepEqual(calls, [['error', 'CAS conflict'], 'refresh-rooms', 'refresh-links']);
  assert.equal(dependencies.acuteStartInFlightRef.current, false);
});

test('hospital/account switch during a confirmed start never paints data into the new scope', async () => {
  const scope = { current: { hospitalId: 'hospital', userId: 'user' } };
  const { run, calls } = handler({ acuteScopeRef: scope, startAcuteRoomCycle: async () => {
    scope.current = { hospitalId: 'other', userId: 'user' }; return { room: { state_revision: 6 } };
  } });
  assert.equal(await run(1), false);
  assert.deepEqual(calls, []);
});

test('double confirmation does not submit two concurrent start commands', async () => {
  let finish;
  const { run, calls } = handler({ startAcuteRoomCycle: () => new Promise(resolve => { finish = resolve; }) });
  const first = run(1);
  assert.equal(await run(1), false);
  finish({ room: { state_revision: 6 } });
  assert.equal(await first, true);
  assert.equal(calls.filter(call => call[0] === 'rooms').length, 1);
});

test('RoomDetail does not reset a timer or write estimated/patient fields after rejected start', () => {
  const source = read('components/RoomDetail.tsx');
  const confirmation = source.indexOf('if (await onStepChange(newIndex, newStepColor) === false) return;');
  assert.ok(confirmation > 0);
  for (const followup of ['setPhaseStartTime(new Date());', 'onEndTimeChange(defaultEndTime);', 'onPatientStatusChange?.(null, null);']) {
    assert.ok(source.indexOf(followup, confirmation) > confirmation);
  }
});

test('client sends tenant expectation and rejects any mismatched server cycle', async () => {
  const clientSource = read('lib/acute-cycle-links-client.ts');
  let sent;
  const valid = { link: { hospitalId: 'hospital', requestId: 'request', roomId: 'room', operationStartedAt: '2026-10-08T10:00:00Z' },
    room: { id: 'room', hospital_id: 'hospital', state_revision: 6, current_step_index: 1, operation_started_at: '2026-10-08T10:00:00Z' } };
  const load = payload => evaluate(clientSource, { fetch: async (url, init) => { sent = { url, init }; return { ok: true, json: async () => payload }; } });
  assert.deepEqual(await load(valid).startAcuteRoomCycle('hospital', 'request', 'room', 5), valid);
  assert.equal(sent.init.headers['X-Acute-Hospital-Id'], 'hospital');
  assert.deepEqual(JSON.parse(sent.init.body), { requestId: 'request', roomId: 'room', expectedStateRevision: 5 });
  await assert.rejects(load({ ...valid, room: { ...valid.room, hospital_id: 'other' } }).startAcuteRoomCycle('hospital', 'request', 'room', 5));
});
