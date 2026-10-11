import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

const acute = load('lib/acute-requests.ts');
const cycles = load('lib/acute-module-cycles.ts', { './acute-requests': acute });
const protocol = load('lib/acute-cycle-links.ts');
const days = load('lib/acute-day-view.ts');
const request = (id, changes = {}) => ({
  id, hospitalId: 'qa-hospital', reference: '', procedureName: `Request ${id}`, department: 'QA', description: '',
  urgency: 'urgent', estimatedDurationMinutes: 120, clinicalDecisionAt: null, latestStartAt: null,
  proposedRoomId: null, proposedStartAt: null, receivedAt: '2026-10-09T09:00:00Z',
  status: 'pending', queuePosition: 3, submissionPosition: 17, acknowledgedAt: null, acknowledgedBy: null,
  createdBy: 'qa-user', updatedAt: '2026-10-09T09:00:00Z', revision: 1, ...changes,
});
const link = (requestId, changes = {}) => ({
  requestId, hospitalId: 'qa-hospital', roomId: 'actual-room', operationStartedAt: '2026-10-09T10:00:00Z',
  startedAt: '2026-10-09T10:00:00.001Z', startEventId: `start-${requestId}`,
  endedAt: '2026-10-09T11:00:30.001Z', endEventId: `end-${requestId}`,
  procedureName: `Frozen procedure ${requestId}`, urgency: 'emergent', submissionPosition: 23, ...changes,
});
const project = (requests, links = [], selectedDay = '2026-10-09', window) => {
  const partition = cycles.partitionAcuteModuleRequests(requests, links, window);
  return days.projectAcuteDayView(partition, requests, selectedDay);
};
const ids = values => values.map(value => value.id ?? value.requestId);

test('Prague receipt dates do not depend on the server or browser time zone, including midnight', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Europe/Prague']) {
      process.env.TZ = zone;
      assert.equal(days.acutePragueDateKey('2026-10-08T21:59:59.999Z'), '2026-10-08');
      assert.equal(days.acutePragueDateKey('2026-10-08T22:00:00.000Z'), '2026-10-09');
      assert.equal(days.acutePragueDateKey('2026-12-08T22:59:59.999Z'), '2026-12-08');
      assert.equal(days.acutePragueDateKey('2026-12-08T23:00:00.000Z'), '2026-12-09');
      assert.equal(days.acutePragueDateKey(new Date('2026-10-08T22:00:00Z')), '2026-10-09');
      assert.equal(days.acutePragueDateKey(Date.parse('2026-10-08T22:00:00Z')), '2026-10-09');
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('spring and autumn DST changes keep both real instants in their Prague calendar day', () => {
  for (const timestamp of ['2026-03-29T00:30:00Z', '2026-03-29T01:30:00Z']) {
    assert.equal(days.acutePragueDateKey(timestamp), '2026-03-29');
  }
  for (const timestamp of ['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z']) {
    assert.equal(days.acutePragueDateKey(timestamp), '2026-10-25');
  }
  assert.equal(days.acutePragueDateKey('2026-03-29T21:59:59.999Z'), '2026-03-29');
  assert.equal(days.acutePragueDateKey('2026-03-29T22:00:00Z'), '2026-03-30');
  assert.equal(days.acutePragueDateKey('2026-10-25T22:59:59.999Z'), '2026-10-25');
  assert.equal(days.acutePragueDateKey('2026-10-25T23:00:00Z'), '2026-10-26');
});

test('cycle query unions selected day with today-based Prague history even on a UTC server', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Europe/Prague']) {
      process.env.TZ = zone;
      const now = Date.parse('2026-10-08T22:30:00Z');
      const history = days.acuteDayCycleQueryWindow(now, '2026-10-09');
      assert.deepEqual(history, {
        startMs: Date.parse('2026-09-09T22:00:00Z'), endMs: Date.parse('2026-10-09T22:00:00Z'),
      });
      assert.deepEqual(days.acuteDayCycleQueryWindow(now, '2026-09-01'), {
        startMs: Date.parse('2026-08-31T22:00:00Z'), endMs: history.endMs,
      });
      assert.deepEqual(days.acuteDayCycleQueryWindow(now, '2026-09-29'), history);
      assert.deepEqual(days.acuteDayCycleQueryWindow(now + 60_000, '2026-09-01'),
        days.acuteDayCycleQueryWindow(now, '2026-09-01'), 'Minute ticks cannot shift the query');
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('cycle query uses Prague midnight through DST and remains inside the validated API range', () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const spring = days.acuteDayCycleQueryWindow(Date.parse('2026-03-29T14:30:00Z'), '2026-03-29');
    assert.deepEqual(spring, {
      startMs: Date.parse('2026-02-27T23:00:00Z'), endMs: Date.parse('2026-03-29T22:00:00Z'),
    });
    assert.equal(spring.endMs - spring.startMs, 30 * 86_400_000 - 3_600_000);
    const autumn = days.acuteDayCycleQueryWindow(Date.parse('2026-10-25T14:30:00Z'), '2026-10-25');
    assert.deepEqual(autumn, {
      startMs: Date.parse('2026-09-25T22:00:00Z'), endMs: Date.parse('2026-10-25T23:00:00Z'),
    });
    assert.equal(autumn.endMs - autumn.startMs, 30 * 86_400_000 + 3_600_000);
    const annualSpring = days.acuteDayCycleQueryWindow(Date.parse('2026-03-29T14:30:00Z'), '2025-03-30', 365);
    assert.equal(annualSpring.endMs - annualSpring.startMs, 365 * 86_400_000 - 3_600_000);
    const annualAutumn = days.acuteDayCycleQueryWindow(Date.parse('2026-10-25T14:30:00Z'), '2025-10-26', 365);
    assert.equal(annualAutumn.endMs - annualAutumn.startMs, 365 * 86_400_000 + 3_600_000);
    for (const window of [spring, autumn, annualSpring, annualAutumn]) {
      assert.doesNotThrow(() => protocol.validateAcuteCycleWindow(
        new Date(window.startMs).toISOString(), new Date(window.endMs).toISOString(),
      ));
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('cycle query accepts the inclusive 365-day selection boundary and rejects unsupported dates or periods', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  assert.deepEqual(days.acuteDayCycleQueryWindow(now, '2025-10-10'), {
    startMs: Date.parse('2025-10-09T22:00:00Z'), endMs: Date.parse('2026-10-09T22:00:00Z'),
  });
  for (const key of ['2025-10-09', '2026-10-10', '2026-02-30', 'bad']) {
    assert.throws(() => days.acuteDayCycleQueryWindow(now, key), RangeError);
  }
  assert.throws(() => days.acuteDayCycleQueryWindow(NaN, '2026-10-09'), RangeError);
  for (const historyDays of [0, 1, 366, -1]) {
    assert.throws(() => days.acuteDayCycleQueryWindow(now, '2026-10-09', historyDays), RangeError);
  }
});

test('day selection defaults missing, invalid and future candidates to Prague today across browser time zones', () => {
  const previousZone = process.env.TZ;
  const now = Date.parse('2026-10-08T22:30:00Z');
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Kiritimati', 'Europe/Prague']) {
      process.env.TZ = zone;
      assert.equal(days.clampAcuteDaySelection(now), '2026-10-09');
      for (const candidate of [null, '', 'bad', '2026-02-30', '2026-1-9', '2026-10-09T00:00:00Z', '2026-10-10', '9999-12-31']) {
        assert.equal(days.clampAcuteDaySelection(now, candidate), '2026-10-09', `${zone}: ${candidate}`);
      }
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('day selection preserves supported dates and clamps older dates to the inclusive 365-day boundary', () => {
  const now = Date.parse('2026-10-09T12:00:00Z');
  for (const candidate of ['2026-10-09', '2026-10-08', '2026-03-29', '2025-10-10']) {
    assert.equal(days.clampAcuteDaySelection(now, candidate), candidate);
  }
  for (const candidate of ['2025-10-09', '2024-02-29', '0001-01-01']) {
    const selected = days.clampAcuteDaySelection(now, candidate);
    assert.equal(selected, '2025-10-10');
    assert.doesNotThrow(() => days.acuteDayCycleQueryWindow(now, selected));
  }
});

test('an oldest selected day advances safely at Prague midnight through seasonal offsets and DST', () => {
  const previousZone = process.env.TZ;
  const midnights = [
    ['2026-10-08T21:59:59.999Z', '2026-10-08T22:00:00Z', '2026-10-08', '2026-10-09', '2025-10-09', '2025-10-10'],
    ['2026-12-08T22:59:59.999Z', '2026-12-08T23:00:00Z', '2026-12-08', '2026-12-09', '2025-12-09', '2025-12-10'],
    ['2026-03-29T21:59:59.999Z', '2026-03-29T22:00:00Z', '2026-03-29', '2026-03-30', '2025-03-30', '2025-03-31'],
    ['2026-10-25T22:59:59.999Z', '2026-10-25T23:00:00Z', '2026-10-25', '2026-10-26', '2025-10-26', '2025-10-27'],
  ];
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Europe/Prague']) {
      process.env.TZ = zone;
      for (const [beforeTimestamp, afterTimestamp, beforeDay, afterDay, oldest, nextOldest] of midnights) {
        const before = Date.parse(beforeTimestamp);
        const after = Date.parse(afterTimestamp);
        assert.equal(days.clampAcuteDaySelection(before), beforeDay);
        assert.equal(days.clampAcuteDaySelection(after), afterDay);
        assert.equal(days.clampAcuteDaySelection(before, oldest), oldest);
        assert.doesNotThrow(() => days.acuteDayCycleQueryWindow(before, oldest));
        assert.throws(() => days.acuteDayCycleQueryWindow(after, oldest), RangeError);
        const selected = days.clampAcuteDaySelection(after, oldest);
        assert.equal(selected, nextOldest, `${zone}: ${afterTimestamp}`);
        assert.doesNotThrow(() => days.acuteDayCycleQueryWindow(after, selected));
      }
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('picker Dates preserve the requested local day across time zones without UTC date-string parsing', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Kiritimati', 'Europe/Prague']) {
      process.env.TZ = zone;
      for (const key of ['2026-03-29', '2026-10-25', '2026-10-09', '2028-02-29']) {
        const date = days.acutePickerDateFromKey(key);
        assert.ok(date instanceof Date);
        assert.equal(date.getHours(), 12);
        assert.equal(days.acutePickerDateKey(date), key);
      }
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
  for (const key of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-9', 'bad', '']) {
    assert.equal(days.isAcuteDayKey(key), false);
    assert.equal(days.acutePickerDateFromKey(key), null);
  }
  assert.equal(days.acutePickerDateKey(new Date(NaN)), null);
});

test('selected-day cards retain queue rank while old waiting and begun requests remain in History', () => {
  const requests = [
    request('today-last', { queuePosition: 8 }),
    request('old-waiting', { queuePosition: 1, receivedAt: '2026-10-07T09:00:00Z' }),
    request('today-first', { queuePosition: 4 }),
    request('old-running', { receivedAt: '2026-10-08T09:00:00Z' }),
    request('today-running'), request('today-done'),
  ];
  const links = [link('old-running', { endedAt: null, endEventId: null }),
    link('today-running', { endedAt: null, endEventId: null }), link('today-done')];
  const view = project(requests, links);
  assert.deepEqual(ids(view.partition.waiting), ['today-first', 'today-last']);
  assert.deepEqual(view.partition.waiting.map(item => item.queuePosition), [4, 8]);
  assert.deepEqual(ids(view.otherDayWaiting), ['old-waiting']);
  assert.deepEqual(ids(view.otherDayBegun), ['old-running']);
  assert.deepEqual(ids(view.partition.begun), ['today-running']);
  assert.deepEqual(ids(view.partition.performed), ['today-done']);
  assert.deepEqual(ids(view.fullPartition.waiting), ['old-waiting', 'today-first', 'today-last']);
  const old = project(requests, links, '2026-10-08');
  assert.deepEqual(ids(old.partition.begun), ['old-running']);
  assert.deepEqual(ids(old.otherDayWaiting), ['old-waiting', 'today-first', 'today-last']);
});

test('edits, proposals, completion and later cycle times do not move a known request from its receipt day', () => {
  const requests = [request('edited', {
    receivedAt: '2026-10-07T22:30:00Z', updatedAt: '2026-10-09T15:00:00Z',
    proposedStartAt: '2026-10-10T09:00:00Z', status: 'completed',
  })];
  const evidence = link('edited', { startedAt: '2026-10-09T23:30:00Z', endedAt: '2026-10-10T01:00:00Z' });
  assert.deepEqual(days.acuteCycleDay(evidence, requests[0]), { dayKey: '2026-10-08', source: 'receivedAt' });
  const receiptDay = project(requests, [evidence], '2026-10-08');
  assert.deepEqual(ids(receiptDay.partition.performed), ['edited']);
  assert.deepEqual(receiptDay.archived, [{ request: requests[0], dayKey: '2026-10-08' }]);
  assert.equal(project(requests, [evidence], '2026-10-10').partition.performed.length, 0);
});

test('unknown request cycles use only immutable startedAt and cannot borrow a different hospital receipt', () => {
  const evidence = link('archive-missing', { startedAt: '2026-10-08T22:30:00Z', endedAt: '2026-10-10T00:00:00Z' });
  assert.deepEqual(days.acuteCycleDay(evidence), { dayKey: '2026-10-09', source: 'startedAt' });
  assert.deepEqual(days.acuteCycleDay(evidence, request('archive-missing', {
    hospitalId: 'other-hospital', receivedAt: '2026-10-07T09:00:00Z',
  })), { dayKey: '2026-10-09', source: 'startedAt' });
  assert.deepEqual(days.acuteCycleDay(evidence, request('archive-missing', { receivedAt: 'bad' })), {
    dayKey: '2026-10-09', source: 'startedAt',
  });
  assert.deepEqual(days.acuteCycleDay({ ...evidence, startedAt: 'bad' }), { dayKey: null, source: 'unknown' });
  assert.deepEqual(ids(project([], [evidence]).partition.performed), ['archive-missing']);
  assert.equal(project([], [evidence]).activityByDay.size, 0, 'A cycle fallback does not invent an archived request');
});

test('calendar activity counts only actual dated requests, including archives and active requests of other days', () => {
  const requests = [request('waiting'), request('running'), request('done', { status: 'completed' }),
    request('cancelled', { status: 'cancelled', receivedAt: '2026-10-08T22:30:00Z' }),
    request('older', { receivedAt: '2026-10-08T09:00:00Z' }), request('invalid', { receivedAt: 'bad' })];
  const view = project(requests, [link('running', { endedAt: null, endEventId: null }), link('done'), link('not-in-snapshot')]);
  assert.deepEqual([...view.activityByDay.keys()].sort(), ['2026-10-08', '2026-10-09']);
  assert.deepEqual(view.activityByDay.get('2026-10-09'), { requests: 4, waiting: 1, begun: 1, performed: 1, archived: 2 });
  assert.deepEqual(view.activityByDay.get('2026-10-08'), { requests: 1, waiting: 1, begun: 0, performed: 0, archived: 0 });
  assert.deepEqual(ids(view.otherDayWaiting), ['older', 'invalid']);
  assert.deepEqual(view.archived.map(item => [item.request.id, item.dayKey]), [['done', '2026-10-09'], ['cancelled', '2026-10-09']]);
  assert.equal(view.activityByDay.has('2026-10-10'), false);
});

test('supplemental completed cycles obey receipt day while the full period partition stays intact', () => {
  const requests = [request('old-active', { receivedAt: '2026-01-02T09:00:00Z' }), request('current')];
  const old = link('old-active', { startedAt: '2026-01-02T10:00:00Z', endedAt: '2026-01-02T11:00:00Z' });
  const window = cycles.acuteModuleCycleWindow(Date.parse('2026-10-09T12:00:00Z'));
  const view = project(requests, [old], '2026-01-02', window);
  assert.deepEqual(ids(view.partition.performed), ['old-active']);
  assert.deepEqual(ids(view.partition.supplementalPerformed), ['old-active']);
  assert.deepEqual(ids(view.fullPartition.performed), ['old-active']);
  assert.deepEqual(ids(project(requests, [old], '2026-10-09', window).partition.supplementalPerformed), []);
});

test('unknown dates cannot leak into a selected day and invalid selection leaves all active records in History', () => {
  for (const value of ['bad', '2026-02-30T09:00:00Z', '2026-10-09T09:00:00', '2026-10-09', '']) {
    assert.equal(days.acutePragueDateKey(value), null);
  }
  for (const value of [NaN, Infinity, new Date(NaN)]) assert.equal(days.acutePragueDateKey(value), null);
  const view = project([request('actual')], [link('begun', { endedAt: null, endEventId: null })], '2026-02-30');
  assert.equal(view.selectedDayKey, null);
  assert.deepEqual(view.partition, { waiting: [], begun: [], performed: [], supplementalPerformed: [] });
  assert.deepEqual(ids(view.otherDayWaiting), ['actual']);
  assert.deepEqual(ids(view.otherDayBegun), ['begun']);
});

test('projection does not mutate source requests, cycle evidence, partition arrays or queue positions', () => {
  const requests = Object.freeze([request('today-last', { queuePosition: 9 }),
    request('old', { queuePosition: 2, receivedAt: '2026-10-07T09:00:00Z' }),
    request('today-first', { queuePosition: 5 }), request('bound')].map(Object.freeze));
  const links = Object.freeze([Object.freeze(link('bound'))]);
  const partition = cycles.partitionAcuteModuleRequests(requests, links);
  for (const array of Object.values(partition)) Object.freeze(array);
  Object.freeze(partition);
  const before = structuredClone({ requests, links, partition });
  const view = days.projectAcuteDayView(partition, requests, '2026-10-09');
  assert.equal(view.fullPartition, partition);
  assert.notEqual(view.partition.waiting, partition.waiting);
  assert.equal(view.partition.waiting[0], requests[2]);
  assert.equal(view.partition.performed[0], links[0]);
  assert.deepEqual({ requests, links, partition }, before);
  view.partition.waiting.reverse();
  assert.deepEqual({ requests, links, partition }, before, 'Display arrays are detached from the operational queue');
});
