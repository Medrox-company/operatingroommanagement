import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

process.env.TZ = 'Europe/Prague';

const source = readFileSync(new URL('../../lib/timeline-operational-warnings.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'timeline-operational-warnings.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = { exports: {} };
new Function('require', 'exports', 'module', outputText)(
  name => { throw new Error(`Pure warning helper must not load ${name}`); }, loaded.exports, loaded,
);
const { deriveTimelineOperationalWarnings, describeTimelineOperationalWarning } = loaded.exports;

const at = (hour, minute = 0, day = 28) => new Date(2026, 8, day, hour, minute).getTime();
const statuses = [
  { id: 'sal_pripraven', name: 'Sál připraven' },
  { id: 'prijezd_na_sal', name: 'Příjezd na sál' },
  { id: 'chirurgicky_vykon', name: 'Chirurgický výkon' },
  { id: 'ukonceni_vykonu', name: 'Ukončení výkonu' },
  { id: 'ukonceni_anestezie', name: 'Ukončení anestezie' },
  { id: 'anestezie', name: 'Anestezie' },
  { id: 'uklid_salu', name: 'Úklid sálu' },
  { id: 'sal_pripraven_po_uklidu', name: 'Sál připraven po úklidu' },
  { id: 'prijezd_do_traktu', name: 'Příjezd pacienta do operačního traktu' },
];
const staffed = { doctor: { name: 'Lékař' }, nurse: { name: 'Sestra' } };
const room = (extra = {}) => ({
  id: 'sal-1', currentStepIndex: 2, operationStartedAt: new Date(at(9)).toISOString(),
  estimatedEndTime: new Date(at(10)).toISOString(), staff: staffed, ...extra,
});
const plan = (id, time, duration, extra = {}) => ({
  id, operating_room_id: 'sal-1', scheduled_date: '2026-09-28', scheduled_time: time,
  duration_minutes: duration, status: 'PLANNED', ...extra,
});
const warnings = (rooms, plans, nowMs = at(11), configured = statuses) =>
  deriveTimelineOperationalWarnings(rooms, plans, nowMs, configured);
const kinds = (items) => (items || []).map(item => item.type);

test('overdue begins exactly five minutes after a valid estimate for a running clinical phase', () => {
  assert.deepEqual(kinds(warnings([room()], [], at(10, 4) + 59_999).get('sal-1')), []);
  const item = warnings([room()], [], at(10, 5)).get('sal-1')?.[0];
  assert.equal(item.type, 'overdue');
  assert.equal(item.minutesOverdue, 5);
  assert.equal(item.estimatedEndMs, at(10));

  for (const invalid of [undefined, 'invalid', new Date(at(8)).toISOString()]) {
    assert.deepEqual(kinds(warnings([room({ estimatedEndTime: invalid })], [], at(11)).get('sal-1')), []);
  }
  assert.deepEqual(kinds(warnings([room({ operationStartedAt: undefined })], []).get('sal-1')), []);
  assert.deepEqual(kinds(warnings([room({ operationStartedAt: new Date(at(12)).toISOString() })], []).get('sal-1')), []);
});

test('only occupied clinical rooms report missing doctor or nurse', () => {
  const unstaffed = room({ staff: { doctor: { name: '  ' }, nurse: { name: null }, anesthesiologist: { name: 'Alias' } } });
  assert.deepEqual(warnings([unstaffed], [], at(9, 30)).get('sal-1'), [
    { type: 'missing_staff', roomId: 'sal-1', missingRoles: ['doctor', 'nurse'] },
  ]);
  const suppressed = [
    { currentStepIndex: 0 }, { currentStepIndex: 6 }, { currentStepIndex: 7 },
    { currentStepIndex: 8 }, { isLocked: true }, { isPaused: true },
    { currentStepIndex: 2, operationStartedAt: undefined },
  ];
  for (const extra of suppressed) {
    assert.deepEqual(kinds(warnings([room({ ...unstaffed, ...extra })], []).get('sal-1')), [], JSON.stringify(extra));
  }
  assert.deepEqual(kinds(warnings([room({ ...unstaffed, currentStepIndex: 2 })], [], at(11), [
    statuses[0], statuses[1], { id: 'custom_ready', name: 'Sál připraven' },
  ]).get('sal-1')), []);
});

test('only complete planned intervals in the same room create positive overlaps', () => {
  const plans = [
    plan('a', '09:00:00', 60),
    plan('b', '09:30:00', 60),
    plan('adjacent', '10:30:00', 30),
    plan('other-room', '09:15:00', 60, { operating_room_id: 'sal-2' }),
    plan('cancelled', '09:15:00', 60, { status: 'CANCELLED' }),
    plan('unknown-status', '09:15:00', 60, { status: null }),
    plan('no-end', '09:15:00', null),
    plan('negative', '09:15:00', -15),
    plan('bad-time', '25:00:00', 60),
    plan('bad-date', '09:15:00', 60, { scheduled_date: '2026-02-30' }),
    plan('unknown-room', '09:15:00', 60, { operating_room_id: 'unknown' }),
  ];
  const byRoom = warnings([room({ currentStepIndex: 0 }), room({ id: 'sal-2', currentStepIndex: 0 })], plans);
  const collisions = byRoom.get('sal-1');
  assert.equal(collisions?.length, 1);
  assert.deepEqual(collisions[0], {
    type: 'schedule_collision', roomId: 'sal-1', scheduleIds: ['a', 'b'],
    overlapStartMs: at(9, 30), overlapEndMs: at(10), overlapMinutes: 30,
  });
  assert.equal(byRoom.get('sal-2'), undefined);
});

test('planned intervals crossing midnight use local calendar dates and half-open boundaries', () => {
  const byRoom = warnings([room({ currentStepIndex: 7 })], [
    plan('overnight', '23:30', 90),
    plan('midnight', '00:30', 30, { scheduled_date: '2026-09-29' }),
    plan('next', '01:00', 20, { scheduled_date: '2026-09-29' }),
  ]);
  const collisions = byRoom.get('sal-1');
  assert.deepEqual(collisions?.map(item => item.scheduleIds), [['overnight', 'midnight']]);
  assert.equal(collisions[0].overlapStartMs, at(0, 30, 29));
  assert.equal(collisions[0].overlapEndMs, at(1, 0, 29));
  assert.equal(collisions[0].overlapMinutes, 30);
  assert.equal(warnings([room({ currentStepIndex: 0 })], null).size, 0);
});

test('timeline shows only plan collisions intersecting its operational day', () => {
  const plans = [
    plan('day-a', '16:00', 60),
    plan('day-b', '16:30', 60),
    plan('tomorrow-a', '10:00', 60, { scheduled_date: '2026-09-29' }),
    plan('tomorrow-b', '10:30', 60, { scheduled_date: '2026-09-29' }),
  ];
  const byRoom = deriveTimelineOperationalWarnings(
    [room({ currentStepIndex: 0 })], plans, at(17), statuses,
    { startMs: at(7), endMs: at(7, 0, 29) },
  );
  assert.deepEqual(byRoom.get('sal-1')?.map(item => item.scheduleIds), [['day-a', 'day-b']]);
});

test('warning descriptions remain readable without patient details', () => {
  assert.equal(describeTimelineOperationalWarning({ type: 'overdue', roomId: 'sal-1', estimatedEndMs: at(10), minutesOverdue: 8 }),
    'Odhad konce překročen o 8 min');
  assert.equal(describeTimelineOperationalWarning({ type: 'missing_staff', roomId: 'sal-1', missingRoles: ['doctor', 'nurse'] }),
    'Chybí ARO lékař a ARO sestra');
  assert.match(describeTimelineOperationalWarning({ type: 'schedule_collision', roomId: 'sal-1', scheduleIds: ['a', 'b'], overlapStartMs: at(9, 30), overlapEndMs: at(10), overlapMinutes: 30 }),
    /Kolize plánovaných výkonů 09:30–10:00/);
});
