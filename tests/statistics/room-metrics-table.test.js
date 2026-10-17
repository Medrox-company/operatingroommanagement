import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

// Bounded presentation contracts using synthetic props and local stubs only.
// These checks do not measure browser layout or access patient/service data.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const componentSource = read('components/statistics/RoomMetricsTable.tsx');
const parentSource = read('components/StatisticsModule.tsx');
const parent = ts.createSourceFile('StatisticsModule.tsx', parentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const css = postcss.parse(read('components/statistics/room-metrics-table.module.css'));
const C = { accent: '#06B6D4', muted: '#98A6C4', text: '#E8EDF8', yellow: '#FBBF24', red: '#EF4444', orange: '#F97316', green: '#10B981', faint: '#6D7890' };
const styles = new Proxy({}, { get: (_target, key) => key });

function compile(source, fileName) {
  return ts.transpileModule(source, { fileName, compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
}

const moduleStub = { exports: {} };
const dependencies = {
  react: React,
  './statistics-theme': { C },
  './room-metrics-table.module.css': { __esModule: true, default: styles },
};
new Function('require', 'module', 'exports', compile(componentSource, 'RoomMetricsTable.tsx'))(name => {
  assert.ok(Object.hasOwn(dependencies, name), `Unexpected table dependency: ${name}`);
  return dependencies[name];
}, moduleStub, moduleStub.exports);
const { RoomMetricsTable } = moduleStub.exports;

function elements(node, predicate = () => true) {
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => elements(child, predicate))];
}

function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!React.isValidElement(node)) return '';
  return React.Children.toArray(node.props.children).map(text).join('');
}

const row = {
  id: 'room-a', name: 'TRAUMATOLOGIE – HLAVNÍ OPERAČNÍ SÁL 1',
  statusLabel: 'Volné', statusColor: '#10B981', flags: [], flagsColor: '#F97316',
  utilization: 63, utilizationColor: '#FBBF24', operations: 2,
  workingHours: '07:00–15:30', closed: false, pausedMinutes: 26,
  activeMinutes: 1285, capacityMinutes: 480, overtimeMinutes: 805,
};
const render = rows => RoomMetricsTable({ rows });
const bodyRows = tree => elements(elements(tree, node => node.type === 'tbody')[0], node => node.type === 'tr');
const cells = tableRow => React.Children.toArray(tableRow.props.children).filter(React.isValidElement);

function collect(source, predicate) {
  const found = [];
  function visit(node) {
    if (predicate(node)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function declaration(rule, name) {
  return rule.nodes.find(node => node.type === 'decl' && node.prop === name)?.value;
}

test('one semantic header names all eight columns while every full room name remains a row header', () => {
  const rows = Array.from({ length: 15 }, (_, i) => ({ ...row, id: `room-${i}`, name: `${row.name} / ${i + 1}` }));
  const tree = render(rows);
  assert.equal(elements(tree, node => node.type === 'table').length, 1);
  assert.equal(elements(tree, node => node.type === 'thead').length, 1);
  const headers = elements(tree, node => node.type === 'th' && node.props.scope === 'col');
  assert.deepEqual(headers.map(text), ['Operační sál', 'Aktuální stav', 'Využití kapacity', 'Výkony', 'Pracovní doba', 'Pauza', 'Aktivní / kapacita', 'Přesah']);
  const actualRows = bodyRows(tree);
  assert.equal(actualRows.length, rows.length);
  actualRows.forEach((actual, i) => {
    const [identity, ...metrics] = cells(actual);
    assert.equal(identity.type, 'th');
    assert.equal(identity.props.scope, 'row');
    assert.equal(text(identity), rows[i].name);
    assert.equal(metrics.length, 7);
  });
  assert.equal(elements(tree, node => node.type === 'caption').length, 1);
  assert.match(text(elements(tree, node => node.type === 'caption')[0]), /vybraný provozní den.*stav sálu je aktuální/);
});

test('all values, real status colors and emergency/septic flags are presented without new actions', () => {
  const flagged = { ...row, flags: ['EMERG', 'SEPT'], statusColor: '#F97316', flagsColor: '#EF4444' };
  const tree = render([flagged]);
  const [identity, status, utilization, operations, hours, pause, active, overtime] = cells(bodyRows(tree)[0]);
  assert.equal(text(identity), flagged.name);
  assert.equal(text(status), 'VolnéEMERG · SEPT');
  assert.equal(elements(status, node => node.props.className === 'status')[0].props.style.color, flagged.statusColor);
  assert.equal(elements(status, node => node.props.className === 'flags')[0].props.style.color, flagged.flagsColor);
  assert.equal(text(utilization), '63 %');
  assert.equal(text(operations), '2');
  assert.equal(text(hours), '07:00–15:30');
  assert.equal(text(pause), '26 min');
  assert.equal(text(active), '1285 / 480 min');
  assert.equal(text(overtime), '+805 min');
  assert.equal(elements(tree, node => node.type === 'button' || node.props.role === 'button').length, 0);
  assert.ok(elements(tree).every(node => !Object.keys(node.props).some(key => /^on[A-Z]/.test(key))));
  const html = renderToStaticMarkup(tree);
  assert.match(html, /<table/);
  assert.match(html, /scope="row"/);
  assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
});

test('unscheduled capacity stays unknown, not misleading zero utilization or overtime', () => {
  const tree = render([{ ...row, utilization: null, capacityMinutes: null, overtimeMinutes: null, operations: 0, pausedMinutes: 0, closed: true, workingHours: 'Zavřeno' }]);
  const [, , utilization, operations, hours, pause, active, overtime] = cells(bodyRows(tree)[0]);
  assert.equal(text(utilization), '—');
  assert.equal(elements(utilization, node => node.props.className === 'track').length, 0);
  assert.equal(text(operations), '0');
  assert.equal(text(hours), 'Zavřeno');
  assert.equal(hours.props.style.color, C.muted);
  assert.equal(text(pause), '—');
  assert.equal(text(active), '1285 / — min');
  assert.equal(text(overtime), '—');
});

test('utilization display is independent of whole-day active/capacity and the decorative bar is bounded', () => {
  for (const [value, width] of [[0, '0%'], [63, '63%'], [140, '100%'], [-4, '0%']]) {
    const tree = render([{ ...row, utilization: value }]);
    const utilization = cells(bodyRows(tree)[0])[2];
    const track = elements(utilization, node => node.props.className === 'track')[0];
    assert.equal(track.props['aria-hidden'], 'true');
    assert.equal(React.Children.only(track.props.children).props.style.width, width);
    assert.equal(React.Children.only(track.props.children).props.style.background, row.utilizationColor);
    assert.equal(text(utilization), `${value} %`);
    assert.equal(text(cells(bodyRows(tree)[0])[6]), '1285 / 480 min');
  }
});

test('empty result retains column semantics and one honest empty message', () => {
  const tree = render([]);
  assert.equal(elements(tree, node => node.type === 'th' && node.props.scope === 'col').length, 8);
  const rows = bodyRows(tree);
  assert.equal(rows.length, 1);
  assert.equal(cells(rows[0]).length, 1);
  assert.equal(cells(rows[0])[0].props.colSpan, 8);
  assert.equal(text(cells(rows[0])[0]), 'Žádné sály k zobrazení.');
});

test('the live adapter forwards all scoped rooms and the same operational day to existing calculators', () => {
  const tables = collect(parent, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(parent) === 'RoomMetricsTable');
  assert.equal(tables.length, 1);
  const rowsProp = tables[0].attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(parent) === 'rows');
  const expression = rowsProp.initializer.expression.getText(parent);
  assert.match(expression, /^dayRooms\.map\(/);
  assert.doesNotMatch(expression, /\.slice\(|\.filter\(|sort\(/);
  const dayHistory = [];
  const metricsDay = new Date(2026, 9, 8);
  const dayRooms = Array.from({ length: 15 }, (_, index) => ({ id: `r${index}`, name: `Sál ${index + 1}`, isEmergency: index === 1, isSeptic: index === 2 }));
  const calls = [];
  const daily = (name, value) => (room, history, date) => {
    assert.ok(dayRooms.includes(room));
    assert.equal(history, dayHistory);
    assert.equal(date, metricsDay);
    calls.push([name, room.id]);
    return value;
  };
  const scope = {
    dayRooms, dayHistory, metricsDay, C,
    weekdayIndex: date => { assert.equal(date, metricsDay); return 3; },
    countOperationsForDay: daily('operations', 2),
    calculateRoomUtilizationForDay: daily('utilization', 63),
    calculateActiveMinutesForDay: daily('active', 323.2),
    calculatePausedMinutesForDay: daily('pause', 26),
    calculateOvertimeMinutesForDay: daily('overtime', 0),
    getRoomWorkingMinutesForDate: (room, date) => { assert.equal(date, metricsDay); return room === dayRooms[0] ? 0 : 480; },
    formatRoomWorkingHours: (_room, weekday) => { assert.equal(weekday, 3); return '07:00–15:30'; },
    getRoomWorkingHours: (room, weekday) => { assert.equal(weekday, 3); return { enabled: room !== dayRooms[0] }; },
    roomStatusLabel: () => 'Volné', roomStatusColor: () => C.green,
  };
  const output = { exports: {} };
  const js = compile(`module.exports = ${expression};`, 'room-metrics-adapter.ts');
  new Function(...Object.keys(scope), 'module', js)(...Object.values(scope), output);
  const actual = output.exports;
  assert.deepEqual(actual.map(item => item.id), dayRooms.map(room => room.id));
  assert.deepEqual(actual.map(item => item.name), dayRooms.map(room => room.name));
  assert.equal(actual[0].utilization, null);
  assert.equal(actual[0].capacityMinutes, null);
  assert.equal(actual[0].overtimeMinutes, null);
  assert.equal(actual[0].closed, true);
  assert.equal(actual[1].utilization, 63);
  assert.equal(actual[1].activeMinutes, 323);
  assert.equal(actual[1].pausedMinutes, 26);
  assert.equal(actual[1].capacityMinutes, 480);
  assert.equal(actual[1].statusColor, C.orange);
  assert.deepEqual(actual[1].flags, ['EMERG']);
  assert.deepEqual(actual[2].flags, ['SEPT']);
  assert.equal(calls.length, dayRooms.length * 5);
  assert.match(parentSource, /const dayRooms = dayScope\.rooms/);
  assert.match(parentSource, /roomSelection\?\.hospitalId === activeHospitalId/);
  assert.match(parentSource, /scopeStatisticsRooms\(allRooms, allDayHistory, statisticsDayWindow\(metricsDay\)\)/);
  assert.match(parentSource, /<DayNavigator value=\{metricsDay\} onChange=\{setMetricsDay\} today=\{operationalToday\(\)\}/);
});

test('the standalone daily report remains source-backed and independent of the screen table', () => {
  const builders = collect(parent, node => ts.isVariableDeclaration(node) && node.name.getText(parent) === 'buildOverviewReport');
  assert.equal(builders.length, 1);
  const reportSource = builders[0].initializer.getText(parent);
  assert.match(reportSource, /rows: dayRooms\.map\(room => \[/);
  assert.match(reportSource, /calculateRoomUtilizationForDay\(room, dayHistory, metricsDay\)/);
  assert.match(reportSource, /calculateActiveMinutesForDay\(room, dayHistory, metricsDay\)/);
  assert.match(reportSource, /calculatePausedMinutesForDay\(room, dayHistory, metricsDay\)/);
  assert.match(reportSource, /calculateOvertimeMinutesForDay\(room, dayHistory, metricsDay\)/);
  assert.match(reportSource, /label: 'Aktivní \/ kapacita \(min\)'/);
  assert.doesNotMatch(reportSource, /RoomMetricsTable|querySelector|innerHTML/);
  const mobileSection = parentSource.slice(parentSource.indexOf('{/* ========== MOBILE'), parentSource.indexOf('{/* ========== DESKTOP'));
  assert.doesNotMatch(mobileSection, /<RoomMetricsTable/);
});

test('responsive overflow is table-local, focusable and preserves sticky room identity without clipping names', () => {
  const tree = render([row]);
  const scroll = elements(tree, node => node.props.role === 'region')[0];
  assert.equal(scroll.props['aria-label'], 'Provozní metriky jednotlivých sálů');
  assert.equal(scroll.props.tabIndex, 0);
  const baseRules = css.nodes.filter(node => node.type === 'rule');
  const scrollRule = baseRules.find(rule => rule.selector === '.scroll');
  assert.equal(declaration(scrollRule, 'overflow-x'), 'auto');
  assert.equal(declaration(scrollRule, 'max-width'), '100%');
  assert.ok(baseRules.some(rule => rule.selector === '.scroll:focus-visible' && declaration(rule, 'outline')));
  assert.equal(declaration(baseRules.find(rule => rule.selector === '.table tbody th'), 'overflow-wrap'), 'anywhere');
  const responsive = css.nodes.find(node => node.type === 'atrule' && node.name === 'media' && /max-width/.test(node.params));
  const identityRule = responsive.nodes.find(node => node.type === 'rule' && node.selector === '.table .identity');
  assert.equal(declaration(identityRule, 'position'), 'sticky');
  assert.equal(declaration(identityRule, 'left'), '0');
  assert.match(declaration(identityRule, 'background'), /var\(--stats-/);
  css.walkDecls(decl => assert.ok(!['animation', 'transform'].includes(decl.prop), 'Rows should not shift or animate while compared'));
});

test('the continuous metrics panel follows the Overview KPI strip rather than nested or alternating cards', () => {
  const baseRules = css.nodes.filter(node => node.type === 'rule');
  const rule = selector => baseRules.find(node => node.selector === selector);
  assert.equal(declaration(rule('.panel'), 'background'), 'var(--stats-surface)');
  assert.equal(declaration(rule('.panel'), 'border-radius'), '12px');
  assert.equal(declaration(rule('.table tr > :not(:last-child)'), 'border-right'), '1px solid var(--stats-border)');
  assert.equal(declaration(rule('.table thead th'), 'font-size'), '9px');
  assert.equal(declaration(rule('.table thead th'), 'font-weight'), '600');
  assert.equal(declaration(rule('.table thead th'), 'text-transform'), 'uppercase');
  assert.equal(declaration(rule('.table thead th'), 'letter-spacing'), '0.12em');
  assert.equal(declaration(rule('.table thead th'), 'background'), undefined);
  assert.equal(declaration(rule('.table tbody td'), 'font-size'), '20px');
  assert.equal(declaration(rule('.table tbody td'), 'font-weight'), '300');
  assert.equal(declaration(rule('.table tbody th'), 'font-size'), '14px');
  assert.equal(declaration(rule('.table tbody th'), 'font-weight'), '500');
  assert.ok(Number.parseInt(declaration(rule('.table tbody tr'), 'height')) >= 44);
  assert.ok(baseRules.every(node => !/nth-child\(even\)|nth-child\(odd\)/.test(node.selector)), 'The shared surface must not become striped card rows');
  const utilization = cells(bodyRows(render([row]))[0])[2];
  const group = elements(utilization, node => node.props.className === 'utilization')[0];
  assert.deepEqual(React.Children.toArray(group.props.children).map(node => node.props.className), ['percent', 'track']);
});

test('paper layout releases horizontal minimums, repeats headers and does not split room rows', () => {
  const print = css.nodes.find(node => node.type === 'atrule' && node.name === 'media' && node.params === 'print');
  assert.ok(print);
  const rule = selector => print.nodes.find(node => node.type === 'rule' && node.selector === selector);
  assert.equal(declaration(rule('.table'), 'min-width'), '0');
  const viewportRule = print.nodes.find(node => node.type === 'rule' && node.selectors.includes('.panel') && node.selectors.includes('.scroll'));
  assert.equal(declaration(viewportRule, 'overflow'), 'visible');
  assert.equal(declaration(rule('.table thead'), 'display'), 'table-header-group');
  assert.equal(declaration(rule('.table tr'), 'break-inside'), 'avoid');
  assert.equal(declaration(rule('.table .identity'), 'position'), 'static');
  const compactValues = print.nodes.find(node => node.type === 'rule' && node.selectors.includes('.table tbody td') && node.selectors.includes('.table .capacity'));
  assert.equal(declaration(compactValues, 'font-size'), '9px');
  assert.equal(declaration(rule('.table tbody tr'), 'height'), 'auto');
});
