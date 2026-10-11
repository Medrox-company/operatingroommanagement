import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

// Render the production preloader without hooks, network requests or clocks.
// Percentages must describe fetched history, never an elapsed-time estimate.
const source = readFileSync(new URL('../../components/statistics/PerformancePreloader.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  fileName: 'PerformancePreloader.tsx',
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const module = { exports: {} };
new Function('require', 'exports', 'module', code)(name => {
  assert.equal(name, 'react', `The preloader should not need a runtime dependency on ${name}`);
  return React;
}, module.exports, module);
const { PerformancePreloader } = module.exports;
const css = postcss.parse(readFileSync(new URL('../../components/statistics/performance-preloader.css', import.meta.url), 'utf8'));

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

function render(progress, options = {}) {
  const tree = PerformancePreloader({ progress, ...options });
  const bars = elements(tree, node => node.props.role === 'progressbar');
  assert.equal(bars.length, 1);
  assert.equal(bars[0].props['aria-valuemin'], 0);
  assert.equal(bars[0].props['aria-valuemax'], 100);
  assert.ok(bars[0].props['aria-label'] || bars[0].props['aria-labelledby']);
  return { tree, bar: bars[0], text: textContent(tree) };
}

test('known totals use fetched rows and floor percentages rather than optimistic rounding', () => {
  for (const [loaded, total, percent] of [[1000, 2500, 40], [1000, 3000, 33], [0, 2500, 0]]) {
    const view = render({ loaded, total, complete: false });
    assert.equal(view.bar.props['aria-valuenow'], percent);
    assert.match(view.text, new RegExp(`${percent}\\s*%`));
    assert.match(view.text, /Načítám data výkonnosti/);
  }
  const view = render({ loaded: 1000, total: 2500, complete: false });
  const formatter = new Intl.NumberFormat('cs-CZ');
  assert.ok(view.text.includes(formatter.format(1000)));
  assert.ok(view.text.includes(formatter.format(2500)));
});

test('unknown and invalid totals remain indeterminate with no invented percentage', () => {
  for (const progress of [undefined, { loaded: 0, total: null, complete: false }, ...[0, -1, NaN, Infinity].map(total => ({ loaded: 1000, total, complete: false }))]) {
    const view = render(progress);
    assert.equal(view.bar.props['aria-valuenow'], undefined);
    assert.match(view.text, /Zjišťuji počet záznamů/);
    assert.doesNotMatch(view.text, /\d+\s*%|NaN|Infinity/);
  }
});

test('incomplete exact boundaries and changed counts cannot claim completion', () => {
  for (const [loaded, total, expected] of [[2000, 2000, 99], [1000, 500, 99], [1000, 1500, 66]]) {
    const view = render({ loaded, total, complete: false });
    assert.equal(view.bar.props['aria-valuenow'], expected);
    assert.doesNotMatch(view.text, /100\s*%|Historie načtena/);
  }
});

test('completed history including empty results can reach 100 percent', () => {
  for (const loaded of [0, 1500]) {
    const view = render({ loaded, total: loaded, complete: true });
    assert.equal(view.bar.props['aria-valuenow'], 100);
    assert.match(view.text, /100\s*%/);
    assert.match(view.text, /Historie načtena · připravuji statistiky/);
  }
});

test('completed history explicitly identifies the separate workflow wait', () => {
  const view = render({ loaded: 1500, total: 1500, complete: true }, { workflowLoading: true });
  assert.equal(view.bar.props['aria-valuenow'], 100);
  assert.match(view.text, /Historie načtena · čekám na nastavení fází/);
});

test('compact refresh shares actual progress and uses a refresh label', () => {
  const view = render({ loaded: 1000, total: 2500, complete: false }, { compact: true });
  assert.equal(view.bar.props['aria-valuenow'], 40);
  assert.ok(view.tree.props.className.split(' ').includes('stats-performance-loader--compact'));
  assert.match(view.text, /Obnovuji historii/);
});

test('malformed loaded values cannot render negative or nonfinite progress', () => {
  for (const loaded of [-1, NaN, Infinity]) {
    const view = render({ loaded, total: 2500, complete: false });
    const percent = view.bar.props['aria-valuenow'];
    assert.ok(percent === undefined || Number.isFinite(percent) && percent >= 0 && percent <= 99);
    assert.doesNotMatch(view.text, /NaN|Infinity|-\d+\s*%/);
  }
});

test('circular progress keeps SVG geometry finite and decorative', () => {
  const view = render({ loaded: 1000, total: 2500, complete: false });
  const svgs = elements(view.tree, node => node.type === 'svg');
  assert.equal(svgs.length, 1);
  assert.equal(elements(view.tree, node => String(node.props['aria-hidden']) === 'true' && elements(node, child => child.type === 'svg').length > 0).length, 1);
  assert.equal(svgs[0].props.focusable, 'false');
  const [left, top, width, height] = svgs[0].props.viewBox.split(/\s+/).map(Number);
  assert.ok([left, top, width, height].every(Number.isFinite));
  assert.ok(width > 0 && height > 0);
  const circles = elements(svgs[0], node => node.type === 'circle');
  assert.ok(circles.length >= 2);
  for (const circle of circles) {
    const cx = Number(circle.props.cx);
    const cy = Number(circle.props.cy);
    const radius = Number(circle.props.r);
    assert.ok([cx, cy, radius].every(Number.isFinite) && radius > 0);
    assert.ok(cx - radius >= left && cx + radius <= left + width);
    assert.ok(cy - radius >= top && cy + radius <= top + height);
  }
});

test('preloader respects reduced motion and its compact layout can wrap', () => {
  const reduced = [];
  css.walkAtRules('media', media => {
    if (media.params.includes('prefers-reduced-motion: reduce')) media.walkDecls(declaration => reduced.push(declaration));
  });
  assert.ok(reduced.some(declaration => declaration.prop === 'animation' && declaration.value === 'none'));
  assert.ok(reduced.some(declaration => declaration.prop === 'transition' && declaration.value === 'none'));
  const layout = new Map();
  css.walkRules(rule => {
    if (['.stats-performance-loader', '.stats-performance-loader--compact', '.stats-performance-loader-copy'].includes(rule.selector)) {
      layout.set(rule.selector, Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value])));
    }
  });
  assert.equal(layout.get('.stats-performance-loader')['min-width'], '0');
  assert.equal(layout.get('.stats-performance-loader--compact')['max-width'], '100%');
  assert.equal(layout.get('.stats-performance-loader-copy')['min-width'], '0');
  assert.equal(layout.get('.stats-performance-loader-copy')['white-space'], 'normal');
  assert.equal(layout.get('.stats-performance-loader-copy')['overflow-wrap'], 'anywhere');
});
