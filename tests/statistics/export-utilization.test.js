import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/statistics-export-utilization.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
new Function('require', 'exports', 'module', compiled)(name => {
  assert.fail(`Pure historical utilization unexpectedly imports ${name}`);
}, module.exports, module);
const { buildStatisticsExportUtilization } = module.exports;
const hours = (overrides = {}) => ({ enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 0, ...overrides });
const room = (id = 'a', weeklySchedule = { monday: hours(), tuesday: hours() }) => ({ id, name: `Sál ${id}`, weeklySchedule });
const range = (days = ['2026-07-06'], start = '2026-07-06T05:00:00Z', end = '2026-07-07T05:00:00Z') => ({
  days, start: new Date(start), end: new Date(end),
});
const event = (id, type, timestamp, overrides = {}) => ({
  id, event_type: type, timestamp, created_at: timestamp, operating_room_id: 'a',
  metadata: {}, duration_seconds: null, step_index: null, step_name: null, ...overrides,
});
const cycle = (id, start, end, roomId = 'a') => [
  event(`${id}-start`, 'operation_start', start, { operating_room_id: roomId }),
  event(`${id}-end`, 'operation_end', end, { operating_room_id: roomId }),
];
const build = (overrides = {}) => buildStatisticsExportUtilization({
  rooms: [room()], history: [], range: range(), generatedAt: new Date('2026-07-08T18:00:00Z'), ...overrides,
});
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} != ${expected}`);
const fullSchedule = (overrides = {}) => ({
  monday: hours(), tuesday: hours(), wednesday: hours(), thursday: hours(), friday: hours(),
  saturday: hours({ enabled: false }), sunday: hours({ enabled: false }), ...overrides,
});

test('utilization uses recorded complete cycles and explicitly configured breaks in both numerator and capacity', () => {
  const history = cycle('half', '2026-07-06T06:00:00Z', '2026-07-06T10:00:00Z');
  const result = build({ rooms: [room('a', { monday: hours({ breakMinutes: 30 }) })], history });
  assert.equal(result.rooms[0].capacitySeconds, 7.5 * 3600);
  assert.equal(result.rooms[0].activeSeconds, 3.75 * 3600);
  assert.equal(result.rooms[0].utilizationPercent, 50);
  assert.equal(result.rooms[0].outsideWorkingSeconds, 0);
  assert.equal(result.scheduleBasis, 'current-weekly-schedule');
  assert.equal(build({ history }).totalCapacitySeconds, 8 * 3600, 'No default break is invented when it was not configured');
  assert.deepEqual(result.measuredDays, ['2026-07-06']);
});

test('all planned rooms including zero-evidence rooms contribute to a weighted overall percentage', () => {
  const result = build({ rooms: [room(), room('b', { monday: hours({ endHour: 11 }) })],
    history: cycle('half', '2026-07-06T06:00:00Z', '2026-07-06T10:00:00Z') });
  assert.equal(result.rooms.length, 2);
  assert.equal(result.rooms[1].activeSeconds, 0);
  assert.equal(result.rooms[1].utilizationPercent, 0);
  assert.equal(result.totalCapacitySeconds, 12 * 3600);
  assert.equal(result.totalActiveSeconds, 4 * 3600);
  closeTo(result.utilizationPercent, 100 / 3);
  closeTo(result.daily[0].utilizationPercent, 100 / 3);
});

test('capacity and recorded activity sum across operational days without averaging daily percentages', () => {
  const result = build({ range: range(['2026-07-06', '2026-07-07'], '2026-07-06T05:00:00Z', '2026-07-08T05:00:00Z'),
    rooms: [room('a', { monday: hours({ breakMinutes: 30 }), tuesday: hours({ breakMinutes: 30 }) })],
    history: [...cycle('mon', '2026-07-06T06:00:00Z', '2026-07-06T10:00:00Z'),
      ...cycle('tue', '2026-07-07T06:00:00Z', '2026-07-07T08:00:00Z')] });
  assert.equal(result.totalCapacitySeconds, 15 * 3600);
  assert.equal(result.totalActiveSeconds, 5.625 * 3600);
  assert.equal(result.utilizationPercent, 37.5);
  assert.deepEqual(result.daily.map(day => day.utilizationPercent), [50, 25]);
});

test('a closed cycle crossing both range boundaries still contributes its measured scheduled overlap', () => {
  const result = build({ history: cycle('cross', '2026-07-06T04:00:00Z', '2026-07-07T06:00:00Z') });
  assert.equal(result.totalActiveSeconds, 8 * 3600);
  assert.equal(result.utilizationPercent, 100);
  assert.equal(result.rooms[0].outsideWorkingSeconds, 16 * 3600);
});

test('overlapping archives and repeated source records never count the same occupied instant twice', () => {
  const first = cycle('one', '2026-07-06T06:00:00Z', '2026-07-06T08:00:00Z');
  const archive = event('archive', 'operation_completed', '2026-07-06T09:00:00Z', {
    metadata: { startedAt: '2026-07-06T07:00:00Z', endedAt: '2026-07-06T09:00:00Z' },
  });
  const duplicate = event('same-cycle', 'operation_completed', '2026-07-06T08:00:00Z', {
    duration_seconds: 7200, metadata: { startedAt: '2026-07-06T06:00:00Z', endedAt: '2026-07-06T08:00:00Z' },
  });
  const result = build({ history: [...first, archive, duplicate, ...first, archive] });
  assert.equal(result.totalActiveSeconds, 3 * 3600);
  assert.equal(result.utilizationPercent, 37.5);
});

test('measured completed-cycle duration is valid archival evidence but a lone phase-duration operation_end is not', () => {
  const completed = event('archive', 'operation_completed', '2026-07-06T08:00:00Z', { duration_seconds: 1800 });
  const orphan = event('orphan', 'operation_end', '2026-07-06T10:00:00Z', { duration_seconds: 3600 });
  assert.equal(build({ history: [completed, orphan] }).totalActiveSeconds, 1800);
});

test('a delayed archival write uses its recorded end rather than the later import timestamp', () => {
  const result = build({ history: [event('start', 'operation_start', '2026-07-06T06:00:00Z'),
    event('archive', 'operation_completed', '2026-07-06T12:00:00Z', {
      metadata: { startedAt: '2026-07-06T06:00:00Z', endedAt: '2026-07-06T07:00:00Z' },
    })] });
  assert.equal(result.totalActiveSeconds, 3600);
  const fallback = build({ history: [event('bad-archive-dates', 'operation_completed', '2026-07-06T08:00:00Z', {
    duration_seconds: 1800, metadata: { startedAt: 'invalid', endedAt: 'invalid' },
  })] });
  assert.equal(fallback.totalActiveSeconds, 1800, 'A valid measured complete-cycle duration remains usable');
});

test('live room state, daily completed-operation snapshots and unclosed starts are never historical evidence', () => {
  const decorated = { ...room(), currentStepIndex: 3, operationStartedAt: '2026-07-06T05:00:00Z',
    phaseStartedAt: '2026-07-06T05:00:00Z', isEmergency: true, currentPatient: { name: 'PRIVATE PATIENT' },
    completedOperations: [{ startedAt: '2026-07-06T05:00:00Z', endedAt: '2026-07-06T13:00:00Z' }] };
  const result = build({ rooms: [decorated], history: [event('open', 'operation_start', '2026-07-06T05:00:00Z')] });
  assert.equal(result.totalActiveSeconds, 0);
  assert.equal(result.totalOutsideWorkingSeconds, 0);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|isEmergency|currentStep|completedOperations/);
});

test('an older archived completion cannot incorrectly close an unrelated pending start', () => {
  const result = build({ history: [event('open', 'operation_start', '2026-07-06T07:00:00Z'),
    event('older-archive', 'operation_completed', '2026-07-06T09:00:00Z', {
      metadata: { startedAt: '2026-07-06T05:00:00Z', endedAt: '2026-07-06T06:00:00Z' },
    })] });
  assert.equal(result.totalActiveSeconds, 3600);
});

test('synthetic events and seed phases cannot inflate closed historical cycle evidence', () => {
  const seeded = cycle('seed', '2026-07-06T05:00:00Z', '2026-07-06T13:00:00Z')
    .map(row => ({ ...row, metadata: { synthetic: true } }));
  const stale = [event('start', 'operation_start', '2026-07-06T06:00:00Z'),
    event('seed-phase', 'step_change', '2026-07-06T07:00:00Z', { metadata: { source: 'app_review_seed' }, duration_seconds: 99999 }),
    event('end', 'operation_end', '2026-07-06T08:00:00Z')];
  assert.equal(build({ history: [...seeded, ...stale] }).totalActiveSeconds, 0);
});

test('disabled, invalid, missing and fully consumed plans have no percentage rather than a fabricated zero', () => {
  const variants = [undefined, { monday: hours({ enabled: false }) }, { monday: hours({ endHour: 4 }) },
    { monday: hours({ startMinute: NaN }) }, { monday: hours({ breakMinutes: 99999 }) }];
  for (const weeklySchedule of variants) {
    const result = build({ rooms: [{ id: 'a', name: 'Sál A', weeklySchedule }],
      history: cycle('actual', '2026-07-06T06:00:00Z', '2026-07-06T07:00:00Z') });
    assert.equal(result.rooms[0].capacitySeconds, 0);
    assert.equal(result.rooms[0].activeSeconds, 0);
    assert.equal(result.rooms[0].outsideWorkingSeconds, 3600);
    assert.equal(result.rooms[0].utilizationPercent, null);
    assert.equal(result.utilizationPercent, null);
  }
});

test('archived rooms without a current name retain measured activity without exposing UUIDs as display labels', () => {
  const id = 'aa34f4f1-879b-40fb-a7ca-c424c11111aa';
  const result = build({ rooms: [], history: cycle('unknown', '2026-07-06T06:00:00Z', '2026-07-06T07:00:00Z', id) });
  assert.equal(result.rooms[0].roomId, id);
  assert.equal(result.rooms[0].roomName, 'Archivovaný sál — název nedostupný');
  assert.equal(result.rooms[0].outsideWorkingSeconds, 3600);
  assert.equal(result.rooms[0].utilizationPercent, null);
});

test('current-day capacity covers the full plan but future operational days and unrecorded remaining time do not inflate statistics', () => {
  const result = build({ range: range(['2026-07-06', '2026-07-07'], '2026-07-06T05:00:00Z', '2026-07-08T05:00:00Z'),
    generatedAt: new Date('2026-07-06T10:00:00Z'),
    history: [...cycle('done', '2026-07-06T06:00:00Z', '2026-07-06T08:00:00Z'),
      ...cycle('future', '2026-07-07T06:00:00Z', '2026-07-07T08:00:00Z')] });
  assert.deepEqual(result.measuredDays, ['2026-07-06']);
  assert.equal(result.totalCapacitySeconds, 8 * 3600);
  assert.equal(result.totalActiveSeconds, 2 * 3600);
  assert.equal(result.utilizationPercent, 25);
  const beforeSeven = build({ generatedAt: new Date('2026-07-06T04:59:00Z') });
  assert.deepEqual(beforeSeven.measuredDays, []);
  assert.equal(beforeSeven.utilizationPercent, null);
});

test('Prague operational DST days retain 07→07 and use real 23-hour or 25-hour occupied durations', () => {
  const fullDay = hours({ startHour: 0, endHour: 24 });
  for (const [date, start, end, nextDate, expectedHours] of [
    ['2026-03-28', '2026-03-28T06:00:00Z', '2026-03-29T05:00:00Z', '2026-03-29', 23],
    ['2026-10-24', '2026-10-24T05:00:00Z', '2026-10-25T06:00:00Z', '2026-10-25', 25],
  ]) {
    const result = build({ range: range([date], start, end), rooms: [room('a', { saturday: fullDay, sunday: fullDay })],
      history: cycle('dst', start, end), generatedAt: new Date(`${nextDate}T18:00:00Z`) });
    assert.equal(result.totalCapacitySeconds, expectedHours * 3600);
    assert.equal(result.totalActiveSeconds, expectedHours * 3600);
    assert.equal(result.utilizationPercent, 100);
  }
});

test('a next-calendar-day pre-07 schedule segment belongs to the preceding operational day', () => {
  const result = build({ rooms: [room('a', { tuesday: hours({ startHour: 0, endHour: 6 }) })],
    history: cycle('night', '2026-07-06T22:00:00Z', '2026-07-07T04:00:00Z') });
  assert.equal(result.totalCapacitySeconds, 6 * 3600);
  assert.equal(result.totalActiveSeconds, 6 * 3600);
  assert.equal(result.utilizationPercent, 100);
});

test('invalid periods fail explicitly instead of producing plausible-looking statistics', () => {
  assert.throws(() => build({ generatedAt: new Date(NaN) }), RangeError);
  assert.throws(() => build({ range: { ...range(), end: new Date('2026-01-01') } }), RangeError);
});

test('Prague capacity and intervals are independent of the host timezone', () => {
  const childSource = `${compiled}\nconst result = module.exports.buildStatisticsExportUtilization({
    rooms: [{id:'a', name:'Sál A', weeklySchedule:{saturday:{enabled:true,startHour:0,startMinute:0,endHour:24,endMinute:0},sunday:{enabled:true,startHour:0,startMinute:0,endHour:24,endMinute:0}}}],
    history: [{id:'s',event_type:'operation_start',operating_room_id:'a',timestamp:'2026-03-28T06:00:00Z',metadata:{}}, {id:'e',event_type:'operation_end',operating_room_id:'a',timestamp:'2026-03-29T05:00:00Z',metadata:{}}],
    range:{days:['2026-03-28'],start:new Date('2026-03-28T06:00:00Z'),end:new Date('2026-03-29T05:00:00Z')}, generatedAt:new Date('2026-03-30T10:00:00Z')
  }); process.stdout.write(JSON.stringify(result));`;
  const results = ['UTC', 'America/Los_Angeles', 'Asia/Tokyo'].map(timezone =>
    execFileSync(process.execPath, ['--input-type=commonjs', '-e', childSource], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' }));
  assert.equal(results[0], results[1]);
  assert.equal(results[1], results[2]);
});

test('ÚPS separates actual activity outside the gross roster, with distinct share and elapsed utilization', () => {
  const result = build({ rooms: [room('a', fullSchedule({ monday: hours({ breakMinutes: 30 }) }))],
    history: cycle('cross-shift', '2026-07-06T10:00:00Z', '2026-07-06T15:00:00Z') });
  const actual = result.rooms[0];
  assert.equal(actual.recordedSeconds, 5 * 3600);
  assert.equal(actual.scheduledRecordedSeconds, 3 * 3600);
  assert.equal(actual.activeSeconds, 3 * 3600 * 7.5 / 8);
  assert.equal(actual.upsSeconds, 2 * 3600);
  assert.equal(actual.upsAvailableSeconds, 16 * 3600);
  assert.equal(actual.upsUtilizationPercent, 12.5);
  assert.equal(actual.upsSharePercent, 40);
  assert.equal(actual.upsBasisComplete, true);
  assert.equal(result.totalScheduledRecordedSeconds, 3 * 3600);
  assert.equal(result.totalRecordedSeconds, 5 * 3600);
  assert.equal(result.totalUpsSeconds, 2 * 3600);
  assert.equal(result.totalUpsAvailableSeconds, 16 * 3600);
  assert.equal(result.upsSharePercent, 40);
  assert.equal(result.upsUtilizationPercent, 12.5);
  assert.equal(result.unknownScheduleRecordedSeconds, 0);
  assert.equal(result.unknownScheduleRoomCount, 0);
  assert.equal(result.daily[0].upsSeconds, 2 * 3600);
  assert.equal(result.daily[0].upsSharePercent, 40);
});

test('configured breaks, including a fully consumed net plan, are never classified as ÚPS', () => {
  for (const breakMinutes of [30, 480, 99999]) {
    const result = build({ rooms: [room('a', fullSchedule({ monday: hours({ breakMinutes }) }))],
      history: cycle('during-plan', '2026-07-06T06:00:00Z', '2026-07-06T10:00:00Z') });
    assert.equal(result.rooms[0].scheduledRecordedSeconds, 4 * 3600);
    assert.equal(result.rooms[0].upsSeconds, 0);
    assert.equal(result.rooms[0].upsAvailableSeconds, 16 * 3600);
    assert.equal(result.rooms[0].upsSharePercent, 0);
    assert.equal(result.rooms[0].upsUtilizationPercent, 0);
  }
});

test('explicitly disabled weekend days make the full measured day ÚPS, not an unknown plan', () => {
  const result = build({ rooms: [room('a', fullSchedule())],
    range: range(['2026-07-11'], '2026-07-11T05:00:00Z', '2026-07-12T05:00:00Z'),
    generatedAt: new Date('2026-07-13T08:00:00Z'),
    history: cycle('weekend', '2026-07-11T10:00:00Z', '2026-07-11T12:00:00Z') });
  assert.equal(result.rooms[0].capacitySeconds, 0);
  assert.equal(result.rooms[0].utilizationPercent, null);
  assert.equal(result.rooms[0].scheduledRecordedSeconds, 0);
  assert.equal(result.rooms[0].upsSeconds, 2 * 3600);
  assert.equal(result.rooms[0].upsAvailableSeconds, 24 * 3600);
  assert.equal(result.rooms[0].upsSharePercent, 100);
  closeTo(result.rooms[0].upsUtilizationPercent, 100 / 12);
});

test('ÚPS uses real Prague DST day duration rather than assuming 24 hours', () => {
  for (const [date, start, end, nextDate, expectedHours] of [
    ['2026-03-28', '2026-03-28T06:00:00Z', '2026-03-29T05:00:00Z', '2026-03-29', 23],
    ['2026-10-24', '2026-10-24T05:00:00Z', '2026-10-25T06:00:00Z', '2026-10-25', 25],
  ]) {
    const result = build({ rooms: [room('a', fullSchedule())], range: range([date], start, end),
      history: cycle('dst-ups', start, end), generatedAt: new Date(`${nextDate}T18:00:00Z`) });
    assert.equal(result.rooms[0].upsAvailableSeconds, expectedHours * 3600);
    assert.equal(result.rooms[0].upsSeconds, expectedHours * 3600);
    assert.equal(result.rooms[0].upsUtilizationPercent, 100);
    assert.equal(result.rooms[0].upsSharePercent, 100);
  }
});

test('the next calendar day pre-07 roster reduces ÚPS availability in the preceding operational day', () => {
  const result = build({ rooms: [room('a', fullSchedule({ monday: hours({ enabled: false }),
    tuesday: hours({ startHour: 0, endHour: 6 }) }))],
  history: cycle('night', '2026-07-06T21:00:00Z', '2026-07-07T05:00:00Z') });
  assert.equal(result.rooms[0].recordedSeconds, 8 * 3600);
  assert.equal(result.rooms[0].scheduledRecordedSeconds, 6 * 3600);
  assert.equal(result.rooms[0].upsSeconds, 2 * 3600);
  assert.equal(result.rooms[0].upsAvailableSeconds, 18 * 3600);
  closeTo(result.rooms[0].upsUtilizationPercent, 100 / 9);
  assert.equal(result.rooms[0].upsSharePercent, 25);
});

test('merged overlapping evidence does not duplicate either scheduled or ÚPS activity', () => {
  const first = cycle('cross', '2026-07-06T12:00:00Z', '2026-07-06T15:00:00Z');
  const overlapping = event('archive-overlap', 'operation_completed', '2026-07-06T16:00:00Z', {
    metadata: { startedAt: '2026-07-06T14:00:00Z', endedAt: '2026-07-06T16:00:00Z' },
  });
  const result = build({ rooms: [room('a', fullSchedule())], history: [...first, overlapping, ...first] });
  assert.equal(result.rooms[0].recordedSeconds, 4 * 3600);
  assert.equal(result.rooms[0].scheduledRecordedSeconds, 3600);
  assert.equal(result.rooms[0].upsSeconds, 3 * 3600);
  assert.equal(result.rooms[0].upsSharePercent, 75);
});

test('partial current-day ÚPS capacity stops at generation time and excludes future or unclosed cycles', () => {
  const result = build({ rooms: [room('a', fullSchedule())], generatedAt: new Date('2026-07-06T16:00:00Z'),
    history: [...cycle('done', '2026-07-06T14:00:00Z', '2026-07-06T15:00:00Z'),
      ...cycle('future', '2026-07-06T17:00:00Z', '2026-07-06T18:00:00Z'),
      event('open', 'operation_start', '2026-07-06T15:30:00Z')] });
  assert.equal(result.rooms[0].capacitySeconds, 8 * 3600, 'Ordinary full-plan capacity remains unchanged');
  assert.equal(result.rooms[0].upsAvailableSeconds, 3 * 3600, 'Only 15→18 Prague has elapsed outside the roster');
  assert.equal(result.rooms[0].upsSeconds, 3600);
  closeTo(result.rooms[0].upsUtilizationPercent, 100 / 3);
  const duringPlan = build({ rooms: [room('a', fullSchedule())], generatedAt: new Date('2026-07-06T10:00:00Z'),
    history: cycle('morning', '2026-07-06T06:00:00Z', '2026-07-06T07:00:00Z') });
  assert.equal(duringPlan.rooms[0].upsAvailableSeconds, 0);
  assert.equal(duringPlan.rooms[0].upsSeconds, 0);
  assert.equal(duringPlan.rooms[0].upsUtilizationPercent, null);
  assert.equal(duringPlan.rooms[0].upsSharePercent, 0);
});

test('missing or invalid observed weekday plans leave ÚPS unknown rather than falsely counting activity', () => {
  const history = cycle('actual', '2026-07-06T14:00:00Z', '2026-07-06T15:00:00Z');
  for (const weeklySchedule of [undefined, {}, { monday: hours() },
    fullSchedule({ monday: hours({ endHour: 4 }) }),
    fullSchedule({ monday: hours({ enabled: 'yes' }) }),
    fullSchedule({ monday: hours({ breakMinutes: NaN }) })]) {
    const result = build({ rooms: [{ id: 'a', name: 'Sál A', weeklySchedule }], history });
    assert.equal(result.rooms[0].upsSeconds, null);
    assert.equal(result.rooms[0].upsAvailableSeconds, null);
    assert.equal(result.rooms[0].upsSharePercent, null);
    assert.equal(result.rooms[0].upsUtilizationPercent, null);
    assert.equal(result.rooms[0].unknownScheduleRecordedSeconds, 3600);
    assert.equal(result.totalUpsSeconds, 0);
    assert.equal(result.totalUpsAvailableSeconds, 0);
    assert.equal(result.upsUtilizationPercent, null);
    assert.equal(result.upsSharePercent, null);
    assert.equal(result.unknownScheduleRecordedSeconds, 3600);
    assert.equal(result.unknownScheduleRoomCount, 1);
    assert.equal(result.upsBasisComplete, false);
    assert.equal(result.daily[0].unknownScheduleRecordedSeconds, 3600);
  }
});

test('a future missing weekday is not required before that calendar day has begun', () => {
  const result = build({ rooms: [room('a', { monday: hours() })], generatedAt: new Date('2026-07-06T16:00:00Z'),
    history: cycle('actual', '2026-07-06T14:00:00Z', '2026-07-06T15:00:00Z') });
  assert.equal(result.rooms[0].upsBasisComplete, true);
  assert.equal(result.rooms[0].upsSeconds, 3600);
  assert.equal(result.rooms[0].upsAvailableSeconds, 3 * 3600);
});

test('overall ÚPS share and utilization are weighted by actual time and elapsed capacity, never average percentages', () => {
  const result = build({ rooms: [room('a', fullSchedule()), room('b', fullSchedule({ monday: hours({ endHour: 11 }) }))],
    history: [...cycle('a', '2026-07-06T13:00:00Z', '2026-07-06T17:00:00Z', 'a'),
      ...cycle('b', '2026-07-06T08:00:00Z', '2026-07-06T10:00:00Z', 'b')] });
  assert.equal(result.totalRecordedSeconds, 6 * 3600);
  assert.equal(result.totalScheduledRecordedSeconds, 3600);
  assert.equal(result.totalUpsSeconds, 5 * 3600);
  assert.equal(result.totalUpsAvailableSeconds, 36 * 3600);
  closeTo(result.upsSharePercent, 500 / 6);
  closeTo(result.upsUtilizationPercent, 500 / 36);
  assert.notEqual(result.upsUtilizationPercent,
    result.rooms.reduce((sum, entry) => sum + entry.upsUtilizationPercent, 0) / 2);
});

test('unknown room activity cannot turn a known-subset ÚPS share into a misleading overall 100 percent', () => {
  const result = build({ rooms: [room('a', fullSchedule())], history: [
    ...cycle('known', '2026-07-06T14:00:00Z', '2026-07-06T15:00:00Z', 'a'),
    ...cycle('unknown', '2026-07-06T14:00:00Z', '2026-07-06T16:00:00Z', 'archived'),
  ] });
  assert.equal(result.totalUpsSeconds, 3600);
  assert.equal(result.totalRecordedSeconds, 3 * 3600);
  assert.equal(result.unknownScheduleRecordedSeconds, 2 * 3600);
  assert.equal(result.upsSharePercent, null);
  assert.equal(result.daily[0].upsSharePercent, null);
  assert.equal(result.rooms.find(entry => entry.roomId === 'a').upsSharePercent, 100);
  assert.equal(result.rooms.find(entry => entry.roomId === 'archived').upsSeconds, null);
  assert.equal(result.upsUtilizationPercent, 6.25, 'Confirmed-cohort utilization remains available with its coverage flag');
  assert.equal(result.upsBasisComplete, false);
});

test('a narrowed historical interval measures only its own elapsed ÚPS availability', () => {
  const result = build({ rooms: [room('a', fullSchedule())],
    range: range(['2026-07-06'], '2026-07-06T15:00:00Z', '2026-07-06T17:00:00Z'),
    history: cycle('clip', '2026-07-06T14:00:00Z', '2026-07-06T16:00:00Z') });
  assert.equal(result.rooms[0].upsAvailableSeconds, 2 * 3600);
  assert.equal(result.rooms[0].upsSeconds, 3600);
  assert.equal(result.rooms[0].upsUtilizationPercent, 50);
  assert.equal(result.rooms[0].recordedSeconds, 3600);
});
