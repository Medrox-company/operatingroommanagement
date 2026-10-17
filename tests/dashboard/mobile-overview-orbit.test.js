import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

// Actual overview + pure presentation helpers, with only local hook, timer,
// context and storage adapters. No real app, clinical write, network or auth
// session is mounted. Browser rendering/focus remain separate QA work.
const require = createRequire(import.meta.url);
const compilerOptions = { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true };
const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { fileName: path, compilerOptions }).outputText;
function pureModule(path, imports = {}) {
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', compile(path))(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected pure overview-helper import: ${name}`);
    return imports[name];
  }, mod.exports, mod);
  return mod.exports;
}
const display = pureModule('../../lib/mobile-room-display.ts');
const phaseVisual = pureModule('../../lib/mobile-room-phase-visual.ts');
const acute = pureModule('../../lib/acute-dashboard.ts', { './acute-requests': { ACUTE_URGENCY_LABELS: { emergent: 'Emergentní', urgent: 'Urgentní', expedited: 'Časný' } } });
const outputText = compile('../../components/mobile/MobileRoomOverview.tsx');
const orbitStyles = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-overview-orbit.css', import.meta.url), 'utf8'));
const now = Date.UTC(2026, 9, 15, 10, 30);
const statuses = [
  { id: 'ready', name: 'Sál připraven', title: 'Připravený sál', color: '#10B981' },
  { id: 'preparation', name: 'Příprava sálu', title: 'Příprava sálu', color: '#F2B134' },
  { id: 'arrival', name: 'Příjezd na sál', title: 'Příjezd pacienta', color: '#5B8DEF' },
  { id: 'surgery', name: 'Chirurgický výkon', title: 'Operační výkon', color: '#B51A68', accent_color: '#DC5CA4' },
  { id: 'cleaning', name: 'Úklid sálu', title: 'Úklid sálu', color: '#E78C2B' },
];
const room = (id, currentStepIndex, override = {}) => ({
  id, name: `Skutečný sál ${id}`, department: 'Centrální operační blok', currentStepIndex,
  phaseStartedAt: new Date(now - 20 * 60_000).toISOString(),
  operationStartedAt: new Date(now - 75 * 60_000).toISOString(),
  estimatedEndTime: new Date(now + 45 * 60_000).toISOString(),
  staff: { doctor: {}, nurse: {} }, ...override,
});
const rooms = [room('zeta', 3, { staff: { doctor: { id: 'doctor', name: 'MUDr. Test' }, nurse: { id: 'nurse', name: 'Sestra Test' } } }),
  room('alfa', 0), room('delta', 4), room('beta', 1), room('omega', 2), room('gama', 3), room('eta', 0)];

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  const slots = node.type === 'mobile-header' ? [node.props.children, node.props.right, node.props.secondary] : node.props.children;
  return [...(predicate(node) ? [node] : []), ...elements(slots, predicate)];
}
function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!React.isValidElement(node)) return '';
  return node.type === 'mobile-header'
    ? [node.props.kicker, node.props.title, node.props.description, content(node.props.right), content(node.props.secondary)].join('')
    : content(node.props.children);
}
const byClass = (node, value) => elements(node, element => element.props.className?.split(' ').includes(value));
function declarationsFor(selector) {
  const values = {};
  orbitStyles.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

function harness(overrides = {}, context = {}) {
  const state = [], refs = [], effects = [], timers = [], vibrations = [], storageWrites = [], calls = [];
  let stateCursor = 0, refCursor = 0, time = 0;
  const storage = new Map(Object.entries(context.storage || {}));
  const windowAdapter = {
    setTimeout(callback, delay) {
      const entry = { id: timers.length + 1, callback, due: time + delay, delay, canceled: false, fired: false };
      timers.push(entry);
      return entry.id;
    },
    clearTimeout(id) { const entry = timers.find(timer => timer.id === id); if (entry) entry.canceled = true; },
  };
  const storageAdapter = {
    getItem(key) { if (context.storageUnavailable) throw new Error('Unavailable local storage'); return storage.get(key) ?? null; },
    setItem(key, value) { if (context.storageUnavailable) throw new Error('Unavailable local storage'); storage.set(key, value); storageWrites.push([key, value]); },
  };
  const imports = {
    react: { ...React,
      useMemo: compute => compute(), useCallback: callback => callback,
      useEffect: (effect, dependencies) => effects.push({ effect, dependencies }),
      useState(initial) {
        const index = stateCursor++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useRef(initial) { const index = refCursor++; if (!(index in refs)) refs[index] = { current: initial }; return refs[index]; },
    },
    'lucide-react': require('lucide-react'),
    '../../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: context.hospitalId ?? 'offline-hospital', activeHospital: context.hospital ?? { id: context.hospitalId ?? 'offline-hospital', hospital_short_name: 'Testovací nemocnice' } }) },
    '../../contexts/AuthContext': { useAuth: () => ({ hasModuleAccess: module => (context.permissions ?? ['alerts']).includes(module) }) },
    '../../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: context.statuses ?? statuses }) },
    '../../contexts/RealtimeContext': { useRealtimeContext: () => ({ connected: context.connected ?? true }) },
    '../../hooks/useSharedClock': { useNowMinuteMs: () => now },
    '../../hooks/useIsMobileDark': { useIsMobileDark: () => context.dark ?? true },
    '../../hooks/useAppDesign': { useAppDesign: () => ({ design: context.design ?? 'cliniq', chooseDesign: value => { context.design = value; } }) },
    '../../lib/mobile-room-display': display,
    '../../lib/mobile-room-phase-visual': phaseVisual,
    '../../lib/acute-dashboard': acute,
    './MobileShell': { MobileHeader: 'mobile-header', MobileDesignSelector: 'design-selector' },
    './MobileRoomQuickActions': { __esModule: true, default: 'quick-actions' },
    './MobileRoomOrbit': { __esModule: true, default: 'room-orbit', MobileRoomOrbit: 'room-orbit' },
    '../room/AcuteDashboardBadge': { __esModule: true, default: 'acute-badge' },
    './mobile-overview.css': {}, './mobile-overview-orbit.css': {},
  };
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', 'window', 'localStorage', 'navigator', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected overview dependency: ${name}`);
    return imports[name];
  }, mod.exports, mod, windowAdapter, storageAdapter, { vibrate: duration => vibrations.push(duration) });
  const props = { rooms, roomsLoaded: true,
    onSelectRoom: id => calls.push(['select', id]), onEmergency: id => calls.push(['emergency', id]),
    onLock: id => calls.push(['lock', id]), onNavigate: view => calls.push(['navigate', view]), ...overrides };
  return {
    props, calls, effects, timers, vibrations, storage, storageWrites,
    advance(milliseconds) {
      const until = time + milliseconds;
      while (true) {
        const next = timers.filter(timer => !timer.canceled && !timer.fired && timer.due <= until).sort((left, right) => left.due - right.due)[0];
        if (!next) break;
        time = next.due;
        next.fired = true;
        next.callback();
      }
      time = until;
    },
    render() {
      stateCursor = refCursor = 0;
      effects.length = 0;
      const tree = mod.exports.default(props);
      return {
        tree,
        byClass: name => byClass(tree, name),
        byType: type => elements(tree, element => element.type === type),
        button(name) {
          const button = elements(tree, element => element.type === 'button' && (element.props['aria-label'] === name || content(element) === name))[0];
          assert.ok(button, `Missing overview control: ${name}`);
          return button;
        },
      };
    },
  };
}

test('classic design retains its original header, full room list and original filter labels', () => {
  const app = harness({}, { design: 'classic' });
  const view = app.render();
  const [header] = view.byType('mobile-header');
  assert.equal(header.props.title, 'Přehled sálů');
  assert.equal(header.props.description, 'Testovací nemocnice');
  assert.deepEqual(view.byClass('mro-room').map(card => content(byClass(card, 'm-unified-card-title'))), rooms.map(room => room.name));
  assert.deepEqual(elements(view.byClass('mro-filters'), element => element.type === 'button').map(content), ['Všechny', 'Aktivní', 'Připravené']);
  assert.equal(view.byClass('mro-room-list')[0].props['data-layout'], 'grid');
  assert.equal(view.byType('room-orbit').length, 0);
  assert.deepEqual(app.calls, []);
});

test('room taps and 500ms long-press keep the original detail and quick-action behavior', () => {
  const app = harness();
  let view = app.render();
  view.byClass('mro-room-open')[0].props.onClick();
  assert.deepEqual(app.calls, [['select', rooms[0].id]]);
  app.calls.length = 0;
  view.byClass('mro-room-open')[0].props.onPointerDown({ clientX: 100, clientY: 100 });
  app.advance(499);
  assert.equal(app.render().byType('quick-actions').length, 0);
  app.advance(1);
  view = app.render();
  assert.equal(view.byType('quick-actions').length, 1);
  assert.equal(view.byType('quick-actions')[0].props.room, rooms[0]);
  assert.deepEqual(app.vibrations, [18]);
  assert.deepEqual(app.calls, [], 'Holding must open a menu rather than mutate emergency/lock state');
  view.byClass('mro-room-open')[0].props.onClick();
  assert.deepEqual(app.calls, [], 'Suppress the trailing click after a long press');
  view.byClass('mro-room-open')[0].props.onClick();
  assert.deepEqual(app.calls, [['select', rooms[0].id]]);
});

test('scroll movement, pointer release, cancellation and leave abort a pending long press', () => {
  for (const abort of [
    button => button.props.onPointerMove({ clientX: 111, clientY: 100 }),
    button => button.props.onPointerMove({ clientX: 100, clientY: 111 }),
    button => button.props.onPointerUp(),
    button => button.props.onPointerCancel(),
    button => button.props.onPointerLeave(),
  ]) {
    const app = harness();
    const button = app.render().byClass('mro-room-open')[0];
    button.props.onPointerDown({ clientX: 100, clientY: 100 });
    abort(button);
    app.advance(1000);
    assert.equal(app.render().byType('quick-actions').length, 0);
    assert.deepEqual(app.calls, []);
  }
});

test('context-menu and keyboard actions preserve intentional quick-action callbacks only', () => {
  for (const invocation of ['context', 'keyboard']) {
    const app = harness();
    const button = app.render().byClass('mro-room-open')[0];
    let prevented = 0;
    if (invocation === 'context') button.props.onContextMenu({ detail: 1, preventDefault: () => { prevented += 1; } });
    else button.props.onKeyDown({ key: 'F10', shiftKey: true, preventDefault: () => { prevented += 1; } });
    assert.equal(prevented, 1);
    const quick = app.render().byType('quick-actions')[0];
    assert.ok(quick);
    assert.deepEqual(app.calls, [], 'Opening the menu must not invoke a clinical mutation');
    quick.props.onEmergency();
    quick.props.onLock();
    quick.props.onOpenDetail();
    assert.deepEqual(app.calls, [['emergency', rooms[0].id], ['lock', rooms[0].id], ['select', rooms[0].id]]);
    quick.props.onClose();
    assert.equal(app.render().byType('quick-actions').length, 0);
  }
});

test('quick actions resolve the current room object instead of retaining stale refreshed data', () => {
  const app = harness();
  app.render().byClass('mro-room-open')[0].props.onKeyDown({ key: 'ContextMenu', preventDefault() {} });
  const updated = { ...rooms[0], name: 'Aktualizovaný skutečný sál', currentStepIndex: 4 };
  app.props.rooms = [updated, ...rooms.slice(1)];
  const quick = app.render().byType('quick-actions')[0];
  assert.equal(quick.props.room, updated);
  assert.equal(quick.props.phaseTitle, display.mobileRoomPhase(updated, statuses).title);
  assert.equal(quick.props.phaseColor, display.mobileRoomPhase(updated, statuses).color);
  app.props.rooms = rooms.slice(1);
  assert.equal(app.render().byType('quick-actions').length, 0, 'A removed room must not leave a mutation menu bound to old data');
});

test('alerts navigation remains permission-gated and unread indicators reflect real room notices', () => {
  for (const design of ['classic', 'cliniq']) {
    for (const authorized of [true, false]) {
      const app = harness({ rooms: [room('notice-room', 1, { noticeMessage: 'Skutečná zpráva' })] }, { design, permissions: authorized ? ['alerts'] : [] });
      const view = app.render();
      const buttons = elements(view.tree, element => element.type === 'button' && element.props['aria-label']?.startsWith('Upozornění'));
      assert.equal(buttons.length, authorized ? 1 : 0);
      if (authorized) {
        assert.equal(buttons[0].props['aria-label'], 'Upozornění – nové zprávy');
        assert.equal(view.byClass('mro-notice-dot').length, 1);
        assert.deepEqual(app.calls, []);
        buttons[0].props.onClick();
        assert.deepEqual(app.calls, [['navigate', 'alerts']]);
      }
    }
    assert.equal(harness({ onNavigate: undefined }, { design }).render().byClass('mro-notice-dot').length, 0);
    const quiet = harness({}, { design }).render();
    assert.equal(quiet.byClass('mro-notice-dot').length, 0, 'Do not fabricate an unread notification to match the reference');
  }
});

test('loading and empty data never produce synthetic room cards', () => {
  for (const design of ['classic', 'cliniq']) {
    const loading = harness({ roomsLoaded: false }, { design }).render();
    assert.equal(loading.byClass('mro-room-open').length, 0);
    assert.equal(loading.byType('room-orbit').length, 0);
    assert.match(content(loading.byClass('mro-empty')), /Načítám operační sály/);
    if (design === 'cliniq') {
      assert.match(content(loading.byClass('mro-orbit-header')), /— sálů/);
      assert.equal(loading.byClass('mro-orbit-statuses')[0].props['aria-busy'], true);
      assert.equal(elements(loading.byClass('mro-orbit-statuses'), element => element.type === 'strong').length, 0);
    }
    const empty = harness({ rooms: [] }, { design }).render();
    assert.equal(empty.byClass('mro-room-open').length, 0);
    assert.equal(empty.byType('room-orbit').length, 0);
    assert.match(content(empty.byClass('mro-empty')), /Zatím nejsou k dispozici žádné sály/);
  }
});

test('cliniq header reports actual connection and room data with a configured status-count legend', () => {
  const snapshot = JSON.stringify(rooms);
  for (const connected of [true, false]) {
    const view = harness({}, { connected }).render();
    assert.ok(view.tree.props.className.includes('mobile-room-overview-orbit'));
    assert.equal(view.byType('mobile-header').length, 0);
    const [header] = view.byClass('mro-orbit-header');
    assert.ok(content(header).includes('Přehled sálů'));
    assert.ok(content(header).includes(`${rooms.length} sálů`));
    assert.equal(content(view.byClass('mro-orbit-live')), connected ? 'Živě' : 'Připojuji…');
    assert.equal(elements(header, element => element.type === 'p' && Object.hasOwn(element.props, 'data-connected'))[0].props['data-connected'], connected);
    const [legend] = view.byClass('mro-orbit-statuses');
    assert.equal(legend.props['aria-label'], 'Souhrn sálů');
    assert.equal(legend.props['aria-busy'], false);
    const entries = elements(legend, element => element.props.style?.['--room-phase-color']);
    assert.equal(entries.length, statuses.length);
    assert.deepEqual(entries.map(entry => Number(content(elements(entry, element => element.type === 'strong')))), [2, 1, 1, 2, 1]);
    assert.deepEqual(entries.map(entry => entry.props.style['--room-phase-color']), statuses.map(status => phaseVisual.mobileRoomPhaseVisual(status).color));
    entries.forEach((entry, index) => assert.ok(content(entry).includes(statuses[index].title)));
    assert.equal(entries.reduce((sum, entry) => sum + Number(content(elements(entry, element => element.type === 'strong'))), 0), rooms.length, 'Do not reuse the reference mockup counts');
  }
  const unknown = harness({ rooms: [rooms[0], room('unconfigured', 99)] }).render();
  const entries = elements(unknown.byClass('mro-orbit-statuses'), element => element.props.style?.['--room-phase-color']);
  assert.equal(entries.length, 2, 'Unused phases must not create fabricated status counts');
  assert.equal(entries[1].props.style['--room-phase-color'], '#7890A8');
  assert.match(content(entries[1]), /1 Stav není k dispozici/);
  assert.equal(JSON.stringify(rooms), snapshot, 'Presentation must not sort or rewrite source room data');
});

test('cliniq shows every authorized room immediately and filters without truncating or reordering', () => {
  const app = harness();
  let view = app.render();
  const ids = view => view.byType('room-orbit').map(orbit => orbit.props.room.id);
  assert.deepEqual(ids(view), rooms.map(room => room.id));
  assert.deepEqual(elements(view.byClass('mro-filters'), element => element.type === 'button').map(content), ['Všechny', 'Probíhá', 'Připraveno']);
  assert.equal(view.byClass('mro-orbit-show-all').length, 0, 'Do not make the fifth room depend on a disclosure action');
  view.button('Probíhá').props.onClick();
  view = app.render();
  const active = display.filterMobileRooms(rooms, statuses, 'active', '');
  assert.deepEqual(ids(view), active.map(room => room.id));
  assert.equal(view.byClass('mro-orbit-show-all').length, 0);
  view.button('Připraveno').props.onClick();
  view = app.render();
  assert.deepEqual(ids(view), display.filterMobileRooms(rooms, statuses, 'ready', '').map(room => room.id));
  assert.equal(view.byClass('mro-orbit-show-all').length, 0);
  view.button('Všechny').props.onClick();
  assert.deepEqual(ids(app.render()), rooms.map(room => room.id));
  assert.deepEqual(app.calls, [], 'Filtering must not write clinical state');
});

test('all rooms and emergencies remain visible in configured order without a preview toggle', () => {
  const configured = rooms.map((room, index) => index === 4 || index === 6 ? { ...room, isEmergency: true } : room);
  const app = harness({ rooms: configured });
  const view = app.render();
  assert.deepEqual(view.byType('room-orbit').map(orbit => orbit.props.room.id), configured.map(room => room.id));
  assert.equal(view.byClass('mro-room').filter(card => card.props['data-emergency']).length, 2);
  assert.ok(content(view.byClass('mro-orbit-header')).includes(`${configured.length} sálů`));
  assert.equal(view.byClass('mro-orbit-show-all').length, 0);
  assert.deepEqual(app.calls, []);
  const allVisible = harness({ rooms: [...rooms.slice(0, 4), { ...rooms[4], isEmergency: true }] }).render();
  assert.equal(allVisible.byType('room-orbit').length, 5);
  assert.equal(allVisible.byClass('mro-orbit-show-all').length, 0);
});

test('refreshed hospital room data appears in full without a preview state or extra app effects', () => {
  const context = { hospitalId: 'hospital-a' };
  const app = harness({}, context);
  assert.equal(app.render().byType('room-orbit').length, rooms.length);
  context.hospitalId = 'hospital-b';
  app.props.rooms = [rooms[5], rooms[2], rooms[4], rooms[1], rooms[0]];
  const view = app.render();
  assert.deepEqual(view.byType('room-orbit').map(orbit => orbit.props.room.id), app.props.rooms.map(room => room.id));
  assert.equal(view.byClass('mro-orbit-show-all').length, 0);
  assert.deepEqual(app.calls, []);
});

test('cliniq cards and passive orbit props preserve real phases separately from operational warnings', () => {
  for (const override of [{}, { isPaused: true }, { isEmergency: true }, { isLocked: true }, { isEmergency: true, isPaused: true, isLocked: true }]) {
    const actualRoom = room('phase-test', 3, override);
    const expected = display.mobileRoomPhase(actualRoom, statuses);
    const view = harness({ rooms: [actualRoom] }).render();
    const [card] = view.byClass('mro-room');
    assert.equal(card.props.style['--room-phase-color'], '#DC5CA4', 'Use the configured workflow accent rather than the pause, lock or emergency color');
    assert.equal(card.props['data-emergency'], actualRoom.isEmergency || undefined);
    assert.equal(card.props['data-locked'], actualRoom.isLocked || undefined);
    const [orbit] = view.byType('room-orbit');
    assert.equal(orbit.props.room, actualRoom);
    assert.equal(orbit.props.statuses, statuses);
    assert.equal(orbit.props.title, expected.title);
    assert.ok(view.byClass('mro-room-open')[0].props['aria-label'].includes(expected.title));
    const classic = harness({ rooms: [actualRoom] }, { design: 'classic' }).render();
    assert.equal(classic.byClass('mro-room')[0].props.style['--room-phase-color'], expected.color, 'Do not change original-design phase and warning color semantics');
    assert.equal(classic.byType('room-orbit').length, 0);
  }
  const unknown = harness({ rooms: [room('unknown', 99)] }).render();
  assert.equal(unknown.byClass('mro-room')[0].props.style['--room-phase-color'], '#7890A8');
});

test('card surface follows current phase and temporary modes without changing clinical state', () => {
  const cases = [
    [{}, '#DC5CA4'],
    [{ isPaused: true }, 'var(--color-info, #5B8DEF)'],
    [{ isEnhancedHygiene: true }, 'var(--color-warning, #FFB020)'],
    [{ isEnhancedHygiene: true, isPaused: true }, 'var(--color-warning, #FFB020)'],
    [{ patientCalledAt: '2026-10-15T08:00:00Z' }, '#DC5CA4'],
    [{ patientCalledAt: '2026-10-15T08:00:00Z', isEnhancedHygiene: true }, 'var(--color-warning, #FFB020)'],
    [{ patientCalledAt: '2026-10-15T08:00:00Z', patientArrivedAt: '2026-10-15T08:05:00Z' }, '#DC5CA4'],
    [{ isEmergency: true, isEnhancedHygiene: true }, '#E5484D'],
  ];
  for (const [flags, color] of cases) {
    const app = harness({ rooms: [room('surface', 3, flags)] });
    assert.equal(app.render().byClass('mro-room')[0].props.style['--room-surface-color'], color);
    assert.deepEqual(app.calls, []);
    app.props.rooms = [room('surface', 3)];
    assert.equal(app.render().byClass('mro-room')[0].props.style['--room-surface-color'], '#DC5CA4');
  }
});

test('the header disclosure retains view controls, appearance and persisted grid/rows settings', () => {
  const control = React.createElement('button', { type: 'button', 'aria-label': 'Původní přepínač zobrazení' }, 'Původní zobrazení');
  const app = harness({ viewControls: control }, { storage: { 'or-room-card-layout': 'rows' } });
  let view = app.render();
  const [tools] = view.byClass('mro-orbit-tools');
  assert.equal(tools.type, 'details');
  assert.equal(elements(tools, element => element.type === 'summary')[0].props['aria-label'], 'Nastavení přehledu sálů');
  const [settings] = view.byClass('mro-orbit-settings');
  assert.equal(elements(settings, element => element === control).length, 1);
  assert.equal(elements(settings, element => element.type === 'design-selector').length, 1);
  const storageEffect = app.effects.filter(entry => entry.dependencies?.length === 0 && entry.effect.toString().includes('or-room-card-layout'));
  assert.equal(storageEffect.length, 1);
  storageEffect[0].effect();
  view = app.render();
  assert.equal(view.byClass('mro-room-list')[0].props['data-layout'], 'rows');
  assert.equal(view.button('Podélné boxy').props['aria-pressed'], true);
  view.button('Dva sály vedle sebe').props.onClick();
  assert.equal(app.render().byClass('mro-room-list')[0].props['data-layout'], 'grid');
  assert.deepEqual(app.storageWrites.at(-1), ['or-room-card-layout', 'grid']);
  app.render().button('Podélné boxy').props.onClick();
  assert.deepEqual(app.storageWrites.at(-1), ['or-room-card-layout', 'rows']);
  let focused = 0;
  const nativeDetails = { open: true, querySelector: () => ({ focus: () => { focused += 1; } }) };
  tools.props.onKeyDown({ key: 'Escape', currentTarget: nativeDetails });
  assert.equal(nativeDetails.open, false);
  assert.equal(focused, 1, 'Keep the existing summary return-focus wiring; actual focus is browser QA');
  assert.deepEqual(app.calls, []);
  const unavailable = harness({}, { storageUnavailable: true });
  unavailable.render().button('Podélné boxy').props.onClick();
  assert.equal(unavailable.render().byClass('mro-room-list')[0].props['data-layout'], 'rows', 'Optional persistence failure must not break the visible layout choice');
});

test('card footer uses real estimated times, elapsed time and assigned-team completeness', () => {
  for (const [staff, count] of [
    [{ doctor: {}, nurse: {} }, 0],
    [{ doctor: { name: '  MUDr. Test ' }, nurse: { name: '  ' } }, 1],
    [{ doctor: { name: 'Lékař' }, nurse: { name: 'Sestra' } }, 2],
  ]) {
    const actualRoom = room('team-test', 3, { staff });
    const view = harness({ rooms: [actualRoom] }).render();
    const [end] = view.byClass('mro-orbit-end');
    assert.ok(content(end).includes(display.mobileEndTime(actualRoom.estimatedEndTime)));
    assert.ok(content(end).includes('Uplynulo 01:15'));
    const [team] = view.byClass('mro-orbit-team');
    assert.equal(team.props['aria-label'], `Přiřazený tým ${count} ze 2 rolí`);
    assert.ok(view.byClass('mro-room-open')[0].props['aria-label'].includes(`Přiřazený tým ${count} ze 2 rolí.`), 'The accessible full-card name must announce real team completeness, not only its decorative footer');
    const classic = harness({ rooms: [actualRoom] }, { design: 'classic' }).render();
    assert.doesNotMatch(classic.byClass('mro-room-open')[0].props['aria-label'], /Přiřazený tým/, 'Only the optional orbit adds team completeness to the original card announcement');
    assert.equal(content(elements(team, element => element.type === 'strong')), count === 2 ? 'kompletní' : `${count} / 2`);
  }
  const missing = harness({ rooms: [room('missing', 3, { staff: undefined, operationStartedAt: undefined, phaseStartedAt: undefined, estimatedEndTime: undefined })] }).render();
  assert.match(content(missing.byClass('mro-orbit-end')), /—/);
  assert.equal(content(elements(missing.byClass('mro-orbit-team'), element => element.type === 'strong')), '0 / 2');
  assert.doesNotMatch(content(missing.byClass('mro-orbit-team')), /kompletní/);
});

test('patient, hygiene and authorized acute-summary information remains on the real room card', () => {
  const actualRoom = room('clinical-badges', 3, { isEnhancedHygiene: true, patientCalledAt: new Date(now).toISOString() });
  const summary = { pendingRequests: [{ procedureName: 'Ukázkový skutečný požadavek', queuePosition: 3, urgency: 'urgent' }] };
  const app = harness({ rooms: [actualRoom], acuteByRoom: new Map([[actualRoom.id, summary]]) });
  let view = app.render();
  assert.match(content(view.byClass('mro-room')), /Hygienický režim/);
  assert.match(content(view.byClass('mro-room')), /Pacient přivolán/);
  assert.equal(view.byType('acute-badge')[0].props.summary, summary);
  assert.equal(view.byType('acute-badge')[0].props.mobile, true);
  assert.ok(view.byClass('mro-room-open')[0].props['aria-label'].includes('Ukázkový skutečný požadavek'));
  app.props.rooms = [{ ...actualRoom, patientArrivedAt: new Date(now).toISOString() }];
  view = app.render();
  assert.match(content(view.byClass('mro-room')), /Pacient na sále/);
  assert.doesNotMatch(content(view.byClass('mro-room')), /Pacient přivolán/);
  assert.deepEqual(app.calls, []);
});

test('overview appearance and dock overrides are limited to the optional Cliniq phone surface', () => {
  let count = 0;
  orbitStyles.walkRules(rule => {
    count += 1;
    assert.ok(rule.selectors.every(selector => selector.startsWith('html[data-app-design="cliniq"]') && selector.includes('.mobile-room-overview-orbit')), `${rule.selector} must not change classic, desktop or another module`);
    const media = [];
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && parent.name === 'media') media.push(parent.params);
    }
    assert.ok(media.some(value => {
      const maximum = value.match(/max-width:\s*(\d+)px/);
      return maximum && Number(maximum[1]) <= 767;
    }), `${rule.selector} must remain phone-only`);
  });
  assert.ok(count > 30, 'Inspect the real header, cards, disclosure, filter and dock rules');
  const shell = declarationsFor('html[data-app-design="cliniq"] .dashboard-module:has(.mobile-room-overview-orbit)');
  assert.match(shell.background, /url\('\/images\/mobile-orbit-background-v3\.png'\)/);
  assert.equal(shell['background-size'], '100% 100%, 100% auto');
  assert.match(shell.background, /var\(--mro-orbit-floor\) calc\(var\(--mro-orbit-art-height\) - 24px\)/, 'Retain the seamless continuation of the real detail backdrop');
  assert.match(shell.padding, /safe-area-inset-bottom/);
});

test('overview controls, wrapping and short-screen disclosure preserve access to real information', () => {
  const scope = 'html[data-app-design="cliniq"] .mobile-room-overview-orbit';
  for (const selector of [
    `${scope} .mro-orbit-tools > summary`, `${scope} .mro-orbit-header > .mro-icon-button`,
    `${scope} .mro-filters button`, `${scope} .mro-orbit-settings .mro-layout-toggle button`,
  ]) {
    const target = declarationsFor(selector);
    assert.ok(parseFloat(target['min-width']) >= 44, `${selector} needs a full touch width`);
    assert.ok(parseFloat(target['min-height']) >= 44, `${selector} needs a full touch height`);
  }
  assert.equal(declarationsFor(`${scope} .mro-orbit-show-all`)['min-height'], undefined, 'Remove the obsolete preview-toggle styling along with the control');
  for (const selector of [`${scope} .mro-orbit-heading h1`, `${scope} .mro-room .mro-room-identity strong`]) {
    const text = declarationsFor(selector);
    assert.equal(text['word-break'], 'normal');
    assert.equal(text['overflow-wrap'], 'normal');
    assert.notEqual(text.overflow, 'hidden');
    assert.notEqual(text['text-overflow'], 'ellipsis');
    assert.equal(text['-webkit-line-clamp'], undefined);
  }
  const title = declarationsFor(`${scope} .mro-room .mro-room-identity strong`);
  for (const property of ['height', 'max-height', 'line-clamp', '-webkit-line-clamp']) {
    assert.equal(title[property], undefined, 'Keep complete multi-line room names rather than fixing or clipping title height');
  }
  const identity = declarationsFor(`${scope} .mro-room .mro-room-identity`);
  const kicker = declarationsFor(`${scope} .mro-room .mro-room-identity .mro-orbit-room-kicker`);
  const chevron = declarationsFor(`${scope} .mro-room .mro-room-chevron`);
  assert.equal(identity['padding-right'], '0', 'Long titles retain the full card width below the decorative chevron');
  assert.equal(kicker['min-height'], '22px');
  assert.equal(chevron.top, '6px');
  assert.equal(chevron.width, '26px');
  assert.equal(chevron.height, '26px');
  const cardPaddings = [];
  orbitStyles.walkRules(rule => {
    if (rule.selectors.includes(`${scope} .mro-room .mro-room-open`)) rule.walkDecls('padding', declaration => cardPaddings.push(parseFloat(declaration.value)));
  });
  assert.ok(Math.min(...cardPaddings) + parseFloat(kicker['min-height']) + parseFloat(identity.gap) >= parseFloat(chevron.top) + parseFloat(chevron.height), 'Even the narrow-phone title starts below the decorative chevron');
  const longName = 'GYNEKOLOGIE HLAVNÍ – SPECIALIZOVANÝ OPERAČNÍ SÁL ČÍSLO 123';
  const named = harness({ rooms: [room('long-title', 3, { name: longName })] }).render();
  assert.equal(content(named.byClass('m-unified-card-title')), longName);
  const settings = declarationsFor(`${scope} .mro-orbit-settings`);
  assert.equal(settings['overflow-y'], 'auto');
  assert.match(settings['max-height'], /100svh/);
  assert.match(settings.width, /100vw - 34px/);
  const compactRowsIcons = `${scope} .mro-room-list[data-layout=rows] .mro-orbit-card-footer svg`;
  const compactRules = [];
  orbitStyles.walkRules(rule => {
    if (rule.selectors.includes(compactRowsIcons)) compactRules.push(rule);
  });
  assert.equal(compactRules.length, 1, 'Narrow row cards need one bounded decorative-icon space allowance');
  const [compact] = compactRules;
  assert.deepEqual(compact.selectors, [compactRowsIcons], 'Only rows and footer SVGs may be hidden by the 399px correction');
  assert.equal(compact.parent.type, 'atrule');
  assert.equal(compact.parent.name, 'media');
  assert.match(compact.parent.params, /^\(max-width:\s*399px\)$/);
  assert.deepEqual(compact.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]), [['display', 'none']], 'Recover text width without hiding the end-time caption, team status or either value');
  const focus = declarationsFor(`${scope} :is(button, summary):focus-visible`);
  assert.equal(focus.outline, '2px solid #E5DDFF');
  let reducedMotion = false;
  orbitStyles.walkRules(rule => {
    if (!rule.selectors.includes(`${scope} *`)) return;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type !== 'atrule' || parent.name !== 'media' || !parent.params.includes('prefers-reduced-motion: reduce')) continue;
      reducedMotion = true;
      const values = {};
      rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
      assert.equal(values.animation, 'none');
      assert.equal(values.transition, 'none');
    }
  });
  assert.ok(reducedMotion);
});

test('each Cliniq card frosts its backdrop in both layouts without blurring or fading foreground information', () => {
  const scope = 'html[data-app-design="cliniq"] .mobile-room-overview-orbit';
  const selector = 'html[data-app-design="cliniq"] .mobile-room-overview.mobile-room-overview-orbit .mro-room.m-unified-card';
  const rules = [];
  orbitStyles.walkRules(rule => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  assert.equal(rules.length, 1, 'Apply one shared surface to grid and row cards, not a layout- or phase-specific treatment');
  assert.deepEqual(rules[0].selectors, [selector]);
  const card = declarationsFor(selector);
  assert.match(card.background, /^linear-gradient\(/);
  assert.doesNotMatch(card.background, /radial-gradient|room-surface-color/);
  const footer = declarationsFor(`${scope} .mro-orbit-card-footer`);
  assert.match(footer.background, /var\(--room-surface-color, transparent\)/);
  const alphas = [...card.background.matchAll(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([.\d]+)\s*\)/g)].map(match => Number(match[1]));
  assert.equal(alphas.length, 2, 'Retain the semiopaque navy/lavender gradient rather than an empty transparent card');
  assert.ok(alphas[0] >= .4 && alphas[0] < 1, 'The lighter surface must visibly veil its backdrop without becoming opaque');
  assert.ok(alphas[1] >= .7 && alphas[1] < 1, 'The darker surface must remain legible while retaining the frosted backdrop');
  assert.equal(card['-webkit-backdrop-filter'], 'blur(9px)');
  assert.equal(card['backdrop-filter'], 'blur(9px)');
  assert.deepEqual(rules[0].nodes.filter(node => node.type === 'decl' && ['-webkit-backdrop-filter', 'backdrop-filter'].includes(node.prop)).map(node => node.prop), ['-webkit-backdrop-filter', 'backdrop-filter'], 'Keep the standard blur last so the production CSS compiler retains Chromium support');
  orbitStyles.walkRules(rule => {
    if (!rule.selectors.some(value => value.startsWith(scope) && /(?:\.mro-room\b|\.mro-orbit(?:\b|-card-footer|-end|-team))/.test(value))) return;
    rule.walkDecls(declaration => {
      assert.notEqual(declaration.prop, 'filter', 'Backdrop frosting must not blur the card, phase icon, title, time or team');
      assert.notEqual(declaration.prop, '-webkit-filter');
      assert.notEqual(declaration.prop, 'opacity', 'Use background alpha, not inherited fading of real room information');
    });
  });
  assert.equal(card.border, '1px solid transparent');
  assert.equal(card['box-shadow'], 'none');
  assert.match(footer.width, /100% \+ 2 \* var\(--mro-edge-padding\)/);
  assert.equal(footer['margin-bottom'], 'calc(-1 * var(--mro-edge-padding))');
});

test('Orbit card fill wins over the legacy saved dark theme regardless of stylesheet loading order', () => {
  const legacy = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-cliniq.css', import.meta.url), 'utf8'));
  const orbitSelector = 'html[data-app-design="cliniq"] .mobile-room-overview.mobile-room-overview-orbit .mro-room.m-unified-card';
  // These concrete selectors contain only type, class and attribute selectors.
  const specificity = selector => (selector.match(/\.[\w-]+|\[[^\]]+\]/g) || []).length;
  let darkRules = 0;
  legacy.walkRules(rule => {
    if (!rule.selector.includes('.m-dark') || !rule.selector.includes('.mro-room.m-unified-card')) return;
    darkRules++;
    assert.ok(specificity(orbitSelector) > specificity(rule.selector), 'Do not rely on import order to preserve the neutral glass and transparent outline');
  });
  assert.ok(darkRules > 0);
  const card = declarationsFor(orbitSelector);
  assert.equal(card.background, 'linear-gradient(155deg, rgba(92, 90, 175, .48), rgba(18, 22, 58, .78))');
  assert.equal(card.border, '1px solid transparent');
  assert.equal(card['box-shadow'], 'none');
});

test('shorter cards remain content-sized and passive dock softening stays confined beneath navigation', () => {
  const scope = 'html[data-app-design="cliniq"] .mobile-room-overview-orbit';
  const cardSelector = `${scope} .mro-room .mro-room-open`;
  const minimums = [];
  orbitStyles.walkRules(rule => {
    if (rule.selectors.includes(cardSelector)) rule.walkDecls('min-height', declaration => minimums.push(declaration.value));
  });
  assert.deepEqual(minimums, ['196px', '186px'], 'Reduce empty space around the icon while allowing content to grow');
  for (const selector of [cardSelector, `${scope} .mro-room-list[data-layout=rows] .mro-room-open`]) {
    const card = declarationsFor(selector);
    assert.equal(card.height, undefined, 'Long actual names and clinical badges must still be allowed to grow');
    assert.equal(card['max-height'], undefined);
    assert.notEqual(card.overflow, 'hidden');
    assert.equal(card.filter, undefined, 'Do not blur or fade complete room cards');
  }
  assert.doesNotMatch(orbitStyles.toString(), /\.mobile-reference-nav/, 'Use the detail navigation stylesheet without overview overrides');
});
