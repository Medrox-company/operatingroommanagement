import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
const actor = 'a8a913aa-4148-4cb8-9143-09b25d7dd892';
const requestId = 'a8a913aa-4148-4cb8-9143-09b25d7dd891';
const start = { requestId, roomId: 'room-a', expectedStateRevision: 7 };
const row = () => ({ request_id: requestId, hospital_id: 'a', operating_room_id: 'room-a',
  operation_started_at: '2026-10-08T10:00:00.000Z', started_at: '2026-10-08T10:00:00.001Z',
  start_event_id: actor, end_event_id: null, ended_at: null, procedure_name: 'Synthetic APPE', urgency: 'urgent', submission_position: 4 });
class TestResponse extends Response {
  static json(body, options) { return new TestResponse(JSON.stringify(body), { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } }); }
}

function harness(options = {}) {
  const calls = [], cache = new Map();
  const role = options.role ?? 'aro';
  const db = {
    from(table) {
      const conditions = {};
      const query = { select: columns => { calls.push(['select', table, columns]); return query; },
        eq: (key, value) => { conditions[key] = value; calls.push(['eq', table, key, value]); return query; },
        in: (key, values) => { calls.push(['in', table, key, values]); return query; },
        order: (key, settings) => { calls.push(['order', table, key, settings]); return query; },
        range: async (from, to) => {
          calls.push(['range', table, from, to]);
          return { data: options.activeLinks === null ? null : (options.activeLinks ?? []).slice(from, to + 1), error: options.activeLinksError };
        },
        maybeSingle: async () => ({ data: table === 'app_users'
          ? options.noAccount ? null : { id: actor, role: options.currentRole ?? role, name: 'Synthetic Clinician', is_active: !options.inactive }
          : options.noModule ? null : { is_enabled: conditions.id === 'dashboard' ? !options.dashboardDisabled : !options.acuteDisabled,
            allowed_roles: options.allowedRoles ?? ['aro', 'management', 'admin'] }, error: options.queryError }),
      };
      return query;
    },
    async rpc(name, parameters) {
      calls.push(['rpc', name, parameters]);
      return { data: name === 'get_acute_cycle_links' ? options.links ?? [row()]
        : options.result ?? { link: row(), room: { id: 'room-a', hospital_id: 'a', current_step_index: 1, state_revision: 8 } }, error: options.rpcError };
    },
  };
  const imports = { 'server-only': {}, 'next/server': { NextResponse: TestResponse },
    '@/lib/auth/csrf': { assertSameOrigin: () => options.csrf ? TestResponse.json({}, { status: 403 }) : null },
    '@/lib/hospital/access': { requireHospitalAccess: async () => options.authStatus ? TestResponse.json({}, { status: options.authStatus })
      : { hospitalId: 'a', user: { sub: actor, role, name: 'Old name' } } },
  };
  function load(path) {
    const url = new URL(path, root);
    if (cache.has(url.href)) return cache.get(url.href);
    if (url.pathname.endsWith('/lib/supabase-server.ts')) return { getSupabaseAdmin: () => db };
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {}; cache.set(url.href, exports);
    new Function('require', 'exports', compiled)(name => name in imports ? imports[name]
      : load(name.startsWith('@/') ? `${name.slice(2)}.ts` : new URL(`${name}.ts`, url).href), exports);
    return exports;
  }
  const route = load('app/api/acute-requests/cycles/route.ts');
  const headers = { 'Content-Type': 'application/json', ...options.noScope ? {} : { 'X-Acute-Hospital-Id': options.scope ?? 'a' } };
  return { calls, model: load('lib/acute-cycle-links.ts'),
    get: (query = '?from=2026-10-08T00%3A00%3A00.000Z&to=2026-10-09T00%3A00%3A00.000Z') => route.GET(new Request(`http://localhost/api/acute-requests/cycles${query}`, { headers })),
    post: (body = start) => route.POST(new Request('http://localhost/api/acute-requests/cycles', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })),
  };
}

test('cycle API verifies login, current account, tab tenant and both modules before RPC', async () => {
  for (const [options, status] of [[{ authStatus: 401 }, 401], [{ inactive: true }, 403], [{ noAccount: true }, 403], [{ currentRole: 'management' }, 403],
    [{ acuteDisabled: true }, 403], [{ role: 'superadmin', acuteDisabled: true }, 403],
    [{ noScope: true }, 400], [{ scope: 'b' }, 409], [{ allowedRoles: [] }, 403], [{ queryError: {} }, 503]]) {
    const app = harness(options);
    assert.equal((await app.get()).status, status);
    assert.equal((await app.post()).status, status);
    assert.equal(app.calls.some(([kind]) => kind === 'rpc'), false);
  }
});
test('completed cycle read needs acute access, clinical start additionally requires dashboard access', async () => {
  const app = harness({ dashboardDisabled: true });
  assert.equal((await app.get()).status, 200);
  app.calls.length = 0;
  assert.equal((await app.post()).status, 403);
  assert.equal(app.calls.some(([kind]) => kind === 'rpc'), false);
});
test('cycle POST rejects CSRF, stale/malformed revision and oversized body without write', async () => {
  for (const [options, body, status] of [[{ csrf: true }, start, 403], [{}, 'not json', 400], [{}, { ...start, expectedStateRevision: -1 }, 400],
    [{}, { ...start, expectedStateRevision: '7' }, 400], [{}, { ...start, requestId: 'fake' }, 400], [{}, { ...start, roomId: '' }, 400], [{}, 'x'.repeat(4001), 413]]) {
    const app = harness(options);
    assert.equal((await app.post(body)).status, status);
    assert.equal(app.calls.some(([kind]) => kind === 'rpc'), false);
  }
});
test('cycle POST ignores spoofed actor, tenant, phase, timestamps and clinical snapshot', async () => {
  const app = harness({ role: 'management' }); // Clinical room permission, not queue-edit permission.
  const response = await app.post({ ...start, hospitalId: 'b', actorId: 'attacker', startedAt: '2099-01-01', currentStepIndex: 9, urgency: 'emergent' });
  assert.equal(response.status, 200);
  assert.deepEqual(app.calls.find(([kind]) => kind === 'rpc'), ['rpc', 'start_acute_request_cycle', {
    p_hospital_id: 'a', p_actor_id: actor, p_request_id: requestId, p_room_id: 'room-a', p_expected_state_revision: 7,
  }]);
  const body = await response.json();
  assert.equal(body.link.procedureName, 'Synthetic APPE'); assert.equal(body.link.submissionPosition, 4);
  assert.equal(body.room.state_revision, 8); assert.equal(response.headers.get('cache-control'), 'no-store');
});
test('cycle GET requests the authoritative selected interval and maps only safe frozen evidence', async () => {
  const app = harness(); const response = await app.get();
  assert.equal(response.status, 200);
  assert.deepEqual(app.calls.find(([kind]) => kind === 'rpc'), ['rpc', 'get_acute_cycle_links', {
    p_hospital_id: 'a', p_from: '2026-10-08T00:00:00.000Z', p_to: '2026-10-09T00:00:00.000Z',
  }]);
  const body = await response.json(); assert.equal(body.links.length, 1);
  assert.equal(body.links[0].bound_by, undefined); assert.equal(body.links[0].roomId, 'room-a');
  for (const query of ['', '?from=oops&to=tomorrow', '?from=2026-10-09T00:00:00Z&to=2026-10-08T00:00:00Z', '?from=2020-01-01T00:00:00Z&to=2026-10-08T00:00:00Z']) {
    const invalid = harness(); assert.equal((await invalid.get(query)).status, 400); assert.equal(invalid.calls.some(([kind]) => kind === 'rpc'), false);
  }
});
test('cycle API rejects cross-tenant/wrong request results and hides private database errors', async () => {
  assert.equal((await harness({ links: [{ ...row(), hospital_id: 'b' }] }).get()).status, 503);
  assert.equal((await harness({ links: [{ ...row(), started_at: 'invalid' }] }).get()).status, 503);
  assert.equal((await harness({ links: [{ ...row(), ended_at: '2026-10-08T11:00:00Z' }] }).get()).status, 503);
  assert.equal((await harness({ result: { link: { ...row(), request_id: actor }, room: { id: 'room-a', hospital_id: 'a' } } }).post()).status, 503);
  for (const [message, expected, code] of [['ACUTE_CYCLE_CONFLICT secret', 409, 'ACUTE_CYCLE_CONFLICT'], ['ACUTE_CYCLE_FORBIDDEN secret', 403, 'ACUTE_CYCLE_FORBIDDEN'],
    ['ACUTE_CYCLE_NOT_FOUND secret', 404, 'ACUTE_CYCLE_NOT_FOUND'], ['ACUTE_CYCLE_HISTORY_REQUIRED secret', 503, 'ACUTE_CYCLE_HISTORY_REQUIRED'], ['secret private', 503, 'ACUTE_UNAVAILABLE']]) {
    const response = await harness({ rpcError: { message } }).post(); const body = await response.json();
    assert.equal(response.status, expected); assert.equal(body.code, code); assert.doesNotMatch(body.error, /secret|private/);
  }
  assert.equal((await harness({ rpcError: { code: '23505', message: 'private database key' } }).post()).status, 409);
});
test('cycle matching uses actual room and exact cycle evidence, never nearest time or request projection', () => {
  const model = harness().model;
  const link = { requestId, hospitalId: 'a', roomId: 'room-a', operationStartedAt: '2026-10-08T10:00:00.000Z', startedAt: '2026-10-08T10:00:00.001Z',
    startEventId: actor, endEventId: requestId, endedAt: '2026-10-08T11:00:00.001Z', procedureName: 'APPE', urgency: 'urgent', submissionPosition: 1 };
  assert.equal(model.findAcuteCycleLink([link], 'room-a', link.startedAt, link.endedAt), link);
  assert.equal(model.findAcuteCycleLink([link], 'room-a', link.operationStartedAt, '2026-10-08T11:00:00.000Z'), link);
  assert.equal(model.findAcuteCycleLink([link], 'room-a', '2026-10-08T10:00:01.000Z', link.endedAt), undefined);
  assert.equal(model.findAcuteCycleLink([link], 'room-b', link.startedAt, link.endedAt), undefined);
  assert.equal(model.findAcuteCycleLink([link], 'room-a', link.startedAt), undefined);
  const live = { ...link, endedAt: null, endEventId: null };
  assert.equal(model.findAcuteCycleLink([live], 'room-a', live.operationStartedAt), live);
  assert.equal(model.findAcuteCycleLink([live], 'room-a', live.startedAt, link.endedAt), undefined);
});

test('GET includes old completed bindings of still-active requests, tenant-scoped, mapped and deduplicated', async () => {
  const old = { ...row(), request_id: actor, operation_started_at: '2025-01-01T10:00:00.000Z',
    started_at: '2025-01-01T10:00:00.001Z', ended_at: '2025-01-01T11:00:00.001Z', end_event_id: actor,
    bound_by: 'private-actor', acute_requests: { status: 'pending', hospital_id: 'a' } };
  const app = harness({ activeLinks: [row(), old] });
  const response = await app.get();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.links.length, 2);
  assert.equal(body.links.find(link => link.requestId === actor).endedAt, old.ended_at);
  assert.ok(body.links.every(link => link.bound_by === undefined && link.acute_requests === undefined));
  assert.ok(app.calls.some(call => call[0] === 'select' && call[1] === 'acute_request_cycle_links' && call[2].includes('acute_requests!inner')));
  for (const column of ['hospital_id', 'acute_requests.hospital_id']) {
    assert.ok(app.calls.some(call => call[0] === 'eq' && call[1] === 'acute_request_cycle_links' && call[2] === column && call[3] === 'a'));
  }
  assert.deepEqual(app.calls.find(call => call[0] === 'in'), ['in', 'acute_request_cycle_links', 'acute_requests.status', ['pending', 'acknowledged']]);
  assert.deepEqual(app.calls.find(call => call[0] === 'order'), ['order', 'acute_request_cycle_links', 'request_id', { ascending: true }]);
  assert.deepEqual(app.calls.find(call => call[0] === 'range'), ['range', 'acute_request_cycle_links', 0, 499]);
  assert.ok(app.calls.every(call => call[0] !== 'rpc' || call[1] === 'get_acute_cycle_links'), 'GET performs no clinical write');
});

test('GET pages all active request bindings beyond the default Data API row cap', async () => {
  const activeLinks = Array.from({ length: 1001 }, (_, index) => ({ ...row(), request_id: `request-${String(index).padStart(4, '0')}` }));
  const app = harness({ links: [], activeLinks });
  const response = await app.get();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).links.length, 1001);
  assert.deepEqual(app.calls.filter(call => call[0] === 'range').map(call => call.slice(2)), [[0, 499], [500, 999], [1000, 1499]]);
});

test('independent binding reads never downgrade a confirmed completion to a live cycle', async () => {
  const finished = { ...row(), ended_at: '2026-10-08T11:00:00.001Z', end_event_id: actor };
  for (const options of [{ links: [finished], activeLinks: [row()] }, { links: [row()], activeLinks: [finished] }]) {
    const response = await harness(options).get();
    assert.equal(response.status, 200);
    const links = (await response.json()).links;
    assert.equal(links.length, 1);
    assert.equal(links[0].endedAt, finished.ended_at);
  }
});

test('incomplete or foreign binding evidence fails safely instead of labelling already-performed requests as waiting', async () => {
  for (const options of [{ activeLinksError: { message: 'private error' } }, { activeLinks: null },
    { activeLinks: [{ ...row(), hospital_id: 'other' }] }]) {
    const response = await harness(options).get();
    assert.equal(response.status, 503);
    assert.doesNotMatch((await response.json()).error, /private/);
  }
  const app = harness({ activeLinksError: { message: 'private error' } });
  assert.equal((await app.post()).status, 200, 'Confirmed writes do not depend on this optional GET read');
  assert.ok(!app.calls.some(call => call[0] === 'range'));
});
