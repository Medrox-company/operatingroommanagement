import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Render the production component and real measurement model with local React
// scheduling only. The redesign must not replace clinical data with fixtures,
// register stale reports, or lose its existing keyboard-operable controls.
const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const compile = path => ts.transpileModule(source(path), {
  fileName: path,
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const model = { exports: {} };
new Function('exports', 'module', compile('lib/statistics-performance.ts'))(model.exports, model);
const componentCode = compile('components/statistics/PerformanceTab.tsx');
const NOW = '2026-09-29T12:00:00Z';
const LABELS = ['ARO START', 'Chirurgický výkon', 'ARO KONEC', 'Úklid', 'Obrat pacienta'];
const rooms = [{ id: 'a', name: 'Traumatologie 1' }, { id: 'b', name: 'Sál 7' }];
const history = [
  { id: 'surgery-a', operating_room_id: 'a', event_type: 'step_change', timestamp: '2026-09-07T08:01:29Z', step_name: 'Chirurgický výkon', duration_seconds: 89, metadata: {} },
  { id: 'surgery-b', operating_room_id: 'b', event_type: 'step_change', timestamp: '2026-09-07T08:02:30Z', step_name: 'Chirurgický výkon', duration_seconds: 150, metadata: {} },
];
const elements = (node, predicate) => Array.isArray(node) ? node.flatMap(child => elements(child, predicate))
  : !React.isValidElement(node) ? [] : [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
const content = node => Array.isArray(node) ? node.map(content).join('')
  : typeof node === 'string' || typeof node === 'number' ? String(node)
    : React.isValidElement(node) ? content(node.props.children) : '';
const hasClass = (node, name) => node.props.className?.split(/\s+/).includes(name);

function harness({ rows = history, props: supplied = {}, workflow: suppliedWorkflow = {} } = {}) {
  const state = [], refs = [];
  let stateCursor = 0, refCursor = 0, tree, report, workflowRefreshes = 0;
  const workflow = {
    workflowStatuses: ['Sál připraven', 'Příjezd na sál', 'Chirurgický výkon', 'Ukončení výkonu', 'Odjezd ze sálu', 'Úklid sálu'].map(name => ({ name })),
    loading: false, error: null, refreshStatuses: () => { workflowRefreshes++; }, ...suppliedWorkflow,
  };
  const react = { ...React, useMemo: factory => factory(), useEffect: () => {},
    useRef: initial => { const index = refCursor++; refs[index] ??= { current: initial }; return refs[index]; },
    useState: initial => {
      const index = stateCursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
  };
  const imports = {
    react, 'lucide-react': new Proxy({}, { get: (_, name) => name }),
    recharts: Object.fromEntries(['CartesianGrid', 'Line', 'LineChart', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map(name => [name, name])),
    '../../lib/db': { fetchStatusHistory: () => { throw new Error('Design tests must not issue a database request'); } },
    '../../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'hospital-a', loading: false }) },
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => workflow },
    '../../lib/statistics-performance': model.exports,
    './StatisticsReportContext': { useStatisticsReport: (tab, value) => { assert.equal(tab, 'vykonnost'); report = value; } },
    './PerformancePreloader': { PerformancePreloader: 'PerformancePreloader' },
    './AppCharts': { GlassCalendar: 'GlassCalendar' },
    './shared': { Card: 'Card', KPIBlock: 'KPIBlock', C: { accent: '#00D9FF', textHi: 'var(--stats-text-strong)', muted: 'var(--stats-muted)', surface2: 'var(--stats-surface-2)', border: 'var(--stats-border)' } },
    './performance-tab.css': {}, './performance-preloader.css': {},
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', componentCode)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected production dependency: ${name}`);
    return imports[name];
  }, module.exports, module);
  const props = { rooms, history: rows, isLoading: false, error: null, loadedAt: NOW, onRefresh() {}, ...supplied };
  const render = () => { stateCursor = 0; refCursor = 0; tree = module.exports.PerformanceTab(props); };
  render();
  return {
    get tree() { return tree; }, get report() { return report; }, get workflowRefreshes() { return workflowRefreshes; },
    get buttons() { return elements(tree, node => hasClass(node, 'stats-performance-metric-box')); },
    update(next) { Object.assign(props, next); render(); },
    click(label) {
      const button = this.buttons.find(node => content(elements(node, item => hasClass(item, 'stats-performance-metric-title'))[0]) === label);
      assert.ok(button, `Missing metric: ${label}`); button.props.onClick(); render();
    },
    select(label, value) {
      const field = elements(tree, node => node.type === 'label').find(node => content(elements(node, item => item.type === 'span')[0]) === label);
      assert.ok(field, `Missing field: ${label}`);
      elements(field, node => node.type === 'select')[0].props.onChange({ target: { value } }); render();
    },
    selectDay(value) { elements(tree, node => node.type === 'GlassCalendar')[0].props.onChange(value); render(); },
    filter(value) { elements(tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: value } }); render(); },
  };
}

const values = fixture => fixture.buttons.map(button => content(elements(button, node => hasClass(node, 'stats-performance-metric-value'))[0]));

test('phase-aligned layout retains data selection before the shared calendar, without an ARO metric in the sidebar', () => {
  const fixture = harness();
  const grid = elements(fixture.tree, node => hasClass(node, 'xl:grid-cols-[280px_minmax(0,1fr)]'));
  assert.equal(grid.length, 1);
  assert.match(source('components/statistics/PhasesTab.tsx'), /xl:grid-cols-\[280px_minmax\(0,1fr\)\]/);
  const sidebar = elements(grid[0], node => node.type === 'aside')[0];
  assert.ok(hasClass(sidebar, 'xl:order-1'));
  assert.equal(elements(sidebar, node => hasClass(node, 'stats-performance-metric-box')).length, 0);
  const children = React.Children.toArray(sidebar.props.children);
  assert.equal(children[0].props.title, 'Výběr dat');
  assert.equal(elements(children[1], node => node.type === 'GlassCalendar').length, 1);
  const roomField = elements(sidebar, node => node.type === 'label').find(node => content(elements(node, item => item.type === 'span')[0]) === 'Sál');
  const options = elements(roomField, node => node.type === 'option');
  assert.deepEqual(options.map(node => node.props.value), ['all', 'b', 'a']);
  assert.deepEqual(options.map(content), ['Všechny sály', 'Sál 7', 'Traumatologie 1']);
});

test('all five redesigned KPI controls remain native buttons with one pressed metric and the same registered trend', () => {
  const fixture = harness();
  assert.equal(fixture.buttons.length, 5);
  assert.deepEqual(values(fixture), ['—', '2 min', '—', '—', '—']);
  for (const label of LABELS) {
    fixture.click(label);
    assert.equal(fixture.buttons.every(button => button.type === 'button' && button.props.type === 'button'), true);
    const selected = fixture.buttons.filter(button => button.props['aria-pressed']);
    assert.equal(selected.length, 1);
    assert.equal(content(elements(selected[0], node => hasClass(node, 'stats-performance-metric-title'))[0]), label);
    assert.equal(fixture.report.sections[1].title, `${label} po kalendářních měsících`);
    assert.deepEqual(fixture.report.metrics.map(metric => metric.value), values(fixture));
    assert.equal(fixture.report.sections[1].rows.length, 12);
  }
  fixture.select('Sál', 'a');
  assert.deepEqual(values(fixture), ['—', '1 min', '—', '—', '—']);
  assert.match(fixture.report.context, /Sál: Traumatologie 1/);
  fixture.select('Období boxů', 'all');
  assert.match(fixture.report.context, /Posledních 12 kalendářních měsíců/);
});

test('header and five compact metrics form one shared overview card, with a separately framed selected chart', () => {
  const fixture = harness();
  fixture.click('Chirurgický výkon');
  const overview = elements(fixture.tree, node => hasClass(node, 'stats-performance-overview-panel'));
  assert.equal(overview.length, 1);
  assert.equal(overview[0].type, 'Card', 'Use the application Card surface, not a separate hero design');
  assert.equal(elements(overview[0], node => hasClass(node, 'stats-performance-metric-box')).length, 5);
  const strip = elements(overview[0], node => hasClass(node, 'stats-kpi-strip'));
  assert.equal(strip.length, 1);
  assert.equal(strip[0].type, 'fieldset');
  assert.equal(strip[0].props['aria-label'], 'Ukazatel výkonnosti');
  assert.equal(elements(overview[0], node => node.type === 'h2' && hasClass(node, 'stats-card-title')).length, 1);
  const plots = elements(fixture.tree, node => hasClass(node, 'stats-performance-plot'));
  assert.equal(plots.length, 1);
  assert.ok(hasClass(plots[0], 'rounded-lg'));
  assert.equal(plots[0].props.style.background, 'var(--stats-surface-2)');
  assert.equal(plots[0].props.style.border, '1px solid var(--stats-border)');
});

test('scoped styles use the Phases Card and KPI rhythm, with focus and table overflow kept local', () => {
  const css = source('components/statistics/performance-tab.css');
  const rule = selector => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1];
    assert.ok(body, `Missing style rule: ${selector}`);
    return body;
  };
  const shared = source('components/statistics/shared.tsx');
  assert.match(shared, /stats-shared-card.*rounded-xl/);
  assert.match(shared, /className="rounded-xl p-3 relative overflow-hidden"/);
  const metric = rule('.stats-performance-metric-box');
  assert.match(metric, /padding:\s*12px/);
  assert.match(metric, /border-radius:\s*12px/);
  assert.match(metric, /background:\s*var\(--stats-surface\)/);
  assert.match(metric, /min-width:\s*0/);
  assert.ok(Number(metric.match(/min-height:\s*(\d+)px/)[1]) <= 128, 'Compact KPIs must not return to the old 210/225px cards');
  assert.match(rule('.stats-performance-metric-icon-frame'), /border-radius:\s*8px/);
  assert.match(rule('.stats-performance-metric-title'), /font-size:\s*8px/);
  assert.match(rule('.stats-performance-metric-value'), /font-size:\s*24px/);
  assert.match(rule('.stats-performance-metric-grid'), /repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /@media\s*\(min-width:\s*1024px\)[\s\S]*?repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /\.stats-performance button:focus-visible,[\s\S]*?\.stats-performance input:focus-visible\s*\{[\s\S]*?outline:\s*2px/);
  assert.match(rule('.stats-performance-table-wrap'), /max-width:\s*100%/);
  assert.match(rule('.stats-performance-table-wrap'), /overflow-x:\s*auto/);
  assert.equal(css.includes('min-height: 210px'), false);
  assert.equal(css.includes('min-height: 225px'), false);
  assert.equal(css.includes('border-radius: 20px'), false);
});

test('controlled minimum-minute filtering changes real measurements and report together, not parent state on click', () => {
  const changes = [];
  const fixture = harness({ rows: [{ ...history[0], duration_seconds: 29 }], props: {
    excludeShortPhases: false, onExcludeShortPhasesChange: value => changes.push(value),
  } });
  assert.equal(values(fixture)[1], '0 min');
  assert.match(fixture.report.metrics[1].detail, /1 měření/);
  fixture.filter(true);
  assert.deepEqual(changes, [true]);
  assert.equal(values(fixture)[1], '0 min', 'The parent filter is still authoritative');
  fixture.update({ excludeShortPhases: true });
  assert.equal(values(fixture)[1], '—');
  assert.match(fixture.report.metrics[1].detail, /0 měření/);
  assert.equal(elements(fixture.tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.checked, true);
  fixture.update({ excludeShortPhases: false });
  assert.equal(values(fixture)[1], '0 min');
});

test('initial and refresh progress cannot publish an unfinished report or disguise missing data as zero', () => {
  const progress = { loaded: 1000, total: 4000, complete: false };
  const initial = harness({ props: { loadedAt: null, isLoading: true, loadingProgress: progress } });
  const initialLoaders = elements(initial.tree, node => node.type === 'PerformancePreloader');
  assert.equal(initialLoaders.length, 1);
  assert.equal(initialLoaders[0].props.progress, progress);
  assert.equal(initial.buttons.length, 0);
  assert.equal(initial.report, null);
  const fixture = harness();
  const original = values(fixture);
  fixture.update({ isLoading: true, loadingProgress: progress });
  const compact = elements(fixture.tree, node => node.type === 'PerformancePreloader');
  assert.equal(compact.length, 1);
  assert.equal(compact[0].props.compact, true);
  assert.equal(compact[0].props.progress, progress);
  assert.deepEqual(values(fixture), original);
  assert.equal(fixture.report, null);
  fixture.update({ isLoading: false });
  assert.deepEqual(fixture.report.metrics.map(metric => metric.value), original);
  const empty = harness({ rows: [] });
  assert.deepEqual(values(empty), ['—', '—', '—', '—', '—']);
  assert.ok(empty.report, 'Confirmed empty data may be exported with missing-value semantics');
});

test('calendar starts confirmed day loading while source errors keep retry rather than measured cards', () => {
  const fixture = harness();
  fixture.selectDay(new Date(2026, 8, 7));
  assert.equal(fixture.report, null, 'A selected day must not export the preceding month');
  assert.equal(elements(fixture.tree, node => node.type === 'GlassCalendar').length, 1);
  assert.ok(elements(fixture.tree, node => node.type === 'PerformancePreloader').length > 0);
  let refreshes = 0;
  const failed = harness({ props: { error: 'Zdroj není dostupný', onRefresh: () => { refreshes++; } } });
  assert.equal(failed.report, null);
  assert.equal(failed.buttons.length, 0);
  assert.match(content(failed.tree), /Chyba načtení není nulová výkonnost/);
  const retry = elements(failed.tree, node => node.type === 'button' && content(node) === 'Zkusit znovu')[0];
  assert.ok(retry);
  retry.props.onClick();
  assert.equal(refreshes, 1);
  assert.equal(failed.workflowRefreshes, 1);
});
