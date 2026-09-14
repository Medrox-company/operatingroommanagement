import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Run the existing fetchers and realtime reducers with local responses only.
// No React lifecycle, SWR retries, Supabase client, or network is started.
const source = readFileSync(new URL('../../hooks/useStatisticsData.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function harness({ history = [], notifications = [], devices = [], dayHistory = [] } = {}) {
  const slots = [];
  const listeners = new Map();
  const calls = [];
  let cursor = 0;
  let historyCalls = 0;
  let hospitalId = 'hospital-a';
  const response = value => value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  const imports = {
    react: { useMemo: factory => factory() },
    swr: (key, fetcher, options) => {
      const index = cursor++;
      const slot = slots[index] ??= { data: undefined, error: undefined, isLoading: Boolean(key) };
      Object.assign(slot, { key, fetcher, options });
      return {
        data: slot.data, error: slot.error, isLoading: slot.isLoading,
        mutate: async (update, mutateOptions) => {
          assert.equal(mutateOptions.revalidate, false);
          slot.data = update(slot.data);
        },
      };
    },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospitalId }) },
    '../contexts/RealtimeContext': { useHospitalRealtime: (table, callback) => listeners.set(table, callback) },
    '../lib/db': {
      buildCompletedOperationsFromEvents: () => [],
      fetchStatusHistory: options => {
        calls.push({ source: 'statusHistory', options });
        return response(historyCalls++ % 2 === 0 ? history : dayHistory);
      },
      fetchNotificationsLog: options => {
        calls.push({ source: 'notifications', options });
        return response(notifications);
      },
      fetchDevices: () => {
        calls.push({ source: 'devices' });
        return response(devices);
      },
    },
  };
  const moduleStub = { exports: {} };
  new Function('require', 'exports', 'module', compiled)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
    return imports[name];
  }, moduleStub.exports, moduleStub);
  return {
    slots, calls,
    render(period = 'den', activeHospitalId = hospitalId) {
      hospitalId = activeHospitalId;
      cursor = 0;
      return moduleStub.exports.useStatisticsData(period);
    },
    async load() {
      await Promise.all(slots.filter(slot => slot.key).map(async slot => {
        try {
          slot.data = await slot.fetcher();
          slot.error = undefined;
        } catch (error) {
          slot.error = error;
        } finally {
          slot.isLoading = false;
        }
      }));
    },
    emit(table, eventType, row) {
      listeners.get(table)({ eventType, new: eventType === 'DELETE' ? null : row, old: eventType === 'DELETE' ? row : null });
    },
  };
}

test('successful empty datasets remain valid and day coverage comes from request bounds', async () => {
  const app = harness();
  const initial = app.render();
  assert.equal(initial.isReportLoading, true);
  assert.equal(initial.notifications, null);
  assert.equal(initial.devices, null);
  assert.equal(initial.dayHistoryCoverageStart, null);
  await app.load();
  const result = app.render();
  assert.equal(result.isReportLoading, false);
  assert.equal(result.reportError, null);
  assert.deepEqual(result.reportSourceErrors, { statusHistory: null, notifications: null, devices: null, dayHistory: null });
  assert.deepEqual(result.dayHistory, []);
  const request = app.calls.filter(call => call.source === 'statusHistory')[1].options;
  assert.equal(result.dayHistoryCoverageStart, request.fromDate.toISOString());
  assert.equal(result.dayHistoryCoverageEnd, request.toDate.toISOString());
  assert.equal(request.toDate.getTime() - request.fromDate.getTime(), 31 * 86_400_000);
  assert.equal(app.calls.length, 4, 'Only the existing three main requests and day-history request run');
});

test('each null fetch result exposes the failed source while keeping displayed empty arrays', async () => {
  for (const [input, source] of [['history', 'statusHistory'], ['notifications', 'notifications'], ['devices', 'devices'], ['dayHistory', 'dayHistory']]) {
    const app = harness({ [input]: null });
    app.render();
    await app.load();
    const result = app.render();
    assert.equal(result.isReportLoading, false, source);
    assert.equal(typeof result.reportSourceErrors[source], 'string', source);
    assert.ok(result.reportError, source);
    assert.deepEqual(result[source], [], source);
    assert.equal(result.error, undefined, 'Returned null does not become an SWR exception or trigger retries');
    assert.deepEqual(Object.entries(result.reportSourceErrors).filter(([, value]) => value !== null).map(([key]) => key), [source]);
    if (source === 'dayHistory') {
      assert.equal(result.dayHistoryCoverageStart, null);
      assert.equal(result.dayHistoryCoverageEnd, null);
    }
  }
});

test('thrown SWR failures remain distinguishable from empty successful data', async () => {
  const failure = new Error('Offline');
  const app = harness({ dayHistory: failure });
  app.render();
  await app.load();
  const result = app.render();
  assert.equal(result.error, failure);
  assert.equal(result.isReportLoading, false);
  assert.ok(result.reportSourceErrors.dayHistory);
  assert.equal(result.dayHistoryCoverageStart, null);
});

test('realtime inserts, updates and deletes retain fetch coverage without extra reads', async () => {
  const first = { id: 'event-a', operating_room_id: 'room-a', timestamp: '2026-09-14T10:00:00Z', event_type: 'operation_start' };
  const app = harness({ history: [first], dayHistory: [first] });
  app.render();
  await app.load();
  const initial = app.render();
  assert.notEqual(initial.dayHistoryCoverageStart, first.timestamp, 'Coverage must not be inferred from the earliest event');
  const next = { ...first, id: 'event-b' };
  app.emit('room_status_history', 'INSERT', next);
  let result = app.render();
  assert.deepEqual(result.statusHistory.map(row => row.id), ['event-b', 'event-a']);
  assert.deepEqual(result.dayHistory.map(row => row.id), ['event-b', 'event-a']);
  app.emit('room_status_history', 'UPDATE', { ...next, step_name: 'Operace' });
  result = app.render();
  assert.equal(result.dayHistory[0].step_name, 'Operace');
  app.emit('room_status_history', 'DELETE', next);
  result = app.render();
  assert.deepEqual(result.dayHistory.map(row => row.id), ['event-a']);
  assert.equal(result.dayHistoryCoverageStart, initial.dayHistoryCoverageStart);
  assert.equal(result.dayHistoryCoverageEnd, initial.dayHistoryCoverageEnd);
  assert.equal(result.reportError, null);
  assert.equal(app.calls.length, 4);
});

test('realtime rows cannot certify completeness after a failed initial fetch', async () => {
  const app = harness({ history: null, notifications: null, devices: null, dayHistory: null });
  app.render();
  await app.load();
  const initial = app.render();
  app.emit('room_status_history', 'INSERT', { id: 'event-a', operating_room_id: 'room-a', event_type: 'operation_start', timestamp: '2026-09-14T10:00:00Z' });
  app.emit('notifications_log', 'INSERT', { id: 'notification-a' });
  app.emit('devices', 'INSERT', { id: 'device-a' });
  const result = app.render();
  assert.equal(result.statusHistory.length, 1);
  assert.equal(result.dayHistory.length, 1);
  assert.equal(result.notifications.length, 1);
  assert.equal(result.devices.length, 1);
  assert.deepEqual(result.reportSourceErrors, initial.reportSourceErrors);
  assert.equal(result.dayHistoryCoverageStart, null);
  assert.equal(app.calls.length, 4);
});

test('keepPreviousData stays visible but cannot be reported under a different period or hospital', async () => {
  const row = { id: 'event-a', operating_room_id: 'room-a', event_type: 'operation_start', timestamp: '2026-09-14T10:00:00Z' };
  const app = harness({ history: [row], dayHistory: [row] });
  app.render();
  await app.load();
  assert.equal(app.render().isReportLoading, false);
  const changedPeriod = app.render('rok');
  assert.deepEqual(changedPeriod.statusHistory, [row]);
  assert.equal(changedPeriod.isLoading, false, 'Existing display loading semantics are unchanged');
  assert.equal(changedPeriod.isReportLoading, true);
  const changedHospital = app.render('den', 'hospital-b');
  assert.deepEqual(changedHospital.dayHistory, [row]);
  assert.equal(changedHospital.isReportLoading, true);
  assert.equal(changedHospital.dayHistoryCoverageStart, null);
  assert.equal(app.calls.length, 4, 'Rendering report metadata does not start queries');
});

test('a pre-update array cache stays visible and mutable without inventing coverage', async () => {
  const row = { id: 'event-a', operating_room_id: 'room-a', event_type: 'operation_start', timestamp: '2026-09-14T10:00:00Z' };
  const app = harness();
  app.render();
  await app.load();
  app.slots[1].data = [row];
  let result = app.render();
  assert.deepEqual(result.dayHistory, [row]);
  assert.equal(result.dayHistoryCoverageStart, null);
  assert.equal(result.isReportLoading, true);
  app.emit('room_status_history', 'INSERT', { ...row, id: 'event-b' });
  result = app.render();
  assert.deepEqual(result.dayHistory.map(event => event.id), ['event-b', 'event-a']);
  assert.equal(result.dayHistoryCoverageStart, null);
  assert.equal(app.calls.length, 4);
});
