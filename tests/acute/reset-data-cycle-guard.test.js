import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

class TestResponse extends Response {
  static json(body, options) {
    return new TestResponse(JSON.stringify(body), {
      ...options, headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  }
}

// Synthetic route invocation only: no credentials, network or real reset.
function harness(options = {}) {
  const calls = [];
  const admin = {
    from(table) {
      calls.push(['from', table]);
      let kind = 'read';
      const query = {
        select: columns => { calls.push(['select', table, columns]); return query; },
        limit: count => { calls.push(['limit', table, count]); return query; },
        delete: () => { kind = 'delete'; calls.push(['delete', table]); return query; },
        update: value => { kind = 'update'; calls.push(['update', table, value]); return query; },
        eq: (column, value) => {
          calls.push(['eq', table, column, value]);
          if (kind !== 'read') return Promise.resolve({ error: null, count: 0 });
          return query;
        },
        maybeSingle: async () => {
          calls.push(['checked', table]);
          if (options.throwCheck) throw new Error('private database detail');
          return { data: options.link ?? null, error: options.checkError ?? null };
        },
      };
      return query;
    },
  };
  const dependencies = {
    'next/server': { NextResponse: TestResponse },
    '@/lib/supabase-server': { getSupabaseAdmin: () => admin, isSupabaseAdminConfigured: () => true },
    '@/lib/auth/server': { requireAdmin: async () => options.authStatus
      ? TestResponse.json({}, { status: options.authStatus })
      : { user: { id: 'synthetic-admin', email: 'synthetic@example.invalid' } } },
    '@/lib/auth/csrf': { assertSameOrigin: () => options.csrf ? TestResponse.json({}, { status: 403 }) : null },
    '@/lib/hospital/access': { requireHospitalIdAccess: async (_user, hospitalId) => {
      calls.push(['hospital-access', hospitalId]);
      return options.deniedHospital ? TestResponse.json({}, { status: 403 }) : { hospitalId };
    } },
    '@/lib/hospital/submodule-access': { requireSubmoduleAccess: async () => options.deniedSubmodule
      ? TestResponse.json({}, { status: 403 }) : {} },
  };
  const source = readFileSync(new URL('../../app/api/admin/reset-data/route.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', output)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`);
    return dependencies[name];
  }, module.exports);
  return {
    calls,
    run: (mode = 'operational', body = {}) => module.exports.POST(new Request('http://localhost/api/admin/reset-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, confirmation: 'SMAZAT DATA', hospitalId: 'hospital-a', ...body }),
    })),
  };
}

const mutations = calls => calls.filter(([kind]) => kind === 'delete' || kind === 'update');

test('either reset mode rejects persisted acute evidence before ANY mutation', async () => {
  for (const mode of ['operational', 'full']) {
    const app = harness({ link: { request_id: 'synthetic-request' } });
    const response = await app.run(mode);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'ACUTE_HISTORY_PROTECTED');
    assert.deepEqual(mutations(app.calls), []);
    assert.deepEqual(app.calls.find(([kind]) => kind === 'select'), ['select', 'acute_request_cycle_links', 'request_id']);
    assert.deepEqual(app.calls.find(([kind]) => kind === 'eq'), ['eq', 'acute_request_cycle_links', 'hospital_id', 'hospital-a']);
    assert.deepEqual(app.calls.find(([kind]) => kind === 'limit'), ['limit', 'acute_request_cycle_links', 1]);
  }
});

test('unknown query errors and thrown failures deny reset without exposing private details', async () => {
  for (const options of [{ throwCheck: true }, { checkError: { code: '42501', message: 'private database detail' } },
    { checkError: { code: 'PGRST000' } }, { checkError: { message: 'private database detail' } }]) {
    const app = harness(options);
    const response = await app.run();
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.code, 'ACUTE_HISTORY_CHECK_FAILED');
    assert.doesNotMatch(body.error, /private/);
    assert.deepEqual(mutations(app.calls), []);
  }
});

test('no links or a legacy database without the new table retain the existing reset path', async () => {
  for (const options of [{}, { checkError: { code: '42P01' } }, { checkError: { code: 'PGRST205' } }]) {
    for (const mode of ['operational', 'full']) {
      const app = harness(options);
      const response = await app.run(mode);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).success, true);
      const checked = app.calls.findIndex(([kind]) => kind === 'checked');
      const firstMutation = app.calls.findIndex(([kind]) => kind === 'delete' || kind === 'update');
      assert.ok(checked >= 0 && firstMutation > checked);
      assert.ok(mutations(app.calls).length > 0);
      for (const [, table, column, value] of app.calls.filter(([kind]) => kind === 'eq')) {
        assert.equal(column, 'hospital_id', `${table} must stay tenant-scoped`);
        assert.equal(value, 'hospital-a');
      }
    }
  }
});

test('authentication, CSRF, tenant/section access and confirmation remain required before guard query', async () => {
  for (const [options, body, status] of [[{ authStatus: 401 }, {}, 401], [{ csrf: true }, {}, 403],
    [{ deniedHospital: true }, {}, 403], [{ deniedSubmodule: true }, {}, 403], [{}, { confirmation: 'NO' }, 400],
    [{}, { mode: 'invalid' }, 400], [{}, { hospitalId: '' }, 400]]) {
    const app = harness(options);
    const response = await app.run('operational', body);
    assert.equal(response.status, status);
    assert.equal(app.calls.some(([kind]) => kind === 'from'), false);
    assert.deepEqual(mutations(app.calls), []);
  }
});
