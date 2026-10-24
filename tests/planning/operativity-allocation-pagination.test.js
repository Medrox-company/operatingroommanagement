import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

class TestResponse extends Response {
  static json(value, options = {}) {
    return new TestResponse(JSON.stringify(value), { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  }
}

function harness({ count = 2405, denied = false, databaseError = null } = {}) {
  const calls = [];
  const allocations = Array.from({ length: count }, (_, index) => ({
    id: `allocation-${String(count - index).padStart(5, '0')}`, hospital_id: 'hospital-one', allocation_date: '2026-10-23',
    operating_room_id: 'room-one', department_id: 'spec-one', day_part: index % 2 ? 'AM' : 'PM', allocation_kind: 'SPECIALTY',
  }));
  allocations.push({ id: 'other-tenant', hospital_id: 'hospital-two', allocation_date: '2026-10-23' });
  allocations.push({ id: 'other-year', hospital_id: 'hospital-one', allocation_date: '2027-10-23' });
  const departments = [{ id: 'spec-one', hospital_id: 'hospital-one', name: 'Chirurgie', short_code: 'CHIR', accent_color: '#14CBE8', sort_order: 0 }];
  const imports = {
    'next/server': { NextResponse: TestResponse },
    '@/lib/auth/csrf': { assertSameOrigin: () => { throw new Error('Read must not invoke a mutation guard'); } },
    '@/lib/hospital/access': { requireHospitalAccess: async (_request, options) => {
      calls.push(['authorize', options]);
      return denied ? TestResponse.json({ error: 'Denied' }, { status: 401 }) : { hospitalId: 'hospital-one' };
    } },
    '@/lib/hospital/submodule-access': { requireSubmoduleAccess: () => { throw new Error('Existing membership-scoped reads must remain available'); } },
    '@/lib/supabase-server': { getSupabaseAdmin: () => ({ from(table) {
      calls.push(['from', table]);
      const filters = [], order = []; let range = null;
      const query = {
        select(value) { calls.push(['select', table, value]); return query; },
        eq(key, value) { filters.push(row => row[key] === value); calls.push(['eq', table, key, value]); return query; },
        gte(key, value) { filters.push(row => row[key] >= value); return query; },
        lte(key, value) { filters.push(row => row[key] <= value); return query; },
        order(key, options) { order.push([key, options.ascending]); calls.push(['order', table, key, options]); return query; },
        range(from, to) { range = [from, to]; calls.push(['range', table, from, to]); return query; },
        then(resolve, reject) {
          let rows = (table === 'room_specialty_allocations' ? allocations : departments).filter(row => filters.every(filter => filter(row)));
          rows.sort((a, b) => { for (const [key, ascending] of order) { if (a[key] < b[key]) return ascending ? -1 : 1; if (a[key] > b[key]) return ascending ? 1 : -1; } return 0; });
          if (range) rows = rows.slice(range[0], range[1] + 1);
          return Promise.resolve({ data: rows, error: table === 'room_specialty_allocations' ? databaseError : null }).then(resolve, reject);
        },
      };
      return query;
    } }) },
  };
  const exports = {};
  const source = readFileSync(new URL('../../app/api/room-specialty-allocations/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', compiled)(name => { assert.ok(Object.hasOwn(imports, name)); return imports[name]; }, exports);
  return { calls, get: query => exports.GET({ nextUrl: new URL(`http://localhost/api/room-specialty-allocations?${query}`) }) };
}

test('annual allocation pagination returns every tenant row once, including more than 1000 on one date', async () => {
  const app = harness();
  const all = []; let offset = 0;
  do {
    const response = await app.get(`year=2026&offset=${offset}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const page = await response.json();
    assert.equal(page.departments[0].accent_color, '#14CBE8');
    all.push(...page.allocations);
    offset = page.nextOffset;
  } while (offset !== null);
  assert.equal(all.length, 2405);
  assert.equal(new Set(all.map(row => row.id)).size, 2405);
  assert.equal(all[0].id, 'allocation-00001');
  assert.equal(all.at(-1).id, 'allocation-02405');
  assert.ok(all.every(row => row.hospital_id === 'hospital-one' && row.allocation_date === '2026-10-23'));
  assert.deepEqual(app.calls.filter(([name]) => name === 'range').map(call => call.slice(2)), [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.ok(app.calls.filter(([name]) => name === 'order').some(([, table, field]) => table === 'room_specialty_allocations' && field === 'id'));
});

test('omitted offset preserves the first page; a completely full last page has an explicit empty successor', async () => {
  const app = harness({ count: 1000 });
  const first = await (await app.get('year=2026')).json();
  assert.equal(first.allocations.length, 1000);
  assert.equal(first.nextOffset, 1000);
  const last = await (await app.get('year=2026&offset=1000')).json();
  assert.deepEqual(last.allocations, []);
  assert.equal(last.nextOffset, null);
  const short = harness({ count: 999 });
  assert.equal((await (await short.get('year=2026')).json()).nextOffset, null);
});

test('date-scoped consumers use the same bounded pagination', async () => {
  const app = harness({ count: 1001 });
  const page = await (await app.get('date=2026-10-23&offset=1000')).json();
  assert.equal(page.allocations.length, 1);
  assert.equal(page.nextOffset, null);
});

test('invalid offsets are rejected before any database access', async () => {
  for (const offset of ['', '-1', '1.5', 'NaN', 'Infinity', '1e3', '1000001', '9007199254740992', ' 10']) {
    const app = harness();
    assert.equal((await app.get(`year=2026&offset=${encodeURIComponent(offset)}`)).status, 400, offset);
    assert.equal(app.calls.some(([name]) => name === 'from'), false);
  }
  const app = harness({ count: 0 });
  assert.equal((await app.get('year=2026&offset=1000000')).status, 200);
});

test('pagination keeps authentication and migration failure responses', async () => {
  const denied = harness({ denied: true });
  assert.equal((await denied.get('year=2026&offset=1000')).status, 401);
  assert.equal(denied.calls.some(([name]) => name === 'from'), false);
  const missing = harness({ databaseError: { code: '42P01' } });
  const response = await missing.get('year=2026&offset=1000');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).migrationRequired, true);
});
