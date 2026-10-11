import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import test from 'node:test';

const PG_BIN = process.env.ACUTE_TEST_PG_BIN || '/opt/homebrew/bin';
const available = ['initdb', 'pg_ctl', 'psql'].every(name => existsSync(join(PG_BIN, name)));
const actor = 'a8a913aa-4148-4cb8-9143-09b25d7dd892';
const quote = value => `'${String(value).replaceAll("'", "''")}'`;

test('acute migration and RPC work on isolated PostgreSQL: atomic reorder, version, tenant isolation and immutable audit', { skip: !available, timeout: 90_000 }, async () => {
  // Brand-new synthetic local cluster, no .env, no network listener or production credentials.
  const directory = mkdtempSync(join(tmpdir(), 'orm-acute-postgres-'));
  const cluster = join(directory, 'cluster');
  const run = (name, args, options = {}) => spawnSync(join(PG_BIN, name), args, { encoding: 'utf8', ...options });
  const connection = ['-h', directory, '-p', '55585', '-U', 'acute_test_owner', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'];
  const query = (sql, expectSuccess = true) => {
    const result = run('psql', connection, { input: sql });
    if (expectSuccess) assert.equal(result.status, 0, result.stderr);
    return result;
  };
  let started = false;
  try {
    const init = run('initdb', ['-D', cluster, '-A', 'trust', '-U', 'acute_test_owner', '--no-locale']);
    assert.equal(init.status, 0, init.stderr);
    const start = run('pg_ctl', ['-D', cluster, '-l', join(directory, 'server.log'), '-o', `-k ${directory} -p 55585 -c listen_addresses=''`, '-w', 'start']);
    assert.equal(start.status, 0, start.stderr); started = true;
    query(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE TABLE public.hospitals (id text PRIMARY KEY);
      CREATE TABLE public.app_users (id uuid PRIMARY KEY, name text, role text, is_active boolean);
      CREATE TABLE public.hospital_user_memberships (hospital_id text, user_id text, PRIMARY KEY(hospital_id,user_id));
      CREATE TABLE public.operating_rooms (id text PRIMARY KEY, hospital_id text NOT NULL REFERENCES public.hospitals(id));
      CREATE TABLE public.app_modules (id text, hospital_id text, name text, description text, is_enabled boolean,
        icon text, accent_color text, sort_order integer, allowed_roles text[], PRIMARY KEY (id,hospital_id));
      INSERT INTO public.hospitals VALUES ('a'), ('b');
      INSERT INTO public.app_users VALUES (${quote(actor)}::uuid, 'Local clinician', 'aro', true);
      INSERT INTO public.hospital_user_memberships VALUES ('a', ${quote(actor)}), ('b', ${quote(actor)});
      INSERT INTO public.operating_rooms VALUES ('room-a','a'), ('room-b','b');
      INSERT INTO public.app_modules (id,hospital_id,is_enabled,allowed_roles) VALUES
        ('timeline','a',true,ARRAY['aro','admin','management']), ('timeline','b',true,ARRAY['aro']);
      GRANT SELECT ON public.hospitals TO service_role;
      GRANT SELECT, UPDATE ON public.app_users, public.hospital_user_memberships, public.operating_rooms, public.app_modules TO service_role;
    `);
    query(readFileSync(new URL('../../supabase/migrations/20261007213448_acute_surgery_requests.sql', import.meta.url), 'utf8'));
    assert.equal(query("SELECT bool_and(NOT is_enabled) FROM public.app_modules WHERE id='acute-requests'").stdout.trim(), 't');
    assert.equal(query("SELECT allowed_roles::text FROM public.app_modules WHERE id='acute-requests' AND hospital_id='a'").stdout.trim(), '{admin,aro}');
    assert.equal(query("SELECT has_function_privilege('authenticated','public.apply_acute_request_command(text,uuid,bigint,jsonb)','EXECUTE') OR has_function_privilege('anon','public.get_acute_requests_snapshot(text)','EXECUTE')").stdout.trim(), 'f');
    assert.equal(query("SELECT has_table_privilege('authenticated','public.acute_requests','SELECT') OR has_table_privilege('service_role','public.acute_request_events','UPDATE')").stdout.trim(), 'f');
    query("UPDATE public.app_modules SET is_enabled=true WHERE id='acute-requests'");
    const baseInput = { procedureName: 'Local synthetic surgery', department: 'Chirurgie', description: '', reference: 'TEST', urgency: 'urgent', estimatedDurationMinutes: 45, clinicalDecisionAt: null, latestStartAt: null, proposedRoomId: null, proposedStartAt: null };
    const rpcSQL = (command, hospital = 'a') => `SET ROLE service_role; SELECT public.apply_acute_request_command(${quote(hospital)},${quote(actor)}::uuid,${command.expectedRevision},${quote(JSON.stringify(command))}::jsonb);`;
    const mutate = command => JSON.parse(query(rpcSQL(command)).stdout);
    const first = mutate({ action: 'create', expectedRevision: 0, input: baseInput });
    assert.equal(first.revision, 1); assert.equal(first.requests.length, 1); assert.equal(first.events.length, 1);
    const firstId = first.requests[0].id;
    const second = mutate({ action: 'create', expectedRevision: 1, input: { ...baseInput, urgency: 'emergent', reference: 'SECOND' } });
    const secondId = second.requests.find(row => row.reference === 'SECOND').id;
    assert.equal(second.revision, 2); assert.equal(second.requests[0].id, firstId); // No auto clinical priority reorder.
    const bad = query(rpcSQL({ action: 'reorder', expectedRevision: 2, orderedIds: [firstId, firstId], reason: 'Bad synthetic order' }), false);
    assert.notEqual(bad.status, 0); assert.match(bad.stderr, /ACUTE_INVALID/);
    assert.equal(query("SELECT revision FROM public.acute_request_queues WHERE hospital_id='a'").stdout.trim(), '2');
    const reordered = mutate({ action: 'reorder', expectedRevision: 2, orderedIds: [secondId, firstId], reason: 'Reviewed by clinical team' });
    assert.equal(reordered.revision, 3); assert.deepEqual(reordered.requests.map(row => row.id), [secondId, firstId]);
    assert.equal(reordered.events.filter(row => row.action === 'reorder').length, 2);
    assert.equal(reordered.requests.find(row => row.id === secondId).urgency, 'emergent');
    const completed = mutate({ action: 'complete', expectedRevision: 3, requestId: secondId, reason: 'Request closed after clinical verification' });
    assert.equal(completed.revision, 4); assert.equal(completed.requests.find(row => row.id === firstId).queue_position, 1);
    assert.equal(completed.requests.find(row => row.id === secondId).status, 'completed');
    const acknowledged = mutate({ action: 'acknowledge', expectedRevision: 4, requestId: firstId });
    assert.equal(acknowledged.requests.find(row => row.id === firstId).status, 'acknowledged');
    const stale = query(rpcSQL({ action: 'acknowledge', expectedRevision: 4, requestId: firstId }), false);
    assert.match(stale.stderr, /ACUTE_CONFLICT/);
    const wrongRoom = query(rpcSQL({ action: 'update', expectedRevision: 5, requestId: firstId, reason: 'Invalid cross tenant', input: { ...baseInput, proposedRoomId: 'room-b' } }), false);
    assert.match(wrongRoom.stderr, /ACUTE_INVALID room/);
    const updated = mutate({ action: 'update', expectedRevision: 5, requestId: firstId, reason: 'Clinician changed urgency', input: { ...baseInput, urgency: 'expedited', proposedRoomId: 'room-a', proposedStartAt: '2026-10-08T15:00:00Z' } });
    assert.equal(updated.revision, 6); assert.equal(updated.requests.find(row => row.id === firstId).proposed_room_id, 'room-a');
    const cancelled = mutate({ action: 'cancel', expectedRevision: 6, requestId: firstId, reason: 'No longer indicated' });
    assert.equal(cancelled.revision, 7); assert.equal(cancelled.requests.filter(row => row.queue_position !== null).length, 0);
    assert.equal(query("SELECT count(*) FROM public.operating_rooms").stdout.trim(), '2');
    const immutable = query('UPDATE public.acute_request_events SET reason=\'tampering\'', false);
    assert.match(immutable.stderr, /immutable/);
    const otherTenant = JSON.parse(query("SET ROLE service_role; SELECT public.get_acute_requests_snapshot('b')").stdout);
    assert.equal(otherTenant.requests.length, 0); assert.equal(otherTenant.events.length, 0);
    query("UPDATE public.app_modules SET is_enabled=false WHERE id='acute-requests' AND hospital_id='a'");
    assert.match(query(rpcSQL({ action: 'create', expectedRevision: 7, input: baseInput }), false).stderr, /ACUTE_FORBIDDEN/);
    assert.equal(query("SELECT count(*) FROM public.acute_requests WHERE hospital_id='a'").stdout.trim(), '2');
    // Two independent PostgreSQL sessions race against one queue revision; only one commit wins.
    const concurrent = command => new Promise(resolve => {
      const child = spawn(join(PG_BIN, 'psql'), connection, { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '', stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('exit', status => resolve({ status, stdout, stderr })); child.stdin.end(rpcSQL(command, 'b'));
    });
    const raced = await Promise.all([concurrent({ action: 'create', expectedRevision: 0, input: baseInput }), concurrent({ action: 'create', expectedRevision: 0, input: baseInput })]);
    assert.equal(raced.filter(result => result.status === 0).length, 1);
    assert.match(raced.find(result => result.status !== 0).stderr, /ACUTE_CONFLICT/);
    assert.equal(query("SELECT count(*) FROM public.acute_requests WHERE hospital_id='b'").stdout.trim(), '1');
    // Latest reorder remains visible for each still-open request, even after >1000 other events.
    const activeB = query("SELECT id FROM public.acute_requests WHERE hospital_id='b'").stdout.trim();
    const retainedReorder = query(`INSERT INTO public.acute_request_events
      (hospital_id,request_id,action,actor_id,actor_name,occurred_at,reason,previous_position,new_position)
      VALUES ('b',${quote(activeB)}::uuid,'reorder',${quote(actor)}::uuid,'Local clinician','2000-01-01T00:00:00Z','Old active reorder',2,1)
      RETURNING id`).stdout.trim();
    query(`INSERT INTO public.acute_request_events (hospital_id,request_id,action,actor_id,actor_name,occurred_at)
      SELECT 'b',${quote(activeB)}::uuid,'acknowledge',${quote(actor)}::uuid,'Local clinician',now()+number*interval '1 second'
      FROM generate_series(1,1005) number`);
    const bounded = JSON.parse(query("SET ROLE service_role; SELECT public.get_acute_requests_snapshot('b')").stdout);
    assert.equal(bounded.historyLimited, true);
    assert.equal(bounded.events.length, 1001);
    assert.equal(bounded.events.find(event => event.id === retainedReorder)?.reason, 'Old active reorder');
  } finally {
    if (started) run('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', 'stop']);
    // Exact newly-created temporary directory, never a workspace or user path.
    rmSync(directory, { recursive: true, force: true });
  }
});
