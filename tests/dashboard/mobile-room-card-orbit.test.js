import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

// Exercise the actual passive component and display helper without mounting
// clinical providers, timers, network, storage, or a real hospital session.
const require = createRequire(import.meta.url);
const icons = require('lucide-react');
function load(path, imports) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected orbit dependency: ${name}`);
    return imports[name];
  }, mod.exports, mod);
  return mod.exports;
}
const phaseVisual = load('../../lib/mobile-room-phase-visual.ts', {});
const { default: MobileRoomOrbit } = load('../../components/mobile/MobileRoomOrbit.tsx', {
  react: React,
  'lucide-react': icons,
  '../../lib/mobile-room-phase-visual': phaseVisual,
  './mobile-room-card-orbit.css': {},
});
const phases = Object.freeze([
  Object.freeze({ name: 'Sál připraven', color: '#09B384' }),
  Object.freeze({ name: 'Příjezd na sál', color: '#47A5FF' }),
  Object.freeze({ name: 'Začátek anestezie', color: '#E5AE29' }),
  Object.freeze({ name: 'Chirurgický výkon', color: '#AA1764', accent_color: '#D95899' }),
  Object.freeze({ name: 'Předání pacienta', color: '#7655D9' }),
  Object.freeze({ name: 'Úklid sálu', color: '#D77221' }),
]);
const room = (index = 3, overrides = {}) => Object.freeze({ id: 'room', currentStepIndex: index, ...overrides });
function walk(node) {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  return [node, ...walk(node.props.children)];
}
const byClass = (tree, name) => walk(tree).filter(node => node.props.className?.split(' ').includes(name));
const render = (index = 3, overrides = {}, statuses = phases, title = 'Chirurgický výkon') => MobileRoomOrbit({ room: room(index, overrides), statuses, title });

test('the compact phase visual preserves the real phase count without drawing a surrounding ring', () => {
  for (const count of [1, 3, 6, 9, 12]) {
    const statuses = Array.from({ length: count }, (_, index) => ({ name: `Vlastní fáze ${index}`, color: '#C541A0' }));
    const tree = render(count - 1, {}, statuses);
    assert.equal(tree.props['data-phase-count'], count);
    assert.equal(tree.props['data-phase-valid'], 'true');
    assert.equal(tree.props.style['--mro-orbit-phase-color'], '#C541A0');
    assert.equal(byClass(tree, 'mro-orbit-node').length, 0);
    assert.equal(byClass(tree, 'mro-orbit-track').length, 0);
  }
});

test('the card center contains only its current icon and title, with no dial artwork or progress graphic', () => {
  for (let index = 0; index < phases.length; index += 1) {
    const tree = render(index);
    assert.equal(byClass(tree, 'mro-orbit-center').length, 1);
    assert.equal(byClass(tree, 'mro-orbit-icon').length, 1);
    assert.equal(byClass(tree, 'mro-orbit-title').length, 1);
    for (const className of ['mro-orbit-art', 'mro-orbit-dial', 'mro-orbit-chart', 'mro-orbit-track', 'mro-orbit-completed', 'mro-orbit-segment', 'mro-orbit-node']) {
      assert.equal(byClass(tree, className).length, 0, `Remove ${className}, not just its opacity`);
    }
    assert.ok(!walk(tree).some(node => ['img', 'svg', 'circle', 'g'].includes(node.type)), 'Only installed icon components and their alpha masks remain, without a native chart or raster dial element');
  }
});

test('invalid or missing indices stay neutral with an unknown phase icon instead of being clamped', () => {
  for (const index of [-1, phases.length, 99, NaN, Infinity, 1.5, undefined, null, '2']) {
    const tree = MobileRoomOrbit({ room: room(index), statuses: phases, title: 'Stav není k dispozici' });
    // room() has a convenient default, so explicitly restore the undefined case.
    const actual = index === undefined ? MobileRoomOrbit({ room: { currentStepIndex: undefined }, statuses: phases, title: 'Stav není k dispozici' }) : tree;
    assert.equal(actual.props['data-phase-valid'], 'false', String(index));
    assert.equal(actual.props.style['--mro-orbit-phase-color'], '#7890A8');
    assert.equal(actual.props['data-phase-icon'], 'unknown');
    assert.equal(byClass(actual, 'mro-orbit-completed').length, 0);
    assert.equal(byClass(actual, 'mro-orbit-segment').length, 0);
    assert.equal(byClass(actual, 'mro-orbit-node').length, 0);
    assert.equal(walk(actual).filter(node => node.type === icons.CircleHelp).length, 1);
  }
});

test('empty or unavailable phases remain distinct from an unknown but configured custom phase', () => {
  for (const statuses of [[], [{}], [{ name: ' ', color: '#DD5588' }], [null]]) {
    const tree = render(0, {}, statuses, 'Stav není k dispozici');
    assert.equal(tree.props['data-phase-valid'], 'false');
    assert.equal(tree.props.style['--mro-orbit-phase-color'], '#7890A8');
    assert.equal(byClass(tree, 'mro-orbit-completed').length, 0);
  }
  const custom = render(0, {}, [{ name: 'Vlastní klinický krok', color: '#CF197E' }]);
  assert.equal(custom.props['data-phase-valid'], 'true');
  assert.equal(custom.props['data-phase-icon'], 'unknown');
  assert.equal(custom.props.style['--mro-orbit-phase-color'], '#CF197E');
  assert.equal(byClass(custom, 'mro-orbit-title').length, 1);
});

test('phase colors come from the shared helper and never from room flags or a hardcoded index mapping', () => {
  const tree = render(3, { isEmergency: true, isLocked: true, isPaused: true });
  assert.equal(tree.props['data-phase-icon'], 'surgery');
  assert.equal(tree.props.style['--mro-orbit-phase-color'], '#D95899');
  for (const reordered of [[...phases].reverse(), [phases[3], phases[0]]]) {
    const index = reordered.indexOf(phases[3]);
    const reorderedTree = render(index, {}, reordered);
    assert.equal(reorderedTree.props['data-phase-icon'], 'surgery');
    assert.equal(reorderedTree.props.style['--mro-orbit-phase-color'], '#D95899');
  }
});

test('thematic visuals reuse the real operating table, scalpel and installed matching operational icons', () => {
  assert.equal(byClass(render(0), 'mro-orbit-mask--table').length, 1);
  assert.equal(byClass(render(3), 'mro-orbit-mask--scalpel').length, 1);
  assert.equal(walk(render(2)).filter(node => node.type === icons.Syringe).length, 1);
  assert.equal(walk(render(5)).filter(node => node.type === icons.Broom).length, 1);
  assert.equal(walk(render(1)).filter(node => node.type === icons.BedSingle).length, 1);
  assert.equal(walk(render(1)).filter(node => node.type === icons.LogIn).length, 1);
});

test('explicit emergency, lock and pause icon precedence matches the existing title without replacing phase identity', () => {
  for (const [flags, state, Icon, title] of [
    [{ isEmergency: true, isLocked: true, isPaused: true }, 'emergency', icons.AlertTriangle, 'Nouzový stav'],
    [{ isLocked: true, isPaused: true }, 'locked', icons.Lock, 'Sál uzamčen'],
    [{ isPaused: true }, 'paused', icons.Pause, 'Pauza'],
  ]) {
    const tree = render(3, flags, phases, title);
    assert.equal(tree.props['data-orbit-state'], state);
    assert.equal(tree.props['data-phase-icon'], 'surgery');
    assert.equal(walk(tree).filter(node => node.type === Icon).length, 1);
    assert.equal(byClass(tree, 'mro-orbit-mask--scalpel').length, 0);
    assert.equal(byClass(tree, 'mro-orbit-title')[0].props.children, title);
  }
});

test('visuals are passive and hidden from assistive technology, while the full supplied title remains visible', () => {
  const title = 'Celý dlouhý název příslušné fáze';
  const tree = render(3, {}, phases, title);
  assert.equal(byClass(tree, 'mro-orbit-art').length, 0);
  assert.equal(byClass(tree, 'mro-orbit-icon')[0].props['aria-hidden'], 'true');
  assert.equal(byClass(tree, 'mro-orbit-title')[0].props['aria-hidden'], undefined);
  assert.equal(byClass(tree, 'mro-orbit-title')[0].props.children, title);
  for (const node of walk(tree)) {
    assert.notEqual(node.type, 'button');
    assert.notEqual(node.type, 'a');
    assert.equal(node.props.tabIndex, undefined);
    assert.ok(!Object.keys(node.props).some(key => /^on[A-Z]/.test(key)));
  }
});

const css = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-room-card-orbit.css', import.meta.url), 'utf8'));
test('every new style stays inside the opt-in phone overview rather than changing desktop, classic or room detail', () => {
  css.walkRules(rule => {
    assert.ok(rule.selectors.every(selector => selector.startsWith('html[data-app-design="cliniq"] .mobile-room-overview.mobile-room-overview-orbit .mro-orbit')));
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    assert.ok(media.some(value => /max-width:\s*(\d+)px/.test(value) && Number(value.match(/max-width:\s*(\d+)px/)[1]) <= 767));
  });
});

test('compact icons reuse only the table/scalpel alpha artwork and word-safe titles without dial assets or motion', () => {
  let assetCount = 0;
  css.walkDecls(declaration => {
    for (const match of declaration.value.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
      assert.ok(match[1].startsWith('/images/mobile-orbit-'));
      assert.doesNotMatch(match[1], /dial/);
      assert.ok(statSync(new URL(`../../public${match[1]}`, import.meta.url)).isFile());
      assetCount += 1;
    }
    assert.notEqual(declaration.prop, 'animation');
    assert.notEqual(declaration.prop, 'text-overflow');
    if (declaration.prop === 'hyphens') assert.equal(declaration.value, 'none');
    if (declaration.prop === 'word-break') assert.equal(declaration.value, 'normal');
  });
  assert.equal(assetCount, 2);
  assert.equal(byClass(render(), 'mro-orbit-dial').length, 0);
  css.walkRules(rule => assert.doesNotMatch(rule.selector, /mro-orbit-(?:art|dial|chart|track|completed|segment|node)/, 'Remove obsolete ring-only styling'));
  const scope = 'html[data-app-design="cliniq"] .mobile-room-overview.mobile-room-overview-orbit';
  const valuesFor = selector => {
    const values = {};
    css.walkRules(rule => {
      if (rule.selectors.includes(selector)) rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
    });
    return values;
  };
  const compact = valuesFor(`${scope} .mro-orbit`);
  assert.equal(compact.display, 'flex');
  assert.equal(compact['min-height'], '76px');
  assert.equal(compact['aspect-ratio'], undefined, 'Do not reserve a square or circular dial footprint');
  assert.equal(compact['pointer-events'], 'none');
  const center = valuesFor(`${scope} .mro-orbit-center`);
  assert.equal(center.display, 'flex');
  assert.equal(center['flex-direction'], 'column');
  assert.equal(center.width, '100%');
  assert.equal(center.position, undefined, 'Use ordinary content flow so long phase titles can grow');
  assert.equal(center.inset, undefined);
});
