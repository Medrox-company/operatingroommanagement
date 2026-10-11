import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';

const root = new URL('../../', import.meta.url);
const nativeRequire = createRequire(import.meta.url);
class TestResponse extends Response {
  static json(body, options) { return new TestResponse(JSON.stringify(body), { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } }); }
}
const id = 'a8a913aa-4148-4cb8-9143-09b25d7dd892';
const input = () => ({ reference: 'AK-test', procedureName: 'Test výkonu', department: 'Chirurgie', description: '', urgency: 'urgent', estimatedDurationMinutes: 45, clinicalDecisionAt: null, latestStartAt: null, proposedRoomId: null, proposedStartAt: null });
function harness(options = {}) {
  const calls = [], cache = new Map();
  const role = options.role ?? 'aro';
  const db = {
    from(table) {
      let signal;
      const query = { select: columns => { calls.push(['select', table, columns]); return query; }, eq: (key, value) => { calls.push(['eq', table, key, value]); return query; },
        abortSignal: value => { signal = value; calls.push(['abortSignal', table, signal]); return query; },
        in: async (key, values) => { calls.push(['in', table, key, values]); if (options.auditRead) return options.auditRead(values, signal); if (options.creationThrow) throw new Error('private read failure'); return { data: (options.creations ?? []).filter(row => values.includes(row.request_id)), error: options.creationError }; },
        maybeSingle: async () => { calls.push(['read', table]); if (options.read) return options.read(table); return ({ data: table === 'app_users' ? options.noAccount ? null : { id, name: 'Test Actor', role: options.currentRole ?? role, is_active: !options.inactive }
          : table === 'app_modules' ? options.noModule ? null : { is_enabled: !options.disabled, allowed_roles: options.allowedRoles ?? ['aro', 'admin', 'management', 'primar', 'cos'] }
            : options.noRoom ? null : { id: 'room-a' }, error: options.queryError }); },
      };
      return query;
    }, async rpc(name, parameters) {
      calls.push(['rpc', name, parameters]);
      return { data: options.snapshot ?? { requests: [], events: [], revision: 0, historyLimited: false }, error: options.rpcError };
    },
  };
  const imports = {
    'server-only': {}, 'next/server': { NextResponse: TestResponse },
    '@/lib/auth/csrf': { assertSameOrigin: () => options.csrf ? TestResponse.json({}, { status: 403 }) : null },
    '@/lib/hospital/access': { requireHospitalAccess: async () => options.authStatus ? TestResponse.json({}, { status: options.authStatus }) : { hospitalId: 'hospital-a', user: { sub: id, role, name: 'Old Name' } } },
  };
  function load(path) {
    const url = new URL(path, root);
    if (cache.has(url.href)) return cache.get(url.href);
    if (url.pathname.endsWith('/lib/supabase-server.ts')) return { getSupabaseAdmin: () => db };
    const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {}; cache.set(url.href, exports);
    new Function('require', 'exports', 'setTimeout', 'clearTimeout', compiled)(name => {
      if (name in imports) return imports[name];
      if (name.startsWith('node:')) return nativeRequire(name);
      return load(name.startsWith('@/') ? `${name.slice(2)}.ts` : new URL(`${name}.ts`, url).href);
    }, exports, options.setTimeout ?? setTimeout, options.clearTimeout ?? clearTimeout);
    return exports;
  }
  const route = load('app/api/acute-requests/route.ts');
  const headers = { 'Content-Type': 'application/json', ...options.noScope ? {} : { 'X-Acute-Hospital-Id': options.expectedHospitalId ?? 'hospital-a' } };
  return { calls, model: load('lib/acute-requests.ts'), get: () => route.GET(new Request('http://localhost/api/acute-requests', { headers })),
    send: body => route.POST(new Request('http://localhost/api/acute-requests', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })) };
}

test('acute API denies unauthenticated, revoked and tenant-module-disabled sessions before RPC', async () => {
  for (const [options, expected] of [[{ authStatus: 401 }, 401], [{ inactive: true }, 403], [{ noAccount: true }, 403], [{ currentRole: 'management' }, 403], [{ disabled: true }, 403], [{ role: 'superadmin', disabled: true }, 403], [{ allowedRoles: [] }, 403], [{ queryError: {} }, 503]]) {
    const app = harness(options);
    assert.equal((await app.get()).status, expected);
    assert.equal(app.calls.some(([kind]) => kind === 'rpc'), false);
  }
});
test('management can read, not write; CSRF, malformed inputs and invalid assignments never reach RPC', async () => {
  const manager = harness({ role: 'management' });
  assert.equal((await manager.get()).status, 200);
  assert.equal((await manager.get()).headers.get('cache-control'), 'no-store');
  assert.equal((await (await manager.get()).json()).canManage, false);
  assert.equal((await manager.send({ action: 'create', expectedRevision: 0, input: input() })).status, 403);
  for (const [options, body, expected] of [[{ csrf: true }, {}, 403], [{}, 'not-json', 400], [{}, { action: 'create', expectedRevision: 0, input: { ...input(), estimatedDurationMinutes: -1 } }, 400], [{ noRoom: true }, { action: 'create', expectedRevision: 0, input: { ...input(), proposedRoomId: 'outside-room' } }, 422]]) {
    const app = harness(options);
    assert.equal((await app.send(body)).status, expected);
    assert.equal(app.calls.some(([kind]) => kind === 'rpc'), false);
  }
});
test('server is authoritative for hospital and actor and validates room in same hospital', async () => {
  const app = harness();
  const result = await app.send({ action: 'create', expectedRevision: 0, hospitalId: 'attacker', actorId: 'attacker', input: { ...input(), proposedRoomId: 'room-a' } });
  assert.equal(result.status, 200);
  const call = app.calls.find(([kind]) => kind === 'rpc');
  assert.equal(call[1], 'apply_acute_request_command');
  assert.equal(call[2].p_hospital_id, 'hospital-a'); assert.equal(call[2].p_actor_id, id);
  assert.equal(call[2].p_command.hospitalId, undefined); assert.equal(call[2].p_command.actorId, undefined);
  assert.ok(app.calls.some(call => call[0] === 'eq' && call[1] === 'operating_rooms' && call[2] === 'hospital_id' && call[3] === 'hospital-a'));
});
test('GET and POST reject missing or mismatched tab facility before any module read or mutation', async () => {
  for (const options of [{ noScope: true }, { expectedHospitalId: 'hospital-b' }, { expectedHospitalId: '../hospital-a' }, { expectedHospitalId: 'hospital-b', role: 'superadmin' }]) {
    const app = harness(options);
    for (const result of [await app.get(), await app.send({ action: 'create', expectedRevision: 0, input: input() })]) {
      assert.equal(result.status, options.expectedHospitalId === 'hospital-b' ? 409 : 400);
      assert.equal((await result.json()).code, options.expectedHospitalId === 'hospital-b' ? 'ACUTE_SCOPE_CHANGED' : 'ACUTE_SCOPE_REQUIRED');
    }
    assert.equal(app.calls.length, 0); // Hospital authorization ran, but no target data or RPC was accessed.
  }
});
test('stale version conflicts and missing migration are explicit, no sensitive DB errors leak', async () => {
  for (const [rpcError, expected, code] of [[{ message: 'ACUTE_CONFLICT private' }, 409, 'ACUTE_CONFLICT'], [{ message: 'secret table detail', code: 'PGRST202' }, 503, 'ACUTE_MIGRATION_REQUIRED'], [{ message: 'sensitive private credentials' }, 503, 'ACUTE_UNAVAILABLE']]) {
    const result = await harness({ rpcError }).send({ action: 'create', expectedRevision: 0, input: input() });
    const body = await result.json();
    assert.equal(result.status, expected); assert.equal(body.code, code); assert.doesNotMatch(body.error, /private|secret|credentials/);
  }
});
test('input requires clinician urgency, finite whole surgical minutes and honest proposal bounds', () => {
  const { model } = harness();
  assert.equal(model.validateAcuteRequestInput(input()).estimatedDurationMinutes, 45);
  for (const change of [{ urgency: 'auto' }, { estimatedDurationMinutes: '45' }, { estimatedDurationMinutes: 2.5 }, { estimatedDurationMinutes: 1441 }, { procedureName: '' }, { department: '' }, { description: 'x'.repeat(2001) }, { proposedStartAt: '2026-10-07T15:00:00Z' }, { clinicalDecisionAt: '2099-01-01T00:00:00Z' }, { latestStartAt: 'yesterday' }]) {
    assert.throws(() => model.validateAcuteRequestInput({ ...input(), ...change }), model.AcuteValidationError);
  }
  assert.throws(() => model.validateAcuteCommand({ action: 'reorder', expectedRevision: 0, orderedIds: [id, id], reason: 'Test' }));
  assert.throws(() => model.validateAcuteCommand({ action: 'reorder', expectedRevision: 0, orderedIds: [id], reason: '' }));
  assert.throws(() => model.validateAcuteCommand({ action: 'cancel', expectedRevision: -1, requestId: id, reason: 'Test' }));
});
test('operational waiting is continuous through weekends and ordering never uses clinical urgency', () => {
  const { model } = harness();
  assert.equal(model.acuteWaitingMinutes({ receivedAt: '2026-10-02T22:00:00Z' }, Date.parse('2026-10-05T22:00:00Z')), 4320);
  const sorted = model.sortAcuteRequests([{ id: 'low', queuePosition: 1, urgency: 'expedited', receivedAt: '2026-01-01' }, { id: 'high', queuePosition: 2, urgency: 'emergent', receivedAt: '2026-01-01' }]);
  assert.deepEqual(sorted.map(row => row.id), ['low', 'high']);
});

const snapshotRequest = (override = {}) => ({ id, hospital_id: 'hospital-a', procedure_name: 'Test', queue_position: 4, ...override });
const creation = (override = {}) => ({ hospital_id: 'hospital-a', request_id: id, action: 'create', new_position: 1, ...override });

test('API exposes the original audited position, not a later manual or compacted rank', async () => {
  const snapshot = { requests: [snapshotRequest()], events: [creation(), creation({ action: 'reorder', new_position: 4 })], revision: 9 };
  const app = harness({ snapshot });
  for (const response of [await app.get(), await app.send({ action: 'acknowledge', requestId: id, expectedRevision: 9 })]) {
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requests[0].submissionPosition, 1);
    assert.equal(body.requests[0].queuePosition, 4);
  }
  assert.equal(app.calls.some(call => call[0] === 'in'), false, 'Recent create audits require no extra read');
  assert.equal(snapshot.requests[0].submissionPosition, undefined, 'Mapping must not mutate the RPC snapshot');
});

test('bounded history cannot erase an old open request original position; the lookup is tenant-scoped and batched', async () => {
  const requests = Array.from({ length: 205 }, (_, i) => snapshotRequest({ id: `request-${i}` }));
  const app = harness({ snapshot: { requests, events: [], revision: 5, historyLimited: true }, creations: requests.map((row, i) => creation({ request_id: row.id, new_position: i + 1 })) });
  const body = await (await app.get()).json();
  assert.equal(body.requests[204].submissionPosition, 205);
  const lookups = app.calls.filter(call => call[0] === 'in');
  assert.deepEqual(lookups.map(call => call[3].length), [100, 100, 5]);
  assert.ok(lookups.every(call => call[1] === 'acute_request_events' && call[2] === 'request_id'));
  assert.ok(app.calls.some(call => call[0] === 'eq' && call[1] === 'acute_request_events' && call[2] === 'hospital_id' && call[3] === 'hospital-a'));
  assert.ok(app.calls.some(call => call[0] === 'eq' && call[1] === 'acute_request_events' && call[2] === 'action' && call[3] === 'create'));
  assert.ok(app.calls.some(call => call[0] === 'select' && call[1] === 'acute_request_events' && call[2] === 'hospital_id,request_id,action,new_position'));
});

test('missing or invalid audit positions never invent a number or turn a confirmed save into a failure', async () => {
  for (const event of [undefined, creation({ new_position: -1 }), creation({ new_position: 2.5 }), creation({ new_position: '1' }), creation({ hospital_id: 'hospital-b' })]) {
    const app = harness({ snapshot: { requests: [snapshotRequest()], events: event ? [event] : [], revision: 1 }, creationError: { message: 'private database failure' } });
    const response = await app.send({ action: 'create', expectedRevision: 0, input: input() });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.requests[0].submissionPosition, null);
    assert.equal(body.requests[0].queuePosition, 4);
    assert.doesNotMatch(JSON.stringify(body), /private database failure/);
  }
});

test('snapshot enrichment rejects cross-tenant request rows before reading any audit positions', async () => {
  const app = harness({ snapshot: { requests: [snapshotRequest({ hospital_id: 'hospital-b' })], events: [], revision: 0 } });
  assert.equal((await app.get()).status, 503);
  assert.equal(app.calls.some(call => call[0] === 'in'), false);
});

test('a thrown optional audit read does not misreport an already-confirmed clinical mutation', async () => {
  const app = harness({ snapshot: { requests: [snapshotRequest()], events: [], revision: 1 }, creationThrow: true });
  const response = await app.send({ action: 'create', expectedRevision: 0, input: input() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.requests[0].submissionPosition, null);
  assert.equal(body.revision, 1);
});

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settleTurn = () => new Promise(resolve => setImmediate(resolve));
const activeAccount = () => ({ data: { id, name: 'Test Actor', role: 'aro', is_active: true }, error: null });
const enabledModule = () => ({ data: { is_enabled: true, allowed_roles: ['aro'] }, error: null });

test('account and module checks start together, and GET waits for both approvals', async () => {
  const account = deferred(), module = deferred();
  const app = harness({ read: table => (table === 'app_users' ? account : module).promise });
  const pending = app.get();
  await settleTurn();
  assert.deepEqual(app.calls.filter(call => call[0] === 'read').map(call => call[1]), ['app_users', 'app_modules']);
  module.resolve(enabledModule());
  await settleTurn();
  assert.equal(app.calls.some(call => call[0] === 'rpc'), false, 'A fast module read cannot authorize an unchecked account');
  account.resolve(activeAccount());
  assert.equal((await pending).status, 200);
});

test('POST overlaps account, module and room reads, but never writes until all approve', async () => {
  const account = deferred(), module = deferred(), room = deferred();
  const reads = { app_users: account, app_modules: module, operating_rooms: room };
  const app = harness({ read: table => reads[table].promise });
  const pending = app.send({ action: 'create', expectedRevision: 0, input: { ...input(), proposedRoomId: 'room-a' } });
  await settleTurn();
  assert.deepEqual(app.calls.filter(call => call[0] === 'read').map(call => call[1]), ['app_users', 'app_modules', 'operating_rooms']);
  account.resolve(activeAccount()); module.resolve(enabledModule());
  await settleTurn();
  assert.equal(app.calls.some(call => call[0] === 'rpc'), false, 'The write must wait for same-hospital room validation');
  room.resolve({ data: { id: 'room-a' }, error: null });
  assert.equal((await pending).status, 200);
  assert.equal(app.calls.filter(call => call[0] === 'rpc').length, 1);
});

test('parallel failures preserve revoked-account precedence and conceal room errors', async () => {
  const account = deferred(), module = deferred(), room = deferred();
  const reads = { app_users: account, app_modules: module, operating_rooms: room };
  const app = harness({ read: table => reads[table].promise });
  const pending = app.send({ action: 'create', expectedRevision: 0, input: { ...input(), proposedRoomId: 'room-a' } });
  await settleTurn();
  module.reject(new Error('private module error')); room.reject(new Error('private room error'));
  account.resolve({ data: { ...activeAccount().data, is_active: false }, error: null });
  const response = await pending;
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.code, 'ACUTE_FORBIDDEN');
  assert.doesNotMatch(JSON.stringify(body), /private|room|module/);
  assert.equal(app.calls.some(call => call[0] === 'rpc'), false);
});

test('disabled or read-only users cannot learn malformed input or invalid room details', async () => {
  for (const options of [{ disabled: true }, { role: 'management' }]) {
    for (const body of ['not-json', 'x'.repeat(50_001), { action: 'create', expectedRevision: 0, input: { ...input(), proposedRoomId: 'outside-room' } }]) {
      const app = harness({ ...options, noRoom: true });
      const response = await app.send(body);
      assert.equal(response.status, 403);
      assert.equal(app.calls.some(call => call[0] === 'rpc'), false);
    }
  }
});

test('optional audit reads overlap in bounded groups of three and retain all recorded positions', async () => {
  const requests = Array.from({ length: 650 }, (_, i) => snapshotRequest({ id: `request-${i}` }));
  const batches = [];
  let active = 0, peak = 0;
  const app = harness({
    snapshot: { requests, events: [], revision: 5, historyLimited: true },
    auditRead(values) {
      const pending = deferred();
      active += 1; peak = Math.max(peak, active);
      batches.push({ ...pending, values });
      return pending.promise.finally(() => { active -= 1; });
    },
  });
  const pending = app.get();
  await settleTurn();
  assert.equal(batches.length, 3, 'Start three indexed queries without serial network waits');
  const finish = batch => batch.resolve({ data: batch.values.map(requestId => creation({ request_id: requestId, new_position: Number(requestId.slice(8)) + 1 })), error: null });
  finish(batches[0]); finish(batches[1]);
  await settleTurn();
  assert.equal(batches.length, 3, 'Do not start the next group until this bounded group finishes');
  finish(batches[2]);
  await settleTurn();
  assert.equal(batches.length, 6);
  batches.slice(3, 6).forEach(finish);
  await settleTurn();
  assert.equal(batches.length, 7);
  finish(batches[6]);
  const response = await pending;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(peak, 3);
  assert.deepEqual(batches.map(batch => batch.values.length), [100, 100, 100, 100, 100, 100, 50]);
  assert.equal(body.requests[649].submissionPosition, 650);
  assert.equal(body.historyLimited, true);
  const signals = app.calls.filter(call => call[0] === 'abortSignal').map(call => call[2]);
  assert.equal(signals.length, 7);
  assert.ok(signals.every(signal => signal === signals[0]), 'Every wave uses the same total audit budget');
});

test('one failed optional batch does not discard evidence retrieved by the other batches', async () => {
  const requests = Array.from({ length: 205 }, (_, i) => snapshotRequest({ id: `request-${i}` }));
  const app = harness({
    snapshot: { requests, events: [], revision: 8 },
    auditRead(values) {
      if (values[0] === 'request-100') return Promise.reject(new Error('private audit failure'));
      return Promise.resolve({ data: values.map(requestId => creation({ request_id: requestId, new_position: Number(requestId.slice(8)) + 1 })), error: null });
    },
  });
  const response = await app.send({ action: 'create', expectedRevision: 7, input: input() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.requests[0].submissionPosition, 1);
  assert.equal(body.requests[100].submissionPosition, null);
  assert.equal(body.requests[204].submissionPosition, 205);
  assert.doesNotMatch(JSON.stringify(body), /private audit failure/);
});

test('slow optional audits use one total timeout and cannot block a confirmed POST indefinitely', async () => {
  let budget, expire;
  const cleared = [];
  const requests = Array.from({ length: 650 }, (_, i) => snapshotRequest({ id: `request-${i}` }));
  const app = harness({
    snapshot: { requests, events: [], revision: 8 },
    setTimeout(callback, milliseconds) { expire = callback; budget = milliseconds; return 51; },
    clearTimeout(timer) { cleared.push(timer); },
    auditRead(_values, signal) {
      return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('private timeout')), { once: true }));
    },
  });
  const pending = app.send({ action: 'create', expectedRevision: 7, input: input() });
  await settleTurn();
  assert.equal(budget, 1_500);
  assert.equal(app.calls.filter(call => call[0] === 'in').length, 3);
  assert.equal(app.calls.filter(call => call[0] === 'rpc').length, 1, 'The mutation has already completed');
  expire();
  const response = await pending;
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.revision, 8);
  assert.ok(body.requests.every(request => request.submissionPosition === null));
  assert.equal(app.calls.filter(call => call[0] === 'in').length, 3, 'Do not start another wave after the shared budget expires');
  assert.doesNotMatch(JSON.stringify(body), /private timeout/);
  assert.deepEqual(cleared, [51]);
});

test('optional audit timer is cleared after healthy reads and is absent for recent create evidence', async () => {
  for (const recent of [false, true]) {
    const timers = [], cleared = [];
    const app = harness({
      snapshot: { requests: [snapshotRequest()], events: recent ? [creation()] : [], revision: 1 },
      creations: [creation()],
      setTimeout(_callback, milliseconds) { timers.push(milliseconds); return 52; },
      clearTimeout(timer) { cleared.push(timer); },
    });
    const response = await app.send({ action: 'create', expectedRevision: 0, input: input() });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).requests[0].submissionPosition, 1);
    assert.deepEqual(timers, recent ? [] : [1_500]);
    assert.deepEqual(cleared, recent ? [] : [52]);
  }
});

test('installed Supabase/PostgREST thenables settle on the shared audit abort without any network call', async () => {
  let expire, fetchStarted = false;
  const cleared = [];
  const syntheticClient = createClient('https://synthetic.example.test', 'synthetic-test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch(_url, options) {
        fetchStarted = true;
        return new Promise((resolve, reject) => {
          const signal = options.signal;
          if (signal.aborted) reject(signal.reason);
          else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      },
    },
  });
  const app = harness({
    snapshot: { requests: [snapshotRequest()], events: [], revision: 1 },
    setTimeout(callback) { expire = callback; return 53; },
    clearTimeout(timer) { cleared.push(timer); },
    auditRead(values, signal) {
      return syntheticClient.from('acute_request_events').select('hospital_id,request_id,action,new_position')
        .eq('hospital_id', 'hospital-a').eq('action', 'create').abortSignal(signal).in('request_id', values);
    },
  });
  const pending = app.send({ action: 'create', expectedRevision: 0, input: input() });
  await settleTurn();
  assert.equal(fetchStarted, true, 'Use the installed real query builder with an entirely synthetic transport');
  expire();
  const response = await pending;
  assert.equal(response.status, 200);
  assert.equal((await response.json()).requests[0].submissionPosition, null);
  assert.deepEqual(cleared, [53]);
});

test('successful responses expose generic phase timings and stay non-cacheable', async () => {
  const app = harness();
  for (const response of [await app.get(), await app.send({ action: 'create', expectedRevision: 0, input: input() })]) {
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('server-timing'), /^guard;dur=\d+\.\d, db;dur=\d+\.\d, response;dur=\d+\.\d$/);
    assert.doesNotMatch(response.headers.get('server-timing'), /hospital|Test Actor|Test výkonu/);
  }
});
