import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const model = load('lib/dashboard-carousel.ts');
const day = { start: Date.parse('2026-10-10T05:00:00Z'), end: Date.parse('2026-10-11T04:59:59.999Z') };
const now = Date.parse('2026-10-10T10:45:30Z');
const statuses = [
  { name: 'Sál připraven', accent_color: '#7890A8' },
  { name: 'Chirurgický výkon', accent_color: '#813FAB' },
];
const room = {
  id: 'configured-room', name: 'Skutečný úplný název', department: 'Konfigurovaný obor', currentStepIndex: 1,
  phaseStartedAt: '2026-10-10T10:00:00Z', operationStartedAt: '2026-10-10T09:00:00Z',
  staff: { doctor: { name: 'Lékař' }, nurse: { name: 'Sestra' } },
  completedOperations: [
    { endedAt: '2026-10-10T05:00:00Z' }, { endedAt: '2026-10-10T11:00:00Z' },
    { endedAt: '2026-10-11T04:59:59.999Z' }, { endedAt: '2026-10-10T04:59:59Z' },
    { endedAt: '2026-10-11T05:00:00Z' }, { endedAt: 'invalid' },
  ],
};
const presentation = overrides => model.carouselRoomPresentation({ ...room, ...overrides }, statuses, day, now);

test('third view persists independently of spatial permissions and defaults to cards', () => {
  for (const allowed of [true, false]) {
    assert.equal(model.resolveDashboardView('carousel', allowed), 'carousel');
    assert.equal(model.resolveDashboardView(null, allowed), 'cards');
    assert.equal(model.resolveDashboardView('unknown', allowed), 'cards');
    assert.equal(model.resolveDashboardView('spatial', allowed), allowed ? 'spatial' : 'cards');
  }
});
test('count uses inclusive actual operational-day end evidence, not operations24h', () => {
  assert.equal(presentation({ operations24h: 99 }).count, 3);
  assert.equal(presentation({ completedOperations: [] }).count, 0);
});
test('actual enabled phase determines the configured color and position', () => {
  assert.equal(presentation().color, '#813FAB');
  assert.equal(presentation().title, 'Chirurgický výkon');
  assert.equal(presentation().progress, 1);
  assert.equal(presentation().phasePosition, '2 / 2');
});
test('emergency takes priority over lock and pause without losing actual count', () => {
  assert.equal(presentation({ isEmergency: true, isLocked: true, isPaused: true }).state, 'emergency');
  assert.equal(presentation({ isLocked: true, isPaused: true }).state, 'locked');
  assert.equal(presentation({ isPaused: true }).state, 'paused');
  assert.equal(presentation({ isEmergency: true }).count, 3);
});
test('recorded durations use whole minutes; future/missing/invalid are unknown', () => {
  assert.equal(presentation().phaseMinutes, 45);
  assert.equal(presentation().cycleMinutes, 105);
  assert.equal(presentation({ phaseStartedAt: 'invalid' }).phaseMinutes, null);
  assert.equal(presentation({ phaseStartedAt: '2026-10-10T11:00:00Z' }).phaseMinutes, null);
  assert.equal(presentation({ operationStartedAt: null }).cycleMinutes, null);
  assert.equal(presentation({ currentStepIndex: 0 }).phaseMinutes, null);
  assert.equal(presentation({ currentStepIndex: 0 }).cycleMinutes, null);
});
test('phase history fallback must belong to the current phase; missing workflow does not fabricate a state', () => {
  assert.equal(presentation({ phaseStartedAt: null, statusHistory: [{ stepIndex: 0, startedAt: room.phaseStartedAt }] }).phaseMinutes, null);
  assert.equal(presentation({ phaseStartedAt: null, statusHistory: [{ stepIndex: 1, startedAt: room.phaseStartedAt }] }).phaseMinutes, 45);
  const result = model.carouselRoomPresentation(room, [], day, now);
  assert.equal(result.title, 'Stav není k dispozici');
  assert.equal(result.progress, 0);
  assert.equal(result.phaseMinutes, null);
});
test('selection stays attached to actual room identity after reorder/removal', () => {
  const rooms = [{ id: 'a' }, { id: 'b' }];
  assert.equal(model.carouselSelection(rooms, 'b'), 1);
  assert.equal(model.carouselSelection([...rooms].reverse(), 'b'), 0);
  assert.equal(model.carouselSelection(rooms, 'deleted'), 0);
  assert.equal(model.carouselSelection([], 'deleted'), 0);
});
test('circular navigation wraps both ways without reversing a lap at the seam', () => {
  for (const count of [2, 3, 15]) {
    assert.equal(model.carouselWrappedIndex(count, count), 0);
    assert.equal(model.carouselWrappedIndex(-1, count), count - 1);
    assert.equal(model.carouselTurnToIndex(count - 1, 0, count), count);
    assert.equal(model.carouselTurnToIndex(0, count - 1, count), count === 2 ? 1 : -1);
    for (let turn = -3 * count; turn <= 3 * count; turn++) {
      for (let target = 0; target < count; target++) {
        const next = model.carouselTurnToIndex(turn, target, count);
        assert.equal(model.carouselWrappedIndex(next, count), target);
        assert.ok(Math.abs(next - turn) <= count / 2);
      }
    }
  }
});
test('zero/one rooms and small Settings-style coverflows have finite geometry', () => {
  for (const count of [0, 1]) {
    assert.equal(model.carouselWrappedIndex(-50, count), 0);
    assert.equal(model.carouselTurnToIndex(-50, 10, count), 0);
    assert.deepEqual(model.carouselCardPlacement(0, 0, count), {
      distance: 0, depth: 0, visible: true, scale: 1, opacity: 1, brightness: 1, zIndex: 20,
    });
  }
  for (const count of [2, 3, 15]) {
    for (let selected = 0; selected < count; selected++) {
      for (let index = 0; index < count; index++) {
        const placement = model.carouselCardPlacement(index, selected, count);
        assert.ok(Object.values(placement).filter(value => typeof value === 'number').every(Number.isFinite));
        assert.ok(placement.depth <= count / 2);
        assert.equal(placement.distance === 0, index === selected);
      }
    }
  }
});
test('coverflow uses the exact wrapped Settings placement and fades everything beyond four neighbours', () => {
  for (let selected = 0; selected < 15; selected++) {
    for (let index = 0; index < 15; index++) {
      let distance = index - selected;
      if (distance > 7.5) distance -= 15;
      if (distance < -7.5) distance += 15;
      const depth = Math.abs(distance);
      assert.deepEqual(model.carouselCardPlacement(index, selected, 15), {
        distance, depth, visible: depth <= 4,
        scale: Math.max(.68, 1 - depth * .095),
        opacity: depth <= 4 ? Math.max(.18, 1 - depth * .18) : 0,
        brightness: Math.max(.42, 1 - depth * .13),
        zIndex: 20 - depth,
      });
    }
  }
  assert.equal(model.carouselCardPlacement(14, 0, 15).distance, -1);
  assert.equal(model.carouselCardPlacement(0, 14, 15).distance, 1);
  assert.equal(model.carouselCardPlacement(4, 0, 15).visible, true);
  assert.equal(model.carouselCardPlacement(5, 0, 15).visible, false);
});
test('long clinical content switches to the scrollable layout before touching the heading or wrapped chooser', () => {
  assert.equal(model.carouselContentFits(1080, 500, 120, 70), true);
  assert.equal(model.carouselContentFits(1024, 640, 100, 114), true);
  assert.equal(model.carouselContentFits(768, 600, 100, 114), false);
  assert.equal(model.carouselContentFits(768, 520, 100, 114), false);
  assert.equal(model.carouselContentFits(768, 440, 100, 70), true);
  assert.equal(model.carouselContentFits(699, 260, 100, 70), false);
  // Equal boundaries are safe, but one extra pixel or a second chooser row is not.
  assert.equal(model.carouselContentFits(1000, 672, 140, 116), true);
  assert.equal(model.carouselContentFits(1000, 673, 140, 116), false);
  assert.equal(model.carouselContentFits(1000, 672, 140, 160), false);
});
test('identity changes rebase the turn while keeping the chosen real room in front', () => {
  const rooms = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const reordered = [rooms[2], rooms[0], rooms[1]];
  const index = model.carouselSelection(reordered, 'a');
  assert.equal(model.carouselWrappedIndex(model.carouselTurnToIndex(6, index, 3), 3), index);
  const remaining = rooms.filter(room => room.id !== 'a');
  const fallback = model.carouselSelection(remaining, 'a');
  assert.equal(model.carouselWrappedIndex(model.carouselTurnToIndex(6, fallback, remaining.length), remaining.length), 0);
});

// Bounded component/handler checks, not browser lifecycle or CSS-layout proof.
let stateUpdates = [];
const react = {
  ...React, useMemo: factory => factory(), useCallback: callback => callback,
  useEffect: () => {}, useId: () => 'test-carousel', useRef: value => ({ current: value }),
  useState: initial => [initial, value => stateUpdates.push(value)],
};
const Carousel = load('components/dashboard/DashboardCarousel.tsx', {
  react, 'lucide-react': require('lucide-react'), '../../lib/dashboard-carousel': model,
  '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: statuses }) },
  '../../hooks/useOperationalDayWindow': { useOperationalDayWindow: () => day },
  '../../hooks/useSharedClock': { useNowMinuteMs: () => now },
  '../room/AcuteDashboardBadge': { __esModule: true, default: () => null },
  './dashboard-carousel.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
}).default;
function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}
function render(rooms = [room, { ...room, id: 'second', name: 'Druhý konfigurovaný sál' }]) {
  const calls = [];
  stateUpdates = [];
  const tree = Carousel({ rooms, specialtiesByRoom: new Map(), onSelectRoom: id => calls.push(['detail', id]), onEmergency: id => calls.push(['emergency', id]), onLock: id => calls.push(['lock', id]) });
  return { tree, calls };
}
function withStatefulCarousel(run) {
  const original = { useState: react.useState, useRef: react.useRef, useEffect: react.useEffect, window: globalThis.window, ResizeObserver: globalThis.ResizeObserver };
  const values = [];
  const refs = [];
  const effects = [];
  let stateCursor = 0;
  let refCursor = 0;
  try {
    react.useState = initial => {
      const index = stateCursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
    };
    react.useRef = initial => {
      const index = refCursor++;
      refs[index] ??= { current: initial };
      return refs[index];
    };
    react.useEffect = effect => { effects.push(effect); };
    const rerender = rooms => {
      stateCursor = 0;
      refCursor = 0;
      effects.length = 0;
      return render(rooms);
    };
    run({ values, refs, effects, rerender });
  } finally {
    react.useState = original.useState;
    react.useRef = original.useRef;
    react.useEffect = original.useEffect;
    for (const name of ['window', 'ResizeObserver']) {
      if (original[name] === undefined) delete globalThis[name];
      else globalThis[name] = original[name];
    }
  }
}
test('every clinical action delegates only to the existing handler with the actual room ID', () => {
  const { tree, calls } = render();
  const cards = elements(tree, node => node.type === 'article');
  assert.equal(cards.length, 2);
  const controls = elements(cards[0], node => node.type === 'button');
  controls.forEach(control => control.props.onClick());
  assert.deepEqual(calls, [['detail', room.id], ['detail', room.id], ['emergency', room.id], ['lock', room.id], ['detail', room.id]]);
  assert.equal(elements(cards[0], node => node.props.inert === false).length, 1);
  assert.equal(cards[1].props['aria-hidden'], true);
  assert.equal(elements(cards[1], node => node.props.inert === true).length, 1);
  const backControls = elements(cards[1], node => node.type === 'button' && !Object.hasOwn(node.props, 'data-orbit-select'));
  assert.equal(backControls.length, 5);
  assert.ok(backControls.every(control => control.props.disabled));
});
test('carousel shows the hygiene icon only for the room with active enhanced hygiene', () => {
  for (const enabled of [true, false, undefined]) {
    const { tree, calls } = render([{ ...room, isEnhancedHygiene: enabled, isSeptic: false }]);
    const badges = elements(tree, node => node.props.role === 'img' && node.props['aria-label'] === 'Zvýšený hygienický režim');
    assert.equal(badges.length, enabled ? 1 : 0);
    const [detail] = elements(tree, node => node.type === 'button' && node.props.className === 'main');
    assert.equal(detail.props['aria-label'].includes('Zvýšený hygienický režim.'), Boolean(enabled));
    if (enabled) {
      assert.equal(badges[0].props.title, 'Zvýšený hygienický režim');
      assert.equal(badges[0].props.onClick, undefined);
    }
    assert.deepEqual(calls, [], 'Rendering hygiene must not change clinical data');
  }
});

test('circular arrows and keyboard navigation do not perform clinical actions', () => {
  const { tree, calls } = render();
  const previous = elements(tree, node => node.props['aria-label'] === 'Předchozí sál')[0];
  assert.equal(previous.props.disabled, false);
  const track = elements(tree, node => node.props.onKeyDown)[0];
  for (const key of ['ArrowRight', 'End', 'Home', 'ArrowLeft']) {
    let prevented = false;
    track.props.onKeyDown({ key, target: track, currentTarget: track, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
  }
  assert.deepEqual(stateUpdates.filter(value => typeof value === 'object'), [{ id: 'second', turn: 1 }, { id: 'configured-room', turn: 2 }, { id: 'second', turn: 1 }]);
  const before = stateUpdates.length;
  track.props.onKeyDown({ key: 'ArrowRight', target: {}, currentTarget: track, preventDefault: () => assert.fail('Child control must own its keys') });
  assert.equal(stateUpdates.length, before);
  assert.deepEqual(calls, []);
});
test('previous from first selects last; next from last selects first on the following turn', () => {
  const { tree, calls } = render();
  elements(tree, node => node.props['aria-label'] === 'Předchozí sál')[0].props.onClick();
  elements(tree, node => node.props['aria-label'] === 'Následující sál')[0].props.onClick();
  assert.deepEqual(stateUpdates.filter(value => typeof value === 'object'), [{ id: 'second', turn: -1 }, { id: room.id, turn: 0 }]);
  assert.deepEqual(calls, []);
  for (const rooms of [[], [room]]) {
    const { tree } = render(rooms);
    const arrows = elements(tree, node => ['Předchozí sál', 'Následující sál'].includes(node.props['aria-label']));
    assert.ok(arrows.every(arrow => arrow.props.disabled));
    assert.doesNotMatch(JSON.stringify(elements(tree, node => node.props.style).map(node => node.props.style)), /NaN|Infinity/);
  }
});
test('every room is reachable in wrapping quick selection, including actual long labels', () => {
  const { tree } = render();
  const list = elements(tree, node => node.props['aria-label'] === 'Rychlý výběr sálu')[0];
  const buttons = elements(list, node => node.type === 'button');
  assert.equal(buttons.length, 2);
  assert.deepEqual(buttons.map(button => button.props['aria-label']), [room.name, 'Druhý konfigurovaný sál']);
  assert.deepEqual(buttons.map(button => button.props.title), [room.name, 'Druhý konfigurovaný sál']);
  assert.ok(buttons.every(button => button.props['aria-controls'] === 'test-carousel'));
  buttons[1].props.onClick();
  assert.deepEqual(stateUpdates.filter(value => typeof value === 'object'), [{ id: 'second', turn: 1 }]);
});
test('selecting a side card only brings it to the front', () => {
  const { tree, calls } = render();
  const overlay = elements(tree, node => Object.hasOwn(node.props, 'data-orbit-select'))[0];
  assert.equal(overlay.props.tabIndex, -1);
  overlay.props.onClick();
  assert.deepEqual(stateUpdates.filter(value => typeof value === 'object'), [{ id: 'second', turn: 1 }]);
  assert.deepEqual(calls, []);
});
test('horizontal swipe rotates and suppresses the resulting click; clinical-button drag only cancels', () => {
  for (const clinical of [false, true]) {
    const { tree, calls } = render();
    const track = elements(tree, node => node.props.onKeyDown)[0];
    const currentTarget = { setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
    const target = { closest: () => ({ hasAttribute: key => !clinical && key === 'data-orbit-swipe' }) };
    const event = { currentTarget, target, pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, preventDefault() {} };
    track.props.onPointerDown(event);
    track.props.onPointerMove({ ...event, clientX: 40 });
    track.props.onPointerUp({ ...event, clientX: 40 });
    let prevented = false;
    let stopped = false;
    track.props.onClickCapture({ detail: 1, preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
    assert.equal(prevented, true);
    assert.equal(stopped, true);
    assert.deepEqual(stateUpdates.filter(value => typeof value === 'object'), clinical ? [] : [{ id: 'second', turn: 1 }]);
    assert.deepEqual(calls, []);
  }
});
test('cancelled pointer gestures do not rotate or swallow later keyboard clicks', () => {
  const { tree, calls } = render();
  const track = elements(tree, node => node.props.onKeyDown)[0];
  const currentTarget = { setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
  const event = { currentTarget, target: { closest: () => null }, pointerId: 1, isPrimary: true, button: 0, clientX: 100, clientY: 100, preventDefault() {} };
  track.props.onPointerDown(event);
  track.props.onPointerMove({ ...event, clientX: 40 });
  track.props.onPointerCancel({ ...event, clientX: 40 });
  track.props.onClickCapture({ detail: 0, preventDefault: () => assert.fail('Keyboard click must remain available'), stopPropagation() {} });
  assert.deepEqual(stateUpdates, []);
  assert.deepEqual(calls, []);
});
test('new front controls stay inert until their own transform settles; side/child transitions cannot unlock them', () => {
  const original = { useState: react.useState, useRef: react.useRef, window: globalThis.window };
  try {
    for (const motion of [true, false]) {
      const values = [];
      const refs = [];
      let stateCursor = 0;
      let refCursor = 0;
      react.useState = initial => {
        const index = stateCursor++;
        if (!(index in values)) values[index] = initial;
        return [values[index], next => { values[index] = next; }];
      };
      react.useRef = initial => {
        const index = refCursor++;
        refs[index] ??= { current: initial };
        return refs[index];
      };
      globalThis.window = { matchMedia: () => ({ matches: motion }) };
      const rerender = () => { stateCursor = 0; refCursor = 0; return render().tree; };
      const first = rerender();
      elements(first, node => node.props['aria-label'] === 'Následující sál')[0].props.onClick();
      const moved = rerender();
      const front = elements(moved, node => node.type === 'article' && node.props['data-selected'])[0];
      assert.equal(front.props['data-room-id'], 'second');
      assert.ok(elements(front, node => node.type === 'button' && !Object.hasOwn(node.props, 'data-orbit-select')).every(button => button.props.disabled === motion));
      if (motion) {
        const side = elements(moved, node => node.type === 'article' && !node.props['data-selected'])[0];
        side.props.onTransitionEnd({ target: side, currentTarget: side, propertyName: 'transform' });
        assert.equal(values[1], true, 'A side card cannot enable the selected clinical controls');
        front.props.onTransitionEnd({ target: {}, currentTarget: front, propertyName: 'transform' });
        assert.equal(values[1], true, 'A child transition cannot enable the clinical controls');
        front.props.onTransitionEnd({ target: front, currentTarget: front, propertyName: 'opacity' });
        assert.equal(values[1], true, 'Only the selected transform ending enables controls');
        front.props.onTransitionEnd({ target: front, currentTarget: front, propertyName: 'transform' });
        const settled = elements(rerender(), node => node.type === 'article' && node.props['data-selected'])[0];
        assert.ok(elements(settled, node => node.type === 'button').every(button => !button.props.disabled));
      }
    }
  } finally {
    react.useState = original.useState;
    react.useRef = original.useRef;
    if (original.window === undefined) delete globalThis.window;
    else globalThis.window = original.window;
  }
});
test('removing the selected real room immediately guards the fallback before effects and while it moves forward', () => {
  for (const motion of [true, false]) withStatefulCarousel(({ values, effects, rerender }) => {
    globalThis.window = { matchMedia: () => ({ matches: motion }) };
    const first = rerender().tree;
    elements(first, node => node.props['aria-label'] === 'Následující sál')[0].props.onClick();
    const selectedSecond = rerender().tree;
    const selected = elements(selectedSecond, node => node.type === 'article' && node.props['data-selected'])[0];
    selected.props.onTransitionEnd({ target: selected, currentTarget: selected, propertyName: 'transform' });
    assert.equal(values[0].id, 'second');
    assert.equal(values[1], false);

    const stale = rerender([room]).tree;
    const fallback = elements(stale, node => node.type === 'article')[0];
    const controls = elements(fallback, node => node.type === 'button' && !Object.hasOwn(node.props, 'data-orbit-select'));
    assert.ok(controls.every(control => control.props.disabled), 'The stale selection must guard the first render, before its effect');
    assert.equal(elements(fallback, node => node.props.inert === true).length, 1);
    effects[0]();
    assert.equal(values[0].id, room.id);
    assert.equal(values[1], motion, 'An existing side card waits for movement; reduced motion does not');

    const rebased = rerender([room]).tree;
    const front = elements(rebased, node => node.type === 'article')[0];
    assert.ok(elements(front, node => node.type === 'button' && !Object.hasOwn(node.props, 'data-orbit-select')).every(control => control.props.disabled === motion));
    front.props.onTransitionEnd({ target: front, currentTarget: front, propertyName: 'transform' });
    const settled = elements(rerender([room]).tree, node => node.type === 'article')[0];
    assert.ok(elements(settled, node => node.type === 'button').every(control => !control.props.disabled));
  });
});
test('content observer measures real frame, heading and wrapped chooser, then restores centered layout when it fits', () => {
  withStatefulCarousel(({ values, effects, rerender }) => {
    const observations = [];
    let callback;
    let disconnected = false;
    globalThis.ResizeObserver = class {
      constructor(measure) { callback = measure; }
      observe(element) { observations.push(element); }
      disconnect() { disconnected = true; }
    };
    const heading = { getBoundingClientRect: () => ({ bottom: 100 }) };
    const root = { clientHeight: 768, scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }), querySelector: () => heading };
    const frame = { offsetHeight: 600 };
    const chooser = { offsetHeight: 114 };
    const initial = rerender().tree;
    elements(initial, node => node.props.onKeyDown)[0].props.ref.current = { closest: () => root };
    elements(initial, node => node.props.className === 'orbit')[0].props.ref.current = frame;
    elements(initial, node => node.props.className === 'chooser')[0].props.ref.current = chooser;
    const cleanup = effects[1]();
    assert.deepEqual(observations, [frame, chooser, root, heading]);
    assert.deepEqual(values[2], { overflow: true, height: 924 });
    const overflowing = rerender().tree;
    assert.equal(overflowing.props['data-overflow'], true);
    assert.equal(overflowing.props.style['--carousel-content-height'], '924px');
    assert.ok(values[2].height / 2 - frame.offsetHeight / 2 - chooser.offsetHeight - 24 >= 24, 'Centered cards must clear even a wrapped chooser in the scroll fallback');

    frame.offsetHeight = 440;
    chooser.offsetHeight = 70;
    callback();
    assert.deepEqual(values[2], { overflow: false, height: 676 });
    assert.notEqual(rerender().tree.props['data-overflow'], true);
    cleanup();
    assert.equal(disconnected, true);
  });
});
test('CSS matches Settings coverflow, gradients and side arrows while preserving transparent circles and clinical sizes', () => {
  const css = postcss.parse(read('components/dashboard/dashboard-carousel.module.css'));
  const rules = {};
  css.walkRules(rule => { rules[rule.selector] ??= {}; rule.walkDecls(decl => { rules[rule.selector][decl.prop] = decl.value; }); });
  assert.equal(rules['.ringCenter'].background, 'transparent');
  assert.equal(rules['.orbit']['transform-style'], 'preserve-3d');
  assert.equal(rules['.viewport'].perspective, '1500px');
  assert.equal(rules['.orbit'].perspective, '1300px');
  assert.match(rules['.card'].transform, /translate3d.*--carousel-distance.*--carousel-step.*--carousel-depth.*9px.*--carousel-depth.*-118px.*rotateY.*-11deg.*scale/);
  assert.match(rules['.card'].transition, /transform 700ms cubic-bezier\(\.2, \.72, \.22, 1\)/);
  assert.equal(rules['.card']['border-radius'], '24px');
  assert.match(rules[".card[data-selected='true']"].background, /linear-gradient\(180deg.*32%.*14%.*42%.*rgba\(10, 22, 54, \.9\)/);
  assert.match(rules['.card'].background, /rgba\(24, 39, 82, \.58\).*rgba\(9, 20, 50, \.78\)/);
  assert.equal(rules['.name']['font-weight'], '400');
  assert.equal(rules['.name']['letter-spacing'], '-.035em');
  assert.equal(rules['.viewport']['touch-action'], 'pan-y');
  assert.equal(rules['.viewport'].overflow, 'clip', 'Focus must not silently move the full centered stage sideways');
  assert.ok(parseInt(rules['.action, .detail'].width) >= 44);
  assert.ok(parseInt(rules['.action, .detail'].height) >= 44);
  assert.ok(parseInt(rules['.navigation button'].width) >= 44);
  assert.equal(rules['.navigation']['align-items'], 'center');
  assert.equal(rules['.navigation']['justify-content'], 'space-between');
  assert.equal(rules['.chooser']['flex-direction'], 'column');
  assert.equal(rules['.position > span']['clip-path'], 'inset(50%)');
  assert.notEqual(rules['.position > span'].display, 'none', 'The full room name remains available to the live region');
  assert.equal(rules['.roomList']['flex-wrap'], 'wrap');
  assert.match(read('components/dashboard/dashboard-carousel.module.css'), /max-width: 767px.*\{ \.carousel \{ display: none; \}/);
  assert.match(read('components/dashboard/dashboard-carousel.module.css'), /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(read('components/dashboard/DashboardCarousel.tsx'), /setInterval|fetch\(|supabase/);
  assert.match(read('components/DashboardModule.tsx'), /key=\{activeHospitalId\}/);
  assert.match(read('components/dashboard/dashboard-carousel.module.css'), /\.carousel\[data-overflow='true'\].*position: relative.*height: var\(--carousel-content-height\)/);
  const globalCss = postcss.parse(read('app/globals.css'));
  const overrides = [];
  globalCss.walkRules(rule => {
    if (rule.selector.includes('.dashboard-carousel-module')) overrides.push(rule);
  });
  assert.ok(overrides.length > 0);
  assert.ok(overrides.every(rule => rule.parent.type === 'atrule' && /min-width:\s*768px/.test(rule.parent.params)), 'Carousel layout overrides must stay desktop/tablet-only');
});
