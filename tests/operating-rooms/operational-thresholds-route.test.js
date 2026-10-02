import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const defaults = { shortPhaseMinutes: 5, cleaningWarningMinutes: 30, rapidSurgeryMinutes: 5, firstCaseGraceMinutes: 15 };
const columns = ['threshold_short_phase_minutes', 'threshold_cleaning_warning_minutes', 'threshold_rapid_surgery_minutes', 'threshold_first_case_grace_minutes'];

class TestResponse extends Response {
  static json(body, options) {
    return new TestResponse(JSON.stringify(body), { ...options, headers: { 'Content-Type': 'application/json' } });
  }
}

function harness({ dbError, missing = false, hospitalStatus, submoduleStatus, csrfStatus } = {}) {
  const calls = [];
  const row = (id, hospital_id, minutes) => ({ id, hospital_id, facility_name: 'Do not overwrite', ...Object.fromEntries(columns.map(key => [key, minutes])) });
  const rows = [row('default-global', 'default', 12), row('default', 'default', 99), row('other-global', 'other', 24)];
  const imports = {
    'next/server': { NextResponse: TestResponse },
    '@/lib/auth/csrf': { assertSameOrigin: () => csrfStatus ? TestResponse.json({}, { status: csrfStatus }) : null },
    '@/lib/hospital/access': { requireHospitalAccess: async (_, options) => {
      calls.push(['access', options]);
      return hospitalStatus ? TestResponse.json({}, { status: hospitalStatus }) : { hospitalId: 'default' };
    } },
    '@/lib/hospital/submodule-access': { requireSubmoduleAccess: async (_, submodule) => {
      calls.push(['submodule', submodule]);
      return submoduleStatus ? TestResponse.json({}, { status: submoduleStatus }) : null;
    } },
    '@/lib/supabase-server': { getSupabaseAdmin: () => ({ from: table => {
      calls.push(['table', table]);
      assert.equal(table, 'app_settings');
      const filters = [];
      let update;
      const query = {
        select: value => { calls.push(['select', value]); return query; },
        eq: (key, value) => { filters.push([key, value]); calls.push(['eq', key, value]); return query; },
        update: value => { update = value; calls.push(['update', value]); return query; },
        maybeSingle: async () => {
          if (dbError) return { data: null, error: dbError };
          const matching = missing ? [] : rows.filter(row => filters.every(([key, value]) => row[key] === value));
          assert.ok(matching.length <= 1, 'Query must select the canonical row, not both tenant rows');
          const selected = matching[0];
          if (selected && update) Object.assign(selected, update);
          return { data: selected ?? null, error: null };
        },
      };
      return query;
    } }) },
  };
  const source = readFileSync(new URL('../../app/api/operational-thresholds/route.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const routes = {};
  new Function('require', 'exports', compiled)(name => {
    assert.ok(name in imports, `Unexpected import ${name}`);
    return imports[name];
  }, routes);
  return { rows, calls, send: (method, body = defaults) => routes[method]({ json: async () => structuredClone(body) }) };
}

test('GET reads canonical tenant settings even when a legacy row exists', async () => {
  const app = harness();
  const response = await app.send('GET');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { configured: true, thresholds: Object.fromEntries(Object.keys(defaults).map(key => [key, 12])) });
  assert.deepEqual(app.calls.filter(([key]) => key === 'eq'), [['eq', 'hospital_id', 'default'], ['eq', 'id', 'default-global']]);
});

test('GET distinguishes absent columns from connection errors and an absent row', async () => {
  for (const code of ['42703', 'PGRST204']) {
    const response = await harness({ dbError: { code, message: 'Missing threshold column' } }).send('GET');
    assert.deepEqual(await response.json(), { configured: false, thresholds: defaults });
  }
  assert.equal((await harness({ dbError: { message: 'Private connection details' } }).send('GET')).status, 503);
  const missing = await harness({ missing: true }).send('GET');
  assert.deepEqual(await missing.json(), { configured: true, thresholds: defaults });
});

test('PUT persists only threshold columns in the canonical authorized hospital row', async () => {
  const app = harness();
  const others = structuredClone(app.rows.slice(1));
  const response = await app.send('PUT', { ...defaults, shortPhaseMinutes: 9, hospital_id: 'other', facility_name: 'Overwrite' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.equal(app.rows[0].threshold_short_phase_minutes, 9);
  assert.equal(app.rows[0].facility_name, 'Do not overwrite');
  assert.deepEqual(app.rows.slice(1), others);
  assert.deepEqual(app.calls.find(([name]) => name === 'access'), ['access', { adminOnly: true }]);
  assert.deepEqual(app.calls.find(([name]) => name === 'submodule'), ['submodule', 'settings.statuses']);
  assert.deepEqual(Object.keys(app.calls.find(([name]) => name === 'update')[1]).sort(), [...columns].sort());
});

test('PUT never reports success for a missing row, a missing migration or failed writes', async () => {
  for (const [options, status] of [[{ missing: true }, 404], [{ dbError: { code: '42703', message: 'Missing column' } }, 409], [{ dbError: { code: 'PGRST204', message: 'Schema cache column missing' } }, 409], [{ dbError: { message: 'Private connection details' } }, 500]]) {
    const app = harness(options);
    const before = structuredClone(app.rows);
    const response = await app.send('PUT');
    assert.equal(response.status, status);
    assert.equal((await response.json()).success, undefined);
    assert.deepEqual(app.rows, before);
  }
});

test('PUT rejects malformed, incomplete, non-integer or out-of-range values without changing defaults', async () => {
  for (const body of [null, [], false, 5, 'text', {}, ...[0, -1, 241, 1.5, '5', null].map(value => ({ ...defaults, shortPhaseMinutes: value }))]) {
    const app = harness();
    const response = await app.send('PUT', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.equal(app.calls.some(([name]) => name === 'table'), false);
  }
});

test('authorization, submodule access and CSRF gates remain enforced before database writes', async () => {
  for (const [options, expected] of [[{ hospitalStatus: 401 }, 401], [{ hospitalStatus: 403 }, 403], [{ submoduleStatus: 403 }, 403], [{ csrfStatus: 403 }, 403]]) {
    const app = harness(options);
    assert.equal((await app.send('PUT')).status, expected);
    assert.equal(app.calls.some(([name]) => name === 'table'), false);
  }
});

test('threshold hook uses the same canonical tenant row as the write endpoint', () => {
  const source = readFileSync(new URL('../../hooks/useOperationalThresholds.ts', import.meta.url), 'utf8');
  assert.match(source, /\.eq\('hospital_id', activeHospitalId\)/);
  assert.match(source, /\.eq\('id', `\$\{activeHospitalId\}-global`\)/);
});
