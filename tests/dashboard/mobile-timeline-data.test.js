import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

process.env.TZ = 'Europe/Prague';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function compile(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod);
  return mod.exports;
}
const display = compile('lib/mobile-room-display.ts');
const { getMobileOperationalDay, getMobileTimelineWindow, getMobileRoomSegments, mobileTimelinePageSize } = compile('lib/mobile-timeline.ts', { './mobile-room-display': display });
const ms = value => new Date(`2026-09-17T${value}:00+02:00`).getTime();
const iso = value => new Date(ms(value)).toISOString();
const statuses = [
  { order_index: 0, name: 'Sál připraven', color: '#00D6C4' },
  { order_index: 4, name: 'Příjezd na sál', color: '#4488FF' },
  { order_index: 9, name: 'Chirurgický výkon', color: '#FF0000', accent_color: '#B51A68' },
];
const room = extra => ({ id: '1', name: 'PCHO 2', currentStepIndex: 2, ...extra });
const entry = (time, stepIndex, extra = {}) => ({ startedAt: iso(time), stepIndex, ...extra });
const window = { startMs: ms('09:00'), endMs: ms('13:00') };
const segments = (extra = {}, bounds = window) => getMobileRoomSegments(room(extra), statuses, ms('11:00'), bounds);

test('enabled array positions, not database order gaps, determine live phase colors', () => {
  const result = segments({ statusHistory: [entry('09:00', 1), entry('10:00', 2)] });
  assert.deepEqual(result.map(segment => [segment.color, segment.kind]), [['#4488FF', 'history'], ['#B51A68', 'current']]);
  assert.deepEqual(result.map(segment => segment.label), ['Příjezd na sál', 'Chirurgický výkon']);
});

test('history is copied, sorted and clipped exactly without exaggerated minimum bar widths', () => {
  const statusHistory = [entry('10:00', 2), entry('08:00', 1), { startedAt: 'invalid', stepIndex: 1 }, entry('15:00', 1)];
  const before = JSON.stringify(statusHistory);
  const result = segments({ statusHistory });
  assert.equal(JSON.stringify(statusHistory), before);
  assert.deepEqual(result.map(segment => [segment.startMs, segment.endMs, segment.leftPct, segment.widthPct]), [
    [ms('09:00'), ms('10:00'), 0, 25], [ms('10:00'), ms('11:00'), 25, 25],
  ]);
  const narrow = getMobileRoomSegments(room({ operationStartedAt: '2026-09-17T08:59:59.000Z' }), statuses, ms('11:00'), window);
  assert.ok(narrow[0].widthPct < 0.01);
});

test('completed cycles remain visible in ready rooms, bounded by their actual end', () => {
  const result = segments({ currentStepIndex: 0, estimatedEndTime: iso('13:00'), operationStartedAt: iso('07:00'), completedOperations: [
    { startedAt: iso('08:00'), endedAt: iso('10:30'), statusHistory: [entry('09:30', 2), entry('08:00', 1)] },
  ] });
  assert.deepEqual(result.map(segment => [segment.kind, segment.startMs, segment.endMs]), [
    ['history', ms('09:00'), ms('09:30')], ['history', ms('09:30'), ms('10:30')],
  ]);
  assert.ok(result.every(segment => segment.kind !== 'estimate' && segment.kind !== 'current'));
});

test('unknown completed phases get a neutral recorded interval, not the current phase color', () => {
  const result = segments({ completedOperations: [{ startedAt: iso('09:00'), endedAt: iso('10:00'), statusHistory: [] }] });
  assert.equal(result.length, 1);
  assert.equal(result[0].color, '#7890A8');
  assert.match(result[0].label, /nezaznamenána/);
});

test('actual elapsed time and future estimate never occupy the same time range', () => {
  const result = segments({ operationStartedAt: iso('09:30'), phaseStartedAt: iso('10:00'), estimatedEndTime: iso('14:00') });
  assert.deepEqual(result.map(segment => [segment.kind, segment.startMs, segment.endMs]), [
    ['current', ms('09:30'), ms('11:00')], ['estimate', ms('11:00'), ms('13:00')],
  ]);
  assert.ok(segments({ operationStartedAt: iso('10:00'), estimatedEndTime: iso('10:30') }).every(segment => segment.kind !== 'estimate'));
});

test('missing history uses an actual phase timestamp before procedure time; ready stays empty', () => {
  const currentProcedure = { startTime: '08:00' };
  assert.equal(segments({ phaseStartedAt: iso('10:00'), currentProcedure })[0].startMs, ms('10:00'));
  assert.equal(segments({ currentProcedure })[0].startMs, ms('09:00'));
  assert.deepEqual(segments({ currentStepIndex: 0, operationStartedAt: iso('08:00'), currentProcedure, estimatedEndTime: iso('13:00') }), []);
  assert.deepEqual(segments({ currentStepIndex: 0, isPaused: true, operationStartedAt: iso('08:00'), estimatedEndTime: iso('13:00') }), []);
  assert.deepEqual(segments(), []);
});

test('paused interval is an overlay only from an actual known pause timestamp', () => {
  const result = segments({ operationStartedAt: iso('09:00'), isPaused: true, pausedAt: iso('10:30') });
  assert.deepEqual(result.map(segment => segment.kind), ['current', 'pause']);
  assert.equal(result.at(-1).startMs, ms('10:30'));
  assert.equal(result.at(-1).endMs, ms('11:00'));
  for (const pausedAt of [null, 'invalid', iso('12:00')]) {
    assert.ok(segments({ operationStartedAt: iso('09:00'), isPaused: true, pausedAt }).every(segment => segment.kind !== 'pause'));
  }
});

test('emergency and lock overlays preserve actual current progress without inventing an end time', () => {
  for (const overlay of [{ isEmergency: true }, { isLocked: true }, { isEmergency: true, isLocked: true }]) {
    const withHistory = segments({
      ...overlay, operationStartedAt: iso('09:00'), phaseStartedAt: iso('10:00'),
      estimatedEndTime: iso('12:00'), statusHistory: [entry('09:00', 1), entry('10:00', 2)],
    });
    assert.deepEqual(withHistory.map(segment => [segment.kind, segment.startMs, segment.endMs]), [
      ['history', ms('09:00'), ms('10:00')], ['current', ms('10:00'), ms('11:00')],
    ]);
    assert.equal(withHistory.at(-1).color, '#B51A68', 'Clinical phase color remains beneath operational badge');
    const timestampOnly = segments({ ...overlay, operationStartedAt: iso('09:00') });
    assert.equal(timestampOnly[0].kind, 'current');
    assert.equal(timestampOnly[0].endMs, ms('11:00'));
    assert.deepEqual(segments({ ...overlay, currentStepIndex: 0, operationStartedAt: iso('09:00'), estimatedEndTime: iso('12:00') }), []);
    assert.deepEqual(segments(overlay), [], 'Operational flag alone is not proof of an operation interval');
  }
});

test('last recorded phase ends at an explicit ready transition and never extends through readiness', () => {
  const result = segments({ currentStepIndex: 0, phaseStartedAt: iso('10:00'), statusHistory: [entry('09:00', 2)] });
  assert.equal(result[0].kind, 'history');
  assert.equal(result[0].endMs, ms('10:00'));
  assert.deepEqual(segments({ currentStepIndex: 0, statusHistory: [entry('09:00', 2)] }), []);
});

test('current phase fills a known missing transition but not an invented timestamp', () => {
  const result = segments({ phaseStartedAt: iso('10:00'), statusHistory: [entry('09:00', 1)] });
  assert.deepEqual(result.map(segment => [segment.kind, segment.label]), [['history', 'Příjezd na sál'], ['current', 'Chirurgický výkon']]);
});

test('unknown indexes use stored historical labels/colors rather than another status order', () => {
  const result = segments({ currentStepIndex: 0, completedOperations: [{ startedAt: iso('09:00'), endedAt: iso('10:00'), statusHistory: [entry('09:00', 4, { color: '#ABCDEF', stepName: 'Historická fáze' })] }] });
  assert.equal(result[0].color, '#ABCDEF');
  assert.equal(result[0].label, 'Historická fáze');
});

test('invalid and future actual timestamps, empty windows and malformed intervals are ignored', () => {
  assert.deepEqual(segments({ operationStartedAt: 'no-date', phaseStartedAt: iso('12:00'), currentProcedure: { startTime: '25:99' }, completedOperations: [
    { startedAt: iso('10:00'), endedAt: iso('09:00'), statusHistory: [] },
    { startedAt: 'invalid', endedAt: iso('10:00'), statusHistory: [] },
    { startedAt: iso('10:00'), endedAt: iso('12:00'), statusHistory: [] },
  ] }), []);
  assert.deepEqual(segments({ operationStartedAt: iso('09:00') }, { startMs: 1, endMs: 1 }), []);
  assert.deepEqual(getMobileRoomSegments(room(), statuses, NaN, window), []);
});

test('HH:mm procedure fallback selects the preceding local date across midnight', () => {
  const now = new Date('2026-09-18T00:30:00+02:00').getTime();
  const result = getMobileRoomSegments(room({ currentProcedure: { startTime: '23:15' } }), statuses, now, { startMs: ms('22:00'), endMs: now + 3600000 });
  assert.equal(result[0].startMs, ms('23:15'));
  assert.equal(result[0].endMs, now);
});

test('operational days anchor at 07:00 and previous day before 07:00', () => {
  assert.equal(getMobileOperationalDay(ms('06:59')).startMs, new Date('2026-09-16T07:00:00+02:00').getTime());
  assert.equal(getMobileOperationalDay(ms('07:00')).startMs, ms('07:00'));
  assert.equal(new Date(getMobileOperationalDay(ms('18:00')).endMs).getHours(), 7);
});

test('spring and autumn DST days end at the next calendar 07:00, not after fixed 24 hours', () => {
  for (const [date, length] of [['2026-03-28T12:00:00+01:00', 23], ['2026-10-24T12:00:00+02:00', 25]]) {
    const day = getMobileOperationalDay(Date.parse(date));
    assert.equal((day.endMs - day.startMs) / 3600000, length);
    assert.equal(new Date(day.startMs).getHours(), 7);
    assert.equal(new Date(day.endMs).getHours(), 7);
    const next = getMobileTimelineWindow(Date.parse(date), 'day', 1);
    assert.equal(next.startMs, day.endMs);
  }
});

test('short windows are whole-hour centered and adjacent page windows meet exactly', () => {
  const now = ms('11:37');
  assert.deepEqual(getMobileTimelineWindow(now, 2, 0), { startMs: ms('10:00'), endMs: ms('12:00') });
  assert.deepEqual(getMobileTimelineWindow(now, 4, 0), { startMs: ms('09:00'), endMs: ms('13:00') });
  for (const span of [2, 4]) {
    const current = getMobileTimelineWindow(now, span, 0);
    assert.equal(getMobileTimelineWindow(now, span, 1).startMs, current.endMs);
    assert.equal(getMobileTimelineWindow(now, span, -1).endMs, current.startMs);
  }
});

test('viewport pagination reserves readable 80px rows with bounded safe fallback', () => {
  assert.deepEqual([0, 79, 80, 160, 319, 640, 2000, NaN, Infinity].map(mobileTimelinePageSize), [1, 1, 1, 2, 3, 8, 8, 1, 1]);
});
