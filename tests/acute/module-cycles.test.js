import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import ts from 'typescript';

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
const protocol = load('lib/acute-cycle-links.ts');
const NOW = Date.parse('2026-10-09T12:00:00Z');
const request = (id, changes = {}) => ({
  id, hospitalId: 'qa-hospital', procedureName: `Mutable request ${id}`, department: 'QA', description: '', reference: '',
  urgency: 'urgent', estimatedDurationMinutes: 120, receivedAt: '2026-10-08T09:00:00Z', queuePosition: 2,
  proposedRoomId: 'proposed-room', status: 'pending', updatedAt: '2026-10-08T12:00:00Z', ...changes,
});
const link = (requestId, changes = {}) => ({
  requestId, hospitalId: 'qa-hospital', roomId: 'actual-room', operationStartedAt: '2026-10-08T10:00:00Z',
  startedAt: '2026-10-08T10:00:00.001Z', startEventId: 'actual-start', endedAt: '2026-10-08T11:00:30.001Z',
  endEventId: 'actual-end', procedureName: `Frozen procedure ${requestId}`, urgency: 'emergent', submissionPosition: 23,
  ...changes,
});
const uiImports = {
  '../hooks/useAcuteRequests': { useAcuteRequests: () => { throw new Error('QA must not call live request API'); } },
  '../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: () => { throw new Error('QA must not call live cycle API'); } },
  '../hooks/useSharedClock': { useNowMinuteMs: () => NOW },
  '../lib/acute-module-cycles': cycles,
  '../lib/acute-day-view': days,
  '../lib/acute-circular-timeline': {},
  './ModulePageHeading': load('components/ModulePageHeading.tsx'),
  './statistics/AppCharts': { DayNavigator: () => null, GlassCalendar: () => null },
  './acute/display': load('components/acute/display.ts'),
  './acute/AcuteDialogs': {},
  './acute/AcuteCircularTimeline': {},
};
const ui = load('components/AcuteRequestsModule.tsx', uiImports);
const controller = changes => ({
  scopeId: 'qa-hospital:qa-user', requests: [], events: [], revision: 1, canManage: true, historyLimited: false,
  busy: false, loading: false, error: null, errorCode: null, refresh: async () => undefined,
  execute: async () => { throw new Error('No clinical writes permitted in QA'); }, ...changes,
});
const render = (requests = [], links = [], evidenceChanges = {}, controllerChanges = {}, selectedDayKey = '2026-10-08') => renderToStaticMarkup(React.createElement(ui.default, {
  rooms: [{ id: 'actual-room', name: 'SKUTEČNÝ ÚČOCH / OČNÍ SÁL' }, { id: 'proposed-room', name: 'NÁVRHOVÝ SÁL' }],
  now: NOW, selectedDayKey, controller: controller({ requests, ...controllerChanges }), cycleEvidence: { links, loading: false, error: null, ...evidenceChanges },
}));
const requestsPanel = html => {
  const opening = html.match(/<div role="tabpanel" id="acute-panel-requests"[^>]*>/);
  assert.ok(opening, 'The default tab is the Requests panel');
  return html.slice(opening.index + opening[0].length, html.indexOf('<footer'));
};
const metric = (html, label) => {
  const match = html.match(new RegExp(`<span>${label}</span><strong>([^<]+)</strong>`));
  assert.ok(match, `The ${label} metric exists`);
  return match[1];
};
const assertInOrder = (html, markers) => {
  let previous = -1;
  for (const marker of markers) {
    const position = html.indexOf(marker);
    assert.ok(position > previous, `${marker} follows the previous Requests panel content`);
    previous = position;
  }
};

test('calendar history includes today and days−1 preceding days, is stable within a day and accepts 365 days through DST', () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'Europe/Prague';
  try {
    for (const value of ['2026-03-29T14:30:00+02:00', '2026-10-25T14:30:00+01:00', '2026-11-01T18:00:00+01:00']) {
      const now = Date.parse(value);
      for (const days of [30, 90, 365]) {
        const window = cycles.acuteModuleCycleWindow(now, days);
        const expectedStart = new Date(now); expectedStart.setHours(0, 0, 0, 0); expectedStart.setDate(expectedStart.getDate() - (days - 1));
        const expectedEnd = new Date(now); expectedEnd.setHours(0, 0, 0, 0); expectedEnd.setDate(expectedEnd.getDate() + 1);
        assert.equal(window.startMs, expectedStart.getTime());
        assert.equal(window.endMs, expectedEnd.getTime());
        assert.deepEqual(cycles.acuteModuleCycleWindow(now + 10_000, days), window);
        assert.ok(window.endMs - window.startMs <= 366 * 24 * 60 * 60_000);
        assert.doesNotThrow(() => protocol.validateAcuteCycleWindow(new Date(window.startMs).toISOString(), new Date(window.endMs).toISOString()));
      }
    }
    const spring = cycles.acuteModuleCycleWindow(Date.parse('2026-03-29T14:30:00+02:00'), 30);
    assert.equal(spring.endMs - spring.startMs, 30 * 24 * 60 * 60_000 - 60 * 60_000);
    const fall = cycles.acuteModuleCycleWindow(Date.parse('2026-10-25T14:30:00+01:00'), 30);
    assert.equal(fall.endMs - fall.startMs, 30 * 24 * 60 * 60_000 + 60 * 60_000);
  } finally { if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone; }
});

test('completion requires a valid chronological pair of immutable events, not a request status', () => {
  assert.equal(cycles.completedAcuteCycle(link('valid')), true);
  assert.equal(cycles.acuteCycleMinutes(link('valid')), 61);
  for (const changes of [{ endedAt: null }, { endEventId: null }, { endEventId: ' ' }, { startEventId: '' },
    { startedAt: 'bad' }, { endedAt: 'bad' }, { endedAt: '2026-10-08T09:59:59Z' }, { endedAt: '2026-10-08T10:00:00.001Z' }]) {
    assert.equal(cycles.completedAcuteCycle(link('invalid', changes)), false);
    assert.equal(cycles.acuteCycleMinutes(link('invalid', changes)), null);
  }
  assert.equal(cycles.acuteCycleMinutes(link('short', { endedAt: '2026-10-08T10:00:09.001Z' })), 0);
});

test('all bindings suppress waiting while begun and actual completion remain distinct; full input is untouched', () => {
  const requests = Object.freeze([request('waiting-last', { queuePosition: 7 }), request('completed-bound'),
    request('waiting-first', { queuePosition: 1 }), request('begun-bound'), request('manual-closed', { status: 'completed' })].map(Object.freeze));
  const links = Object.freeze([link('completed-bound'), link('begun-bound', { endedAt: null, endEventId: null })].map(Object.freeze));
  const before = structuredClone({ requests, links });
  const result = cycles.partitionAcuteModuleRequests(requests, links, cycles.acuteModuleCycleWindow(NOW));
  assert.deepEqual(result.waiting.map(item => item.id), ['waiting-first', 'waiting-last']);
  assert.deepEqual(result.begun.map(item => item.requestId), ['begun-bound']);
  assert.deepEqual(result.performed.map(item => item.requestId), ['completed-bound']);
  assert.deepEqual({ requests, links }, before);
});

test('history includes frozen links absent from limited request snapshots and supplements old active bindings explicitly', () => {
  const old = link('old-active', { startedAt: '2026-01-02T09:00:00Z', endedAt: '2026-01-02T10:00:00Z' });
  const oldClosed = link('old-closed', { startedAt: '2026-01-02T09:00:00Z', endedAt: '2026-01-02T10:00:00Z' });
  const result = cycles.partitionAcuteModuleRequests([request('old-active'), request('old-closed', { status: 'completed' })], [old, oldClosed, link('missing-from-archive')], cycles.acuteModuleCycleWindow(NOW));
  assert.deepEqual(result.waiting, []);
  assert.deepEqual(result.performed.map(item => item.requestId), ['missing-from-archive', 'old-active']);
  assert.deepEqual(result.supplementalPerformed, [old]);
  const annual = cycles.partitionAcuteModuleRequests([], [oldClosed], cycles.acuteModuleCycleWindow(NOW, 365));
  assert.equal(annual.performed.length, 1);
  const html = render([request('old-active', { receivedAt: '2026-01-02T08:00:00Z' })], [old], {}, {}, '2026-01-02');
  assert.equal(metric(html, 'Provedené'), '1');
  assert.match(html, /Frozen procedure old-active/);
  assert.doesNotMatch(html, /Čekání od přijetí|Odhad výkonu/);
});

test('Requests panel places the manual waiting queue before begun cycles and performed procedures without clinical writes or mutation', () => {
  const requests = Object.freeze([request('waiting-last', { queuePosition: 7 }), request('completed-bound'),
    request('waiting-first', { queuePosition: 1 }), request('begun-bound')].map(Object.freeze));
  const links = Object.freeze([link('completed-bound'), link('begun-bound', { endedAt: null, endEventId: null })].map(Object.freeze));
  const before = structuredClone({ requests, links });
  const panel = requestsPanel(render(requests, links, {}, {
    execute: () => assert.fail('Presentation order must not write clinical data'),
    refresh: () => assert.fail('Presentation order must not refresh clinical data during render'),
  }));
  assertInOrder(panel, [
    '<strong>2 čekající požadavky · ručně nastavené pořadí</strong>',
    '<h2>Mutable request waiting-first</h2>', '<h2>Mutable request waiting-last</h2>',
    '<h2>Zahájené operační cykly</h2>', '<strong>Frozen procedure begun-bound</strong>',
    '<h2>Provedené akutní výkony</h2>', '<strong>Frozen procedure completed-bound</strong>',
  ]);
  for (const name of ['waiting-first', 'waiting-last']) assert.ok(panel.includes(`aria-label="Otevřít detail požadavku Mutable request ${name}"`));
  assert.match(panel, /aria-label="Otevřít zahájený cyklus Frozen procedure begun-bound"/);
  assert.match(panel, /aria-label="Otevřít provedený výkon Frozen procedure completed-bound"/);
  assert.doesNotMatch(panel, /Mutable request completed-bound|Mutable request begun-bound|Žádné čekající požadavky/);
  assert.deepEqual({ requests, links }, before);
});

test('Requests panel starts with an honest no-waiting context and retains begun and performed records below it', () => {
  for (const links of [[link('completed-only')], [link('completed-only'), link('begun-only', { endedAt: null, endEventId: null })]]) {
    const panel = requestsPanel(render([], links));
    assert.match(panel, /^<p class="acute-context-note">Žádné čekající požadavky pro vybraný den\./);
    const markers = ['Žádné čekající požadavky pro vybraný den.'];
    if (links.length > 1) markers.push('<h2>Zahájené operační cykly</h2>', '<strong>Frozen procedure begun-only</strong>');
    markers.push('<h2>Provedené akutní výkony</h2>', '<strong>Frozen procedure completed-only</strong>');
    assertInOrder(panel, markers);
    assert.doesNotMatch(panel, /class="acute-empty"|class="acute-card-grid"|Čekání od přijetí|Odhad výkonu/);
  }
});

test('selected Requests panel retains actual frozen completion without an archived request, actual room and whole minutes', () => {
  const html = render([], [link('not-in-archive')]);
  assert.equal(metric(html, 'Provedené'), '1');
  for (const text of ['Provedené akutní výkony', 'Frozen procedure not-in-archive',
    'SKUTEČNÝ ÚČOCH / OČNÍ SÁL', 'původní zápis #23', '61 min', 'Skutečná délka celého cyklu',
    '0 min může znamenat cyklus kratší než 30 s.']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Čekání od přijetí|Odhad výkonu|NÁVRHOVÝ SÁL|Mutable request/);
  const short = render([request('short')], [link('short', { endedAt: '2026-10-08T10:00:09.001Z' })]);
  assert.match(short, /<strong>0 min<\/strong>/);
});

test('begun cycle is not completed and stopped waiting; manual request closure alone is never performed', () => {
  const html = render([request('started')], [link('started', { endedAt: null, endEventId: null })]);
  assert.match(html, /Cyklus zahájen/);
  assert.equal(metric(html, 'Zahájené'), '1');
  assert.equal(metric(html, 'Provedené'), '0');
  assert.doesNotMatch(html, /Čekání od přijetí|Odhad výkonu|Skutečná délka celého cyklu|<strong>Provedeno/);
  const manual = render([request('manual', { status: 'completed' })]);
  assert.equal(metric(manual, 'Provedené'), '0');
  assert.doesNotMatch(manual, /Mutable request manual|<strong>Provedeno/);
});

test('unknown cycle evidence gates counters and cards rather than falsely classifying a real operation as pending', () => {
  for (const evidence of [{ loading: true }, { error: 'Evidence unavailable' }]) {
    const html = render([request('unsafe')], [], evidence);
    assert.doesNotMatch(html, /Mutable request unsafe|Čekání od přijetí|Provedené výkony:|Žádné čekající požadavky/);
    for (const label of ['Požadavky', 'Čekají', 'Zahájené', 'Provedené']) assert.equal(metric(html, label), '—');
    assert.match(html, evidence.loading ? /Načítání akutních požadavků a operačních cyklů/ : /Bez ověřené evidence cyklů/);
  }
});

test('period selector remains accessible and reorder keeps all active requests, not only unbound waiting', () => {
  const source = read('components/AcuteRequestsModule.tsx');
  assert.match(source, /setReorder\(\{ requests: active, revision: controller\.revision \}\)/);
  assert.match(source, /selected && !form && !loading && !error/);
  assert.match(source, /selectedCycle && !form && !loading && !error/);
  let stateIndex = 0;
  const historyUi = load('components/AcuteRequestsModule.tsx', { ...uiImports, react: {
    ...React, useMemo: compute => compute(), useRef: initial => ({ current: initial }),
    useState: initial => [stateIndex++ === 0 ? 'history' : typeof initial === 'function' ? initial() : initial, () => {}],
  } });
  const html = renderToStaticMarkup(historyUi.AcuteRequestsView({ rooms: [], now: NOW, controller: controller(), selectedDayKey: '2026-10-08' }));
  assert.match(html, /aria-label="Období historie akutních cyklů"/);
  for (const days of [30, 90, 365]) assert.match(html, new RegExp(`<option value="${days}"`));
  const css = postcss.parse(read('components/acute/acute-requests.css'));
  const declarations = selector => { const result = {}; css.walkRules(rule => { if (rule.selector === selector) rule.walkDecls(decl => { result[decl.prop] = decl.value; }); }); return result; };
  assert.equal(declarations('.acute-cycle-period select')['min-height'], '44px');
  assert.equal(declarations('.acute-cycle-row')['border-left'], '2px solid var(--acute-urgency)');
});
