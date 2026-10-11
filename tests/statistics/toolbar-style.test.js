import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = postcss.parse(read('../../components/statistics/statistics-toolbar.css'));
const rules = [];
css.walkRules(rule => rules.push(rule));
const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
const rule = selector => {
  const found = rules.find(item => item.selector === selector);
  assert.ok(found, `Missing toolbar selector: ${selector}`);
  return declarations(found);
};
const prefix = '.statistics-desktop ';

test('toolbar polish is loaded by the live module and scoped away from mobile and other modules', () => {
  const source = read('../../components/StatisticsModule.tsx');
  assert.match(source, /import '\.\/statistics\/statistics-toolbar\.css'/);
  for (const item of rules) assert.ok(item.selector.startsWith(prefix), item.selector);
  css.walkDecls(declaration => {
    assert.ok(!declaration.important);
    assert.ok(!['transform', 'animation'].includes(declaration.prop));
    assert.doesNotMatch(declaration.value, /#[0-9a-f]{3,8}\b|linear-gradient/i);
  });
});

test('statistics tabs match the acute module geometry and typography without changing their labels', () => {
  const tab = rule(`${prefix}.stats-section-tabs [role='tab']`);
  assert.equal(tab['min-height'], '44px');
  assert.equal(tab['border-radius'], '6px');
  assert.equal(tab['font-size'], '11px');
  assert.equal(tab['font-weight'], '500');
  assert.equal(tab['text-transform'], 'none');
  assert.equal(tab['letter-spacing'], 'normal');
  assert.equal(rule(`${prefix}.stats-section-tabs`).padding, '2px');
  assert.equal(rule(`${prefix}.stats-section-nav`)['border-radius'], '8px');
  assert.equal(rule(`${prefix}.stats-section-nav`).background, 'var(--stats-surface)');
  assert.equal(rule(`${prefix}.stats-section-tabs [role='tab'][aria-selected='true']`).color, 'var(--color-primary)');
});

test('period and exports use matching targets while preserving the fixed Performance period width', () => {
  const actions = rule(`${prefix}.stats-commandbar-actions button`);
  assert.equal(actions['min-height'], '44px');
  assert.equal(actions['border-radius'], '8px');
  assert.equal(actions['font-size'], '11px');
  assert.equal(rule(`${prefix}.stats-commandbar-period`)['min-height'], '50px');
  const globals = read('../../app/globals.css');
  assert.match(globals, /\.stats-commandbar-period\s*\{[^}]*flex:\s*0 0 224px;[^}]*width:\s*224px;/);
  assert.equal(rule(`${prefix}.stats-commandbar-actions`)['flex-wrap'], 'wrap');
  assert.equal(rule(`${prefix}.stats-commandbar-actions`)['max-width'], '100%');
});

test('new styling preserves native focus, horizontal tab access and report callbacks', () => {
  const globals = read('../../app/globals.css');
  assert.match(globals, /\.stats-section-nav\s*\{[^}]*overflow-x:\s*auto;/);
  assert.match(globals, /\.stats-section-tabs \[role='tab'\]:focus-visible\s*\{[^}]*outline-offset:\s*-2px;/);
  const source = read('../../components/StatisticsModule.tsx');
  for (const callback of ['handlePrint', 'handleExportPdf', 'handleExportCsv']) {
    assert.ok(source.includes(`onClick={${callback}}`), callback);
  }
  assert.match(source, /<StatisticsNavigation value=\{tab\} onChange=\{setTab\} \/>/);
});
