import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'), {
  fileName: path, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const model = { exports: {} };
new Function('exports', 'module', compile('lib/statistics-performance.ts'))(model.exports, model);
const { buildMonthlyPerformance, performanceDayRange } = model.exports;
const now = new Date('2026-09-29T12:00:00Z');
const rooms = [{ id: 'a', name: 'Sál A', weeklySchedule: Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => [day, {
  enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30,
}])) }];
const options = { anesthesiaStartEnabled: false, anesthesiaEndEnabled: false };
const event = (id, timestamp, name, seconds, extra = {}) => ({ id, operating_room_id: 'a', event_type: 'step_change', timestamp,
  step_name: name, duration_seconds: seconds, step_index: null, metadata: {}, ...extra });
const cleaning = (id, timestamp, seconds) => event(id, timestamp, 'Úklid sálu', seconds, { step_index: 0 });

test('day endpoints honor Prague midnight, DST and the exact59/60-second boundary without changing the12-month default', () => {
  for (const [key, hours] of [['2026-03-29', 23], ['2026-10-25', 25], ['2026-09-07', 24]]) {
    const range = performanceDayRange(key);
    assert.equal((range.to - range.from) / 3600000, hours);
  }
  assert.throws(() => performanceDayRange('2026-02-30'), RangeError);
  const range = performanceDayRange('2026-09-07');
  const history = [
    cleaning('before', new Date(range.from - 1).toISOString(), 200),
    cleaning('59', range.from.toISOString(), 59),
    cleaning('60', new Date(range.to - 1).toISOString(), 60),
    cleaning('after', range.to.toISOString(), 300),
  ];
  const monthly = buildMonthlyPerformance(history, rooms, now, options);
  assert.equal(monthly.months.length, 12);
  assert.equal(monthly.totals.cleanup.rawCount, 4);
  const day = buildMonthlyPerformance(history, rooms, now, { ...options, endpointRange: range });
  assert.equal(day.months.length, 1);
  assert.equal(day.totals.cleanup.rawCount, 2);
  assert.equal(day.totals.cleanup.count, 1);
  assert.equal(day.totals.cleanup.quality.underOneMinute, 1);
  assert.equal(day.totals.cleanup.rawAverageMinutes, 119 / 120);
  assert.equal(day.totals.cleanup.averageMinutes, 1);
});

test('day selection preserves surrounding lifecycle rows and previous-patient evidence', () => {
  // Previous patient leaves Friday15:15; the next arrives Monday07:15.
  const history = [
    event('start', '2026-09-04T12:00:00Z', 'Příjezd na sál', null, { event_type: 'operation_start' }),
    event('arrival', '2026-09-04T12:05:00Z', 'Příjezd na sál', 300),
    event('surgery', '2026-09-04T13:05:00Z', 'Chirurgický výkon', 3600),
    event('surgery-end', '2026-09-04T13:15:00Z', 'Ukončení výkonu', 600),
    event('departure', '2026-09-04T13:20:00Z', 'Odjezd ze sálu', 300),
    cleaning('ready', '2026-09-04T13:30:00Z', 600),
    event('end', '2026-09-04T13:30:00.001Z', null, null, { event_type: 'operation_end' }),
    event('next', '2026-09-07T05:15:00Z', 'Příjezd na sál', null, { event_type: 'operation_start' }),
  ];
  const report = buildMonthlyPerformance(history, rooms, now, { ...options, endpointRange: performanceDayRange('2026-09-07') });
  assert.equal(report.totals.turnover.rawAverageMinutes, 30);
  assert.equal(report.totals.turnover.rawCount, 1);
  assert.equal(report.totals.surgery.rawCount, 0);
  // Surgery starts before midnight but ends after it; its ending day still
  // keeps the preceding operation_start instead of manufacturing a new cycle.
  const crossing = [
    event('night-start', '2026-09-06T21:40:00Z', 'Příjezd na sál', null, { event_type: 'operation_start' }),
    event('night-arrival', '2026-09-06T21:50:00Z', 'Příjezd na sál', 600),
    event('night-surgery', '2026-09-06T22:10:00Z', 'Chirurgický výkon', 1200),
    event('night-end', '2026-09-06T22:20:00Z', 'Ukončení výkonu', 600),
  ];
  assert.equal(buildMonthlyPerformance(crossing, rooms, now, { ...options, endpointRange: performanceDayRange('2026-09-07') }).totals.surgery.rawAverageMinutes, 20);
  const laterClosing = [
    event('late-start', '2026-09-07T21:40:00Z', 'Příjezd na sál', null, { event_type: 'operation_start' }),
    event('late-arrival', '2026-09-07T21:50:00Z', 'Příjezd na sál', 600),
    event('later-surgery-close', '2026-09-08T00:50:00Z', 'Chirurgický výkon', 10800),
  ];
  const late = buildMonthlyPerformance(laterClosing, rooms, now, { ...options, endpointRange: performanceDayRange('2026-09-07') });
  assert.equal(late.totals.aroStart.rawAverageMinutes, 10, 'A closing row after the selected day still proves its surgical start');
  assert.equal(late.totals.surgery.rawCount, 0, 'The surgical endpoint belongs to the following day');
});

const componentCode = compile('components/statistics/PerformanceTab.tsx');
const elements = (node, predicate) => Array.isArray(node) ? node.flatMap(child => elements(child, predicate))
  : !React.isValidElement(node) ? [] : [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
const text = node => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node) : React.isValidElement(node) ? text(node.props.children) : '';
const hasClass = (node, name) => node.props.className?.split(' ').includes(name);
function harness(history = [], extraProps = {}) {
  const state = [], refs = [], effects = [];
  let cursor = 0, refCursor = 0, effectCursor = 0, hospitalId = 'hospital-a', tree, report;
  const requests = [];
  const react = { ...React, useMemo: factory => factory(),
    useRef: initial => { const index = refCursor++; refs[index] ??= { current: initial }; return refs[index]; },
    useState: initial => { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
    useEffect: (effect, dependencies) => { const index = effectCursor++; const previous = effects[index];
      const changed = !previous || dependencies.some((value, i) => value !== previous.dependencies[i]);
      effects[index] = { effect, dependencies, pending: changed, cleanup: previous?.cleanup }; },
  };
  const imports = {
    react, 'lucide-react': Object.fromEntries(['AlertCircle', 'ArrowLeftRight', 'LogOut', 'RefreshCw', 'Scissors', 'SlidersHorizontal', 'Sparkles', 'Stethoscope'].map(name => [name, name])),
    recharts: Object.fromEntries(['CartesianGrid', 'Line', 'LineChart', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map(name => [name, name])),
    '../../lib/db': { fetchStatusHistory: request => new Promise(resolve => { requests.push({ request, resolve }); }) },
    '../../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospitalId }) },
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: ['Sál připraven', 'Příjezd na sál', 'Chirurgický výkon', 'Ukončení výkonu', 'Odjezd ze sálu', 'Úklid sálu'].map(name => ({ name })), loading: false, error: null, refreshStatuses() {} }) },
    '../../lib/statistics-performance': model.exports,
    './StatisticsReportContext': { useStatisticsReport: (_, value) => { report = value; } },
    './PerformancePreloader': { PerformancePreloader: 'PerformancePreloader' }, './AppCharts': { GlassCalendar: 'GlassCalendar' },
    './shared': { Card: 'article', C: {} }, './performance-tab.css': {}, './performance-preloader.css': {},
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', componentCode)(name => { assert.ok(Object.hasOwn(imports, name), name); return imports[name]; }, module.exports, module);
  const props = { rooms, history, isLoading: false, error: null, loadedAt: now.toISOString(), onRefresh() {}, ...extraProps };
  const render = () => { cursor = 0; refCursor = 0; effectCursor = 0; tree = module.exports.PerformanceTab(props); return tree; };
  render();
  return { requests, render, props,
    get tree() { return tree; }, get report() { return report; },
    selectDay(date) { elements(tree, node => node.type === 'GlassCalendar')[0].props.onChange(date); render(); },
    selectMonth(value) { const label = elements(tree, node => node.type === 'label').find(node => text(node).includes('Období boxů'));
      elements(label, node => node.type === 'select')[0].props.onChange({ target: { value } }); render(); },
    flushEffects() { effects.forEach(slot => { if (slot.pending) { slot.cleanup?.(); slot.cleanup = slot.effect(); slot.pending = false; } }); render(); },
    async resolve(index, rows) { requests[index].resolve(rows); await Promise.resolve(); await Promise.resolve(); render(); },
    switchHospital(value) { hospitalId = value; render(); },
  };
}

test('actual day loading uses read-only full lifecycle history with real progress, then month selection restores the default report', async () => {
  const monthly = [cleaning('monthly', '2026-09-08T08:00:00Z', 120)];
  const dayRows = [cleaning('59', '2026-09-07T08:00:00Z', 59), cleaning('60', '2026-09-07T09:00:00Z', 60), ...monthly];
  const fixture = harness(monthly);
  assert.equal(fixture.report.sections[1].rows.length, 12);
  assert.equal(fixture.requests.length, 0);
  fixture.selectDay(new Date(2026, 8, 7));
  assert.equal(fixture.report, null, 'Do not export the previous monthly values as the selected day');
  fixture.flushEffects();
  const request = fixture.requests[0].request;
  assert.equal(request.all, true);
  assert.equal(request.fromDate, undefined, 'A day-only query must not cut patient lifecycle markers');
  assert.ok(request.toDate instanceof Date);
  assert.deepEqual(request.eventTypes, ['step_change', 'operation_start', 'operation_end', 'operation_completed']);
  const progress = { loaded: 1000, total: 2000, complete: false };
  request.onProgress(progress); fixture.render();
  assert.ok(elements(fixture.tree, node => node.type === 'PerformancePreloader').every(loader => loader.props.progress === progress));
  await fixture.resolve(0, dayRows);
  assert.match(fixture.report.context, /7\. září 2026/);
  assert.equal(fixture.report.sections[1].rows.length, 1);
  assert.equal(fixture.report.metrics.find(metric => metric.label === 'Úklid').detail.includes('2 měření'), true);
  fixture.selectDay(new Date(2026, 8, 8)); fixture.flushEffects();
  assert.equal(fixture.requests.length, 1, 'Changing day reuses complete surrounding history');
  assert.match(fixture.report.metrics.find(metric => metric.label === 'Úklid').detail, /1 měření/);
  fixture.selectMonth('2026-09'); fixture.flushEffects();
  assert.equal(fixture.report.sections[1].rows.length, 12);
  assert.equal(fixture.report.metrics.find(metric => metric.label === 'Úklid').value, '2 min');
  fixture.selectDay(new Date(2026, 8, 7));
  assert.equal(fixture.report, null, 'Returning from monthly mode starts a fresh confirmed day read');
  fixture.flushEffects();
  assert.equal(fixture.requests.length, 2);
});

test('controlled global short-phase flag synchronizes the existing checkbox and exact day counts', async () => {
  const changes = [];
  const fixture = harness([], { excludeShortPhases: false, onExcludeShortPhasesChange: value => changes.push(value) });
  fixture.selectDay(new Date(2026, 8, 7)); fixture.flushEffects();
  await fixture.resolve(0, [cleaning('59', '2026-09-07T08:00:00Z', 59), cleaning('60', '2026-09-07T09:00:00Z', 60)]);
  const checkbox = () => elements(fixture.tree, node => node.type === 'input')[0];
  checkbox().props.onChange({ target: { checked: true } }); fixture.render();
  assert.deepEqual(changes, [true]);
  assert.equal(checkbox().props.checked, false, 'The shared parent flag remains authoritative');
  fixture.props.excludeShortPhases = true; fixture.render();
  assert.equal(checkbox().props.checked, true);
  assert.match(fixture.report.metrics.find(metric => metric.label === 'Úklid').detail, /1 měření/);
  fixture.props.excludeShortPhases = false; fixture.render();
  assert.match(fixture.report.metrics.find(metric => metric.label === 'Úklid').detail, /2 měření/);
});

test('failed day reads keep calendar/retry available and stale hospital results cannot enter the report', async () => {
  const fixture = harness();
  fixture.selectDay(new Date(2026, 8, 7)); fixture.flushEffects();
  fixture.switchHospital('hospital-b'); fixture.flushEffects();
  await fixture.resolve(0, [cleaning('old', '2026-09-07T08:00:00Z', 600)]);
  assert.equal(fixture.report, null);
  await fixture.resolve(1, null);
  assert.equal(fixture.report, null);
  assert.match(text(fixture.tree), /Historii pro vybraný den se nepodařilo načíst/);
  assert.equal(elements(fixture.tree, node => node.type === 'GlassCalendar').length, 1);
  const retry = elements(fixture.tree, node => node.type === 'button' && text(node) === 'Zkusit znovu')[0];
  retry.props.onClick(); fixture.render(); fixture.flushEffects();
  assert.equal(fixture.requests.length, 3);
  await fixture.resolve(2, []);
  assert.ok(fixture.report, 'A confirmed empty day is distinct from a failed read');
  assert.equal(fixture.report.metrics.every(metric => metric.value === '—'), true);
});
