import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

const source = readFileSync(new URL('../../components/SettingsPage.tsx', import.meta.url), 'utf8');
const css = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-settings-orbit.css', import.meta.url), 'utf8'));
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;

function nodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, predicate));
  if (!React.isValidElement(node)) return [];
  // Inspect real wrapper contents; hooks exist only in the root under test.
  if (typeof node.type === 'function') return nodes(node.type(node.props), predicate);
  return [...(predicate(node) ? [node] : []), ...nodes(node.props.children, predicate)];
}
const classes = (tree, name) => nodes(tree, node => node.props.className?.split(' ').includes(name));
function harness({ desktop = false, access = () => true } = {}) {
  const state = []; let cursor = 0;
  const hooks = { ...React, useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; }, useMemo: compute => compute(), useEffect() {}, useRef: value => ({ current: value }) };
  const imports = {
    react: hooks, 'next/dynamic': () => () => React.createElement('admin-module'),
    'lucide-react': new Proxy({}, { get: (_, key) => key === '__esModule' ? false : `icon-${String(key)}` }),
    './ErrorBoundary': { ErrorBoundary: ({ children }) => children },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'test-hospital' }) },
    '../contexts/AuthContext': { useAuth: () => ({ hasSubmoduleAccess: access }) },
    '../hooks/useMediaQuery': { useMediaQuery: () => desktop },
    './ModulePageHeading': ({ actions }) => React.createElement('desktop-heading', null, actions),
    './mobile/MobileShell': { MobileHeader: props => React.createElement('mobile-header', props) },
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    if (name.endsWith('.css')) return {};
    assert.ok(Object.hasOwn(imports, name), name); return imports[name];
  }, mod, mod.exports);
  return { render() { cursor = 0; return mod.exports.default({}); }, desktop(value) { desktop = value; } };
}

test('mobile only renders the permitted grid, never carousel or view toggle', () => {
  const app = harness(); const tree = app.render();
  assert.equal(tree.props['data-settings-landing'], 'grid');
  assert.equal(classes(tree, 'settings-grid-card').length, 12);
  assert.equal(classes(tree, 'settings-carousel-card').length, 0);
  assert.equal(classes(tree, 'settings-view-toggle').length, 0);
});

test('category and search filters compose; empty state and module opening still work', () => {
  const app = harness();
  const category = nodes(app.render(), n => n.type === 'button' && n.props.children === 'Personál')[0];
  category.props.onClick();
  assert.equal(classes(app.render(), 'settings-grid-card').length, 3);
  const input = () => nodes(app.render(), n => n.type === 'input')[0];
  input().props.onChange({ target: { value: 'Management' } });
  assert.equal(classes(app.render(), 'settings-grid-card').length, 1);
  input().props.onChange({ target: { value: 'nenalezeno' } });
  assert.equal(classes(app.render(), 'settings-grid-empty').length, 1);
  input().props.onChange({ target: { value: '' } });
  classes(app.render(), 'settings-grid-card')[0].props.onClick();
  const selected = app.render();
  assert.equal(selected.props['data-settings-landing'], undefined);
  assert.equal(nodes(selected, n => n.type === 'admin-module').length, 1);
});

test('restricted permissions do not leak administration cards', () => {
  const app = harness({ access: id => id === 'settings.rooms' });
  assert.equal(classes(app.render(), 'settings-grid-card').length, 1);
  assert.equal(classes(harness({ access: () => false }).render(), 'settings-grid-card').length, 0);
});

test('administration modules share a mobile heading and return to settings without changing permissions', () => {
  for (const id of ['rooms', 'specialties', 'schedule', 'staff', 'statuses', 'notifications', 'statistics', 'staff-overview', 'calendar', 'management', 'devices', 'settings']) {
    const app = harness({ access: key => key === (id === 'settings' ? 'settings.modules' : `settings.${id}`) });
    const cards = classes(app.render(), 'settings-grid-card');
    assert.equal(cards.length, 1, id);
    cards[0].props.onClick();
    const selected = app.render();
    assert.equal(selected.props['data-settings-module'], id);
    assert.equal(classes(selected, 'settings-admin-orbit').length, 1);
    assert.equal(classes(selected, 'admin-mobile-heading').length, 1);
    assert.equal(nodes(selected, n => n.type === 'admin-module').length, 1);
    nodes(selected, n => n.props['aria-label'] === 'Zpět do nastavení')[0].props.onClick();
    assert.equal(app.render().props['data-settings-landing'], 'grid');
  }
});

test('secondary mobile styles preserve desktop, print and semantic chart colors', () => {
  const secondaryCss = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-secondary-orbit.css', import.meta.url), 'utf8'));
  secondaryCss.walkRules(rule => {
    assert.ok(rule.selector.startsWith('html[data-app-design="cliniq"]'));
    assert.ok(rule.parent.params.startsWith('screen and (max-width: 767px)'));
  });
  assert.match(secondaryCss.toString(), /--m-card: var\(--settings-orbit-glass\)/);
  assert.match(secondaryCss.toString(), /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(secondaryCss.toString(), /(?:fill|stroke):/);
});

test('administration styling is mobile-only and keeps planning grids and semantic colors', () => {
  const adminCss = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-admin-orbit.css', import.meta.url), 'utf8'));
  adminCss.walkRules(rule => {
    assert.ok(rule.selector.startsWith('html[data-app-design="cliniq"] .settings-admin-orbit'));
    assert.ok(rule.parent.params.startsWith('(max-width: 767px)'));
  });
  assert.match(adminCss.toString(), /admin-room-row/);
  assert.match(adminCss.toString(), /admin-staff-table/);
  assert.match(adminCss.toString(), /prefers-reduced-motion: reduce/);
  assert.match(adminCss.toString(), /min-height: 44px/);
  assert.doesNotMatch(adminCss.toString(), /color:.*!important/);
});

test('desktop keeps carousel and switching; resizing does not overwrite desktop selection', () => {
  const app = harness({ desktop: true });
  assert.equal(app.render().props['data-settings-landing'], 'carousel');
  app.desktop(false);
  assert.equal(app.render().props['data-settings-landing'], 'grid');
  app.desktop(true);
  assert.equal(app.render().props['data-settings-landing'], 'carousel');
  nodes(app.render(), n => n.props['aria-label'] === 'Zobrazit jako mřížka')[0].props.onClick();
  assert.equal(app.render().props['data-settings-landing'], 'grid');
  assert.equal(classes(app.render(), 'settings-grid-card').length, 13);
});

test('autoplay is guarded on mobile and wrapper identity is stable for search focus', () => {
  assert.match(source, /if \(!isDesktop \|\| selectedModule \|\| landingView !== 'carousel'/);
  assert.ok(source.indexOf('const ModuleWrapper:') < source.indexOf('const SettingsPage:'));
});

test('Orbit styles are limited to optional mobile design and reuse artwork and gentle glass', () => {
  css.walkRules(rule => {
    assert.ok(rule.selector.startsWith('html[data-app-design="cliniq"]'));
    assert.equal(rule.parent.params, '(max-width: 767px)');
  });
  assert.match(css.toString(), /mobile-orbit-background-v3\.png/);
  assert.match(css.toString(), /backdrop-filter: blur\(9px\)/);
  assert.match(css.toString(), /border-radius: 50%/);
  assert.match(css.toString(), /#EEECFF, #C8C9FF 65%, #B9BFFF/);
});
