import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import { roomScope } from './load-room-scope.js';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  new Function('require', 'exports', 'module', code)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const helper = load('lib/statistics-loading-progress.ts', {});
const loader = load('components/statistics/StatisticsPreloader.tsx', {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  '../../lib/statistics-loading-progress': helper, './performance-preloader.css': {}, './statistics-preloader.css': {},
});
const walk = (node, predicate) => Array.isArray(node) ? node.flatMap(child => walk(child, predicate))
  : React.isValidElement(node) ? [...(predicate(node) ? [node] : []), ...walk(node.props.children, predicate)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children)
  : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
const expand = node => Array.isArray(node) ? node.map(expand) : React.isValidElement(node)
  ? typeof node.type === 'function' ? expand(node.type(node.props)) : React.cloneElement(node, {}, expand(node.props.children)) : node;

function fixture(name, t, overrides = {}) {
  const originalFetch = globalThis.fetch;
  let hospital = 'hospital-a', ledger = [], cursor = 0, effects = [], props = {
    rooms: [], periodLabel: 'rok', statusHistory: [], notifications: [], totalOps: 0, avgUtilization: 0, ...overrides,
  };
  const reads = [], years = [], reports = [];
  const cleanup = () => ledger.forEach(slot => slot?.cleanup?.());
  t.after(() => { cleanup(); globalThis.fetch = originalFetch; });
  const hooks = {
    ...React, memo: component => component,
    useMemo: factory => factory(), useCallback: callback => callback,
    useState(initial) {
      const index = cursor++, active = ledger;
      active[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [active[index].value, update => { active[index].value = typeof update === 'function' ? update(active[index].value) : update; }];
    },
    useRef(initial) { const index = cursor++; ledger[index] ??= { current: initial }; return ledger[index]; },
    useEffect(run, deps) {
      const index = cursor++, previous = ledger[index];
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) {
        previous?.cleanup?.(); ledger[index] = { deps }; const active = ledger;
        effects.push(() => { active[index].cleanup = run(); });
      }
    },
  };
  const sourceRead = source => options => new Promise((resolve, reject) => { reads.push({ source, options, hospital, resolve, reject }); });
  globalThis.fetch = (url, options) => new Promise(resolve => {
    assert.match(url, /^\/api\/room-specialty-allocations\?year=\d{4}$/);
    years.push({ url, options, hospital, resolve: (payload = { allocations: [], departments: [] }, ok = true) => resolve({ ok, json: async () => payload }) });
  });
  const passthrough = ({ children, ...attributes }) => React.createElement('section', attributes, children);
  const empty = () => null;
  const icons = new Proxy({}, { get: (_target, icon) => attributes => React.createElement('svg', { ...attributes, 'data-icon': icon }) });
  const component = load(`components/statistics/${name}.tsx`, {
    react: hooks, 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-dom': { createPortal: () => assert.fail('No detail or clinical action is opened') }, 'lucide-react': icons,
    './shared': { C: new Proxy({}, { get: () => '#123456' }), Card: passthrough, KPIBlock: empty,
      DistributionHeader: empty, DistributionRing: empty, formatNumber: value => String(value) },
    './AppCharts': { ColumnChart: empty, StatSectionLabel: passthrough,
      GlassCalendar: attributes => React.createElement('div', { ...attributes, 'data-calendar': true }) },
    '@/components/ui/toast': { toast: { error: empty, success: empty } },
    '../../lib/db': { fetchStatusHistory: sourceRead('history'), fetchNotificationsLog: sourceRead('notifications'),
      getDatabaseHospitalId: () => hospital, updateRoomHourlyOperatingCost: () => assert.fail('No database writes') },
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: [] }) },
    '../../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospital }) },
    './StatisticsReportContext': { useStatisticsReport: (tab, report) => reports.push({ tab, report }) },
    './StatisticsPhaseFilterContext': { useStatisticsPhaseHistory: history => history },
    '../../lib/statistics-room-scope': roomScope,
    '../../lib/statistics-loading-progress': helper, './StatisticsPreloader': loader,
  })[name];
  const render = () => {
    cursor = 0; const tree = expand(component(props)); effects.splice(0).forEach(run => run()); return tree;
  };
  return {
    reads, years, reports, render,
    async flush() { await new Promise(resolve => setImmediate(resolve)); return render(); },
    chooseDay(tree, day = new Date(2020, 6, 3)) { walk(tree, node => node.props['data-calendar'])[0].props.onChange(day); return render(); },
    latestReport: () => reports.at(-1)?.report,
    resolveYears() { years.filter(year => year.hospital === hospital).forEach(year => year.resolve()); },
    remount(nextHospital) { cleanup(); ledger = []; effects = []; hospital = nextHospital; return render(); },
    clickRetry(tree) { walk(tree, node => node.type === 'button' && text(node) === 'Zkusit znovu')[0].props.onClick(); return render(); },
  };
}

test('Finance first-render gating waits for genuine year responses and labels the task unit', async t => {
  const app = fixture('FinanceTab', t);
  let tree = app.render();
  assert.equal(app.latestReport(), null);
  assert.doesNotMatch(text(tree), /Celkové náklady/);
  assert.ok(app.years.length >= 1);
  app.years[0].resolve(); tree = await app.flush();
  if (app.years.length > 1) {
    const bar = walk(tree, node => node.props.role === 'progressbar')[0];
    assert.equal(bar.props['aria-valuenow'], Math.floor(100 / app.years.length));
    assert.match(text(tree), /ročních rozpisů/);
    assert.equal(app.latestReport(), null);
  }
  app.resolveYears(); tree = await app.flush();
  assert.ok(app.latestReport());
  assert.match(text(tree), /Celkové náklady/);
});

test('Finance selected day waits for both full reads, treats null as an error and supports retry', async t => {
  const app = fixture('FinanceTab', t); app.render(); app.resolveYears();
  let tree = await app.flush(); tree = app.chooseDay(tree);
  assert.equal(app.latestReport(), null, 'The render before effects must not register previous-day data');
  assert.doesNotMatch(text(tree), /Celkové náklady/);
  const dayReads = app.reads.slice();
  assert.equal(dayReads.length, 2);
  assert.ok(dayReads.every(read => read.options.all === true && typeof read.options.onProgress === 'function'));
  dayReads.forEach(read => read.options.onProgress({ loaded: 1, total: 1, complete: true }));
  tree = app.render();
  assert.equal(walk(tree, node => node.props.role === 'progressbar')[0].props['aria-valuenow'], 99);
  dayReads[0].resolve(null); dayReads[1].resolve([]); app.resolveYears();
  tree = await app.flush();
  assert.equal(app.latestReport(), null);
  assert.ok(walk(tree, node => node.props.role === 'alert').length);
  assert.ok(walk(tree, node => node.props['data-calendar']).length, 'Calendar remains available after failure');
  app.clickRetry(tree); app.resolveYears();
  app.reads.slice(2).forEach(read => read.resolve([]));
  tree = await app.flush();
  assert.ok(app.latestReport(), 'Successful empty day responses are valid after explicit retry');
});

test('Finance malformed schedule responses never certify zero data', async t => {
  const app = fixture('FinanceTab', t); app.render(); app.years[0].resolve({});
  const tree = await app.flush();
  assert.equal(app.latestReport(), null);
  assert.ok(walk(tree, node => node.props.role === 'alert').length);
});

test('Rates do not start unnecessary historical or schedule reads', t => {
  const rates = fixture('FinanceTab', t, { view: 'rates' }); rates.render();
  assert.equal(rates.years.length, 0); assert.equal(rates.reads.length, 0);
  assert.ok(rates.latestReport());
});

test('Finance late year responses cannot make the newly selected hospital ready', async t => {
  const app = fixture('FinanceTab', t); app.render(); const old = app.years.slice();
  app.remount('hospital-b');
  old.forEach(year => year.resolve());
  let tree = await app.flush();
  assert.equal(app.latestReport(), null);
  const bar = walk(tree, node => node.props.role === 'progressbar')[0];
  assert.equal(bar.props['aria-valuenow'], 0);
  assert.ok(old.every(year => year.options.signal.aborted));
  app.resolveYears(); tree = await app.flush();
  assert.ok(app.latestReport());
});

test('Notification day callbacks cannot show 100 or old metrics before both snapshots commit', async t => {
  const app = fixture('NotificationsTab', t);
  let tree = app.render(); app.reads[0].resolve([]); tree = await app.flush();
  tree = app.chooseDay(tree);
  assert.equal(app.latestReport(), null);
  const dayReads = app.reads.slice(1);
  assert.equal(dayReads.length, 2);
  dayReads.forEach(read => read.options.onProgress({ loaded: 1, total: 1, complete: true }));
  tree = app.render();
  assert.equal(walk(tree, node => node.props.role === 'progressbar')[0].props['aria-valuenow'], 99);
  dayReads[0].resolve([]); dayReads[1].resolve(null);
  tree = await app.flush();
  assert.equal(app.latestReport(), null);
  assert.ok(walk(tree, node => node.props.role === 'alert').length);
  app.clickRetry(tree);
  app.reads.slice(3).forEach(read => read.resolve([]));
  tree = await app.flush();
  assert.ok(app.latestReport());
});

test('Notification calendar failure is explicit and closed tenant requests cannot update a remount', async t => {
  const app = fixture('NotificationsTab', t);
  app.render(); const first = app.reads[0]; first.resolve(null);
  let tree = await app.flush();
  assert.ok(walk(tree, node => node.props.role === 'alert').length);
  assert.ok(app.latestReport(), 'Calendar decoration failure does not invalidate already supplied report sources');
  app.clickRetry(tree); const old = app.reads.at(-1);
  app.remount('hospital-b'); const fresh = app.reads.at(-1);
  old.options.onProgress({ loaded: 5000, total: 5000, complete: true }); old.resolve([]);
  tree = await app.flush();
  assert.equal(walk(tree, node => node.props.role === 'progressbar')[0].props['aria-valuenow'], undefined);
  fresh.resolve([]); tree = await app.flush();
  assert.equal(walk(tree, node => node.props.role === 'progressbar').length, 0);
});
