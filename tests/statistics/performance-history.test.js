import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Run the actual history loader with a local thenable query builder. These
// verify pagination/scope/readiness, not Supabase RLS or network behavior.
const source = ts.createSourceFile('db.ts', readFileSync(new URL('../../lib/db.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'fetchStatusHistory');
assert.ok(declaration, 'Production history loader exists');
const loaderCode = ts.transpileModule(`let activeHospitalId = 'hospital-a';
${declaration.getText(source)}
exports.changeHospital = value => { activeHospitalId = value; };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const makeRows = (count, hospitalId = 'hospital-a') => Array.from({ length: count }, (_, index) => ({
  id: `${hospitalId}-${String(index).padStart(5, '0')}`,
  hospital_id: hospitalId, operating_room_id: 'room-a',
  event_type: 'step_change', timestamp: '2026-09-05T08:00:00.000Z',
  step_name: 'Chirurgický výkon', duration_seconds: 60,
}));

function loader({ rows = [], onPage, errorPage, rejectPage, configured = true, countAvailable = true, reportedCount } = {}) {
  const queries = [];
  const errors = [];
  const exports = {};
  const supabase = {
    from(table) {
      const query = { table, filters: [], orders: [], range: null };
      const builder = {
        select(columns, options) { query.columns = columns; query.selectOptions = options; return builder; },
        eq(column, value) { query.filters.push(['eq', column, value]); return builder; },
        in(column, value) { query.filters.push(['in', column, value]); return builder; },
        gte(column, value) { query.filters.push(['gte', column, value]); return builder; },
        lte(column, value) { query.filters.push(['lte', column, value]); return builder; },
        order(column, options) { query.orders.push([column, options]); return builder; },
        range(from, to) { query.range = [from, to]; return builder; },
        then(resolve, reject) {
          const page = queries.length;
          queries.push(query);
          let selected = rows.filter(row => query.filters.every(([op, key, value]) => (
            op === 'eq' ? row[key] === value : op === 'in' ? value.includes(row[key]) : op === 'gte' ? row[key] >= value : row[key] <= value
          )));
          selected = [...selected].sort((a, b) => {
            for (const [column, options] of query.orders) {
              const difference = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
              if (difference) return options.ascending ? difference : -difference;
            }
            return 0;
          });
          const data = selected.slice(query.range[0], query.range[1] + 1);
          onPage?.(page, exports.changeHospital);
          if (page === rejectPage) return Promise.reject(new Error('Network unavailable')).then(resolve, reject);
          const count = countAvailable && query.selectOptions?.count === 'exact' ? reportedCount ?? selected.length : null;
          return Promise.resolve(page === errorPage ? { data: null, error: new Error('History page failed') } : { data, count, error: null }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  new Function('exports', 'supabase', 'isSupabaseConfigured', 'console', loaderCode)(exports, supabase, configured, { error: (...args) => errors.push(args) });
  return { ...exports, queries, errors };
}

test('all:true retrieves every row beyond 1000 with inclusive contiguous pages and deterministic timestamp/id sorting', async () => {
  const rows = [...makeRows(2250), ...makeRows(12, 'hospital-b')];
  const fixture = loader({ rows });
  const fromDate = new Date('2026-09-01T00:00:00Z');
  const toDate = new Date('2026-09-29T12:00:00Z');
  const result = await fixture.fetchStatusHistory({ all: true, limit: 10, roomId: 'room-a', eventTypes: ['step_change', 'operation_start'], fromDate, toDate });
  assert.equal(result.length, 2250, 'all:true is not capped by the legacy limit option');
  assert.equal(new Set(result.map(row => row.id)).size, 2250);
  assert.deepEqual(result.map(row => row.id), makeRows(2250).reverse().map(row => row.id));
  assert.deepEqual(fixture.queries.map(query => query.range), [[0, 999], [1000, 1999], [2000, 2999]]);
  for (const query of fixture.queries) {
    assert.equal(query.table, 'room_status_history');
    assert.equal(query.columns, '*');
    assert.equal(query.selectOptions, undefined, 'Existing callers do not pay for counting');
    assert.deepEqual(query.orders, [['timestamp', { ascending: false }], ['id', { ascending: false }]]);
    assert.deepEqual(query.filters, [
      ['eq', 'hospital_id', 'hospital-a'], ['eq', 'operating_room_id', 'room-a'],
      ['in', 'event_type', ['step_change', 'operation_start']],
      ['gte', 'timestamp', fromDate.toISOString()], ['lte', 'timestamp', toDate.toISOString()],
    ]);
  }
});

test('changing the active hospital between pages cannot mix tenants within one snapshot', async () => {
  const fixture = loader({
    rows: [...makeRows(1600), ...makeRows(1900, 'hospital-b')],
    onPage: (page, changeHospital) => { if (page === 0) changeHospital('hospital-b'); },
  });
  const result = await fixture.fetchStatusHistory({ all: true });
  assert.equal(result.length, 1600);
  assert.equal(result.every(row => row.hospital_id === 'hospital-a'), true);
  assert.deepEqual(fixture.queries.map(query => query.filters.find(filter => filter[1] === 'hospital_id')[2]), ['hospital-a', 'hospital-a']);
  const next = await fixture.fetchStatusHistory({ all: true });
  assert.equal(next.length, 1900);
  assert.equal(next.every(row => row.hospital_id === 'hospital-b'), true);
});

test('a failed later page returns null, never the successfully loaded prefix', async () => {
  for (const failure of [{ errorPage: 1 }, { rejectPage: 1 }]) {
    const fixture = loader({ rows: makeRows(1500), ...failure });
    assert.equal(await fixture.fetchStatusHistory({ all: true }), null);
    assert.equal(fixture.queries.length, 2);
    assert.equal(fixture.errors.length, 1);
  }
});

test('exact full pages, explicit limits, zero limits and unavailable configuration terminate correctly', async () => {
  const exact = loader({ rows: makeRows(2000) });
  assert.equal((await exact.fetchStatusHistory({ all: true })).length, 2000);
  assert.deepEqual(exact.queries.map(query => query.range), [[0, 999], [1000, 1999], [2000, 2999]]);
  const limited = loader({ rows: makeRows(2200) });
  assert.equal((await limited.fetchStatusHistory({ limit: 1501 })).length, 1501);
  assert.deepEqual(limited.queries.map(query => query.range), [[0, 999], [1000, 1500]]);
  const zero = loader({ rows: makeRows(5) });
  assert.deepEqual(await zero.fetchStatusHistory({ limit: 0 }), []);
  assert.equal(zero.queries.length, 0);
  const unavailable = loader({ configured: false });
  assert.equal(await unavailable.fetchStatusHistory({ all: true }), null);
  assert.equal(unavailable.queries.length, 0);
});

test('real page progress requests the exact count only on the first page and completes only after all pages', async () => {
  const fixture = loader({ rows: makeRows(2250) });
  const progress = [];
  await fixture.fetchStatusHistory({ all: true, onProgress: update => progress.push(update) });
  assert.deepEqual(progress, [
    { loaded: 0, total: null, complete: false },
    { loaded: 1000, total: 2250, complete: false },
    { loaded: 2000, total: 2250, complete: false },
    { loaded: 2250, total: 2250, complete: false },
    { loaded: 2250, total: 2250, complete: true },
  ]);
  assert.deepEqual(fixture.queries.map(query => query.selectOptions), [{ count: 'exact' }, undefined, undefined]);
});

test('a later failed page never publishes completion or a made-up count', async () => {
  for (const failure of [{ errorPage: 1 }, { rejectPage: 1 }]) {
    const fixture = loader({ rows: makeRows(1500), ...failure });
    const progress = [];
    assert.equal(await fixture.fetchStatusHistory({ all: true, onProgress: update => progress.push(update) }), null);
    assert.deepEqual(progress.at(-1), { loaded: 1000, total: 1500, complete: false });
    assert.equal(progress.some(update => update.complete), false);
  }
  const unknown = loader({ rows: makeRows(1500), countAvailable: false });
  const progress = [];
  await unknown.fetchStatusHistory({ all: true, onProgress: update => progress.push(update) });
  assert.equal(progress.filter(update => !update.complete).every(update => update.total === null), true);
  assert.deepEqual(progress.at(-1), { loaded: 1500, total: 1500, complete: true });
});

test('progress handles empty results, exact page boundaries, limits and unconfigured clients', async () => {
  for (const [options, rows, expectedQueries] of [
    [{ all: true }, [], 1], [{ limit: 0 }, makeRows(5), 0],
    [{ all: true }, makeRows(2000), 3], [{ limit: 1501 }, makeRows(2200), 2],
  ]) {
    const fixture = loader({ rows });
    const progress = [];
    const result = await fixture.fetchStatusHistory({ ...options, onProgress: update => progress.push(update) });
    assert.equal(fixture.queries.length, expectedQueries);
    assert.deepEqual(progress.at(-1), { loaded: result.length, total: result.length, complete: true });
    assert.equal(progress.filter(update => update.complete).length, 1);
    if (options.limit === 1501) assert.equal(progress[1].total, 1501);
  }
  const unavailable = loader({ configured: false });
  const progress = [];
  assert.equal(await unavailable.fetchStatusHistory({ onProgress: update => progress.push(update) }), null);
  assert.deepEqual(progress, [{ loaded: 0, total: null, complete: false }]);
});

test('counts are display-only and observer exceptions cannot truncate the loaded history', async () => {
  const changedCount = loader({ rows: makeRows(1500), reportedCount: 500 });
  const progress = [];
  assert.equal((await changedCount.fetchStatusHistory({ all: true, onProgress: update => progress.push(update) })).length, 1500);
  assert.equal(changedCount.queries.length, 2, 'Snapshot pagination is not terminated using an earlier count');
  assert.deepEqual(progress.at(-1), { loaded: 1500, total: 1500, complete: true });
  const brokenObserver = loader({ rows: makeRows(1500) });
  assert.equal((await brokenObserver.fetchStatusHistory({ all: true, onProgress: () => { throw new Error('Observer failed'); } })).length, 1500);
  assert.equal(brokenObserver.errors.length, 0);
});

const hookCode = ts.transpileModule(readFileSync(new URL('../../hooks/useStatisticsPerformance.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function hook(history = []) {
  let hospitalId = 'hospital-a';
  let cache = new Map();
  let consumerId = 'default';
  const subscriptions = new Map();
  const notifications = new Map();
  const slot = { data: undefined, error: undefined, isLoading: true, isValidating: false };
  const calls = [];
  let refreshes = 0;
  const imports = {
    react: {
      useCallback: callback => callback,
      useSyncExternalStore: (subscribe, getSnapshot) => {
        const id = consumerId;
        subscriptions.get(id)?.();
        subscriptions.set(id, subscribe(() => notifications.set(id, (notifications.get(id) ?? 0) + 1)));
        return getSnapshot();
      },
    },
    swr: {
      __esModule: true,
      default: (key, fetcher, options) => { Object.assign(slot, { key, fetcher, options }); return { ...slot, mutate: () => { refreshes += 1; } }; },
      useSWRConfig: () => ({ cache }),
    },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospitalId }) },
    '../lib/db': { fetchStatusHistory: async options => {
      calls.push(options);
      if (typeof history === 'function') return history(options, calls.length);
      if (history instanceof Error) throw history;
      if (history) options.onProgress?.({ loaded: history.length, total: history.length, complete: true });
      return history;
    } },
  };
  const exports = {};
  new Function('require', 'exports', hookCode)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected performance history dependency: ${name}`);
    return imports[name];
  }, exports);
  return {
    slot, calls, notifications, get refreshes() { return refreshes; },
    changeCache(nextCache) { cache = nextCache; },
    render(enabled = true, hospital = hospitalId, consumer = 'default') {
      hospitalId = hospital; consumerId = consumer;
      return exports.useStatisticsPerformance(enabled);
    },
    async load() {
      slot.isValidating = true;
      try { slot.data = await slot.fetcher(slot.key); slot.error = undefined; } catch (error) { slot.error = error; }
      slot.isLoading = false;
      slot.isValidating = false;
    },
  };
}

test('performance fetches complete measured event history over its own 370-day window and guards hospital cache identity', async () => {
  const history = makeRows(3);
  const fixture = hook(history);
  assert.equal(fixture.render().isLoading, true);
  assert.deepEqual(fixture.slot.key, ['statistics-performance', 'hospital-a']);
  await fixture.load();
  const loaded = fixture.render();
  assert.deepEqual(loaded.history, history);
  assert.equal(loaded.isLoading, false);
  const options = fixture.calls[0];
  assert.equal(options.all, true);
  assert.equal(options.limit, undefined);
  assert.equal(options.toDate - options.fromDate, 370 * 86400000);
  assert.deepEqual(options.eventTypes, ['step_change', 'operation_start', 'operation_end', 'operation_completed']);
  assert.equal(loaded.loadedAt, options.toDate.toISOString());
  const changed = fixture.render(true, 'hospital-b');
  assert.deepEqual(changed.history, []);
  assert.equal(changed.loadedAt, null);
  assert.equal(changed.isLoading, true);
  loaded.refresh();
  assert.equal(fixture.refreshes, 1);
  assert.equal(fixture.slot.options.revalidateOnFocus, true);
  assert.equal(fixture.slot.options.revalidateOnReconnect, true);
  fixture.render(false);
  assert.equal(fixture.slot.key, null);
  fixture.render(true, null);
  assert.equal(fixture.slot.key, null);
});

test('performance distinguishes a failed history load from a valid empty dataset', async () => {
  for (const failedHistory of [null, new Error('Offline')]) {
    const fixture = hook(failedHistory);
    fixture.render();
    await fixture.load();
    const failed = fixture.render();
    assert.equal(typeof failed.error, 'string');
    assert.ok(failed.error.length > 0);
    assert.equal(failed.isLoading, false);
    assert.equal(failed.loadedAt, null);
    assert.deepEqual(failed.history, []);
  }
  const fixture = hook([]);
  fixture.render();
  await fixture.load();
  const empty = fixture.render();
  assert.equal(empty.error, null);
  assert.equal(empty.isLoading, false);
  assert.ok(empty.loadedAt);
  assert.deepEqual(empty.history, []);
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('progress survives tab re-entry and is shared by consumers of the same in-flight SWR request', async () => {
  const pending = deferred();
  const fixture = hook(() => pending.promise);
  fixture.render();
  const loading = fixture.load();
  fixture.calls[0].onProgress({ loaded: 1000, total: 4000, complete: false });
  assert.deepEqual(fixture.render().progress, { loaded: 1000, total: 4000, complete: false });
  assert.deepEqual(fixture.render(false).progress, { loaded: 0, total: null, complete: false });
  fixture.calls[0].onProgress({ loaded: 2000, total: 4000, complete: false });
  assert.equal(fixture.render(true).progress.loaded, 2000, 'Re-entry does not restart an existing load at zero');
  assert.equal(fixture.render(true, 'hospital-a', 'second-consumer').progress.loaded, 2000);
  const firstNotifications = fixture.notifications.get('default') ?? 0;
  const secondNotifications = fixture.notifications.get('second-consumer') ?? 0;
  fixture.calls[0].onProgress({ loaded: 3000, total: 4000, complete: false });
  assert.equal(fixture.notifications.get('default'), firstNotifications + 1);
  assert.equal(fixture.notifications.get('second-consumer'), secondNotifications + 1);
  assert.equal(fixture.calls.length, 1, 'Subscribing to progress never starts another data request');
  fixture.calls[0].onProgress({ loaded: 4000, total: 4000, complete: true });
  pending.resolve(makeRows(4000));
  await loading;
  assert.equal(fixture.render().progress.complete, true);
});

test('hospital and provider changes cannot display another scope’s progress or data', async () => {
  const pending = deferred();
  const fixture = hook(() => pending.promise);
  fixture.render();
  const loading = fixture.load();
  fixture.calls[0].onProgress({ loaded: 1000, total: 2000, complete: false });
  assert.equal(fixture.render(true, 'hospital-b').progress.loaded, 0);
  const notificationsBefore = fixture.notifications.get('default');
  fixture.calls[0].onProgress({ loaded: 2000, total: 2000, complete: true });
  assert.equal(fixture.notifications.get('default'), notificationsBefore, 'A late A page cannot notify the B subscription');
  pending.resolve(makeRows(2000));
  await loading;
  const otherHospital = fixture.render(true, 'hospital-b');
  assert.deepEqual(otherHospital.history, []);
  assert.equal(otherHospital.progress.loaded, 0);
  assert.equal(otherHospital.progress.complete, false);
  assert.equal(fixture.render(true, 'hospital-a').progress.loaded, 2000);
  fixture.changeCache(new Map());
  assert.equal(fixture.render().progress.loaded, 0, 'Separate SWR providers do not share their progress channel');
});

test('new refreshes reset progress and late callbacks from an older request are ignored', async () => {
  const first = deferred();
  const second = deferred();
  const fixture = hook((_options, number) => number === 1 ? first.promise : second.promise);
  fixture.render();
  const firstLoad = fixture.slot.fetcher(fixture.slot.key);
  fixture.calls[0].onProgress({ loaded: 1000, total: 2000, complete: false });
  assert.equal(fixture.render().progress.loaded, 1000);
  const secondLoad = fixture.slot.fetcher(fixture.slot.key);
  assert.deepEqual(fixture.render().progress, { loaded: 0, total: null, complete: false });
  fixture.calls[0].onProgress({ loaded: 2000, total: 2000, complete: true });
  assert.deepEqual(fixture.render().progress, { loaded: 0, total: null, complete: false });
  fixture.calls[1].onProgress({ loaded: 1000, total: 3000, complete: false });
  assert.deepEqual(fixture.render().progress, { loaded: 1000, total: 3000, complete: false });
  first.resolve(makeRows(2000));
  await firstLoad;
  assert.equal(fixture.render().progress.complete, false);
  fixture.calls[1].onProgress({ loaded: 3000, total: 3000, complete: true });
  second.resolve(makeRows(3000));
  await secondLoad;
  assert.deepEqual(fixture.render().progress, { loaded: 3000, total: 3000, complete: true });
});

test('a retry after a failed load resets progress and remains visibly loading despite SWR retaining its error', async () => {
  const retry = deferred();
  const fixture = hook((options, number) => {
    if (number === 1) {
      options.onProgress({ loaded: 1000, total: 2500, complete: false });
      return null;
    }
    return retry.promise;
  });
  fixture.render();
  await fixture.load();
  assert.equal(fixture.render().isLoading, false);
  assert.equal(fixture.render().progress.complete, false);
  assert.ok(fixture.render().error);
  const retried = fixture.load();
  assert.deepEqual(fixture.render().progress, { loaded: 0, total: null, complete: false });
  assert.equal(fixture.render().isLoading, true);
  assert.equal(fixture.render().error, null, 'A retained SWR error must not hide the active retry progress');
  fixture.calls[1].onProgress({ loaded: 2500, total: 2500, complete: true });
  retry.resolve(makeRows(2500));
  await retried;
  const complete = fixture.render();
  assert.equal(complete.isLoading, false);
  assert.equal(complete.error, null);
  assert.equal(complete.history.length, 2500);
  assert.equal(complete.progress.complete, true);
});

test('background refresh keeps the last valid data and exposes fresh progress separately', async () => {
  const pending = deferred();
  const history = makeRows(3);
  const fixture = hook((options, number) => {
    if (number === 1) {
      options.onProgress({ loaded: 3, total: 3, complete: true });
      return history;
    }
    return pending.promise;
  });
  fixture.render();
  await fixture.load();
  fixture.render();
  const refreshing = fixture.load();
  const view = fixture.render();
  assert.equal(view.isLoading, false);
  assert.equal(view.isRefreshing, true);
  assert.deepEqual(view.history, history);
  assert.deepEqual(view.progress, { loaded: 0, total: null, complete: false });
  fixture.calls[1].onProgress({ loaded: 5, total: 5, complete: true });
  pending.resolve(makeRows(5));
  await refreshing;
  assert.equal(fixture.render().history.length, 5);
  assert.equal(fixture.render().isRefreshing, false);
});
