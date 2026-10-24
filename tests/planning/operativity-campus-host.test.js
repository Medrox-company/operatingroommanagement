import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/OperativityPlanningWorkspace.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('OperativityPlanningWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const draft = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'PlanningDraft');
assert.ok(draft?.body);

// Name the real component's hooks from its AST rather than hardcoding hook indexes.
const states = [], refs = [];
for (const statement of draft.body.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    const call = declaration.initializer;
    if (!call || !ts.isCallExpression(call)) continue;
    if (call.expression.getText(parsed) === 'useState' && ts.isArrayBindingPattern(declaration.name)) states.push(declaration.name.elements[0].name.getText(parsed));
    if (call.expression.getText(parsed) === 'useRef' && ts.isIdentifier(declaration.name)) refs.push(declaration.name.text);
  }
}
const compiled = ts.transpileModule(`${source}\nexport { PlanningDraft };`, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

function render({ currentView = 'map', mapMode = 'campus', previousView = 'home', ready = true } = {}) {
  const calls = [], effects = [], refValues = {};
  const loaded = {
    scopeKey: 'medrox-operativity-draft:v2:hospital-test:user-test:2026', channel: 'trusted-frame',
    seed: { warnings: [], sites: [], years: [2026, 2027], data: {} }, html: '<p>Original planner</p>', draft: {}, loadedAt: '08:00',
  };
  const values = { year: 2026, loaded: ready ? loaded : null, currentView, mapMode, allowedViews: ['home', 'map', 'timeline'], appearance: 'dark' };
  let stateIndex = 0, refIndex = 0;
  const imports = {
    react: {
      ...React,
      useState: initial => {
        const name = states[stateIndex++];
        assert.ok(name, 'All rendered state hooks are identified');
        const value = Object.hasOwn(values, name) ? values[name] : typeof initial === 'function' ? initial() : initial;
        return [value, next => calls.push({ type: 'state', name, value: typeof next === 'function' ? next(value) : next })];
      },
      useRef: initial => {
        const name = refs[refIndex++];
        assert.ok(name, 'All rendered ref hooks are identified');
        const current = name === 'previousView' ? previousView : name === 'mapSection' ? { scrollIntoView: options => calls.push({ type: 'scroll', target: 'campus', options }) }
          : name === 'frame' ? { scrollIntoView: options => calls.push({ type: 'scroll', target: 'frame', options }), contentWindow: { postMessage: (message, target) => calls.push({ type: 'message', message, target }) } } : initial;
        return refValues[name] = { current };
      },
      useEffect: (run, deps) => effects.push({ run, deps }),
    },
    'react-dom': { createPortal: () => { throw new Error('Nested sidebar is not mounted by this component test'); } },
    'next/dynamic': load => load.toString().includes('LiberecCampusMap') ? 'campus-map' : 'shared-schedule',
    'lucide-react': new Proxy({}, { get: (_, key) => `icon-${String(key)}` }),
    '../contexts/AuthContext': { useAuth: () => ({ user: { id: 'user-test' }, isAdmin: true, hasModuleAccess: () => true }) },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'hospital-test', activeHospital: { hospital_name: 'Test hospital' } }) },
    './ui/ConfirmDialog': { useConfirm: () => async () => false },
    '../lib/operativity-planning': {}, '../lib/operativity-frame': {}, '../lib/operativity-planning-client': {}, '../lib/operativity-three-assets': {},
    '../lib/operativity-navigation': { OPERATIVITY_NAVIGATION: [] },
    './planning/operativity-workspace.module.css': {}, './planning/operativity-canvas.css': {},
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(Object.hasOwn(imports, name), name);
    return imports[name];
  }, mod, mod.exports);
  const tree = mod.exports.PlanningDraft({ rooms: [], tabs: React.createElement('div', null, 'Planning tabs') });
  assert.equal(stateIndex, states.length);
  assert.equal(refIndex, refs.length);
  return { tree, calls, effects, refs: refValues };
}

test('campus and original model tabs coexist without remounting the authenticated planning iframe', () => {
  const campus = render();
  const model = render({ mapMode: 'rooms' });
  for (const harness of [campus, model]) {
    const frame = elements(harness.tree, node => node.type === 'iframe');
    assert.equal(frame.length, 1);
    assert.equal(frame[0].key, 'trusted-frame', 'Switching presentation must not change the frame identity');
    assert.equal(frame[0].props.srcDoc, '<p>Original planner</p>');
    assert.equal(frame[0].props.sandbox, 'allow-scripts allow-modals allow-downloads allow-popups');
    const tabs = elements(harness.tree, node => node.props['aria-label'] === 'Zobrazení 3D mapy')[0];
    assert.equal(tabs.props.role, 'group');
    const buttons = elements(tabs, node => node.type === 'button');
    assert.equal(buttons.length, 2);
    buttons[0].props.onClick(); buttons[1].props.onClick();
    assert.deepEqual(harness.calls.slice(-2), [{ type: 'state', name: 'mapMode', value: 'campus' }, { type: 'state', name: 'mapMode', value: 'rooms' }]);
  }
  assert.equal(elements(campus.tree, node => node.type === 'iframe')[0].props.style.display, 'none');
  assert.equal(elements(model.tree, node => node.type === 'iframe')[0].props.style.display, undefined);
  const native = elements(campus.tree, node => node.type === 'campus-map');
  assert.equal(native.length, 1);
  assert.deepEqual(native[0].props, { appearance: 'dark' }, 'Native reference map receives no tenant room or clinical data');
  assert.equal(elements(model.tree, node => node.type === 'campus-map').length, 0);
  assert.equal(elements(render({ currentView: 'timeline' }).tree, node => node.type === 'campus-map').length, 0);
  assert.equal(elements(render({ ready: false }).tree, node => node.type === 'campus-map').length, 0);
});

test('view-change scrolling occurs in the committed-view effect and targets the newly visible section', () => {
  for (const [currentView, previousView, target] of [['map', 'home', 'campus'], ['timeline', 'map', 'frame']]) {
    const harness = render({ currentView, previousView });
    assert.deepEqual(harness.calls, [], 'Rendering does not scroll a still-hidden section');
    const effect = harness.effects.find(item => item.run.toString().includes('previousView.current'));
    assert.ok(effect);
    assert.deepEqual(effect.deps, [currentView]);
    effect.run();
    assert.deepEqual(harness.calls, [{ type: 'scroll', target, options: { block: 'start', behavior: 'auto' } }]);
    assert.equal(harness.refs.previousView.current, currentView);
    effect.run();
    assert.equal(harness.calls.length, 1, 'Repeated effects for the same view do not scroll again');
  }
  const viewBranch = source.slice(source.indexOf("if (event.data.type === 'view'"), source.indexOf("if (event.data.type === 'resize'"));
  assert.match(viewBranch, /setCurrentView\(event\.data\.view\)/);
  assert.doesNotMatch(viewBranch, /scrollIntoView/, 'Incoming view messages must not scroll before React makes the target visible');
});

test('renderer presentation follows native visibility through the scoped authenticated frame channel', () => {
  for (const options of [{}, { mapMode: 'rooms' }, { currentView: 'home' }]) {
    const harness = render(options);
    const effect = harness.effects.find(item => item.run.toString().includes("type: 'presentation'"));
    assert.ok(effect);
    assert.equal(effect.deps[1], !options.mapMode && !options.currentView);
    effect.run();
    assert.deepEqual(harness.calls, [{ type: 'message', target: '*', message: {
      protocol: 'medrox-planning:v1', channel: 'trusted-frame', type: 'presentation', visible: Boolean(options.mapMode || options.currentView),
    } }]);
  }
  const notReady = render({ ready: false });
  notReady.effects.find(item => item.run.toString().includes("type: 'presentation'")).run();
  assert.deepEqual(notReady.calls, [], 'No renderer command is sent before the scoped frame is available');
});

test('sidebar actions reveal the original model before dispatching source-owned search or editing tools', () => {
  for (const action of ['cmd', 'bulk', 'newReq']) {
    const harness = render();
    const navigation = elements(harness.tree, node => typeof node.props.onAction === 'function')[0];
    assert.ok(navigation);
    navigation.props.onAction(action);
    assert.deepEqual(harness.calls, [
      { type: 'state', name: 'mapMode', value: 'rooms' },
      { type: 'message', target: '*', message: { protocol: 'medrox-planning:v1', channel: 'trusted-frame', type: 'sidebar-action', action } },
    ]);
  }
  const notReady = render({ ready: false });
  elements(notReady.tree, node => typeof node.props.onAction === 'function')[0].props.onAction('cmd');
  assert.deepEqual(notReady.calls, [{ type: 'state', name: 'mapMode', value: 'rooms' }]);
});
