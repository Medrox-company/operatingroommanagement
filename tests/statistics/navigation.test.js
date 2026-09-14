import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Bounded element-prop and handler tests. Hooks, element bounds, and resize
// delivery are stubs, not React lifecycle, browser, accessibility, or layout tests.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../components/statistics/StatisticsNavigation.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'StatisticsNavigation.tsx',
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});
const moduleStub = { exports: {} };
let pendingEffects = null;
const observers = [];
class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.observed = [];
    this.disconnected = false;
    observers.push(this);
  }
  observe(element) { this.observed.push(element); }
  disconnect() { this.disconnected = true; }
}
const reactStub = {
  ...React,
  useRef: (current) => ({ current }),
  useEffect: (effect, dependencies) => pendingEffects.push({ effect, dependencies }),
};
const imports = { react: reactStub, 'lucide-react': require('lucide-react') };
new Function('require', 'exports', 'module', 'ResizeObserver', outputText)(
  (name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected navigation dependency: ${name}`);
    return imports[name];
  },
  moduleStub.exports,
  moduleStub,
  ResizeObserverStub,
);
const { StatisticsNavigation } = moduleStub.exports;

const expectedTabs = [
  ['prehled', 'Přehled'],
  ['finance', 'Finance'],
  ['sazby', 'Sazby'],
  ['saly', 'Sály'],
  ['faze', 'Fáze'],
  ['notifikace', 'Notifikace'],
  ['zarizeni', 'Zařízení'],
];

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...elements(node.props.children, predicate),
  ];
}

function textContent(node) {
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.isValidElement(node) ? textContent(node.props.children) : '';
}

function render(value = 'prehled', compact = false, width = 900) {
  const calls = [];
  const effects = [];
  pendingEffects = effects;
  const tree = StatisticsNavigation({ value, compact, onChange: (id) => calls.push(['change', id]) });
  pendingEffects = null;
  const buttons = elements(tree, (node) => node.type === 'button');
  const navigation = {
    clientLeft: 1,
    clientWidth: width,
    scrollLeft: 0,
    scrollTop: 173,
    getBoundingClientRect: () => ({ left: 20 }),
    scrollIntoView: () => assert.fail('The navigation must not scroll its ancestors'),
  };
  const targets = buttons.map((button, index) => ({
    focus: (options) => calls.push(['focus', button.props.id, options]),
    scrollIntoView: () => assert.fail('A tab must not scroll its ancestors'),
    getBoundingClientRect: () => ({
      left: 21 + index * 100 + 4 - navigation.scrollLeft,
      right: 21 + index * 100 + 92 - navigation.scrollLeft,
    }),
  }));
  const parentElement = {
    querySelectorAll(selector) {
      assert.equal(selector, '[role="tab"]');
      return targets;
    },
  };
  targets.forEach((target) => { target.parentElement = parentElement; });
  navigation.firstElementChild = parentElement;
  navigation.querySelector = (selector) => {
    assert.equal(selector, '[role="tab"][aria-selected="true"]');
    return targets[expectedTabs.findIndex(([id]) => id === value)];
  };
  tree.props.ref.current = navigation;
  return { tree, buttons, targets, calls, navigation, effects };
}

function keyEvent(key, currentTarget) {
  return {
    key,
    currentTarget,
    prevented: 0,
    preventDefault() { this.prevented += 1; },
  };
}

test('both navigation variants preserve the seven Czech tabs and stable panel references', () => {
  for (const compact of [false, true]) {
    const { tree, buttons } = render('prehled', compact);
    assert.equal(tree.type, 'nav');
    assert.equal(tree.props['aria-label'], 'Sekce statistik');
    assert.equal(elements(tree, (node) => node.props.role === 'tablist').length, 1);
    assert.deepEqual(buttons.map(textContent), expectedTabs.map(([, label]) => label));
    for (const [index, button] of buttons.entries()) {
      const [id] = expectedTabs[index];
      assert.equal(button.props.type, 'button');
      assert.equal(button.props.role, 'tab');
      assert.equal(button.props.id, `statistics-tab-${id}`);
      assert.equal(button.props['aria-controls'], `statistics-panel-${id}`);
    }
  }
});

test('each selected tab is the only sequential focus stop in both variants', () => {
  for (const compact of [false, true]) {
    for (const [selected] of expectedTabs) {
      const { buttons } = render(selected, compact);
      for (const [index, button] of buttons.entries()) {
        const isSelected = expectedTabs[index][0] === selected;
        assert.equal(button.props['aria-selected'], isSelected);
        assert.equal(button.props.tabIndex, isSelected ? 0 : -1);
      }
    }
  }
});

test('each tab click requests its own selection once', () => {
  const { buttons, calls } = render();
  for (const button of buttons) button.props.onClick();
  assert.deepEqual(calls, expectedTabs.map(([id]) => ['change', id]));
});

test('arrow and endpoint keys select and focus the expected tab', () => {
  const cases = [
    ['ArrowLeft', 0, 6],
    ['ArrowRight', 6, 0],
    ['ArrowLeft', 3, 2],
    ['ArrowRight', 3, 4],
    ['Home', 4, 0],
    ['End', 2, 6],
    ['Home', 0, 0],
    ['End', 6, 6],
  ];
  for (const compact of [false, true]) {
    for (const [key, from, to] of cases) {
      const { buttons, targets, calls } = render(expectedTabs[from][0], compact);
      const event = keyEvent(key, targets[from]);
      buttons[from].props.onKeyDown(event);
      const id = expectedTabs[to][0];
      assert.equal(event.prevented, 1, `${key} must prevent its default action`);
      assert.deepEqual(calls, [
        ['change', id],
        ['focus', `statistics-tab-${id}`, { preventScroll: true }],
      ], `${key} from ${expectedTabs[from][0]} must target ${id}`);
    }
  }
});

test('unrelated keys retain native handling and do not change selection or focus', () => {
  const { buttons, targets, calls } = render('saly');
  for (const key of ['Tab', 'Escape', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'a']) {
    const event = keyEvent(key, targets[3]);
    buttons[3].props.onKeyDown(event);
    assert.equal(event.prevented, 0, `${key} must retain native handling`);
  }
  assert.deepEqual(calls, []);
});

test('mount reveals the active mobile tab and one observer handles width changes', () => {
  const { navigation, effects, calls } = render('zarizeni', true, 300);
  assert.equal(effects.length, 1);
  assert.deepEqual(effects[0].dependencies, ['zarizeni', true]);
  const before = observers.length;
  const cleanup = effects[0].effect();
  assert.equal(navigation.scrollLeft, 392, 'The active tab ends at the navigation right edge');
  assert.equal(navigation.scrollTop, 173, 'Revealing a tab must preserve the vertical position');
  assert.equal(observers.length, before + 1);
  const observer = observers.at(-1);
  assert.deepEqual(observer.observed, [navigation, navigation.firstElementChild]);

  navigation.clientWidth = 220;
  observer.callback();
  assert.equal(navigation.scrollLeft, 472, 'Narrowing the navigation reveals the active tab again');
  assert.equal(navigation.scrollTop, 173);
  assert.deepEqual(calls, [], 'Automatic reveal must not change selection or steal focus');
  cleanup();
  assert.equal(observer.disconnected, true);
});

test('a selected tab hidden on the left is revealed without moving an already visible tab', () => {
  const { navigation, effects } = render('finance', false, 300);
  navigation.scrollLeft = 450;
  const cleanup = effects[0].effect();
  assert.equal(navigation.scrollLeft, 104);
  const observer = observers.at(-1);
  observer.callback();
  assert.equal(navigation.scrollLeft, 104, 'An already visible tab retains its scroll position');
  assert.equal(navigation.scrollTop, 173);
  cleanup();
});

test('effects depend on value and compact mode and tolerate a hidden navigation', () => {
  for (const [value, compact] of [['finance', false], ['zarizeni', false], ['zarizeni', true]]) {
    const { navigation, effects } = render(value, compact, 0);
    assert.deepEqual(effects[0].dependencies, [value, compact]);
    const cleanup = effects[0].effect();
    assert.equal(navigation.scrollLeft, 0, 'No measurement-based scroll occurs while hidden');
    navigation.clientWidth = 300;
    observers.at(-1).callback();
    assert.equal(navigation.scrollLeft, value === 'zarizeni' ? 392 : 0);
    cleanup();
  }
});

test('keyboard navigation reveals either edge using only the navigation horizontal offset', () => {
  const { buttons, targets, navigation, calls } = render('prehled', true, 300);
  buttons[0].props.onKeyDown(keyEvent('End', targets[0]));
  assert.equal(navigation.scrollLeft, 392);
  buttons[6].props.onKeyDown(keyEvent('Home', targets[6]));
  assert.equal(navigation.scrollLeft, 4);
  assert.equal(navigation.scrollTop, 173);
  assert.deepEqual(calls, [
    ['change', 'zarizeni'],
    ['focus', 'statistics-tab-zarizeni', { preventScroll: true }],
    ['change', 'prehled'],
    ['focus', 'statistics-tab-prehled', { preventScroll: true }],
  ]);
});
