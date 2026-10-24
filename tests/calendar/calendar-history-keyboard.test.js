import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Execute the component's actual callbacks, without mounting the app or loading
// providers. Only synthetic calendar state and a local keyboard listener exist.
const source = readFileSync(new URL('../../components/CalendarManager.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('CalendarManager.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['canUndo', 'canRedo', 'pushHistory', 'undo', 'redo', 'applyToSelection', 'clearSelection'];
const declarations = new Map();
let keyboardEffect;
const visit = node => {
  if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(ast))) {
    declarations.set(node.name.getText(ast), `const ${node.getText(ast)};`);
  }
  if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
      && node.expression.expression.getText(ast) === 'useEffect'
      && node.expression.arguments[0]?.getText(ast).includes("addEventListener('keydown'")) {
    keyboardEffect = node.getText(ast);
  }
  ts.forEachChild(node, visit);
};
visit(ast);
assert.equal(declarations.size, names.length);
assert.ok(keyboardEffect);
const { outputText } = ts.transpileModule(
  [...names.map(name => declarations.get(name)), keyboardEffect, `return { ${names.join(', ')} };`].join('\n'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
);

class TestElement {
  constructor(tagName = 'DIV', attributes = {}, parent = null) {
    Object.assign(this, { tagName, attributes, parent });
  }
  closest(selector) {
    for (let element = this; element; element = element.parent) {
      if (selector.split(',').some(part => {
        const token = part.trim();
        if (/^[a-z]+$/i.test(token)) return element.tagName.toLowerCase() === token.toLowerCase();
        if (token === '[contenteditable]:not([contenteditable="false"])') {
          return 'contenteditable' in element.attributes && element.attributes.contenteditable !== 'false';
        }
        if (token === '[role="textbox"]') return element.attributes.role === 'textbox';
        throw new Error(`Unsupported selector in test DOM: ${token}`);
      })) return element;
    }
    return null;
  }
}

const initialState = () => ({
  cells: {}, rows: [{ id: 'r1', name: 'Sál 1', color: '#123456', order: 0 }], specialDays: [],
  history: [], historyIdx: -1, selectedKeys: new Set(), isDragging: false,
});
const documentState = state => structuredClone({ cells: state.cells, rows: state.rows, specialDays: state.specialDays });
const sameDeps = (before, after) => before && before.length === after.length && before.every((value, i) => Object.is(value, after[i]));

const harness = () => {
  const state = initialState();
  const setters = Object.fromEntries(Object.keys(state).map(key => [
    `set${key[0].toUpperCase()}${key.slice(1)}`, value => { state[key] = typeof value === 'function' ? value(state[key]) : value; },
  ]));
  const callbacks = [];
  let callbackIndex = 0;
  let effectDeps;
  let cleanup;
  let listener;
  const window = {
    addEventListener: (type, callback) => { assert.equal(type, 'keydown'); listener = callback; },
    removeEventListener: (type, callback) => { assert.equal(type, 'keydown'); if (listener === callback) listener = undefined; },
  };
  const useCallback = (callback, deps) => {
    const i = callbackIndex++;
    if (!sameDeps(callbacks[i]?.deps, deps)) callbacks[i] = { callback, deps };
    return callbacks[i].callback;
  };
  let pendingEffect;
  const useEffect = (effect, deps) => { if (!sameDeps(effectDeps, deps)) pendingEffect = { effect, deps }; };
  const render = () => {
    callbackIndex = 0;
    const scope = { ...state, ...setters, useCallback, useEffect, window, Element: TestElement };
    const api = new Function(...Object.keys(scope), outputText)(...Object.values(scope));
    if (pendingEffect) {
      cleanup?.();
      const { effect, deps } = pendingEffect;
      pendingEffect = undefined;
      effectDeps = deps;
      cleanup = effect();
    }
    return api;
  };
  const run = (name, ...args) => { render()[name](...args); return render(); };
  const edit = label => { state.selectedKeys = new Set(['r1:1']); run('applyToSelection', label, '#123456'); };
  const press = (key, overrides = {}) => {
    render();
    const event = { key, target: new TestElement(), ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      isComposing: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...overrides };
    listener(event);
    render();
    return event;
  };
  render();
  return { state, render, run, edit, press, dispose: () => cleanup?.() };
};

test('one edit can be undone and redone repeatedly with the exact full snapshot', () => {
  const h = harness();
  const before = documentState(h.state);
  h.run('pushHistory');
  h.state.cells = { 'r1:1': { label: 'CH', color: '#123456', note: 'Synthetic' } };
  h.state.rows = [...h.state.rows, { id: 'r2', name: 'Sál 2', color: '#654321', order: 1 }];
  h.state.specialDays = [{ day: 1, label: 'Svátek', color: '#abcdef' }];
  const after = documentState(h.state);
  for (let i = 0; i < 3; i++) {
    h.run('undo');
    assert.deepEqual(documentState(h.state), before);
    assert.equal(h.render().canUndo, false);
    assert.equal(h.render().canRedo, true);
    h.run('redo');
    assert.deepEqual(documentState(h.state), after);
    assert.equal(h.render().canRedo, false);
  }
});

test('multiple edits traverse in order, and a new edit after undo discards redo', () => {
  const h = harness();
  const original = documentState(h.state);
  h.edit('A');
  const first = documentState(h.state);
  h.edit('B');
  const second = documentState(h.state);
  h.run('undo'); assert.deepEqual(documentState(h.state), first);
  h.run('undo'); assert.deepEqual(documentState(h.state), original);
  h.run('redo'); assert.deepEqual(documentState(h.state), first);
  h.run('redo'); assert.deepEqual(documentState(h.state), second);
  h.run('undo');
  h.edit('C');
  assert.equal(h.render().canRedo, false);
  h.run('redo'); assert.equal(h.state.cells['r1:1'].label, 'C');
  h.run('undo'); assert.deepEqual(documentState(h.state), first);
  h.run('redo'); assert.equal(h.state.cells['r1:1'].label, 'C');
});

test('empty history and an empty selection do not create or restore snapshots', () => {
  const h = harness();
  h.run('undo'); h.run('redo'); h.run('clearSelection'); h.run('applyToSelection', 'A', '#123456');
  assert.deepEqual(h.state.history, []);
  assert.deepEqual(h.state.cells, {});
  assert.equal(h.state.historyIdx, -1);
});

test('editable targets and their descendants retain native Delete and text undo', () => {
  const targets = [new TestElement('INPUT'), new TestElement('TEXTAREA'), new TestElement('SELECT'),
    new TestElement('DIV', { contenteditable: '' }), new TestElement('DIV', { contenteditable: 'plaintext-only' }),
    new TestElement('SPAN', {}, new TestElement('DIV', { contenteditable: 'true' })),
    new TestElement('DIV', { role: 'textbox' })];
  for (const target of targets) {
    for (const [key, modifiers] of [['Delete', {}], ['z', { ctrlKey: true }], ['z', { metaKey: true }]]) {
      const h = harness(); h.edit('A'); h.state.selectedKeys = new Set(['r1:1']);
      const before = documentState(h.state);
      const event = h.press(key, { target, ...modifiers });
      assert.deepEqual(documentState(h.state), before, `${target.tagName}: ${key}`);
      assert.equal(h.state.historyIdx, 0);
      assert.equal(event.defaultPrevented, false);
    }
  }
});

test('handled events, IME, Alt combinations and modified Delete are ignored', () => {
  const variants = [
    ['Delete', { defaultPrevented: true }], ['Delete', { isComposing: true }],
    ['Delete', { ctrlKey: true }], ['Delete', { metaKey: true }], ['Delete', { shiftKey: true }],
    ['Delete', { altKey: true }], ['z', { ctrlKey: true, altKey: true }],
    ['z', { ctrlKey: true, metaKey: true }], ['z', { ctrlKey: true, isComposing: true }],
  ];
  for (const [key, modifiers] of variants) {
    const h = harness(); h.edit('A'); h.state.selectedKeys = new Set(['r1:1']);
    const before = documentState(h.state);
    const event = h.press(key, modifiers);
    assert.deepEqual(documentState(h.state), before, JSON.stringify([key, modifiers]));
    assert.equal(h.state.historyIdx, 0);
    assert.equal(event.defaultPrevented, Boolean(modifiers.defaultPrevented));
  }
});

test('calendar shortcuts preserve Delete, undo, redo and Escape outside editors', () => {
  const h = harness(); h.edit('A'); h.state.selectedKeys = new Set(['r1:1']);
  assert.equal(h.press('Delete').defaultPrevented, true);
  assert.deepEqual(h.state.cells, {});
  h.press('z', { ctrlKey: true }); assert.equal(h.state.cells['r1:1'].label, 'A');
  h.press('y', { ctrlKey: true }); assert.deepEqual(h.state.cells, {});
  h.press('z', { metaKey: true }); assert.equal(h.state.cells['r1:1'].label, 'A');
  h.press('Z', { metaKey: true, shiftKey: true }); assert.deepEqual(h.state.cells, {});
  h.press('z', { ctrlKey: true });
  h.press('Z', { ctrlKey: true, shiftKey: true }); assert.deepEqual(h.state.cells, {});
  h.state.selectedKeys = new Set(['r1:1']); h.state.isDragging = true;
  h.press('Escape');
  assert.equal(h.state.selectedKeys.size, 0);
  assert.equal(h.state.isDragging, false);
});

test('keyboard history captures the latest cells even after a drag changes them without another history entry', () => {
  const h = harness(); h.edit('A');
  h.state.cells = { ...h.state.cells, 'r1:2': { label: 'A', color: '#123456' } };
  const afterDrag = documentState(h.state);
  h.press('z', { ctrlKey: true }); assert.deepEqual(h.state.cells, {});
  h.press('y', { ctrlKey: true }); assert.deepEqual(documentState(h.state), afterDrag);
});
