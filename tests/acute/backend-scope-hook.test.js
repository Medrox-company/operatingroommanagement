import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const emptySnapshot = { requests: [], events: [], revision: 0, canManage: true, historyLimited: false };
function harness(transport, { snapshot = emptySnapshot, error = null, onMutate } = {}) {
  let hospitalId = 'hospital-a', refCursor = 0, stateCursor = 0;
  const refs = [], states = [], busyTransitions = [], calls = [], swrCalls = [], mutations = [];
  const cache = new Map();
  const imports = {
    react: {
      useCallback: callback => callback,
      useState: initial => {
        const index = stateCursor++;
        if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], value => {
          states[index] = typeof value === 'function' ? value(states[index]) : value;
          busyTransitions.push(states[index]);
        }];
      },
      useRef: initial => { const index = refCursor++; if (!refs[index]) refs[index] = { current: initial }; return refs[index]; },
    },
    swr: { __esModule: true, default: (key, fetcher) => {
      swrCalls.push({ key, fetcher });
      const cacheKey = JSON.stringify(key);
      if (!cache.has(cacheKey)) cache.set(cacheKey, snapshot);
      const mutate = async (nextSnapshot, options) => {
        mutations.push([nextSnapshot, options]);
        if (onMutate) await onMutate(nextSnapshot, options);
        const confirmed = nextSnapshot === undefined ? await fetcher(key) : nextSnapshot;
        cache.set(cacheKey, confirmed);
        return confirmed;
      };
      return { data: cache.get(cacheKey), error, isLoading: false, mutate };
    } },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospitalId }) },
    '../contexts/AuthContext': { useAuth: () => ({ user: { id: 'user-a', role: 'superadmin' }, permissionsLoading: false, hasModuleAccess: () => true }) },
  };
  const source = readFileSync(new URL('../../hooks/useAcuteRequests.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function('require', 'exports', 'fetch', compiled)(name => imports[name], exports, async (url, options) => {
    calls.push({ url, options }); return transport(url, options);
  });
  return {
    calls, swrCalls, mutations, busyTransitions,
    render: (id = hospitalId) => { hospitalId = id; refCursor = 0; stateCursor = 0; return exports.useAcuteRequests(); },
  };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((accept, decline) => { resolve = accept; reject = decline; });
  return { promise, resolve, reject };
}

const createCommand = { action: 'create', input: { procedureName: 'Test-only request', urgency: 'urgent', proposedRoomId: 'room-a', estimatedDurationMinutes: 30 } };
const savedSnapshot = {
  ...emptySnapshot,
  revision: 1,
  requests: [{ id: 'request-a', hospitalId: 'hospital-a', procedureName: 'Server-confirmed request', status: 'pending' }],
  events: [{ id: 'event-a', requestId: 'request-a', action: 'created' }],
};

test('GET is explicitly bound to its SWR-key hospital even after another facility is rendered', async () => {
  const app = harness(async () => Response.json(emptySnapshot));
  app.render('hospital-a');
  const old = app.swrCalls[0];
  app.render('hospital-b');
  await old.fetcher(old.key);
  assert.equal(app.calls[0].options.headers['X-Acute-Hospital-Id'], 'hospital-a');
});
test('GET refuses another facility snapshot instead of caching it under the old key', async () => {
  const app = harness(async () => Response.json({ ...emptySnapshot, requests: [{ id: 'request-b', hospitalId: 'hospital-b' }] }));
  app.render('hospital-a');
  const read = app.swrCalls[0];
  await assert.rejects(read.fetcher(read.key), error => error.code === 'ACUTE_SCOPE_CHANGED');
});
test('stale draft sends original expected hospital and is rejected when shared cookie changed', async () => {
  const app = harness(async () => Response.json({ error: 'Zařízení se změnilo', code: 'ACUTE_SCOPE_CHANGED' }, { status: 409 }));
  const old = app.render('hospital-a');
  app.render('hospital-b');
  await assert.rejects(old.execute({ action: 'acknowledge', requestId: 'request-a' }), error => error.code === 'ACUTE_SCOPE_CHANGED');
  assert.equal(app.calls[0].options.headers['X-Acute-Hospital-Id'], 'hospital-a');
  assert.equal(app.mutations.length, 0);
});
test('already-started mutation never inserts its A snapshot into B after navigation', async () => {
  let finish;
  const app = harness(() => new Promise(resolve => { finish = resolve; }));
  const current = app.render('hospital-a');
  const pending = current.execute({ action: 'acknowledge', requestId: 'request-a' });
  app.render('hospital-b');
  finish(Response.json(emptySnapshot));
  await assert.rejects(pending, /Aktivní zařízení se změnilo/);
  assert.equal(app.mutations.length, 0);
});

test('a new request stays unconfirmed until POST and response parsing finish, then publishes the authoritative snapshot without another GET', async () => {
  const post = deferred(), body = deferred();
  const app = harness(() => post.promise);
  const current = app.render();
  let resolved = false;
  const pending = current.execute(createCommand).then(snapshot => { resolved = true; return snapshot; });

  assert.deepEqual(app.calls.map(call => call.options.method), ['POST']);
  assert.deepEqual(JSON.parse(app.calls[0].options.body), { ...createCommand, expectedRevision: 0 });
  assert.equal(app.render().busy, true);
  assert.deepEqual(app.render().requests, []);
  assert.equal(app.mutations.length, 0, 'No optimistic request is published while the write is pending');

  post.resolve({ ok: true, status: 200, json: () => body.promise });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(resolved, false);
  assert.equal(app.mutations.length, 0, 'An HTTP success alone is not a validated clinical snapshot');
  body.resolve(savedSnapshot);

  assert.deepEqual(await pending, savedSnapshot);
  assert.deepEqual(app.mutations, [[savedSnapshot, { revalidate: false }]]);
  const updated = app.render();
  assert.deepEqual(updated.requests, savedSnapshot.requests);
  assert.deepEqual(updated.events, savedSnapshot.events);
  assert.equal(updated.revision, 1);
  assert.equal(updated.busy, false);
  assert.deepEqual(app.busyTransitions, [true, false]);
  assert.equal(app.calls.length, 1, 'Successful saving uses the POST snapshot, not an additional read');
});

test('rapid duplicate submission makes only one write and the busy guard is released after confirmation', async () => {
  const post = deferred();
  const app = harness(() => app.calls.length === 1 ? post.promise : Response.json({ ...savedSnapshot, revision: 2 }));
  const current = app.render();
  const pending = current.execute(createCommand);
  await assert.rejects(current.execute(createCommand), /Předchozí změna se ještě ukládá/);
  assert.equal(app.calls.length, 1);
  assert.equal(app.render().busy, true);
  post.resolve(Response.json(savedSnapshot));
  await pending;
  assert.equal(app.render().busy, false);
  await app.render().execute({ action: 'acknowledge', requestId: 'request-a' });
  assert.equal(app.calls.length, 2);
  assert.equal(JSON.parse(app.calls[1].options.body).expectedRevision, 1);
  assert.deepEqual(app.busyTransitions, [true, false, true, false]);
});

test('unsuccessful writes never publish a request, never retry the POST, and release busy state', async () => {
  const failures = [
    { name: 'authorization rejection', transport: () => Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 }), message: /Forbidden/ },
    { name: 'server failure', transport: () => Response.json({ error: 'Write failed', code: 'WRITE_FAILED' }, { status: 500 }), message: /Write failed/ },
    { name: 'network failure', transport: () => Promise.reject(new Error('Offline')), message: /Offline/ },
    { name: 'invalid acknowledged body', transport: () => Response.json({ requests: [], revision: 1 }), message: /platný přehled/ },
    { name: 'invalid JSON', transport: () => new Response('not-json'), message: /platný přehled/ },
  ];
  for (const failure of failures) {
    const app = harness(failure.transport);
    await assert.rejects(app.render().execute(createCommand), failure.message, failure.name);
    assert.equal(app.mutations.length, 0, `${failure.name}: no clinical cache write`);
    assert.deepEqual(app.render().requests, [], failure.name);
    assert.equal(app.render().busy, false, failure.name);
    assert.deepEqual(app.busyTransitions, [true, false], failure.name);
    assert.deepEqual(app.calls.map(call => call.options.method), ['POST'], failure.name);
  }
});

test('a revision conflict refreshes once but does not resubmit the clinical command', async () => {
  const refreshed = { ...emptySnapshot, revision: 8, requests: [{ id: 'existing-a', hospitalId: 'hospital-a' }] };
  const app = harness((_url, options) => options.method === 'POST'
    ? Response.json({ error: 'Přehled se změnil', code: 'ACUTE_REVISION_CONFLICT' }, { status: 409 })
    : Response.json(refreshed));
  await assert.rejects(app.render().execute(createCommand), error => error.status === 409 && error.code === 'ACUTE_REVISION_CONFLICT');
  assert.deepEqual(app.calls.map(call => call.options.method ?? 'GET'), ['POST', 'GET']);
  assert.equal(app.calls[1].options.headers['X-Acute-Hospital-Id'], 'hospital-a');
  assert.deepEqual(app.mutations, [[undefined, undefined]], 'Conflict invalidates the old read rather than claiming the create succeeded');
  assert.deepEqual(app.render().requests, refreshed.requests);
  assert.equal(app.render().revision, 8);
  assert.equal(app.render().busy, false);
  assert.deepEqual(app.busyTransitions, [true, false]);
});

test('busy state also releases when conflict refresh or local cache publication fails', async () => {
  const refreshFailure = harness((_url, options) => options.method === 'POST'
    ? Response.json({ error: 'Conflict', code: 'ACUTE_REVISION_CONFLICT' }, { status: 409 })
    : Promise.reject(new Error('Read unavailable')));
  await assert.rejects(refreshFailure.render().execute(createCommand), /Read unavailable/);
  assert.equal(refreshFailure.render().busy, false);
  assert.deepEqual(refreshFailure.calls.map(call => call.options.method ?? 'GET'), ['POST', 'GET']);

  const cacheFailure = harness(() => Response.json(savedSnapshot), { onMutate: () => { throw new Error('Cache unavailable'); } });
  await assert.rejects(cacheFailure.render().execute(createCommand), /Cache unavailable/);
  assert.equal(cacheFailure.render().busy, false);
  assert.deepEqual(cacheFailure.render().requests, []);
  assert.equal(cacheFailure.calls.length, 1);
});
