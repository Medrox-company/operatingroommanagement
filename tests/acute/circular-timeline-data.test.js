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
const display = load('components/acute/display.ts');
const cycles = load('lib/acute-module-cycles.ts', { './acute-requests': acute });
const { projectAcuteCircularTimeline } = load('lib/acute-circular-timeline.ts', {
  '../components/acute/display': display,
  './acute-module-cycles': cycles,
});
const NOW = Date.parse('2026-10-09T12:00:00Z');
const request = (id, changes = {}) => ({
  id, hospitalId: 'qa-hospital', reference: '', procedureName: `Request ${id}`, department: 'QA', description: '',
  urgency: 'urgent', estimatedDurationMinutes: 120, clinicalDecisionAt: null, latestStartAt: null,
  proposedRoomId: 'proposal-room', proposedStartAt: null, receivedAt: '2026-10-09T09:00:00Z',
  status: 'pending', queuePosition: 3, submissionPosition: 17, acknowledgedAt: null, acknowledgedBy: null,
  createdBy: 'qa-user', updatedAt: '2026-10-09T09:00:00Z', revision: 1,
  ...changes,
});
const link = (requestId, changes = {}) => ({
  requestId, hospitalId: 'qa-hospital', roomId: 'actual-room', operationStartedAt: '2026-10-09T10:00:00Z',
  startedAt: '2026-10-09T10:00:00.001Z', startEventId: `start-${requestId}`,
  endedAt: '2026-10-09T11:00:30.001Z', endEventId: `end-${requestId}`,
  procedureName: `Frozen procedure ${requestId}`, urgency: 'emergent', submissionPosition: 23,
  ...changes,
});
const project = (requests, links = [], window, now = NOW) => projectAcuteCircularTimeline(
  cycles.partitionAcuteModuleRequests(requests, links, window), requests, now,
);

test('all unbound active receipts share real chronology with actual starts and completions, independent of queue rank', () => {
  const requests = [
    request('new-first-ranked', { queuePosition: 1, receivedAt: '2026-10-09T11:30:00Z' }),
    request('old-unassigned', { queuePosition: 9, proposedRoomId: null, receivedAt: '2026-10-09T08:00:00Z' }),
    request('running'), request('done'),
    request('acknowledged', { status: 'acknowledged', receivedAt: '2026-10-09T09:30:00Z' }),
    request('manual-closed', { status: 'completed' }), request('cancelled', { status: 'cancelled' }),
  ];
  const result = project(requests, [link('done'), link('running', { endedAt: null, endEventId: null })]);
  assert.deepEqual(result.map(node => [node.requestId, node.state]), [
    ['old-unassigned', 'waiting'], ['acknowledged', 'waiting'], ['running', 'begun'], ['done', 'performed'],
    ['new-first-ranked', 'waiting'],
  ]);
  assert.equal(result[0].roomId, null, 'A room proposal is not required for an actual receipt');
  assert.equal(result[0].waitingMinutes, 240);
  assert.equal(result[2].anchorAt, '2026-10-09T10:00:00.001Z');
  assert.equal(result[3].anchorAt, '2026-10-09T11:00:30.001Z');
  assert.ok(result.every(node => node.anchorMs === Date.parse(node.anchorAt)));
});

test('cycles use frozen procedure, urgency, submission number and actual room while queue rank remains a snapshot fact', () => {
  const live = request('bound', { procedureName: 'Edited name', urgency: 'expedited', submissionPosition: 99, queuePosition: 8 });
  const evidence = link('bound');
  const [node] = project([live], [evidence]);
  assert.equal(node.procedureName, evidence.procedureName);
  assert.equal(node.urgency, 'emergent');
  assert.equal(node.submissionPosition, 23);
  assert.equal(node.currentQueuePosition, 8);
  assert.equal(node.roomId, 'actual-room');
  assert.equal(node.cycleMinutes, 61);
  assert.deepEqual(node.cycleLink, evidence);
  assert.notEqual(node.cycleLink, evidence);
  assert.equal(Object.isFrozen(node.cycleLink), true);
  assert.equal(node.cycleLink.operationStartedAt, '2026-10-09T10:00:00Z');
});

test('waiting uses the shared whole-minute clock and never turns estimated duration into progress', () => {
  const waiting = request('waiting', { receivedAt: '2026-10-09T11:58:29Z', estimatedDurationMinutes: 1 });
  const [node] = project([waiting]);
  assert.equal(node.waitingMinutes, display.wholeWaitingMinutes(waiting.receivedAt, NOW));
  assert.equal(node.waitingMinutes, 2);
  assert.equal(node.recordedWaitMinutes, null);
  assert.equal(node.cycleMinutes, null);
  assert.equal(node.cycleLink, null);
  const [differentEstimate] = project([{ ...waiting, estimatedDurationMinutes: 1440 }]);
  assert.equal(node.estimatedDurationMinutes, 1);
  assert.equal(differentEstimate.estimatedDurationMinutes, 1440);
  assert.deepEqual({ ...differentEstimate, estimatedDurationMinutes: null }, { ...node, estimatedDurationMinutes: null });
  assert.equal(project([waiting], [], undefined, NaN)[0].waitingMinutes, null);
});

test('begun and completed waiting stops at immutable cycle start and never grows with the live clock', () => {
  for (const changes of [{ endedAt: null, endEventId: null }, {}]) {
    const evidence = link('bound', changes);
    const [before] = project([request('bound')], [evidence]);
    const [after] = project([request('bound')], [evidence], undefined, NOW + 6 * 60 * 60_000);
    assert.equal(before.waitingMinutes, null);
    assert.equal(before.recordedWaitMinutes, 60);
    assert.equal(after.recordedWaitMinutes, 60);
    assert.deepEqual(after, before);
    assert.equal(before.cycleMinutes, before.state === 'performed' ? 61 : null);
  }
  const [zero] = project([request('equal', { receivedAt: '2026-10-09T10:00:00.001Z' })], [link('equal')]);
  assert.equal(zero.recordedWaitMinutes, 0);
});

test('historical cycles remain visible without archived requests and missing or later receipt stays unknown', () => {
  for (const changes of [{ endedAt: null, endEventId: null }, {}]) {
    const evidence = link('missing', changes);
    const [missing] = project([], [evidence]);
    assert.equal(missing.recordedWaitMinutes, null);
    assert.equal(missing.receivedAt, null);
    assert.equal(missing.currentQueuePosition, null);
    for (const receivedAt of ['invalid', '2026-10-09T10:01:00Z']) {
      const [node] = project([request('missing', { receivedAt })], [evidence]);
      assert.equal(node.recordedWaitMinutes, null);
      assert.equal(node.waitingMinutes, null);
    }
    const [differentHospital] = project([request('missing', { hospitalId: 'other-hospital' })], [evidence]);
    assert.equal(differentHospital.recordedWaitMinutes, null);
    assert.equal(differentHospital.currentQueuePosition, null);
  }
});

test('unknown original submission numbers are never inferred from current queue or chronological position', () => {
  const waiting = request('waiting', { submissionPosition: undefined, queuePosition: 7 });
  const bound = request('bound', { submissionPosition: 42 });
  const result = project([waiting, bound], [link('bound', { submissionPosition: null })]);
  assert.deepEqual(result.map(node => node.submissionPosition), [null, null]);
  assert.equal(result[0].currentQueuePosition, 7);
});

test('period selection preserves overlapping real cycles and marks supplemental old active completions', () => {
  const window = { startMs: Date.parse('2026-10-01T00:00:00Z'), endMs: Date.parse('2026-10-10T00:00:00Z') };
  const old = id => link(id, { startedAt: '2026-01-01T10:00:00Z', endedAt: '2026-01-01T11:00:00Z' });
  const overlapping = link('overlap', { startedAt: '2026-09-30T23:00:00Z', endedAt: '2026-10-01T01:00:00Z' });
  const result = project([request('old-active'), request('waiting')], [old('old-active'), old('old-closed'), overlapping, link('archived')], window);
  assert.deepEqual(result.map(node => node.requestId), ['old-active', 'overlap', 'waiting', 'archived']);
  assert.deepEqual(result.map(node => node.supplementalPerformed), [true, false, false, false]);
  assert.equal(result[0].recordedWaitMinutes, null, 'A receipt after an old start cannot become fabricated waiting');
  assert.equal(result[1].cycleMinutes, 120);
});

test('invalid placement anchors and incomplete lifecycle evidence never fabricate timeline nodes', () => {
  const requests = [request('invalid-receipt', { receivedAt: 'bad' }), request('bad-start'), request('bad-end'),
    request('missing-end-event'), request('manual-closed', { status: 'completed' })];
  const links = [link('bad-start', { startedAt: 'bad', endedAt: null, endEventId: null }),
    link('bad-end', { endedAt: 'bad' }), link('missing-end-event', { endEventId: null })];
  assert.deepEqual(project(requests, links), []);
  assert.deepEqual(projectAcuteCircularTimeline({ waiting: [], begun: [links[0]], performed: links.slice(1), supplementalPerformed: [] }, requests, NOW), []);
  const [short] = project([], [link('short', { endedAt: '2026-10-09T10:00:09.001Z' })]);
  assert.equal(short.cycleMinutes, 0, 'A recorded cycle below 30 seconds honestly rounds to zero');
});

test('equal timestamps use deterministic stable identities across input reorder and clock ticks', () => {
  const instant = '2026-10-09T11:00:00Z';
  const requests = ['z', 'a', 'm'].map((id, index) => request(id, { receivedAt: instant, queuePosition: 3 - index }));
  const evidence = link('done', { endedAt: instant });
  const result = project(requests, [evidence]);
  assert.deepEqual(result.map(node => node.id), ['cycle:done:start-done', 'request:a', 'request:m', 'request:z']);
  assert.deepEqual(project([...requests].reverse(), [evidence]).map(node => node.id), result.map(node => node.id));
  assert.deepEqual(project(requests, [evidence], undefined, NOW + 60_000).map(node => node.id), result.map(node => node.id));
  const begun = link('done', { endedAt: null, endEventId: null });
  assert.equal(project([], [begun])[0].id, project([], [evidence])[0].id);
});

test('projection preserves frozen input arrays, request snapshots and all immutable evidence', () => {
  const requests = Object.freeze([request('waiting'), request('bound')].map(Object.freeze));
  const links = Object.freeze([Object.freeze(link('bound'))]);
  const partition = cycles.partitionAcuteModuleRequests(requests, links);
  for (const entries of Object.values(partition)) Object.freeze(entries);
  Object.freeze(partition);
  const before = structuredClone({ requests, links, partition });
  const result = projectAcuteCircularTimeline(partition, requests, NOW);
  assert.equal(result.length, 2);
  assert.deepEqual({ requests, links, partition }, before);
});
