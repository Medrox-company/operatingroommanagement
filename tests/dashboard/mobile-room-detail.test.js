import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Bounded component/handler regressions, not a browser or a full React lifecycle.
// All contexts, effects, timers and event writes are mocked; no live clinical
// state or network is accessed. Visual fidelity is verified separately.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../components/RoomDetail.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'RoomDetail.tsx',
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});
const phaseVisualExports = {};
new Function('exports', ts.transpileModule(readFileSync(new URL('../../lib/mobile-room-phase-visual.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(phaseVisualExports);

const statuses = [
  { id: 'ready', name: 'Sál připraven', title: 'Sál připraven', color: '#10B981' },
  { id: 'surgery', name: 'Chirurgický výkon', title: 'Chirurgický výkon', color: '#EF4444' },
  { id: 'cleaning', name: 'Úklid sálu', title: 'Úklid sálu', color: '#6366F1' },
];
const baseRoom = {
  id: 'test-room', name: 'PCHO sál č. 2', department: 'Centrální sály',
  currentStepIndex: 1, phaseStartedAt: new Date(Date.now() - 20 * 60_000).toISOString(),
  estimatedEndTime: new Date(Date.now() + 90 * 60_000).toISOString(),
  staff: { doctor: { id: 'd1', name: 'Testovací lékař' }, nurse: {} },
};

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.isValidElement(node) ? content(node.props.children) : '';
}

function fakeTimeouts(t) {
  const timers = [];
  let now = 0;
  t.mock.method(globalThis, 'setTimeout', (callback, delay = 0, ...args) => {
    const timer = { id: timers.length + 1, delay, due: now + delay, cleared: false, fired: false, run: () => callback(...args) };
    timers.push(timer);
    return timer.id;
  });
  t.mock.method(globalThis, 'clearTimeout', id => {
    const timer = timers.find(entry => entry.id === id);
    if (timer) timer.cleared = true;
  });
  return {
    timers,
    advance(milliseconds) {
      const until = now + milliseconds;
      while (true) {
        const next = timers.filter(timer => !timer.cleared && !timer.fired && timer.due <= until).sort((left, right) => left.due - right.due)[0];
        if (!next) break;
        now = next.due;
        next.fired = true;
        next.run();
      }
      now = until;
    },
  };
}

function harness(overrides = {}, context = {}) {
  const state = [];
  const refs = [];
  const effects = [];
  const stateWrites = [];
  let cursor = 0;
  let refCursor = 0;
  const events = [];
  const imports = {
    react: {
      ...React,
      memo: fn => fn,
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useEffect: (effect, dependencies) => {
        if (context.captureEffects) effects.push({ effect, dependencies });
      },
      useRef: value => {
        const index = refCursor++;
        if (!(index in refs)) refs[index] = { current: value };
        return refs[index];
      },
      useState: initial => {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => {
          if (context.captureStateWrites) stateWrites.push(index);
          state[index] = typeof value === 'function' ? value(state[index]) : value;
        }];
      },
    },
    'framer-motion': { motion: new Proxy({}, { get: (_object, tag) => tag }), AnimatePresence: 'animate-presence' },
    'lucide-react': require('lucide-react'),
    '../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: context.statuses ?? statuses }) },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: context.activeHospitalId ?? 'test-hospital' }) },
    '../contexts/RealtimeContext': { useRealtimeContext: () => ({ connected: context.connected ?? true }) },
    '../hooks/useSharedClock': { useNowMs: () => Date.now() },
    // Interaktivní nápověda: v ostrém provozu vrací isTutorial false, takže
    // se události zapisují do databáze. Atrapa drží tentýž stav.
    '../contexts/TutorialContext': { useTutorial: () => ({ isTutorial: context.isTutorial ?? false }) },
    '../hooks/useOperationalThresholds': { useOperationalThresholds: () => ({
      thresholds: { shortPhaseMinutes: 5, cleaningWarningMinutes: 30, rapidSurgeryMinutes: 5, firstCaseGraceMinutes: 15 },
    }) },
    '../lib/db': { recordStatusEvent: async event => { events.push(event); } },
    '../lib/mobile-room-phase-visual': phaseVisualExports,
    './StaffPickerModal': { default: 'staff-picker' },
    './StepConfirmationOverlay': { default: 'step-confirmation' },
    './NotificationOverlay': { default: 'notification-overlay' },
    './mobile/MobileShell': { MobileDesignSelector: 'design-selector' },
    './room/RapidSurgeryWarning': { RapidSurgeryWarning: 'rapid-warning' },
    './room/AcuteRoomQueueRibbon': { default: 'acute-queue-ribbon' },
    './ModulePageHeading': { default: 'module-heading' },
    './mobile/mobile-room-detail.css': {},
    './mobile/mobile-room-orbit.css': {},
    './room/room-acute-detail.css': {},
  };
  // TS's default-import helper requires __esModule for default component mocks.
  for (const entry of Object.values(imports)) if (entry.default) entry.__esModule = true;
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
    return imports[name];
  }, mod.exports, mod);
  const props = { room: baseRoom, onClose: () => {}, onStepChange: () => {}, onEndTimeChange: () => {}, ...overrides };
  return {
    events,
    effects,
    stateWrites,
    props,
    render() {
      cursor = 0;
      refCursor = 0;
      effects.length = 0;
      const tree = mod.exports.default(props);
      const [mobile] = elements(tree, element => element.props['data-testid'] === 'mobile-room-detail');
      assert.ok(mobile);
      return {
        tree, mobile,
        button(label) {
          const [button] = elements(mobile, element => element.type === 'button' && element.props['aria-label'] === label);
          assert.ok(button, `Missing mobile action: ${label}`);
          return button;
        },
        byClass(name) {
          return elements(mobile, element => element.props.className?.split(' ').includes(name));
        },
        overlay(name) {
          const [overlay] = elements(tree, element => element.type === name);
          assert.ok(overlay, `Missing overlay: ${name}`);
          return overlay;
        },
      };
    },
  };
}

test('desktop staff controls use the same horizontal gap and right rail as the lower actions', () => {
  const { tree } = harness().render();
  const [staffRail] = elements(tree, element => element.type === 'div'
    && element.props.className?.includes('absolute')
    && elements(element.props.children, child => child.props['data-tour'] === 'staff-nurse').length > 0);
  const [actionRail] = elements(tree, element => element.type === 'div'
    && element.props.className?.includes('absolute bottom-')
    && elements(element.props.children, child => child.props['data-tour'] === 'patient-call').length > 0);
  const [closeRail] = elements(tree, element => element.type === 'div'
    && element.props.className?.includes('absolute right-')
    && elements(element.props.children, child => child.props['aria-label'] === 'Zavřít detail sálu').length > 0);
  assert.ok(staffRail && actionRail && closeRail, 'All three desktop control groups must be present');

  const gap = actionRail.props.className.match(/gap-\[([^\]]+)\]/)[1];
  const inset = actionRail.props.className.match(/right-\[([^\]]+)\]/)[1];
  const compact = value => value.replace(/\s+/g, '');
  assert.ok(staffRail.props.className.includes(`gap-[${gap}]`));
  assert.ok(closeRail.props.className.includes(`right-[${inset}]`));
  const [close] = elements(closeRail, element => element.props['aria-label'] === 'Zavřít detail sálu');
  assert.equal(compact(staffRail.props.style.right), `calc(${inset}+${compact(close.props.style.width)}+${gap})`);
});

test('mobile detail has real room data, two timing cards, two staff roles and all four actions', () => {
  const view = harness().render();
  assert.ok(content(view.mobile).includes(baseRoom.name));
  assert.equal(view.byClass('mrd-time-card').length, 2);
  assert.equal(view.byClass('mrd-staff-row').length, 2);
  assert.ok(content(view.byClass('mrd-section-heading')).includes('1 / 2'));
  assert.deepEqual(view.byClass('mrd-action').map(content), ['Volat', 'Příjezd', 'Hygiena', 'Pauza']);
  const [steps] = view.byClass('mrd-phase-steps');
  assert.equal(elements(steps, element => element.type === 'button').length, 0, 'Phase rail must not allow skipping');
  assert.equal(elements(steps, element => element.props['aria-current'] === 'step').length, 1);
});

test('action tint identities follow the existing clinical active and disabled states', () => {
  const calledAt = new Date(Date.now() - 60_000).toISOString();
  const arrivedAt = new Date().toISOString();
  const cases = [
    { room: {}, active: [], disabled: ['arrival'] },
    { room: { patientCalledAt: calledAt }, active: ['call'], disabled: ['call'] },
    { room: { patientCalledAt: calledAt, patientArrivedAt: arrivedAt }, active: ['call', 'arrival'], disabled: ['call', 'arrival'] },
    { room: { isEnhancedHygiene: true }, active: ['hygiene'], disabled: ['arrival'] },
    { room: { isPaused: true }, active: ['pause'], disabled: ['arrival'] },
    { room: { isEmergency: true }, active: [], disabled: ['arrival'] },
    { room: { isLocked: true, currentStepIndex: statuses.length - 1 }, active: [], disabled: ['arrival', 'pause'] },
    { room: { patientCalledAt: calledAt, patientArrivedAt: arrivedAt, isEnhancedHygiene: true, isPaused: true, isLocked: true, currentStepIndex: statuses.length - 1 }, active: ['call', 'arrival', 'hygiene', 'pause'], disabled: ['call', 'arrival', 'pause'] },
  ];
  for (const scenario of cases) {
    const view = harness({ room: { ...baseRoom, ...scenario.room } }).render();
    const actions = view.byClass('mrd-action');
    assert.deepEqual(actions.map(action => action.props['data-action']), ['call', 'arrival', 'hygiene', 'pause'], 'Stable tint identities must not depend on translated or paused button labels');
    assert.deepEqual(actions.filter(action => action.props.className.split(' ').includes('is-active')).map(action => action.props['data-action']), scenario.active, `Active tints must follow real action state: ${JSON.stringify(scenario.room)}`);
    assert.deepEqual(actions.filter(action => action.props.disabled).map(action => action.props['data-action']), scenario.disabled, 'Adding tint identities must not enable or disable a clinical action');
    assert.ok(actions.every(action => action.type === 'button' && typeof action.props.onClick === 'function'), 'Tint selectors must stay on the existing functional buttons');
    const hygiene = actions.find(action => action.props['data-action'] === 'hygiene');
    const pause = actions.find(action => action.props['data-action'] === 'pause');
    assert.equal(hygiene.props['aria-pressed'], Boolean(scenario.room.isEnhancedHygiene));
    assert.equal(pause.props['aria-pressed'], Boolean(scenario.room.isPaused));
  }
});

test('activating mobile actions does not add fields, feedback rows or visible action text', () => {
  const now = new Date().toISOString();
  const baseline = harness().render();
  const fields = view => elements(view.mobile, element => ['header', 'section', 'input', 'select', 'textarea'].includes(element.type))
    .map(element => `${element.type}:${element.props.className || ''}`);
  for (const override of [
    { patientCalledAt: now },
    { patientCalledAt: now, patientArrivedAt: now },
    { isEnhancedHygiene: true },
    { isPaused: true },
    { patientCalledAt: now, patientArrivedAt: now, isEnhancedHygiene: true, isPaused: true },
  ]) {
    const view = harness({ room: { ...baseRoom, ...override } }).render();
    assert.deepEqual(fields(view), fields(baseline), 'Action state must not add another mobile field or section');
    assert.deepEqual(view.byClass('mrd-action').map(content), ['Volat', 'Příjezd', 'Hygiena', 'Pauza'], 'Visible action labels must remain stable, including while paused');
    assert.equal(elements(view.byClass('mrd-actions'), element => element.type === 'small').length, 0, 'Do not append elapsed-call time or arrival-confirmed subtext');
    assert.equal(view.byClass('mrd-action-feedback').length, 0, 'Action feedback must not create another row below personnel');
    assert.equal(view.byClass('mrd-state-flags').length, 0, 'Hygiene and pause must not create a status field above the timing pair');
    assert.equal(view.byClass('mrd-orbit-phase-state').length, 0, 'Pausing must not add another badge over the thematic phase icon');
    assert.equal(view.mobile.props['data-hygiene'], override.isEnhancedHygiene || undefined);
    assert.doesNotMatch(content(view.mobile), /Zvýšený hygienický režim|Volání pacienta zaznamenáno|Příjezd pacienta potvrzen|Potvrzeno|Pokračovat/);
  }
  const paused = harness({ room: { ...baseRoom, isPaused: true } }).render();
  assert.equal(content(paused.button('Pokračovat ve fázi')), 'Pauza', 'Keep the resume command accessible without changing the visible label');
  assert.equal(paused.button('Pokračovat ve fázi').props['aria-pressed'], true);
});

test('emergency and lock warnings remain visible while hygiene and pause add no warning text', () => {
  for (const override of [{ isEmergency: true }, { isLocked: true }, { isEmergency: true, isLocked: true }]) {
    const view = harness({ room: { ...baseRoom, isEnhancedHygiene: true, isPaused: true, ...override } }).render();
    const flags = view.byClass('mrd-state-flags');
    assert.equal(flags.length, 1, 'Critical warning status must not be removed with action feedback');
    assert.equal(flags[0].props.role, 'status');
    const expected = `${override.isEmergency ? 'Stav nouze' : ''}${override.isLocked ? 'Uzamčeno' : ''}`;
    assert.equal(content(flags), expected, 'Only the independent clinical emergency and lock warnings belong in the status field');
    assert.equal(view.mobile.props['data-hygiene'], true);
    assert.equal(view.mobile.props['data-emergency'], override.isEmergency || undefined);
    assert.equal(view.mobile.props['data-locked'], override.isLocked || undefined);
  }
});

test('hygiene backdrop follows the real toggle and clears when the mode is deactivated', async () => {
  const changes = [];
  const app = harness({ onEnhancedHygieneToggle: value => {
    changes.push(value);
    app.props.room = { ...app.props.room, isEnhancedHygiene: value };
  } });
  assert.equal(app.render().mobile.props['data-hygiene'], undefined);
  await app.render().button('Zapnout hygienický režim').props.onClick();
  let view = app.render();
  assert.equal(view.mobile.props['data-hygiene'], true);
  assert.equal(view.button('Vypnout hygienický režim').props['aria-pressed'], true);
  assert.equal(view.byClass('mrd-state-flags').length, 0);
  await view.button('Vypnout hygienický režim').props.onClick();
  view = app.render();
  assert.equal(view.mobile.props['data-hygiene'], undefined, 'Removing the real mode must restore the default blue background');
  assert.equal(view.button('Zapnout hygienický režim').props['aria-pressed'], false);
  assert.deepEqual(changes, [true, false]);
  assert.deepEqual(app.events.map(event => event.event_type), ['enhanced_hygiene_on', 'enhanced_hygiene_off']);
});

test('active phase emphasis and counter follow the configured workflow, not the reference mockup', () => {
  for (const index of [1, 2]) {
    const view = harness({ room: { ...baseRoom, currentStepIndex: index } }).render();
    assert.equal(view.mobile.props.style['--room-phase-color'], statuses[index].color);
    assert.equal(view.byClass('mrd-phase-card')[0].props['data-emphasized'], 'true');
    assert.equal(content(view.byClass('mrd-phase-count')), `${index + 1}/${statuses.length}`);
    assert.equal(view.byClass('mrd-phase-count')[0].props['aria-label'], `Fáze ${index + 1} z ${statuses.length}`);
    assert.equal(view.byClass('mrd-phase-card')[0].props['aria-label'], 'Aktuální fáze');
  }
});

test('every configured phase is represented once in the mobile cycle, in hospital order', () => {
  for (const count of [3, 6, 9]) {
    const configuredStatuses = Array.from({ length: count }, (_, index) => ({
      id: `hospital-phase-${index}`,
      name: `Interní fáze ${index + 1}`,
      title: `Vlastní název ${index + 1}`,
      color: index === 1 ? '#A855F7' : '#14B8A6',
    }));
    const view = harness({ room: { ...baseRoom, currentStepIndex: 1 } }, { statuses: configuredStatuses }).render();
    const [steps] = view.byClass('mrd-phase-steps');
    const markers = elements(steps, element => element.type === 'li');
    assert.equal(markers.length, count, 'The reference must not impose a fixed number of phases');
    assert.deepEqual(markers.map(content), configuredStatuses.map(status => status.title));
    assert.equal(markers[1].props['aria-current'], 'step');
    assert.equal(markers.filter(marker => marker.props['aria-current'] === 'step').length, 1);
    assert.equal(elements(steps, element => element.type === 'button').length, 0, 'Cycle labels must not permit phase skipping');
    assert.equal(view.mobile.props.style['--room-phase-color'], '#A855F7');
  }
});

test('configured phase color remains live while pause, lock and emergency retain distinct emphasis', () => {
  const ready = harness({ room: { ...baseRoom, currentStepIndex: 0 } }).render();
  assert.equal(ready.mobile.props.style['--room-phase-color'], statuses[0].color);
  assert.equal(content(ready.byClass('mrd-phase-count')), '1/3');
  for (const [override, color] of [
    [{ isPaused: true, pausedAt: new Date().toISOString() }, '#06b6d4'],
    [{ isEmergency: true }, '#FF3B30'],
    [{ isLocked: true }, '#FBBF24'],
  ]) {
    const view = harness({ room: { ...baseRoom, currentStepIndex: 0, ...override } }).render();
    assert.equal(view.byClass('mrd-phase-card')[0].props['data-emphasized'], 'true');
    assert.equal(view.mobile.props.style['--room-phase-color'], color);
    assert.equal(view.mobile.props.style['--mrd-orbit-phase-color'], statuses[0].color, 'Operational warnings must not erase the hospital phase color');
  }
  for (const [field, data] of [['isPaused', 'data-paused'], ['isLocked', 'data-locked'], ['isEmergency', 'data-emergency']]) {
    const view = harness({ room: { ...baseRoom, [field]: true } }).render();
    assert.equal(view.mobile.props[data], true, 'Operational state must reach the reference ring styling');
  }
});

test('each configured phase renders its thematic operational icon and authoritative color', () => {
  const configuredStatuses = [
    ['Sál připraven', 'ready'], ['Příprava sálu', 'preparation'], ['Příjezd na sál', 'arrival'],
    ['Začátek anestezie', 'anesthesia'], ['Ukončení anestezie', 'anesthesia-end'],
    ['Chirurgický výkon', 'surgery'], ['Ukončení výkonu', 'surgery-end'], ['Odjezd ze sálu', 'departure'],
    ['Předání pacienta', 'handover'], ['Úklid sálu', 'cleaning'], ['Závěrečná dokumentace', 'documentation'],
    ['Vlastní kontrola zařízení', 'unknown'],
  ].map(([name, kind], index) => ({ id: `configured-${index}`, name, title: name, kind, color: '#EF4444', accent_color: '#0A8967' }));
  for (const [index, phase] of configuredStatuses.entries()) {
    const view = harness({ room: { ...baseRoom, currentStepIndex: index } }, { statuses: configuredStatuses }).render();
    const [icon] = view.byClass('mrd-orbit-phase-icon');
    assert.equal(icon.props['data-phase-icon'], phase.kind);
    assert.equal(icon.props['aria-hidden'], 'true');
    assert.equal(view.mobile.props.style['--mrd-orbit-phase-color'], phase.accent_color);
    assert.ok(icon.props.children, 'Every known/custom phase must render a symbol');
    if (['ready', 'preparation'].includes(phase.kind)) assert.equal(view.byClass('mrd-orbit-phase-mask--table').length, 1);
    if (phase.kind === 'surgery') assert.equal(view.byClass('mrd-orbit-phase-mask--scalpel').length, 1);
    if (['arrival', 'departure'].includes(phase.kind)) assert.equal(view.byClass('mrd-orbit-phase-cue').length, 1);
  }
});

test('emergency and lock replace the central symbol in every phase with warning priority', () => {
  const { Siren, Lock, Pause } = require('lucide-react');
  for (const currentStepIndex of [0, 1, 2]) {
    for (const [override, kind, title, Icon] of [
      [{ isPaused: true }, 'pause', 'Pauza', Pause],
      [{ isLocked: true }, 'locked', 'Sál uzamčen', Lock],
      [{ isLocked: true, isPaused: true, isEnhancedHygiene: true }, 'locked', 'Sál uzamčen', Lock],
      [{ isEmergency: true }, 'emergency', 'Stav nouze', Siren],
      [{ isEmergency: true, isLocked: true, isPaused: true, isEnhancedHygiene: true }, 'emergency', 'Stav nouze', Siren],
    ]) {
      const view = harness({ room: { ...baseRoom, currentStepIndex, ...override } }).render();
      const icon = view.byClass('mrd-orbit-phase-icon')[0];
      assert.equal(icon.props['data-phase-icon'], kind);
      assert.equal(elements(icon, node => node.type === Icon).length, 1);
      assert.equal(content(view.byClass('mrd-orbit-phase-title')), title);
      assert.equal(view.byClass('mrd-orbit-phase-state').length, 0);
      assert.equal(view.mobile.props.style['--mrd-orbit-phase-color'], statuses[currentStepIndex].color);
    }
  }
});

test('paused ready, surgery, arrival, departure, completion, custom and empty workflows reuse the same central wrapper', () => {
  const { Pause } = require('lucide-react');
  const phases = [
    ['Sál připraven', 'ready'], ['Chirurgický výkon', 'surgery'],
    ['Příjezd na sál', 'arrival'], ['Odjezd ze sálu', 'departure'],
    ['Ukončení výkonu', 'surgery-end'], ['Ukončení anestezie', 'anesthesia-end'],
    ['Vlastní kontrola zařízení', 'unknown'],
  ].map(([name, kind], index) => ({ id: `pause-phase-${index}`, name, title: name, kind, color: '#EF4444', accent_color: '#0A8967' }));
  for (const configured of [...phases.map(phase => [phase]), []]) {
    const room = { ...baseRoom, currentStepIndex: 0 };
    const baseline = harness({ room }, { statuses: configured }).render();
    const paused = harness({ room: { ...room, isPaused: true } }, { statuses: configured }).render();
    const center = paused.byClass('mrd-orbit-current');
    const icons = paused.byClass('mrd-orbit-phase-icon');
    assert.equal(center.length, 1, 'Pause must replace the existing center, not add another field or control');
    assert.equal(icons.length, 1);
    assert.equal(icons[0].props['data-phase-icon'], 'pause');
    assert.equal(elements(icons, element => element.type === Pause).length, 1, 'Use the actual primary Pause icon');
    assert.equal(paused.byClass('mrd-orbit-phase-mask').length, 0, 'A paused room must not retain an operating table or scalpel behind the Pause icon');
    assert.equal(paused.byClass('mrd-orbit-phase-cue').length, 0, 'Arrival and departure cues must not accompany the Pause icon');
    assert.equal(paused.byClass('mrd-orbit-phase-state').length, 0, 'Pause must not introduce an additional state badge');
    assert.equal(paused.byClass('mrd-orbit-phase-title').length, 1);
    assert.equal(content(paused.byClass('mrd-orbit-phase-title')), 'Pauza');
    assert.equal(center[0].props['aria-label'], 'Pauza');
    assert.equal(center[0].props.disabled, true, 'The paused central control must still reject phase advancement');
    assert.equal(paused.mobile.props.style['--mrd-orbit-phase-color'], baseline.mobile.props.style['--mrd-orbit-phase-color']);
    assert.deepEqual(paused.byClass('mrd-step-name').map(content), baseline.byClass('mrd-step-name').map(content), 'Do not replace a workflow phase with pause in the ordered ring');
    assert.equal(paused.byClass('mrd-state-flags').length, 0);
    assert.equal(paused.byClass('mrd-action-feedback').length, 0);
    assert.equal(paused.byClass('mrd-time-card').length, 2);
    assert.equal(paused.byClass('mrd-staff-row').length, 2);
    assert.deepEqual(paused.byClass('mrd-action').map(content), ['Volat', 'Příjezd', 'Hygiena', 'Pauza']);
  }
});

test('resuming restores the real phase visual and title through the existing callback and audit only', async () => {
  const configuredCases = [
    ['Sál připraven', 'ready'], ['Chirurgický výkon', 'surgery'],
    ['Příjezd na sál', 'arrival'], ['Odjezd ze sálu', 'departure'],
    ['Ukončení výkonu', 'surgery-end'], ['Vlastní kontrola zařízení', 'unknown'],
  ].map(([name, kind], index) => [{ id: `resume-phase-${index}`, name, title: name, kind, color: '#9B59B6' }]);
  configuredCases.push([]);
  for (const configured of configuredCases) {
    const changes = [], transitions = [];
    const room = { ...baseRoom, currentStepIndex: 0 };
    const baseline = harness({ room }, { statuses: configured }).render();
    const app = harness({
      room: { ...room, isPaused: true, pausedAt: new Date().toISOString() },
      onPauseChange: (...args) => {
        changes.push(args);
        app.props.room = { ...app.props.room, isPaused: args[0], pausedAt: args[1] };
      },
      onStepChange: (...args) => transitions.push(args),
    }, { statuses: configured });
    assert.equal(app.render().byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], 'pause');
    await app.render().button('Pokračovat ve fázi').props.onClick();
    const resumed = app.render();
    assert.deepEqual(changes, [[false, null]]);
    assert.deepEqual(app.events.map(event => event.event_type), ['resume']);
    assert.deepEqual(transitions, [], 'Resuming must not advance or reset the clinical workflow');
    assert.equal(app.props.room.currentStepIndex, 0);
    assert.equal(resumed.mobile.props['data-paused'], undefined);
    assert.equal(resumed.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], baseline.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon']);
    assert.equal(content(resumed.byClass('mrd-orbit-phase-title')), content(baseline.byClass('mrd-orbit-phase-title')));
    assert.equal(resumed.byClass('mrd-orbit-current')[0].props['aria-label'], baseline.byClass('mrd-orbit-current')[0].props['aria-label']);
    assert.equal(resumed.mobile.props.style['--mrd-orbit-phase-color'], baseline.mobile.props.style['--mrd-orbit-phase-color']);
    assert.equal(resumed.byClass('mrd-orbit-phase-state').length, 0);
    assert.equal(resumed.byClass('mrd-state-flags').length, 0);
  }
});

test('orbit labels are passive and only the central phase control can request the next step', () => {
  const view = harness().render();
  const [stage] = view.byClass('mrd-orbit-stage');
  assert.ok(stage);
  assert.equal(stage.props.role, undefined);
  assert.equal(stage.props.tabIndex, undefined);
  assert.equal(stage.props.onClick, undefined, 'Tapping a ring marker must not bubble into a clinical transition');
  assert.equal(view.byClass('mrd-orbit-current').length, 1);
  assert.equal(view.byClass('mrd-orbit-chart')[0].props['aria-hidden'], 'true');
  assert.equal(elements(view.byClass('mrd-phase-steps'), element => element.type === 'button' || element.props.onClick).length, 0);
});

test('live connection and notification marker reflect real context instead of mockup content', () => {
  assert.equal(content(harness().render().byClass('mrd-live-state')), 'Živě');
  const offline = harness({}, { connected: false }).render();
  assert.equal(content(offline.byClass('mrd-live-state')), 'Připojování…');
  assert.equal(offline.byClass('mrd-live-context')[0].props['data-connected'], undefined);
  assert.equal(offline.byClass('mrd-notification-dot').length, 0, 'Do not fabricate an unread notification for visual fidelity');
  const emergency = harness({ room: { ...baseRoom, isEmergency: true } }).render();
  assert.equal(emergency.byClass('mrd-notification-dot').length, 1);
  assert.match(content(emergency.byClass('mrd-state-flags')), /Stav nouze/);
});

test('reference layout contains no department icons or static clinical mockup text', () => {
  const view = harness().render();
  const images = elements(view.mobile, element => element.type === 'img');
  // Role glyphs belong to the selected reference; specialty/organ illustrations
  // do not. The dial is passive decoration and the hygiene icon uses a tintable
  // alpha mask rather than retaining dark artwork on the glass button surface.
  assert.deepEqual(images.map(element => element.props.src), [
    '/images/mobile-orbit-dial.png',
    '/images/mobile-orbit-doctor.png',
    '/images/mobile-orbit-nurse.png',
  ]);
  assert.equal(view.byClass('mrd-orbit-phase-mask--scalpel').length, 1, 'The real instrument artwork is tinted through its alpha mask');
  assert.ok(images.every(element => element.props.alt === '' && element.props['aria-hidden'] === 'true'), 'Operational decoration must not replace accessible control names');
  const roleImages = view.byClass('mrd-staff-icon');
  assert.equal(roleImages.length, 2);
  assert.ok(roleImages.every(element => element.type === 'img' && element.props['aria-hidden'] === 'true'), 'Only noninteractive role images may use decorative image scaling');
  assert.doesNotMatch(content(view.mobile), /Traumatologie 1|Závěrečná dokumentace/);
  assert.equal(content(view.byClass('mrd-time-card--estimate')), `Odhad konce${new Date(baseRoom.estimatedEndTime).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`);
});

test('the tintable hygiene icon stays passive inside its existing clinical action', () => {
  const view = harness().render();
  const glyphs = view.byClass('mrd-action-hygiene-icon');
  assert.equal(glyphs.length, 1);
  const [glyph] = glyphs;
  assert.equal(glyph.type, 'span');
  assert.equal(glyph.props['aria-hidden'], 'true');
  assert.equal(glyph.props.onClick, undefined, 'Only the parent clinical action may handle the hygiene toggle');
  assert.equal(glyph.props.tabIndex, undefined, 'Decorative masks must not add another keyboard stop');
  assert.equal(glyph.props.role, undefined);
  const action = view.byClass('mrd-action').find(button => content(button) === 'Hygiena');
  assert.ok(action && elements(action, element => element === glyph).length === 1);
  assert.equal(action.type, 'button');
  assert.equal(typeof action.props.onClick, 'function');
});

test('header back and notification controls retain existing navigation and overlay callbacks', () => {
  let closes = 0;
  const app = harness({ onClose: () => { closes += 1; } });
  app.render().button('Zpět na přehled sálů').props.onClick();
  assert.equal(closes, 1);
  app.render().button('Otevřít notifikace').props.onClick();
  assert.equal(app.render().overlay('notification-overlay').props.isOpen, true);
});

test('central mobile phase control opens existing confirmation before changing status', () => {
  const calls = [];
  const app = harness({ onStepChange: (...args) => calls.push(args) });
  app.render().button('Přejít na další fázi').props.onClick({ stopPropagation() {} });
  assert.equal(calls.length, 0, 'A click alone must not advance clinical state');
  let view = app.render();
  assert.equal(view.overlay('step-confirmation').props.pendingStepIndex, 2);
  view.overlay('step-confirmation').props.onCancel();
  assert.equal(calls.length, 0);
  assert.equal(app.render().overlay('step-confirmation').props.pendingStepIndex, null);
  app.render().button('Přejít na další fázi').props.onClick({ stopPropagation() {} });
  app.render().overlay('step-confirmation').props.onConfirm();
  assert.deepEqual(calls, [[2, '#6366F1']]);
  app.render().overlay('step-confirmation').props.onConfirm();
  assert.equal(calls.length, 1, 'A dismissed confirmation must not advance another phase');
});

test('pause and final-step lock block phase advancement and estimated-time changes', () => {
  for (const room of [
    { ...baseRoom, isPaused: true, pausedAt: new Date().toISOString() },
    { ...baseRoom, isLocked: true, currentStepIndex: 2 },
  ]) {
    const calls = [];
    const app = harness({ room, onStepChange: (...args) => calls.push(args) });
    const view = app.render();
    assert.equal(view.byClass('mrd-phase-advance')[0].props.disabled, true);
    assert.equal(view.button('Prodloužit odhadovaný čas o 15 minut').props.disabled, true);
    assert.equal(view.button('Zkrátit odhadovaný čas o 15 minut').props.disabled, true);
    view.byClass('mrd-phase-advance')[0].props.onClick({ stopPropagation() {} });
    assert.equal(calls.length, 0);
    assert.equal(app.render().overlay('step-confirmation').props.pendingStepIndex, null);
    assert.equal(view.byClass('mrd-action').length, 4, 'Disabled actions remain visible');
  }
});

test('pausing after opening confirmation prevents the pending clinical transition', async () => {
  const calls = [];
  const app = harness({ onStepChange: (...args) => calls.push(args) });
  app.render().button('Přejít na další fázi').props.onClick({ stopPropagation() {} });
  assert.equal(app.render().overlay('step-confirmation').props.pendingStepIndex, 2);
  await app.render().button('Pozastavit fázi').props.onClick();
  app.render().overlay('step-confirmation').props.onConfirm();
  await Promise.resolve();
  assert.deepEqual(calls, [], 'A confirmation must respect a pause introduced while it was open');
});

test('mobile + and − retain the existing 15-minute estimate handlers', t => {
  const timers = [];
  t.mock.method(globalThis, 'setTimeout', callback => { timers.push(callback); return timers.length; });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: globalThis.setTimeout };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  for (const [label, delta] of [
    ['Prodloužit odhadovaný čas o 15 minut', 15],
    ['Zkrátit odhadovaný čas o 15 minut', -15],
  ]) {
    const calls = [];
    const app = harness({ onEndTimeChange: value => calls.push(value) });
    app.render().button(label).props.onClick();
    while (timers.length) timers.shift()();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].getTime(), Date.parse(baseRoom.estimatedEndTime) + delta * 60_000);
  }
});

test('repeated estimate changes debounce to one authoritative update', t => {
  const timers = new Map();
  let timerId = 0;
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => {
    const id = ++timerId;
    timers.set(id, { callback, delay });
    return id;
  });
  t.mock.method(globalThis, 'clearTimeout', id => { timers.delete(id); });
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: globalThis.setTimeout };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  const calls = [];
  const app = harness({ onEndTimeChange: value => calls.push(value) });
  app.render().button('Prodloužit odhadovaný čas o 15 minut').props.onClick();
  app.render().button('Prodloužit odhadovaný čas o 15 minut').props.onClick();
  assert.equal(calls.length, 0, 'The estimate must not be propagated before the debounce');
  const pendingUpdates = [...timers.values()].filter(timer => timer.delay === 300);
  assert.equal(pendingUpdates.length, 1, 'A rapid second adjustment must replace the first pending write');
  pendingUpdates[0].callback();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].getTime(), Date.parse(baseRoom.estimatedEndTime) + 30 * 60_000);
});

test('decreasing an estimate never moves it before the current phase start', t => {
  const timers = [];
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => { timers.push({ callback, delay }); return timers.length; });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: globalThis.setTimeout };
  t.after(() => { if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; });
  const calls = [];
  const app = harness({
    room: { ...baseRoom, estimatedEndTime: new Date(Date.parse(baseRoom.phaseStartedAt) + 10 * 60_000).toISOString() },
    onEndTimeChange: value => calls.push(value),
  });
  app.render().button('Zkrátit odhadovaný čas o 15 minut').props.onClick();
  assert.equal(timers.filter(timer => timer.delay === 300).length, 0, 'An invalid estimate must not schedule a backend update');
  assert.deepEqual(calls, []);
});

test('pause/resume and hygiene preserve their callbacks and audit event types', async () => {
  const pauses = [];
  const hygiene = [];
  const app = harness({ onPauseChange: (...args) => pauses.push(args), onEnhancedHygieneToggle: value => hygiene.push(value) });
  await app.render().button('Pozastavit fázi').props.onClick();
  assert.equal(pauses[0][0], true);
  assert.ok(Number.isFinite(Date.parse(pauses[0][1])));
  await app.render().button('Pokračovat ve fázi').props.onClick();
  assert.deepEqual(pauses[1], [false, null]);
  await app.render().button('Zapnout hygienický režim').props.onClick();
  assert.deepEqual(hygiene, [true]);
  assert.deepEqual(app.events.map(event => event.event_type), ['pause', 'resume', 'enhanced_hygiene_on']);
  assert.ok(app.events.every(event => event.operating_room_id === baseRoom.id && event.step_index === 1));
});

test('tutorial actions retain callbacks without clinical audit or notification writes', async t => {
  const network = [];
  t.mock.method(globalThis, 'fetch', (...args) => { network.push(args); throw new Error('Unexpected tutorial network access'); });
  t.mock.method(globalThis, 'setTimeout', callback => { callback(); return 1; });
  const callbacks = [];
  const app = harness({
    onPauseChange: (...args) => callbacks.push(['pause', ...args]),
    onEnhancedHygieneToggle: value => callbacks.push(['hygiene', value]),
    onPatientStatusChange: (...args) => callbacks.push(['patient', ...args]),
  }, { isTutorial: true });
  await app.render().button('Pozastavit fázi').props.onClick();
  await app.render().button('Pokračovat ve fázi').props.onClick();
  await app.render().button('Zapnout hygienický režim').props.onClick();
  await app.render().button('Volat pacienta').props.onClick();
  await app.render().button('Potvrdit příjezd pacienta').props.onClick();
  await app.render().overlay('notification-overlay').props.onSendNotification('late_arrival', 'Ukázka');
  assert.equal(callbacks.length, 5);
  assert.deepEqual(app.events, [], 'Tutorial events must not be persisted');
  assert.deepEqual(network, [], 'Tutorial notifications must not contact the application backend');
});

test('a rejected atomic acute start leaves estimate and patient sequencing untouched', async () => {
  const calls = [];
  const estimates = [];
  const patients = [];
  const configuredStatuses = [
    statuses[0],
    { id: 'arrival', name: 'Příjezd na sál', title: 'Příjezd na sál', color: '#A855F7' },
    statuses[2],
  ];
  const calledAt = new Date().toISOString();
  const app = harness({
    room: { ...baseRoom, currentStepIndex: 0, patientCalledAt: calledAt },
    onStepChange: async (...args) => { calls.push(args); return false; },
    onEndTimeChange: value => estimates.push(value),
    onPatientStatusChange: (...args) => patients.push(args),
  }, { statuses: configuredStatuses });
  app.render().button('Přejít na další fázi').props.onClick({ stopPropagation() {} });
  assert.deepEqual(calls, []);
  app.render().overlay('step-confirmation').props.onConfirm();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls, [[1, '#A855F7']]);
  assert.deepEqual(estimates, [], 'A rejected start must not set a default end time');
  assert.deepEqual(patients, [], 'A rejected start must not clear the called patient');
  assert.equal(app.render().button('Volat pacienta').props.disabled, true);
  assert.equal(app.render().button('Potvrdit příjezd pacienta').props.disabled, false);
  assert.deepEqual(app.events, []);
});

test('Volat and Příjezd remain labelled after use and retain one-call/arrival sequencing', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const calls = [];
  const app = harness({ onPatientStatusChange: (...args) => calls.push(args) });
  assert.equal(app.render().button('Potvrdit příjezd pacienta').props.disabled, true);
  await app.render().button('Volat pacienta').props.onClick();
  let view = app.render();
  assert.equal(view.button('Volat pacienta').props.disabled, true);
  assert.equal(content(view.button('Volat pacienta')), 'Volat', 'Calling must not append a timer to the mobile control');
  assert.equal(view.byClass('mrd-action-feedback').length, 0, 'The desktop feedback timer must not add a mobile row after calling');
  assert.equal(view.button('Potvrdit příjezd pacienta').props.disabled, false);
  await view.button('Volat pacienta').props.onClick();
  assert.equal(calls.length, 1);
  await view.button('Potvrdit příjezd pacienta').props.onClick();
  view = app.render();
  assert.equal(view.button('Potvrdit příjezd pacienta').props.disabled, true);
  assert.equal(content(view.button('Potvrdit příjezd pacienta')), 'Příjezd', 'Arrival must not append confirmation subtext to the mobile control');
  assert.equal(view.byClass('mrd-action-feedback').length, 0, 'The desktop feedback timer must not add a mobile row after arrival');
  assert.deepEqual(app.events.map(event => event.event_type), ['patient_call', 'patient_arrived']);
  assert.equal(calls[1][0], calls[0][0]);
  assert.ok(Number.isFinite(Date.parse(calls[1][1])));
});

test('mobile call and arrival replace only the existing center for exactly two seconds', async t => {
  const clock = fakeTimeouts(t);
  const { Phone, BedSingle } = require('lucide-react');
  for (const [kind, action, title, icon, override] of [
    ['call', 'Volat pacienta', 'Volání pacienta', Phone, {}],
    ['arrival', 'Potvrdit příjezd pacienta', 'Příjezd pacienta', BedSingle, { patientCalledAt: new Date().toISOString() }],
  ]) {
    const app = harness({ room: { ...baseRoom, ...override } });
    const baseline = app.render();
    const structuralFields = view => elements(view.mobile, element => ['header', 'section', 'input', 'select', 'textarea'].includes(element.type)).map(element => `${element.type}:${element.props.className || ''}`);
    await baseline.button(action).props.onClick();
    let view = app.render();
    const [center] = view.byClass('mrd-orbit-current');
    const [glyph] = view.byClass('mrd-orbit-phase-icon');
    assert.equal(glyph.props['data-phase-icon'], kind);
    assert.equal(elements(glyph, element => element.type === icon).length, 1);
    assert.equal(content(view.byClass('mrd-orbit-phase-title')), title);
    assert.equal(view.byClass('mrd-orbit-phase-title')[0].props['aria-live'], 'polite');
    assert.equal(view.byClass('mrd-orbit-phase-title')[0].props['aria-atomic'], 'true');
    assert.equal(center.props['aria-label'], baseline.byClass('mrd-orbit-current')[0].props['aria-label'], 'Temporary feedback must not change the clinical action behind the center');
    assert.equal(view.mobile.props.style['--mrd-orbit-phase-color'], baseline.mobile.props.style['--mrd-orbit-phase-color']);
    assert.deepEqual(structuralFields(view), structuralFields(baseline));
    for (const className of ['mrd-orbit-phase-mask', 'mrd-orbit-phase-cue', 'mrd-orbit-phase-state', 'mrd-action-feedback', 'mrd-state-flags']) {
      assert.equal(view.byClass(className).length, 0, `${kind} feedback must not add a field, badge or secondary phase glyph`);
    }
    assert.equal(view.byClass('mrd-orbit-current').length, 1);
    assert.equal(view.byClass('mrd-orbit-phase-icon').length, 1);
    assert.equal(view.byClass('mrd-orbit-phase-title').length, 1);
    assert.deepEqual(view.byClass('mrd-action').map(content), ['Volat', 'Příjezd', 'Hygiena', 'Pauza']);
    assert.ok(clock.timers.some(timer => timer.delay === 2000 && !timer.fired));
    assert.ok(clock.timers.some(timer => timer.delay === 5000), 'Preserve the independent existing five-second desktop feedback timer');
    clock.advance(1999);
    assert.equal(content(app.render().byClass('mrd-orbit-phase-title')), title);
    clock.advance(1);
    view = app.render();
    assert.equal(view.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], baseline.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon']);
    assert.equal(content(view.byClass('mrd-orbit-phase-title')), content(baseline.byClass('mrd-orbit-phase-title')), 'Restore the underlying phase at exactly 2000ms, not at the desktop 5000ms deadline');
  }
});

test('a rapid call-to-arrival replacement cancels its old deadline and preserves one clinical sequence', async t => {
  const clock = fakeTimeouts(t);
  const changes = [];
  const app = harness({ onPatientStatusChange: (...args) => changes.push(args) });
  await app.render().button('Volat pacienta').props.onClick();
  const original = clock.timers.find(timer => timer.delay === 2000);
  clock.advance(700);
  await app.render().button('Potvrdit příjezd pacienta').props.onClick();
  const replacement = clock.timers.filter(timer => timer.delay === 2000).at(-1);
  assert.notEqual(replacement.id, original.id);
  assert.equal(original.cleared, true);
  assert.equal(content(app.render().byClass('mrd-orbit-phase-title')), 'Příjezd pacienta');
  original.run();
  assert.equal(content(app.render().byClass('mrd-orbit-phase-title')), 'Příjezd pacienta', 'A queued stale callback must not clear newer feedback even after cancellation');
  await app.render().button('Volat pacienta').props.onClick();
  await app.render().button('Potvrdit příjezd pacienta').props.onClick();
  assert.equal(changes.length, 2, 'Disabled repeated calls must not duplicate patient events');
  assert.equal(clock.timers.filter(timer => timer.delay === 2000).length, 2, 'Rejected repeated actions must not restart the feedback deadline');
  assert.deepEqual(app.events.map(event => event.event_type), ['patient_call', 'patient_arrived']);
  assert.equal(changes[1][0], changes[0][0]);
  assert.ok(Number.isFinite(Date.parse(changes[1][1])));
  clock.advance(1299);
  assert.equal(content(app.render().byClass('mrd-orbit-phase-title')), 'Příjezd pacienta', 'Arrival must survive through the original call deadline');
  clock.advance(700);
  assert.equal(content(app.render().byClass('mrd-orbit-phase-title')), 'Příjezd pacienta');
  clock.advance(1);
  assert.equal(app.render().byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], 'surgery');
});

test('feedback has priority over pause but expiry follows the current pause or workflow state', async t => {
  const clock = fakeTimeouts(t);
  const paused = harness({ room: { ...baseRoom, isPaused: true } });
  await paused.render().button('Volat pacienta').props.onClick();
  assert.equal(content(paused.render().byClass('mrd-orbit-phase-title')), 'Volání pacienta');
  assert.equal(paused.render().byClass('mrd-orbit-current')[0].props['aria-label'], 'Pauza');
  assert.equal(paused.render().byClass('mrd-orbit-current')[0].props.disabled, true);
  clock.advance(2000);
  assert.equal(content(paused.render().byClass('mrd-orbit-phase-title')), 'Pauza');
  assert.equal(paused.render().byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], 'pause');

  const resumes = [];
  const resumed = harness({ room: { ...baseRoom, isPaused: true }, onPauseChange: (...args) => resumes.push(args) });
  await resumed.render().button('Volat pacienta').props.onClick();
  await resumed.render().button('Pokračovat ve fázi').props.onClick();
  assert.equal(content(resumed.render().byClass('mrd-orbit-phase-title')), 'Volání pacienta', 'Resuming must not prematurely remove the pending patient feedback');
  clock.advance(2000);
  assert.equal(resumed.render().byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], 'surgery');
  assert.deepEqual(resumes, [[false, null]]);
  assert.deepEqual(resumed.events.map(event => event.event_type), ['patient_call', 'resume']);

  const changed = harness();
  await changed.render().button('Volat pacienta').props.onClick();
  changed.props.room = { ...baseRoom, currentStepIndex: 2 };
  assert.equal(content(changed.render().byClass('mrd-orbit-phase-title')), 'Volání pacienta');
  clock.advance(2000);
  const latest = changed.render();
  const baseline = harness({ room: changed.props.room }).render();
  assert.equal(latest.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], 'cleaning', 'Expiry must not restore a stale captured phase');
  assert.equal(content(latest.byClass('mrd-orbit-phase-title')), content(baseline.byClass('mrd-orbit-phase-title')));
  assert.deepEqual(changed.events.map(event => event.event_type), ['patient_call']);
});

test('persisted patient-call and arrival history never generates a new transient flash', t => {
  const clock = fakeTimeouts(t);
  const now = new Date().toISOString();
  for (const override of [{ patientCalledAt: now }, { patientCalledAt: now, patientArrivedAt: now }, { patientCalledAt: now, patientArrivedAt: now, isPaused: true }]) {
    const app = harness({ room: { ...baseRoom, ...override, statusHistory: [{ stepIndex: 1, startedAt: now }] } });
    const view = app.render();
    assert.equal(view.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], override.isPaused ? 'pause' : 'surgery');
    assert.doesNotMatch(content(view.byClass('mrd-orbit-phase-title')), /Volání pacienta|Příjezd pacienta/);
    assert.deepEqual(app.events, []);
  }
  assert.equal(clock.timers.filter(timer => timer.delay === 2000).length, 0);
});

test('feedback cleanup cancels and invalidates its timer on room, hospital and unmount boundaries', async t => {
  const clock = fakeTimeouts(t);
  for (const boundary of ['room', 'hospital', 'unmount']) {
    const context = { captureEffects: true, captureStateWrites: true, activeHospitalId: 'hospital-a' };
    const app = harness({}, context);
    const feedbackEffect = () => {
      const selected = app.effects.filter(entry => entry.dependencies?.length === 2
        && entry.dependencies[0] === app.props.room.id && entry.dependencies[1] === context.activeHospitalId);
      assert.equal(selected.length, 1, 'Run only the presentation cleanup effect, never other clinical effects');
      return selected[0].effect;
    };
    app.render();
    const cleanup = feedbackEffect()();
    assert.equal(typeof cleanup, 'function');
    app.render();
    await app.render().button('Volat pacienta').props.onClick();
    const timer = clock.timers.filter(entry => entry.delay === 2000).at(-1);
    assert.equal(content(app.render().byClass('mrd-orbit-phase-title')), 'Volání pacienta');
    const beforeCleanup = app.stateWrites.length;
    cleanup();
    assert.equal(timer.cleared, true, `${boundary} cleanup must cancel its pending timer`);
    assert.equal(app.stateWrites.length, beforeCleanup, 'Cleanup must not set component state after unmount');
    if (boundary !== 'unmount') {
      if (boundary === 'room') app.props.room = { ...baseRoom, id: 'another-room' };
      else context.activeHospitalId = 'hospital-b';
      app.render();
      const nextCleanup = feedbackEffect()();
      const view = app.render();
      assert.equal(view.byClass('mrd-orbit-phase-icon')[0].props['data-phase-icon'], 'surgery', 'The new room or hospital scope must start without another scope’s feedback');
      const writes = app.stateWrites.length;
      timer.run();
      assert.equal(app.stateWrites.length, writes, 'A stale canceled callback must not write into the new scope');
      nextCleanup();
    } else {
      timer.run();
      assert.equal(app.stateWrites.length, beforeCleanup, 'A stale callback must not write state after unmount');
    }
    assert.deepEqual(app.events.map(event => event.event_type), ['patient_call'], 'Presentation cleanup must not create a clinical event');
  }
});

test('personnel rows open the matching existing picker and retain assignment/unassignment', () => {
  for (const [index, role, filterRole] of [[0, 'doctor', 'DOCTOR'], [1, 'nurse', 'NURSE']]) {
    const calls = [];
    const app = harness({ onStaffChange: (...args) => calls.push(args) });
    app.render().byClass('mrd-staff-row')[index].props.onClick();
    const picker = app.render().overlay('staff-picker');
    assert.equal(picker.props.isOpen, true);
    assert.equal(picker.props.filterRole, filterRole);
    picker.props.onSelect('test-staff', 'Testovací personál');
    picker.props.onUnassign();
    assert.deepEqual(calls, [[role, 'test-staff', 'Testovací personál'], [role, '', '']]);
  }
});
