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

function compile(sourceText, filename, dependencies = {}, globals = {}) {
  const { outputText } = ts.transpileModule(sourceText, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', ...Object.keys(globals), outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected runtime dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod, ...Object.values(globals));
  return mod.exports;
}

const display = compile(read('lib/mobile-room-display.ts'), 'mobile-room-display.ts');
const phaseVisual = compile(read('lib/mobile-room-phase-visual.ts'), 'mobile-room-phase-visual.ts');
const acute = compile(read('lib/acute-requests.ts'), 'acute-requests.ts');
const acuteDashboard = compile(read('lib/acute-dashboard.ts'), 'acute-dashboard.ts', { './acute-requests': acute });
const statuses = [
  { name: 'Sál připraven', color: '#00D6C4' },
  { name: 'Chirurgický výkon', color: '#EE0000', accent_color: '#B51A68' },
];
const now = Date.parse('2026-09-17T10:00:00Z');
const room = (id, extra = {}) => ({ id, name: `Sál ${id}`, department: 'Chirurgie', currentStepIndex: 0, ...extra });
function AcuteDashboardBadge() { return null; }
function MobileRoomOrbit() { return null; }

// Execute the actual component against deterministic hook/context adapters and
// real React elements. This is a render-tree/wiring test, not a substitute for
// browser layout or focus-trap verification. No backend is imported.
function renderOverview(rooms, { loaded = true, filter = 'all', layout = 'grid', design = 'classic', acuteByRoom } = {}) {
  let stateIndex = 0;
  const state = [layout, filter, null];
  const mutations = [];
  const calls = [];
  const storage = new Map();
  const hooks = {
      __esModule: true,
      default: React,
      useId: () => 'test-room-search',
      useMemo: compute => compute(),
      // Dlouhý stisk karty (nabídka rychlých akcí) používá ref, callback i efekt.
      useRef: value => ({ current: value }),
      useCallback: fn => fn,
      useEffect: () => {},
      useState: () => {
        const index = stateIndex++;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; mutations.push([index, state[index]]); }];
      },
  };
  const QuickActions = compile(read('components/mobile/MobileRoomQuickActions.tsx'), 'MobileRoomQuickActions.tsx', {
    react: hooks,
    'lucide-react': Object.fromEntries(['AlertCircle', 'ArrowRight', 'Lock', 'Unlock'].map(name => [name, name])),
  }).default;
  const Component = compile(source, 'MobileRoomOverview.tsx', {
    react: hooks,
    'lucide-react': Object.fromEntries(['Bell', 'CalendarDays', 'ChevronRight', 'Clock3', 'Grip', 'LayoutGrid', 'Rows3', 'UsersRound'].map(name => [name, name])),
    '../../contexts/HospitalContext': { useHospital: () => ({ activeHospital: { hospital_short_name: 'Ukázkové zařízení' } }) },
    '../../contexts/AuthContext': { useAuth: () => ({ hasModuleAccess: () => true }) },
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: statuses }) },
    '../../contexts/RealtimeContext': { useRealtimeContext: () => ({ connected: true }) },
    '../../hooks/useSharedClock': { useNowMinuteMs: () => now },
    // Světlý i tmavý mobilní motiv vybírá barvu písma v barevném pruhu karty.
    // V testu držíme světlý motiv, na který jsou očekávané hodnoty psané.
    '../../hooks/useIsMobileDark': { useIsMobileDark: () => false },
    '../../hooks/useAppDesign': { useAppDesign: () => ({ design }) },
    './MobileRoomQuickActions': { __esModule: true, default: QuickActions },
    '../../lib/mobile-room-display': display,
    '../../lib/mobile-room-phase-visual': phaseVisual,
    '../../lib/acute-dashboard': acuteDashboard,
    '../room/AcuteDashboardBadge': { __esModule: true, default: AcuteDashboardBadge },
    './MobileRoomOrbit': { __esModule: true, default: MobileRoomOrbit },
    './MobileShell': { MobileHeader: () => null, MobileDesignSelector: () => null },
    './mobile-overview.css': {},
    './mobile-overview-orbit.css': {},
  }, {
    navigator: { vibrate: () => {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  }).default;
  const render = () => {
    stateIndex = 0;
    return Component({
    rooms, roomsLoaded: loaded, acuteByRoom,
    onSelectRoom: id => calls.push(['detail', id]),
    onEmergency: id => calls.push(['emergency', id]),
    onLock: id => calls.push(['lock', id]),
    onNavigate: id => calls.push(['navigate', id]),
    });
  };
  return { tree: render(), render, calls, mutations, storage, QuickActions };
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
  assert.match(source, /className=\{`mobile-room-overview md:hidden\$\{cliniq \? ' mobile-room-overview-orbit' : ''\}`\}/, 'The new overview is an optional Cliniq marker, not a replacement for the classic phone shell');
});

test('iOS cards retain common geometry and vertically stack identity and timing band', () => {
  const card = declarationsFor(css, '.mro-room');
  assert.equal(card.display, 'flex');
  assert.equal(card['flex-direction'], 'column');
  assert.equal(card['min-width'], '0');
  const open = declarationsFor(css, '.mro-room-open');
  assert.equal(open['flex-direction'], 'column');
  assert.equal(open.padding, 'var(--m-card-padding)');
  const title = declarationsFor(css, '.mro-room-identity strong');
  assert.match(title['font-size'], /^clamp\(11px, 7\.8cqw, var\(--m-card-title-size\)\)$/);
  assert.equal(title['font-weight'], 'var(--m-card-title-weight)');
  assert.equal(declarationsFor(shell, '.m-unified-card')['border-radius'], 'var(--m-card-radius)');
  assert.equal(declarationsFor(shell, '.m-unified-card').background, 'var(--m-card)');
  const timing = declarationsFor(css, '.mro-room-time');
  assert.equal(timing['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  const { tree } = renderOverview([room('pcho')]);
  const [renderedCard] = byClass(tree, 'mro-room');
  assert.ok(hasClass(renderedCard, 'm-unified-card'));
  assert.deepEqual(children(renderedCard).map(node => node.props.className), ['mro-room-open']);
  assert.deepEqual(children(children(renderedCard)[0]).map(node => node.props.className), ['mro-room-identity', 'mro-room-time']);
  const metrics = byClass(renderedCard, 'mro-room-metric');
  assert.deepEqual(metrics.map(metric => text(children(metric)[0])), ['Uplynulo', 'Odhad konce']);
});

test('classic stays a two-column grid, while optional Cliniq exposes persisted layout controls', () => {
  const longName = 'GYNEKOLOGIE HLAVNÍ – OPERAČNÍ SÁL';
  const classic = renderOverview([room('one', { name: longName })], { layout: 'rows' });
  assert.equal(byClass(classic.tree, 'mro-room-list')[0].props['data-layout'], 'grid');
  assert.equal(byClass(classic.tree, 'mro-layout-toggle').length, 0);
  const cliniq = renderOverview([room('one', { name: longName })], { design: 'cliniq', layout: 'rows' });
  assert.equal(byClass(cliniq.tree, 'mro-room-list')[0].props['data-layout'], 'rows');
  assert.equal(text(byClass(cliniq.tree, 'm-unified-card-title')[0]), longName);
  assert.equal(byClass(cliniq.tree, 'mro-room-metric').length, 0, 'Only optional Cliniq uses the new orbit footer instead of the classic timing band');
  assert.match(text(byClass(cliniq.tree, 'mro-orbit-end')[0]), /Odhad konce.*Uplynulo/);
  assert.equal(findAll(cliniq.tree, node => node.type === MobileRoomOrbit).length, 1);
  const toggle = byClass(cliniq.tree, 'mro-layout-toggle')[0];
  assert.equal(toggle.props.role, 'group');
  assert.equal(toggle.props['aria-label'], 'Rozložení sálů');
  const controls = children(toggle);
  assert.deepEqual(controls.map(control => [control.props['aria-label'], control.props['aria-pressed']]), [
    ['Dva sály vedle sebe', false], ['Podélné boxy', true],
  ]);
  controls[0].props.onClick();
  assert.equal(byClass(cliniq.render(), 'mro-room-list')[0].props['data-layout'], 'grid');
  assert.equal(cliniq.storage.get('or-room-card-layout'), 'grid');
  const cliniqCss = postcss.parse(read('components/mobile/mobile-overview-orbit.css'));
  const cliniqScope = 'html[data-app-design="cliniq"] .mobile-room-overview-orbit';
  const targets = declarationsFor(cliniqCss, `${cliniqScope} .mro-orbit-settings .mro-layout-toggle button`);
  assert.equal(targets['min-width'], '44px');
  assert.equal(targets['min-height'], '44px');
  assert.equal(declarationsFor(cliniqCss, `${cliniqScope} .mro-room-list[data-layout=rows]`)['grid-template-columns'], 'minmax(0, 1fr)');
});

test('acute badges remain passive inside the full-room target and full request text is announced', () => {
  const summary = { pendingRequests: [{ procedureName: 'Urgentní syntetický výkon', urgency: 'urgent', queuePosition: 3 }] };
  const { tree } = renderOverview([room('one')], { acuteByRoom: new Map([['one', summary]]) });
  const [open] = byClass(tree, 'mro-room-open');
  const [badge] = findAll(open, node => node.type === AcuteDashboardBadge);
  assert.equal(badge.props.summary, summary);
  assert.equal(badge.props.mobile, true);
  assert.match(open.props['aria-label'], /Čekající akutní požadavky: Pořadí 3: Urgentní syntetický výkon, Urgentní/);
  assert.equal(findAll(open, node => node.type === 'button').length, 1);
});

test('long room names remain complete and wrap without truncation or clamping', () => {
  const longName = 'GYNEKOLOGIE HLAVNÍ – SPECIALIZOVANÝ OPERAČNÍ SÁL ČÍSLO 123';
  const { tree } = renderOverview([room('long', { name: longName })]);
  const [title] = byClass(tree, 'm-unified-card-title');
  assert.equal(text(title), longName);
  assert.equal(declarationsFor(css, '.mro-room-identity strong')['overflow-wrap'], 'normal');
  assert.equal(declarationsFor(css, '.mro-room-identity strong').hyphens, 'none');
  for (const selector of ['.mro-room', '.mro-room-open', '.mro-room-identity', '.mro-room-identity strong']) {
    const values = declarationsFor(css, selector);
    for (const prop of ['max-height', 'height', 'line-clamp', '-webkit-line-clamp', 'text-overflow']) {
      assert.equal(values[prop], undefined, `${selector} must not truncate via ${prop}`);
    }
    assert.notEqual(values['white-space'], 'nowrap', `${selector} must allow name wrapping`);
  }
  assert.doesNotMatch(title.props.className, /truncate|line-clamp/);
});

test('one full-card target keeps keyboard quick actions and each callback bound to its room ID', () => {
  const { tree, render, calls, mutations, QuickActions } = renderOverview([room('first'), room('second', { name: 'PCHO sál č. 2' })]);
  const renderedCards = byClass(tree, 'mro-room');
  for (const [index, renderedCard] of renderedCards.entries()) {
    const expectedId = index === 0 ? 'first' : 'second';
    const [open] = byClass(renderedCard, 'mro-room-open');
    assert.equal(open.type, 'button');
    assert.equal(open.props.type, 'button');
    assert.ok(open.props['aria-label'].includes(index === 0 ? 'Sál first' : 'PCHO sál č. 2'));
    assert.match(open.props['aria-label'], /Podržením nebo klávesou nabídky/);
    assert.equal(findAll(open, node => node.type === 'button').length, 1, 'No nested action button');
    assert.equal(findAll(renderedCard, node => node.type === 'button').length, 1);
    open.props.onClick();
    let prevented = 0;
    open.props.onKeyDown({ key: index === 0 ? 'ContextMenu' : 'F10', shiftKey: index === 1, preventDefault: () => prevented++ });
    assert.equal(prevented, 1);
    assert.deepEqual(mutations.at(-1), [2, expectedId]);
    assert.deepEqual(calls.slice(index * 4), [['detail', expectedId]], 'Opening quick actions must not trigger a clinical action');
    const [quickActions] = findAll(render(), node => node.type === QuickActions);
    assert.equal(quickActions.props.room.id, expectedId);
    const dialog = QuickActions(quickActions.props);
    assert.equal(byClass(dialog, 'mrq-dialog')[0].props.role, 'dialog');
    assert.equal(byClass(dialog, 'mrq-dialog')[0].props['aria-modal'], 'true');
    const actions = byClass(dialog, 'mrq-box');
    assert.deepEqual(actions.map(text), ['Stav nouze', 'Uzamknout sál']);
    actions.forEach(action => action.props.onClick());
    byClass(dialog, 'mrq-detail')[0].props.onClick();
    assert.deepEqual(calls.slice(index * 4), [['detail', expectedId], ['emergency', expectedId], ['lock', expectedId], ['detail', expectedId]]);
  }
  const actionStyle = declarationsFor(css, '.mrq-box');
  assert.ok(parseFloat(actionStyle['min-height']) >= 44);
  assert.equal(actionStyle['min-height'], '124px');
  const detailStyle = declarationsFor(css, '.mrq-detail');
  assert.ok(parseFloat(detailStyle['min-height']) >= 44);
  assert.ok(parseFloat(declarationsFor(css, '.mrq-close')['min-height']) >= 44);
  assert.equal(declarationsFor(css, '.mro-room-open').width, '100%');
  assert.match(source, /const LONG_PRESS_MS = 500;/);
  assert.match(source, /onPointerDown=\{event => startPress\(room\.id, event\)\}/);
  assert.match(source, /onPointerCancel=\{cancelPress\}/);
});

test('semantic phase colors and real elapsed/end times survive the layout change', () => {
  const estimate = new Date(2026, 8, 17, 12, 30).toISOString();
  const overview = renderOverview([
    room('ready'),
    room('active', { currentStepIndex: 1, operationStartedAt: '2026-09-17T08:36:00Z', estimatedEndTime: estimate }),
    room('paused', { currentStepIndex: 1, isPaused: true }),
    room('locked', { currentStepIndex: 1, isLocked: true }),
    room('emergency', { currentStepIndex: 1, isEmergency: true }),
  ]);
  const { tree, render, QuickActions } = overview;
  const cards = byClass(tree, 'mro-room');
  assert.deepEqual(cards.map(card => byClass(card, 'mro-status-dot')[0].props.style.background), ['#00D6C4', '#B51A68', '#20ACD5', '#B88512', '#E5484D']);
  const values = card => byClass(card, 'mro-room-metric').map(metric => text(children(metric)[1]));
  assert.deepEqual(values(cards[0]), ['—', '—']);
  assert.deepEqual(values(cards[1]), ['01:24', '12:30']);
  assert.equal(text(byClass(cards[2], 'mro-phase-name')[0]), 'Pauza');
  assert.equal(declarationsFor(css, '.mro-phase-label').color, 'var(--m-text)');
  assert.equal(cards[4].props['data-emergency'], true);
  for (const [index, labels] of [[3, ['Stav nouze', 'Odemknout sál']], [4, ['Zrušit stav nouze', 'Uzamknout sál']]]) {
    byClass(cards[index], 'mro-room-open')[0].props.onKeyDown({ key: 'ContextMenu', preventDefault() {} });
    const [actions] = findAll(render(), node => node.type === QuickActions);
    assert.deepEqual(byClass(QuickActions(actions.props), 'mrq-box').map(text), labels);
  }
});

test('loading, empty facilities and empty filters keep informative states outside the grid', () => {
  const loading = renderOverview([], { loaded: false }).tree;
  assert.equal(byClass(loading, 'mro-room-list').length, 0);
  assert.equal(text(byClass(loading, 'mro-empty')[0]), 'Načítám operační sály…');
  assert.equal(byClass(loading, 'mro-empty')[0].props.role, 'status');
  const empty = renderOverview([]).tree;
  assert.equal(byClass(empty, 'mro-room').length, 0);
  assert.match(text(byClass(empty, 'mro-empty')[0]), /Zatím nejsou k dispozici žádné sály/);
  assert.equal(findAll(byClass(empty, 'mro-empty')[0], node => node.type === 'button').length, 0);
  const filtered = renderOverview([room('pcho')], { filter: 'active' });
  assert.equal(byClass(filtered.tree, 'mro-room').length, 0);
  const [message] = byClass(filtered.tree, 'mro-empty');
  assert.match(text(message), /Žádný sál neodpovídá filtru/);
  findAll(message, node => node.type === 'button')[0].props.onClick();
  assert.deepEqual(filtered.mutations, [[1, 'all']]);
  assert.equal(declarationsFor(css, '.mro-room-list:empty').display, 'none');
});
