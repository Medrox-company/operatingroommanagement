import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', 'module', code)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const helper = load('lib/statistics-loading-progress.ts');
const { StatisticsPreloader } = load('components/statistics/StatisticsPreloader.tsx', {
  react: React, '../../lib/statistics-loading-progress': helper,
  './performance-preloader.css': {}, './statistics-preloader.css': {},
});
const walk = (node, predicate) => Array.isArray(node) ? node.flatMap(child => walk(child, predicate))
  : React.isValidElement(node) ? [...(predicate(node) ? [node] : []), ...walk(node.props.children, predicate)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children)
  : typeof node === 'string' || typeof node === 'number' ? String(node) : '';

test('real counts floor the percentage and remain below 100 until completion', () => {
  for (const [loaded, total, expected] of [[0, 2500, 0], [1000, 2500, 40], [1000, 2500.8, 40], [1000, 3000, 33], [2000, 2000, 99], [1000, 500, 99]]) {
    assert.equal(helper.statisticsProgressPercent({ loaded, total, complete: false }), expected);
  }
  assert.equal(helper.statisticsProgressPercent({ loaded: 0, total: 0, complete: true }), 100);
  for (const total of [null, 0, 0.8, -1, NaN, Infinity]) {
    assert.equal(helper.statisticsProgressPercent({ loaded: 1000, total, complete: false }), null);
  }
  for (const loaded of [-1, NaN, Infinity]) {
    assert.equal(helper.statisticsProgressPercent({ loaded, total: 2500, complete: false }), 0);
  }
});

test('aggregation combines only chosen source record counts and does not guess unknown totals', () => {
  const history = { loaded: 1000, total: 2500, complete: false };
  const notifications = { loaded: 100, total: 100, complete: true };
  assert.deepEqual(helper.aggregateStatisticsProgress([history, notifications]), { loaded: 1100, total: 2600, complete: false });
  assert.equal(helper.statisticsProgressPercent(helper.aggregateStatisticsProgress([history, notifications])), 42);
  assert.deepEqual(helper.aggregateStatisticsProgress([history, helper.INITIAL_STATISTICS_PROGRESS]), { loaded: 1000, total: null, complete: false });
  assert.deepEqual(helper.aggregateStatisticsProgress([]), helper.INITIAL_STATISTICS_PROGRESS);
  assert.deepEqual(helper.aggregateStatisticsProgress([{ loaded: 0, total: 0, complete: true }, notifications]), { loaded: 100, total: 100, complete: true });
});

test('progress stores share one provider cache and isolate hospital, period and source keys', () => {
  const cache = new Map(), separateCache = new Map();
  const store = helper.getStatisticsProgressStore(cache);
  assert.equal(helper.getStatisticsProgressStore(cache), store);
  assert.notEqual(helper.getStatisticsProgressStore(separateCache), store);
  let observed = 0;
  store.listeners.set('hospital-a:den:history', new Set([() => observed++]));
  const request = helper.beginStatisticsProgress(store, 'hospital-a:den:history');
  helper.publishStatisticsProgress(store, 'hospital-a:den:history', request, { loaded: 1000, total: 2500, complete: false });
  assert.equal(observed, 2);
  assert.equal(store.entries.has('hospital-b:den:history'), false);
  assert.equal(store.entries.has('hospital-a:rok:history'), false);
  assert.equal(store.entries.has('hospital-a:den:notifications'), false);
  assert.equal(helper.getStatisticsProgressStore(separateCache).entries.size, 0);
});

test('new requests reset real progress and stale callbacks or observer errors cannot replace them', () => {
  const store = helper.getStatisticsProgressStore(new Map());
  const oldRequest = helper.beginStatisticsProgress(store, 'source');
  helper.publishStatisticsProgress(store, 'source', oldRequest, { loaded: 1500, total: 1500, complete: true });
  store.listeners.set('source', new Set([() => { throw new Error('Observer failed'); }]));
  const nextRequest = helper.beginStatisticsProgress(store, 'source');
  assert.deepEqual(store.entries.get('source').progress, helper.INITIAL_STATISTICS_PROGRESS);
  helper.publishStatisticsProgress(store, 'source', oldRequest, { loaded: 1500, total: 1500, complete: true });
  assert.equal(store.entries.get('source').request, nextRequest);
  assert.deepEqual(store.entries.get('source').progress, helper.INITIAL_STATISTICS_PROGRESS);
});

test('generic preloader announces supplied scope, actual counts and an indeterminate unknown count', () => {
  const known = StatisticsPreloader({ progress: { loaded: 1000, total: 2500, complete: false }, label: 'Načítám podklady přehledu…' });
  const bar = walk(known, node => node.props.role === 'progressbar')[0];
  assert.equal(bar.props['aria-label'], 'Načítám podklady přehledu…');
  assert.equal(bar.props['aria-valuenow'], 40);
  assert.match(text(known), /40\s*%/);
  assert.ok(text(known).includes(new Intl.NumberFormat('cs-CZ').format(1000)));
  const unknown = StatisticsPreloader({ progress: helper.INITIAL_STATISTICS_PROGRESS });
  assert.equal(walk(unknown, node => node.props.role === 'progressbar')[0].props['aria-valuenow'], undefined);
  assert.doesNotMatch(text(unknown), /\d+\s*%/);
  assert.match(text(unknown), /Zjišťuji počet záznamů/);
});

test('generic refresh and zero-row completion retain the existing accessible loader geometry', () => {
  const compact = StatisticsPreloader({ progress: { loaded: 1000, total: 1000, complete: false }, compact: true, hint: 'Vybrané období' });
  assert.ok(compact.props.className.includes('stats-performance-loader--compact'));
  assert.equal(walk(compact, node => node.props.role === 'progressbar')[0].props['aria-valuenow'], 99);
  const complete = StatisticsPreloader({ progress: { loaded: 0, total: 0, complete: true } });
  assert.equal(walk(complete, node => node.props.role === 'progressbar')[0].props['aria-valuenow'], 100);
  assert.match(text(complete), /Data načtena/);
  assert.equal(walk(complete, node => node.type === 'svg')[0].props.focusable, 'false');
  const css = postcss.parse(read('components/statistics/performance-preloader.css'));
  const reduced = [];
  css.walkAtRules('media', media => {
    if (media.params.includes('prefers-reduced-motion: reduce')) media.walkDecls(declaration => reduced.push(declaration));
  });
  assert.ok(reduced.some(declaration => declaration.prop === 'animation' && declaration.value === 'none'));
  assert.ok(reduced.some(declaration => declaration.prop === 'transition' && declaration.value === 'none'));
});

test('known API response tasks use an explicit unit and cannot complete before assembly', () => {
  const pending = StatisticsPreloader({ progress: { loaded: 1, total: 2, complete: false }, unitName: 'ročních rozpisů' });
  assert.equal(pending.props['aria-valuenow'], 50);
  assert.match(text(pending), /1 z 2 ročních rozpisů/);
  assert.doesNotMatch(text(pending), /záznamů/);
  const decoded = StatisticsPreloader({ progress: { loaded: 2, total: 2, complete: false }, unitName: 'ročních rozpisů' });
  assert.equal(decoded.props['aria-valuenow'], 99);
});
