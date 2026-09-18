import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { roomScope } from './load-room-scope.js';

const { scopeStatisticsRooms, statisticsDayWindow, statisticsPeriodWindow, hasStatisticsRoomCapacity } = roomScope;
const day = new Date(2026, 8, 14);
const window = statisticsDayWindow(day);
const at = (hour, date = day) => { const result = new Date(date); result.setHours(hour, 0, 0, 0); return result.toISOString(); };
const schedule = { monday: { enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 0, breakMinutes: 30 } };
const room = (id, overrides = {}) => ({ id, name: id, currentStepIndex: 0, ...overrides });
const event = (roomId, type, timestamp = at(10), extra = {}) => ({ id: `${roomId}-${type}-${timestamp}`, operating_room_id: roomId, event_type: type, timestamp, step_name: null, duration_seconds: null, ...extra });
const ids = scope => scope.rooms.map(item => item.id);

test('only positive enabled capacity in the chosen day qualifies; missing, disabled and zero schedules do not', () => {
  const rooms = [room('open', { weeklySchedule: schedule }), room('missing'), room('off', { weeklySchedule: { monday: { ...schedule.monday, enabled: false } } }), room('zero', { weeklySchedule: { monday: { ...schedule.monday, endHour: 7, breakMinutes: 0 } } }), room('break-only', { weeklySchedule: { monday: { ...schedule.monday, breakMinutes: 480 } } })];
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, [], window)), ['open']);
  const tuesday = new Date(2026, 8, 15);
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, [], statisticsDayWindow(tuesday))), []);
});

test('ready, housekeeping, staff, notification and pause-only records never prove operation', () => {
  const roomData = room('idle');
  const history = ['staff_change', 'patient_call', 'pause', 'resume', 'emergency_on'].map(type => event('idle', type));
  for (const name of ['Sál připraven', 'PŘIPRAVEN', 'Ready', 'Úklid sálu', 'Mimo provoz', null]) history.push(event('idle', 'step_change', at(11), { step_name: name, duration_seconds: 3600, step_index: 1 }));
  assert.deepEqual(ids(scopeStatisticsRooms([roomData], history, window)), []);
});

test('actual starts, completed ends and measured custom operative phases preserve disabled rooms', () => {
  const rooms = ['start', 'end', 'complete', 'phase', 'zero-phase'].map(id => room(id));
  const history = [event('start', 'operation_start'), event('end', 'operation_end'), event('complete', 'operation_completed'), event('phase', 'step_change', at(11), { step_name: 'Chirurgický výkon', duration_seconds: 3600 }), event('zero-phase', 'step_change', at(11), { step_name: 'Chirurgický výkon', duration_seconds: 0 })];
  const scope = scopeStatisticsRooms(rooms, history, window);
  assert.deepEqual(ids(scope), ['start', 'end', 'complete', 'phase']);
  assert.equal(scope.history.length, 4);
  assert.equal(hasStatisticsRoomCapacity(rooms[0], window), false);
});

test('historical evidence is window-specific, including intervals that cross midnight or a window boundary', () => {
  const previousDay = new Date(2026, 8, 13);
  const nextDay = new Date(2026, 8, 15);
  const history = [event('old', 'operation_start', at(10, previousDay)), event('cross', 'operation_start', at(6)), event('cross', 'operation_end', at(8)), event('phase-cross', 'step_change', at(8), { step_name: 'Výkon', duration_seconds: 7200 }), event('tomorrow', 'operation_start', at(8, nextDay))];
  const rooms = ['old', 'cross', 'phase-cross', 'tomorrow'].map(id => room(id));
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, history, window)), ['cross', 'phase-cross']);
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, history, statisticsDayWindow(previousDay))), ['old', 'cross', 'phase-cross']);
});

test('live authoritative operation may overlap a window but stale ready-state timestamps do not', () => {
  const rooms = [room('running', { currentStepIndex: 2, operationStartedAt: at(6) }), room('paused', { currentStepIndex: 2, operationStartedAt: at(6), isPaused: true }), room('ready', { currentStepIndex: 0, operationStartedAt: at(6) }), room('custom-phase-seven', { currentStepIndex: 7, operationStartedAt: at(6) }), room('future', { currentStepIndex: 2, operationStartedAt: at(12) })];
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, [], window, new Date(at(11)))), ['running', 'paused', 'custom-phase-seven']);
});

test('a paired operation ending exactly at the beginning of a day does not qualify that day', () => {
  const history = [event('closed', 'operation_start', at(6)), event('closed', 'operation_end', at(7))];
  assert.deepEqual(ids(scopeStatisticsRooms([room('closed')], history, window)), []);
});

test('archived metadata and measured completion duration determine actual overlap, not later import time', () => {
  const history = [
    event('boundary', 'operation_completed', at(10), { metadata: { startedAt: at(6), endedAt: at(7) } }),
    event('cross', 'operation_completed', at(10), { metadata: { startedAt: at(6), endedAt: at(8) } }),
    event('duration-boundary', 'operation_completed', at(7), { duration_seconds: 3600 }),
    event('duration-cross', 'operation_completed', at(8), { duration_seconds: 7200 }),
  ];
  const rooms = ['boundary', 'cross', 'duration-boundary', 'duration-cross'].map(id => room(id));
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, history, window)), ['cross', 'duration-cross']);
});

test('real completed snapshot intervals survive disabling, without bringing unrelated old rooms', () => {
  const rooms = [room('complete', { completedOperations: [{ startedAt: at(8), endedAt: at(9) }] }), room('old', { completedOperations: [{ startedAt: '2025-01-01T08:00:00Z', endedAt: '2025-01-01T09:00:00Z' }] })];
  assert.deepEqual(ids(scopeStatisticsRooms(rooms, [], window)), ['complete']);
});

test('an empty scope is safe and does not mutate input arrays or admit unlisted rooms', () => {
  const rooms = Object.freeze([Object.freeze(room('closed'))]);
  const history = Object.freeze([Object.freeze(event('deleted-room', 'operation_start'))]);
  const scope = scopeStatisticsRooms(rooms, history, window);
  assert.deepEqual(ids(scope), []);
  assert.deepEqual(scope.history, []);
  assert.equal(scope.roomIds.size, 0);
  assert.equal(history.length, 1);
});

test('global and local windows retain their distinct rolling, operational-day and calendar-day boundaries', () => {
  assert.equal(statisticsPeriodWindow('měsíc', new Date(at(15))).end - statisticsPeriodWindow('měsíc', new Date(at(15))).start, 30 * 86400000);
  assert.equal(statisticsDayWindow(day).start.getHours(), 7);
  assert.equal(statisticsDayWindow(day, 0).start.getHours(), 0);
});

test('tabs receive all candidates and full calendar evidence before applying their own selected window', () => {
  const source = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
  const parsed = ts.createSourceFile('StatisticsModule.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let tested = 0;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && ['FinanceTab', 'RoomsTab', 'PhasesTab', 'NotificationsTab'].includes(node.tagName.getText(parsed))) {
      const props = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr => [attr.name.getText(parsed), attr.initializer?.expression?.getText(parsed)]));
      assert.equal(props.rooms, 'allRooms');
      assert.equal(props.statusHistory, 'allStatusHistory');
      if (props.calendarHistory) assert.equal(props.calendarHistory, 'allDayHistory');
      tested += 1;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(tested, 10);
  assert.match(source, /aggregateRoomStatistics\(statusHistory\)/);
  assert.match(source, /const dayRooms = dayScope\.rooms/);
});
