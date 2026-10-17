import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/statistics/OverviewWorkingHours.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../components/statistics/overview-working-hours.module.css', import.meta.url), 'utf8');
const parent = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
const module = { exports: {} };
const C = { accent: '#06B6D4', green: '#10B981', yellow: '#FBBF24', orange: '#F97316', text: 'var(--stats-text)', muted: 'var(--stats-muted)' };
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
new Function('require', 'exports', 'module', compiled)(name => {
  if (name === 'react') return React;
  if (name === './statistics-theme') return { C };
  if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  assert.fail(`Unexpected working-hours dependency ${name}`);
}, module.exports, module);
const { OverviewWorkingHours } = module.exports;

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

const makeRow = (overrides = {}) => ({
  id: 'private-room-id', name: 'NEUROCHIRURGIE — skutečný dlouhý název sálu', department: 'Neurochirurgie',
  statusColor: '#A78BFA', statusLabel: 'Příjezd pacienta', enabled: true, workingHours: '07:00 – 15:30',
  workingMinutes: 480, operations: 3, utilization: 86, queue: 2, ...overrides,
});

test('working-hours strip retains all supplied rooms, full names, order, exact colors and accessible status', () => {
  const rows = Array.from({ length: 15 }, (_, index) => makeRow({ id: `room-${index}`, name: `Skutečný operační sál s úplným názvem ${index}`, operations: index }));
  const tree = OverviewWorkingHours({ rows });
  const html = renderToStaticMarkup(tree);
  const identities = elements(tree, node => node.type === 'th' && node.props.scope === 'row');
  assert.equal(identities.length, rows.length);
  rows.forEach(row => assert.ok(html.includes(row.name)));
  assert.deepEqual(elements(tree, node => node.props.className === 'name').map(node => node.props.children), rows.map(row => row.name));
  assert.ok(elements(tree, node => node.props.className === 'statusDot').every(node => node.props.style.background === '#A78BFA' && node.props['aria-hidden'] === 'true'));
  assert.equal(elements(tree, node => node.props.className === 'srOnly' && node.props.children === 'Příjezd pacienta').length, 15);
  assert.equal(elements(tree, node => node.type === 'button').length, 0);
  assert.doesNotMatch(html, /room-\d/);
});

test('working-hours strip is one five-column semantic table with accessible local overflow', () => {
  const tree = OverviewWorkingHours({ rows: [makeRow()] });
  assert.equal(elements(tree, node => node.type === 'table').length, 1);
  const headers = elements(tree, node => node.type === 'th' && node.props.scope === 'col');
  assert.deepEqual(headers.map(header => header.props.children), ['Operační sál', 'Pracovní doba', 'Operace', 'Využití', 'Fronta']);
  assert.equal(elements(tree, node => node.type === 'caption')[0].props.children, 'Přehled pracovních dob sálů (dnešní den)');
  const region = elements(tree, node => node.props.role === 'region')[0];
  assert.equal(region.props.tabIndex, 0);
  assert.equal(region.props['aria-label'], 'Pracovní doby operačních sálů');
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /overscroll-behavior-x: contain/);
  assert.match(css, /\.scroll:focus-visible\s*\{\s*outline: 2px/);
});

test('working-hours strip distinguishes unknown utilization from real zero and preserves exact semantic thresholds', () => {
  const tree = OverviewWorkingHours({ rows: [null, 0, 49, 50, 79, 80, 100].map((utilization, index) => makeRow({ id: String(index), utilization })) });
  const values = elements(tree, node => node.props.className === 'value');
  const utilization = values.filter((_, index) => index % 3 === 1);
  assert.deepEqual(utilization.map(node => node.props.children), ['—', '0%', '49%', '50%', '79%', '80%', '100%']);
  assert.deepEqual(utilization.map(node => node.props.style.color), [C.muted, C.orange, C.orange, C.yellow, C.yellow, C.green, C.green]);
  assert.ok(values.filter((_, index) => index % 3 === 0).every(node => node.props.style.color === C.accent));
});

test('working-hours strip preserves configured hours, closed state and queue values without inventing controls', () => {
  const tree = OverviewWorkingHours({ rows: [makeRow({ id: 'open', queue: 0 }), makeRow({ id: 'closed', enabled: false, workingHours: 'Zavřeno', operations: 0, utilization: null, queue: 3 })] });
  assert.deepEqual(elements(tree, node => node.props.className === 'hours').map(node => node.props.children), ['07:00 – 15:30', 'Zavřeno']);
  assert.equal(elements(tree, node => node.props.className === 'duration').length, 1);
  const queue = elements(tree, node => node.props.className === 'value').filter((_, index) => index % 3 === 2);
  assert.deepEqual(queue.map(node => node.props.children), [0, 3]);
  assert.deepEqual(queue.map(node => node.props.style.color), [C.green, C.yellow]);
  assert.doesNotMatch(source, /\b(?:fetch|useEffect|setInterval|onClick)\b/);
});

test('working-hours strip formats 450 minutes as 7 hours 30 minutes without rounding the hour up', () => {
  const html = renderToStaticMarkup(OverviewWorkingHours({ rows: [makeRow({ workingMinutes: 450 })] }));
  assert.match(html, /7 h 30 min/);
  assert.doesNotMatch(html, /8 h 30 min/);
});

test('working-hours strip keeps a correctly spanned empty table and React-escapes room content', () => {
  const empty = OverviewWorkingHours({ rows: [] });
  const emptyCell = elements(empty, node => node.type === 'td')[0];
  assert.equal(emptyCell.props.colSpan, 5);
  assert.equal(emptyCell.props.children, 'Nejsou dostupné žádné operační sály.');
  const html = renderToStaticMarkup(OverviewWorkingHours({ rows: [makeRow({ name: '<script>unsafe</script>', statusLabel: '<b>Not a status element</b>' })] }));
  assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
  assert.ok(html.includes('&lt;b&gt;Not a status element&lt;/b&gt;'));
  assert.doesNotMatch(html, /<script>|private-room-id/);
});

test('working-hours strip uses local screenshot geometry, theme tokens, wrapping and print-safe rows', () => {
  assert.match(css, /background: var\(--stats-surface\)/);
  assert.match(css, /border-radius: 12px/);
  assert.match(css, /font-size: 24px; font-weight: 300/);
  assert.match(css, /font-size: 10px; font-weight: 600/);
  assert.match(css, /border-right: 1px solid var\(--stats-border\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /position: sticky; left: 0/);
  assert.match(css, /background: var\(--stats-modal-bg, var\(--stats-surface-3\)\)/);
  assert.match(css, /@media print[\s\S]*?\.table \{ min-width: 0; \}/);
  assert.match(css, /@media print[\s\S]*?display: table-header-group/);
  assert.match(css, /@media print[\s\S]*?break-inside: avoid/);
  assert.doesNotMatch(css, /\.statistics-module|\.stats-overview-metrics|(?:^|\n)\s*(?:transform|animation):|text-overflow:\s*ellipsis|line-clamp/m);
});

test('Overview adapter supplies existing working-hours calculations without filtering or truncating rooms', () => {
  const adapter = parent.match(/<OverviewWorkingHours rows=\{rooms\.map\(r => \{[\s\S]*?\}\)\} \/>/)?.[0];
  assert.ok(adapter);
  assert.match(adapter, /getRoomWorkingHours\(r, todayIndex\)/);
  assert.match(adapter, /getRoomWorkingMinutes\(r, todayIndex\)/);
  assert.match(adapter, /countOperationsInWorkingHours\(r, statusHistory, period\)/);
  assert.match(adapter, /calculateRoomUtilization\(r, statusHistory, period\)/);
  assert.match(adapter, /getRoomTotalWorkingMinutes\(r, period\) > 0 \? util : null/);
  assert.match(adapter, /queue: r\.queueCount/);
  assert.doesNotMatch(adapter, /\.filter\(|\.slice\(/);
});
