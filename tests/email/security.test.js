import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
const root = new URL('../../', import.meta.url);
const defaults = { EMAIL_NOTIFICATIONS_ENABLED: 'true', RESEND_API_KEY: 'synthetic-test-key', EMAIL_FROM: 'test@example.com' };
for (const [key, value] of Object.entries(defaults)) process.env[key] = value;
for (const name of ['EMAIL_MAX_RECIPIENTS', 'EMAIL_USER_PER_MINUTE', 'EMAIL_HOSPITAL_PER_DAY', 'EMAIL_GLOBAL_PER_DAY']) delete process.env[name];

class TestResponse extends Response {
  static json(body, options) { return new TestResponse(JSON.stringify(body), { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } }); }
}

function harness(options = {}) {
  const calls = [], sends = [], cache = new Map();
  const dispatches = new Map(), deliveryStates = new Map();
  const notificationLogs = new Map();
  const contacts = options.contacts ?? [{ email: 'manager@example.com', name: 'Manager', hospital_id: 'test-a', is_active: true, notify_other: true }];
  const db = {
    from(table) {
      calls.push(['table', table]);
      const filters = []; let max = Infinity;
      const query = {
        select: () => query, limit: value => { max = value; return query; },
        eq: (name, value) => { filters.push([name, value]); calls.push(['eq', name, value]); return query; },
        ilike: (name, value) => { filters.push([name, value]); calls.push(['ilike', name, value]); return query; },
        insert: async value => {
          calls.push(['log', value]);
          if (options.logError) return { error: options.logError };
          if (value.id && notificationLogs.has(value.id)) return { error: { code: '23505' } };
          notificationLogs.set(value.id ?? randomUUID(), value);
          return { error: null };
        },
        maybeSingle: async () => table === 'app_users'
          ? { data: options.noAccount ? null : { id: 'user-a', role: options.currentRole ?? 'admin', is_active: !options.inactiveAccount }, error: options.accountError }
          : table === 'notifications_log'
            ? { data: [...notificationLogs.values()].find(row => filters.every(([key, value]) => row[key] === value)) ?? null, error: options.logLookupError }
            : { data: options.noRoom ? null : { id: 'room-1', name: 'Verified <room>' }, error: options.roomError },
        then: resolve => Promise.resolve({ data: contacts.filter(row => filters.every(([key, value]) => row[key] === value)).slice(0, max), error: options.contactsError }).then(resolve),
      };
      return query;
    },
    async rpc(name, args) {
      calls.push(['rpc', name, args]);
      if (options.rpcError) return { data: null, error: { message: 'private database details' } };
      if (name === 'reserve_email_dispatch') {
        if (options.reserveStatus) return { data: { status: options.reserveStatus, retryAfterSec: 60 }, error: null };
        const key = args.p_request_id, old = dispatches.get(key);
        if (old) return { data: { status: old.p_payload_hash === args.p_payload_hash ? 'duplicate' : 'conflict', recipientCount: old.p_recipient_hashes.length,
          sentCount: old.p_recipient_hashes.filter(hash => deliveryStates.get(hash) === 'sent').length } };
        dispatches.set(key, args);
        args.p_recipient_hashes.forEach(hash => deliveryStates.set(hash, 'reserved'));
        return { data: { status: 'reserved' }, error: null };
      }
      if (name === 'claim_email_delivery') {
        const ok = !options.claimFailure && deliveryStates.get(args.p_recipient_hash) === 'reserved';
        if (ok) deliveryStates.set(args.p_recipient_hash, 'sending');
        return { data: ok, error: null };
      }
      if (name === 'finish_email_delivery') {
        deliveryStates.set(args.p_recipient_hash, args.p_outcome);
        return { data: !options.recordFailure, error: options.recordFailure ? {} : null };
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  const imports = {
    'server-only': {},
    'next/server': { NextResponse: TestResponse },
    '@/lib/hospital/access': { requireHospitalAccess: async (_, opts) => {
      calls.push(['access', opts]);
      return options.authStatus ? TestResponse.json({}, { status: options.authStatus }) : { hospitalId: 'test-a', user: { sub: 'user-a', role: 'admin' } };
    } },
    '@/lib/hospital/submodule-access': { requireSubmoduleAccess: async (_, id) => {
      calls.push(['submodule', id]); return options.submoduleStatus ? TestResponse.json({}, { status: options.submoduleStatus }) : null;
    } },
    '@/lib/auth/csrf': { assertSameOrigin: () => options.csrfStatus ? TestResponse.json({}, { status: options.csrfStatus }) : null },
    '@/lib/supabase-server': { getSupabaseAdmin: () => db },
  };
  const providerFetch = async (url, request) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(request.redirect, 'error'); assert.equal(request.cache, 'no-store');
    assert.ok(request.signal instanceof AbortSignal);
    sends.push([JSON.parse(request.body), { idempotencyKey: request.headers['Idempotency-Key'] }]);
    if (options.transportError) throw new Error('sensitive transport details');
    if (options.providerTimeout) throw new DOMException('synthetic timeout', 'TimeoutError');
    return Response.json(options.providerStatus ? { message: 'secret provider details' } : { id: 'synthetic-provider-id' }, { status: options.providerStatus ?? 200 });
  };
  function load(path) {
    const url = new URL(path, root);
    if (cache.has(url.href)) return cache.get(url.href);
    const source = readFileSync(url, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {}; cache.set(url.href, exports);
    new Function('require', 'exports', 'fetch', compiled)(name => {
      if (name in imports) return imports[name];
      if (name.startsWith('node:')) return nativeRequire(name);
      const relative = name.startsWith('@/') ? `${name.slice(2)}.ts` : new URL(`${name}.ts`, url).href;
      return load(relative);
    }, exports, providerFetch);
    return exports;
  }
  const send = (path, body) => load(path).POST(new Request('http://localhost:3000/api/send-notification', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { calls, sends, load, db, send, deliveryStates, notificationLogs };
}
const route = 'app/api/send-notification/route.ts', testRoute = 'app/api/notifications/test-email/route.ts';
const payload = () => ({ type: 'notify_other', roomId: 'room-1', customReason: '<img src=x onerror=attack()>', requestId: randomUUID() });

test('authentication, admin, settings and CSRF gates run before any mail/database action', async () => {
  for (const path of [route, testRoute]) for (const [options, status] of [[{ authStatus: 401 }, 401], [{ authStatus: 403 }, 403], [{ csrfStatus: 403 }, 403]]) {
    const app = harness(options), response = await app.send(path, payload());
    assert.equal(response.status, status); assert.equal(app.sends.length, 0); assert.equal(app.calls.some(([name]) => name === 'table'), false);
  }
  const app = harness({ submoduleStatus: 403 }); assert.equal((await app.send(testRoute, {})).status, 403);
  assert.deepEqual(app.calls[0], ['access', { adminOnly: true }]); assert.deepEqual(app.calls.at(-1), ['submodule', 'settings.notifications']);
});

test('normal route uses canonical room and active hospital/type-scoped DB contacts, never supplied recipients or HTML', async () => {
  const app = harness(), body = payload();
  const response = await app.send(route, { ...body, roomName: 'Spoof', to: 'attacker@example.com', html: '<script>bad</script>', hospitalId: 'test-b' });
  assert.equal(response.status, 200); assert.equal((await response.json()).success, true);
  assert.equal(app.sends.length, 1); assert.equal(app.sends[0][0].to, 'manager@example.com');
  assert.match(app.sends[0][0].html, /Verified &lt;room&gt;/); assert.match(app.sends[0][0].html, /&lt;img/);
  assert.doesNotMatch(app.sends[0][0].html, /<img|<script>|Spoof/);
  assert.ok(app.calls.some(call => call[1] === 'hospital_id' && call[2] === 'test-a'));
  assert.ok(app.calls.some(call => call[1] === 'notify_other' && call[2] === true));
  assert.match(app.sends[0][1].idempotencyKey, /^orm\/[0-9a-f]{64}$/);
});

test('room alerts without an active matching recipient are recorded silently for statistics, without email', async () => {
  for (const type of ['notify_late_surgeon', 'notify_late_anesthesiologist', 'notify_patient_not_ready', 'notify_late_arrival', 'notify_emergencies', 'notify_other']) {
    const app = harness({ contacts: [
      { email: 'inactive@example.com', hospital_id: 'test-a', is_active: false, [type]: true },
      { email: 'other-hospital@example.com', hospital_id: 'test-b', is_active: true, [type]: true },
      { email: 'disabled-type@example.com', hospital_id: 'test-a', is_active: true, [type]: false },
    ] });
    const body = { ...payload(), type };
    const response = await app.send(route, body), result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.success, true); // Existing overlay closes on this result.
    assert.equal(result.emailSkipped, true);
    assert.equal(result.recipientCount, 0);
    assert.equal(result.message, undefined);
    assert.equal(app.sends.length, 0);
    assert.equal(app.calls.some(call => call[0] === 'rpc'), false);
    const event = app.notificationLogs.get(body.requestId);
    assert.equal(event.hospital_id, 'test-a'); assert.equal(event.room_id, 'room-1');
    assert.equal(event.room_name, 'Verified <room>'); assert.equal(event.notification_type, type);
    assert.equal(event.custom_reason, body.customReason); assert.equal(event.recipient_count, 0);
  }
});

test('record-only alerts work without email configuration but still enforce account and database checks', async () => {
  const saved = { enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED, key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
  try {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = 'false';
    delete process.env.RESEND_API_KEY; delete process.env.EMAIL_FROM;
    const app = harness({ contacts: [] });
    assert.equal((await app.send(route, payload())).status, 200);
    assert.equal(app.notificationLogs.size, 1); assert.equal(app.sends.length, 0);
    for (const [options, status] of [[{ contactsError: {} }, 503], [{ noRoom: true }, 404], [{ inactiveAccount: true }, 403], [{ logError: {} }, 503]]) {
      const failed = harness({ contacts: [], ...options }), response = await failed.send(route, payload());
      assert.equal(response.status, status); assert.equal((await response.json()).success, false);
      assert.equal(failed.notificationLogs.size, 0); assert.equal(failed.sends.length, 0);
    }
  } finally {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = saved.enabled;
    process.env.RESEND_API_KEY = saved.key; process.env.EMAIL_FROM = saved.from;
  }
});

test('record-only retries do not duplicate statistics or silently reuse another event ID', async () => {
  const app = harness({ contacts: [] }), body = payload();
  assert.equal((await app.send(route, body)).status, 200);
  assert.equal((await app.send(route, body)).status, 200);
  assert.equal(app.notificationLogs.size, 1);
  assert.equal((await app.send(route, { ...body, type: 'notify_late_surgeon' })).status, 409);
  assert.equal((await app.send(route, { ...body, customReason: 'different' })).status, 409);
  app.notificationLogs.get(body.requestId).hospital_id = 'test-b';
  assert.equal((await app.send(route, body)).status, 409);
  assert.equal(app.sends.length, 0);
});

test('the actual room callback closes the notification overlay only after a successful record-only response', async () => {
  function callback(path, matches, bindings) {
    const source = ts.createSourceFile(path, readFileSync(new URL(path, root), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let expression;
    function visit(node) {
      if (matches(node)) expression = ts.isJsxAttribute(node) ? node.initializer.expression : node.initializer;
      ts.forEachChild(node, visit);
    }
    visit(source);
    assert.ok(expression, `Missing callback in ${path}`);
    const printed = ts.createPrinter().printNode(ts.EmitHint.Expression, expression, source);
    const compiled = ts.transpileModule(`const callback = ${printed};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    return new Function(...Object.keys(bindings), `${compiled}\nreturn callback;`)(...Object.values(bindings));
  }
  for (const logError of [undefined, { code: 'synthetic-write-failure' }]) {
    const app = harness({ contacts: [], logError }), request = { current: null };
    let closed = false, displayedError = null;
    const send = callback('components/RoomDetail.tsx', node => ts.isJsxAttribute(node) && node.name.text === 'onSendNotification', {
      isTutorial: false, notificationRequest: request, activeHospitalId: 'test-a', room: { id: 'room-1', name: 'Client room' },
      crypto: { randomUUID }, console: { error() {} },
      fetch: (_, options) => app.send(route, JSON.parse(options.body)),
    });
    const click = callback('components/NotificationOverlay.tsx', node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'handleSendNotification', {
      setSendError: value => { displayedError = value; }, setLoading() {}, setCustomReasonOpen() {},
      onSendNotification: send, onClose: () => { closed = true; },
    });
    await click('notify_late_surgeon');
    assert.equal(closed, !logError);
    assert.equal(app.notificationLogs.size, logError ? 0 : 1);
    assert.equal(app.sends.length, 0);
    if (logError) assert.match(displayedError, /uložit/);
    else { assert.equal(displayedError, null); assert.equal(request.current, null); }
  }
});

test('old sessions cannot send after account deletion, deactivation or role change', async () => {
  for (const path of [route, testRoute]) {
    for (const [options, status] of [[{ noAccount: true }, 403], [{ inactiveAccount: true }, 403], [{ currentRole: 'viewer' }, 403], [{ accountError: {} }, 503]]) {
      const app = harness(options);
      const body = path === route ? payload() : { email: 'manager@example.com', requestId: randomUUID() };
      assert.equal((await app.send(path, body)).status, status);
      assert.equal(app.sends.length, 0);
      assert.equal(app.calls.some(call => call[1] === 'reserve_email_dispatch'), false);
    }
  }
});

test('missing room, missing migration, exceeded quotas and consumed claims fail closed', async () => {
  for (const [options, status] of [[{ noRoom: true }, 404], [{ rpcError: true }, 503], [{ reserveStatus: 'limited' }, 429], [{ reserveStatus: 'conflict' }, 409]]) {
    const app = harness(options), response = await app.send(route, payload());
    assert.equal(response.status, status); assert.equal(app.sends.length, 0);
    assert.doesNotMatch(await response.text(), /private database/);
  }
  const app = harness({ claimFailure: true }); const response = await app.send(route, payload());
  assert.equal((await response.json()).success, false); assert.equal(app.sends.length, 0);
});

test('request UUID is mandatory, type prototype names are rejected, body is bounded', async () => {
  for (const bad of [null, [], {}, { ...payload(), requestId: 'bad' }, { ...payload(), type: '__proto__' }, { ...payload(), type: 'constructor' }, { ...payload(), customReason: 'x'.repeat(2001) }]) {
    const app = harness(); assert.equal((await app.send(route, bad)).status, 400); assert.equal(app.sends.length, 0);
  }
  assert.equal((await harness().send(route, { ...payload(), html: 'x'.repeat(9000) })).status, 413);
});

test('kill switch cannot be bypassed with a configured key; invalid limits fail closed', async () => {
  const app = harness();
  for (const value of [undefined, 'false', '1', 'TRUE']) {
    if (value === undefined) delete process.env.EMAIL_NOTIFICATIONS_ENABLED; else process.env.EMAIL_NOTIFICATIONS_ENABLED = value;
    assert.equal((await app.send(route, payload())).status, 503);
  }
  process.env.EMAIL_NOTIFICATIONS_ENABLED = 'true'; process.env.EMAIL_GLOBAL_PER_DAY = 'NaN';
  assert.equal((await app.send(route, payload())).status, 503); delete process.env.EMAIL_GLOBAL_PER_DAY;
  assert.equal(app.sends.length, 0);
});

test('test endpoint allows only exact active hospital management contact, with a fixed server template', async () => {
  const app = harness();
  for (const email of ['attacker@example.com', 'manager@example.com\r\nBcc: bad@example.com', 'manager@%.com']) {
    const response = await app.send(testRoute, { email, requestId: randomUUID() }); assert.ok([400, 403].includes(response.status));
  }
  assert.equal(app.sends.length, 0);
  const response = await app.send(testRoute, { email: 'manager@example.com', requestId: randomUUID(), html: '<script>attack</script>', subject: 'attack' });
  assert.equal((await response.json()).success, true); assert.doesNotMatch(app.sends[0][0].html, /attack/);
  assert.match(app.sends[0][0].subject, /^Test:/);
});

test('duplicate HTTP requests and uncertain provider outcomes never send again', async () => {
  for (const options of [{}, { transportError: true }, { providerTimeout: true }, { providerStatus: 503 }, { recordFailure: true }]) {
    const app = harness(options), body = payload();
    const first = await app.send(route, body); const second = await app.send(route, body);
    assert.equal(app.sends.length, 1); assert.equal((await second.json()).duplicate, true);
    if (Object.keys(options).length) { assert.equal((await first.json()).success, false); assert.ok([...app.deliveryStates.values()].every(x => x !== 'reserved')); }
  }
});

test('recipient normalization deduplicates mailboxes and enforces fan-out before reservation', async () => {
  const module = harness().load('lib/email-dispatch.ts');
  const app = harness();
  const dispatch = { hospitalId: 'test-a', userId: 'user-a', requestId: randomUUID(), intent: ['test'], subject: 'Test', template: { type: 'custom', roomName: 'Room', message: 'test' }, contacts: [{ email: 'MANAGER@example.com' }, { email: 'manager@example.com' }] };
  await app.load('lib/email-dispatch.ts').dispatchEmails(app.db, dispatch); assert.equal(app.sends.length, 1);
  dispatch.contacts = Array.from({ length: 21 }, (_, n) => ({ email: `user${n}@example.com` }));
  await assert.rejects(module.dispatchEmails(app.db, dispatch), /limit/);
});

test('HTML escaping covers all text fields; client modules no longer import the email capability', () => {
  const app = harness(), unsafe = '<script>"&\'evil</script>';
  const html = app.load('lib/email.ts').generateEmailTemplate({ type: 'custom', roomName: unsafe, message: unsafe, timestamp: unsafe, details: { [unsafe]: unsafe } });
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;&quot;&amp;&#39;/);
  for (const path of ['components/NotificationsManager.tsx', 'components/RoomDetail.tsx']) {
    assert.doesNotMatch(readFileSync(new URL(path, root), 'utf8'), /from ['"].*lib\/email['"]|RESEND_API_KEY/);
  }
  assert.equal(existsSync(new URL('hooks/useEmailNotifications.ts', root)), false);
  for (const path of ['lib/email.ts', 'lib/email-policy.ts', 'lib/email-dispatch.ts']) assert.match(readFileSync(new URL(path, root), 'utf8'), /^import 'server-only';/);
});

test('build guard rejects public dotenv secrets and committed keys without printing values', () => {
  const { resolve, relative } = nativeRequire('node:path');
  const script = readFileSync(new URL('scripts/check-email-security.mjs', root), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/^const root = .*;$/m, "const root = '/synthetic-scan';");
  const secret = 're_' + 'x'.repeat(24);
  for (const files of [
    { '.env.local': `VITE_RESEND_API_KEY=${secret}` },
    { '.env.production': `export NEXT_PUBLIC_SERVICE_ROLE_KEY=${secret}` },
    { 'example.ts': `const key = '${secret}'` },
    { '.env.local.example': `RESEND_API_KEY=${secret}` },
  ]) {
    const output = [], processMock = { env: {}, exitCode: 0 };
    const basename = path => String(path).split('/').at(-1);
    const read = path => {
      if (!(basename(path) in files)) throw Object.assign(new Error(), { code: 'ENOENT' });
      return files[basename(path)];
    };
    const list = () => Object.keys(files).map(name => ({ name, isFile: () => true, isDirectory: () => false, isSymbolicLink: () => false }));
    new Function('readFileSync', 'readdirSync', 'statSync', 'resolve', 'relative', 'process', 'console', script)(
      read, list, () => ({ size: 100 }), resolve, relative, processMock,
      { error: value => output.push(value), log: value => output.push(value) },
    );
    assert.equal(processMock.exitCode, 1);
    assert.ok(output.length); assert.ok(output.every(value => !value.includes(secret)));
  }
});
