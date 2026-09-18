import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = postcss.parse(read('components/mobile/mobile-overview.css'));
const shell = postcss.parse(read('components/mobile/mobile-shell.css'));
const source = read('components/mobile/MobileRoomOverview.tsx');

function declarationsFor(stylesheet, selector) {
  const result = {};
  stylesheet.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
  });
  return result;
}

function compile(sourceText, filename, dependencies = {}) {
  const { outputText } = ts.transpileModule(sourceText, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected runtime dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod);
  return mod.exports;
}

const display = compile(read('lib/mobile-room-display.ts'), 'mobile-room-display.ts');
const statuses = [
  { name: 'Sál připraven', color: '#00D6C4' },
  { name: 'Chirurgický výkon', color: '#EE0000', accent_color: '#B51A68' },
];
const now = Date.parse('2026-09-17T10:00:00Z');
const room = (id, extra = {}) => ({ id, name: `Sál ${id}`, department: 'Chirurgie', currentStepIndex: 0, ...extra });
function DropdownMenu() { return null; }
function DropdownItem() { return null; }

// Execute the actual component against deterministic hook/context adapters and
// real React elements. This is a render-tree/wiring test, not a substitute for
// browser layout or Radix keyboard/focus verification. No backend is imported.
function renderOverview(rooms, { loaded = true, search = '', filter = 'all' } = {}) {
  let stateIndex = 0;
  const state = [search, filter];
  const mutations = [];
  const calls = [];
  const Component = compile(source, 'MobileRoomOverview.tsx', {
    react: {
      __esModule: true,
      default: React,
      useId: () => 'test-room-search',
      useMemo: compute => compute(),
      useState: () => {
        const index = stateIndex++;
        return [state[index], value => mutations.push([index, value])];
      },
    },
    'lucide-react': Object.fromEntries(['AlertCircle', 'Bell', 'CalendarDays', 'ChevronRight', 'Lock', 'MoreHorizontal', 'Search', 'X'].map(name => [name, name])),
    '../../contexts/HospitalContext': { useHospital: () => ({ activeHospital: { hospital_short_name: 'Ukázkové zařízení' } }) },
    '../../contexts/AuthContext': { useAuth: () => ({ hasModuleAccess: () => true }) },
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: statuses }) },
    '../../hooks/useSharedClock': { useNowMinuteMs: () => now },
    '../../lib/mobile-room-display': display,
    '../ui/DropdownMenu': { DropdownMenu, DropdownItem },
    './MobileShell': { MobileHeader: () => null },
    './mobile-overview.css': {},
  }).default;
  const tree = Component({
    rooms, roomsLoaded: loaded,
    onSelectRoom: id => calls.push(['detail', id]),
    onEmergency: id => calls.push(['emergency', id]),
    onLock: id => calls.push(['lock', id]),
    onNavigate: id => calls.push(['navigate', id]),
  });
  return { tree, calls, mutations };
}

function children(node) { return React.Children.toArray(node?.props?.children); }
function findAll(node, predicate) {
  const found = [];
  const visit = value => {
    if (!React.isValidElement(value)) return;
    if (predicate(value)) found.push(value);
    children(value).forEach(visit);
    // A menu's trigger is a sibling control, not part of its children.
    if (value.props.trigger) visit(value.props.trigger);
  };
  visit(node);
  return found;
}
function hasClass(node, className) { return node?.props?.className?.split(/\s+/).includes(className); }
function byClass(node, className) { return findAll(node, value => hasClass(value, className)); }
function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return children(node).map(text).join('');
}

test('room cards form two equal columns only below the desktop breakpoint', () => {
  const rules = [];
  css.walkRules(rule => {
    if (!rule.selectors.some(selector => selector.startsWith('.mro-room'))) return;
    let parent = rule.parent;
    let mobile = false;
    while (parent) {
      if (parent.type === 'atrule' && parent.name === 'media') {
        const maxWidth = parent.params.match(/max-width:\s*(\d+)px/);
        if (maxWidth && Number(maxWidth[1]) <= 767) mobile = true;
      }
      parent = parent.parent;
    }
    assert.ok(mobile, `${rule.selector} must not change desktop cards`);
    if (rule.selectors.includes('.mro-room-list')) rules.push(rule);
  });
  const list = declarationsFor(css, '.mro-room-list');
  assert.equal(list.display, 'grid');
  assert.equal(list['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  assert.equal(list['list-style'], 'none');
  assert.equal(list.padding, '0');
  const columns = rules.flatMap(rule => rule.nodes.filter(node => node.prop === 'grid-template-columns').map(node => node.value));
  assert.deepEqual(columns, ['repeat(2, minmax(0, 1fr))'], 'Small screens must retain both columns');
  assert.match(source, /className="mobile-room-overview md:hidden"/);
});

test('iOS cards retain common geometry and vertically stack identity, timing and footer', () => {
  const card = declarationsFor(css, '.mro-room');
  assert.equal(card.display, 'flex');
  assert.equal(card['flex-direction'], 'column');
  assert.equal(card['min-width'], '0');
  const open = declarationsFor(css, '.mro-room-open');
  assert.equal(open['flex-direction'], 'column');
  assert.equal(open.padding, 'var(--m-card-padding)');
  const title = declarationsFor(css, '.mro-room-identity strong');
  assert.equal(title['font-size'], 'var(--m-card-title-size)');
  assert.equal(title['font-weight'], 'var(--m-card-title-weight)');
  assert.equal(declarationsFor(shell, '.m-unified-card')['border-radius'], 'var(--m-card-radius)');
  assert.equal(declarationsFor(shell, '.m-unified-card').background, 'var(--m-card)');
  const timing = declarationsFor(css, '.mro-room-time');
  assert.equal(timing['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  const { tree } = renderOverview([room('pcho')]);
  const [renderedCard] = byClass(tree, 'mro-room');
  assert.ok(hasClass(renderedCard, 'm-unified-card'));
  assert.deepEqual(children(renderedCard).map(node => node.props.className), ['mro-room-open', 'mro-room-footer']);
  assert.deepEqual(children(children(renderedCard)[0]).map(node => node.props.className), ['mro-room-identity', 'mro-room-time']);
  const metrics = byClass(renderedCard, 'mro-room-metric');
  assert.deepEqual(metrics.map(metric => text(children(metric)[0])), ['Uplynulo', 'Odhad konce']);
});

test('long room names remain complete and wrap without truncation or clamping', () => {
  const longName = 'GYNEKOLOGIE HLAVNÍ – SPECIALIZOVANÝ OPERAČNÍ SÁL ČÍSLO 123';
  const { tree } = renderOverview([room('long', { name: longName })]);
  const [title] = byClass(tree, 'm-unified-card-title');
  assert.equal(text(title), longName);
  assert.equal(declarationsFor(css, '.mro-room-identity strong')['overflow-wrap'], 'anywhere');
  for (const selector of ['.mro-room', '.mro-room-open', '.mro-room-identity', '.mro-room-identity strong']) {
    const values = declarationsFor(css, selector);
    for (const prop of ['max-height', 'height', 'line-clamp', '-webkit-line-clamp', 'text-overflow']) {
      assert.equal(values[prop], undefined, `${selector} must not truncate via ${prop}`);
    }
    assert.notEqual(values['white-space'], 'nowrap', `${selector} must allow name wrapping`);
  }
  assert.doesNotMatch(title.props.className, /truncate|line-clamp/);
});

test('room options are an independent named 44px target and callbacks keep their room ID', () => {
  const { tree, calls } = renderOverview([room('first'), room('second', { name: 'PCHO sál č. 2' })]);
  const renderedCards = byClass(tree, 'mro-room');
  for (const [index, renderedCard] of renderedCards.entries()) {
    const expectedId = index === 0 ? 'first' : 'second';
    const [open] = byClass(renderedCard, 'mro-room-open');
    const [detail] = byClass(renderedCard, 'mro-room-detail-link');
    const [options] = byClass(renderedCard, 'mro-room-options');
    assert.equal(open.type, 'button');
    assert.equal(detail.type, 'button');
    assert.equal(options.type, 'button');
    for (const button of [open, detail, options]) {
      assert.equal(button.props.type, 'button');
      assert.ok(button.props['aria-label'].includes(index === 0 ? 'Sál first' : 'PCHO sál č. 2'));
      assert.equal(findAll(button, node => node.type === 'button').length, 1, 'No nested action button');
    }
    assert.equal(byClass(open, 'mro-room-options').length, 0);
    assert.equal(options.props.onClick, undefined, 'Opening options must not itself select a room');
    open.props.onClick();
    detail.props.onClick();
    const actions = findAll(renderedCard, node => node.type === DropdownItem);
    assert.deepEqual(actions.map(text), ['Vyhlásit stav nouze', 'Uzamknout sál']);
    actions.forEach(action => action.props.onSelect());
    assert.deepEqual(calls.slice(index * 4), [['detail', expectedId], ['detail', expectedId], ['emergency', expectedId], ['lock', expectedId]]);
  }
  const optionsStyle = declarationsFor(css, '.mro-room-options');
  assert.ok(parseFloat(optionsStyle.width) >= 44);
  assert.ok(parseFloat(optionsStyle['min-height']) >= 44);
  const detailStyle = declarationsFor(css, '.mro-room-detail-link');
  assert.ok(parseFloat(detailStyle['min-width']) >= 44);
  assert.ok(parseFloat(detailStyle['min-height']) >= 44);
});

test('semantic phase colors and real elapsed/end times survive the layout change', () => {
  const estimate = new Date(2026, 8, 17, 12, 30).toISOString();
  const { tree } = renderOverview([
    room('ready'),
    room('active', { currentStepIndex: 1, operationStartedAt: '2026-09-17T08:36:00Z', estimatedEndTime: estimate }),
    room('paused', { currentStepIndex: 1, isPaused: true }),
    room('locked', { currentStepIndex: 1, isLocked: true }),
    room('emergency', { currentStepIndex: 1, isEmergency: true }),
  ]);
  const cards = byClass(tree, 'mro-room');
  assert.deepEqual(cards.map(card => byClass(card, 'mro-status-dot')[0].props.style.background), ['#00D6C4', '#B51A68', '#20ACD5', '#B88512', '#E5484D']);
  const values = card => byClass(card, 'mro-room-metric').map(metric => text(children(metric)[1]));
  assert.deepEqual(values(cards[0]), ['—', '—']);
  assert.deepEqual(values(cards[1]), ['01:24', '12:30']);
  assert.equal(byClass(cards[2], 'mro-phase-label')[0].props.style.color, 'color-mix(in srgb, #20ACD5 65%, var(--m-text) 35%)');
  assert.equal(cards[4].props['data-emergency'], true);
  assert.deepEqual(findAll(cards[3], node => node.type === DropdownItem).map(text), ['Vyhlásit stav nouze', 'Odemknout sál']);
  assert.deepEqual(findAll(cards[4], node => node.type === DropdownItem).map(text), ['Zrušit stav nouze', 'Uzamknout sál']);
});

test('loading, empty facilities and empty search keep informative states outside the grid', () => {
  const loading = renderOverview([], { loaded: false }).tree;
  assert.equal(byClass(loading, 'mro-room-list').length, 0);
  assert.equal(text(byClass(loading, 'mro-empty')[0]), 'Načítám operační sály…');
  assert.equal(byClass(loading, 'mro-empty')[0].props.role, 'status');
  const empty = renderOverview([]).tree;
  assert.equal(byClass(empty, 'mro-room').length, 0);
  assert.match(text(byClass(empty, 'mro-empty')[0]), /Zatím nejsou k dispozici žádné sály/);
  assert.equal(findAll(byClass(empty, 'mro-empty')[0], node => node.type === 'button').length, 0);
  const filtered = renderOverview([room('pcho')], { search: 'nenalezeno', filter: 'active' });
  assert.equal(byClass(filtered.tree, 'mro-room').length, 0);
  const [message] = byClass(filtered.tree, 'mro-empty');
  assert.match(text(message), /Žádný sál neodpovídá filtru/);
  findAll(message, node => node.type === 'button')[0].props.onClick();
  assert.deepEqual(filtered.mutations, [[0, ''], [1, 'all']]);
  assert.equal(declarationsFor(css, '.mro-room-list:empty').display, 'none');
});
