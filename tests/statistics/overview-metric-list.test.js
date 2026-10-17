import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/statistics/OverviewMetricList.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../components/statistics/overview-metric-list.module.css', import.meta.url), 'utf8');
const parent = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
const module = { exports: {} };
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
new Function('require', 'exports', 'module', compiled)(name => {
  if (name === 'react') return React;
  if (name === './statistics-theme') return { C: { accent: '#06B6D4' } };
  if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
  assert.fail(`Unexpected list dependency ${name}`);
}, module.exports, module);
const { OverviewMetricList } = module.exports;

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

test('ranked list retains every supplied full name, exact count, semantic color and order', () => {
  const items = Array.from({ length: 15 }, (_, index) => ({ label: `Dlouhý skutečný název operačního sálu ${index}`, value: index, color: '#10B981' }));
  const tree = OverviewMetricList({ title: 'Výkony / sál (24 h)', items, ranked: true, emptyText: 'Bez výkonů.' });
  assert.equal(tree.props['aria-label'], 'Výkony / sál (24 h)');
  const rows = elements(tree, node => node.type === 'li');
  assert.equal(rows.length, items.length);
  const html = renderToStaticMarkup(tree);
  items.forEach(item => assert.ok(html.includes(item.label)));
  assert.equal(elements(tree, node => node.props.className === 'rank').length, 15);
  assert.deepEqual(elements(tree, node => node.props.className === 'value').map(node => node.props.children), items.map(item => String(item.value)));
  assert.ok(elements(tree, node => node.props.className === 'value').every(node => node.props.style.color === '#10B981'));
  assert.equal(elements(tree, node => node.type === 'button').length, 0);
});

test('department list keeps zero values, custom displayed values and shared accessible empty state', () => {
  const tree = OverviewMetricList({ title: 'Oddělení — výkony / 24 h', items: [{ label: 'Bez výkonu', value: 0 }, { label: 'Přesný název', value: 2, display: '2 výkony' }], emptyText: 'Bez výkonů.' });
  assert.equal(elements(tree, node => node.props.className === 'rank').length, 0);
  assert.equal(elements(tree, node => node.type === 'progress')[0].props.max, 2);
  assert.equal(elements(tree, node => node.type === 'progress')[0].props.value, 0);
  assert.equal(elements(tree, node => node.type === 'progress')[0].props['aria-hidden'], 'true');
  assert.match(renderToStaticMarkup(tree), /2 výkony/);
  const empty = OverviewMetricList({ title: 'Oddělení', items: [], emptyText: 'Bez výkonů.' });
  assert.match(renderToStaticMarkup(empty), /Bez výkonů\./);
  assert.equal(elements(empty, node => node.type === 'progress').length, 0);
});

test('Overview adapters retain the original ranking sources and limits without restyling shared BarList', () => {
  assert.match(parent, /<OverviewMetricList title="Výkony \/ sál \(24 h\)"[\s\S]*?roomBarData[\s\S]*?\.sort\(\(a, b\) => b\.ops - a\.ops\)[\s\S]*?\.slice\(0, 8\)/);
  assert.match(parent, /<OverviewMetricList title="Oddělení — výkony \/ 24 h"[\s\S]*?deptMap\.slice\(0, 7\)/);
  assert.match(css, /background: var\(--stats-surface\)/);
  assert.match(css, /border-left: 1px solid var\(--stats-border\)/);
  assert.match(css, /font-size: 24px; font-weight: 300/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /\.statistics-module|\.stats-overview-metrics|(?:^|\n)\s*(?:transform|animation):/m);
});
