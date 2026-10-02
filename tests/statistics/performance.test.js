import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/statistics-performance.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { buildMonthlyPerformance, PERFORMANCE_METRICS, calculateTurnoverWorkingSeconds } = exports;
const schedule = () => Object.fromEntries(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .map(day => [day, { enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30, breakMinutes: 0 }]),
);
const room = id => ({ id, name: id, weeklySchedule: schedule() });
const NOW = new Date('2026-09-29T12:00:00Z');
const OFF = { anesthesiaStartEnabled: false, anesthesiaEndEnabled: false };
const ON = { anesthesiaStartEnabled: true, anesthesiaEndEnabled: true };
const event = (id, roomId, type, timestamp, name = null, duration = null, stepIndex = null, metadata = {}) => ({
  id, operating_room_id: roomId, event_type: type, timestamp, step_name: name,
  duration_seconds: duration, step_index: stepIndex, metadata,
});
const iso = (base, minutes) => new Date(Date.parse(base) + minutes * 60000).toISOString();
const at = (report, key, roomId) => (roomId ? report.byRoom[roomId] : report.months).find(month => month.key === key);
function cycle(id = 'c', roomId = 'a', base = '2026-09-04T08:00:00Z', anesthesia = true) {
  const phases = anesthesia ? [
    ['Příjezd na sál', 10], ['Začátek anestezie', 20], ['Chirurgický výkon', 60],
    ['Ukončení  výkonu', 10], ['Ukončení anestezie', 15], ['Odjezd ze sálu', 5], ['Úklid sálu', 20],
  ] : [
    ['Příjezd na sál', 30], ['Chirurgický výkon', 60], ['Ukončení výkonu', 25], ['Odjezd ze sálu', 5], ['Úklid sálu', 20],
  ];
  let elapsed = 0;
  const rows = [event(`${id}-start`, roomId, 'operation_start', base, 'Příjezd na sál', null, 1)];
  phases.forEach(([name, minutes], index) => {
    elapsed += minutes;
    rows.push(event(`${id}-${index}`, roomId, 'step_change', iso(base, elapsed), name, minutes * 60,
      index === phases.length - 1 ? 0 : index + 2, { previous_step: name, previous_step_index: index + 1 }));
  });
  rows.push(event(`${id}-end`, roomId, 'operation_end', new Date(Date.parse(iso(base, elapsed)) + 1).toISOString(), 'Operation End'));
  return rows;
}
function clean(id, roomId, end, seconds, reset = true) {
  return event(id, roomId, 'step_change', end, 'Úklid sálu', seconds, reset ? 0 : 7);
}

test('five metrics, twelve Prague calendar months, unavailable values are never zero', () => {
  const report = buildMonthlyPerformance([], [room('a')], NOW);
  assert.deepEqual(PERFORMANCE_METRICS, ['aroStart', 'surgery', 'aroEnd', 'cleanup', 'turnover']);
  assert.equal(report.months.length, 12);
  assert.equal(report.months[0].key, '2025-10');
  assert.equal(report.months.at(-1).key, '2026-09');
  assert.equal(report.byRoom.a.length, 12);
  assert.equal(report.months.at(-1).isPartial, true);
  assert.equal(report.months.at(-2).isPartial, false);
  for (const kind of PERFORMANCE_METRICS) {
    assert.equal(report.totals[kind].rawAverageMinutes, null);
    assert.equal(report.totals[kind].averageMinutes, null);
    assert.equal(report.totals[kind].coverage, null);
  }
  assert.equal(report.totals.cleanup.availability, 'no_data');
  assert.equal(report.totals.turnover.availability, 'not_recorded');
});

test('all five measured KPIs use phase START endpoints and optional anesthesia configuration', () => {
  const history = [...cycle(), event('next', 'a', 'operation_start', '2026-09-04T10:30:00Z', 'Příjezd na sál')];
  const enabled = buildMonthlyPerformance(history, [room('a')], NOW, ON);
  const disabled = buildMonthlyPerformance(history, [room('a')], NOW, OFF);
  assert.deepEqual(PERFORMANCE_METRICS.map(kind => enabled.totals[kind].rawAverageMinutes), [20, 60, 10, 20, 35]);
  assert.equal(disabled.totals.aroStart.rawAverageMinutes, 30);
  assert.equal(disabled.totals.aroEnd.rawAverageMinutes, 25);
});

test('enabled anesthesia without its recorded boundary never falls back to arrival or departure', () => {
  const report = buildMonthlyPerformance(cycle('c', 'a', '2026-09-05T08:00:00Z', false), [room('a')], NOW, ON);
  assert.equal(report.totals.aroStart.rawAverageMinutes, null);
  assert.equal(report.totals.aroEnd.rawAverageMinutes, null);
  assert.equal(report.totals.aroStart.quality.missingDuration, 1);
  assert.equal(report.totals.aroEnd.quality.missingDuration, 1);
  assert.equal(report.totals.surgery.rawAverageMinutes, 60);
});

test('calendar boundaries honor both DST transitions and endpoint month attribution', () => {
  const report = buildMonthlyPerformance([
    clean('feb', 'a', '2026-02-28T22:59:59Z', 60),
    clean('mar', 'a', '2026-02-28T23:00:00Z', 120),
    clean('apr', 'a', '2026-03-31T22:00:00Z', 180),
    clean('oct', 'a', '2026-09-30T22:00:00Z', 240),
  ], [room('a')], new Date('2026-11-15T12:00:00Z'));
  assert.equal(at(report, '2026-03').start, '2026-02-28T23:00:00.000Z');
  assert.equal(at(report, '2026-03').end, '2026-03-31T22:00:00.000Z');
  assert.equal(at(report, '2026-10').start, '2026-09-30T22:00:00.000Z');
  assert.equal(at(report, '2026-11').start, '2026-10-31T23:00:00.000Z');
  for (const key of ['2026-02', '2026-03', '2026-04', '2026-10']) assert.equal(at(report, key).cleanup.rawCount, 1);
});

test('raw means and optional >=1-minute filter keep all quality exclusions explicit', () => {
  const values = [null, 0, -5, 30, 60, 120, 600];
  const history = values.map((duration, index) => clean(`e-${index}`, 'a', `2026-09-0${index + 1}T08:00:00Z`, duration));
  const metric = buildMonthlyPerformance(history, [room('a')], NOW).totals.cleanup;
  assert.equal(metric.observed, 7);
  assert.equal(metric.rawCount, 4);
  assert.equal(metric.rawAverageMinutes, 3.375);
  assert.equal(metric.averageMinutes, 13 / 3);
  assert.equal(metric.rawMedianMinutes, 1.5);
  assert.equal(metric.count, 3);
  assert.equal(metric.medianMinutes, 2);
  assert.ok(Math.abs(metric.p90Minutes - 8.4) < 1e-9);
  assert.equal(metric.excluded, 4);
  assert.equal(metric.coverage, 3 / 7);
  assert.deepEqual(metric.quality, { missingDuration: 1, nonPositive: 2, underOneMinute: 1, invalidTimestamp: 0 });
});

test('sub-minute positive data is available in raw mode, absent only in optional filtered mode', () => {
  const metric = buildMonthlyPerformance([clean('short', 'a', '2026-09-05T08:00:00Z', 30)], [room('a')], NOW).totals.cleanup;
  assert.equal(metric.availability, 'available');
  assert.equal(metric.rawAverageMinutes, .5);
  assert.equal(metric.averageMinutes, null);
  assert.equal(metric.count, 0);
});

test('pooled means are weighted by actual samples, not averages of rooms or months', () => {
  const report = buildMonthlyPerformance([
    clean('a1', 'a', '2026-08-05T08:00:00Z', 60),
    clean('a2', 'a', '2026-09-05T09:00:00Z', 60),
    clean('b1', 'b', '2026-09-05T10:00:00Z', 600),
    clean('b1', 'b', '2026-09-05T10:00:00Z', 600),
    clean('foreign', 'foreign', '2026-09-05T10:00:00Z', 999),
  ], [room('a'), room('b')], NOW);
  assert.equal(report.totals.cleanup.rawAverageMinutes, 4);
  assert.equal(report.totals.cleanup.rawCount, 3);
  assert.equal(report.totalsByRoom.a.cleanup.rawAverageMinutes, 1);
  assert.equal(report.totalsByRoom.b.cleanup.rawAverageMinutes, 10);
  assert.equal(at(report, '2026-09').cleanup.rawAverageMinutes, 5.5);
});

test('exact duplicate IDs and derived duplicate markers with different IDs do not change samples', () => {
  const original = cycle();
  const duplicates = original.map(row => ({ ...row, id: `${row.id}-duplicate` }));
  const report = buildMonthlyPerformance([...original, ...original, ...duplicates], [room('a')], NOW, ON);
  assert.equal(report.totals.surgery.rawCount, 1);
  assert.equal(report.totals.cleanup.rawCount, 1);
  assert.equal(report.totals.aroStart.rawAverageMinutes, 20);
});

test('cleaning includes actual preparation until ready, not just cleaning phase duration', () => {
  const history = [
    event('s', 'a', 'operation_start', '2026-09-05T07:00:00Z', 'Příjezd na sál'),
    clean('c', 'a', '2026-09-05T08:20:00Z', 1200, false),
    event('p', 'a', 'step_change', '2026-09-05T08:30:00Z', 'Příprava sálu', 600, 0),
  ];
  assert.equal(buildMonthlyPerformance(history, [room('a')], NOW).totals.cleanup.rawAverageMinutes, 30);
});

test('cleaning without ready is excluded and cannot reach into another patient cycle', () => {
  const report = buildMonthlyPerformance([
    clean('c1', 'a', '2026-09-05T08:20:00Z', 1200, false),
    ...cycle('next', 'a', '2026-09-05T09:00:00Z'),
  ], [room('a')], NOW);
  assert.equal(report.totals.cleanup.observed, 2);
  assert.equal(report.totals.cleanup.rawCount, 1);
  assert.equal(report.totals.cleanup.quality.missingDuration, 1);
  assert.equal(report.totals.cleanup.rawAverageMinutes, 20);
});

test('operation_end and tract-arrival buttons cannot invent surgical end, departure or turnover', () => {
  const report = buildMonthlyPerformance([
    event('end', 'a', 'operation_end', '2026-09-05T08:00:00Z'),
    event('arr1', 'a', 'patient_arrival', '2026-09-05T08:25:00Z'),
    event('arr2', 'a', 'patient_arrived', '2026-09-05T08:30:00Z'),
    event('dep', 'a', 'patient_departure', '2026-09-05T08:35:00Z'),
    event('call', 'a', 'patient_call', '2026-09-05T08:40:00Z'),
  ], [room('a')], NOW);
  for (const kind of PERFORMANCE_METRICS) assert.equal(report.totals[kind].observed, 0);
});

test('overnight turnover books at next arrival in Prague month and never crosses rooms', () => {
  const history = [
    ...cycle('prior', 'a', '2026-08-31T11:30:00Z'), // departure15:25 Prague; nextday08:05=>5+65 working minutes
    event('next', 'a', 'operation_start', '2026-09-01T06:05:00Z', 'Příjezd na sál'),
    event('other', 'b', 'operation_start', '2026-08-31T21:25:00Z', 'Příjezd na sál'),
  ];
  const report = buildMonthlyPerformance(history, [room('a'), room('b')], NOW);
  assert.equal(at(report, '2026-08').turnover.rawCount, 0);
  assert.equal(at(report, '2026-09').turnover.rawAverageMinutes, 70);
  assert.equal(report.totalsByRoom.b.turnover.rawCount, 0);
});

test('a missing departure is reported, not replaced by completed cleaning', () => {
  const history = cycle().filter(row => row.step_name !== 'Odjezd ze sálu');
  history.push(event('next', 'a', 'operation_start', '2026-09-05T10:30:00Z', 'Příjezd na sál'));
  const metric = buildMonthlyPerformance(history, [room('a')], NOW).totals.turnover;
  assert.equal(metric.rawAverageMinutes, null);
  assert.equal(metric.quality.missingDuration, 1);
});

test('synthetic seeds are explicitly excluded while real records remain measured', () => {
  const history = [
    clean('real', 'a', '2026-09-05T08:00:00Z', 300),
    { ...clean('demo', 'a', '2026-09-05T09:00:00Z', 999), metadata: { synthetic: true } },
    { ...clean('seed', 'a', '2026-09-05T10:00:00Z', 999), metadata: { source: 'app_review_seed' } },
  ];
  const report = buildMonthlyPerformance(history, [room('a')], NOW);
  assert.equal(report.excludedSynthetic, 2);
  assert.equal(report.totals.cleanup.rawAverageMinutes, 5);
  assert.equal(report.totals.cleanup.rawCount, 1);
});

test('excluded synthetic cycles are pairing barriers, not gaps across which to measure turnover', () => {
  const history = [
    ...cycle('a', 'a', '2026-09-04T05:00:00Z'),
    ...cycle('synthetic', 'a', '2026-09-04T08:00:00Z').map(row => ({ ...row, metadata: { synthetic: true } })),
    ...cycle('c', 'a', '2026-09-04T11:00:00Z'),
  ];
  const report = buildMonthlyPerformance(history, [room('a')], NOW);
  assert.equal(report.totals.surgery.rawCount, 2);
  assert.equal(report.totals.turnover.rawCount, 0);
  assert.equal(report.totals.turnover.quality.missingDuration, 1);
});

test('a measured departure and explicitly closed cycle support turnover even without cleaning rows', () => {
  const history = [
    event('start', 'a', 'operation_start', '2026-09-04T07:00:00Z', 'Příjezd na sál'),
    event('departure', 'a', 'step_change', '2026-09-04T08:05:00Z', 'Odjezd ze sálu', 300, 7),
    event('end', 'a', 'operation_end', '2026-09-04T08:30:00Z'),
    event('next', 'a', 'operation_start', '2026-09-04T09:00:00Z', 'Příjezd na sál'),
  ];
  assert.equal(buildMonthlyPerformance(history, [room('a')], NOW).totals.turnover.rawAverageMinutes, 60);
});

test('conflicting recorded surgical-end boundary is excluded, unexplained gaps are not invented surgery', () => {
  const history = [
    event('surgery', 'a', 'step_change', '2026-09-05T09:00:00Z', 'Chirurgický výkon', 3600, 4),
    event('end', 'a', 'step_change', '2026-09-05T09:20:00Z', 'Ukončení výkonu', 600, 5),
  ];
  const metric = buildMonthlyPerformance(history, [room('a')], NOW).totals.surgery;
  assert.equal(metric.rawAverageMinutes, null);
  assert.equal(metric.quality.missingDuration, 1);
});

test('historical phase names work with arbitrary nonzero indices and repeated spaces', () => {
  const history = cycle().map(row => ({ ...row, step_index: row.step_index > 0 ? row.step_index + 30 : row.step_index }));
  const report = buildMonthlyPerformance(history, [room('a')], NOW, ON);
  assert.deepEqual(['aroStart', 'surgery', 'aroEnd', 'cleanup'].map(kind => report.totals[kind].rawAverageMinutes), [20, 60, 10, 20]);
});

test('future and invalid-timestamp measurements never contaminate an assignable month', () => {
  const report = buildMonthlyPerformance([
    clean('invalid', 'a', 'not a timestamp', 300),
    clean('future', 'a', '2026-09-30T12:00:00Z', 300),
    clean('actual', 'a', '2026-09-20T12:00:00Z', 300),
  ], [room('a')], NOW);
  assert.equal(report.unassignedInvalidTimestamp.cleanup, 1);
  assert.equal(report.totals.cleanup.rawCount, 1);
});

test('overlapping or reversed historical phases do not generate positive KPIs', () => {
  const history = cycle();
  const surgery = history.find(row => row.step_name === 'Chirurgický výkon');
  surgery.duration_seconds = 7200; // would start before this patient's arrival
  const report = buildMonthlyPerformance(history, [room('a')], NOW);
  assert.equal(report.totals.surgery.rawCount, 0);
  assert.equal(report.totals.aroStart.rawCount, 0);
  assert.equal(report.totals.cleanup.rawCount, 0);
});

test('direct surgical reset is not reported as completion of a normal surgical interval', () => {
  const history = cycle().slice(0, 4);
  history.at(-1).step_index = 0;
  const report = buildMonthlyPerformance(history, [room('a')], NOW);
  assert.equal(report.totals.surgery.rawAverageMinutes, null);
  assert.equal(report.totals.surgery.quality.missingDuration, 1);
});

test('pause/resume events leave actual elapsed durations unchanged', () => {
  const history = [...cycle(),
    event('pause', 'a', 'pause', '2026-09-05T08:45:00Z', 'Chirurgický výkon'),
    event('resume', 'a', 'resume', '2026-09-05T09:00:00Z', 'Chirurgický výkon')];
  assert.equal(buildMonthlyPerformance(history, [room('a')], NOW).totals.surgery.rawAverageMinutes, 60);
});

test('real trigger lifecycle +1ms markers do not exclude or duplicate the measured cycle', () => {
  const history = cycle();
  history[0].timestamp = '2026-09-04T08:00:00.001Z';
  const report = buildMonthlyPerformance(history, [room('a')], NOW, ON);
  assert.equal(report.totals.surgery.rawCount, 1);
  assert.equal(report.totals.cleanup.rawAverageMinutes, 20);
  assert.equal(report.totals.aroStart.rawAverageMinutes, 20);
});

test('positive subsecond timestamp intervals remain real samples even when integer duration was floored to zero', () => {
  const history = [
    event('start', 'a', 'operation_start', '2026-09-05T08:00:00Z', 'Příjezd na sál'),
    event('arrival', 'a', 'step_change', '2026-09-05T08:10:00Z', 'Příjezd na sál', 600, 2),
    event('surgery', 'a', 'step_change', '2026-09-05T08:10:00.820Z', 'Chirurgický výkon', 0, 3),
    event('end', 'a', 'step_change', '2026-09-05T08:20:00.820Z', 'Ukončení výkonu', 600, 4),
    event('departure', 'a', 'step_change', '2026-09-05T08:25:00.820Z', 'Odjezd ze sálu', 300, 5),
    event('cleaning', 'a', 'step_change', '2026-09-05T08:25:01.620Z', 'Úklid sálu', 0, 0),
  ];
  const report = buildMonthlyPerformance(history, [room('a')], NOW);
  assert.equal(report.totals.surgery.rawCount, 1);
  assert.equal(report.totals.surgery.rawAverageMinutes, .820 / 60);
  assert.equal(report.totals.cleanup.rawCount, 1);
  assert.equal(report.totals.cleanup.rawAverageMinutes, .8 / 60);
  assert.equal(report.totals.surgery.quality.underOneMinute, 1);
});

test('calendar-month grouping is independent of host timezone', () => {
  const original = process.env.TZ;
  try {
    const history = [clean('a', 'a', '2026-03-31T22:10:00Z', 300)];
    process.env.TZ = 'UTC';
    const utc = buildMonthlyPerformance(history, [room('a')], NOW);
    process.env.TZ = 'America/Los_Angeles';
    assert.deepEqual(buildMonthlyPerformance(history, [room('a')], NOW), utc);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

const workingMinutes = (configuredRoom, departure, arrival) => {
  const seconds = calculateTurnoverWorkingSeconds(configuredRoom, Date.parse(departure), Date.parse(arrival));
  return seconds === null ? null : seconds / 60;
};

test('turnover working time keeps daytime intervals and clips both same-day edges exactly', () => {
  const configured = room('a');
  assert.equal(workingMinutes(configured, '2026-09-08T09:00:00+02:00', '2026-09-08T10:15:00+02:00'), 75);
  assert.equal(workingMinutes(configured, '2026-09-08T06:30:00+02:00', '2026-09-08T07:20:00+02:00'), 20);
  assert.equal(workingMinutes(configured, '2026-09-08T15:15:00+02:00', '2026-09-08T16:00:00+02:00'), 15);
  assert.equal(workingMinutes(configured, '2026-09-08T06:00:00+02:00', '2026-09-08T17:00:00+02:00'), 510);
});

test('turnover ignores nights while summing every intervening configured working day', () => {
  const configured = room('a');
  assert.equal(workingMinutes(configured, '2026-09-07T15:00:00+02:00', '2026-09-08T08:00:00+02:00'), 90);
  assert.equal(workingMinutes(configured, '2026-09-07T15:00:00+02:00', '2026-09-09T08:00:00+02:00'), 600);
  assert.equal(workingMinutes(configured, '2026-09-07T22:00:00+02:00', '2026-09-08T06:00:00+02:00'), 0);
});

test('Friday-to-Monday turnover excludes the whole weekend even with enabled weekend schedules', () => {
  const configured = room('a');
  assert.equal(configured.weeklySchedule.saturday.enabled, true);
  assert.equal(workingMinutes(configured, '2026-09-04T15:00:00+02:00', '2026-09-07T08:00:00+02:00'), 90);
  assert.equal(workingMinutes(configured, '2026-09-05T08:00:00+02:00', '2026-09-06T16:00:00+02:00'), 0);
  assert.equal(workingMinutes(configured, '2026-09-04T16:00:00+02:00', '2026-09-07T07:00:00+02:00'), 0);
});

test('known closed weekdays differ from missing schedules; neither silently uses default hours', () => {
  const configured = room('a');
  configured.weeklySchedule.tuesday = { enabled: false };
  assert.equal(workingMinutes(configured, '2026-09-08T09:00:00+02:00', '2026-09-08T11:00:00+02:00'), 0);
  assert.equal(workingMinutes({ id: 'missing' }, '2026-09-08T09:00:00+02:00', '2026-09-08T11:00:00+02:00'), null);
  delete configured.weeklySchedule.tuesday;
  assert.equal(workingMinutes(configured, '2026-09-08T09:00:00+02:00', '2026-09-08T11:00:00+02:00'), null);
  // Wednesday is a known configured day; an unrelated missing Tuesday is harmless.
  assert.equal(workingMinutes(configured, '2026-09-09T09:00:00+02:00', '2026-09-09T11:00:00+02:00'), 120);
});

test('malformed or overnight schedules are unavailable consistently with the same-day schedule editor', () => {
  for (const invalid of [
    { enabled: 'true' }, { startHour: '7' }, { startHour: -1 }, { endHour: 24 },
    { startMinute: 60 }, { endMinute: 1.5 }, { startHour: 22, endHour: 6 },
    { startHour: 7, startMinute: 0, endHour: 7, endMinute: 0 },
  ]) {
    const configured = room('a');
    Object.assign(configured.weeklySchedule.friday, invalid);
    assert.equal(workingMinutes(configured, '2026-09-04T15:00:00+02:00', '2026-09-07T08:00:00+02:00'), null,
      JSON.stringify(invalid));
  }
});

test('break duration without a position does not fabricate break overlap or prorate real time', () => {
  const configured = room('a');
  configured.weeklySchedule.tuesday.breakMinutes = 30;
  assert.equal(workingMinutes(configured, '2026-09-08T09:00:00+02:00', '2026-09-08T10:00:00+02:00'), 60);
  delete configured.weeklySchedule.tuesday.breakMinutes;
  assert.equal(workingMinutes(configured, '2026-09-08T09:00:00+02:00', '2026-09-08T10:00:00+02:00'), 60);
});

test('Prague working boundaries remain correct across both DST weekends and independent of host timezone', () => {
  const original = process.env.TZ;
  try {
    const configured = room('a');
    for (const timezone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = timezone;
      assert.equal(workingMinutes(configured, '2026-03-27T15:00:00+01:00', '2026-03-30T08:00:00+02:00'), 90);
      assert.equal(workingMinutes(configured, '2026-10-23T15:00:00+02:00', '2026-10-26T08:00:00+01:00'), 90);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('last patient with no subsequent actual arrival does not manufacture a turnover sample to shift end', () => {
  const report = buildMonthlyPerformance(cycle(), [room('a')], NOW);
  assert.equal(report.totals.turnover.observed, 0);
  assert.equal(report.totals.turnover.rawAverageMinutes, null);
});

test('working-time exclusions distinguish zero overlap from unknown configuration in report quality', () => {
  const history = [...cycle(), event('next', 'a', 'operation_start', '2026-09-04T10:30:00Z', 'Příjezd na sál')];
  const closed = room('a');
  closed.weeklySchedule.friday.enabled = false;
  const off = buildMonthlyPerformance(history, [closed], NOW);
  const missing = buildMonthlyPerformance(history, [{ id: 'a', name: 'a' }], NOW);
  assert.equal(off.totals.turnover.observed, 1);
  assert.equal(off.totals.turnover.rawCount, 0);
  assert.equal(off.totals.turnover.quality.nonPositive, 1);
  assert.equal(off.totals.turnover.quality.missingDuration, 0);
  assert.equal(missing.totals.turnover.rawCount, 0);
  assert.equal(missing.totals.turnover.quality.missingDuration, 1);
  assert.equal(missing.totals.turnover.quality.nonPositive, 0);
  for (const kind of ['aroStart', 'surgery', 'aroEnd', 'cleanup']) {
    assert.deepEqual(off.totals[kind], missing.totals[kind]);
  }
});

test('report does not count weekend-only turnover as a zero-valued average', () => {
  const history = [...cycle('weekend', 'a', '2026-09-05T08:00:00Z'),
    event('next', 'a', 'operation_start', '2026-09-05T10:30:00Z', 'Příjezd na sál')];
  const metric = buildMonthlyPerformance(history, [room('a')], NOW).totals.turnover;
  assert.equal(metric.observed, 1);
  assert.equal(metric.rawAverageMinutes, null);
  assert.equal(metric.rawCount, 0);
  assert.equal(metric.quality.nonPositive, 1);
});

test('an exact end at local midnight does not require the next days missing schedule', () => {
  const configured = room('a');
  delete configured.weeklySchedule.tuesday;
  assert.equal(workingMinutes(configured, '2026-09-07T15:00:00+02:00', '2026-09-08T00:00:00+02:00'), 30);
});
