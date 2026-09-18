import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('StatisticsModule.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = [
  'getRoomWorkingHours', 'getDayBreakMinutes', 'getRoomWorkingMinutes', 'getRoomTotalWorkingMinutes',
  'countOperationsInWorkingHours', 'getPeriodStart', 'buildRoomOperationIntervals', 'mergeOperationIntervals',
  'workingMinutesFromIntervals', 'getRoomWorkingMinutesInWindow', 'calculateActiveMinutesInWorkingWindow',
  'calculateActiveTimeInWorkingHours', 'calculateRoomUtilization', 'calculateRoomUtilizationForDay',
  'dayBounds', 'operationalToday', 'buildTimeline', 'getArchivedOperationIntervals', 'getRecordedOperationStarts',
  'buildDayOperationIntervals', 'calculateActiveMinutesForDay', 'countOperationsForDay',
  'isSameOperationStart',
];
const declarations = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
assert.equal(declarations.length, names.length);
const js = ts.transpileModule(`${declarations.map(node => node.getText(parsed)).join('\n')}\nexports.helpers={${names.join(',')}};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const realDate = Date;
const fixedNow = new realDate(2026, 8, 15, 12).getTime();
class FixedDate extends realDate {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return fixedNow; }
}
const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const exports = {};
new Function('exports', 'Date', 'DAY_KEYS', 'OPERATIONAL_DAY_START_HOUR', js)(exports, FixedDate, dayKeys, 7);
const h = exports.helpers;
const at = (day, hour, minute = 0) => new realDate(2026, 8, day, hour, minute);
const room = () => ({ id: 'pcho', currentStepIndex: 0, weeklySchedule: Object.fromEntries(dayKeys.map(day => [day, {
  enabled: false, startHour: 7, startMinute: 0, endHour: 15, endMinute: 0, breakMinutes: 0,
}])) });
const event = (event_type, day, hour, minute = 0) => ({ operating_room_id: 'pcho', event_type, timestamp: at(day, hour, minute).toISOString() });

test('disabled and missing schedules cannot erase recorded operation counts within the selected period', () => {
  const history = [event('operation_start', 14, 9), event('operation_start', 1, 9), event('operation_start', 16, 9),
    event('step_change', 14, 9), { ...event('operation_start', 14, 9), operating_room_id: 'other' },
    { ...event('operation_start', 14, 9), timestamp: 'invalid' }];
  assert.equal(h.countOperationsInWorkingHours(room(), history, 'týden'), 1);
  assert.equal(h.countOperationsInWorkingHours({ id: 'pcho' }, history, 'týden'), 1);
  assert.equal(h.getRoomWorkingMinutes({ id: 'pcho' }, 0), 0, 'No fabricated default capacity');
});

test('known working-hour boundaries keep their established counting rule', () => {
  const configured = room();
  configured.weeklySchedule.monday.enabled = true;
  const history = [event('operation_start', 14, 9), event('operation_start', 14, 17)];
  assert.equal(h.countOperationsInWorkingHours(configured, history, 'týden'), 1);
  configured.weeklySchedule.monday.enabled = false;
  assert.equal(h.countOperationsInWorkingHours(configured, history, 'týden'), 2);
});

test('historically closed room retains actual measured minutes, without inventing capacity', () => {
  const history = [event('operation_start', 14, 9), event('operation_end', 14, 10)];
  assert.equal(h.calculateActiveMinutesInWorkingWindow(room(), history, at(14, 7), at(15, 7)), 60);
  assert.equal(h.getRoomWorkingMinutesInWindow(room(), at(14, 7), at(15, 7)), 0);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(room(), history, at(14, 9, 30), at(14, 10)), 30);
});

test('unconfigured days retain activity but do not inflate utilization against other days capacity', () => {
  const configured = room();
  configured.weeklySchedule.monday.enabled = true;
  const history = [event('operation_start', 14, 9), event('operation_end', 14, 11),
    event('operation_start', 15, 9), event('operation_end', 15, 10)];
  assert.equal(h.calculateActiveMinutesInWorkingWindow(configured, history, at(14, 0), at(16, 0)), 180);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(configured, history, at(14, 0), at(16, 0), false), 120);
  assert.equal(h.getRoomWorkingMinutesInWindow(configured, at(14, 0), at(16, 0)), 480);
});

test('orphan start and idle histories do not create fictional operating time', () => {
  const history = [event('operation_start', 14, 9), event('step_change', 14, 10)];
  assert.equal(h.calculateActiveMinutesInWorkingWindow(room(), history, at(14, 7), at(15, 7)), 0);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(room(), [], at(14, 7), at(15, 7)), 0);
});

test('authoritative running operation retains actual time only up to now', () => {
  const running = { ...room(), currentStepIndex: 2, operationStartedAt: at(15, 11).toISOString() };
  assert.equal(h.calculateActiveMinutesInWorkingWindow(running, [], at(15, 7), at(16, 7)), 60);
});

test('measured phase distribution remains visible after closing a room', () => {
  const timeline = h.buildTimeline(room(), [{ title: 'Chirurgický výkon', color: '#ff0000' }], [60]);
  assert.deepEqual(timeline, [{ title: 'Chirurgický výkon', color: '#ff0000', pct: 100, min: 60 }]);
  assert.deepEqual(h.buildTimeline(room(), [{ title: 'Chirurgický výkon', color: '#ff0000' }], [0]), []);
});

test('completed room snapshots retain counts and measured time without recreating historical capacity', () => {
  const archived = { ...room(), completedOperations: [{ startedAt: at(14, 8).toISOString(), endedAt: at(14, 10).toISOString() }] };
  assert.equal(h.countOperationsForDay(archived, [], at(14, 0)), 1);
  assert.equal(h.countOperationsInWorkingHours(archived, [], 'týden'), 1);
  assert.equal(h.calculateActiveMinutesForDay(archived, [], at(14, 0)), 120);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(archived, [], at(14, 7), at(15, 7)), 120);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(archived, [], at(14, 7), at(15, 7), false), 0);
  assert.equal(h.getRoomWorkingMinutesInWindow(archived, at(14, 7), at(15, 7)), 0);
  assert.equal(h.calculateRoomUtilizationForDay(archived, [], at(14, 0)), 0);
});

test('imported operation_completed metadata supplies real archived bounds even without a start event', () => {
  const history = [{ ...event('operation_completed', 14, 10), metadata: { startedAt: at(14, 8).toISOString(), endedAt: at(14, 10).toISOString() } }];
  assert.equal(h.countOperationsForDay(room(), history, at(14, 0)), 1);
  assert.equal(h.countOperationsInWorkingHours(room(), history, 'týden'), 1);
  assert.equal(h.calculateActiveMinutesForDay(room(), history, at(14, 0)), 120);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(room(), history, at(14, 9), at(14, 10)), 60);
});

test('measured completed-cycle duration is valid evidence, but an unpaired end alone cannot invent a start', () => {
  const measured = [{ ...event('operation_completed', 14, 10), duration_seconds: 3600 }];
  assert.equal(h.calculateActiveMinutesForDay(room(), measured, at(14, 0)), 60);
  assert.equal(h.countOperationsForDay(room(), measured, at(14, 0)), 1);
  for (const duration_seconds of [undefined, null, 0, -10, NaN, Infinity, '3600']) {
    const history = [{ ...event('operation_completed', 14, 10), duration_seconds }];
    assert.equal(h.countOperationsForDay(room(), history, at(14, 0)), 0);
    assert.equal(h.calculateActiveMinutesForDay(room(), history, at(14, 0)), 0);
  }
});

test('explicit events, imported archives and completed snapshots never count the same cycle twice', () => {
  const completed = { startedAt: at(14, 8).toISOString(), endedAt: at(14, 10).toISOString() };
  const archived = { ...room(), completedOperations: [completed, { ...completed }] };
  const imported = { ...event('operation_completed', 14, 10), duration_seconds: 7200, metadata: completed };
  const history = [event('operation_start', 14, 8), event('operation_end', 14, 10), imported, { ...imported }];
  assert.equal(h.countOperationsForDay(archived, history, at(14, 0)), 1);
  assert.equal(h.countOperationsInWorkingHours(archived, history, 'týden'), 1);
  assert.equal(h.calculateActiveMinutesForDay(archived, history, at(14, 0)), 120);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(archived, history, at(14, 7), at(15, 7)), 120);
  assert.equal(h.countOperationsForDay(archived, [imported, { ...imported }], at(14, 0)), 1);
});

test('operation_completed also closes an explicit start if legacy metadata is absent', () => {
  const history = [event('operation_start', 14, 8), event('operation_completed', 14, 10)];
  assert.equal(h.calculateActiveMinutesForDay(room(), history, at(14, 0)), 120);
  assert.equal(h.countOperationsForDay(room(), history, at(14, 0)), 1);
});

test('the database trigger 1 ms lifecycle offset does not duplicate a snapshot cycle', () => {
  const completed = { startedAt: at(14, 8).toISOString(), endedAt: at(14, 10).toISOString() };
  const archived = { ...room(), completedOperations: [completed] };
  const shifted = (type, hour) => ({ ...event(type, 14, hour), timestamp: new realDate(at(14, hour).getTime() + 1).toISOString() });
  const history = [shifted('operation_start', 8), shifted('operation_end', 10),
    { ...event('operation_completed', 14, 10), metadata: completed }];
  assert.equal(h.countOperationsForDay(archived, history, at(14, 0)), 1);
  assert.equal(h.countOperationsInWorkingHours(archived, history, 'týden'), 1);
  assert.ok(Math.abs(h.calculateActiveMinutesForDay(archived, history, at(14, 0)) - 120) < 0.001);
  assert.ok(Math.abs(h.calculateActiveMinutesInWorkingWindow(archived, history, at(14, 7), at(15, 7)) - 120) < 0.001);
  archived.completedOperations.push({ startedAt: at(14, 11).toISOString(), endedAt: at(14, 12).toISOString() });
  assert.equal(h.countOperationsForDay(archived, history, at(14, 0)), 2, 'A separate later operation remains a separate count');
});

test('archived cycles are clipped by interval overlap but counts belong to their start day', () => {
  const archived = { ...room(), completedOperations: [
    { startedAt: at(14, 6).toISOString(), endedAt: at(14, 8).toISOString() },
    { startedAt: at(1, 8).toISOString(), endedAt: at(1, 10).toISOString() },
  ] };
  assert.equal(h.calculateActiveMinutesForDay(archived, [], at(14, 0)), 60);
  assert.equal(h.countOperationsForDay(archived, [], at(14, 0)), 0);
  assert.equal(h.countOperationsForDay(archived, [], at(13, 0)), 1);
  assert.equal(h.countOperationsInWorkingHours(archived, [], 'týden'), 1);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(archived, [], at(14, 7), at(14, 8)), 60);
});

test('malformed archives and other-room metadata are ignored', () => {
  const archived = { ...room(), completedOperations: [
    { startedAt: 'bad', endedAt: at(14, 10).toISOString() },
    { startedAt: at(14, 10).toISOString(), endedAt: at(14, 9).toISOString() },
    { startedAt: at(14, 10).toISOString(), endedAt: at(14, 10).toISOString() },
  ] };
  const history = [{ ...event('operation_completed', 14, 10), operating_room_id: 'other', duration_seconds: 3600 },
    { ...event('operation_completed', 14, 10), metadata: { startedAt: 'bad', endedAt: at(14, 10).toISOString() } }];
  assert.equal(h.countOperationsForDay(archived, history, at(14, 0)), 0);
  assert.equal(h.calculateActiveMinutesForDay(archived, history, at(14, 0)), 0);
});

test('custom workflow phase seven remains an authoritative running operation; only ready zero is excluded', () => {
  const running = { ...room(), currentStepIndex: 7, operationStartedAt: at(15, 11).toISOString() };
  assert.equal(h.calculateActiveMinutesForDay(running, [], at(15, 0)), 60);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(running, [], at(15, 7), at(16, 7)), 60);
  const ready = { ...running, currentStepIndex: 0 };
  assert.equal(h.calculateActiveMinutesForDay(ready, [], at(15, 0)), 0);
});

test('a still-running cycle retains the previous operational day and never extends beyond now', () => {
  const running = { ...room(), currentStepIndex: 2, operationStartedAt: at(14, 23).toISOString() };
  assert.equal(h.calculateActiveMinutesForDay(running, [], at(14, 0)), 480);
  assert.equal(h.calculateActiveMinutesForDay(running, [], at(15, 0)), 300);
  assert.equal(h.calculateActiveMinutesForDay(running, [], at(16, 0)), 0);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(running, [], at(14, 7), at(15, 7)), 480);
});

test('an interval ending exactly at the day start contributes neither minutes nor a started operation', () => {
  const history = [event('operation_start', 14, 6), event('operation_end', 14, 7)];
  assert.equal(h.calculateActiveMinutesForDay(room(), history, at(14, 0)), 0);
  assert.equal(h.countOperationsForDay(room(), history, at(14, 0)), 0);
});

test('a confirmed completion is not extended by a stale running snapshot for the same start', () => {
  const stale = { ...room(), currentStepIndex: 2, operationStartedAt: at(14, 8).toISOString() };
  const history = [event('operation_start', 14, 8), event('operation_end', 14, 10)];
  assert.equal(h.calculateActiveMinutesForDay(stale, history, at(14, 0)), 120);
  assert.equal(h.calculateActiveMinutesInWorkingWindow(stale, history, at(14, 7), at(15, 7)), 120);
});
