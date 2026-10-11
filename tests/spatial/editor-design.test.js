import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import ts from 'typescript';

// Presentation contracts only. No browser, WebGL, database or clinical writes.
const componentPath = '../../components/SpatialEditorManager.tsx';
const componentSource = readFileSync(new URL(componentPath, import.meta.url), 'utf8');
const source = ts.createSourceFile('SpatialEditorManager.tsx', componentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const css = postcss.parse(readFileSync(new URL('../../components/spatial/spatial-editor-theme.css', import.meta.url), 'utf8'));
const compact = value => value.replace(/\s+/g, '');

function openings(tag) {
  const found = [];
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && (!tag || node.tagName.getText(source) === tag)) found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

function attribute(node, name) {
  return node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(source) === name);
}

function value(node, name) {
  const initializer = attribute(node, name)?.initializer;
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  return ts.isJsxExpression(initializer) ? initializer.expression?.getText(source) : initializer.getText(source);
}

function ancestors(node) {
  const result = [];
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent) && parent.openingElement !== node) result.push(parent.openingElement);
  }
  return result;
}

const hasClass = (node, token) => value(node, 'className')?.split(/\s+/).includes(token);

function declarations(selector, condition = null) {
  const result = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    const parentCondition = rule.parent.type === 'atrule' ? `${rule.parent.name} ${rule.parent.params}` : null;
    if (parentCondition !== condition) return;
    rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
  });
  return result;
}

function loadPresentation() {
  const { outputText } = ts.transpileModule(componentSource, {
    fileName: 'SpatialEditorManager.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  const state = { current: null };
  const noMutation = () => { throw new Error('Presentation test must not execute editor or data mutations'); };
  const project = { id: 'design-only', schemaVersion: 1, units: 'm', floors: [], rooms: [], items: [] };
  const nativeRequire = createRequire(import.meta.url);
  const resolve = name => {
    if (name === 'react') return React;
    if (name === 'lucide-react') return nativeRequire(name);
    if (name === './ModulePageHeading') return { __esModule: true, default: props => React.createElement('h1', null, props.title, ' ', props.mutedTitle) };
    if (name === '../contexts/HospitalContext') return { useHospital: () => ({ activeHospitalId: 'presentation-only', activeHospital: { hospital_name: 'Test zařízení' } }) };
    if (name === '../hooks/useSpatialProject') return { useSpatialProject: () => ({
      project, storedProject: null, revision: 0, updatedAt: null, isLoading: false, error: null,
      save: noMutation, remove: noMutation, reload: noMutation, ...state.current,
    }) };
    if (name === './ui/ConfirmDialog') return { useConfirm: () => noMutation };
    if (name === './ui/toast') return { toast: { success: noMutation, error: noMutation } };
    if (name === '../lib/spatial-project') return { autoLinkSpatialRooms: noMutation, createDefaultSpatialProject: noMutation };
    if (name === '../vendor/orms-spatial-editor/src/editor.js') return { mountEditor: noMutation };
    if (name === './spatial/spatial-editor-theme.css') return {};
    throw new Error(`Unexpected presentation dependency: ${name}`);
  };
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports);
  return overrides => {
    state.current = overrides;
    return renderToStaticMarkup(React.createElement(module.exports.default, { rooms: [{ id: 'actual-room', name: 'Sál z aplikace' }] }));
  };
}

const renderPresentation = loadPresentation();

test('3D editor keeps the shared heading and places its commandbar below it', () => {
  const [heading] = openings('ModulePageHeading');
  assert.ok(heading);
  assert.equal(value(heading, 'title'), '3D');
  assert.equal(value(heading, 'mutedTitle'), 'DISPOZICE');
  const header = ancestors(heading).find(node => node.tagName.getText(source) === 'header');
  assert.ok(hasClass(header, 'mb-7'), 'Heading spacing must match the other Settings modules');
  const toolbar = openings('section').find(node => hasClass(node, 'spatial-editor-commandbar'));
  assert.ok(toolbar);
  assert.ok(!ancestors(toolbar).some(node => node.tagName.getText(source) === 'header'), 'Commands must not crowd the title row');
  assert.equal(value(toolbar, 'aria-label'), 'Ovládání 3D dispozice');
  assert.ok(componentSource.includes("import './spatial/spatial-editor-theme.css'"));
});

test('all five original editor commands retain their handlers, busy guards and accessible names', () => {
  const commandButtons = openings('button').filter(node => ancestors(node).some(parent => hasClass(parent, 'spatial-editor-icon-bar')));
  assert.equal(commandButtons.length, 5);
  const guards = new Map([
    ['handleAutoLink', '!hasProject || rooms.length === 0 || isLoading || saving || deleting'],
    ['handleReset', 'isLoading || saving || deleting'],
    ['handleDelete', '!hasProject || isLoading || saving || deleting'],
    ['handleReload', 'isLoading || saving || deleting'],
    ['handleSave', '!dirty || saving || deleting || isLoading'],
  ]);
  for (const button of commandButtons) {
    const handler = value(button, 'onClick');
    assert.ok(guards.has(handler), `Unexpected command: ${handler}`);
    assert.equal(compact(value(button, 'disabled')), compact(guards.get(handler)), `${handler} must preserve its safety guards`);
    assert.equal(value(button, 'type'), 'button');
    assert.ok(value(button, 'aria-label'));
    assert.ok(value(button, 'title'));
  }
  assert.deepEqual(new Set(commandButtons.map(button => value(button, 'onClick'))), new Set(guards.keys()));
  assert.match(componentSource, /if \(!accepted\) return;/, 'Delete must still require confirmation');
  assert.match(componentSource, /if \(storedProject\) await remove\(revision\)/);
  assert.match(componentSource, /await save\(draft, revision\)/);
});

test('save, empty and error statuses render visibly with polite announcements', () => {
  const status = openings('p').find(node => hasClass(node, 'spatial-editor-status'));
  assert.ok(status);
  assert.equal(value(status, 'role'), 'status');
  assert.equal(value(status, 'aria-live'), 'polite');
  assert.ok(!hasClass(status, 'sr-only'));
  const empty = renderPresentation({});
  assert.match(empty, /role="status" aria-live="polite"/);
  assert.match(empty, /Vytvořit operační blok/);
  assert.match(empty, /Operační blok není vytvořen/);
  assert.match(empty, /aria-busy="false"/);
  const saved = renderPresentation({ storedProject: { id: 'stored' } });
  assert.match(saved, /Dispozice je uložena/);
  assert.match(saved, /spatial-editor-host/);
  assert.doesNotMatch(saved, /Vytvořit operační blok/);
  const error = renderPresentation({ error: new Error('Uložení <selhalo>') });
  assert.match(error, /data-state="error"/);
  assert.match(error, /Uložení &lt;selhalo&gt;/);
});

test('initial loading marks the editor busy and never mounts WebGL or the empty create action', () => {
  const frame = openings('section').find(node => hasClass(node, 'spatial-editor-frame'));
  assert.equal(value(frame, 'aria-busy'), 'isLoading');
  const html = renderPresentation({ isLoading: true });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Načítám uloženou dispozici…/);
  assert.match(html, /Načítám prostorový editor…/);
  assert.doesNotMatch(html, /spatial-editor-host/);
  assert.doesNotMatch(html, /Vytvořit operační blok/);
});

test('editor theme is strictly scoped and leaves dashboard and application canvas unchanged', () => {
  css.walkRules(rule => {
    for (const selector of rule.selectors) {
      assert.ok(selector.startsWith('.spatial-settings-module'), `Unscoped editor rule: ${selector}`);
      assert.doesNotMatch(selector, /spatial-dashboard|spatial-control-shell|spatial-room-panel/);
    }
  });
  css.walkDecls(declaration => {
    assert.doesNotMatch(declaration.prop, /^--(?:app-spatial-background|app-background|color-background|m-page-bg)$/);
  });
});

test('editor surfaces and active commands inherit the shared cyan tokens without yellow or hover motion', () => {
  const tokens = declarations('.spatial-settings-module');
  assert.equal(tokens['--editor-accent'], 'var(--color-primary)');
  assert.equal(tokens['--editor-text'], 'var(--color-text-primary)');
  assert.equal(tokens['--editor-muted'], 'var(--color-text-muted)');
  assert.equal(tokens['--editor-surface'], 'rgba(255, 255, 255, 0.025)');
  const commands = declarations('.spatial-settings-module .spatial-editor-icon-action');
  assert.equal(commands['min-height'], '44px');
  assert.equal(commands['border-radius'], '8px');
  const selected = declarations('.spatial-settings-module .spatial-editor-icon-action.is-active');
  assert.equal(selected.background, 'var(--color-primary-muted)');
  assert.equal(selected.color, 'var(--editor-accent)');
  assert.equal(declarations('.spatial-settings-module .spatial-editor-icon-action:not(:disabled):hover').transform, 'none');
  assert.equal(declarations('.spatial-settings-module .spatial-editor-empty-state button:hover').transform, 'none');
  css.walkDecls(declaration => {
    assert.doesNotMatch(declaration.value, /#ffdb1f|#ffda28|#ffde2f|#ffe249|translate[XY]?\(/i);
  });
});

test('editor reflows at its available container width and never hides workspace, library or inspector', () => {
  const frame = declarations('.spatial-settings-module .spatial-editor-frame');
  assert.equal(frame['container-type'], 'inline-size');
  assert.equal(frame['margin-inline'], '0');
  const desktop = declarations('.spatial-settings-module .spatial-editor-frame .orms-editor');
  assert.match(compact(desktop['grid-template-columns']), /minmax\(0,1fr\)/);
  const tablet = declarations('.spatial-settings-module .spatial-editor-frame .orms-editor', 'container (max-width: 1000px)');
  assert.equal(compact(tablet['grid-template-columns']), '190pxminmax(0,1fr)');
  const inspector = declarations('.spatial-settings-module .spatial-editor-frame .oe-inspector', 'container (max-width: 1000px)');
  assert.equal(inspector['grid-column'], '1 / -1');
  const phone = declarations('.spatial-settings-module .spatial-editor-frame .orms-editor', 'container (max-width: 640px)');
  assert.equal(phone.display, 'flex');
  assert.equal(phone['flex-direction'], 'column');
  assert.equal(declarations('.spatial-settings-module .spatial-editor-frame .oe-workspace', 'container (max-width: 640px)').order, '-1');
  css.walkDecls('display', declaration => {
    if (declaration.value === 'none') {
      assert.doesNotMatch(declaration.parent.selector, /oe-(?:workspace|library|inspector)(?:\b|\s|$)/, 'Every editor panel must remain accessible');
    }
  });
  const touchControls = declarations('.spatial-settings-module .spatial-editor-frame .orms-editor button', 'container (max-width: 640px)');
  assert.equal(touchControls['min-height'], '44px');
});

test('stacked editor canvas receives a bounded size independent of its rendered canvas content', () => {
  const editor = '.spatial-settings-module .spatial-editor-frame .orms-editor';
  const workspace = '.spatial-settings-module .spatial-editor-frame .oe-workspace';
  const library = '.spatial-settings-module .spatial-editor-frame .oe-library';
  const tablet = declarations(editor, 'container (max-width: 1000px)');
  assert.equal(tablet['grid-template-rows'], '600px auto', 'The canvas row must not grow from ResizeObserver-driven renderer dimensions');
  assert.equal(tablet.height, 'auto', 'The inspector stays below the bounded canvas row');
  assert.equal(declarations(library, 'container (max-width: 1000px)')['max-height'], '600px');
  const phone = declarations(workspace, 'container (max-width: 640px)');
  assert.equal(phone.height, '640px', 'The flex workspace needs a stable canvas allocation');
  assert.equal(phone['min-height'], '0', 'Canvas intrinsic height must not increase the workspace');
  assert.equal(phone['flex-shrink'], '0');
  const canvas = declarations('.spatial-settings-module .spatial-editor-frame .oe-canvas');
  assert.equal(canvas['min-height'], '280px');
  assert.equal(canvas.overflow, 'hidden');
  assert.ok(!canvas.height, 'The canvas remains a flex child of the bounded workspace, not an independently auto-sized row');
});

test('stacked frame height follows its parent container including the frame border, not the viewport', () => {
  const parent = declarations('.spatial-settings-module');
  assert.equal(parent['container-type'], 'inline-size');
  assert.equal(parent['container-name'], 'spatial-settings');
  const condition = 'container spatial-settings (max-width: 1002px)';
  assert.equal(declarations('.spatial-settings-module .spatial-editor-frame', condition).height, 'auto');
  assert.equal(declarations('.spatial-settings-module .spatial-editor-host', condition).height, 'auto');
  assert.equal(declarations('.spatial-settings-module .spatial-editor-frame').border, '1px solid var(--editor-border)');
  assert.equal(1002 - 2, 1000, 'The parent threshold must cover the nested content-width threshold plus both frame borders');
  css.walkDecls('height', declaration => {
    if (declaration.value !== 'auto' || !declaration.parent.selectors.some(selector => /\.spatial-editor-(?:frame|host)$/.test(selector))) return;
    assert.equal(declaration.parent.parent.type, 'atrule');
    assert.equal(declaration.parent.parent.name, 'container', 'Viewport-only auto-height leaves narrow parent layouts clipped');
    assert.equal(declaration.parent.parent.params, 'spatial-settings (max-width: 1002px)');
  });
});

test('all editor controls receive visible focus and motion respects reduced-motion preferences', () => {
  for (const element of ['button', 'input', 'select']) {
    const focus = declarations(`.spatial-settings-module ${element}:focus-visible`);
    assert.equal(focus.outline, '2px solid var(--editor-accent)');
    assert.equal(focus['outline-offset'], '3px');
  }
  assert.equal(declarations('.spatial-settings-module button', 'media (prefers-reduced-motion: reduce)').transition, 'none');
  for (const selector of [
    '.spatial-settings-module .spatial-editor-icon-action',
    '.spatial-settings-module .spatial-editor-frame .orms-editor button',
    '.spatial-settings-module .spatial-editor-empty-state button',
  ]) {
    assert.equal(declarations(selector, 'media (prefers-reduced-motion: reduce)').transition, 'none', `${selector} needs a reduced-motion override with matching specificity`);
  }
  assert.equal(declarations('.spatial-settings-module .animate-spin', 'media (prefers-reduced-motion: reduce)').animation, 'none');
});
