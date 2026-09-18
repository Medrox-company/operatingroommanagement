import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../../components/OperatingRoomsManager.tsx', import.meta.url), 'utf8');

function loadCallback(source, name, scope) {
  const parsed = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      expression = node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(expression, `Missing ${name}`);
  const exports = {};
  const js = ts.transpileModule(`exports.callback = (${expression.getText(parsed)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('exports', ...Object.keys(scope), js)(exports, ...Object.values(scope));
  return exports.callback;
}

const schedule = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  .map(day => [day, { enabled: day === 'monday', startHour: 7, startMinute: 0, endHour: 15, endMinute: 30, breakMinutes: 30 }]));

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function editor(onScheduleUpdate) {
  const draft = { id: 'room-11', name: 'PCHO SÁL Č.2', weeklySchedule: schedule };
  const state = { rooms: [{ id: 'room-11', name: draft.name, weeklySchedule: null, isPaused: false }], saving: false, draft, error: null, success: null };
  const scope = {
    scheduleSaveInFlight: { current: false },
    onScheduleUpdate,
    setIsScheduleSaving: value => { state.saving = value; },
    setScheduleError: value => { state.error = value; },
    setScheduleSuccess: value => { state.success = value; },
    setScheduleEditRoom: value => { state.draft = value; },
    setRoomsList: update => { state.rooms = typeof update === 'function' ? update(state.rooms) : update; },
  };
  return { state, save: loadCallback(manager, 'handleUpdateSchedule', scope) };
}

function appWriter(fetch) {
  const state = { rooms: [{ id: 'room-11', weeklySchedule: null, isPaused: false }, { id: 'other' }], marked: [], requests: [] };
  const save = loadCallback(app, 'handleUpdateWeeklySchedule', {
    useCallback: callback => callback,
    fetch: async (...args) => { state.requests.push(args); return fetch(...args); },
    markRoomLocallyUpdated: id => state.marked.push(id),
    setRooms: update => { state.rooms = update(state.rooms); },
  });
  return { state, save };
}

test('editor waits for persistence and prevents repeated saves, without replacing concurrent room changes', async () => {
  const pending = deferred();
  let calls = 0;
  const fixture = editor(async (id, value) => {
    calls++;
    assert.equal(id, 'room-11');
    assert.equal(value, schedule);
    await pending.promise;
  });
  const saved = fixture.save('room-11', schedule);
  assert.equal(fixture.state.saving, true);
  assert.equal(fixture.state.rooms[0].weeklySchedule, null);
  assert.notEqual(fixture.state.draft, null);
  await fixture.save('room-11', schedule);
  assert.equal(calls, 1);
  fixture.state.rooms[0] = { ...fixture.state.rooms[0], isPaused: true };
  pending.resolve();
  await saved;
  assert.equal(fixture.state.saving, false);
  assert.equal(fixture.state.draft, null);
  assert.equal(fixture.state.rooms[0].weeklySchedule, schedule);
  assert.equal(fixture.state.rooms[0].isPaused, true);
  assert.match(fixture.state.success, /uložena/);
});

test('rejected save keeps the draft open, exposes error and allows retry', async () => {
  let attempt = 0;
  const fixture = editor(async () => {
    if (++attempt === 1) throw new Error('Nemáte oprávnění.');
  });
  const original = fixture.state.draft;
  await fixture.save('room-11', schedule);
  assert.equal(fixture.state.draft, original);
  assert.equal(fixture.state.rooms[0].weeklySchedule, null);
  assert.equal(fixture.state.error, 'Nemáte oprávnění.');
  assert.equal(fixture.state.success, null);
  assert.equal(fixture.state.saving, false);
  await fixture.save('room-11', schedule);
  assert.equal(fixture.state.error, null);
  assert.equal(fixture.state.draft, null);
});

test('network failure is explained in Czech and missing save handler cannot claim success', async () => {
  const offline = editor(async () => { throw new TypeError('Failed to fetch'); });
  await offline.save('room-11', schedule);
  assert.match(offline.state.error, /připojení/);
  assert.notEqual(offline.state.draft, null);
  const disconnected = editor(undefined);
  await disconnected.save('room-11', schedule);
  assert.match(disconnected.state.error, /není dostupné/);
  assert.equal(disconnected.state.success, null);
});

test('app sends the numeric schedule and updates cache only after confirmed HTTP success', async () => {
  const pending = deferred();
  const fixture = appWriter(() => pending.promise);
  const promise = fixture.save('room-11', schedule);
  assert.equal(fixture.state.rooms[0].weeklySchedule, null);
  assert.deepEqual(fixture.state.marked, []);
  const [url, options] = fixture.state.requests[0];
  assert.equal(url, '/api/admin/operating-rooms');
  assert.equal(options.method, 'PATCH');
  assert.equal(options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(options.body), { id: 'room-11', weekly_schedule: schedule });
  fixture.state.rooms[0] = { ...fixture.state.rooms[0], isPaused: true };
  pending.resolve({ ok: true, json: async () => ({ success: true }) });
  await promise;
  assert.equal(fixture.state.rooms[0].weeklySchedule, schedule);
  assert.equal(fixture.state.rooms[0].isPaused, true);
  assert.deepEqual(fixture.state.rooms[1], { id: 'other' });
});

test('400, 403, 404 and 500 responses never publish unconfirmed schedule', async () => {
  for (const status of [400, 403, 404, 500]) {
    const fixture = appWriter(async () => ({ ok: false, status, json: async () => ({ error: `Chyba ${status}` }) }));
    await assert.rejects(fixture.save('room-11', schedule), new RegExp(`Chyba ${status}`));
    assert.equal(fixture.state.rooms[0].weeklySchedule, null);
    assert.deepEqual(fixture.state.marked, []);
  }
});

test('invalid successful response and connection error also cannot claim a saved schedule', async () => {
  for (const fetch of [
    async () => ({ ok: true, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => { throw new Error('Not JSON'); } }),
    async () => { throw new TypeError('Failed to fetch'); },
  ]) {
    const fixture = appWriter(fetch);
    await assert.rejects(fixture.save('room-11', schedule));
    assert.equal(fixture.state.rooms[0].weeklySchedule, null);
  }
});

test('form no longer closes on click before saving and keeps server refresh separate from draft', () => {
  assert.doesNotMatch(manager, /hasInitialized/);
  assert.match(manager, /\}, \[initialRooms\]\)/);
  const saveButton = manager.slice(manager.indexOf('void handleUpdateSchedule'), manager.indexOf('void handleUpdateSchedule') + 450);
  assert.doesNotMatch(saveButton, /setScheduleEditRoom/);
  assert.match(manager, /<fieldset disabled=\{isScheduleSaving\}/);
  assert.match(manager, /role="alert"/);
  assert.match(manager, /role="status"/);
  const handler = manager.slice(manager.indexOf('const handleUpdateSchedule'), manager.indexOf('const stats = useMemo'));
  assert.doesNotMatch(handler, /onRoomsChange/);
});
