import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const PG_BIN = process.env.HISTORY_TEST_PG_BIN || '/opt/homebrew/bin';
const available = ['initdb', 'pg_ctl', 'psql'].every(name => existsSync(join(PG_BIN, name)));
const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const migration = source('supabase/migrations/20261021234144_protect_recorded_history.sql');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const actor = 'a8a913aa-4148-4cb8-9143-09b25d7dd892';

test('history integrity on isolated PostgreSQL', { skip: !available, timeout: 90_000 }, async t => {
  // Synthetic local cluster only; no application credentials or clinical data.
  const directory = mkdtempSync(join(tmpdir(), 'orm-history-postgres-'));
  const cluster = join(directory, 'cluster');
  const run = (name, args, options = {}) => spawnSync(join(PG_BIN, name), args, { encoding: 'utf8', ...options });
  const connection = ['-h', directory, '-p', '55587', '-U', 'history_test_owner', '-d', 'postgres',
    '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
  const query = (sql, expectedCode) => {
    const result = run('psql', connection, { input: sql });
    if (expectedCode) {
      assert.notEqual(result.status, 0, sql);
      assert.match(result.stderr, new RegExp(`ERROR:  ${expectedCode}:`), result.stderr);
    } else assert.equal(result.status, 0, result.stderr);
    return result;
  };
  const scalar = sql => query(sql).stdout.trim();
  const as = (role, sql, hospital = 'a', subject = actor) => `SET ROLE ${role};
    SET request.jwt.claims = '${JSON.stringify({ hospital_id: hospital, sub: subject })}'; ${sql}`;
  const historyInsert = (type, room = 'room-a', hospital = 'a', id = randomUUID()) => `
    INSERT INTO public.room_status_history (id,hospital_id,operating_room_id,event_type,"timestamp",metadata)
    VALUES (${quote(id)},${quote(hospital)},${quote(room)},${quote(type)},'2026-10-22T10:00:00Z','{}')`;
  const noticeInsert = (type = 'infectious_patient', room = 'room-a', hospital = 'a', count = 0) => `
    INSERT INTO public.notifications_log (hospital_id,room_id,room_name,notification_type,recipient_count)
    VALUES (${quote(hospital)},${quote(room)},'Synthetic room',${quote(type)},${count})`;
  const snapshot = table => scalar(`SELECT coalesce(jsonb_agg(row ORDER BY id),'[]') FROM public.${table} row`);
  let started = false;
  try {
    const init = run('initdb', ['-D', cluster, '-A', 'trust', '-U', 'history_test_owner', '--no-locale']);
    assert.equal(init.status, 0, init.stderr);
    const start = run('pg_ctl', ['-D', cluster, '-l', join(directory, 'server.log'),
      '-o', `-k ${directory} -p 55587 -c listen_addresses=''`, '-w', 'start']);
    assert.equal(start.status, 0, start.stderr);
    started = true;
    query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
        $$ SELECT current_setting('request.jwt.claims', true)::jsonb $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE public.staff (id text PRIMARY KEY, hospital_id text NOT NULL);
      CREATE TABLE public.operating_rooms (
        id text PRIMARY KEY, hospital_id text NOT NULL, current_step_index integer NOT NULL DEFAULT 0,
        state_revision bigint NOT NULL DEFAULT 0, phase_started_at timestamptz, operation_started_at timestamptz,
        status_history jsonb, completed_operations jsonb, status text, queue_count integer, operations_24h integer,
        is_emergency boolean, is_locked boolean, current_patient_id text, current_procedure_id text,
        estimated_end_time timestamptz, doctor_id text, nurse_id text, anesthesiologist_id text, updated_at timestamptz,
        is_paused boolean, patient_called_at timestamptz, patient_arrived_at timestamptz, hourly_operating_cost numeric,
        is_enhanced_hygiene boolean, enhanced_hygiene_at timestamptz, paused_at timestamptz,
        notice_message text, notice_at timestamptz, notice_sender text, aro_overtime_since timestamptz
      );
      CREATE TABLE public.workflow_statuses (id text, hospital_id text, name text, is_active boolean,
        is_special boolean, sort_order integer);
      CREATE TABLE public.room_status_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id text NOT NULL,
        operating_room_id text NOT NULL REFERENCES public.operating_rooms(id), event_type text NOT NULL,
        step_index integer, step_name text, duration_seconds integer, "timestamp" timestamptz,
        metadata jsonb, created_at timestamptz DEFAULT now()
      );
      INSERT INTO public.operating_rooms (id,hospital_id) VALUES ('room-a','a'),('room-b','b');
      INSERT INTO public.workflow_statuses VALUES ('ready','a','Ready',true,false,0),('arrival','a','Arrival',true,false,1);
    `);
    query(source('scripts/create-notifications-log.sql'));
    query('ALTER TABLE public.notifications_log ADD COLUMN hospital_id text NOT NULL');
    // Execute the actual legacy policy/grant loop that introduced the issue.
    const legacy = source('scripts/13-add-multi-hospital.sql');
    const policyStart = legacy.indexOf('-- Skutečná tenant bariéra:');
    assert.ok(policyStart > 0);
    query(`BEGIN; ${legacy.slice(policyStart)}`);
    query(source('supabase/migrations/20260910171139_restrict_settings_direct_writes.sql'));
    query(source('scripts/18-atomic-operation-cycle-history.sql'));
    query("UPDATE public.operating_rooms SET current_step_index=1,phase_started_at='2026-10-22T09:00:00Z' WHERE id='room-a'");
    query(noticeInsert('notify_other'));

    await t.test('baseline reproduces ordinary update/delete on both logs', () => {
      for (const [table, insert, edit] of [
        ['room_status_history', historyInsert('pause'), "event_type='operation_end',\"timestamp\"='2000-01-01'"],
        ['notifications_log', noticeInsert(), "notification_type='notify_late_surgeon',recipient_count=50"],
      ]) {
        query(as('authenticated', `${insert} RETURNING id`));
        assert.equal(scalar(as('authenticated', `WITH changed AS (UPDATE public.${table} SET ${edit} RETURNING id) SELECT count(*) FROM changed`)) > 0, true);
        assert.equal(scalar(as('authenticated', `WITH removed AS (DELETE FROM public.${table} RETURNING id) SELECT count(*) FROM removed`)) > 0, true);
      }
      // Restore trustworthy synthetic records as the table owner.
      query("UPDATE public.operating_rooms SET current_step_index=0,phase_started_at='2026-10-22T09:30:00Z' WHERE id='room-a'");
      query(noticeInsert('notify_other'));
    });

    // Include an acute evidence FK: changing a referenced row's contents must
    // be denied even though the FK alone only protects its ID from deletion.
    const protectedId = scalar("SELECT id FROM room_status_history WHERE event_type='operation_end'");
    query(`CREATE TABLE public.synthetic_acute_evidence (event_id uuid REFERENCES public.room_status_history(id) ON DELETE RESTRICT);
      INSERT INTO public.synthetic_acute_evidence VALUES (${quote(protectedId)});
      GRANT UPDATE (event_type,"timestamp") ON room_status_history TO authenticated;
      GRANT UPDATE (recipient_count) ON notifications_log TO authenticated;
      GRANT UPDATE (step_name) ON room_status_history TO PUBLIC;
      GRANT INSERT (event_type) ON room_status_history TO anon;
      GRANT UPDATE (custom_reason) ON notifications_log TO anon;`);
    const historyBefore = snapshot('room_status_history');
    const noticesBefore = snapshot('notifications_log');
    query(migration);
    query(migration); // Safe to rerun after the same deployment.
    assert.equal(snapshot('room_status_history'), historyBefore);
    assert.equal(snapshot('notifications_log'), noticesBefore);

    await t.test('all direct edits and destructive alternatives are denied, including column grants and FK-linked evidence', () => {
      for (const table of ['room_status_history', 'notifications_log']) {
        for (const role of ['anon', 'authenticated']) {
          for (const statement of [
            `UPDATE public.${table} SET hospital_id='b' WHERE hospital_id='a'`,
            `DELETE FROM public.${table} WHERE hospital_id='a'`,
            `TRUNCATE public.${table} CASCADE`,
          ]) query(as(role, statement), '42501');
          assert.equal(scalar(`SELECT has_any_column_privilege('${role}','public.${table}','UPDATE')
            OR has_table_privilege('${role}','public.${table}','DELETE')
            OR has_table_privilege('${role}','public.${table}','TRUNCATE')`), 'f');
        }
      }
      query(as('authenticated', `UPDATE room_status_history SET event_type='operation_start',"timestamp"='2000-01-01' WHERE id=${quote(protectedId)}`), '42501');
      query(as('authenticated', "UPDATE notifications_log SET recipient_count=100"), '42501');
      query(as('authenticated', `${historyInsert('pause', 'room-a', 'a', protectedId)} ON CONFLICT (id) DO UPDATE SET event_type=EXCLUDED.event_type`), '42501');
      // Existing settings hardening also blocks cascading deletion via a room.
      query(as('authenticated', "DELETE FROM operating_rooms WHERE id='room-a'"), '42501');
      assert.equal(snapshot('room_status_history'), historyBefore);
      assert.equal(snapshot('notifications_log'), noticesBefore);
    });

    await t.test('canonical lifecycle and delivery inserts cannot be forged; append checks bind tenant, subject and room', () => {
      for (const type of ['step_change', 'operation_start', 'operation_end', 'operation_completed', 'unknown', 'Operation_Start']) {
        query(as('authenticated', historyInsert(type)), '42501');
      }
      for (const statement of [historyInsert('pause', 'room-b'), historyInsert('pause', 'room-b', 'b'),
        historyInsert('pause', 'missing-room'), noticeInsert('infectious_patient', 'room-b'),
        noticeInsert('infectious_patient', 'room-b', 'b'), noticeInsert('notify_other'), noticeInsert('infectious_patient', 'room-a', 'a', 1)]) {
        query(as('authenticated', statement), '42501');
      }
      query(as('authenticated', historyInsert('pause'), 'a', ''), '42501');
      query(as('authenticated', noticeInsert(), 'a', ''), '42501');
      query(as('anon', historyInsert('pause')), '42501');
      query(as('anon', noticeInsert()), '42501');
      assert.equal(snapshot('room_status_history'), historyBefore);
      assert.equal(snapshot('notifications_log'), noticesBefore);
    });

    await t.test('legitimate appends, retry idempotency and tenant-scoped reads survive', () => {
      for (const type of ['pause', 'resume', 'patient_call', 'patient_arrival', 'patient_arrived',
        'emergency_on', 'emergency_off', 'lock', 'unlock', 'enhanced_hygiene_on', 'enhanced_hygiene_off', 'staff_change']) {
        query(as('authenticated', historyInsert(type)));
      }
      const retryId = randomUUID();
      query(as('authenticated', `${historyInsert('pause', 'room-a', 'a', retryId)} ON CONFLICT (id) DO NOTHING`));
      const original = snapshot('room_status_history');
      query(as('authenticated', `${historyInsert('resume', 'room-a', 'a', retryId)} ON CONFLICT (id) DO NOTHING`));
      assert.equal(snapshot('room_status_history'), original);
      query(as('authenticated', noticeInsert()));
      assert.equal(Number(scalar(as('authenticated', 'SELECT count(*) FROM room_status_history'))) > 0, true);
      assert.equal(scalar(as('authenticated', 'SELECT count(*) FROM room_status_history', 'b')), '0');
      assert.equal(scalar(as('authenticated', 'SELECT count(*) FROM notifications_log', 'b')), '0');
      query(as('anon', 'SELECT * FROM room_status_history'), '42501');
      query(as('anon', 'SELECT * FROM notifications_log'), '42501');
    });

    await t.test('normal runtime transitions still atomically append canonical cycle boundaries', () => {
      const before = Number(scalar('SELECT count(*) FROM room_status_history'));
      query(as('authenticated', "UPDATE operating_rooms SET current_step_index=1,phase_started_at='2026-10-22T11:00:00Z' WHERE id='room-a'"));
      query(as('authenticated', "UPDATE operating_rooms SET current_step_index=0,phase_started_at='2026-10-22T12:00:00Z' WHERE id='room-a'"));
      assert.equal(Number(scalar('SELECT count(*) FROM room_status_history')) - before, 4);
      assert.equal(scalar("SELECT string_agg(event_type,',' ORDER BY \"timestamp\") FROM room_status_history WHERE \"timestamp\">='2026-10-22T11:00:00Z'"),
        'step_change,operation_start,step_change,operation_end');
    });

    await t.test('authorized service delivery, import/upsert and reset maintenance retain explicit grants', () => {
      query(as('service_role', noticeInsert('notify_other', 'room-a', 'a', 2)));
      const importId = randomUUID();
      query(as('service_role', historyInsert('operation_start', 'room-b', 'b', importId)));
      query(as('service_role', `${historyInsert('operation_end', 'room-b', 'b', importId)} ON CONFLICT (id) DO UPDATE SET event_type=EXCLUDED.event_type`));
      assert.equal(scalar(`SELECT event_type FROM room_status_history WHERE id=${quote(importId)}`), 'operation_end');
      query(as('service_role', `DELETE FROM room_status_history WHERE id=${quote(importId)}`));
      query(as('service_role', "UPDATE notifications_log SET custom_reason='Authorized restore' WHERE notification_type='notify_other'"));
      query(as('service_role', "DELETE FROM notifications_log WHERE notification_type='notify_other'"));
      assert.equal(scalar("SELECT count(*) FROM notifications_log WHERE notification_type='infectious_patient'"), '1');
    });
  } finally {
    if (started) run('pg_ctl', ['-D', cluster, '-m', 'immediate', '-w', 'stop']);
    rmSync(directory, { recursive: true, force: true });
  }
});
