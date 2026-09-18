import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('shared iOS shell and spatial refinements do not style desktop', () => {
  for (const file of ['../../components/mobile/mobile-shell.css', '../../components/spatial/mobile-spatial-dashboard.css']) {
    postcss.parse(read(file)).walkRules(rule => {
      let parent = rule.parent;
      while (parent && !(parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('max-width: 767px'))) parent = parent.parent;
      assert.ok(parent, `${rule.selector} must remain mobile-only`);
    });
  }
});

test('shared segmented controls expose selection and isolate their animated indicator', () => {
  const source = read('../../components/mobile/MobileShell.tsx');
  const tabs = source.slice(source.indexOf('export function MobilePillTabs'), source.indexOf('export function MobilePillTabs') + 2600);
  assert.match(tabs, /const indicatorId = useId\(\)/);
  assert.match(tabs, /useReducedMotion\(\)/);
  assert.match(tabs, /aria-pressed=\{active\}/);
  assert.match(tabs, /type="button"/);
  assert.ok(tabs.includes('layoutId={`mobile-pill-active-${indicatorId}`}'));
  assert.match(tabs, /reduceMotion/);
});

test('overview search avoids iOS input zoom and room list uses shared system type', () => {
  const css = read('../../components/mobile/mobile-overview.css');
  assert.match(css, /font-family:\s*var\(--m-font-sans/);
  const rules = postcss.parse(css);
  let hasReadableSearch = false;
  rules.walkRules(rule => {
    if (!rule.selector.includes('input')) return;
    rule.walkDecls('font-size', decl => { if (parseFloat(decl.value) >= 16) hasReadableSearch = true; });
  });
  assert.ok(hasReadableSearch);
});
