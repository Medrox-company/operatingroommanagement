import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Exercise only pure calculation code, with local synthetic evidence. This
// suite never imports database clients or accesses real clinical records.
process.env.TZ = 'Europe/Prague';
function loadModule(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(dependency => {
    assert.fail(`Unexpected runtime dependency: ${dependency}`);
  }, exports);
  return exports;
}
const { statisticsDayPhaseSummary: summary } = loadModule('../../lib/statistics-day-phases.ts');
const { filterStatisticsPhaseDurations } = loadModule('../../lib/statistics-phase-filter.ts');
const { statisticsDayWindow } = loadModule('../../lib/statistics-room-scope.ts');
const hour = (startHour = 7, endHour = 16, extra = {}) => ({
  enabled: true, startHour, startMinute: 0, endHour, endMinute: 0, breakMinutes: 0, ...extra,
});
const room = (id = 'qa-room', extra = {}) => ({
  id, name: 'Local QA fixture only', currentStepIndex: 0,
  weeklySchedule: { tuesday: hour(), wednesday: hour() }, ...extra,
});
const steps = [
  { title: 'Sál připraven', color: '#22c55e', name: 'Ready' },
  { title: 'Chirurgický výkon', color: '#ef4444', name: 'Surgery' },
  { title: 'Úklid sálu', color: '#0ea5e9', name: 'Cleaning' },
  { title: 'Příprava sálu', color: '#a78bfa' },
];
const at = (day, hours, minutes = 0, seconds = 0) => new Date(2026, 9, day, hours, minutes, seconds).toISOString();
const window = statisticsDayWindow(new Date(2026, 9, 13));
const options = { now: new Date(2026, 9, 16, 12) };
const phase = (id, end, seconds, name = 'Chirurgický výkon', extra = {}) => ({
  id, operating_room_id: 'qa-room', event_type: 'step_change', timestamp: end,
  step_index: 2, step_name: name, duration_seconds: seconds, metadata: {}, ...extra,
});
const calculate = (history, rooms = [room()], workflow = steps, bounds = window, clock = options) =>
  summary(history, rooms, workflow, bounds, clock);
const find = (result, label) => result.phases.find(item => item.label === label);
const totalPercent = result => result.phases.reduce((sum, item) => sum + item.percent, 0);
const hoursMs = hours => hours * 3600000;

test('day phase shares exclude ready time from both numerator and denominator', () => {
  const result = calculate([
    phase('qa-idle', at(13, 10), 48 * 3600, 'Sál připraven'),
    phase('qa-surgery', at(13, 9), 3600),
    phase('qa-cleaning', at(13, 10), 3600, 'Úklid sálu'),
  ]);
  assert.deepEqual(result.phases.map(item => [item.label, item.percent]), [
    ['Chirurgický výkon', 50], ['Úklid sálu', 50],
  ]);
  assert.equal(result.totalMilliseconds, hoursMs(2));
  assert.equal(totalPercent(result), 100);
  assert.equal(result.withoutWorkingHours, false);
});

test('measured intervals are clipped to the selected day, not assigned by their end timestamp', () => {
  const result = calculate([
    phase('qa-before-start', at(13, 8), 2 * 3600),
    phase('qa-after-end', at(14, 8), 18 * 3600, 'Úklid sálu'),
    phase('qa-yesterday', at(12, 10), 3600),
    phase('qa-tomorrow', at(14, 10), 3600),
  ]);
  assert.equal(find(result, 'Chirurgický výkon').milliseconds, hoursMs(1), '06:00–08:00 contributes only 07:00–08:00');
  assert.equal(find(result, 'Úklid sálu').milliseconds, hoursMs(2), 'A phase ending tomorrow contributes only today 14:00–16:00');
  assert.equal(result.totalMilliseconds, hoursMs(3));
  assert.equal(totalPercent(result), 100);
});

test('known room working hours clip each recorded phase without prorating configured breaks', () => {
  const result = calculate([
    phase('qa-cross-shift', at(13, 17), 11 * 3600),
    phase('qa-before-shift', at(13, 8), 3600, 'Úklid sálu'),
    phase('qa-after-shift', at(13, 18), 3600, 'Úklid sálu'),
  ], [room('qa-room', { weeklySchedule: { tuesday: hour(8, 16, { breakMinutes: 30 }), wednesday: hour() } })]);
  assert.equal(result.totalMilliseconds, hoursMs(8));
  assert.deepEqual(result.phases.map(item => [item.label, item.percent]), [['Chirurgický výkon', 100]]);
  assert.equal(result.withoutWorkingHours, false);
});

test('different room schedules constrain their own phases before the common denominator is calculated', () => {
  const result = calculate([
    phase('qa-a', at(13, 14), 6 * 3600),
    phase('qa-b', at(13, 14), 6 * 3600, 'Úklid sálu', { operating_room_id: 'qa-second' }),
    phase('qa-unselected-room', at(13, 14), 6 * 3600, 'Úklid sálu', { operating_room_id: 'qa-other' }),
  ], [
    room('qa-room', { weeklySchedule: { tuesday: hour(8, 10), wednesday: hour() } }),
    room('qa-second', { weeklySchedule: { tuesday: hour(10, 13), wednesday: hour() } }),
  ]);
  assert.equal(result.totalMilliseconds, hoursMs(5));
  assert.equal(find(result, 'Chirurgický výkon').percent, 40);
  assert.equal(find(result, 'Úklid sálu').percent, 60);
});

test('07:00-to-07:00 operational day includes the next calendar date early shift', () => {
  const result = calculate([
    phase('qa-selected-date', at(13, 9), 3600),
    phase('qa-next-date', at(14, 8), 3 * 3600, 'Úklid sálu'),
  ], [room('qa-room', { weeklySchedule: { tuesday: hour(8, 16), wednesday: hour(6, 15) } })]);
  assert.equal(find(result, 'Chirurgický výkon').milliseconds, hoursMs(1));
  assert.equal(find(result, 'Úklid sálu').milliseconds, hoursMs(1), 'Only next-date 06:00–07:00 belongs to this operational day');
  assert.equal(result.totalMilliseconds, hoursMs(2));
  assert.equal(result.withoutWorkingHours, false);
});

test('a next-date midnight-to-six shift is included, while a standard seven-start shift contributes no overnight time', () => {
  const history = [phase('qa-night', at(14, 8), 10 * 3600)];
  const midnight = calculate(history, [room('qa-room', {
    weeklySchedule: { tuesday: hour(8, 16), wednesday: hour(0, 6) },
  })]);
  assert.equal(midnight.totalMilliseconds, hoursMs(6));
  assert.equal(midnight.withoutWorkingHours, false);
  const standard = calculate(history);
  assert.deepEqual(standard, { phases: [], totalMilliseconds: 0, withoutWorkingHours: false });
});

test('unknown, disabled and invalid schedules retain measured historical activity with an explicit flag', () => {
  const variants = [
    undefined, {}, { tuesday: hour(8, 16, { enabled: false }) },
    { tuesday: hour(17, 8) }, { tuesday: hour(-1, 16) },
    { tuesday: hour(8, 16, { startMinute: 60 }) },
    { tuesday: hour(8, 16, { endHour: NaN }) },
  ];
  for (const weeklySchedule of variants) {
    const result = calculate([phase('qa-factual', at(13, 10), 2 * 3600)], [room('qa-room', { weeklySchedule })]);
    assert.equal(result.totalMilliseconds, hoursMs(2));
    assert.equal(result.phases[0].percent, 100);
    assert.equal(result.withoutWorkingHours, true);
  }
});

test('missing working-hour flag is set only for a phase that actually contributes measured time', () => {
  const result = calculate([
    phase('qa-unknown-yesterday', at(12, 10), 3600, 'Úklid sálu', { operating_room_id: 'qa-unknown' }),
    phase('qa-unknown-idle', at(13, 10), 3600, 'Sál připraven', { operating_room_id: 'qa-unknown' }),
    phase('qa-known', at(13, 10), 3600),
  ], [room(), room('qa-unknown', { weeklySchedule: {} })]);
  assert.equal(result.totalMilliseconds, hoursMs(1));
  assert.equal(result.withoutWorkingHours, false);
});

test('synthetic review records are omitted while factual metadata is preserved', () => {
  const result = calculate([
    phase('qa-boolean-marker', at(13, 9), 3600, 'Úklid sálu', { metadata: { synthetic: true } }),
    phase('qa-string-marker', at(13, 10), 3600, 'Úklid sálu', { metadata: { synthetic: 'true' } }),
    phase('qa-source-marker', at(13, 11), 3600, 'Úklid sálu', { metadata: { source: 'app_review_seed' } }),
    phase('qa-factual', at(13, 12), 3600, 'Chirurgický výkon', { metadata: { synthetic: false } }),
  ]);
  assert.equal(result.totalMilliseconds, hoursMs(1));
  assert.deepEqual(result.phases.map(item => item.label), ['Chirurgický výkon']);
});

test('invalid duration, invalid timestamp, future records and non-phase events do not create phase data', () => {
  const invalid = [0, -1, NaN, Infinity, -Infinity, null, undefined, '60'];
  const history = invalid.map((seconds, index) => phase(`qa-invalid-${index}`, at(13, 10), seconds));
  history.push(
    phase('qa-invalid-date', 'not-a-date', 60),
    phase('qa-future', at(13, 12), 3600),
    phase('qa-marker', at(13, 9), 3600, 'Úklid sálu', { event_type: 'operation_start' }),
    phase('qa-valid', at(13, 9), 3600),
  );
  const result = calculate(history, [room()], steps, window, { now: new Date(2026, 9, 13, 10) });
  assert.equal(result.totalMilliseconds, hoursMs(1));
  assert.equal(result.phases.length, 1);
});

test('duplicate database IDs and identical no-ID fallback evidence count only once', () => {
  const first = phase('qa-repeat-id', at(13, 9), 3600);
  const repeatedId = phase('qa-repeat-id', at(13, 10), 3600);
  const withoutId = phase(undefined, at(13, 11), 3600, 'Úklid sálu');
  const result = calculate([first, { ...first }, repeatedId, withoutId, { ...withoutId }]);
  assert.equal(result.totalMilliseconds, hoursMs(2));
  assert.equal(find(result, 'Chirurgický výkon').milliseconds, hoursMs(1));
  assert.equal(find(result, 'Úklid sálu').milliseconds, hoursMs(1));
});

test('distinct authoritative database IDs are not collapsed by a no-ID signature heuristic', () => {
  const result = calculate([
    phase('qa-first-id', at(13, 9), 3600),
    phase('qa-second-id', at(13, 9), 3600),
  ]);
  assert.equal(result.totalMilliseconds, hoursMs(2));
});

test('phase identity prefers previous-step metadata and normalizes current workflow aliases', () => {
  const result = calculate([
    phase('qa-alias', at(13, 9), 3600, 'Surgery'),
    phase('qa-title-normalized', at(13, 10), 3600, '  chirurgicky   vykon  '),
    phase('qa-metadata', at(13, 11), 3600, 'Úklid sálu', { metadata: { previous_step: 'Chirurgický výkon' } }),
    phase('qa-empty-metadata', at(13, 12), 3600, 'Úklid sálu', { metadata: { previous_step: '  ' } }),
  ]);
  assert.equal(find(result, 'Chirurgický výkon').milliseconds, hoursMs(3));
  assert.equal(find(result, 'Chirurgický výkon').color, '#ef4444');
  assert.equal(find(result, 'Úklid sálu').milliseconds, hoursMs(1));
  assert.equal(totalPercent(result), 100);
});

test('old unknown measured phase names remain in the denominator with a neutral color', () => {
  const result = calculate([
    phase('qa-current', at(13, 9), 3600),
    phase('qa-retired', at(13, 10), 3600, 'Původní historická fáze'),
  ]);
  assert.equal(find(result, 'Původní historická fáze').color, '#94a3b8');
  assert.equal(find(result, 'Původní historická fáze').percent, 50);
  assert.equal(result.totalMilliseconds, hoursMs(2));
});

test('real preparation phase remains visible but normalized ready aliases are excluded', () => {
  const names = ['Sál připraven', ' SAL   PRIPRAVEN ', 'Sál připraven (volný)', 'Připraven sál', 'Ready', 'idle', 'Room ready'];
  const history = names.map((name, index) => phase(`qa-ready-${index}`, at(13, 10), 3600, name));
  history.push(phase('qa-real-preparation', at(13, 9), 3600, 'Příprava sálu'));
  const result = calculate(history);
  assert.deepEqual(result.phases.map(item => [item.label, item.percent]), [['Příprava sálu', 100]]);
  assert.equal(result.totalMilliseconds, hoursMs(1));
});

test('short-phase projection removes only original sub-minute samples and does not discard a clipped minute sample', () => {
  const history = [
    phase('qa-short', at(13, 8), 59, 'Úklid sálu'),
    phase('qa-minute-at-boundary', at(13, 7, 0, 20), 60),
  ];
  const before = calculate(history);
  assert.equal(before.totalMilliseconds, 79000);
  const projected = filterStatisticsPhaseDurations(history, true);
  const after = calculate(projected);
  assert.equal(history[0].duration_seconds, 59, 'The raw source is never mutated');
  assert.equal(after.totalMilliseconds, 20000, 'A valid original 60-second sample retains its 20-second selected-day overlap');
  assert.deepEqual(after.phases.map(item => [item.label, item.percent]), [['Chirurgický výkon', 100]]);
});

test('empty, ready-only, outside-window and invalid-window data never produce a fabricated 100-percent phase', () => {
  const empty = { phases: [], totalMilliseconds: 0, withoutWorkingHours: false };
  assert.deepEqual(calculate([]), empty);
  assert.deepEqual(calculate([phase('qa-idle-only', at(13, 10), 3600, 'Sál připraven')]), empty);
  assert.deepEqual(calculate([phase('qa-old-only', at(12, 10), 3600)]), empty);
  assert.deepEqual(calculate([phase('qa-valid', at(13, 10), 3600)], [], steps), empty);
  assert.deepEqual(calculate([], [room()], steps, { start: new Date(NaN), end: new Date() }), empty);
  assert.deepEqual(calculate([], [room()], steps, { start: window.end, end: window.start }), empty);
});

test('balanced whole-point rounding displays 100 while retaining precise measured shares', () => {
  const result = calculate([
    phase('qa-third-a', at(13, 9), 3600),
    phase('qa-third-b', at(13, 10), 3600, 'Úklid sálu'),
    phase('qa-third-c', at(13, 11), 3600, 'Příprava sálu'),
  ]);
  assert.deepEqual(result.phases.map(item => item.percent), [34, 33, 33]);
  assert.equal(totalPercent(result), 100);
  for (const item of result.phases) {
    assert.ok(Math.abs(item.exactPercent - 100 / 3) < 1e-9);
    assert.equal(item.milliseconds, hoursMs(1));
    assert.ok(Math.abs(item.percent - item.exactPercent) < 1);
  }
});

test('decimal durations preserve precise shares and displayed totals do not drift across many phases', () => {
  const history = Array.from({ length: 17 }, (_, index) => phase(
    `qa-fraction-${index}`, at(13, 10), index * 7.3 + 1.2, `Historická fáze ${index}`,
  ));
  const result = calculate(history);
  assert.equal(result.phases.length, 17);
  assert.equal(totalPercent(result), 100);
  assert.ok(Math.abs(result.phases.reduce((sum, item) => sum + item.exactPercent, 0) - 100) < 1e-9);
  assert.ok(result.phases.every(item => Number.isInteger(item.percent) && Math.abs(item.percent - item.exactPercent) < 1));
});

test('Prague DST boundaries use local calendar days rather than a fixed 24-hour window', () => {
  const autumnDay = new Date(2026, 9, 24);
  const springDay = new Date(2026, 2, 28);
  for (const [selectedDay, expectedHours] of [[autumnDay, 25], [springDay, 23]]) {
    const bounds = statisticsDayWindow(selectedDay);
    assert.equal(bounds.end.getTime() - bounds.start.getTime(), hoursMs(expectedHours));
    assert.equal(bounds.start.getHours(), 7);
    assert.equal(bounds.end.getHours(), 7);
    const history = [phase('qa-dst', bounds.end.toISOString(), expectedHours * 3600)];
    const result = calculate(history, [room('qa-room', { weeklySchedule: {} })], steps, bounds, {
      now: new Date(bounds.end.getTime() + hoursMs(1)),
    });
    assert.equal(result.totalMilliseconds, hoursMs(expectedHours));
    assert.equal(result.withoutWorkingHours, true);
    assert.equal(result.phases[0].percent, 100);
  }
});

test('summary calculation leaves immutable source histories, room schedules and workflow labels untouched', () => {
  const immutableRooms = Object.freeze([Object.freeze(room())]);
  const immutableSteps = Object.freeze(steps.map(step => Object.freeze({ ...step })));
  const history = Object.freeze([
    Object.freeze(phase('qa-immutable', at(13, 9), 3600)),
  ]);
  const snapshot = JSON.stringify({ history, immutableRooms, immutableSteps });
  const result = calculate(history, immutableRooms, immutableSteps);
  assert.equal(result.totalMilliseconds, hoursMs(1));
  assert.equal(JSON.stringify({ history, immutableRooms, immutableSteps }), snapshot);
});
