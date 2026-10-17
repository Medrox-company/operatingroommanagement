import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('patient flow uses scoped frosted mobile styling without blurring clinical content', () => {
  const source = read('components/mobile/mobile-flow-orbit.css');
  const css = postcss.parse(source);
  css.walkRules(rule => {
    assert.ok(rule.selector.startsWith("html[data-app-design='cliniq'] .mobile-flow-orbit"));
    assert.equal(rule.parent.params, '(max-width: 767px)');
  });
  css.walkDecls('filter', () => assert.fail('Foreground must remain sharp'));
  assert.match(source, /backdrop-filter: blur\(12px\)/);
  assert.match(source, /mobile-orbit-background-v3\.png/);
  assert.match(source, /grid-template-columns: 32px minmax\(0, 1fr\) auto/);
  const component = read('components/mobile/MobileFlowView.tsx');
  assert.match(component, /import '\.\/mobile-flow-orbit.css'/);
  assert.match(component, /background: s.state === 'waiting' \? TRACK : s.color/);
  assert.match(component, /transition=\{reduceMotion/);
});
