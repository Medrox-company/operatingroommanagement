import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

// Synthetic source/render tests only: no real session, server or clinical write.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, dependencies = {}, environment = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(environment), outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports, ...Object.values(environment));
  return module.exports;
}
const acute = load('lib/acute-requests.ts');
const cycleLinks = load('lib/acute-cycle-links.ts');
const constants = load('components/timeline/constants.ts');
const utils = load('components/timeline/utils.ts', { './constants': constants });
const labels = load('components/timeline/CompletedAcuteCycleLabel.tsx', {
  react: React, '../../lib/acute-requests': acute, './constants': constants, './completed-acute-cycle-label.css': {},
});
const display = load('lib/mobile-room-display.ts');
const mobileTimeline = load('lib/mobile-timeline.ts', { './mobile-room-display': display });
const warnings = load('lib/timeline-operational-warnings.ts');
const unused = load('lib/timeline-unused-minutes.ts', { '../types': { DEFAULT_DAILY_BREAK_MINUTES: 30 } });
const icon = () => null;
const weeklySchedule = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  .map(day => [day, { enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 0, breakMinutes: 0 }]));
const Row = load('components/timeline/TimelineRoomRow.tsx', {
  react: React, 'framer-motion': { motion: { div: 'div' } }, '../../types': { DEFAULT_WEEKLY_SCHEDULE: weeklySchedule },
  'lucide-react': { Lock: icon, AlertTriangle: icon, Activity: icon, Pause: icon, Phone: icon, BedDouble: icon, Biohazard: icon },
  './constants': constants, './utils': utils, '../../lib/timeline-operational-warnings': warnings,
  '../../lib/timeline-unused-minutes': unused, '../RoomSpecialtyBadge': { TimelineRoomSpecialtyStrip: () => null },
  '../../lib/acute-cycle-links': cycleLinks, './CompletedAcuteCycleLabel': labels,
}).TimelineRoomRow;

const start = new Date(2026, 9, 8, 10, 0, 0, 0).getTime();
const at = offset => new Date(start + offset).toISOString();
const link = overrides => ({ requestId: 'req-1', hospitalId: 'hospital-1', roomId: 'room-1',
  operationStartedAt: at(0), startedAt: at(1), startEventId: 'start-event',
  endEventId: 'end-event', endedAt: at(3600001), procedureName: 'APPE', urgency: 'urgent',
  submissionPosition: 2, ...overrides });
const cycle = { startedAt: at(0), endedAt: at(3600000), statusHistory: [
  { stepIndex: 1, startedAt: at(0), stepName: 'Příjezd na sál', color: '#1299DD' },
  { stepIndex: 2, startedAt: at(600000), stepName: 'Chirurgický výkon', color: '#E82064' },
] };
const room = { id: 'room-1', name: 'SKUTEČNÝ NÁZEV SÁLU', currentStepIndex: 0, isEmergency: false,
  isLocked: false, isPaused: false, completedOperations: [cycle] };
function findAll(tree, predicate) {
  const result = [];
  const walk = value => {
    if (!React.isValidElement(value)) return;
    if (predicate(value)) result.push(value);
    React.Children.toArray(value.props.children).forEach(walk);
  };
  walk(tree);
  return result;
}
function renderRow(links, showSummary = false) {
  const opened = [];
  const props = {
    room, acuteCycleLinks: links, warnings: [], roomIndex: 0, currentTime: new Date(start + 7200000),
    dayWindowStartMs: new Date(2026, 9, 8, 7).getTime(), TIMELINE_HOURS: 24, rowHeight: 44,
    density: 'compact', showSummary, scrubActive: false, scrubTime: null,
    activeStatuses: [{ name: 'Sál připraven', title: 'Sál připraven', color: '#00D6C4' },
      { name: 'Příjezd na sál', color: '#1299DD' }, { name: 'Chirurgický výkon', color: '#E82064' }],
    statusByOrderIndex: {}, currentSpecialties: new Map(), roomUtilization: { rows: [] },
    getTimePercentForTimeline: utils.getTimePercentForTimeline,
    getOperationPosition: utils.getOperationPosition, getRemainingTime: () => '',
    getAroPosition: () => null, getOvertimeInfo: () => undefined, statusAtTime: () => null,
    utilColor: () => '#fff', openLiveRoom: () => {}, openCompletedCycle: (...args) => opened.push(args),
    setStatsRoomId: () => {}, setHoveredOp: () => {},
  };
  return { tree: Row(props), opened };
}

test('a completed label matches the actual room, canonical lifecycle or archived phase timestamps exactly', () => {
  const evidence = link();
  assert.equal(cycleLinks.findAcuteCycleLink([evidence], room.id, cycle.startedAt, cycle.endedAt), evidence);
  assert.equal(cycleLinks.findAcuteCycleLink([evidence], room.id, evidence.startedAt, evidence.endedAt), evidence);
  for (const [id, from, to] of [
    ['different-room', cycle.startedAt, cycle.endedAt],
    [room.id, at(2), cycle.endedAt], [room.id, at(120000), cycle.endedAt],
    [room.id, cycle.startedAt, at(3599999)], [room.id, cycle.startedAt, null],
  ]) assert.equal(cycleLinks.findAcuteCycleLink([evidence], id, from, to), undefined);
  assert.equal(cycleLinks.findAcuteCycleLink([link({ endedAt: null, endEventId: null })], room.id, cycle.startedAt, cycle.endedAt), undefined);
});

test('frozen original-entry number, actual procedure and urgency remain explicit in compact labels', () => {
  for (const [urgency, color] of [['emergent', constants.C.red], ['urgent', constants.C.green], ['expedited', constants.C.blue]]) {
    for (const mobile of [true, false]) {
      const html = renderToStaticMarkup(React.createElement(labels.CompletedAcuteCycleLabel, { link: link({ urgency }), mobile }));
      assert.match(html, /#2/);
      assert.match(html, /Akutní/);
      assert.match(html, /APPE/);
      assert.match(html, /pořadí při zápisu 2/);
      assert.ok(html.includes(`--acute-cycle-color:${color}`));
      assert.doesNotMatch(html, /queuePosition|Odhad|Návrh|<button/);
    }
  }
  assert.match(labels.completedAcuteCycleDescription(link({ submissionPosition: null })), /pořadí při zápisu není dostupné/);
});

test('desktop normal and summary modes place the label in the real completed-cycle block without changing its statistics callback', () => {
  for (const summary of [true, false]) {
    const { tree, opened } = renderRow([link()], summary);
    const blocks = findAll(tree, node => node.props.className?.includes('timeline-operation-completed'));
    assert.equal(blocks.length, 1);
    const block = blocks[0];
    assert.ok(block.props['aria-label'].includes('Dokončený akutní výkon: APPE'));
    assert.equal(findAll(block, node => node.type === labels.CompletedAcuteCycleLabel).length, 1);
    let stopped = false;
    block.props.onClick({ stopPropagation: () => { stopped = true; } });
    assert.ok(stopped);
    assert.deepEqual(opened, [[room, cycle]]);
    block.props.onKeyDown({ key: 'Enter', stopPropagation: () => {}, preventDefault: () => {} });
    assert.deepEqual(opened, [[room, cycle], [room, cycle]]);
    const plain = renderRow([], summary).tree;
    const plainBlock = findAll(plain, node => node.props.className?.includes('timeline-operation-completed'))[0];
    for (const name of ['left', 'width', 'background', 'border', 'boxShadow']) assert.equal(block.props.style[name], plainBlock.props.style[name]);
  }
});

test('unbound or still-running links never label an unrelated completed block', () => {
  for (const links of [[], [link({ roomId: 'other-room' })], [link({ endedAt: null, endEventId: null })], [link({ startedAt: at(120000), operationStartedAt: at(120000) })]]) {
    assert.equal(findAll(renderRow(links).tree, node => node.type === labels.CompletedAcuteCycleLabel).length, 0);
  }
});

test('mobile annotates the actual compact room track, hides an already-linked estimate and preserves every room action', () => {
  const proposals = load('components/timeline/AcuteProposalLane.tsx', { react: React,
    'lucide-react': { AlertTriangle: icon, Siren: icon },
    '../../lib/acute-requests': acute, './constants': constants, './acute-proposal-lane.css': {} });
  const Mobile = load('components/mobile/MobileTimelineView.tsx', { react: React,
    'lucide-react': { ChevronLeft: icon, ChevronRight: icon, LocateFixed: icon },
    '../../lib/mobile-room-display': display, '../../lib/mobile-timeline': mobileTimeline,
    '../../lib/timeline-operational-warnings': warnings, '../../lib/timeline-unused-minutes': unused,
    '../../lib/acute-cycle-links': cycleLinks, '../../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: () => ({ links: [] }) },
    '../timeline/CompletedAcuteCycleLabel': labels, '../timeline/AcuteProposalLane': proposals,
    './MobileShell': { MobileModuleHeader: () => null, MobilePillTabs: () => null }, './mobile-timeline.css': {}, './mobile-timeline-orbit.css': {},
  }).default;
  const request = { id: 'req-1', hospitalId: 'hospital-1', proposedRoomId: room.id, status: 'acknowledged',
    urgency: 'urgent', procedureName: 'Renamed later', receivedAt: at(0), estimatedDurationMinutes: 120, queuePosition: 9 };
  const props = { rooms: [room, { ...room, id: 'room-2', completedOperations: [] }], activeStatuses: [],
    currentSpecialties: new Map(), currentTime: new Date(start + 7200000),
    stats: { operations: 0, cleaning: 0, free: 2, completed: 1, emergencyCount: 0 }, onSelectRoom: () => {},
    acuteRequests: [request], acuteCycleLinks: [link()], acuteEnabled: true };
  const html = renderToStaticMarkup(React.createElement(Mobile, props));
  assert.equal((html.match(/class="mtl-row"/g) ?? []).length, 2);
  assert.match(html, /mtl-completed-acute-cycle/);
  assert.match(html, /completed-acute-cycle-label-mobile/);
  assert.match(html, /Dokončený akutní výkon: APPE/);
  assert.doesNotMatch(html, /Renamed later|acute-proposal-mobile/);
  const disabled = renderToStaticMarkup(React.createElement(Mobile, { ...props, acuteEnabled: false }));
  assert.doesNotMatch(disabled, /mtl-completed-acute-cycle/);
});

test('annotation geometry clips inside the actual bar; narrow widths compact text instead of extending duration', () => {
  const css = postcss.parse(read('components/timeline/completed-acute-cycle-label.css'));
  const label = css.nodes.find(node => node.selector === '.completed-acute-cycle-label');
  const rules = Object.fromEntries(label.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.equal(rules['pointer-events'], 'none');
  assert.equal(rules['max-width'], '100%');
  assert.equal(rules.overflow, 'hidden');
  assert.doesNotMatch(read('components/timeline/completed-acute-cycle-label.css'), /animation|blur|box-shadow/);
  assert.match(read('components/timeline/completed-acute-cycle-label.css'), /@container acute-cycle \(max-width: 75px\)/);
  assert.match(read('components/timeline/completed-acute-cycle-label.css'), /color: var\(--m-text-strong\)/);
  assert.match(read('components/mobile/mobile-timeline.css'), /\.mtl-completed-acute-cycle[^\n]*overflow: hidden/);
});

function hookHarness() {
  let enabledModules = true;
  let hospital = 'hospital-1';
  let user = { id: 'user-1', role: 'aro' };
  let permissionLoading = false;
  let swrArgs;
  let refIndex = 0;
  let callbackIndex = 0;
  let effect;
  const refs = [];
  const callbacks = [];
  const listeners = new Map();
  const realtime = new Map();
  const timers = new Map();
  let timerId = 0;
  let refreshes = 0;
  let fetched;
  let responseLinks = [link()];
  const mutate = () => { refreshes++; };
  const hooks = load('hooks/useAcuteCycleLinks.ts', {
    react: { useMemo: compute => compute(), useCallback: (callback, dependencies) => {
      const index = callbackIndex++;
      const previous = callbacks[index];
      if (previous && dependencies.length === previous.dependencies.length
        && dependencies.every((value, position) => Object.is(value, previous.dependencies[position]))) return previous.callback;
      callbacks[index] = { callback, dependencies };
      return callback;
    },
      useRef: initial => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
      useEffect: callback => { effect = callback; } },
    swr: (...args) => { swrArgs = args; return { data: [link()], mutate, isLoading: false }; },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospital, loading: false }) },
    '../contexts/AuthContext': { useAuth: () => ({ user, permissionsLoading: permissionLoading,
      modules: [{ id: 'acute-requests', is_enabled: enabledModules }], hasModuleAccess: () => true }) },
    '../contexts/RealtimeContext': { useHospitalRealtime: (table, callback) => realtime.set(table, callback) },
  }, {
    fetch: async (url, options) => { fetched = { url, options }; return { ok: true, json: async () => ({ links: responseLinks }) }; },
    window: { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id),
  });
  const render = (...args) => { refIndex = 0; callbackIndex = 0; return hooks.useAcuteCycleLinks(...args); };
  return { render, hooks, realtime, listeners, timers,
    get args() { return swrArgs; }, get fetched() { return fetched; }, get refreshes() { return refreshes; },
    runEffect: () => effect(), setHospital: value => { hospital = value; }, setUser: value => { user = value; },
    setEnabledModules: value => { enabledModules = value; }, setPermissionsLoading: value => { permissionLoading = value; },
    setResponseLinks: value => { responseLinks = value; } };
}

test('link hook is separately gated by actual enabled module, user, permission load and caller scope', () => {
  const h = hookHarness();
  h.render(true);
  assert.equal(h.args[0][1], 'hospital-1');
  assert.equal(h.args[0][2], 'user-1');
  assert.equal(h.args[0][3], 'aro');
  assert.equal(h.args[2].keepPreviousData, false);
  assert.equal(h.args[2].refreshInterval, 30000);
  assert.equal(h.args[2].revalidateOnReconnect, true);
  assert.deepEqual(h.render(false).links, []);
  assert.equal(h.args[0], null);
  h.setEnabledModules(false);
  assert.deepEqual(h.render(true).links, []);
  h.setEnabledModules(true); h.setPermissionsLoading(true);
  assert.deepEqual(h.render(true).links, []);
  h.setPermissionsLoading(false); h.setUser(null);
  assert.deepEqual(h.render(true).links, []);
});

test('manual link refresh keeps its callback identity across ordinary rerenders', () => {
  const h = hookHarness();
  const first = h.render(true);
  const second = h.render(true);
  assert.equal(second.refresh, first.refresh);
  second.refresh();
  assert.equal(h.refreshes, 1);
});

test('link reads carry tenant identity, no-store and exact requested range, reject another tenant and late scope responses', async () => {
  const h = hookHarness();
  const range = { startMs: start, endMs: start + 7200000 };
  h.render(true, range);
  const key = h.args[0];
  assert.deepEqual(await h.args[1](key), [link()]);
  assert.equal(h.fetched.options.headers['X-Acute-Hospital-Id'], 'hospital-1');
  assert.equal(h.fetched.options.cache, 'no-store');
  assert.equal(h.fetched.options.credentials, 'include');
  const url = new URL(h.fetched.url, 'http://test.invalid');
  assert.equal(url.pathname, '/api/acute-requests/cycles');
  assert.equal(url.searchParams.get('from'), at(0));
  assert.equal(url.searchParams.get('to'), at(7200000));
  h.setResponseLinks([link({ hospitalId: 'hospital-2' })]);
  await assert.rejects(h.args[1](key), /nepatří vybranému zařízení/);
  h.setResponseLinks([link()]); h.setHospital('hospital-2'); h.render(true, range);
  await assert.rejects(h.args[1](key), /zařízení nebo účet se změnil/);
});

test('realtime and custom refresh reject other tenants and coalesce phase events without local clinical writes', () => {
  const h = hookHarness();
  h.render(true);
  const cleanup = h.runEffect();
  h.listeners.get('acuteCycleLinked')({ detail: { hospitalId: 'hospital-2' } });
  h.realtime.get('operating_rooms')({ new: { hospital_id: 'hospital-2' } });
  assert.equal(h.timers.size, 0);
  h.realtime.get('room_status_history')({ new: { hospital_id: 'hospital-1', event_type: 'operation_completed' } });
  h.realtime.get('operating_rooms')({ new: { hospital_id: 'hospital-1' } });
  h.listeners.get('acuteCycleLinked')({ detail: { hospitalId: 'hospital-1' } });
  assert.equal(h.timers.size, 1);
  [...h.timers.values()][0]();
  assert.equal(h.refreshes, 1);
  h.timers.clear();
  h.listeners.get('acuteCycleLinked')({ detail: { hospitalId: 'hospital-1' } });
  cleanup();
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
});

test('default link query includes yesterday at 07:00 through next 07:00 using calendar days', () => {
  const { hooks } = hookHarness();
  for (const now of [new Date(2026, 9, 8, 12), new Date(2026, 9, 8, 4), new Date(2026, 9, 25, 12)]) {
    const { startMs, endMs } = hooks.acuteCycleQueryWindow(now);
    assert.equal(new Date(startMs).getHours(), 7);
    assert.equal(new Date(endMs).getHours(), 7);
    const afterTwoCalendarDays = new Date(startMs);
    afterTwoCalendarDays.setDate(afterTwoCalendarDays.getDate() + 2);
    assert.equal(endMs, afterTwoCalendarDays.getTime());
  }
});
