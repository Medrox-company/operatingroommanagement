import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const acute = load('lib/acute-requests.ts');
const dashboard = load('lib/acute-dashboard.ts', { './acute-requests': acute });
const constants = load('components/timeline/constants.ts');
const display = load('components/acute/display.ts');
const styleNames = ['badge', 'mobile', 'heading', 'dot', 'count', 'detail', 'procedure', 'rank'];
const badge = load('components/room/AcuteDashboardBadge.tsx', {
  react: React, '../../lib/acute-dashboard': dashboard, '../acute/display': display, '../timeline/constants': constants,
  './acute-dashboard-badge.module.css': { __esModule: true, default: Object.fromEntries(styleNames.map(name => [name, name])) },
});
const room = (id = 'room-1', changes = {}) => ({ id, name: `Skutečný ${id}`, currentStepIndex: 0, operationStartedAt: null, ...changes });
const request = (changes = {}) => ({
  id: 'request-1', hospitalId: 'hospital-1', status: 'pending', queuePosition: 1, submissionPosition: 22,
  proposedRoomId: 'room-1', receivedAt: '2026-10-08T07:00:00Z', procedureName: 'Skutečný výkon', urgency: 'urgent', ...changes,
});
const link = (changes = {}) => ({
  requestId: 'linked-request', hospitalId: 'hospital-1', roomId: 'room-1', operationStartedAt: '2026-10-08T09:00:00Z',
  startedAt: '2026-10-08T09:00:00.001Z', endedAt: null, procedureName: 'Skutečně probíhající výkon', urgency: 'emergent', ...changes,
});
const project = (requests, links = [], rooms = [room()], hospitalId = 'hospital-1') => dashboard.getAcuteDashboardByRoom(requests, links, rooms, hospitalId);
const renderBadge = (summary, props = {}) => renderToStaticMarkup(React.createElement(badge.default, { summary, ...props }));

test('room badges only project actual assigned active requests in the authorized hospital', () => {
  const inputs = [request(), request({ id: 'ack', status: 'acknowledged', queuePosition: 2 }),
    request({ id: 'closed', status: 'completed' }), request({ id: 'cancelled', status: 'cancelled' }),
    request({ id: 'unassigned', proposedRoomId: null }), request({ id: 'missing-room', proposedRoomId: 'invented' }),
    request({ id: 'foreign', hospitalId: 'other' })];
  assert.deepEqual([...project(inputs).keys()], ['room-1']);
  assert.deepEqual(project(inputs).get('room-1').pendingRequests.map(item => item.id), ['request-1', 'ack']);
  assert.equal(project(inputs, [], [room()], null).size, 0);
  assert.equal(project(inputs, [], []).size, 0);
});

test('each room uses global current queue rank, never submission number, urgency or array order', () => {
  const inputs = Object.freeze([
    Object.freeze(request({ id: 'last', queuePosition: 8, submissionPosition: 1, urgency: 'emergent' })),
    Object.freeze(request({ id: 'other-room', proposedRoomId: 'room-2', queuePosition: 3 })),
    Object.freeze(request({ id: 'first', queuePosition: 2, submissionPosition: 19, urgency: 'expedited' })),
    Object.freeze(request({ id: 'unknown-rank', queuePosition: null })),
  ]);
  const before = structuredClone(inputs);
  const result = project(inputs, [], [room(), room('room-2')]);
  assert.deepEqual(result.get('room-1').pendingRequests.map(item => item.id), ['first', 'last', 'unknown-rank']);
  assert.deepEqual(result.get('room-2').pendingRequests.map(item => item.id), ['other-room']);
  assert.deepEqual(inputs, before);
  assert.match(renderBadge(result.get('room-1')), /Pořadí 2/);
  assert.doesNotMatch(renderBadge(result.get('room-1')), /Pořadí 19/);
});

test('real active cycle is distinguished from estimates and requires the exact current start', () => {
  const current = room('room-1', { currentStepIndex: 2, operationStartedAt: '2026-10-08T09:00:00Z' });
  const currentLink = link();
  const active = project([request({ id: 'linked-request' })], [currentLink], [current]).get(current.id);
  assert.equal(active.activeCycle, currentLink);
  assert.equal(active.pendingRequests.length, 0);
  assert.match(renderBadge(active), /Akutní · probíhá/);
  assert.match(renderBadge(active), /Skutečně probíhající výkon/);
  for (const changes of [{ operationStartedAt: null }, { operationStartedAt: 'bad-date' },
    { operationStartedAt: '2026-10-08T09:00:00.001Z' }, { currentStepIndex: 0 }]) {
    assert.equal(project([], [currentLink], [{ ...current, ...changes }]).size, 0);
  }
  assert.equal(project([], [link({ endedAt: '2026-10-08T10:00:00Z' })], [current]).size, 0);
  assert.equal(project([], [link({ hospitalId: 'foreign' })], [current]).size, 0);
});

test('all durable bindings suppress new proposal badges, even completed or reassigned cycles', () => {
  const inputs = [request({ id: 'already-completed' }), request({ id: 'started-elsewhere' }), request({ id: 'waiting', queuePosition: 6 })];
  const links = [link({ requestId: 'already-completed', endedAt: '2026-10-08T10:00:00Z' }),
    link({ requestId: 'started-elsewhere', roomId: 'room-2' })];
  assert.deepEqual(project(inputs, links).get('room-1').pendingRequests.map(item => item.id), ['waiting']);
  assert.equal(project([request()], [link({ requestId: 'request-1', hospitalId: 'other' })]).get('room-1').pendingRequests.length, 1);
});

test('a running cycle and its next queue are both represented without claiming pending surgery started', () => {
  const current = room('room-1', { currentStepIndex: 2, operationStartedAt: link().operationStartedAt });
  const summary = project([request({ id: 'next', queuePosition: 4 }), request({ id: 'after', queuePosition: 5 })], [link()], [current]).get(current.id);
  const html = renderBadge(summary);
  assert.match(html, /Akutní · probíhá/);
  assert.match(html, /\+2/);
  assert.match(html, /Čekající akutní požadavky: Pořadí 4: Skutečný výkon, Urgentní; Pořadí 5:/);
});

test('semantic urgency remains explicit and complete procedures are available without an extra interactive control', () => {
  assert.equal(renderBadge(undefined), '');
  assert.equal(renderBadge({ pendingRequests: [] }), '');
  for (const [urgency, label, color] of [['emergent', 'Emergentní', constants.C.red], ['urgent', 'Urgentní', constants.C.green], ['expedited', 'Časný', constants.C.blue]]) {
    const html = renderBadge({ pendingRequests: [request({ urgency, queuePosition: null, procedureName: 'Dlouhý název výkonu ze skutečného pořadníku < & >' })] }, { mobile: true });
    assert.match(html, new RegExp(label));
    assert.ok(html.includes(`--acute-dashboard-color:${color}`));
    assert.match(html, /Pořadí —/);
    assert.match(html, /Pořadí nenastaveno/);
    assert.match(html, /Dlouhý název výkonu ze skutečného pořadníku &lt; &amp; &gt;/);
    assert.doesNotMatch(html, /<button|<a |onclick=|Pořadí 22/);
  }
});

test('desktop and phone dashboards share the projection without per-card data fetching', () => {
  const dashboardSource = read('components/DashboardModule.tsx');
  const card = read('components/RoomCard.tsx');
  const mobile = read('components/mobile/MobileRoomOverview.tsx');
  assert.match(dashboardSource, /acuteByRoom\?: ReadonlyMap<string, AcuteDashboardRoomSummary>/);
  assert.match(dashboardSource, /acuteSummary=\{acuteByRoom\?\.get\(room\.id\)\}/);
  assert.match(dashboardSource, /<MobileRoomOverview[^>]+acuteByRoom=\{acuteByRoom\}/);
  assert.match(dashboardSource, /useDashboardGridLayout\([^\n]+acuteByRoom\?\.size \? 360 : 280\)/);
  assert.match(card, /prev\.acuteSummary === next\.acuteSummary/);
  assert.match(mobile, /<AcuteDashboardBadge summary=\{acuteSummary\} mobile/);
  assert.match(mobile, /acuteDashboardDescription\(acuteSummary\)/);
  for (const source of [card, mobile]) assert.doesNotMatch(source, /useAcuteRequests|useAcuteCycleLinks|fetch\(/);
});

test('acute evidence yields space without changing the corner controls, ring fill or phone design', () => {
  const css = postcss.parse(read('components/room/acute-dashboard-badge.module.css'));
  const declarations = selector => {
    const result = {};
    css.walkRules(rule => { if (rule.selector === selector) rule.walkDecls(decl => { result[decl.prop] = decl.value; }); });
    return result;
  };
  assert.equal(declarations('.cardWithAcute')['min-height'], undefined, 'Minimum height is uniform for the whole grid, never per card');
  assert.equal(declarations('.badge')['min-width'], '0');
  assert.equal(declarations('.procedure')['text-overflow'], 'ellipsis');
  assert.equal(declarations('.mobile .procedure')['white-space'], 'normal');
  assert.match(declarations('.cardWithAcute :global(.dashboard-workspace-cycle-indicator)').width, /100cqh - 24px/);
  assert.match(declarations('.cardWithAcute :global(.dashboard-workspace-cycle-indicator)').width, /max\(84px,/);
  assert.doesNotMatch(css.toString(), /corner-control|corner-action|transform:|animation:|backdrop-filter:/);
});
