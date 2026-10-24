import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Exercise production modules with synthetic rows and a local query builder.
// The real Supabase client, credentials and network are never imported.
function loadModule(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', code)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module.exports, module);
  return module.exports;
}

function database(history = [], error = null, configured = true) {
  const queries = [];
  const builder = {
    select(...args) { queries.push(['select', ...args]); return builder; },
    eq(...args) { queries.push(['eq', ...args]); return builder; },
    gte(...args) { queries.push(['gte', ...args]); return builder; },
    lte(...args) { queries.push(['lte', ...args]); return builder; },
    order(...args) { queries.push(['order', ...args]); return builder; },
    then(resolve, reject) { return Promise.resolve({ data: history, error }).then(resolve, reject); },
  };
  const db = loadModule('../../lib/db.ts', {
    './supabase': {
      isSupabaseConfigured: configured,
      supabase: { from(table) { queries.push(['from', table]); return builder; } },
    },
    './logger': { logger: {} },
    '../types': loadModule('../../types.ts'),
  });
  db.setDatabaseHospitalId('qa-hospital');
  return { ...db, queries };
}

const db = database();
const progress = loadModule('../../lib/statistics-loading-progress.ts');
function statistics(history) {
  const cache = new Map();
  return loadModule('../../hooks/useStatisticsData.ts', {
    react: {
      useMemo: factory => factory(), useCallback: callback => callback,
      useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    },
    swr: {
      __esModule: true,
      useSWRConfig: () => ({ cache }),
      default: key => ({
        data: {
          data: key[2] === 'statusHistory' ? history : [], hospitalId: 'qa-hospital',
          period: ['statusHistory', 'notifications'].includes(key[2]) ? key[3] : null,
          reportError: null,
        },
        isLoading: false, isValidating: false, mutate: () => {},
      }),
    },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'qa-hospital', loading: false }) },
    '../contexts/RealtimeContext': { useHospitalRealtime: () => {} },
    '../lib/db': db,
    '../lib/statistics-loading-progress': progress,
  });
}
const activity = loadModule('../../lib/statistics-room-activity.ts', {
  '../components/mobile/mobile-statistics.css': {},
});

const phase = (name, duration, overrides = {}) => Object.freeze({
  id: `qa-${name}-${duration}`, hospital_id: 'qa-hospital', operating_room_id: 'qa-room',
  event_type: 'step_change', timestamp: '2026-10-20T10:00:00.000Z',
  step_name: name, duration_seconds: duration, ...overrides,
});
const reservedNames = Object.getOwnPropertyNames(Object.prototype);
const from = new Date('2026-10-20T00:00:00.000Z');
const to = new Date('2026-10-21T00:00:00.000Z');

test('stored inherited property names remain independent phase data in the hook and database statistics', async t => {
  const prototype = Object.getOwnPropertyDescriptors(Object.prototype);
  const history = Object.freeze(reservedNames.flatMap(name => [phase(name, 120), phase(name, 240)]));
  const hook = statistics(history);
  const fixture = database(history);
  const paths = [
    ['aggregator', () => hook.aggregateRoomStatistics(history)],
    ['hook', () => hook.useStatisticsData('den').dbStats],
    ['database', () => fixture.fetchRoomStatistics(from, to)],
  ];
  for (const [name, run] of paths) await t.test(name, async () => {
    const result = await run();
    assert.ok(result, 'A stored name must not turn the database result into a failure');
    assert.deepEqual(Object.keys(result.averageStepDurations).sort(), [...reservedNames].sort());
    for (const name of reservedNames) {
      assert.equal(Object.hasOwn(result.averageStepDurations, name), true, name);
      assert.equal(result.averageStepDurations[name], 3, name);
    }
    const serialized = JSON.parse(JSON.stringify(result.averageStepDurations));
    assert.equal(serialized.__proto__, 3, 'The output copy must retain the own __proto__ measurement');
  });
  assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), prototype);
  assert.deepEqual(fixture.queries, [
    ['from', 'room_status_history'], ['select', '*'], ['eq', 'hospital_id', 'qa-hospital'],
    ['gte', 'timestamp', from.toISOString()], ['lte', 'timestamp', to.toISOString()],
    ['order', 'timestamp', { ascending: true }],
  ]);
});

test('configured averages ignore unknown inherited names and accept configured inherited names', () => {
  const ordinary = [{ title: 'Chirurgický výkon' }, { title: 'Sál připraven' }, { title: 'Bez měření' }];
  const history = Object.freeze([
    ...reservedNames.map(name => phase(name, 900)),
    phase('Chirurgický výkon', 120), phase('Chirurgický výkon', 240), phase('Sál připraven', 3600),
  ]);
  assert.deepEqual(activity.calculateAvgStepDurations(history, ordinary), [3, 0, 0]);
  const configured = reservedNames.map(title => ({ title }));
  assert.deepEqual(activity.calculateAvgStepDurations(history, configured), reservedNames.map(() => 15));
});

test('ordinary durations, event filters, empty inputs and database failure behavior remain intact', async () => {
  const history = Object.freeze([
    phase('Chirurgický výkon', 120), phase('Chirurgický výkon', 240),
    phase('Chirurgický výkon', 0), phase('Chirurgický výkon', null),
    phase('Chirurgický výkon', 900, { event_type: 'pause' }), phase(null, 900),
    phase('Úklid', 60), phase('Sál připraven', 3600),
    phase(null, null, { id: 'qa-start', event_type: 'operation_start', timestamp: '2026-10-20T09:00:00.000Z' }),
    phase(null, 1800, { id: 'qa-end', event_type: 'operation_end', timestamp: '2026-10-20T09:30:00.000Z' }),
    phase(null, null, { event_type: 'emergency_on' }),
  ]);
  const expected = { 'Chirurgický výkon': 3, 'Úklid': 1, 'Sál připraven': 60 };
  const hook = statistics(history);
  for (const result of [hook.aggregateRoomStatistics(history), await database(history).fetchRoomStatistics(from, to)]) {
    assert.deepEqual(result.averageStepDurations, expected);
    assert.equal(result.totalOperations, 1);
    assert.equal(result.averageOperationDuration, 30);
    assert.equal(result.emergencyCount, 1);
    assert.deepEqual(result.operationsByRoom, { 'qa-room': 1 });
    assert.deepEqual(result.operationsByDay, { '2026-10-20': 1 });
  }
  assert.deepEqual(hook.aggregateRoomStatistics([]).averageStepDurations, {});
  assert.deepEqual((await database([]).fetchRoomStatistics(from, to)).averageStepDurations, {});
  assert.deepEqual(activity.calculateAvgStepDurations([], [{ title: 'constructor' }]), [0]);
  const unavailable = database([], null, false);
  assert.equal(await unavailable.fetchRoomStatistics(from, to), null);
  assert.deepEqual(unavailable.queries, []);
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    const failure = new Error('Synthetic query failure');
    assert.equal(await database([], failure).fetchRoomStatistics(from, to), null);
    assert.equal(errors.length, 1);
    assert.equal(errors[0][1], failure);
  } finally {
    console.error = originalError;
  }
});
