import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/Sidebar.tsx');
const css = postcss.parse(read('components/sidebar-project.css'));
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

// Exercise the real navigation inventory, not an unrelated fixture menu.
const constants = ts.createSourceFile('constants.ts', read('constants.ts'), ts.ScriptTarget.Latest, true);
let inventory;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(constants) === 'SIDEBAR_ITEMS') inventory = node.initializer;
  ts.forEachChild(node, visit);
}
visit(constants);
assert.ok(inventory && ts.isArrayLiteralExpression(inventory));
const items = inventory.elements.map(item => Object.fromEntries(item.properties.map(property => {
  const name = property.name.getText(constants);
  return [name, name === 'icon' ? `icon-${property.initializer.getText(constants)}` : property.initializer.text];
})));

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

function render({ access = () => true, isAdmin = false, currentView = 'dashboard', onNavigate = () => {}, onSendMessage, logout = () => {} } = {}) {
  const imports = {
    react: { ...React, memo: component => component, useMemo: compute => compute() },
    '../constants': { SIDEBAR_ITEMS: items },
    'lucide-react': { LogOut: 'icon-logout', Megaphone: 'icon-message' },
    '../contexts/AuthContext': { useAuth: () => ({ isAdmin, logout, hasModuleAccess: access }) },
    './sidebar-project.css': {},
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(Object.hasOwn(imports, name), name);
    return imports[name];
  }, mod, mod.exports);
  return mod.exports.default({ currentView, onNavigate, onSendMessage });
}

const buttons = tree => elements(tree, node => node.type === 'button');
const declarations = (selector, media = null) => {
  const values = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    const parentMedia = rule.parent.type === 'atrule' && rule.parent.name === 'media' ? rule.parent.params : null;
    if (parentMedia !== media) return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
};

test('the project-styled sidebar keeps centrally permitted modules in their original order and navigates unchanged', () => {
  const navigated = [];
  const access = id => ['flow', 'timeline', 'settings'].includes(id);
  const tree = render({ isAdmin: true, access, currentView: 'timeline', onNavigate: id => navigated.push(id) });
  const nav = elements(tree, node => node.type === 'nav')[0];
  const modules = buttons(nav);
  assert.deepEqual(modules.map(button => button.props['aria-label']), items.filter(item => access(item.id)).map(item => item.label));
  assert.deepEqual(modules.map(button => button.props['aria-current']), [undefined, 'page', undefined]);
  modules.forEach(button => button.props.onClick());
  assert.deepEqual(navigated, ['flow', 'timeline', 'settings']);
  assert.equal(buttons(elements(render({ isAdmin: true, access: () => false }), node => node.type === 'nav')[0]).length, 0, 'Administrator status must not bypass module access');
});

test('room messaging retains administrator, alert-module and callback gating; logout stays available', () => {
  let sent = 0;
  let loggedOut = 0;
  const onSendMessage = () => { sent++; };
  for (const options of [
    { isAdmin: false, onSendMessage },
    { isAdmin: true, access: id => id !== 'alerts', onSendMessage },
    { isAdmin: true },
  ]) {
    assert.equal(buttons(render(options)).filter(button => button.props['aria-label'] === 'Zpráva na sál').length, 0);
  }
  const allowed = buttons(render({ isAdmin: true, onSendMessage, logout: () => { loggedOut++; } }));
  allowed.find(button => button.props['aria-label'] === 'Zpráva na sál').props.onClick();
  allowed.find(button => button.props['aria-label'] === 'Odhlásit').props.onClick();
  assert.equal(sent, 1);
  assert.equal(loggedOut, 1);
  assert.equal(buttons(render({ access: () => false })).length, 1, 'Logout remains available even with no enabled modules');
});

test('the visual rewrite stays inside the existing 96px desktop rail, with no application content or mobile-layout selectors', () => {
  const rail = declarations('.sidebar-project');
  assert.equal(rail.position, 'fixed');
  assert.equal(rail.left, '0');
  assert.equal(rail.width, '96px');
  assert.equal(rail.display, 'none');
  assert.equal(rail.background, 'transparent');
  assert.equal(rail.border, '0');
  assert.equal(declarations('.sidebar-project__actions')['border-top'], '0');
  assert.equal(declarations('.sidebar-project', '(min-width: 768px)').display, 'flex');
  assert.equal(declarations('.sidebar-project__actions')['margin-top'], 'auto');
  assert.equal(declarations('.sidebar-project__links')['flex-direction'], 'column');
  assert.equal(declarations('.sidebar-project__links')['justify-content'], undefined, 'Links remain a compact top-aligned stack');
  css.walkRules(rule => rule.selectors.forEach(selector => {
    assert.match(selector, /^(?:html\[data-operativity-design="light"\] )?\.(?:sidebar-project|planner-rail)(?:\b|__)/);
  }));
  assert.doesNotMatch(css.toString(), /(?:linear|radial)-gradient|backdrop-filter|box-shadow/);
});

test('all sidebar actions keep visible keyboard focus, legible hover/focus labels and at least 44px targets', () => {
  const target = declarations('.sidebar-project__button');
  assert.ok(Number.parseFloat(target['min-width']) >= 44);
  assert.ok(Number.parseFloat(target['min-height']) >= 44);
  assert.match(declarations('.sidebar-project__button:focus-visible').outline, /^2px solid/);
  assert.equal(declarations('.sidebar-project__button:focus-visible .sidebar-project__tooltip').visibility, 'visible');
  assert.equal(declarations('.sidebar-project__button:hover .sidebar-project__tooltip').visibility, 'visible');
  const tooltip = declarations('.sidebar-project__tooltip');
  assert.equal(tooltip['font-size'], '14px');
  assert.equal(tooltip['text-transform'], undefined);
  assert.equal(declarations('.sidebar-project__button', '(prefers-reduced-motion: reduce)').transition, 'none');
  for (const button of buttons(render({ isAdmin: true, onSendMessage: () => {} }))) {
    assert.equal(button.props.type, 'button');
    assert.ok(button.props['aria-label']);
    const icons = elements(button, element => element.props.className === 'sidebar-project__icon');
    assert.equal(icons.length, 1);
    assert.equal(icons[0].props['aria-hidden'], 'true');
    assert.equal(icons[0].props.strokeWidth, 1.75);
  }
});

test('dark and opt-in planning-light rail palettes match the source project without changing clinical tokens', () => {
  const dark = declarations('.sidebar-project');
  const light = declarations('html[data-operativity-design="light"] .sidebar-project');
  const sourceCss = read('public/planning/operativity-source.txt');
  for (const [tokens, mappings] of [
    [dark, { '--or-sidebar-bg': '--bg', '--or-sidebar-raised': '--raised', '--or-sidebar-line': '--line', '--or-sidebar-muted': '--ink-3' }],
    [light, { '--or-sidebar-bg': '--bg', '--or-sidebar-raised': '--raised', '--or-sidebar-line': '--line-2', '--or-sidebar-muted': '--ink-3' }],
  ]) {
    for (const [local, original] of Object.entries(mappings)) assert.ok(sourceCss.includes(`${original}:${tokens[local]}`), `${local} uses the upstream project palette`);
  }
  css.walkDecls(declaration => {
    if (declaration.prop.startsWith('--')) assert.ok(declaration.prop.startsWith('--or-sidebar-'), 'Sidebar styles must not override workflow or global application color tokens');
  });
});

test('outside planning the active and hovered module keep the original neutral white highlight', () => {
  const scope = '.sidebar-project:not(:has(.planner-rail)) .sidebar-project__button';
  const active = declarations(`${scope}[aria-current="page"]`);
  assert.equal(active.background, 'rgba(255, 255, 255, 0.15)', 'Active module must not take the navy raised token');
  assert.equal(active['border-color'], 'transparent');
  assert.equal(active.color, '#fff');
  assert.equal(declarations(`${scope}:hover`).background, 'rgba(255, 255, 255, 0.05)');
});
