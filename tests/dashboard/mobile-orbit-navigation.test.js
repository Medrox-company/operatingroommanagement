import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

// Bounded renders execute the real navigation and its event handlers. Providers,
// effects and the Drawer portal are mocked; no browser or clinical IO is used.
const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/MobileNav.tsx');
const icons = require('lucide-react');
const parse = (path, text = read(path)) => ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function findNode(root, predicate) {
  let found;
  function visit(node) {
    if (found) return;
    if (predicate(node)) { found = node; return; }
    ts.forEachChild(node, visit);
  }
  visit(root);
  assert.ok(found, 'Expected source contract was not found');
  return found;
}

// Read the real module inventory without executing unrelated fixture constants.
const constants = parse('constants.ts');
const inventory = findNode(constants, node => ts.isVariableDeclaration(node)
  && ts.isIdentifier(node.name) && node.name.text === 'SIDEBAR_ITEMS').initializer;
const iconNames = [...new Set(inventory.elements.map(item => item.properties
  .find(property => property.name?.getText(constants) === 'icon').initializer.getText(constants)))];
const items = new Function(...iconNames, `return (${inventory.getText(constants)});`)(...iconNames.map(name => icons[name]));
const { outputText } = ts.transpileModule(source, {
  fileName: 'MobileNav.tsx',
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.isValidElement(node) ? content(node.props.children) : '';
}

function harness(initial = {}, initiallyAllowed = items.map(item => item.id)) {
  const props = { currentView: 'dashboard', ...initial };
  let allowed = new Set(initiallyAllowed);
  let stateCursor = 0;
  let refCursor = 0;
  const states = [];
  const refs = [];
  const calls = [];
  const imports = {
    react: {
      ...React, memo: component => component, useMemo: factory => factory(),
      useCallback: callback => callback, useEffect: () => {},
      useState: initialValue => {
        const index = stateCursor++;
        if (!(index in states)) states[index] = typeof initialValue === 'function' ? initialValue() : initialValue;
        return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
      },
      useRef: initialValue => {
        const index = refCursor++;
        if (!(index in refs)) refs[index] = { current: initialValue };
        return refs[index];
      },
    },
    'lucide-react': icons,
    '../constants': { SIDEBAR_ITEMS: items },
    '../hooks/useAppDesign': { useAppDesign: () => ({ design: initial.design ?? 'classic' }) },
    '../contexts/AuthContext': { useAuth: () => ({ isSuperAdmin: false, hasModuleAccess: id => allowed.has(id), logout: async () => {} }) },
    './ui/Drawer': { Drawer: 'drawer' },
    './mobile/mobile-navigation.css': {},
    './mobile/mobile-orbit-navigation.css': {},
    './mobile/mobile-orbit-more.css': {},
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
    return imports[name];
  }, module.exports, module);
  return {
    calls,
    permissions(ids) { allowed = new Set(ids); },
    render(overrides = {}) {
      Object.assign(props, overrides);
      stateCursor = 0;
      refCursor = 0;
      const tree = module.exports.default({ ...props, onNavigate: id => calls.push(id) });
      const [nav] = elements(tree, element => element.type === 'nav');
      const [drawer] = elements(tree, element => element.type === 'drawer');
      const tabs = elements(nav, element => element.type === 'button');
      const [group] = elements(drawer, element => element.props['aria-label'] === 'Další moduly');
      return { nav, drawer, tabs, more: tabs.at(-1), links: elements(group, element => element.type === 'button') };
    },
  };
}

test('open-room dock has reference labels, order and existing authenticated destinations', () => {
  const app = harness({ roomDetail: true });
  const view = app.render();
  assert.deepEqual(view.tabs.map(content), ['Sály', 'Požadavky', 'Plán', 'Více']);
  assert.ok(view.nav.props.className.split(' ').includes('mobile-orbit-nav'));
  assert.deepEqual(view.tabs.slice(0, -1).map(tab => tab.props['aria-label']),
    ['dashboard', 'acute-requests', 'timeline'].map(id => items.find(item => item.id === id).label));
  assert.deepEqual(view.tabs.slice(0, -1).map(tab => tab.props['aria-current']), ['page', undefined, undefined]);
  for (const tab of view.tabs.slice(0, -1)) tab.props.onClick();
  assert.deepEqual(app.calls, ['dashboard', 'acute-requests', 'timeline']);
  assert.ok(view.tabs.every(tab => tab.props.type === 'button'));
});

test('Cliniq overview uses the identical room-detail dock and keeps other modules in More', () => {
  const overview = harness({ design: 'cliniq' }).render();
  const detail = harness({ roomDetail: true }).render();
  assert.equal(overview.nav.props.className, detail.nav.props.className);
  assert.deepEqual(overview.tabs.map(content), detail.tabs.map(content));
  assert.deepEqual(overview.links.map(content), detail.links.map(content));
  assert.deepEqual(overview.tabs.map(tab => tab.props['aria-current']), detail.tabs.map(tab => tab.props['aria-current']));
  assert.ok(!harness({ design: 'cliniq', currentView: 'statistics' }).render().nav.props.className.includes('mobile-orbit-nav'));
});

test('Cliniq requests share the detail dock with only Requests selected', () => {
  const view = harness({ design: 'cliniq', currentView: 'acute-requests' }).render();
  const detail = harness({ roomDetail: true }).render();
  assert.equal(view.nav.props.className, detail.nav.props.className);
  assert.deepEqual(view.tabs.map(content), detail.tabs.map(content));
  assert.deepEqual(view.tabs.map(tab => tab.props['aria-current']), [undefined, 'page', undefined, undefined]);
  assert.ok(!harness({ design: 'classic', currentView: 'acute-requests' }).render().nav.props.className.includes('mobile-orbit-nav'));
});

test('Cliniq Plan uses the shared dock, preserves routing and selects only Plan', () => {
  const app = harness({ design: 'cliniq', currentView: 'timeline' });
  const view = app.render();
  assert.equal(view.nav.props.className, harness({ roomDetail: true }).render().nav.props.className);
  assert.deepEqual(view.tabs.map(content), ['Sály', 'Požadavky', 'Plán', 'Více']);
  assert.deepEqual(view.tabs.map(tab => tab.props['aria-current']), [undefined, undefined, 'page', undefined]);
  view.tabs[2].props.onClick();
  assert.deepEqual(app.calls, ['timeline']);
  assert.ok(!harness({ design: 'classic', currentView: 'timeline' }).render().nav.props.className.includes('mobile-orbit-nav'));
});

test('permission filtering removes unavailable primary and More destinations without replacements', () => {
  const app = harness({ roomDetail: true }, ['dashboard', 'statistics', 'settings']);
  let view = app.render();
  assert.deepEqual(view.tabs.map(content), ['Sály', 'Více']);
  view.more.props.onClick();
  view = app.render();
  assert.equal(view.drawer.props.open, true);
  assert.deepEqual(view.links.map(content), ['Statistiky', 'Nastavení']);
  assert.ok(![...view.tabs, ...view.links].some(button => /Požadavky|Plán|Tok pacienta|Upozornění/.test(content(button))));

  app.permissions(['timeline']);
  view = app.render();
  assert.deepEqual(view.tabs.map(content), ['Plán', 'Více']);
  assert.deepEqual(view.links, [], 'Revoked modules must disappear from an already open drawer');
  view.tabs[0].props.onClick();
  assert.deepEqual(app.calls, ['timeline']);

  app.permissions([]);
  view = app.render();
  assert.deepEqual(view.tabs.map(content), ['Více']);
  assert.deepEqual(view.links, []);
});

test('every other permitted module remains reachable through More, including its active state', () => {
  const app = harness({ roomDetail: true, currentView: 'statistics' });
  let view = app.render();
  assert.equal(view.more.props['aria-haspopup'], 'dialog');
  assert.equal(view.more.props['aria-expanded'], false);
  assert.equal(view.more.props['data-active'], true);
  view.more.props.onClick();
  view = app.render();
  assert.equal(view.more.props['aria-expanded'], true);
  assert.equal(view.drawer.props.open, true);
  const expected = items.filter(item => !['dashboard', 'acute-requests', 'timeline'].includes(item.id));
  assert.deepEqual(view.links.map(content), expected.map(item => item.label));
  assert.equal(view.links.find(link => content(link) === 'Statistiky').props['aria-current'], 'page');
  for (const link of view.links) link.props.onClick();
  assert.deepEqual(app.calls, expected.map(item => item.id));
  assert.equal(app.render().drawer.props.open, false, 'Selecting a module closes the drawer');
});

test('normal navigation keeps its original labels, primary modules and active tab', () => {
  for (const initial of [{}, { roomDetail: false }]) {
    const app = harness({ ...initial, currentView: 'timeline' });
    let view = app.render();
    assert.deepEqual(view.tabs.map(content), ['Přehled', 'Tok', 'Rozpis', 'Statistiky', 'Více']);
    assert.ok(!view.nav.props.className.split(' ').includes('mobile-orbit-nav'));
    assert.deepEqual(view.tabs.slice(0, -1).map(tab => tab.props['aria-current']), [undefined, undefined, 'page', undefined]);
    view.tabs[2].props.onClick();
    assert.deepEqual(app.calls, ['timeline']);
    view.more.props.onClick();
    view = app.render();
    assert.deepEqual(view.links.map(content), ['Akutní výkony', 'Upozornění', 'Nastavení']);
    assert.equal(view.more.props['data-active'], undefined);
  }
});

test('reference dock styles cannot leak beyond the mobile viewport or open-room selector', () => {
  const css = postcss.parse(read('components/mobile/mobile-orbit-navigation.css'));
  let count = 0;
  css.walkRules(rule => {
    count++;
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media'
      && /max-width:\s*767px/.test(parent.params))) parent = parent.parent;
    assert.ok(parent, `${rule.selector} must remain under the mobile-only breakpoint`);
    for (const selector of rule.selectors) assert.match(selector, /\.mobile-orbit-nav(?:\b|[\s.:>\[])/,
      `${selector} must not change the ordinary navigation`);
  });
  assert.ok(count > 0, 'The reference dock stylesheet must contain rules');
  const targets = {};
  css.walkRules(rule => {
    if (rule.selector !== '.mobile-reference-nav.mobile-orbit-nav > button') return;
    rule.walkDecls(declaration => { targets[declaration.prop] = declaration.value; });
  });
  assert.ok(parseFloat(targets['min-width']) >= 44, 'Dock controls need at least 44px width');
  assert.ok(parseFloat(targets['min-height']) >= 44, 'Dock controls need at least 44px height');
});

test('the real App enables the dock only for an open dashboard or authorized acute room detail', () => {
  const app = parse('App.tsx');
  const nav = findNode(app, node => (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
    && node.tagName.getText(app) === 'MobileNav');
  const prop = nav.attributes.properties.find(attribute => ts.isJsxAttribute(attribute)
    && attribute.name.getText(app) === 'roomDetail');
  assert.ok(prop?.initializer && ts.isJsxExpression(prop.initializer));
  const expression = prop.initializer.expression.getText(app);
  const enabled = new Function('selectedRoom', 'currentView', 'acuteRoomEnabled', `return (${expression});`);
  for (const currentView of items.map(item => item.id)) {
    for (const selectedRoom of [null, { id: 'real-room' }]) {
      for (const acuteRoomEnabled of [false, true]) {
        assert.equal(enabled(selectedRoom, currentView, acuteRoomEnabled), Boolean(selectedRoom)
          && (currentView === 'dashboard' || (currentView === 'timeline' && acuteRoomEnabled)),
        JSON.stringify({ currentView, selectedRoom, acuteRoomEnabled }));
      }
    }
  }
});
