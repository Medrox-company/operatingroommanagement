import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

// Presentation and render wiring only; no session, database or clinical writes.
// Browser QA separately verifies real viewport sizes and the fixed navigation.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/mobile/MobileTimelineView.tsx');
const css = postcss.parse(read('components/mobile/mobile-timeline.css'));
const rulesFor = selector => {
  const rules = [];
  css.walkRules(rule => { if (rule.selectors.includes(selector)) rules.push(rule); });
  return rules;
};
const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
const base = selector => declarations(rulesFor(selector)[0]);

function compile(sourceText, filename, dependencies = {}) {
  const { outputText } = ts.transpileModule(sourceText, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod);
  return mod.exports;
}
const display = compile(read('lib/mobile-room-display.ts'), 'mobile-room-display.ts');
const timeline = compile(read('lib/mobile-timeline.ts'), 'mobile-timeline.ts', { './mobile-room-display': display });
const statuses = [
  { title: 'Sál připraven', name: 'Sál připraven', color: '#00D6C4' },
  { title: 'Chirurgický výkon', name: 'Chirurgický výkon', color: '#E82064' },
];
const now = Date.parse('2026-09-17T10:35:00Z');
const room = (id, active = false) => ({
  id: String(id), name: `Operační sál ${id}`, currentStepIndex: active ? 1 : 0,
  operationStartedAt: active ? new Date(now - 30 * 60000).toISOString() : null,
  phaseStartedAt: active ? new Date(now - 30 * 60000).toISOString() : null,
  estimatedEndTime: active ? new Date(now + 30 * 60000).toISOString() : null,
});
function MobileModuleHeader() { return null; }
function MobilePillTabs() { return null; }

function render(rooms, stateOverride = {}) {
  const state = ['4', 0, 0, 3, null];
  for (const [index, value] of Object.entries(stateOverride)) state[Number(index)] = value;
  const effects = [];
  const mutations = [];
  const selected = [];
  const ref = { current: null };
  let cursor = 0;
  const Component = compile(source, 'MobileTimelineView.tsx', {
    react: {
      __esModule: true, default: React,
      useId: () => 'qa-timeline-description',
      useMemo: compute => compute(),
      useEffect: effect => effects.push(effect),
      useRef: () => ref,
      useState: () => {
        const index = cursor++;
        return [state[index], next => {
          state[index] = typeof next === 'function' ? next(state[index]) : next;
          mutations.push([index, state[index]]);
        }];
      },
    },
    'lucide-react': { ChevronLeft: 'ChevronLeft', ChevronRight: 'ChevronRight', LocateFixed: 'LocateFixed' },
    '../../lib/mobile-room-display': display,
    '../../lib/mobile-timeline': timeline,
    './MobileShell': { MobileModuleHeader, MobilePillTabs },
    './mobile-timeline.css': {},
  }).default;
  const tree = Component({
    rooms, activeStatuses: statuses, currentSpecialties: new Map([['1', [{ name: 'Chirurgie' }]]]),
    currentTime: new Date(now), stats: { operations: 1, cleaning: 1, free: 2, completed: 3, emergencyCount: 0 },
    onSelectRoom: value => selected.push(value),
  });
  return { tree, effects, mutations, selected, ref, state };
}
function findAll(node, predicate) {
  const found = [];
  const visit = value => {
    if (!React.isValidElement(value)) return;
    if (predicate(value)) found.push(value);
    React.Children.toArray(value.props.children).forEach(visit);
  };
  visit(node);
  return found;
}
const byClass = (tree, cls) => findAll(tree, node => node.props.className?.split(/\s+/).includes(cls));
const byLabel = (tree, label) => findAll(tree, node => node.props['aria-label'] === label)[0];
function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.Children.toArray(node?.props?.children).map(text).join('');
}

test('mobile timeline fits the parent viewport instead of creating page or nested chart scroll', () => {
  const screen = base('.mtl-screen');
  assert.equal(screen.height, '100%');
  assert.equal(screen['min-height'], '0');
  assert.equal(screen.display, 'flex');
  assert.equal(screen['flex-direction'], 'column');
  assert.equal(screen.overflow, 'hidden');
  assert.match(screen.padding, /env\(safe-area-inset-top/);
  assert.match(screen.padding, /env\(safe-area-inset-bottom/);
  for (const selector of ['.mtl-axis', '.mtl-rows']) {
    const rule = base(selector);
    assert.equal(rule.flex, '1');
    assert.equal(rule['min-height'], '0');
    assert.equal(rule.overflow, 'hidden');
  }
  assert.doesNotMatch(source, /overflow-[xy]-auto|MobileScreen|timeline-mobile-axis-scroll/);
  assert.match(read('App.tsx'), /currentView === 'dashboard' \? 'pb-0' : 'pb-20'/);
  assert.match(read('components/TimelineModule.tsx'), /w-full h-full text-white overflow-hidden flex flex-col/);
});

test('timeline presentation stays phone-only and compacts short screens without hiding paging controls', () => {
  css.walkRules(rule => {
    let parent = rule.parent;
    let phoneOnly = false;
    while (parent) {
      if (parent.type === 'atrule' && parent.name === 'media' && /max-width:\s*767px/.test(parent.params)) phoneOnly = true;
      parent = parent.parent;
    }
    assert.ok(phoneOnly, `${rule.selector} must not change desktop`);
  });
  assert.ok(rulesFor('.mtl-screen').some(rule => /max-height:\s*700px/.test(rule.parent.params)));
  assert.ok(rulesFor('.mtl-screen').some(rule => /max-height:\s*500px/.test(rule.parent.params)));
  for (const selector of ['.mtl-time-pager button', '.mtl-room-pager button']) {
    const rule = base(selector);
    assert.equal(rule.width, '44px');
    assert.equal(rule.height, '44px');
    assert.ok(rulesFor(selector).every(rule => declarations(rule).display !== 'none'));
  }
  assert.equal(base('.mtl-now')['min-height'], '44px');
  assert.equal(base('.mtl-room-pager')['flex-shrink'], '0');
});

test('only the measured room page renders and a row still opens the correct room', () => {
  const rooms = Array.from({ length: 15 }, (_, i) => room(i + 1, i === 0));
  const result = render(rooms);
  const rows = byClass(result.tree, 'mtl-row');
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(node => text(byClass(node, 'mtl-row-heading')[0]).split('Chirurgický')[0].split('Sál připraven')[0]), rooms.slice(0, 3).map(item => item.name));
  assert.match(rows[0].props['aria-label'], /Chirurgie.*Otevřít detail sálu/);
  rows[1].props.onClick();
  assert.equal(result.selected[0], rooms[1]);
  assert.equal(text(byClass(result.tree, 'mtl-room-pager')[0]), '1–3 z 15 sálů');
  assert.equal(byLabel(result.tree, 'Předchozí sály').props.disabled, true);
  assert.equal(byLabel(result.tree, 'Další sály').props.disabled, false);
  byLabel(result.tree, 'Další sály').props.onClick();
  assert.deepEqual(result.mutations, [[2, 3]]);
  assert.equal(byClass(result.tree, 'mtl-rows')[0].props.style.gridTemplateRows, 'repeat(3, minmax(0, 1fr))');
});

test('last page, shrinking room sets and empty state cannot strand the room pager', () => {
  const rooms = Array.from({ length: 5 }, (_, i) => room(i + 1));
  const last = render(rooms, { 2: 12 });
  assert.equal(text(byClass(last.tree, 'mtl-room-pager')[0]), '4–5 z 5 sálů');
  assert.equal(byClass(last.tree, 'mtl-row').length, 2);
  assert.equal(byLabel(last.tree, 'Další sály').props.disabled, true);
  byLabel(last.tree, 'Předchozí sály').props.onClick();
  assert.deepEqual(last.mutations, [[2, 0]]);
  const empty = render([], { 2: 12 });
  assert.equal(byClass(empty.tree, 'mtl-row').length, 0);
  assert.match(text(byClass(empty.tree, 'mtl-empty')[0]), /Žádné operační sály/);
  assert.equal(text(byClass(empty.tree, 'mtl-room-pager')[0]), '0 sálů');
  assert.equal(byLabel(empty.tree, 'Předchozí sály').props.disabled, true);
  assert.equal(byLabel(empty.tree, 'Další sály').props.disabled, true);
});

test('time paging anchors browsing and the current-time action resets the live window', () => {
  const result = render([room(1)]);
  byLabel(result.tree, 'Předchozí časový úsek').props.onClick();
  assert.deepEqual(result.mutations, [[4, now], [1, -1]]);
  byLabel(result.tree, 'Zobrazit aktuální čas').props.onClick();
  assert.deepEqual(result.mutations.slice(-2), [[1, 0], [4, null]]);
  const tabs = findAll(result.tree, node => node.type === MobilePillTabs)[0];
  assert.deepEqual(tabs.props.tabs.map(tab => tab.id), ['2', '4', 'day']);
  tabs.props.onChange('day');
  assert.deepEqual(result.mutations.slice(-3), [[0, 'day'], [1, 0], [4, null]]);
});

test('a viewport resize normalizes room pages before moving to previous or next rooms', () => {
  const rooms = Array.from({ length: 15 }, (_, i) => room(i + 1));
  // The old 3-row page began at room 7. A taller screen now fits five rows,
  // so keep that room visible by using the containing 6–10 page.
  const taller = render(rooms, { 2: 6, 3: 5 });
  assert.equal(text(byClass(taller.tree, 'mtl-room-pager')[0]), '6–10 z 15 sálů');
  assert.equal(byClass(taller.tree, 'mtl-row')[0].props['aria-label'].startsWith('Operační sál 6,'), true);
  byLabel(taller.tree, 'Předchozí sály').props.onClick();
  assert.deepEqual(taller.mutations, [[2, 0]]);
  byLabel(taller.tree, 'Další sály').props.onClick();
  assert.deepEqual(taller.mutations.at(-1), [2, 10]);
  const shorter = render(rooms, { 2: 10, 3: 3 });
  assert.equal(text(byClass(shorter.tree, 'mtl-room-pager')[0]), '10–12 z 15 sálů');
  byLabel(shorter.tree, 'Další sály').props.onClick();
  assert.deepEqual(shorter.mutations, [[2, 12]]);
});

test('ResizeObserver measures available rows and disconnects on unmount', () => {
  const result = render([room(1)]);
  let height = 241;
  const target = { getBoundingClientRect: () => ({ height }) };
  result.ref.current = target;
  const previous = globalThis.ResizeObserver;
  let callback;
  let observed;
  let disconnected = false;
  globalThis.ResizeObserver = class {
    constructor(cb) { callback = cb; }
    observe(element) { observed = element; }
    disconnect() { disconnected = true; }
  };
  try {
    const cleanup = result.effects[0]();
    assert.equal(observed, target);
    assert.deepEqual(result.mutations.at(-1), [3, 3]);
    height = 159;
    callback();
    assert.deepEqual(result.mutations.at(-1), [3, 1]);
    cleanup();
    assert.equal(disconnected, true);
  } finally {
    if (previous === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = previous;
  }
});

test('actual progress, estimated end and current state remain distinguishable and accessible', () => {
  const result = render([room(1, true), room(2)]);
  const segments = byClass(result.tree, 'mtl-segment');
  assert.ok(segments.some(node => node.props['data-kind'] === 'current'));
  assert.ok(segments.some(node => node.props['data-kind'] === 'estimate'));
  const estimate = segments.find(node => node.props['data-kind'] === 'estimate');
  assert.match(estimate.props.title, /Odhad konce/);
  assert.match(text(byClass(result.tree, 'sr-only')[0]), /Chirurgický výkon.*Odhad konce/);
  const descriptionIds = byClass(result.tree, 'mtl-row').map(row => {
    const description = byClass(row, 'sr-only')[0];
    assert.equal(row.props['aria-describedby'], description.props.id);
    assert.ok(description.props.id, 'Each room needs an addressable interval summary');
    return description.props.id;
  });
  assert.equal(new Set(descriptionIds).size, descriptionIds.length, 'Room summary identifiers must be distinct');
  assert.equal(byClass(result.tree, 'mtl-now-line').length, 2);
  assert.equal(byClass(result.tree, 'mtl-no-record').length, 1);
  assert.match(text(byClass(result.tree, 'mtl-no-record')[0]), /Bez záznamu/);
  assert.equal(byLabel(result.tree, 'Časová osa provozu').type, 'section');
  assert.equal(byLabel(result.tree, 'Stránkování sálů').type, 'nav');
});
