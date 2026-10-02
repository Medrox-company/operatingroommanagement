import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import React from 'react';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = path => postcss.parse(read(path));
const declarations = (stylesheet, selector) => {
  const result = {};
  stylesheet.walkRules(rule => {
    if (rule.selector === selector) rule.walkDecls(decl => { result[decl.prop] = decl.value; });
  });
  return result;
};
const rgb = hex => hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16));
const luminance = hex => {
  const [r, g, b] = rgb(hex).map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

test('mobile text and active navigation meet normal-text contrast on their light surfaces', () => {
  const globals = css('app/globals.css');
  const tokens = { ...declarations(globals, ':root'), ...declarations(globals, ':root:not(.m-dark)') };
  globals.walkRules(':root:not(.m-dark)', rule => {
    assert.match(rule.parent.params, /max-width:\s*767px/, 'Contrast override must be phone-only');
  });
  for (const name of ['--m-accent', '--m-faint']) {
    assert.ok(contrast(tokens[name], tokens['--m-card-solid']) >= 4.5, `${name} must be readable on cards`);
  }
  assert.ok(contrast(tokens['--m-nav-active'], '#F4FAFF') >= 4.5);
});

test('mobile controls retain at least a 44px target and the time range has an announcement', () => {
  const navigation = declarations(css('components/mobile/mobile-navigation.css'), '.mobile-reference-nav > button');
  const overview = declarations(css('components/mobile/mobile-overview.css'), '.mro-filters button');
  const timeline = declarations(css('components/mobile/mobile-timeline.css'), '.mtl-time-pager button, .mtl-room-pager button');
  assert.ok(Number.parseFloat(navigation['min-height']) >= 44);
  assert.ok(Number.parseFloat(overview['min-height']) >= 44);
  assert.ok(Number.parseFloat(timeline.width) >= 44 && Number.parseFloat(timeline.height) >= 44);
  assert.match(read('components/mobile/MobileTimelineView.tsx'), /className="mtl-range-announcement" role="status"/);
});

test('room names wrap between words, never hyphenate inside a name', () => {
  const overview = declarations(css('components/mobile/mobile-overview.css'), '.mro-room-identity strong');
  const timeline = declarations(css('components/mobile/mobile-timeline.css'), '.mtl-row-heading > strong');
  for (const title of [overview, timeline]) {
    assert.equal(title['overflow-wrap'], 'normal');
    assert.equal(title['word-break'], 'keep-all');
    assert.equal(title.hyphens, 'none');
  }
});

const compile = (source, filename, dependencies) => {
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod);
  return mod.exports;
};
const elements = (root, predicate) => {
  const found = [];
  const visit = value => {
    if (!React.isValidElement(value)) return;
    if (predicate(value)) found.push(value);
    React.Children.toArray(value.props.children).forEach(visit);
  };
  visit(root);
  return found;
};

test('patient-flow filters and expanded room details expose their state to screen readers', () => {
  let stateIndex = 0;
  const Component = compile(read('components/mobile/MobileFlowView.tsx'), 'MobileFlowView.tsx', {
    react: {
      __esModule: true, default: React,
      useId: () => 'patient-flow',
      useMemo: fn => fn(),
      useState: initial => { stateIndex++; return [initial, () => {}]; },
    },
    'framer-motion': { motion: { div: 'div' }, AnimatePresence: 'fragment', useReducedMotion: () => false },
    'lucide-react': { Activity: 'svg', Workflow: 'svg' },
    './MobileShell': { MobileHeaderMetrics: 'div', MobileModuleHeader: 'header' },
  }).default;
  const room = { id: '1', name: 'Sál 1', currentStepIndex: 1, currentProcedure: { name: 'Operace' }, statusHistory: [] };
  const statuses = [
    { id: 'ready', name: 'Připraveno', order_index: 0, is_active: true, is_special: false },
    { id: 'operation', name: 'Výkon', order_index: 1, is_active: true, is_special: false },
  ];
  const tree = Component({ rooms: [room], statuses });
  assert.equal(stateIndex, 2);
  const filter = elements(tree, node => node.type === 'button' && node.props['aria-pressed'] === true)[0];
  assert.equal(filter.props.children, 'Všechny');
  const disclosure = elements(tree, node => node.type === 'button' && node.props['aria-expanded'] === true)[0];
  const region = elements(tree, node => node.props.role === 'region')[0];
  assert.match(disclosure.props['aria-label'], /Operace, Sál 1, nyní Výkon, krok 2 z 2/);
  assert.equal(disclosure.props['aria-controls'], region.props.id);
  assert.equal(region.props['aria-labelledby'], disclosure.props.id);
});
