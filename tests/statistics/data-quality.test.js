import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';

// Run the existing fetchers and realtime reducers with local responses only.
// No React lifecycle, SWR retries, Supabase client, or network is started.
const source = readFileSync(new URL('../../hooks/useStatisticsData.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const progressModule = { exports: {} };
new Function('exports', 'module', ts.transpileModule(readFileSync(new URL('../../lib/statistics-loading-progress.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(progressModule.exports, progressModule);
const preloaderModule = { exports: {} };
new Function('require', 'exports', 'module', ts.transpileModule(readFileSync(new URL('../../components/statistics/StatisticsPreloader.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText)(name => {
  if (name === 'react') return React;
  if (name === '../../lib/statistics-loading-progress') return progressModule.exports;
  if (name.endsWith('.css')) return {};
  throw new Error(`Unexpected preloader dependency: ${name}`);
}, preloaderModule.exports, preloaderModule);

function harness({ history = [], notifications = [], devices = [], dayHistory = [] } = {}) {
  const slots = [];
  const listeners = new Map();
  const calls = [];
  let cursor = 0;
  let hospitalId = 'hospital-a';
  const cache = new Map();
  const response = value => value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  const imports = {
    react: { useMemo: factory => factory(), useCallback: callback => callback, useSyncExternalStore: (_subscribe, get) => get() },
    swr: { __esModule: true, useSWRConfig: () => ({ cache }), default: (key, fetcher, options) => {
      const index = cursor++;
      const slot = slots[index] ??= { data: undefined, error: undefined, isLoading: Boolean(key) };
      Object.assign(slot, { key, fetcher, options });
      return {
        data: slot.data, error: slot.error, isLoading: slot.isLoading, isValidating: slot.isValidating,
        mutate: async (update, mutateOptions) => {
          assert.equal(mutateOptions.revalidate, false);
          slot.data = update(slot.data);
        },
      };
    } },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospitalId }) },
    '../contexts/RealtimeContext': { useHospitalRealtime: (table, callback) => listeners.set(table, callback) },
    '../lib/db': {
      buildCompletedOperationsFromEvents: () => [],
      getDatabaseHospitalId: () => hospitalId,
      fetchStatusHistory: options => {
        calls.push({ source: 'statusHistory', options });
        return response(options.toDate.getTime() - options.fromDate.getTime() === 31 * 86_400_000 ? dayHistory : history);
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
    '../lib/statistics-loading-progress': progressModule.exports,
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
    async load(source) {
      await Promise.all(slots.filter(slot => slot.key && (!source || slot.key[2] === source)).map(async slot => {
        slot.isValidating = true;
        try {
          slot.data = await slot.fetcher(slot.key);
          slot.error = undefined;
        } catch (error) {
          slot.error = error;
        } finally {
          slot.isLoading = false;
          slot.isValidating = false;
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

test('a slow unrelated source does not block the ready source required by another tab', async () => {
  let finishNotifications;
  const app = harness({ notifications: new Promise(resolve => { finishNotifications = resolve; }) });
  app.render();
  const pending = app.load();
  await new Promise(resolve => setImmediate(resolve));
  const partial = app.render();
  assert.deepEqual(partial.reportSourceLoading, { statusHistory: false, dayHistory: false, notifications: true, devices: false });
  assert.equal(partial.progressBySource.statusHistory.complete, true);
  assert.equal(partial.progressBySource.notifications.complete, false);
  assert.equal(partial.notifications, null, 'An incomplete source cannot look like successful zero data');
  finishNotifications([]);
  await pending;
  assert.equal(app.render().isReportLoading, false);
});

test('page callbacks remain truthful and cannot reach 100 before the source snapshot is ready', async () => {
  let finishHistory;
  const app = harness({ history: new Promise(resolve => { finishHistory = resolve; }) });
  app.render('rok');
  const pending = app.load('statusHistory');
  const callback = app.calls[0].options.onProgress;
  callback({ loaded: 1000, total: 2500, complete: false });
  let result = app.render('rok');
  assert.deepEqual(result.progressBySource.statusHistory, { loaded: 1000, total: 2500, complete: false });
  assert.equal(result.reportSourceLoading.statusHistory, true);
  callback({ loaded: 2500, total: 2500, complete: true });
  result = app.render('rok');
  assert.equal(result.progressBySource.statusHistory.complete, false, 'Callback completion alone cannot certify SWR data readiness');
  const pendingBar = preloaderModule.exports.StatisticsPreloader({ progress: progressModule.exports.aggregateStatisticsProgress([result.progressBySource.statusHistory]) });
  assert.equal(pendingBar.props['aria-valuenow'], 99, 'The same hook/aggregate/component chain used by Statistics must cap a pending source');
  finishHistory(Array.from({ length: 2500 }, (_, index) => ({ id: String(index) })));
  await pending;
  result = app.render('rok');
  assert.deepEqual(result.progressBySource.statusHistory, { loaded: 2500, total: 2500, complete: true });
  assert.equal(result.reportSourceLoading.statusHistory, false);
  const readyBar = preloaderModule.exports.StatisticsPreloader({ progress: progressModule.exports.aggregateStatisticsProgress([result.progressBySource.statusHistory]) });
  assert.equal(readyBar.props['aria-valuenow'], 100);
});

test('deferred fetchers for a stale tenant cannot issue a read under a different scope', async () => {
  const app = harness();
  app.render('den', 'hospital-a');
  const stale = { key: app.slots[0].key, fetcher: app.slots[0].fetcher };
  app.render('den', 'hospital-b');
  await assert.rejects(stale.fetcher(stale.key), /Zdravotnické zařízení se změnilo/);
  assert.equal(app.calls.length, 0);
  const current = app.render('den', 'hospital-b');
  assert.deepEqual(current.progressBySource.statusHistory, { loaded: 0, total: null, complete: false });
  assert.deepEqual(current.statusHistory, []);
});

test('realtime events from another hospital cannot enter current scoped snapshots', async () => {
  const app = harness();
  app.render();
  await app.load();
  app.render();
  for (const table of ['room_status_history', 'notifications_log', 'devices']) {
    app.emit(table, 'INSERT', { id: 'foreign-row', hospital_id: 'hospital-b' });
  }
  const result = app.render();
  assert.deepEqual(result.statusHistory, []);
  assert.deepEqual(result.dayHistory, []);
  assert.deepEqual(result.notifications, []);
  assert.deepEqual(result.devices, []);
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

test('previous source data cannot be displayed or reported under a different period or hospital', async () => {
  const row = { id: 'event-a', operating_room_id: 'room-a', event_type: 'operation_start', timestamp: '2026-09-14T10:00:00Z' };
  const app = harness({ history: [row], dayHistory: [row] });
  app.render();
  await app.load();
  assert.equal(app.render().isReportLoading, false);
  const changedPeriod = app.render('rok');
  assert.deepEqual(changedPeriod.statusHistory, []);
  assert.equal(changedPeriod.isLoading, true);
  assert.equal(changedPeriod.isReportLoading, true);
  const changedHospital = app.render('den', 'hospital-b');
  assert.deepEqual(changedHospital.dayHistory, []);
  assert.equal(changedHospital.isReportLoading, true);
  assert.equal(changedHospital.dayHistoryCoverageStart, null);
  assert.equal(app.calls.length, 4, 'Rendering report metadata does not start queries');
});

test('an unscoped pre-update array cache cannot certify or expose another tenant snapshot', async () => {
  const row = { id: 'event-a', operating_room_id: 'room-a', event_type: 'operation_start', timestamp: '2026-09-14T10:00:00Z' };
  const app = harness();
  app.render();
  await app.load();
  app.slots[1].data = [row];
  let result = app.render();
  assert.deepEqual(result.dayHistory, []);
  assert.equal(result.dayHistoryCoverageStart, null);
  assert.equal(result.isReportLoading, true);
  app.emit('room_status_history', 'INSERT', { ...row, id: 'event-b' });
  result = app.render();
  assert.deepEqual(result.dayHistory, []);
  assert.equal(result.dayHistoryCoverageStart, null);
  assert.equal(app.calls.length, 4);
});
