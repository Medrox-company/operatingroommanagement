import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/mobile/mobile-timeline-orbit.css');
const css = postcss.parse(source);
const base = selector => {
  let result;
  css.walkRules(rule => {
    if (rule.parent.params === '(max-width: 767px)' && rule.selectors.includes(selector)) result = {
      ...result, ...Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value])),
    };
  });
  assert.ok(result, selector);
  return result;
};
const prefix = "html[data-app-design='cliniq'] ";

test('Plan orbit appearance cannot affect classic or desktop, including drilldown', () => {
  css.walkRules(rule => {
    assert.ok(rule.selectors.every(selector => selector.startsWith(prefix)), rule.selector);
    let parent = rule.parent;
    let phoneOnly = false;
    while (parent) {
      if (parent.name === 'media' && /max-width: (767|359)px/.test(parent.params)) phoneOnly = true;
      parent = parent.parent;
    }
    assert.ok(phoneOnly, rule.selector);
  });
  assert.match(source, /mobile-orbit-background-v3\.png/);
  assert.match(read('components/mobile/MobileTimelineView.tsx'), /import '\.\/mobile-timeline-orbit\.css'/);
});

test('continuous compact timeline keeps full names, touch-sized rows and shared coordinates without room cards', () => {
  assert.equal(base(prefix + '.mtl-row')['min-height'], '44px');
  assert.equal(base(prefix + '.mtl-row')['border-radius'], '0');
  assert.equal(base(prefix + '.mtl-row').background, 'transparent');
  assert.equal(base(prefix + '.mtl-rows').gap, '0');
  assert.equal(base(prefix + '.mtl-rows')['grid-auto-rows'], 'minmax(44px, auto)');
  assert.equal(base(prefix + '.mtl-track').height, '24px');
  assert.equal(base(prefix + '.mtl-axis')['backdrop-filter'], 'blur(12px)');
  assert.equal(base(prefix + '.mtl-axis')['-webkit-backdrop-filter'], 'blur(12px)');
  assert.equal(base(prefix + '.mtl-row-heading > strong')['-webkit-line-clamp'], 'unset');
  assert.equal(base(prefix + '.mtl-row')['backdrop-filter'], 'none');
  css.walkDecls('filter', () => assert.fail('Foreground must stay sharp'));
  css.walkRules(rule => {
    if (rule.selector === prefix + '.mtl-segment') {
      assert.deepEqual(Object.keys(Object.fromEntries(rule.nodes.map(n => [n.prop, n.value]))), ['border-radius']);
    }
  });
  assert.match(read('components/mobile/mobile-timeline.css'), /\.mtl-rows[^\n]*overflow-y: auto/);
});

test('screen and drilldown reserve space for the common fixed dock and short screens retain scrolling', () => {
  assert.match(base(prefix + '.mtl-screen').padding, /105px \+ env\(safe-area-inset-bottom/);
  assert.match(base(prefix + '.mobile-timeline-room-detail > .overflow-y-auto')['padding-bottom'], /125px/);
  assert.match(source, /max-height: 600px/);
  assert.equal(base(prefix + '.mtl-time-pager button')['border-radius'], '50%');
});
