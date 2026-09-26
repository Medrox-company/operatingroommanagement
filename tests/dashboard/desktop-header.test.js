import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

// Presentation contracts only: no browser, sessions, database or room writes.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const globals = postcss.parse(read('app/globals.css'));
const compact = value => value.replace(/\s+/g, '');

function declarations(selector, media = null) {
  const values = {};
  globals.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    const parentMedia = rule.parent.type === 'atrule' && rule.parent.name === 'media' ? rule.parent.params : null;
    if (parentMedia !== media) return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration; });
  });
  return values;
}

function parseComponent(path) {
  return ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function openings(source, tagName) {
  const found = [];
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && (!tagName || node.tagName.getText(source) === tagName)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function attribute(node, name) {
  return node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText() === name);
}

// Only invariant class tokens count: conditional/template expressions cannot
// accidentally make a shared shell appear to exist in just one view mode.
function staticClasses(node) {
  const initializer = attribute(node, 'className')?.initializer;
  if (!initializer) return [];
  if (ts.isStringLiteral(initializer)) return initializer.text.split(/\s+/);
  const expression = ts.isJsxExpression(initializer) ? initializer.expression : null;
  if (expression && ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text.split(/\s+/);
  if (expression && ts.isTemplateExpression(expression)) return expression.head.text.split(/\s+/);
  return [];
}

function ancestorOpenings(node) {
  const ancestors = [];
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent) && parent.openingElement !== node) ancestors.push(parent.openingElement);
  }
  return ancestors;
}

const hasAncestorClass = (node, className) => ancestorOpenings(node).some(parent => staticClasses(parent).includes(className));

test('all desktop titles and kickers use the dashboard reference scale, not local container widths', () => {
  const title = declarations('.app-module-title', '(min-width: 768px)');
  const kicker = declarations('.app-module-kicker', '(min-width: 768px)');
  assert.equal(compact(title['font-size'].value), 'clamp(28px,calc((100vw-168px)*0.045),80px)');
  assert.equal(compact(kicker['font-size'].value), 'clamp(8px,calc((100vw-168px)*0.007),11px)');
  assert.equal(kicker['letter-spacing'].value, '0.22em');
  assert.equal(declarations('.app-module-kicker-row', '(min-width: 768px)').gap.value, '8px');
  globals.walkRules(rule => {
    assert.ok(!rule.selectors.some(selector => /dashboard/.test(selector) && /\.app-module-(?:title|kicker)(?:\b|-)/.test(selector)), `Dashboard-only heading override: ${rule.selector}`);
  });
});

test('shared desktop shell keeps the dashboard 128px / 40px gutters and 40px top inset', () => {
  const shell = declarations('.app-module-shell', '(min-width: 768px)');
  assert.equal(shell['padding-left'].value, '128px');
  assert.equal(shell['padding-right'].value, '40px');
  assert.equal(shell['padding-top'].value, '40px');
  assert.ok(shell['padding-top'].important, 'The canonical top inset must win over legacy safe-top/module rules');
  const content = declarations('.app-module-content');
  assert.equal(content.width.value, '100%');
  assert.equal(content['min-width'].value, '0');
  assert.equal(content['max-width'].value, '2400px');
  assert.equal(content['margin-inline'].value, 'auto');
});

test('card and spatial dashboard modes keep the same invariant shell, content and heading', () => {
  const dashboard = parseComponent('components/DashboardModule.tsx');
  const headings = openings(dashboard, 'ModulePageHeading');
  assert.equal(headings.length, 1, 'Switching dashboard view must not mount a differently styled page heading');
  const heading = headings[0];
  assert.ok(hasAncestorClass(heading, 'app-module-shell'));
  assert.ok(hasAncestorClass(heading, 'app-module-content'));
  const conditionalAncestor = ancestorOpenings(heading).some(parent => attribute(parent, 'className')?.initializer?.getText(dashboard).includes('spatialMode'));
  assert.ok(conditionalAncestor, 'The same containing layout serves both dashboard modes');
});

test('Settings grid and carousel reuse shared shell and content geometry', () => {
  const settings = parseComponent('components/SettingsPage.tsx');
  const headingNodes = openings(settings, 'ModulePageHeading');
  assert.equal(headingNodes.length, 2, 'Both Settings landing views need the canonical heading');
  const carouselHeading = headingNodes.find(node => hasAncestorClass(node, 'app-module-shell'));
  assert.ok(carouselHeading, 'Carousel heading must live inside the shared shell');
  assert.ok(hasAncestorClass(carouselHeading, 'app-module-content'));
  const gridHeading = headingNodes.find(node => node !== carouselHeading);
  assert.ok(ancestorOpenings(gridHeading).some(node => node.tagName.getText(settings) === 'ModuleWrapper'));

  // The grid and every selected Settings module are rendered through this
  // wrapper, rather than duplicating geometry in each view's heading markup.
  const wrapper = settings.statements.flatMap(function find(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(settings) === 'ModuleWrapper') return [node];
    const children = [];
    ts.forEachChild(node, child => { children.push(...find(child)); });
    return children;
  })[0];
  assert.ok(wrapper);
  const wrapperOpenings = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node)) wrapperOpenings.push(node);
    ts.forEachChild(node, visit);
  }
  visit(wrapper);
  assert.ok(wrapperOpenings.some(node => staticClasses(node).includes('app-module-shell')));
  assert.ok(wrapperOpenings.some(node => staticClasses(node).includes('app-module-content')));
});

test('top-level Statistics and Personnel share the same shell and centered content as Settings', () => {
  const app = parseComponent('App.tsx');
  for (const tag of ['StatisticsModule', 'StaffOverviewModule']) {
    const node = openings(app, tag)[0];
    assert.ok(node, `${tag} must be mounted`);
    assert.ok(hasAncestorClass(node, 'app-module-shell'), `${tag} needs shared page gutters`);
    assert.ok(hasAncestorClass(node, 'app-module-content'), `${tag} needs shared ultrawide placement`);
  }
});

test('desktop Patient Flow and Timeline use the shared heading without changing mobile headers', () => {
  for (const [path, mobileTag, title, mutedTitle] of [
    ['components/FlowMonitorModule.tsx', 'MobileFlowView', 'TOK', 'PACIENTA'],
    ['components/TimelineModule.tsx', 'MobileTimelineView', 'ČASOVÁ', 'OSA'],
  ]) {
    const source = parseComponent(path);
    const [heading] = openings(source, 'ModulePageHeading');
    assert.ok(heading, `${path} needs a desktop page heading`);
    assert.ok(hasAncestorClass(heading, 'app-module-content'));
    assert.ok(hasAncestorClass(heading, 'app-module-page-header'));
    assert.ok(ancestorOpenings(heading).some(node => staticClasses(node).includes('hidden') && staticClasses(node).some(token => token.startsWith('md:'))));
    assert.equal(attribute(heading, 'title').initializer.text, title);
    assert.equal(attribute(heading, 'mutedTitle').initializer.text, mutedTitle);
    assert.ok(openings(source, mobileTag).length, 'Existing mobile component must stay mounted');
  }
});

test('shared heading pins copy to the row top even when actions are taller than the title', () => {
  const { outputText } = ts.transpileModule(read('components/ModulePageHeading.tsx'), {
    fileName: 'ModulePageHeading.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.equal(name, 'react', 'The shared heading should introduce no runtime dependency');
    return React;
  }, module.exports, module);
  const heading = module.exports.default({
    icon: 'Icon', kicker: 'SYSTEM CONTROL', title: 'NASTAVENÍ', mutedTitle: 'SYSTÉMU',
    actions: React.createElement('button', { style: { height: 120 } }, 'Akce'),
  });
  const row = React.Children.toArray(heading.props.children)[0];
  assert.ok(row.props.className.split(/\s+/).includes('items-start'));
  assert.ok(!row.props.className.split(/\s+/).includes('items-end'));
  const [copy, actions] = React.Children.toArray(row.props.children);
  assert.equal(copy.props.className, 'min-w-0');
  assert.equal(React.Children.toArray(actions.props.children)[0].props.style.height, 120);
});

test('desktop unification preserves the phone-only hidden kicker rule', () => {
  const displayRules = [];
  globals.walkRules(rule => {
    if (!rule.selectors.includes('.app-module-kicker-row')) return;
    rule.walkDecls('display', declaration => displayRules.push({ value: declaration.value, parent: rule.parent }));
  });
  assert.ok(displayRules.some(rule => rule.value === 'flex' && rule.parent.type === 'root'));
  const hidden = displayRules.filter(rule => rule.value === 'none');
  assert.equal(hidden.length, 1);
  assert.equal(hidden[0].parent.name, 'media');
  assert.equal(hidden[0].parent.params, '(max-width: 767px)');
});
