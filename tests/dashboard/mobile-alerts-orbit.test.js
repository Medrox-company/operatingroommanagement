import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/mobile/mobile-alerts-orbit.css');
test('alerts appearance stays scoped to mobile Cliniq and keeps sharp foreground', () => {
  const css = postcss.parse(source);
  css.walkRules(rule => {
    assert.ok(rule.selector.startsWith("html[data-app-design='cliniq'] .mobile-alerts-host"));
    assert.equal(rule.parent.params, '(max-width: 767px)');
  });
  css.walkDecls('filter', () => assert.fail('Do not blur foreground'));
  assert.match(source, /backdrop-filter: blur\(12px\)/);
  assert.match(source, /mobile-orbit-background-v3\.png/);
  assert.match(read('App.tsx'), /className="mobile-alerts-host w-full h-full"/);
  assert.match(read('App.tsx'), /import '\.\/components\/mobile\/mobile-alerts-orbit.css'/);
});
