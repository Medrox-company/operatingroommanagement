import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import test from 'node:test';

// Opt-in only. Never uses DATABASE_URL, Supabase credentials or remote hosts.
const enabled = process.env.ORM_EMAIL_ISOLATED_DB_TEST === '1';
const port = process.env.ORM_EMAIL_TEST_PG_PORT || '54873';
assert.match(port, /^\d{4,5}$/);
const query = sql => new Promise((resolve, reject) => {
  const child = spawn('psql', ['-h', '127.0.0.1', '-p', port, '-d', 'orm_email_test_security', '-XAt', '-v', 'ON_ERROR_STOP=1', '-c', sql], { env: { ...process.env, PGHOST: '127.0.0.1', PGPORT: port, PGDATABASE: 'orm_email_test_security', PGPASSWORD: '', PGOPTIONS: '-c statement_timeout=10000' } });
  let out = '', err = '';
  child.stdout.on('data', data => out += data); child.stderr.on('data', data => err += data);
  child.on('error', reject); child.on('close', code => code === 0 ? resolve(out.trim().split('\n').at(-1)) : reject(new Error(err)));
});
const reserve = ({ hospital = 'test-a', user = 'test-user', id = randomUUID(), intent = randomUUID().replaceAll('-', '').padEnd(64, 'a'), payload = 'a'.repeat(64), count = 1, userLimit = 100, hospitalLimit = 100, globalLimit = 100 } = {}) =>
  `SET ROLE service_role; SELECT public.reserve_email_dispatch('${hospital}','${user}','${id}','${payload}','${intent}',ARRAY[${Array.from({ length: count }, (_, i) => `'${String(i).padStart(64, 'b')}'`).join(',')}],${userLimit},${hospitalLimit},${globalLimit});`;

test('isolated Postgres: real atomic quotas, deduplication, claims and grants', { skip: !enabled }, async t => {
  const marker = await query("SELECT count(*) FROM public.hospitals WHERE id IN ('test-a','test-b');");
  assert.equal(marker, '2', 'requires the synthetic test database, not the application database');
  const reset = () => query('TRUNCATE email_security.deliveries, email_security.dispatches, email_security.quotas;');

  await t.test('service_role reserves while anon/authenticated cannot call RPC or read tables', async () => {
    await reset(); assert.equal(JSON.parse(await query(reserve())).status, 'reserved');
    for (const role of ['anon', 'authenticated']) {
      await assert.rejects(query(`SET ROLE ${role}; SELECT public.claim_email_delivery('test-a','${randomUUID()}','${'a'.repeat(64)}');`), /permission denied/);
      await assert.rejects(query(`SET ROLE ${role}; SELECT * FROM email_security.dispatches;`), /permission denied/);
    }
    assert.equal(await query("SELECT count(*) FROM pg_proc WHERE proname IN ('reserve_email_dispatch','claim_email_delivery','finish_email_delivery','prune_email_dispatch_history') AND prosecdef;"), '0');
  });
  await t.test('twenty independent connections cannot exceed a global limit of ten recipients', async () => {
    await reset(); const started = performance.now();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => query(reserve({ user: `user-${i}`, hospital: i % 2 ? 'test-a' : 'test-b', globalLimit: 10 })).then(JSON.parse)));
    assert.equal(results.filter(x => x.status === 'reserved').length, 10);
    assert.equal(results.filter(x => x.status === 'limited').length, 10);
    assert.equal(await query("SELECT used FROM email_security.quotas WHERE scope='global';"), '10');
    t.diagnostic(`20 concurrent synthetic reservations: ${Math.round(performance.now() - started)} ms (local only, not production latency)`);
  });
  await t.test('fan-out is counted; user/hospital limits are independent of IP', async () => {
    await reset(); assert.equal(JSON.parse(await query(reserve({ count: 3, userLimit: 4 }))).status, 'reserved');
    assert.equal(JSON.parse(await query(reserve({ count: 2, userLimit: 4 }))).status, 'limited');
    assert.equal(await query("SELECT used FROM email_security.quotas WHERE scope='global';"), '3');
    assert.equal(JSON.parse(await query(reserve({ user: 'different-user', count: 2, hospitalLimit: 4 }))).status, 'limited');
    assert.equal(JSON.parse(await query(reserve({ hospital: 'test-b', user: 'different-user', count: 2, hospitalLimit: 4 }))).status, 'reserved');
  });
  await t.test('same UUID has one reservation, changed payload/owner conflicts and changed UUID cannot bypass intent guard', async () => {
    await reset(); const id = randomUUID(), intent = 'd'.repeat(64);
    const results = await Promise.all(Array.from({ length: 12 }, () => query(reserve({ id, intent })).then(JSON.parse)));
    assert.equal(results.filter(x => x.status === 'reserved').length, 1);
    assert.equal(results.filter(x => x.status === 'duplicate').length, 11);
    assert.equal(JSON.parse(await query(reserve({ id, intent, user: 'other-user' }))).status, 'conflict');
    assert.equal(JSON.parse(await query(reserve({ id, intent, payload: 'c'.repeat(64) }))).status, 'conflict');
    assert.equal(JSON.parse(await query(reserve({ intent }))).status, 'cooldown');
    assert.equal(await query("SELECT used FROM email_security.quotas WHERE scope='global';"), '1');
  });
  await t.test('recipient claims are one-time and bound to hospital plus reserved recipient', async () => {
    await reset(); const id = randomUUID(), hash = 'b'.repeat(63) + '0'; await query(reserve({ id }));
    const claim = hospital => `SET ROLE service_role; SELECT public.claim_email_delivery('${hospital}','${id}','${hash}');`;
    assert.equal(await query(claim('test-b')), 'f');
    const results = await Promise.all(Array.from({ length: 12 }, () => query(claim('test-a'))));
    assert.equal(results.filter(x => x === 't').length, 1);
    assert.equal(await query(`SET ROLE service_role; SELECT public.finish_email_delivery('test-a','${id}','${hash}','unknown',NULL);`), 't');
    assert.equal(await query(claim('test-a')), 'f');
  });
  await t.test('invalid reservation rolls back without incrementing counters; maintenance is bounded', async () => {
    await reset(); await assert.rejects(query(reserve({ count: 51 })), /invalid email reservation/);
    assert.equal(await query('SELECT count(*) FROM email_security.quotas;'), '0');
    await query(reserve());
    await query("UPDATE email_security.dispatches SET created_at=now()-interval '31 days'; SET ROLE service_role; SELECT public.prune_email_dispatch_history();");
    assert.equal(await query('SELECT count(*) FROM email_security.dispatches;'), '0');
    assert.equal(await query('SELECT count(*) FROM email_security.deliveries;'), '0');
  });
});
