import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Exercise the real performance model, component state callbacks and registered
// print/CSV payload. React scheduling, chart layout and native printing remain
// browser checks; no database, network, timers or operational writes are used.
function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
}
const model = { exports: {} };
new Function('exports', 'module', compile('../../lib/statistics-performance.ts'))(model.exports, model);
const componentCode = compile('../../components/statistics/PerformanceTab.tsx');
const NOW = '2026-09-29T12:00:00.000Z';
const LABELS = ['ARO START', 'Chirurgický výkon', 'ARO KONEC', 'Úklid', 'Obrat pacienta'];
const METRIC_ICONS = ['Stethoscope', 'Scissors', 'LogOut', 'Sparkles', 'ArrowLeftRight'];
const DEFAULT_NAMES = ['Sál připraven', 'Příjezd na sál', 'Chirurgický výkon', 'Ukončení výkonu', 'Odjezd ze sálu', 'Úklid sálu'];
const room = id => ({
  id, name: `Sál ${id}`,
  weeklySchedule: Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day, index) => [day, {
    enabled: index < 5, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30, breakMinutes: 0,
  }])),
});

function event(id, roomId, timestamp, name, seconds, extra = {}) {
  return {
    id, operating_room_id: roomId, timestamp, event_type: 'step_change',
    step_name: name, duration_seconds: seconds, step_index: null, metadata: {}, ...extra,
  };
}

function cycle(prefix, roomId, start, phases) {
  let at = Date.parse(start);
  const rows = [{ ...event(`${prefix}-start`, roomId, new Date(at + 1).toISOString(), 'Příjezd na sál', null), event_type: 'operation_start' }];
  phases.forEach(([name, seconds], index) => {
    at += seconds * 1000;
    rows.push(event(`${prefix}-${index}`, roomId, new Date(at).toISOString(), name, seconds, {
      step_index: index === phases.length - 1 ? 0 : index + 2,
      metadata: { previous_step: name, previous_step_index: index + 1, transition_source: 'database_trigger' },
    }));
  });
  rows.push({ ...event(`${prefix}-end`, roomId, new Date(at + 1).toISOString(), 'Operation End', null), event_type: 'operation_end', metadata: { completed_step: phases.at(-1)[0] } });
  return rows;
}

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}
function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.isValidElement(node) ? textContent(node.props.children) : '';
}
const hasClass = (node, name) => node.props.className?.split(' ').includes(name);

function harness({ history = [], rooms = [room('a')], names = DEFAULT_NAMES, workflow = {}, props = {} } = {}) {
  const state = [];
  let cursor = 0;
  let report;
  let tree;
  const workflowState = { workflowStatuses: names.map(name => ({ name })), loading: false, error: null, refreshStatuses: () => {}, ...workflow };
  const react = { ...React, useMemo: factory => factory(), useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
  } };
  const imports = {
    react,
    'lucide-react': Object.fromEntries(['AlertCircle', 'RefreshCw', ...METRIC_ICONS].map(name => [name, name])),
    recharts: Object.fromEntries(['CartesianGrid', 'Line', 'LineChart', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map(name => [name, name])),
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => workflowState },
    '../../lib/statistics-performance': model.exports,
    './StatisticsReportContext': { useStatisticsReport: (tab, payload) => { assert.equal(tab, 'vykonnost'); report = payload; } },
    './shared': { Card: 'article', C: {} },
    './performance-tab.css': {},
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', componentCode)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency ${name}`);
    return imports[name];
  }, module.exports, module);
  const input = { rooms, history, isLoading: false, error: null, loadedAt: NOW, onRefresh: () => {}, ...props };
  const render = () => { cursor = 0; tree = module.exports.PerformanceTab(input); return tree; };
  render();
  return {
    get tree() { return tree; }, get report() { return report; },
    get boxes() { return elements(tree, node => hasClass(node, 'stats-performance-metric-box')); },
    select(label, value) {
      const wrapper = elements(tree, node => node.type === 'label').find(node => elements(node, child => child.type === 'span').some(child => textContent(child) === label));
      assert.ok(wrapper, `Missing select label: ${label}`);
      elements(wrapper, node => node.type === 'select')[0].props.onChange({ target: { value } });
      render();
    },
    clickBox(label) {
      const box = this.boxes.find(node => textContent(elements(node, item => hasClass(item, 'stats-performance-metric-title'))[0]) === label);
      assert.ok(box, `Missing metric box: ${label}`);
      box.props.onClick(); render();
    },
    filterShort(checked) {
      elements(tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked } }); render();
    },
    updateProps(next) { Object.assign(input, next); render(); },
  };
}

function values(fixture) {
  return fixture.boxes.map(box => textContent(elements(box, node => hasClass(node, 'stats-performance-metric-value'))[0]));
}
function metricValue(fixture, label) { return fixture.report.metrics.find(metric => metric.label === label)?.value; }
function definitions(fixture) { return fixture.report.sections.find(section => section.title === 'Definice a zdroj měření').rows; }

test('all five large boxes retain their exact values and definitions in the print/CSV report', () => {
  const history = cycle('first', 'a', '2026-09-07T08:00:00Z', [
    ['Příjezd na sál', 300], ['Chirurgický výkon', 3600], ['Ukončení výkonu', 600], ['Odjezd ze sálu', 300], ['Úklid sálu', 600],
  ]);
  history.push(event('next-arrival', 'a', '2026-09-07T10:05:00Z', 'Příjezd na sál', 300));
  const fixture = harness({ history });
  assert.equal(fixture.boxes.length, 5);
  assert.deepEqual(fixture.report.metrics.map(metric => metric.label), LABELS);
  assert.deepEqual(values(fixture), ['5 min', '60 min', '10 min', '10 min', '45 min']);
  assert.deepEqual(fixture.report.metrics.map(metric => metric.value), values(fixture));
  assert.match(fixture.report.context, /září 2026 · průběžně/);
  assert.equal(definitions(fixture).length, 5);
  assert.match(definitions(fixture)[0][1], /Příjezd pacienta na sál/);
  assert.match(definitions(fixture)[2][1], /odjezd ze sálu/);
  for (const section of fixture.report.sections) for (const row of section.rows) assert.equal(row.length, section.columns.length);
  fixture.clickBox('Chirurgický výkon');
  assert.equal(fixture.boxes.filter(box => box.props['aria-pressed']).length, 1);
  assert.match(fixture.report.sections[1].title, /^Chirurgický výkon/);
  assert.equal(fixture.report.sections[1].rows.length, 12);
});

test('turnover boxes, trend table and report retain only configured weekday worktime across a weekend', () => {
  // Prague: departure Friday 15:15, ready 15:30, next arrival Monday 07:15.
  // Configured worktime contributes 15 Friday minutes + 15 Monday minutes.
  const history = cycle('friday', 'a', '2026-09-04T12:00:00Z', [
    ['Příjezd na sál', 300], ['Chirurgický výkon', 3600], ['Ukončení výkonu', 600], ['Odjezd ze sálu', 300], ['Úklid sálu', 600],
  ]);
  history.push(event('monday-arrival', 'a', '2026-09-07T05:20:00Z', 'Příjezd na sál', 300));
  const configured = room('a');
  // Even an enabled weekend must not enter the specifically weekday-only KPI.
  configured.weeklySchedule.saturday.enabled = true;
  configured.weeklySchedule.sunday.enabled = true;
  const fixture = harness({ history, rooms: [configured] });
  assert.equal(values(fixture)[4], '30 min');
  assert.equal(metricValue(fixture, 'Obrat pacienta'), '30 min');
  assert.deepEqual(values(fixture).slice(0, 4), ['5 min', '60 min', '10 min', '10 min']);
  fixture.clickBox('Obrat pacienta');
  assert.equal(fixture.report.sections[1].rows.at(-1)[1], '30 min');
  assert.match(fixture.report.context, /pondělí do pátku/);
  assert.match(fixture.report.context, /mimo pracovní dobu a víkendy se nezapočítávají/);
  assert.match(fixture.report.context, /aktuálně uložený týdenní rozvrh/);
  assert.match(textContent(fixture.tree), /Jen nastavená pracovní doba · bez víkendů/);
  const noSchedule = harness({ history, rooms: [{ id: 'a', name: 'Sál a' }] });
  assert.equal(metricValue(noSchedule, 'Obrat pacienta'), '—');
  assert.deepEqual(values(noSchedule).slice(0, 4), ['5 min', '60 min', '10 min', '10 min']);
});

test('current month, all twelve months and room filters use pooled individual durations, not averages of averages', () => {
  const history = [
    ['a1', 'a', '2026-09-05T08:00:00Z', 60],
    ['a2', 'a', '2026-09-06T08:00:00Z', 60],
    ['b1', 'b', '2026-09-05T08:00:00Z', 600],
    ['aug', 'a', '2026-08-05T08:00:00Z', 1200],
  ].flatMap(([id, roomId, start, seconds]) => cycle(id, roomId, start, [
    ['Příjezd na sál', 60], ['Chirurgický výkon', seconds], ['Ukončení výkonu', 60], ['Odjezd ze sálu', 60], ['Úklid sálu', 60],
  ]));
  const fixture = harness({ history, rooms: [room('a'), room('b')] });
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '4 min');
  fixture.select('Sál', 'a');
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '1 min');
  fixture.select('Sál', 'all');
  fixture.select('Období boxů', 'all');
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '8 min');
  assert.match(fixture.report.context, /Posledních 12 kalendářních měsíců/);
  fixture.select('Období boxů', '2026-08');
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '20 min');
  fixture.select('Sál', 'b');
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '—');
  assert.match(fixture.report.context, /Sál: Sál b/);
});

test('active anesthesia statuses change the two ARO definitions and require their recorded boundaries', () => {
  const names = [...DEFAULT_NAMES, 'Začátek anestezie', 'Ukončení anestezie'];
  const history = cycle('anes', 'a', '2026-09-05T08:00:00Z', [
    ['Příjezd na sál', 300], ['Začátek anestezie', 720], ['Chirurgický výkon', 3600], ['Ukončení výkonu', 480], ['Ukončení anestezie', 240], ['Odjezd ze sálu', 180], ['Úklid sálu', 600],
  ]);
  const fixture = harness({ names, history });
  assert.equal(metricValue(fixture, 'ARO START'), '12 min');
  assert.equal(metricValue(fixture, 'ARO KONEC'), '8 min');
  assert.match(definitions(fixture)[0][1], /^Začátek anestezie/);
  assert.match(definitions(fixture)[2][1], /ukončení anestezie$/);
  const disabled = harness({ history });
  assert.equal(metricValue(disabled, 'ARO START'), '17 min');
  assert.equal(metricValue(disabled, 'ARO KONEC'), '12 min');
  assert.match(definitions(disabled)[0][1], /^Příjezd pacienta na sál/);
  assert.match(definitions(disabled)[2][1], /odjezd ze sálu$/);
  const missing = harness({ names, history: cycle('missing', 'a', '2026-09-05T08:00:00Z', [
    ['Příjezd na sál', 300], ['Chirurgický výkon', 3600], ['Ukončení výkonu', 600], ['Odjezd ze sálu', 300], ['Úklid sálu', 600],
  ]) });
  assert.equal(metricValue(missing, 'ARO START'), '—');
  assert.equal(metricValue(missing, 'ARO KONEC'), '—');
  assert.match(missing.report.context, /Chybějící, nejednoznačné/);
});

test('short positive real intervals are included by default and the optional filter changes boxes and export together', () => {
  const fixture = harness({ history: [event('short', 'a', '2026-09-05T08:00:30Z', 'Chirurgický výkon', 30)] });
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '1 min');
  assert.equal(values(fixture)[1], '1 min');
  fixture.filterShort(true);
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '—');
  assert.equal(values(fixture)[1], '—');
  assert.match(fixture.report.context, /pouze trvání nejméně jedna minuta/);
  fixture.filterShort(false);
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '1 min');
});

test('each metric retains its button behavior and has one distinct, decorative non-focusable icon', () => {
  const fixture = harness();
  assert.deepEqual(fixture.boxes.map(box => {
    assert.equal(box.type, 'button');
    assert.equal(box.props.type, 'button');
    assert.equal(typeof box.props.onClick, 'function');
    const icons = elements(box, node => hasClass(node, 'stats-performance-metric-icon'));
    assert.equal(icons.length, 1);
    const icon = icons[0];
    assert.equal(String(icon.props['aria-hidden']), 'true');
    assert.equal(String(icon.props.focusable), 'false');
    assert.equal(icon.props.onClick, undefined);
    assert.ok(icon.props.tabIndex == null || icon.props.tabIndex === -1);
    return icon.type;
  }), METRIC_ICONS);
  assert.deepEqual(fixture.boxes.map(box => textContent(elements(box, node => hasClass(node, 'stats-performance-metric-title'))[0])), LABELS);
  for (const label of LABELS) {
    fixture.clickBox(label);
    const selected = fixture.boxes.filter(box => box.props['aria-pressed']);
    assert.equal(selected.length, 1);
    assert.equal(textContent(elements(selected[0], node => hasClass(node, 'stats-performance-metric-title'))[0]), label);
    assert.equal(fixture.report.sections[1].title, `${label} po kalendářních měsících`);
    assert.deepEqual(values(fixture), ['—', '—', '—', '—', '—']);
  }
});

test('box, print report, monthly table and chart tooltip round below, at and above half a minute', () => {
  for (const [seconds, expected] of [[89, '1 min'], [90, '2 min'], [91, '2 min']]) {
    const fixture = harness({ history: [event(`round-${seconds}`, 'a', '2026-09-07T08:05:00Z', 'Chirurgický výkon', seconds)] });
    fixture.clickBox('Chirurgický výkon');
    assert.equal(values(fixture)[1], expected);
    assert.equal(metricValue(fixture, 'Chirurgický výkon'), expected);
    assert.deepEqual(fixture.report.sections[1].rows.at(-1).slice(1, 4), [expected, expected, expected]);
    const table = elements(fixture.tree, node => hasClass(node, 'stats-performance-table'))[0];
    const row = elements(elements(table, node => node.type === 'tbody')[0], node => node.type === 'tr')[0];
    assert.deepEqual(elements(row, node => node.type === 'td').slice(0, 3).map(textContent), [expected, expected, expected]);
    const charts = elements(fixture.tree, node => typeof node.type === 'function' && node.type.name === 'TrendChart');
    assert.equal(charts.length, 2);
    for (const chart of charts) {
      const rendered = chart.type(chart.props);
      const tooltip = elements(rendered, node => node.type === 'Tooltip')[0];
      assert.deepEqual(tooltip.props.formatter(seconds / 60, 'average'), [expected, 'Průměr']);
      assert.deepEqual(tooltip.props.formatter(seconds / 60, 'p90'), [expected, '90. percentil']);
      assert.deepEqual(tooltip.props.formatter(null, 'average'), ['—', 'Průměr']);
      const chartData = elements(rendered, node => node.type === 'LineChart')[0].props.data;
      assert.equal(chartData.at(-1).average, seconds / 60, 'Graph coordinates must retain measured precision');
    }
  }
});

test('individual durations are pooled at full precision before rounding, including the selected room and full year', () => {
  const history = [
    ['small-a1', 'a', '2026-09-07T08:05:00Z', 29],
    ['small-a2', 'a', '2026-09-08T08:05:00Z', 29],
    ['large-b1', 'b', '2026-09-07T08:05:00Z', 89],
  ].flatMap(([id, roomId, start, seconds]) => cycle(id, roomId, start, [
    ['Příjezd na sál', 60], ['Chirurgický výkon', seconds], ['Ukončení výkonu', 60], ['Odjezd ze sálu', 60], ['Úklid sálu', 60],
  ]));
  const rooms = [room('a'), room('b')];
  const result = model.exports.buildMonthlyPerformance(history, rooms, new Date(NOW));
  assert.equal(result.months.at(-1).surgery.rawAverageMinutes, 49 / 60);
  const fixture = harness({ history, rooms });
  fixture.clickBox('Chirurgický výkon');
  // Rounding each source interval first would yield (0 + 0 + 1) / 3 -> 0 min.
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '1 min');
  assert.match(fixture.report.metrics[1].detail, /3 měření/);
  assert.deepEqual(fixture.report.sections[1].rows.at(-1).slice(1, 4), ['1 min', '0 min', '1 min']);
  fixture.select('Sál', 'a');
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '0 min');
  assert.match(fixture.report.metrics[1].detail, /2 měření/);
  fixture.select('Sál', 'all');
  fixture.select('Období boxů', 'all');
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '1 min');
  fixture.filterShort(true);
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '1 min');
  assert.match(fixture.report.metrics[1].detail, /1 měření/);
});

test('a tiny positive duration displays zero whole minutes with a count, while unavailable metrics remain a dash', () => {
  const fixture = harness({ history: [event('tiny', 'a', '2026-09-07T08:00:01Z', 'Chirurgický výkon', 1)] });
  fixture.clickBox('Chirurgický výkon');
  assert.deepEqual(values(fixture), ['—', '0 min', '—', '—', '—']);
  assert.match(fixture.report.metrics[1].detail, /1 měření/);
  assert.equal(definitions(fixture)[1][2], 1);
  assert.match(fixture.report.context, /zaokrouhlené na celé minuty/);
  assert.match(fixture.report.context, /0 min může znamenat kladný čas kratší než 30 sekund/);
  assert.match(textContent(fixture.tree), /Pomlčka znamená nedostatek podkladů/);
  const chart = elements(fixture.tree, node => typeof node.type === 'function' && node.type.name === 'TrendChart')[0];
  const tooltip = elements(chart.type(chart.props), node => node.type === 'Tooltip')[0];
  assert.deepEqual(tooltip.props.formatter(1 / 60, 'average'), ['0 min', 'Průměr']);
  fixture.filterShort(true);
  assert.equal(metricValue(fixture, 'Chirurgický výkon'), '—');
  assert.equal(definitions(fixture)[1][2], 0);
});

test('closed-month summaries and minute changes are whole numbers without a signed rounded zero', () => {
  for (const [julySeconds, augustSeconds, expectedDelta] of [[30, 120, '+2 min'], [120, 30, '−2 min'], [89, 90, '0 min']]) {
    const fixture = harness({ history: [
      ['july', '2026-07-07T08:05:00Z', julySeconds],
      ['august', '2026-08-07T08:05:00Z', augustSeconds],
    ].flatMap(([id, start, seconds]) => cycle(id, 'a', start, [
      ['Příjezd na sál', 60], ['Chirurgický výkon', seconds], ['Ukončení výkonu', 60], ['Odjezd ze sálu', 60], ['Úklid sálu', 60],
    ])) });
    fixture.clickBox('Chirurgický výkon');
    const summaries = elements(fixture.tree, node => typeof node.type === 'function' && node.type.name === 'SummaryTile');
    assert.equal(summaries.find(node => node.props.label === 'Průměr').props.value, `${Math.round(augustSeconds / 60)} min`);
    assert.equal(summaries.find(node => node.props.label === '90. percentil').props.value, `${Math.round(augustSeconds / 60)} min`);
    const delta = textContent(elements(fixture.tree, node => hasClass(node, 'stats-performance-month-delta'))[0]);
    assert.ok(delta.includes(`: ${expectedDelta} (`), delta);
    assert.doesNotMatch(delta, /[+−]0 min|\d,\d+ min/);
  }
});

test('synthetic-only database history never appears as measured values in boxes or exported report', () => {
  const history = cycle('demo', 'a', '2026-09-05T08:00:00Z', [
    ['Příjezd na sál', 300], ['Chirurgický výkon', 3600], ['Ukončení výkonu', 600], ['Odjezd ze sálu', 300], ['Úklid sálu', 600],
  ]).map(row => ({ ...row, metadata: { ...row.metadata, synthetic: true, source: 'app_review_seed' } }));
  const fixture = harness({ history });
  assert.deepEqual(values(fixture), ['—', '—', '—', '—', '—']);
  assert.deepEqual(fixture.report.metrics.map(metric => metric.value), values(fixture));
  assert.equal(definitions(fixture).every(row => row[2] === 0), true);
  assert.match(textContent(fixture.tree), /Vyloučené ukázkové události/);
});

test('missing history or workflow sources block report registration instead of publishing zero performance', () => {
  for (const options of [
    { props: { isLoading: true, loadedAt: null } },
    { props: { isLoading: true } },
    { props: { error: 'Historie není dostupná' } },
    { workflow: { loading: true } },
    { workflow: { error: 'Statusy nejsou dostupné' } },
    { names: [] },
  ]) assert.equal(harness(options).report, null);
  const empty = harness();
  assert.ok(empty.report);
  assert.deepEqual(values(empty), ['—', '—', '—', '—', '—']);
  assert.equal(definitions(empty).every(row => row[2] === 0), true);
});

test('initial loading has no preloader and does not publish partial statistics', () => {
  const fixture = harness({ props: { isLoading: true, loadedAt: null } });
  assert.equal(elements(fixture.tree, node => node.props.role === 'progressbar').length, 0);
  assert.equal(elements(fixture.tree, node => hasClass(node, 'stats-performance-loader')).length, 0);
  assert.match(textContent(fixture.tree), /Načítám data výkonnosti/);
  assert.equal(fixture.boxes.length, 0);
  assert.equal(fixture.report, null);
});

test('refresh retains existing results without a preloader and waits before exporting', () => {
  const fixture = harness({ history: [event('loaded-surgery', 'a', '2026-09-07T08:05:00Z', 'Chirurgický výkon', 90)] });
  const originalValues = values(fixture);
  const originalReport = fixture.report;
  fixture.updateProps({ isLoading: true });
  assert.equal(elements(fixture.tree, node => node.props.role === 'progressbar').length, 0);
  assert.equal(elements(fixture.tree, node => hasClass(node, 'stats-performance-loader')).length, 0);
  assert.equal(fixture.boxes.length, 5);
  assert.deepEqual(values(fixture), originalValues);
  assert.equal(fixture.report, null);
  fixture.updateProps({ isLoading: false });
  assert.deepEqual(values(fixture), originalValues);
  assert.deepEqual(fixture.report, originalReport);
});

test('workflow loading still prevents exporting incomplete statistics without a preloader', () => {
  for (const loadedAt of [null, NOW]) {
    const fixture = harness({ workflow: { loading: true }, props: { isLoading: false, loadedAt } });
    assert.equal(elements(fixture.tree, node => node.props.role === 'progressbar').length, 0);
    assert.equal(fixture.report, null);
    assert.equal(fixture.boxes.length, loadedAt ? 5 : 0);
  }
});

test('history and workflow errors take precedence over progress and never hide behind a loader', () => {
  for (const options of [
    { props: { error: 'Historie není dostupná' } },
    { workflow: { loading: true, error: 'Statusy nejsou dostupné' } },
  ]) {
    const fixture = harness({
      ...options,
      props: { isLoading: true, loadedAt: null, loadingProgress: { loaded: 1000, total: 2500, complete: false }, ...options.props },
    });
    assert.equal(elements(fixture.tree, node => node.props.role === 'progressbar').length, 0);
    assert.match(textContent(fixture.tree), /Výkonnost se nepodařilo načíst/);
    assert.match(textContent(fixture.tree), /Historie není dostupná|Statusy nejsou dostupné/);
    assert.equal(fixture.boxes.length, 0);
    assert.equal(fixture.report, null);
    assert.ok(elements(fixture.tree, node => node.type === 'button').some(node => textContent(node) === 'Zkusit znovu'));
  }
});
