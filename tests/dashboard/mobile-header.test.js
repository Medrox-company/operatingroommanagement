import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/mobile/MobileShell.tsx');
const { outputText } = ts.transpileModule(source, {
  fileName: 'MobileShell.tsx',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
});
const dependencies = {
  react: { __esModule: true, default: React, useEffect: () => {}, useId: () => 'header-test' },
  'framer-motion': { motion: {}, AnimatePresence: () => null, useReducedMotion: () => true },
  'lucide-react': { Moon: 'Moon', Sun: 'Sun', X: 'X' },
  '../../hooks/useIsMobileDark': { useMobileTheme: () => ({ isDark: true, toggle: () => {} }) },
  './mobile-shell.css': {},
};
const mod = { exports: {} };
new Function('require', 'exports', 'module', outputText)(name => {
  assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
  return dependencies[name];
}, mod.exports, mod);
const { MobileHeader, MobileModuleHeader, MobileThemeToggle } = mod.exports;
const children = node => React.Children.toArray(node?.props?.children);
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : children(node).map(text).join('');
const byClass = (node, name) => children(node).find(child => child.props?.className?.split(/\s+/).includes(name));

test('mobile heading puts the actual page title first, in the same top row as actions', () => {
  for (const [kicker, title] of [['Operační blok', 'Přehled sálů'], ['Živý operační program', 'Tok pacienta'], ['Konfigurace systému', 'Nastavení']]) {
    const right = React.createElement('button', { 'aria-label': 'Upozornění' });
    const header = MobileHeader({ kicker, title, right });
    const toolbar = byClass(header, 'mobile-heading-toolbar');
    const [heading, actions] = children(toolbar);
    assert.equal(heading.type, 'h1');
    assert.equal(text(heading), title);
    assert.equal(actions.props.className, 'mobile-heading-actions');
    assert.equal(children(actions)[0].props['aria-label'], 'Upozornění');
    assert.equal(children(actions)[1].type, MobileThemeToggle);
    assert.equal(text(header), title, 'Legacy kicker must not remain visible or duplicated');
    assert.equal(children(header).length, 1, 'No empty second heading row');
  }
});

test('hospital context and the date stay below the title without introducing another heading', () => {
  const header = MobileHeader({ title: 'Přehled sálů', description: 'KNL', secondary: React.createElement('time', { dateTime: '2026-09-18' }, '18. 9. 2026') });
  const copy = byClass(header, 'mobile-heading-copy');
  assert.equal(children(header).length, 2);
  assert.deepEqual(children(copy).map(node => node.type), ['p', 'time']);
  assert.equal(text(copy), 'KNL18. 9. 2026');
});

test('the title-only variant creates neither an empty utility row nor an empty metadata row', () => {
  const header = MobileHeader({ title: 'Rozpis', showThemeToggle: false });
  assert.equal(children(header).length, 1);
  const toolbar = byClass(header, 'mobile-heading-toolbar');
  assert.equal(children(toolbar).length, 1);
  assert.equal(children(toolbar)[0].type, 'h1');
  assert.equal(text(header), 'Rozpis');
});

test('metadata can contain just a description or just a secondary slot without an empty paragraph', () => {
  const withDescription = MobileHeader({ title: 'Operační blok', description: 'Centrální sály' });
  assert.deepEqual(children(byClass(withDescription, 'mobile-heading-copy')).map(node => node.type), ['p']);
  const withSecondary = MobileHeader({ title: 'Přehled sálů', secondary: React.createElement('time', null, '09:41') });
  assert.deepEqual(children(byClass(withSecondary, 'mobile-heading-copy')).map(node => node.type), ['time']);
});

test('module headers use the same compact heading and preserve the existing metrics slot', () => {
  const module = MobileModuleHeader({ kicker: 'Živý operační program', title: 'Tok pacienta', children: React.createElement('div', null, 'Souhrn') });
  const [header, metrics] = children(module);
  assert.equal(header.type, MobileHeader);
  assert.equal(header.props.embedded, true);
  assert.equal(text(MobileHeader(header.props)), 'Tok pacienta');
  assert.equal(text(metrics), 'Souhrn');
});

test('title and metadata shrink within the phone width and Rozpis no longer floats its header', () => {
  const css = postcss.parse(read('components/mobile/mobile-shell.css'));
  const declarations = selector => {
    const values = {};
    css.walkRules(rule => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls(decl => { values[decl.prop] = decl.value; });
    });
    return values;
  };
  assert.equal(declarations('.mobile-heading-toolbar > h1')['min-width'], '0');
  assert.equal(declarations('.mobile-heading-actions')['flex-shrink'], '0');
  assert.equal(declarations('.mobile-heading-description')['overflow-wrap'], 'anywhere');
  assert.equal(declarations('.mobile-heading-toolbar')['min-height'], '44px');
  assert.doesNotMatch(read('components/mobile/mobile-timeline.css'), /float:\s*right|mobile-heading-kicker|mobile-heading-copy/);
});

test('shared administration kickers are hidden only on phones, not on desktop', () => {
  const css = postcss.parse(read('app/globals.css'));
  const displayRules = [];
  css.walkRules(rule => {
    if (!rule.selectors.includes('.app-module-kicker-row')) return;
    rule.walkDecls('display', declaration => displayRules.push({ value: declaration.value, parent: rule.parent }));
  });
  assert.ok(displayRules.some(rule => rule.value === 'flex' && rule.parent.type === 'root'));
  const hidden = displayRules.filter(rule => rule.value === 'none');
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].parent.name, 'media');
  assert.equal(hidden[0].parent.params, '(max-width: 767px)');
});
