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

test('workflow-color repair preserves the complete start transaction and its restricted grants', () => {
  const original = readFileSync(new URL('../../supabase/migrations/20261008193311_acute_request_cycle_links.sql', import.meta.url), 'utf8');
  const correction = readFileSync(new URL('../../supabase/migrations/20261008195723_fix_acute_cycle_workflow_color.sql', import.meta.url), 'utf8');
  const routine = original.match(/CREATE FUNCTION public\.start_acute_request_cycle\([\s\S]*?(?=\n-- All overlapping)/)[0].trim();
  const expected = routine.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION')
    .replace('SELECT coalesce(accent_color, color), name INTO v_color, v_name', 'SELECT accent_color, name INTO v_color, v_name');
  const actual = correction.slice(correction.indexOf('CREATE OR REPLACE FUNCTION'), correction.lastIndexOf('COMMIT;')).trim();
  assert.equal(actual, expected);
});

test('real PostgreSQL cycle link: atomic ready-only start, idempotency, immutable snapshot, final event and tenant-safe API evidence', { skip: !available, timeout: 90_000 }, async () => {
  // Synthetic isolated cluster; no environment credentials or clinical data.
  const directory = mkdtempSync(join(tmpdir(), 'orm-acute-cycles-postgres-'));
  const cluster = join(directory, 'cluster');
  const run = (name, args, options = {}) => spawnSync(join(PG_BIN, name), args, { encoding: 'utf8', ...options });
  const connection = ['-h', directory, '-p', '55586', '-U', 'acute_test_owner', '-d', 'postgres', '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1'];
  const query = (sql, success = true) => { const result = run('psql', connection, { input: sql }); if (success) assert.equal(result.status, 0, result.stderr); return result; };
  const scalar = sql => query(sql).stdout.trim();
  let started = false;
  try {
    const init = run('initdb', ['-D', cluster, '-A', 'trust', '-U', 'acute_test_owner', '--no-locale']);
    assert.equal(init.status, 0, init.stderr);
    const server = run('pg_ctl', ['-D', cluster, '-l', join(directory, 'server.log'), '-o', `-k ${directory} -p 55586 -c listen_addresses=''`, '-w', 'start']);
    assert.equal(server.status, 0, server.stderr); started = true;
    query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE TABLE public.hospitals (id text PRIMARY KEY);
      CREATE TABLE public.app_users (id uuid PRIMARY KEY, name text, role text, is_active boolean);
      CREATE TABLE public.hospital_user_memberships (hospital_id text, user_id text, PRIMARY KEY(hospital_id,user_id));
      CREATE TABLE public.app_modules (id text, hospital_id text, name text, description text, is_enabled boolean,
        icon text, accent_color text, sort_order integer, allowed_roles text[], PRIMARY KEY(id,hospital_id));
      CREATE TABLE public.operating_rooms (id text PRIMARY KEY, hospital_id text NOT NULL REFERENCES public.hospitals(id),
        current_step_index integer NOT NULL DEFAULT 0, state_revision bigint NOT NULL DEFAULT 0, updated_at timestamptz,
        phase_started_at timestamptz, operation_started_at timestamptz, status_history jsonb NOT NULL DEFAULT '[]',
        completed_operations jsonb NOT NULL DEFAULT '[]', is_paused boolean NOT NULL DEFAULT false, is_locked boolean NOT NULL DEFAULT false);
      CREATE TABLE public.workflow_statuses (id text, hospital_id text, name text, accent_color text,
        is_active boolean, is_special boolean, sort_order integer);
      CREATE TABLE public.room_status_history (id uuid PRIMARY KEY, hospital_id text NOT NULL, operating_room_id text NOT NULL,
        event_type text NOT NULL, step_index integer, step_name text, duration_seconds integer, "timestamp" timestamptz, metadata jsonb);
      INSERT INTO public.hospitals VALUES ('a'),('b');
      INSERT INTO public.app_users VALUES (${quote(actor)}::uuid,'Synthetic clinician','aro',true);
      INSERT INTO public.hospital_user_memberships VALUES ('a',${quote(actor)});
      INSERT INTO public.operating_rooms (id,hospital_id) VALUES ('room-a','a'),('room-a2','a'),('room-b','b');
      INSERT INTO public.app_modules (id,hospital_id,is_enabled,allowed_roles) VALUES ('timeline','a',true,ARRAY['aro']),('timeline','b',true,ARRAY['aro']),
        ('dashboard','a',true,ARRAY['aro']),('dashboard','b',true,ARRAY['aro']);
      INSERT INTO public.workflow_statuses SELECT 's-'||n,'a','Phase '||n,'#abcdef',true,false,n FROM generate_series(0,3) n;
      GRANT SELECT ON public.hospitals, public.workflow_statuses, public.room_status_history TO service_role;
      GRANT SELECT, UPDATE ON public.app_users, public.app_modules, public.hospital_user_memberships, public.operating_rooms TO service_role;
      GRANT SELECT, UPDATE ON public.operating_rooms TO authenticated;
      CREATE FUNCTION public.bump_operating_room_state_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        NEW.state_revision := OLD.state_revision+1; NEW.updated_at := clock_timestamp(); RETURN NEW; END; $$;
      CREATE TRIGGER operating_rooms_bump_state_revision BEFORE UPDATE ON public.operating_rooms FOR EACH ROW EXECUTE FUNCTION public.bump_operating_room_state_revision();
    `);
    query(readFileSync(new URL('../../scripts/18-atomic-operation-cycle-history.sql', import.meta.url), 'utf8'));
    // Model Supabase's actual default public-table grants, not stock PostgreSQL.
    query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role');
    query(readFileSync(new URL('../../supabase/migrations/20261007213448_acute_surgery_requests.sql', import.meta.url), 'utf8'));
    query(readFileSync(new URL('../../supabase/migrations/20261008193311_acute_request_cycle_links.sql', import.meta.url), 'utf8'));
    query("UPDATE public.app_modules SET is_enabled=true WHERE id='acute-requests'");
    assert.equal(scalar("SELECT has_table_privilege('authenticated','public.acute_request_cycle_links','SELECT') OR has_table_privilege('anon','public.acute_request_cycle_links','INSERT') OR has_table_privilege('service_role','public.acute_request_cycle_links','UPDATE') OR has_table_privilege('service_role','public.acute_request_cycle_links','DELETE')"), 'f');
    assert.equal(scalar("SELECT has_table_privilege('service_role','public.acute_request_cycle_links','SELECT') AND has_table_privilege('service_role','public.acute_request_cycle_links','INSERT')"),'t');
    // Also exercise the corrective migration against already-granted live shape.
    query('GRANT ALL ON public.acute_request_cycle_links TO service_role');
    assert.equal(scalar("SELECT has_table_privilege('service_role','public.acute_request_cycle_links','UPDATE') AND has_table_privilege('service_role','public.acute_request_cycle_links','DELETE')"),'t');
    query(readFileSync(new URL('../../supabase/migrations/20261008194515_restrict_acute_cycle_link_grants.sql', import.meta.url), 'utf8'));
    assert.equal(scalar("SELECT has_table_privilege('service_role','public.acute_request_cycle_links','UPDATE') OR has_table_privilege('service_role','public.acute_request_cycle_links','DELETE')"),'f');
    assert.equal(scalar("SELECT has_table_privilege('service_role','public.acute_request_cycle_links','SELECT') AND has_table_privilege('service_role','public.acute_request_cycle_links','INSERT')"),'t');
    assert.equal(scalar("SELECT has_function_privilege('authenticated','public.start_acute_request_cycle(text,uuid,uuid,text,bigint)','EXECUTE') OR has_function_privilege('service_role','acute_cycle_internal.finish_room_cycle()','EXECUTE')"), 'f');
    const create = (name, room = 'room-a', hospital = 'a') => scalar(`INSERT INTO public.acute_requests (hospital_id,procedure_name,department,urgency,estimated_duration_minutes,proposed_room_id,queue_position,created_by)
      VALUES (${quote(hospital)},${quote(name)},'Synthetic department','urgent',120,${quote(room)},
        (SELECT count(*)+1 FROM public.acute_requests WHERE hospital_id=${quote(hospital)} AND status IN ('pending','acknowledged')),${quote(actor)}::uuid) RETURNING id`);
    const id = create('Synthetic APPE'); const second = create('Synthetic second');
    query(`INSERT INTO public.acute_request_events (hospital_id,request_id,action,actor_id,actor_name,new_position) VALUES ('a',${quote(id)}::uuid,'create',${quote(actor)}::uuid,'Synthetic clinician',7)`);
    const rpc = (request, revision = 0, room = 'room-a', hospital = 'a') => `SET ROLE service_role; SELECT public.start_acute_request_cycle(${quote(hospital)},${quote(actor)}::uuid,${quote(request)}::uuid,${quote(room)},${revision});`;
    const mutate = (...args) => JSON.parse(query(rpc(...args)).stdout);
    for (const sql of [rpc(id,1), rpc(id,0,'room-a2'), rpc(id,0,'room-b','a')]) assert.notEqual(query(sql, false).status, 0);
    assert.equal(scalar('SELECT count(*) FROM public.room_status_history'), '0');
    query("UPDATE public.app_modules SET is_enabled=false WHERE id='acute-requests' AND hospital_id='a'");
    assert.match(query(rpc(id), false).stderr, /ACUTE_CYCLE_FORBIDDEN/);
    query("UPDATE public.app_modules SET is_enabled=true WHERE id='acute-requests' AND hospital_id='a'");
    query("UPDATE public.app_users SET is_active=false");
    assert.match(query(rpc(id), false).stderr,/ACUTE_CYCLE_FORBIDDEN/);
    query("UPDATE public.app_users SET is_active=true");
    query("DELETE FROM public.hospital_user_memberships WHERE hospital_id='a'");
    assert.match(query(rpc(id),false).stderr,/ACUTE_CYCLE_FORBIDDEN/);
    query(`INSERT INTO public.hospital_user_memberships VALUES ('a',${quote(actor)})`);
    query("UPDATE public.app_modules SET is_enabled=false WHERE id='dashboard' AND hospital_id='a'");
    assert.match(query(rpc(id),false).stderr,/ACUTE_CYCLE_FORBIDDEN/);
    query("UPDATE public.app_modules SET is_enabled=true WHERE id='dashboard' AND hospital_id='a'");
    // Reproduce the reported live failure on the real workflow schema: the
    // installed old routine referred to a color column that never existed.
    const missingColor = query(rpc(id), false);
    assert.match(missingColor.stderr, /column "color" does not exist/);
    assert.equal(scalar("SELECT current_step_index||':'||state_revision FROM public.operating_rooms WHERE id='room-a'"), '0:0');
    assert.equal(scalar('SELECT count(*) FROM public.acute_request_cycle_links'), '0');
    query(readFileSync(new URL('../../supabase/migrations/20261008195723_fix_acute_cycle_workflow_color.sql', import.meta.url), 'utf8'));
    const bound = mutate(id);
    assert.equal(bound.room.current_step_index, 1); assert.equal(bound.room.state_revision, 1);
    assert.equal(bound.link.request_id, id); assert.equal(bound.link.submission_position, 7);
    assert.equal(bound.room.status_history[0].color, '#abcdef');
    assert.equal(Date.parse(bound.link.started_at)-Date.parse(bound.link.operation_started_at),1);
    assert.equal(scalar(`SELECT event_type FROM public.room_status_history WHERE id=${quote(bound.link.start_event_id)}::uuid`),'operation_start');
    assert.equal(mutate(id).link.start_event_id, bound.link.start_event_id); // Response loss retry cannot start a second cycle.
    assert.equal(scalar("SELECT count(*) FROM public.room_status_history WHERE event_type='operation_start'"),'1');
    assert.match(query(rpc(second,1), false).stderr, /ACUTE_CYCLE_CONFLICT/);
    query(`UPDATE public.acute_requests SET procedure_name='Changed draft',urgency='emergent' WHERE id=${quote(id)}::uuid`);
    assert.equal(scalar(`SELECT procedure_name||':'||urgency FROM public.acute_request_cycle_links WHERE request_id=${quote(id)}::uuid`),'Synthetic APPE:urgent');
    query("SET ROLE authenticated; UPDATE public.operating_rooms SET current_step_index=2,phase_started_at=clock_timestamp() WHERE id='room-a';");
    assert.equal(scalar(`SELECT ended_at IS NULL FROM public.acute_request_cycle_links WHERE request_id=${quote(id)}::uuid`),'t');
    query("SET ROLE authenticated; UPDATE public.operating_rooms SET current_step_index=3,phase_started_at=clock_timestamp() WHERE id='room-a';");
    query("SET ROLE authenticated; UPDATE public.operating_rooms SET current_step_index=0,phase_started_at=clock_timestamp(),operation_started_at=NULL,status_history='[]' WHERE id='room-a';");
    const finished = JSON.parse(scalar(`SELECT to_jsonb(link) FROM public.acute_request_cycle_links link WHERE request_id=${quote(id)}::uuid`));
    assert.ok(finished.ended_at); assert.ok(finished.end_event_id);
    assert.equal(scalar(`SELECT event_type FROM public.room_status_history WHERE id=${quote(finished.end_event_id)}::uuid`),'operation_end');
    assert.equal(scalar(`SELECT status||':'||queue_position FROM public.acute_requests WHERE id=${quote(id)}::uuid`),'pending:1'); // Queue settlement remains explicit.
    // PostgreSQL CHECK accepts UNKNOWN, so both halves of a final boundary must
    // be explicitly nonnull. Test genuinely unique event IDs, not a uniqueness
    // failure that could disguise an incomplete end's acceptance.
    const malformed = create('Synthetic malformed end','room-a2');
    const malformedStart = scalar("INSERT INTO public.room_status_history (id,hospital_id,operating_room_id,event_type,\"timestamp\") VALUES (gen_random_uuid(),'a','room-a2','operation_start','2000-01-01') RETURNING id");
    const malformedEnd = scalar("INSERT INTO public.room_status_history (id,hospital_id,operating_room_id,event_type,\"timestamp\") VALUES (gen_random_uuid(),'a','room-a2','operation_end','2000-01-02') RETURNING id");
    const malformedSQL = (event, time) => `INSERT INTO public.acute_request_cycle_links
      (request_id,hospital_id,operating_room_id,operation_started_at,started_at,start_event_id,start_state_revision,end_event_id,ended_at,procedure_name,urgency,bound_by,bound_by_name)
      VALUES (${quote(malformed)}::uuid,'a','room-a2','2000-01-01','2000-01-01',${quote(malformedStart)}::uuid,1,${event},${time},'Synthetic malformed end','urgent',${quote(actor)}::uuid,'Synthetic clinician')`;
    assert.match(query(malformedSQL(`${quote(malformedEnd)}::uuid`,'NULL'),false).stderr,/violates check constraint/);
    assert.match(query(malformedSQL('NULL',quote('2000-01-02')),false).stderr,/violates check constraint/);
    assert.equal(scalar(`SELECT count(*) FROM public.acute_request_cycle_links WHERE request_id=${quote(malformed)}::uuid`),'0');
    assert.match(query(rpc(id,4),false).stderr,/ACUTE_CYCLE_CONFLICT/);
    assert.match(query(`UPDATE public.acute_request_cycle_links SET procedure_name='tamper' WHERE request_id=${quote(id)}::uuid`,false).stderr,/immutable/);
    assert.match(query('DELETE FROM public.acute_request_cycle_links',false).stderr,/immutable/);
    assert.equal(JSON.parse(scalar("SET ROLE service_role; SELECT public.get_acute_cycle_links('b','2026-01-01','2027-01-01')")).length,0);
    assert.equal(JSON.parse(scalar("SET ROLE service_role; SELECT public.get_acute_cycle_links('a','1900-01-01','1901-01-01')")).length,0);
    assert.equal(JSON.parse(scalar("SET ROLE service_role; SELECT public.get_acute_cycle_links('a','2000-01-01','2100-01-01')")).length,1);
    // Missing canonical history is a rollback, never a success with an unmarked cycle.
    query('ALTER TABLE public.operating_rooms DISABLE TRIGGER operating_rooms_record_step_transition');
    assert.match(query(rpc(second,4),false).stderr,/ACUTE_CYCLE_HISTORY_REQUIRED/);
    assert.equal(scalar("SELECT current_step_index||':'||state_revision FROM public.operating_rooms WHERE id='room-a'"),'0:4');
    query('ALTER TABLE public.operating_rooms ENABLE TRIGGER operating_rooms_record_step_transition');
    // Two different requests race for one ready room; one immutable cycle wins.
    const third = create('Synthetic third');
    const concurrent = request => new Promise(resolve => {
      const child = spawn(join(PG_BIN,'psql'),connection,{stdio:['pipe','pipe','pipe']}); let stdout='',stderr='';
      child.stdout.on('data',chunk=>{stdout+=chunk;}); child.stderr.on('data',chunk=>{stderr+=chunk;});
      child.on('exit',status=>resolve({status,stdout,stderr})); child.stdin.end(rpc(request,4));
    });
    const raced = await Promise.all([concurrent(second), concurrent(third)]);
    assert.equal(raced.filter(result=>result.status===0).length,1);
    assert.match(raced.find(result=>result.status!==0).stderr,/ACUTE_CYCLE_CONFLICT/);
    assert.equal(scalar("SELECT count(*) FROM public.acute_request_cycle_links WHERE ended_at IS NULL"),'1');
    assert.equal(JSON.parse(scalar("SET ROLE service_role; SELECT public.get_acute_cycle_links('a','1900-01-01','1901-01-01')")).length,1); // Active evidence survives window changes.
    // A database historical marker never depends on the queue's 200-record cap.
    query(`WITH requests AS (
      INSERT INTO public.acute_requests (hospital_id,procedure_name,department,urgency,estimated_duration_minutes,status,queue_position,created_by)
      SELECT 'b','Synthetic history '||n,'Synthetic department','expedited',30,'completed',NULL,${quote(actor)}::uuid FROM generate_series(1,205) n RETURNING id
    ), starts AS (
      INSERT INTO public.room_status_history (id,hospital_id,operating_room_id,event_type,"timestamp")
      SELECT id,'b','room-b','operation_start','2000-01-01'::timestamptz FROM requests RETURNING id
    ), ends AS (
      INSERT INTO public.room_status_history (id,hospital_id,operating_room_id,event_type,"timestamp")
      SELECT gen_random_uuid(),'b','room-b','operation_end','2000-01-02'::timestamptz FROM requests RETURNING id
    ), pairs AS (SELECT request.id,row_number() OVER(ORDER BY request.id) rn FROM requests request), end_pairs AS (SELECT id,row_number() OVER(ORDER BY id) rn FROM ends)
    INSERT INTO public.acute_request_cycle_links (request_id,hospital_id,operating_room_id,operation_started_at,started_at,start_event_id,start_state_revision,end_event_id,ended_at,
      procedure_name,urgency,bound_by,bound_by_name)
    SELECT pair.id,'b','room-b','2000-01-01'::timestamptz+pair.rn*interval '1 second','2000-01-01'::timestamptz,pair.id,1,end_pair.id,'2000-01-02'::timestamptz,
      'Synthetic history','expedited',${quote(actor)}::uuid,'Synthetic clinician' FROM pairs pair JOIN end_pairs end_pair USING(rn)`);
    assert.equal(JSON.parse(scalar("SET ROLE service_role; SELECT public.get_acute_cycle_links('b','1999-01-01','2001-01-01')")).length,205);
    assert.equal(JSON.parse(scalar("SET ROLE service_role; SELECT public.get_acute_cycle_links('a','1999-01-01','2001-01-01')")).length,1); // Only a's live link, not b's histories.
  } finally {
    if(started) run('pg_ctl',['-D',cluster,'-m','fast','-w','stop']);
    rmSync(directory,{recursive:true,force:true});
  }
});
