import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const PG_BIN = process.env.ALLOCATION_TEST_PG_BIN || '/opt/homebrew/bin';
const available = ['initdb', 'pg_ctl', 'psql'].every(name => existsSync(join(PG_BIN, name)));
const migration = readFileSync(new URL('../../supabase/migrations/20261021224205_enforce_allocation_tenant_references.sql', import.meta.url), 'utf8');

test('allocation tenant integrity and grants on isolated PostgreSQL', { skip: !available, timeout: 90_000 }, async t => {
  // Synthetic local cluster only: no .env, remote connection or application data.
  const directory = mkdtempSync(join(tmpdir(), 'orm-allocation-postgres-'));
  const cluster = join(directory, 'cluster');
  const run = (name, args, options = {}) => spawnSync(join(PG_BIN, name), args, { encoding: 'utf8', ...options });
  const connection = ['-h', directory, '-p', '55586', '-U', 'allocation_test_owner', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
  const query = (sql, expectedCode) => {
    const result = run('psql', connection, { input: sql });
    if (expectedCode) {
      assert.notEqual(result.status, 0, sql);
      assert.match(result.stderr, new RegExp(`ERROR:  ${expectedCode}:`), result.stderr);
    } else {
      assert.equal(result.status, 0, result.stderr);
    }
    return result;
  };
  const value = sql => query(sql).stdout.trim();
  const as = (role, sql, hospital = 'a') => `SET ROLE ${role}; SET request.jwt.claims = '{"hospital_id":"${hospital}"}'; ${sql}`;
  const insert = (room, department, date = '2026-10-22', part = 'AM', kind = 'SPECIALTY') => `
    INSERT INTO public.room_specialty_allocations
      (hospital_id, operating_room_id, department_id, allocation_date, day_part, allocation_kind)
    VALUES ('a', '${room}', ${department ? `'${department}'` : 'NULL'}, '${date}', '${part}', '${kind}')`;
  let started = false;
  try {
    const init = run('initdb', ['-D', cluster, '-A', 'trust', '-U', 'allocation_test_owner', '--no-locale']);
    assert.equal(init.status, 0, init.stderr);
    const start = run('pg_ctl', ['-D', cluster, '-l', join(directory, 'server.log'), '-o', `-k ${directory} -p 55586 -c listen_addresses=''`, '-w', 'start']);
    assert.equal(start.status, 0, start.stderr);
    started = true;
    query(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
        $$ SELECT current_setting('request.jwt.claims', true)::jsonb $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE public.hospitals (id text PRIMARY KEY);
      CREATE TABLE public.operating_rooms (
        id text PRIMARY KEY, hospital_id text NOT NULL REFERENCES hospitals(id), department text
      );
      CREATE TABLE public.departments (
        id text PRIMARY KEY, hospital_id text NOT NULL REFERENCES hospitals(id),
        name text, description text, is_active boolean, accent_color text,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.sub_departments (id text PRIMARY KEY, department_id text REFERENCES departments(id));
      CREATE PUBLICATION supabase_realtime;
      INSERT INTO public.hospitals VALUES ('a'), ('b');
      INSERT INTO public.operating_rooms (id,hospital_id) VALUES ('room-a','a'), ('room-a2','a'), ('room-b','b');
      INSERT INTO public.departments (id,hospital_id,name) VALUES ('dept-a','a','Local A'), ('dept-b','b','Local B');
    `);
    for (const path of [
      'scripts/14-add-room-specialty-allocations.sql',
      'scripts/15-add-room-specialty-day-parts.sql',
      'scripts/16-add-room-schedule-block-types.sql',
      'supabase/migrations/20260906210211_operating_specialties_management.sql',
      'supabase/migrations/20260906212300_operating_specialties_fk_indexes.sql',
    ]) query(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'));

    await t.test('baseline: foreign department blocks victim deletion despite zero visible usage', () => {
      query(as('authenticated', `${insert('room-a', 'dept-b')};`));
      assert.equal(value(as('authenticated', "SELECT count(*) FROM room_specialty_allocations WHERE hospital_id='b' AND department_id='dept-b';", 'b')), '0');
      query("DELETE FROM departments WHERE id='dept-b' AND hospital_id='b';", '23503');
      // The room reference is an independent bypass of the same invariant.
      query(as('authenticated', `${insert('room-b', 'dept-a', '2026-10-23')};`));
    });

    await t.test('dirty-data preflight refuses migration atomically and preserves schedules', () => {
      const before = value('SELECT jsonb_agg(a ORDER BY id) FROM room_specialty_allocations a;');
      const result = query(migration, '23503');
      assert.match(result.stderr, /Allocation tenant integrity: 2 inconsistent rows/);
      assert.match(result.stderr, /Review and repair/);
      assert.equal(value('SELECT jsonb_agg(a ORDER BY id) FROM room_specialty_allocations a;'), before);
      assert.equal(value("SELECT count(*) FROM pg_constraint WHERE conname='departments_id_hospital_key';"), '0');
      assert.equal(value("SELECT has_table_privilege('authenticated', 'room_specialty_allocations', 'INSERT');"), 't');
      // These are deliberately malicious synthetic fixtures; no repair is inferred.
      query('DELETE FROM room_specialty_allocations;');
    });

    // Install against clean data and prove that existing legitimate rows survive.
    query(`${insert('room-a', 'dept-a')};`);
    const legitimateBefore = value('SELECT jsonb_agg(a ORDER BY id) FROM room_specialty_allocations a;');
    query(migration);
    assert.equal(value('SELECT jsonb_agg(a ORDER BY id) FROM room_specialty_allocations a;'), legitimateBefore);

    await t.test('authenticated reads stay tenant-scoped; all direct mutations are denied', () => {
      assert.equal(value(as('authenticated', 'SELECT count(*) FROM room_specialty_allocations;')), '1');
      assert.equal(value(as('authenticated', 'SELECT count(*) FROM room_specialty_allocations;', 'b')), '0');
      query(as('anon', 'SELECT * FROM room_specialty_allocations;'), '42501');
      for (const role of ['anon', 'authenticated']) {
        for (const statement of [
          `${insert('room-a', 'dept-b', '2026-10-24')};`,
          "UPDATE room_specialty_allocations SET department_id='dept-b' WHERE hospital_id='a';",
          "DELETE FROM room_specialty_allocations WHERE hospital_id='a';",
          `${insert('room-a', 'dept-b')} ON CONFLICT (hospital_id,operating_room_id,allocation_date,day_part) DO UPDATE SET department_id=EXCLUDED.department_id;`,
        ]) query(as(role, statement), '42501');
      }
      assert.equal(value("SELECT has_any_column_privilege('authenticated','room_specialty_allocations','INSERT') OR has_any_column_privilege('authenticated','room_specialty_allocations','UPDATE') OR has_table_privilege('authenticated','room_specialty_allocations','DELETE');"), 'f');
    });

    await t.test('composite keys reject foreign inserts, updates, upserts and tenant reassignment even for service role', () => {
      for (const statement of [
        `${insert('room-a', 'dept-b', '2026-10-24')};`,
        `${insert('room-b', 'dept-a', '2026-10-24')};`,
        "UPDATE room_specialty_allocations SET department_id='dept-b' WHERE hospital_id='a';",
        "UPDATE room_specialty_allocations SET operating_room_id='room-b' WHERE hospital_id='a';",
        "UPDATE room_specialty_allocations SET hospital_id='b' WHERE hospital_id='a';",
        `${insert('room-a', 'dept-b')} ON CONFLICT (hospital_id,operating_room_id,allocation_date,day_part) DO UPDATE SET department_id=EXCLUDED.department_id;`,
        `${insert('room-a', null, '2026-10-22', 'AM', 'CLOSED')} ON CONFLICT (hospital_id,operating_room_id,allocation_date,day_part) DO UPDATE SET operating_room_id='room-b';`,
      ]) query(as('service_role', statement), '23503');
      query("UPDATE departments SET hospital_id='b' WHERE id='dept-a';", '23503');
      query("UPDATE operating_rooms SET hospital_id='b' WHERE id='room-a';", '23503');
      query(as('service_role', `${insert('missing-room', 'dept-a', '2026-10-24')};`), '23503');
      query(as('service_role', `${insert('room-a', 'missing-department', '2026-10-24')};`), '23503');
      assert.equal(value('SELECT jsonb_agg(a ORDER BY id) FROM room_specialty_allocations a;'), legitimateBefore);
      query(as('service_role', "DELETE FROM departments WHERE id='dept-b' AND hospital_id='b';"));
      assert.equal(value("SELECT count(*) FROM departments WHERE id='dept-b';"), '0');
    });

    await t.test('service API writes preserve all kinds, AM/PM, upsert, delete and FK actions', () => {
      query(as('service_role', `${insert('room-a', null, '2026-10-22', 'PM', 'CLOSED')};`));
      query(as('service_role', `${insert('room-a2', null, '2026-10-22', 'AM', 'SERVICE')};`));
      query(as('service_role', `${insert('room-a', 'dept-a', '2026-10-22', 'PM')} ON CONFLICT (hospital_id,operating_room_id,allocation_date,day_part) DO UPDATE SET department_id=EXCLUDED.department_id, allocation_kind=EXCLUDED.allocation_kind;`));
      assert.equal(value("SELECT count(*) FROM room_specialty_allocations WHERE allocation_kind='SPECIALTY' AND operating_room_id='room-a';"), '2');
      query(as('service_role', `${insert('room-a', 'dept-a')};`), '23505');
      query(as('service_role', `${insert('room-a', null, '2026-10-25')};`), '23514');
      query(as('service_role', `${insert('room-a', 'dept-a', '2026-10-25', 'AM', 'SERVICE')};`), '23514');
      query(as('service_role', `${insert('room-a', null, '2026-10-25', 'AM', 'CLOSED')};`));
      query(as('service_role', "DELETE FROM room_specialty_allocations WHERE allocation_date='2026-10-25';"));
      query(as('service_role', "DELETE FROM departments WHERE id='dept-a';"), '23503');
      query('GRANT SELECT, DELETE ON operating_rooms TO service_role;');
      query(as('service_role', "DELETE FROM operating_rooms WHERE id='room-a';"));
      assert.equal(value("SELECT count(*) FROM room_specialty_allocations WHERE operating_room_id='room-a';"), '0');
      assert.equal(value("SELECT count(*) FROM room_specialty_allocations WHERE operating_room_id='room-a2' AND allocation_kind='SERVICE';"), '1');
      query(as('service_role', "DELETE FROM departments WHERE id='dept-a';"));
    });
  } finally {
    if (started) run('pg_ctl', ['-D', cluster, '-m', 'immediate', '-w', 'stop']);
    rmSync(directory, { recursive: true, force: true });
  }
});
