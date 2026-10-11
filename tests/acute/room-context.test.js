import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

const acute = load('lib/acute-requests.ts');
const { getAcuteRoomContext } = load('lib/acute-room-context.ts', { './acute-requests': acute });
const request = (overrides = {}) => ({
  id: 'request-1', hospitalId: 'hospital-1', status: 'pending', queuePosition: 1,
  submissionPosition: 1, proposedRoomId: 'room-1', receivedAt: '2026-10-08T07:00:00Z',
  procedureName: 'Výkon 1', department: 'Chirurgie', reference: '', description: '',
  urgency: 'urgent', estimatedDurationMinutes: 60, clinicalDecisionAt: null,
  latestStartAt: null, proposedStartAt: null, acknowledgedAt: null,
  acknowledgedBy: null, createdBy: 'user-1', updatedAt: '2026-10-08T07:00:00Z',
  revision: 1, ...overrides,
});
const context = (requests, id = 'request-1', roomId = 'room-1', hospitalId = 'hospital-1') => (
  getAcuteRoomContext(requests, id, roomId, hospitalId)
);

test('detail context requires an actual selected active request, room and hospital', () => {
  const input = request();
  assert.equal(context([input], null), null);
  assert.equal(context([input], 'missing'), null);
  assert.equal(context([input], input.id, 'room-2'), null);
  assert.equal(context([input], input.id, 'room-1', null), null);
  assert.equal(context([input], input.id, 'room-1', 'hospital-2'), null);
  assert.equal(context([input], input.id, ''), null);
  for (const status of ['completed', 'cancelled']) assert.equal(context([request({ status })]), null);
  for (const status of ['pending', 'acknowledged']) assert.equal(context([request({ status })]).selectedRequest.status, status);
});

test('hospital filtering protects selection and following queue even when room/request names overlap', () => {
  const inputs = [
    request({ hospitalId: 'hospital-2' }),
    request({ id: 'selected', queuePosition: 2 }),
    request({ id: 'foreign-following', hospitalId: 'hospital-2', queuePosition: 3 }),
    request({ id: 'following', queuePosition: 4, proposedRoomId: 'room-2' }),
  ];
  assert.equal(context(inputs), null);
  assert.deepEqual(context(inputs, 'selected').followingRequests.map(item => item.id), ['following']);
});

test('ribbon follows the current operational order, not submission number or receipt date', () => {
  const selected = request({ queuePosition: 2, submissionPosition: 9 });
  const inputs = [
    request({ id: 'later', queuePosition: 3, submissionPosition: 1, receivedAt: '2026-10-01T07:00:00Z' }),
    selected,
    request({ id: 'before', queuePosition: 1, receivedAt: '2026-10-09T07:00:00Z' }),
  ];
  const selectedOutOfOrder = context(inputs);
  assert.deepEqual(selectedOutOfOrder.followingRequests.map(item => item.id), ['before', selected.id, 'later']);
  assert.equal(selectedOutOfOrder.orderWarning.selectedPosition, 2);
  assert.equal(selectedOutOfOrder.orderWarning.firstRequest.id, 'before');
  const reordered = inputs.map(item => item.id === 'before' ? { ...item, queuePosition: 4 } : item);
  assert.deepEqual(context(reordered).followingRequests.map(item => item.id), ['later', 'before']);
  assert.equal(context(reordered).orderWarning, undefined);
  assert.equal(context(reordered).selectedRequest.submissionPosition, 9);
});

test('receipt timestamps and proposed times do not hide genuinely active requests', () => {
  const inputs = [
    request({ receivedAt: '2025-01-01T00:00:00Z', proposedStartAt: '2099-01-01T00:00:00Z' }),
    request({ id: 'future-receipt', queuePosition: 2, receivedAt: '2099-01-01T00:00:00Z' }),
    request({ id: 'old-receipt', queuePosition: 3, receivedAt: '2020-01-01T00:00:00Z' }),
  ];
  assert.deepEqual(context(inputs).followingRequests.map(item => item.id), ['future-receipt', 'old-receipt']);
});

test('following queue retains real unassigned requests and excludes closed requests', () => {
  const inputs = [
    request(),
    request({ id: 'unassigned', proposedRoomId: null, queuePosition: 2 }),
    request({ id: 'completed', status: 'completed', queuePosition: 3 }),
    request({ id: 'cancelled', status: 'cancelled', queuePosition: 4 }),
    request({ id: 'other-room', proposedRoomId: 'room-2', queuePosition: 5 }),
  ];
  const result = context(inputs);
  assert.deepEqual(result.followingRequests.map(item => item.id), ['unassigned', 'other-room']);
  assert.equal(result.followingRequests[0].proposedRoomId, null, 'UI must honestly label the lack of an assigned room');
});

test('missing queue positions stay last without fabricated ranks or mutation', () => {
  const selected = Object.freeze(request());
  const unknown = Object.freeze(request({ id: 'unknown-rank', queuePosition: null, submissionPosition: 22 }));
  const ranked = Object.freeze(request({ id: 'ranked', queuePosition: 2, proposedRoomId: 'room-2' }));
  const inputs = Object.freeze([unknown, selected, ranked]);
  const before = structuredClone(inputs);
  const result = context(inputs);
  assert.equal(result.selectedRequest, selected);
  assert.deepEqual(result.followingRequests.map(item => item.id), ['ranked', 'unknown-rank']);
  assert.equal(result.followingRequests[1].queuePosition, null);
  assert.deepEqual(inputs, before);
  assert.notEqual(result.followingRequests, inputs);
  const unknownSelection = context(inputs, 'unknown-rank');
  assert.deepEqual(unknownSelection.followingRequests.map(item => item.id), [selected.id, 'ranked', 'unknown-rank']);
  assert.equal(unknownSelection.orderWarning.selectedPosition, null, 'No rank can be fabricated from submission order');
});

test('reassignment or closure immediately invalidates the prior selected-room context', () => {
  assert.ok(context([request()]));
  assert.equal(context([request({ proposedRoomId: 'room-2' })]), null);
  assert.equal(context([request({ proposedRoomId: null })]), null);
  assert.equal(context([request({ status: 'completed' })]), null);
});

test('persisted binding freezes actual room/identity and excludes bound requests from the following queue', () => {
  const link = { requestId: 'request-1', hospitalId: 'hospital-1', roomId: 'room-1', procedureName: 'Skutečně provedený výkon', urgency: 'emergent', submissionPosition: 7 };
  const selected = request({ proposedRoomId: 'room-2', procedureName: 'Pozdější úprava', urgency: 'urgent' });
  const next = request({ id: 'next', queuePosition: 2 });
  const waiting = request({ id: 'waiting', queuePosition: 3 });
  const links = [link, { ...link, requestId: 'next' }];
  const result = getAcuteRoomContext([selected, next, waiting], selected.id, 'room-1', 'hospital-1', links);
  assert.equal(result.cycleLink, link);
  assert.equal(result.selectedRequest.procedureName, link.procedureName);
  assert.equal(result.selectedRequest.proposedRoomId, 'room-1');
  assert.equal(result.selectedRequest.urgency, 'emergent');
  assert.deepEqual(result.followingRequests.map(item => item.id), ['waiting']);
  assert.equal(getAcuteRoomContext([selected], selected.id, 'room-2', 'hospital-1', links), null);
});

test('bound head requests do not trigger a warning for the next genuinely waiting request', () => {
  const first = request({ id: 'already-started', queuePosition: 1 });
  const selected = request({ queuePosition: 4, submissionPosition: 1 });
  const next = request({ id: 'next', queuePosition: 6 });
  const link = { requestId: first.id, hospitalId: 'hospital-1', roomId: 'room-1' };
  const result = getAcuteRoomContext([next, selected, first], selected.id, 'room-1', 'hospital-1', [link]);
  assert.equal(result.orderWarning, undefined);
  assert.deepEqual(result.followingRequests.map(item => item.id), [next.id]);
});

test('a linked selection shows all outstanding requests, including ranks before its own, without claiming historical violation', () => {
  const selected = request({ queuePosition: 3 });
  const first = request({ id: 'first', queuePosition: 1 });
  const next = request({ id: 'next', queuePosition: 4 });
  const link = { requestId: selected.id, hospitalId: 'hospital-1', roomId: 'room-1', procedureName: selected.procedureName,
    urgency: selected.urgency, submissionPosition: selected.submissionPosition };
  const result = getAcuteRoomContext([next, selected, first], selected.id, 'room-1', 'hospital-1', [link]);
  assert.equal(result.orderWarning, undefined);
  assert.deepEqual(result.followingRequests.map(item => item.id), [first.id, next.id]);
});

test('out-of-order warning updates with current manual rank, never urgency or submission position', () => {
  const selected = request({ queuePosition: 5, urgency: 'emergent', submissionPosition: 1 });
  const prior = request({ id: 'prior', queuePosition: 2, urgency: 'expedited', submissionPosition: 22 });
  const original = structuredClone([selected, prior]);
  const result = context([selected, prior]);
  assert.equal(result.orderWarning.firstRequest.id, prior.id);
  assert.deepEqual(result.followingRequests.map(item => item.id), [prior.id, selected.id]);
  assert.equal(result.selectedRequest.id, selected.id);
  assert.deepEqual([selected, prior], original, 'Navigation does not reorder or mutate requests');
  assert.equal(context([selected, { ...prior, status: 'cancelled' }]).orderWarning, undefined);
  assert.equal(context([selected, { ...prior, hospitalId: 'other' }]).orderWarning, undefined);
});
