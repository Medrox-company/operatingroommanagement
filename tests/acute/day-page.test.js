import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// This harness exercises production projections and event callbacks with
// synthetic data. It does not mount effects or contact a clinical API.
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name.endsWith('.css')) return {};
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const acute = load('lib/acute-requests.ts');
const cycles = load('lib/acute-module-cycles.ts', { './acute-requests': acute });
const days = load('lib/acute-day-view.ts');
const display = load('components/acute/display.ts');
const timeline = load('lib/acute-circular-timeline.ts', {
  './acute-module-cycles': cycles, '../components/acute/display': display,
});
const NOW = Date.parse('2026-10-09T12:00:00Z');
const request = (id, changes = {}) => ({
  id, hospitalId: 'qa-hospital', procedureName: `Request ${id}`, department: 'QA', description: '', reference: '',
  urgency: 'urgent', estimatedDurationMinutes: 60, receivedAt: '2026-10-09T09:00:00Z', queuePosition: 3,
  status: 'pending', proposedRoomId: null, proposedStartAt: null, updatedAt: '2026-10-09T09:00:00Z', ...changes,
});
const link = (requestId, changes = {}) => ({
  requestId, hospitalId: 'qa-hospital', roomId: 'actual-room', operationStartedAt: '2026-10-09T10:00:00Z',
  startedAt: '2026-10-09T10:00:00.001Z', startEventId: `start-${requestId}`,
  endedAt: '2026-10-09T11:00:00.001Z', endEventId: `end-${requestId}`,
  procedureName: `Frozen ${requestId}`, urgency: 'emergent', submissionPosition: 17, ...changes,
});
const controller = changes => ({
  scopeId: 'qa-hospital:qa-user', requests: [], events: [], revision: 5, canManage: true, historyLimited: false,
  loading: false, busy: false, error: null, errorCode: null,
  execute: () => assert.fail('Day selection must never write clinical data'),
  refresh: () => assert.fail('Day selection must never refresh request data during render'), ...changes,
});
const DayNavigator = () => null;
const GlassCalendar = () => null;
const AcuteCircularTimeline = () => null;
const AcuteReorderDialog = () => null;
const AcuteRequestFormDialog = () => null;
const imports = react => ({
  ...(react ? { react } : {}),
  '../hooks/useAcuteRequests': { useAcuteRequests: () => assert.fail('QA must not call the live request hook') },
  '../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: () => assert.fail('QA must not call the live cycle hook') },
  '../hooks/useSharedClock': { useNowMinuteMs: () => NOW },
  '../lib/acute-module-cycles': cycles,
  '../lib/acute-day-view': days,
  '../lib/acute-circular-timeline': timeline,
  './ModulePageHeading': load('components/ModulePageHeading.tsx'),
  './statistics/AppCharts': { DayNavigator, GlassCalendar },
  './acute/display': display,
  './acute/AcuteDialogs': { AcuteReorderDialog, AcuteRequestFormDialog },
  './acute/AcuteCircularTimeline': { default: AcuteCircularTimeline, __esModule: true },
});
const ui = load('components/AcuteRequestsModule.tsx', imports());
const props = changes => ({
  rooms: [{ id: 'actual-room', name: 'Skutečný sál' }], now: NOW, controller: controller(),
  cycleEvidence: { links: [], loading: false, error: null }, ...changes,
});
const render = changes => renderToStaticMarkup(React.createElement(ui.default, props(changes)));
const panel = (html, tab = 'requests') => {
  const opening = html.match(new RegExp(`<div role="tabpanel" id="acute-panel-${tab}"[^>]*>`));
  assert.ok(opening, `The ${tab} panel exists`);
  return html.slice(opening.index + opening[0].length, html.indexOf('<footer'));
};
function* elements(node) {
  if (Array.isArray(node)) { for (const child of node) yield* elements(child); return; }
  if (!React.isValidElement(node)) return;
  yield node;
  yield* elements(node.props.children);
}
const find = (tree, predicate) => {
  const element = [...elements(tree)].find(predicate);
  assert.ok(element, 'Expected control exists');
  return element;
};
function harness(changes = {}) {
  let cursor = 0;
  const state = [];
  const refs = [];
  const react = {
    ...React,
    useMemo: compute => compute(), useCallback: callback => callback, useEffect: () => {},
    useState(initial) {
      const index = cursor++;
      if (!Object.hasOwn(state, index)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return refs[index] ??= { current: initial };
    },
  };
  const component = load('components/AcuteRequestsModule.tsx', imports(react));
  let currentProps = props(changes);
  return {
    render(next = {}) { currentProps = { ...currentProps, ...next }; cursor = 0; return component.AcuteRequestsView(currentProps); },
  };
}
const clickTab = (tree, name) => find(tree, element => element.props.id === `acute-tab-${name}`).props.onClick();

test('default Requests day follows Prague midnight rather than the browser time zone', () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      const html = panel(render({
        now: Date.parse('2026-10-08T22:30:00Z'),
        controller: controller({ requests: [
          request('prague-today', { receivedAt: '2026-10-08T22:10:00Z' }),
          request('prague-yesterday', { receivedAt: '2026-10-08T21:50:00Z' }),
        ] }),
      }));
      assert.match(html, /Request prague-today/);
      assert.doesNotMatch(html, /Request prague-yesterday/);
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('controlled day selects waiting requests and known cycles by receipt, with start fallback for absent archives', () => {
  const onSelectedDayChange = () => {};
  const liveEntry = ui.default({ rooms: [], now: NOW, selectedDayKey: '2026-10-08', onSelectedDayChange });
  assert.equal(liveEntry.props.selectedDayKey, '2026-10-08', 'The authenticated entry forwards the selected date');
  assert.equal(liveEntry.props.onSelectedDayChange, onSelectedDayChange);
  const requests = [request('today'), request('old-waiting', { receivedAt: '2026-10-08T09:00:00Z' }),
    request('old-running', { receivedAt: '2026-10-08T09:00:00Z' }),
    request('old-completed', { receivedAt: '2026-10-08T09:00:00Z', status: 'completed' })];
  const links = [link('old-running', { endedAt: null, endEventId: null }), link('old-completed'),
    link('missing-archive', { operationStartedAt: '2026-10-08T10:00:00Z', startedAt: '2026-10-08T10:00:00Z', endedAt: '2026-10-09T10:00:00Z' })];
  const today = panel(render({ controller: controller({ requests }), cycleEvidence: { links, loading: false, error: null } }));
  assert.match(today, /Request today/);
  assert.doesNotMatch(today, /Request old-waiting|Frozen old-running|Frozen old-completed|Frozen missing-archive/);
  const selected = panel(render({ selectedDayKey: '2026-10-08', controller: controller({ requests }), cycleEvidence: { links, loading: false, error: null } }));
  for (const name of ['Request old-waiting', 'Frozen old-running', 'Frozen old-completed', 'Frozen missing-archive']) assert.ok(selected.includes(name), name);
  assert.doesNotMatch(selected, /Request today|Request old-running|Request old-completed/);
});

test('authenticated wrapper requests the selected Prague day together with history while retaining the live clock', () => {
  const captured = [];
  const syntheticEvidence = { links: [], loading: false, error: null };
  const react = {
    ...React, useMemo: compute => compute(),
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  };
  const live = load('components/AcuteRequestsModule.tsx', {
    ...imports(react),
    '../hooks/useAcuteRequests': { useAcuteRequests: () => controller() },
    '../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: (...args) => { captured.push(args); return syntheticEvidence; } },
  });
  const entry = live.default({ rooms: [], now: NOW, selectedDayKey: '2026-09-01' });
  const view = entry.type(entry.props);
  assert.equal(captured.length, 1);
  assert.equal(captured[0][0], true);
  assert.deepEqual(captured[0][1], {
    startMs: Date.parse('2026-08-31T22:00:00Z'), endMs: Date.parse('2026-10-09T22:00:00Z'),
  });
  assert.equal(view.props.selectedDayKey, '2026-09-01');
  assert.equal(view.props.now, NOW, 'Viewing a historical day must not replace live waiting time');
  assert.equal(view.props.cycleEvidence, syntheticEvidence);
});

test('oldest controlled selection rolls into the new range at Prague midnight in the view and live query', () => {
  const previousZone = process.env.TZ;
  const beforeMidnight = Date.parse('2026-10-09T21:59:59Z');
  const afterMidnight = Date.parse('2026-10-09T22:00:00Z');
  const requests = Object.freeze([
    Object.freeze(request('previous-oldest', { receivedAt: '2025-10-10T09:00:00Z' })),
    Object.freeze(request('new-oldest', { receivedAt: '2025-10-11T09:00:00Z' })),
  ]);
  try {
    for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = zone;
      const changes = [];
      const app = harness({ now: beforeMidnight, selectedDayKey: '2025-10-10', onSelectedDayChange: key => changes.push(key), controller: controller({ requests }) });
      const original = app.render();
      assert.equal(days.acutePickerDateKey(find(original, element => element.type === DayNavigator).props.value), '2025-10-10');
      assert.match(panel(renderToStaticMarkup(original)), /Request previous-oldest/);
      let advanced;
      assert.doesNotThrow(() => { advanced = app.render({ now: afterMidnight }); });
      assert.equal(days.acutePickerDateKey(find(advanced, element => element.type === DayNavigator).props.value), '2025-10-11');
      assert.equal(days.acutePickerDateKey(find(advanced, element => element.type === GlassCalendar).props.minDate), '2025-10-11');
      assert.match(panel(renderToStaticMarkup(advanced)), /Request new-oldest/);
      assert.doesNotMatch(panel(renderToStaticMarkup(advanced)), /Request previous-oldest/);
      assert.deepEqual(changes, [], 'A clock tick clamps presentation without a clinical or controlled-date write');
      const captured = [];
      const react = { ...React, useMemo: compute => compute(), useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] };
      const live = load('components/AcuteRequestsModule.tsx', {
        ...imports(react),
        '../hooks/useAcuteRequests': { useAcuteRequests: () => controller({ requests }) },
        '../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: (...args) => { captured.push(args); return { links: [], loading: false, error: null }; } },
      });
      const entryBefore = live.default({ rooms: [], now: beforeMidnight, selectedDayKey: '2025-10-10' });
      assert.equal(entryBefore.type(entryBefore.props).props.selectedDayKey, '2025-10-10');
      const entryAfter = live.default({ rooms: [], now: afterMidnight, selectedDayKey: '2025-10-10' });
      let liveAfter;
      assert.doesNotThrow(() => { liveAfter = entryAfter.type(entryAfter.props); });
      assert.equal(liveAfter.props.selectedDayKey, '2025-10-11');
      assert.equal(liveAfter.props.now, afterMidnight);
      assert.deepEqual(captured.map(([, window]) => window), [
        { startMs: Date.parse('2025-10-09T22:00:00Z'), endMs: Date.parse('2026-10-09T22:00:00Z') },
        { startMs: Date.parse('2025-10-10T22:00:00Z'), endMs: Date.parse('2026-10-10T22:00:00Z') },
      ]);
    }
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('missing receipt cycles disclose their start-day fallback in Requests, Timeline and History', () => {
  const requests = [request('invalid-receipt', { receivedAt: 'bad' }), request('known-receipt', { receivedAt: '2026-10-08T09:00:00Z' })];
  const links = [link('archive-missing'), link('invalid-receipt'), link('known-receipt')];
  const app = harness({ controller: controller({ requests }), cycleEvidence: { links, loading: false, error: null } });
  let tree = app.render();
  let html = renderToStaticMarkup(tree);
  const disclosure = 'Den podle zahájení cyklu · původní čas zadání není dostupný';
  assert.equal(html.split(disclosure).length - 1, 2);
  assert.match(html, /U některých historických cyklů není původní čas zadání dostupný/);
  assert.match(html, /podle skutečného dne zahájení, nikoli podle nedoloženého zadání požadavku/);
  assert.match(html, /Vybraný den:/);
  assert.doesNotMatch(html, /Požadavky zadané|Frozen known-receipt/);
  clickTab(tree, 'timeline');
  tree = app.render();
  html = renderToStaticMarkup(tree);
  const renderedTimeline = find(tree, element => element.type === AcuteCircularTimeline).props;
  assert.match(renderedTimeline.periodText, /^Vybraný den:/);
  assert.doesNotMatch(renderedTimeline.periodText, /zadané/);
  assert.deepEqual(renderedTimeline.nodes.map(node => node.requestId).sort(), ['archive-missing', 'invalid-receipt']);
  assert.ok(renderedTimeline.nodes.every(node => node.receivedAt === null), 'No original receipt is invented for the cycle');
  assert.match(html, /U některých historických cyklů není původní čas zadání dostupný/);
  clickTab(tree, 'history');
  html = renderToStaticMarkup(app.render());
  assert.equal(html.split(disclosure).length - 1, 2);
  assert.match(html, /Frozen known-receipt/);
  const knownDay = render({ selectedDayKey: '2026-10-08', controller: controller({ requests }), cycleEvidence: { links, loading: false, error: null } });
  assert.match(knownDay, /Frozen known-receipt/);
  assert.doesNotMatch(knownDay, /U některých historických cyklů není původní čas zadání dostupný|Den podle zahájení cyklu/);
});

test('day navigator and calendar callbacks change the same selected day without mutations', () => {
  const requests = [request('today'), request('yesterday', { receivedAt: '2026-10-08T09:00:00Z' })];
  const app = harness({ controller: controller({ requests }) });
  let tree = app.render();
  const navigator = find(tree, element => element.type === DayNavigator);
  const calendar = find(tree, element => element.type === GlassCalendar);
  assert.equal(days.acutePickerDateKey(navigator.props.value), '2026-10-09');
  assert.equal(days.acutePickerDateKey(calendar.props.value), '2026-10-09');
  assert.deepEqual(Object.keys(calendar.props.heat).sort(), ['2026-10-08', '2026-10-09']);
  assert.ok(Object.values(calendar.props.heat).every(value => value > 0 && value <= 1));
  assert.equal(days.acutePickerDateKey(calendar.props.minDate), '2025-10-10', 'The shared calendar exposes the API-supported 365 calendar days');
  navigator.props.onChange(days.acutePickerDateFromKey('2026-10-08'));
  tree = app.render();
  assert.match(panel(renderToStaticMarkup(tree)), /Request yesterday/);
  assert.doesNotMatch(panel(renderToStaticMarkup(tree)), /Request today/);
  find(tree, element => element.type === GlassCalendar).props.onChange(days.acutePickerDateFromKey('2026-10-09'));
  tree = app.render();
  assert.match(panel(renderToStaticMarkup(tree)), /Request today/);
  assert.doesNotMatch(panel(renderToStaticMarkup(tree)), /Request yesterday/);
  const changes = [];
  const controlled = harness({ selectedDayKey: '2026-10-09', onSelectedDayChange: key => changes.push(key), controller: controller({ requests }) });
  find(controlled.render(), element => element.type === GlassCalendar).props.onChange(days.acutePickerDateFromKey('2026-10-08'));
  assert.deepEqual(changes, ['2026-10-08']);
  assert.match(panel(renderToStaticMarkup(controlled.render())), /Request today/);
  assert.doesNotMatch(panel(renderToStaticMarkup(controlled.render())), /Request yesterday/);
  assert.match(panel(renderToStaticMarkup(controlled.render({ selectedDayKey: changes[0] }))), /Request yesterday/);
});

test('shared native date input and calendar day buttons call the production selection handler', () => {
  const chartReact = {
    ...React, useMemo: compute => compute(), useEffect: () => {},
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
  };
  const charts = load('components/statistics/AppCharts.tsx', {
    react: chartReact, './shared': { C: new Proxy({}, { get: () => '#123456' }) },
  });
  const app = harness({ controller: controller({ requests: [request('today'), request('yesterday', { receivedAt: '2026-10-08T09:00:00Z' })] }) });
  let tree = app.render();
  const navigator = charts.DayNavigator(find(tree, element => element.type === DayNavigator).props);
  assert.equal(find(navigator, element => element.type === 'button' && React.Children.toArray(element.props.children).includes('Dnes')).props.disabled, true);
  assert.equal(find(navigator, element => element.props['aria-label'] === 'Následující den').props.disabled, true);
  const initialCalendar = charts.GlassCalendar(find(tree, element => element.type === GlassCalendar).props);
  assert.ok(React.Children.toArray(find(initialCalendar, element => element.props['aria-current'] === 'date').props.children).includes(9));
  assert.equal(find(initialCalendar, element => element.type === 'button' && React.Children.toArray(element.props.children).includes(10)).props.disabled, true);
  const input = find(navigator, element => element.type === 'input' && element.props.type === 'date');
  assert.equal(input.props.value, '2026-10-09');
  input.props.onChange({ target: { value: '2026-10-08' } });
  tree = app.render();
  assert.match(panel(renderToStaticMarkup(tree)), /Request yesterday/);
  const calendar = charts.GlassCalendar(find(tree, element => element.type === GlassCalendar).props);
  const selected = find(calendar, element => element.type === 'button' && element.props['aria-current'] === 'date');
  assert.ok(React.Children.toArray(selected.props.children).includes(8), 'The selected native date is highlighted');
  const today = find(calendar, element => element.type === 'button' && React.Children.toArray(element.props.children).includes(9));
  assert.equal(today.props.disabled, false);
  today.props.onClick();
  assert.match(panel(renderToStaticMarkup(app.render())), /Request today/);
});

test('saving a new request from a historical day returns to today and the Requests panel', () => {
  for (const controlled of [false, true]) {
    const old = Object.freeze(request('historical', { receivedAt: '2026-10-08T09:00:00Z' }));
    const requests = Object.freeze([old]);
    const changes = [];
    const app = harness({ controller: controller({ requests }), ...(controlled ? {
      selectedDayKey: '2026-10-08', onSelectedDayChange: key => changes.push(key),
    } : {}) });
    if (!controlled) find(app.render(), element => element.type === DayNavigator).props.onChange(days.acutePickerDateFromKey('2026-10-08'));
    let tree = app.render();
    assert.match(panel(renderToStaticMarkup(tree)), /Request historical/);
    clickTab(tree, 'history');
    tree = app.render();
    find(tree, element => element.type === 'button' && React.Children.toArray(element.props.children).includes('Nový požadavek')).props.onClick({ currentTarget: {} });
    const form = find(app.render(), element => element.type === AcuteRequestFormDialog).props;
    assert.equal(form.request, null);
    assert.equal(form.revision, 5);
    form.onSaved();
    if (controlled) assert.deepEqual(changes, ['2026-10-09']);
    const saved = request('just-saved');
    tree = app.render({ controller: controller({ requests: [old, saved] }), ...(controlled ? { selectedDayKey: changes.at(-1) } : {}) });
    assert.equal(days.acutePickerDateKey(find(tree, element => element.type === DayNavigator).props.value), '2026-10-09');
    assert.equal(find(tree, element => element.props.id === 'acute-tab-requests').props['aria-selected'], true);
    assert.ok(![...elements(tree)].some(element => element.type === AcuteRequestFormDialog));
    const html = renderToStaticMarkup(tree);
    assert.match(panel(html), /Request just-saved/);
    assert.doesNotMatch(panel(html), /Request historical/);
    assert.match(html, /Akutní požadavek byl přijat/);
    assert.deepEqual(requests, [old], 'A save callback does not rewrite the previous clinical snapshot');
  }
});

test('invalid, future and older-than-365 picker dates leave the selected day and clinical data unchanged', () => {
  const requests = Object.freeze([Object.freeze(request('today'))]);
  const rejectedDates = [new Date(NaN), days.acutePickerDateFromKey('2026-10-10'), days.acutePickerDateFromKey('2025-10-09')];
  for (const controlled of [false, true]) {
    const changes = [];
    const app = harness({ controller: controller({ requests }), ...(controlled ? {
      selectedDayKey: '2026-10-09', onSelectedDayChange: key => changes.push(key),
    } : {}) });
    for (const component of [DayNavigator, GlassCalendar]) {
      for (const date of rejectedDates) {
        find(app.render(), element => element.type === component).props.onChange(date);
        const tree = app.render();
        assert.equal(days.acutePickerDateKey(find(tree, element => element.type === DayNavigator).props.value), '2026-10-09');
        assert.equal(days.acutePickerDateKey(find(tree, element => element.type === GlassCalendar).props.value), '2026-10-09');
        assert.match(panel(renderToStaticMarkup(tree)), /Request today/);
        assert.deepEqual(changes, [], 'Rejected dates never reach the controlled selection callback');
      }
    }
    find(app.render(), element => element.type === GlassCalendar).props.onChange(days.acutePickerDateFromKey('2025-10-10'));
    if (controlled) assert.deepEqual(changes, ['2025-10-10'], 'The oldest supported date remains selectable');
    else assert.equal(days.acutePickerDateKey(find(app.render(), element => element.type === DayNavigator).props.value), '2025-10-10');
    assert.deepEqual(requests, [request('today')]);
  }
});

test('History keeps other-day waiting and begun records, every performed cycle, archives and audit entries reachable', () => {
  const requests = [request('today'), request('old-waiting', { receivedAt: '2026-10-08T09:00:00Z' }),
    request('old-running', { receivedAt: '2026-10-08T09:00:00Z' }), request('old-done', { receivedAt: '2026-10-08T09:00:00Z', status: 'completed' }),
    request('supplemental-old', { receivedAt: '2026-01-02T08:00:00Z' }),
    request('manual-cancelled', { status: 'cancelled', receivedAt: '2026-10-07T09:00:00Z' })];
  const links = [link('old-running', { endedAt: null, endEventId: null }), link('old-done'), link('today-done'),
    link('supplemental-old', { operationStartedAt: '2026-01-02T10:00:00Z', startedAt: '2026-01-02T10:00:00Z', endedAt: '2026-01-02T11:00:00Z' })];
  const app = harness({ controller: controller({ requests, events: [{ id: 'audit', requestId: 'old-waiting', action: 'reorder', occurredAt: '2026-10-09T11:00:00Z', previousPosition: 4, newPosition: 1, actorName: 'QA koordinátor', reason: 'QA důvod', changes: {} }] }), cycleEvidence: { links, loading: false, error: null } });
  find(app.render(), element => element.type === 'button' && element.props.className === 'acute-other-day-note').props.onClick();
  const html = panel(renderToStaticMarkup(app.render()), 'history');
  for (const name of ['Request old-waiting', 'Frozen old-running', 'Frozen old-done', 'Frozen today-done', 'Frozen supplemental-old', 'Request manual-cancelled', 'QA koordinátor', 'QA důvod']) assert.ok(html.includes(name), name);
  assert.match(html, /Otevřít detail požadavku Request old-waiting/);
  assert.match(html, /Otevřít zahájený cyklus Frozen old-running/);
  assert.match(html, /Otevřít provedený výkon Frozen old-done/);
});

test('Timeline receives only selected-day projection while global reorder retains all active IDs and revision', () => {
  const requests = Object.freeze([request('old-waiting', { queuePosition: 1, receivedAt: '2026-10-08T09:00:00Z' }),
    request('today', { queuePosition: 2 }), request('old-running', { queuePosition: 3, receivedAt: '2026-10-08T09:00:00Z' }),
    request('bound-done', { queuePosition: 4 }), request('closed', { status: 'completed' })].map(Object.freeze));
  const links = Object.freeze([link('old-running', { endedAt: null, endEventId: null }), link('bound-done')].map(Object.freeze));
  const before = structuredClone({ requests, links });
  const app = harness({ controller: controller({ requests }), cycleEvidence: { links, loading: false, error: null } });
  clickTab(app.render(), 'timeline');
  let tree = app.render();
  assert.deepEqual(find(tree, element => element.type === AcuteCircularTimeline).props.nodes.map(node => node.requestId).sort(), ['bound-done', 'today']);
  find(tree, element => element.type === DayNavigator).props.onChange(days.acutePickerDateFromKey('2026-10-08'));
  tree = app.render();
  assert.deepEqual(find(tree, element => element.type === AcuteCircularTimeline).props.nodes.map(node => node.requestId).sort(), ['old-running', 'old-waiting']);
  clickTab(tree, 'requests');
  tree = app.render();
  find(tree, element => element.type === 'button' && React.Children.toArray(element.props.children).includes('Upravit pořadí')).props.onClick({ currentTarget: {} });
  const reorder = find(app.render(), element => element.type === AcuteReorderDialog).props;
  assert.deepEqual(reorder.requests.map(item => item.id), ['old-waiting', 'today', 'old-running', 'bound-done']);
  assert.equal(reorder.revision, 5);
  assert.deepEqual({ requests, links }, before);
});

test('loading and errors suppress request cards, activity heat and successful counts', () => {
  const staleEvidence = { links: [link('unsafe'), link('orphan-stale-cycle')], loading: false, error: null };
  for (const failure of [
    { controller: controller({ requests: [request('unsafe')], loading: true }), cycleEvidence: staleEvidence },
    { controller: controller({ requests: [request('unsafe')], error: 'QA unavailable' }), cycleEvidence: staleEvidence },
    { controller: controller({ requests: [request('unsafe')] }), cycleEvidence: { ...staleEvidence, loading: true } },
    { controller: controller({ requests: [request('unsafe')] }), cycleEvidence: { ...staleEvidence, error: 'QA evidence unavailable' } },
  ]) {
    const app = harness(failure);
    for (const tab of ['requests', 'timeline', 'history']) {
      clickTab(app.render(), tab);
      const tree = app.render();
      const html = renderToStaticMarkup(tree);
      assert.doesNotMatch(html, /Request unsafe|Frozen unsafe|Frozen orphan-stale-cycle|Provedené výkony:|0 čekajících požadavků|Žádné čekající požadavky/);
      assert.equal((html.match(/class="acute-metric"><div><span>[^<]+<\/span><strong>—<\/strong>/g) ?? []).length, 4, 'Every summary metric remains unknown until both sources are ready');
      assert.ok(![...elements(tree)].some(element => element.type === AcuteCircularTimeline), 'Unverified data must not produce timeline nodes');
      const calendar = find(tree, element => element.type === GlassCalendar);
      assert.ok(calendar.props.heat === undefined || Object.keys(calendar.props.heat).length === 0, 'Unverified data must not create successful calendar activity');
    }
  }
});
