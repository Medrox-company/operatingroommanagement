import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = ts.createSourceFile('db.ts', readFileSync(new URL('../../lib/db.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'fetchNotificationsLog');
assert.ok(declaration);
const code = ts.transpileModule(`let activeHospitalId = 'hospital-a';
${declaration.getText(source)}
exports.changeHospital = value => { activeHospitalId = value; };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const rowsFor = (count, hospitalId = 'hospital-a') => Array.from({ length: count }, (_, index) => ({
  id: `${hospitalId}-${String(index).padStart(5, '0')}`, hospital_id: hospitalId,
  created_at: '2026-09-05T08:00:00.000Z', notification_type: 'custom',
}));

function loader({ rows = [], onPage, errorPage, configured = true, countAvailable = true } = {}) {
  const queries = [], errors = [], exports = {};
  const supabase = { from(table) {
    const query = { table, filters: [], orders: [] };
    const builder = {
      select(columns, options) { query.columns = columns; query.selectOptions = options; return builder; },
      eq(column, value) { query.filters.push(['eq', column, value]); return builder; },
      gte(column, value) { query.filters.push(['gte', column, value]); return builder; },
      lte(column, value) { query.filters.push(['lte', column, value]); return builder; },
      order(column, options) { query.orders.push([column, options]); return builder; },
      range(from, to) { query.range = [from, to]; return builder; },
      then(resolve, reject) {
        const page = queries.length;
        queries.push(query);
        const selected = rows.filter(row => query.filters.every(([op, column, value]) => (
          op === 'eq' ? row[column] === value : op === 'gte' ? row[column] >= value : row[column] <= value
        ))).sort((a, b) => {
          for (const [column, options] of query.orders) {
            const difference = a[column] < b[column] ? -1 : a[column] > b[column] ? 1 : 0;
            if (difference) return options.ascending ? difference : -difference;
          }
          return 0;
        });
        onPage?.(page, exports.changeHospital);
        return Promise.resolve(page === errorPage ? { data: null, error: new Error('Page failed') } : {
          data: selected.slice(query.range[0], query.range[1] + 1), error: null,
          count: countAvailable && query.selectOptions?.count === 'exact' ? selected.length : null,
        }).then(resolve, reject);
      },
    };
    return builder;
  } };
  new Function('exports', 'supabase', 'isSupabaseConfigured', 'console', code)(exports, supabase, configured, { error: (...args) => errors.push(args) });
  return { ...exports, queries, errors };
}

test('notification pagination reports real counts and retrieves every same-timestamp row in stable order', async () => {
  const app = loader({ rows: [...rowsFor(2250), ...rowsFor(17, 'hospital-b')] });
  const progress = [];
  const fromDate = new Date('2026-09-01T00:00:00Z'), toDate = new Date('2026-09-07T00:00:00Z');
  const result = await app.fetchNotificationsLog({ all: true, fromDate, toDate, onProgress: update => progress.push(update) });
  assert.equal(result.length, 2250);
  assert.deepEqual(result.map(row => row.id), rowsFor(2250).reverse().map(row => row.id));
  assert.deepEqual(app.queries.map(query => query.range), [[0, 999], [1000, 1999], [2000, 2999]]);
  for (const query of app.queries) {
    assert.equal(query.table, 'notifications_log');
    assert.deepEqual(query.orders, [['created_at', { ascending: false }], ['id', { ascending: false }]]);
    assert.deepEqual(query.filters, [['eq', 'hospital_id', 'hospital-a'], ['gte', 'created_at', fromDate.toISOString()], ['lte', 'created_at', toDate.toISOString()]]);
  }
  assert.deepEqual(app.queries.map(query => query.selectOptions), [{ count: 'exact' }, undefined, undefined]);
  assert.deepEqual(progress, [
    { loaded: 0, total: null, complete: false },
    { loaded: 1000, total: 2250, complete: false },
    { loaded: 2000, total: 2250, complete: false },
    { loaded: 2250, total: 2250, complete: false },
    { loaded: 2250, total: 2250, complete: true },
  ]);
});

test('notification hospital is captured before callbacks and stays fixed across all pages', async () => {
  const app = loader({ rows: [...rowsFor(1500), ...rowsFor(1800, 'hospital-b')], onPage: (_page, change) => change('hospital-b') });
  const result = await app.fetchNotificationsLog({ all: true, onProgress: () => app.changeHospital('hospital-b') });
  assert.equal(result.length, 1500);
  assert.ok(result.every(row => row.hospital_id === 'hospital-a'));
  assert.ok(app.queries.every(query => query.filters[0][2] === 'hospital-a'));
});

test('unknown counts and exact full pages cannot complete before the final page response', async () => {
  const app = loader({ rows: rowsFor(2000), countAvailable: false });
  const progress = [];
  await app.fetchNotificationsLog({ all: true, onProgress: update => progress.push(update) });
  assert.deepEqual(app.queries.map(query => query.range), [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.ok(progress.slice(0, -1).every(update => update.total === null && !update.complete));
  assert.deepEqual(progress.at(-1), { loaded: 2000, total: 2000, complete: true });
});

test('notification failure returns null and never publishes completed partial data', async () => {
  const app = loader({ rows: rowsFor(1500), errorPage: 1 });
  const progress = [];
  assert.equal(await app.fetchNotificationsLog({ all: true, onProgress: update => progress.push(update) }), null);
  assert.equal(app.errors.length, 1);
  assert.ok(progress.every(update => !update.complete));
  assert.deepEqual(progress.at(-1), { loaded: 1000, total: 1500, complete: false });
});

test('existing callers do not request counts and callback exceptions never interrupt data', async () => {
  const legacy = loader({ rows: rowsFor(1800) });
  assert.equal((await legacy.fetchNotificationsLog()).length, 1000);
  assert.equal(legacy.queries[0].selectOptions, undefined);
  const observed = loader({ rows: rowsFor(1800) });
  assert.equal((await observed.fetchNotificationsLog({ all: true, onProgress: () => { throw new Error('Observer failed'); } })).length, 1800);
  assert.equal(observed.errors.length, 0);
});

test('zero limits and unavailable configuration terminate without reads or fake completion', async () => {
  const zero = loader({ rows: rowsFor(10) }), progress = [];
  assert.deepEqual(await zero.fetchNotificationsLog({ limit: 0, onProgress: update => progress.push(update) }), []);
  assert.deepEqual(progress, [{ loaded: 0, total: null, complete: false }, { loaded: 0, total: 0, complete: true }]);
  assert.equal(zero.queries.length, 0);
  const absent = loader({ configured: false }), absentProgress = [];
  assert.equal(await absent.fetchNotificationsLog({ all: true, onProgress: update => absentProgress.push(update) }), null);
  assert.deepEqual(absentProgress, [{ loaded: 0, total: null, complete: false }]);
  assert.equal(absent.queries.length, 0);
});
