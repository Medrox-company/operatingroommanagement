import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('components/acute/acute-mobile-orbit.css');
const root = postcss.parse(css);

test('every new appearance rule is confined to optional Cliniq on phones, including portals', () => {
  root.walkRules(rule => {
    assert.ok(rule.selectors.every(selector => selector.startsWith("html[data-app-design='cliniq']")), rule.selector);
    let parent = rule.parent;
    while (parent && parent.type !== 'atrule') parent = parent.parent;
    assert.equal(parent?.name, 'media');
    assert.equal(parent?.params, '(max-width: 767px)');
  });
});

test('same room artwork, sharp foreground, urgency footer and mobile safe area are retained', () => {
  assert.match(css, /mobile-orbit-background-v3\.png/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /rgba\(var\(--acute-card-rgb\), \.32\)/);
  assert.match(css, /-webkit-backdrop-filter: blur\(9px\); backdrop-filter: blur\(9px\)/);
  root.walkDecls('filter', () => assert.fail('Do not blur card text or icons'));
  assert.match(read('components/AcuteRequestsModule.tsx'), /import '\.\/acute\/acute-mobile-orbit\.css'/);
  assert.match(read('App.tsx'), /className="acute-mobile-shell w-full h-full overflow-y-auto hide-scrollbar"/);
});

test('mobile dialog fields avoid zoom and dialogs preserve bounded scrolling', () => {
  assert.match(css, /font-size: 16px/);
  assert.match(css, /max-height: calc\(100dvh/);
  assert.match(read('components/acute/acute-requests.css'), /\.acute-dialog-body \{[^}]*overflow-y: auto/);
  assert.match(css, /\.timeline-popup-close \{\s*border-radius: 50% !important/);
});
