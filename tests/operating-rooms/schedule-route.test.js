import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function loadModule(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected import: ${name}`);
    return imports[name];
  }, exports);
  return exports;
}

const scheduleModule = loadModule('../../lib/weekly-schedule.ts');
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const validSchedule = () => Object.fromEntries(dayKeys.map((day, index) => [day, {
  enabled: index < 5, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30, breakMinutes: 30,
}]));

class TestResponse extends Response {
  static json(value, options) {
    return new TestResponse(JSON.stringify(value), {
      ...options, headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Execute the actual route and validator. Supabase and authorization are local
// test doubles: no credentials, network requests or production mutations occur.
function harness({ hospitalStatus, submoduleStatus, csrfStatus, dbError, dbThrow, missing = false } = {}) {
  const calls = [];
  const rows = [
    { id: 'room-11', hospital_id: 'hospital-a', name: 'PCHO sál č. 2', department: 'Chirurgie', weekly_schedule: validSchedule() },
    { id: 'room-11', hospital_id: 'hospital-b', name: 'Jiný sál', department: 'Jiná nemocnice', weekly_schedule: validSchedule() },
  ];
  let databaseCalls = 0;
  const access = { hospitalId: 'hospital-a' };
  const route = loadModule('../../app/api/admin/operating-rooms/route.ts', {
    'next/server': { NextResponse: TestResponse },
    '@/lib/weekly-schedule': scheduleModule,
    '@/lib/auth/csrf': {
      assertSameOrigin: request => {
        calls.push(['csrf', request]);
        return csrfStatus ? TestResponse.json({ error: 'CSRF rejected' }, { status: csrfStatus }) : null;
      },
    },
    '@/lib/hospital/access': {
      requireHospitalAccess: async (request, options) => {
        calls.push(['authorize', options]);
        return hospitalStatus ? TestResponse.json({ error: 'Hospital denied' }, { status: hospitalStatus }) : access;
      },
    },
    '@/lib/hospital/submodule-access': {
      requireSubmoduleAccess: async (receivedAccess, key) => {
        assert.equal(receivedAccess, access);
        calls.push(['submodule', key]);
        return submoduleStatus ? TestResponse.json({ error: 'Submodule denied' }, { status: submoduleStatus }) : null;
      },
    },
    '@/lib/supabase-server': {
      getSupabaseAdmin: () => {
        databaseCalls += 1;
        if (dbThrow) throw new Error('Private connection details');
        return {
          from: table => {
            assert.equal(table, 'operating_rooms');
            const filters = [];
            let update;
            let insert;
            const query = {
              update: value => { update = value; calls.push(['update', value]); return query; },
              insert: value => { insert = value; calls.push(['insert', value]); return query; },
              eq: (key, value) => { filters.push([key, value]); calls.push(['eq', key, value]); return query; },
              select: value => { calls.push(['select', value]); return query; },
              maybeSingle: async () => {
                calls.push(['maybeSingle']);
                if (dbError) return { data: null, error: dbError };
                const row = missing ? undefined : rows.find(candidate => filters.every(([key, value]) => candidate[key] === value));
                if (!row) return { data: null, error: null };
                Object.assign(row, structuredClone(update));
                return { data: { id: row.id, weekly_schedule: row.weekly_schedule }, error: null };
              },
              single: async () => ({ data: dbError ? null : { id: insert.id }, error: dbError ?? null }),
            };
            return query;
          },
        };
      },
    },
  });
  return {
    calls, rows, databaseCalls: () => databaseCalls,
    async send(method, body, { malformed = false } = {}) {
      return route[method]({ json: async () => {
        if (malformed) throw new SyntaxError('Invalid JSON');
        return structuredClone(body);
      } });
    },
  };
}

test('PATCH persists the editor numeric schedule, without changing room identity or another hospital', async () => {
  const app = harness();
  const schedule = validSchedule();
  schedule.monday = { enabled: true, startHour: 8, startMinute: 15, endHour: 17, endMinute: 45, breakMinutes: 0 };
  const otherHospital = structuredClone(app.rows[1]);
  const response = await app.send('PATCH', { id: 'room-11', weekly_schedule: schedule });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, room: { id: 'room-11', weekly_schedule: schedule } });
  assert.deepEqual(app.rows[0].weekly_schedule, schedule);
  assert.equal(app.rows[0].name, 'PCHO sál č. 2');
  assert.equal(app.rows[0].department, 'Chirurgie');
  assert.deepEqual(app.rows[1], otherHospital);
  assert.equal(app.databaseCalls(), 1);
  assert.deepEqual(app.calls.filter(([name]) => name === 'eq'), [['eq', 'id', 'room-11'], ['eq', 'hospital_id', 'hospital-a']]);
  const update = app.calls.find(([name]) => name === 'update')[1];
  assert.deepEqual(Object.keys(update).sort(), ['updated_at', 'weekly_schedule']);
  assert.equal(Number.isNaN(Date.parse(update.updated_at)), false);
});

test('POST compatibility uses identical schedule validation and never falls through to create', async () => {
  const app = harness();
  const response = await app.send('POST', { id: 'room-11', weekly_schedule: validSchedule() });
  assert.equal(response.status, 200);
  assert.equal(app.calls.some(([name]) => name === 'insert'), false);
  const invalid = harness();
  assert.equal((await invalid.send('POST', { id: 'room-11', name: 'Valid name', sort_order: 0, weekly_schedule: null })).status, 400);
  assert.equal(invalid.databaseCalls(), 0);
});

test('ordinary name updates and room creation remain supported', async () => {
  const app = harness();
  const beforeSchedule = structuredClone(app.rows[0].weekly_schedule);
  assert.equal((await app.send('PATCH', { id: 'room-11', name: ' PCHO   nový ', department: ' Chirurgie ' })).status, 200);
  assert.equal(app.rows[0].name, 'PCHO nový');
  assert.deepEqual(app.rows[0].weekly_schedule, beforeSchedule);
  const create = harness();
  assert.equal((await create.send('POST', { id: 'room-new', name: 'Nový sál', department: 'Chirurgie', sort_order: 2 })).status, 201);
  assert.equal(create.calls.find(([name]) => name === 'insert')[1].hospital_id, 'hospital-a');
});

test('authorization and CSRF failures preserve their status and never call the database', async () => {
  for (const method of ['PATCH', 'POST']) {
    for (const [options, status] of [
      [{ hospitalStatus: 401 }, 401], [{ hospitalStatus: 403 }, 403],
      [{ submoduleStatus: 403 }, 403], [{ csrfStatus: 403 }, 403],
    ]) {
      const app = harness(options);
      assert.equal((await app.send(method, { id: 'room-11', weekly_schedule: validSchedule() })).status, status);
      assert.equal(app.databaseCalls(), 0);
      assert.deepEqual(app.calls[0], ['authorize', { adminOnly: true }]);
      if (!options.hospitalStatus) assert.deepEqual(app.calls[1], ['submodule', 'settings.rooms']);
    }
  }
});

test('missing tenant-scoped row is 404, query errors and thrown connections are safe 500 responses', async () => {
  for (const method of ['PATCH', 'POST']) {
    for (const [options, status] of [
      [{ missing: true }, 404], [{ dbError: { message: 'Private SQL detail' } }, 500], [{ dbThrow: true }, 500],
    ]) {
      const app = harness(options);
      const original = structuredClone(app.rows);
      const response = await app.send(method, { id: 'room-11', weekly_schedule: validSchedule() });
      assert.equal(response.status, status);
      const body = await response.json();
      assert.equal(body.success, undefined);
      assert.doesNotMatch(body.error, /Private/);
      assert.deepEqual(app.rows, original);
    }
  }
});

test('malformed and non-object request bodies, missing IDs and null schedules are rejected before database access', async () => {
  for (const method of ['PATCH', 'POST']) {
    for (const body of [null, [], false, 123, 'text', {}, { id: '../room-11', weekly_schedule: validSchedule() }, { id: 'room-11', weekly_schedule: null }]) {
      const app = harness();
      assert.equal((await app.send(method, body)).status, 400, `${method}: ${JSON.stringify(body)}`);
      assert.equal(app.databaseCalls(), 0);
    }
    const app = harness();
    assert.equal((await app.send(method, undefined, { malformed: true })).status, 400);
    assert.equal(app.databaseCalls(), 0);
  }
});

test('validator rejects missing days, string-format legacy schedules and invalid numeric fields', async () => {
  const badSchedules = [null, [], 'schedule', {},
    Object.fromEntries(dayKeys.map(day => [day, { enabled: true, start: '07:00', end: '15:30' }])),
  ];
  for (const dayKey of dayKeys) {
    const schedule = validSchedule();
    delete schedule[dayKey];
    badSchedules.push(schedule);
  }
  for (const [key, values] of Object.entries({
    enabled: ['true', 1, null],
    startHour: [-1, 24, 7.5, '7', null, NaN, Infinity],
    endHour: [-1, 24, 16.5, '16', null],
    startMinute: [-1, 60, 0.5, '0', null],
    endMinute: [-1, 60, 0.5, '0', null],
    breakMinutes: [-1, 481, 0.5, '30', null],
  })) {
    for (const value of values) {
      const schedule = validSchedule();
      schedule.monday[key] = value;
      badSchedules.push(schedule);
    }
  }
  for (const schedule of badSchedules) {
    assert.equal(scheduleModule.parseWeeklySchedule(schedule).schedule, null);
    for (const method of ['PATCH', 'POST']) {
      const app = harness();
      const response = await app.send(method, { id: 'room-11', weekly_schedule: schedule });
      assert.equal(response.status, 400);
      assert.equal(app.databaseCalls(), 0);
    }
  }
});

test('enabled hours require a later same-day end, while disabled days remain disabled', () => {
  for (const [startHour, startMinute, endHour, endMinute] of [[7, 0, 7, 0], [15, 0, 7, 0], [7, 30, 7, 29]]) {
    const schedule = validSchedule();
    Object.assign(schedule.monday, { startHour, startMinute, endHour, endMinute });
    assert.match(scheduleModule.parseWeeklySchedule(schedule).error, /konec provozu/);
    schedule.monday.enabled = false;
    const parsed = scheduleModule.parseWeeklySchedule(schedule);
    assert.equal(parsed.error, null);
    assert.equal(parsed.schedule.monday.enabled, false);
  }
});

test('valid boundary values, explicit zero break and omitted break are preserved without mutation', () => {
  const schedule = validSchedule();
  Object.assign(schedule.monday, { startHour: 0, startMinute: 0, endHour: 23, endMinute: 59, breakMinutes: 480 });
  schedule.tuesday.breakMinutes = 0;
  delete schedule.wednesday.breakMinutes;
  schedule.thursday.enabled = false;
  const original = structuredClone(schedule);
  const parsed = scheduleModule.parseWeeklySchedule(schedule);
  assert.equal(parsed.error, null);
  assert.deepEqual(parsed.schedule, schedule);
  assert.deepEqual(schedule, original);
  assert.notEqual(parsed.schedule, schedule);
  assert.notEqual(parsed.schedule.monday, schedule.monday);
  assert.equal(Object.hasOwn(parsed.schedule.wednesday, 'breakMinutes'), false);
  assert.equal(parsed.schedule.thursday.enabled, false);
});

test('arbitrary schedule JSON properties are not persisted', async () => {
  const app = harness();
  const schedule = validSchedule();
  schedule.extra = 'not a day';
  schedule.monday.hospital_id = 'hospital-b';
  const response = await app.send('PATCH', { id: 'room-11', weekly_schedule: schedule, name: 'Overwrite', hospital_id: 'hospital-b' });
  assert.equal(response.status, 200);
  assert.deepEqual(app.rows[0].weekly_schedule, validSchedule());
  assert.equal(app.rows[0].name, 'PCHO sál č. 2');
  assert.equal(app.rows[0].hospital_id, 'hospital-a');
});
