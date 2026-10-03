import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

process.env.TZ = 'Europe/Prague';

const source = readFileSync(new URL('../../lib/timeline-unused-minutes.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'timeline-unused-minutes.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loaded = { exports: {} };
new Function('require', 'exports', 'module', outputText)(name => {
  if (name === '../types') return { DEFAULT_DAILY_BREAK_MINUTES: 30 };
  throw new Error(`Unused minutes must not load ${name}`);
}, loaded.exports, loaded);
const { calculateUnusedOperatingMinutes: unused } = loaded.exports;

const at = (year, month, day, hour, minute = 0) => new Date(year, month - 1, day, hour, minute);
const iso = date => date.toISOString();
const monday = (extra = {}) => ({
  enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30,
  breakMinutes: 30, ...extra,
});
const room = (schedule = { monday: monday() }, extra = {}) => ({
  id: 'sal-1', currentStepIndex: 0, weeklySchedule: schedule,
  completedOperations: [], ...extra,
});
const operation = (start, end) => ({ startedAt: iso(start), endedAt: iso(end), statusHistory: [] });
const onMonday = (hour, minute = 0) => at(2026, 9, 28, hour, minute);

test('elapsed net capacity grows only inside the local shift and stops after it', () => {
  const data = room();
  assert.equal(unused(data, onMonday(6, 59)), 0);
  assert.equal(unused(data, onMonday(7)), 0);
  assert.equal(unused(data, onMonday(10)), 169); // 180 × 480/510
  assert.equal(unused(data, onMonday(15, 30)), 480);
  assert.equal(unused(data, onMonday(20)), 480);
});

test('completed and live intervals are clipped to elapsed shift and counted once when overlapping', () => {
  const data = room({ monday: monday({ endHour: 11, endMinute: 0, breakMinutes: 0 }) }, {
    currentStepIndex: 2,
    operationStartedAt: iso(onMonday(8, 15)),
    completedOperations: [
      operation(onMonday(6, 30), onMonday(7, 30)),
      operation(onMonday(7, 15), onMonday(8)),
      operation(onMonday(8), onMonday(8, 30)),
      operation(onMonday(7, 15), onMonday(8)),
      operation(onMonday(10), onMonday(11)),
      { startedAt: 'invalid', endedAt: iso(onMonday(9)), statusHistory: [] },
      operation(onMonday(9), onMonday(8)),
    ],
  });
  // At 10:00 the union is 07:00–10:00, so no elapsed capacity is unused.
  assert.equal(unused(data, onMonday(10)), 0);
  assert.equal(unused({ ...data, currentStepIndex: 0 }, onMonday(10)), 90);
  assert.equal(unused({ ...data, currentStepIndex: 0 }, onMonday(12)), 90);
});

test('active pause stops the live interval at pausedAt; locked and stale phases do not count', () => {
  const data = room({ monday: monday({ endHour: 12, endMinute: 0, breakMinutes: 0 }) }, {
    currentStepIndex: 2,
    operationStartedAt: iso(onMonday(8)),
    isPaused: true,
    pausedAt: iso(onMonday(9, 15)),
    completedOperations: [operation(onMonday(8, 30), onMonday(9))],
  });
  assert.equal(unused(data, onMonday(10)), 105);
  assert.equal(unused({ ...data, isPaused: false }, onMonday(10)), 60);
  assert.equal(unused({ ...data, isLocked: true }, onMonday(10)), 150);
  assert.equal(unused({ ...data, currentStepIndex: 0 }, onMonday(10)), 150);
  assert.equal(unused({ ...data, currentStepIndex: 6 }, onMonday(10)), 150);
});

test('break is distributed with the same net/gross factor to elapsed and occupied minutes', () => {
  const data = room({ monday: monday({ endHour: 9, endMinute: 0, breakMinutes: 30 }) }, {
    completedOperations: [operation(onMonday(7, 30), onMonday(8))],
  });
  assert.equal(unused(data, onMonday(8, 30)), 45); // (90 - 30) × 90/120
  assert.equal(unused(data, onMonday(10)), 68); // Math.round((120 - 30) × 90/120)
});

test('missing, closed, malformed and zero-capacity schedules have no metric', () => {
  const cases = [
    {},
    { monday: monday({ enabled: false }) },
    { monday: monday({ startHour: 25 }) },
    { monday: monday({ startMinute: 60 }) },
    { monday: monday({ endHour: 7, endMinute: 0 }) },
    { monday: monday({ endHour: 6, endMinute: 0 }) },
    { monday: monday({ endHour: 8, endMinute: 0, breakMinutes: 60 }) },
    { monday: monday({ breakMinutes: Number.NaN }) },
  ];
  for (const schedule of cases) {
    assert.equal(unused(room(schedule), onMonday(10)), null, JSON.stringify(schedule));
  }
  assert.equal(unused(room({ monday: monday({ endHour: 8, endMinute: 0, breakMinutes: -10 }) }), onMonday(10)), 60);
  assert.equal(unused(room(), new Date(NaN)), null);
});

test('day selection and overlap use the local calendar date near midnight', () => {
  const data = room({
    monday: monday({ startHour: 0, endHour: 1, endMinute: 0, breakMinutes: 0 }),
    sunday: monday({ enabled: false }),
  }, {
    completedOperations: [operation(at(2026, 9, 27, 23, 30), onMonday(0, 15))],
  });
  assert.equal(unused(data, onMonday(0, 30)), 15);
});

test('DST spring and autumn shifts count real minutes between local clock boundaries', () => {
  const sundaySchedule = { sunday: {
    enabled: true, startHour: 1, startMinute: 0, endHour: 4, endMinute: 0,
    breakMinutes: 0,
  } };
  const data = room(sundaySchedule);
  assert.equal(unused(data, at(2026, 3, 29, 3, 30)), 90);
  assert.equal(unused(data, at(2026, 3, 29, 4)), 120);
  assert.equal(unused(room(sundaySchedule, {
    completedOperations: [operation(at(2026, 3, 29, 1, 30), at(2026, 3, 29, 3, 30))],
  }), at(2026, 3, 29, 4)), 60);
  assert.equal(unused(data, new Date('2026-10-25T00:30:00Z')), 90);
  assert.equal(unused(data, new Date('2026-10-25T01:30:00Z')), 150);
  assert.equal(unused(data, at(2026, 10, 25, 4)), 240);
  assert.equal(unused(room(sundaySchedule, {
    completedOperations: [{
      startedAt: '2026-10-24T23:30:00Z', endedAt: '2026-10-25T01:30:00Z', statusHistory: [],
    }],
  }), at(2026, 10, 25, 4)), 120);
});
