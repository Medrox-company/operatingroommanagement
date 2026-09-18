import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

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

function harness(overrides = {}) {
  const state = [];
  let cursor = 0;
  const events = [];
  const imports = {
    react: {
      ...React,
      memo: fn => fn,
      useMemo: fn => fn(),
      useCallback: fn => fn,
      useEffect: () => {},
      useRef: value => ({ current: value }),
      useState: initial => {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
    },
    'framer-motion': { motion: new Proxy({}, { get: (_object, tag) => tag }), AnimatePresence: 'animate-presence' },
    'lucide-react': require('lucide-react'),
    '../contexts/WorkflowStatusesContext': { useWorkflowStatusesContext: () => ({ workflowStatuses: statuses }) },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'test-hospital' }) },
    '../hooks/useSharedClock': { useNowMs: () => Date.now() },
    '../lib/db': { recordStatusEvent: async event => { events.push(event); } },
    './StaffPickerModal': { default: 'staff-picker' },
    './StepConfirmationOverlay': { default: 'step-confirmation' },
    './NotificationOverlay': { default: 'notification-overlay' },
    './mobile/MobileShell': { MobileThemeToggle: 'theme-toggle' },
    './room/RapidSurgeryWarning': { RapidSurgeryWarning: 'rapid-warning' },
    './ModulePageHeading': { default: 'module-heading' },
    './mobile/mobile-room-detail.css': {},
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
    props,
    render() {
      cursor = 0;
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

test('mobile detail has real room data, two timing cards, two staff roles and all four actions', () => {
  const view = harness().render();
  assert.ok(content(view.mobile).includes(baseRoom.name));
  assert.equal(view.byClass('mrd-time-card').length, 2);
  assert.equal(view.byClass('mrd-staff-row').length, 2);
  assert.ok(content(view.byClass('mrd-section-heading')).includes('1 / 2'));
  assert.deepEqual(view.byClass('mrd-action').map(content), ['Pauza', 'Hygiena', 'Volat', 'Příjezd']);
  const [steps] = view.byClass('mrd-phase-steps');
  assert.equal(elements(steps, element => element.type === 'button').length, 0, 'Phase rail must not allow skipping');
  assert.equal(elements(steps, element => element.props['aria-current'] === 'step').length, 1);
});

test('active phase emphasis and counter follow the configured workflow, not the reference mockup', () => {
  for (const index of [1, 2]) {
    const view = harness({ room: { ...baseRoom, currentStepIndex: index } }).render();
    assert.equal(view.mobile.props.style['--room-phase-color'], statuses[index].color);
    assert.equal(view.byClass('mrd-phase-card')[0].props['data-emphasized'], 'true');
    assert.equal(content(view.byClass('mrd-phase-count')), `${index + 1}/${statuses.length}`);
    assert.equal(view.byClass('mrd-phase-count')[0].props['aria-label'], `Fáze ${index + 1} z ${statuses.length}`);
    const [meta] = view.byClass('mrd-phase-meta');
    assert.ok(content(meta).includes('Aktuální fáze'));
  }
});

test('ready room stays neutral while pause and emergency retain their distinct emphasis', () => {
  const ready = harness({ room: { ...baseRoom, currentStepIndex: 0 } }).render();
  assert.equal(ready.byClass('mrd-phase-card')[0].props['data-emphasized'], undefined);
  assert.equal(content(ready.byClass('mrd-phase-count')), '1/3');
  for (const [override, color] of [
    [{ isPaused: true, pausedAt: new Date().toISOString() }, '#06b6d4'],
    [{ isEmergency: true }, '#FF3B30'],
    [{ isLocked: true }, '#FBBF24'],
  ]) {
    const view = harness({ room: { ...baseRoom, currentStepIndex: 0, ...override } }).render();
    assert.equal(view.byClass('mrd-phase-card')[0].props['data-emphasized'], 'true');
    assert.equal(view.mobile.props.style['--room-phase-color'], color);
  }
});

test('phase surface uses live status color and theme-aware readable accents', () => {
  const css = readFileSync(new URL('../../components/mobile/mobile-room-detail.css', import.meta.url), 'utf8');
  const emphasized = css.match(/\.mrd-phase-card\[data-emphasized=true\]\s*\{([^}]+)\}/)?.[1];
  assert.ok(emphasized);
  assert.match(emphasized, /radial-gradient/);
  assert.match(emphasized, /linear-gradient/);
  assert.match(emphasized, /var\(--room-phase-color\)/);
  assert.match(emphasized, /var\(--m-card-solid\)/);
  assert.match(css, /\.m-dark \.mobile-room-reference \.mrd-phase-card/);
  assert.match(css, /\.mrd-phase-runtime strong\s*\{ color: var\(--mrd-phase-ink\)/);
  assert.match(css, /\.mrd-step-marker\s*\{[^}]*color: var\(--room-phase-on-color\)/);
});

test('both mobile phase controls open the existing confirmation before changing status', () => {
  for (const control of ['hero', 'footer']) {
    const calls = [];
    const app = harness({ onStepChange: (...args) => calls.push(args) });
    let view = app.render();
    const button = control === 'hero' ? view.button('Přejít na další fázi') : view.byClass('mrd-next-button')[0];
    button.props.onClick();
    assert.equal(calls.length, 0, 'A click alone must not advance clinical state');
    view = app.render();
    assert.equal(view.overlay('step-confirmation').props.pendingStepIndex, 2);
    view.overlay('step-confirmation').props.onCancel();
    assert.equal(calls.length, 0);
    app.render().byClass('mrd-next-button')[0].props.onClick();
    app.render().overlay('step-confirmation').props.onConfirm();
    assert.deepEqual(calls, [[2, '#6366F1']]);
  }
});

test('pause and final-step lock block phase advancement and estimated-time changes', () => {
  for (const room of [
    { ...baseRoom, isPaused: true, pausedAt: new Date().toISOString() },
    { ...baseRoom, isLocked: true, currentStepIndex: 2 },
  ]) {
    const calls = [];
    const app = harness({ room, onStepChange: (...args) => calls.push(args) });
    const view = app.render();
    assert.equal(view.byClass('mrd-next-button')[0].props.disabled, true);
    assert.equal(view.byClass('mrd-phase-advance')[0].props.disabled, true);
    assert.equal(view.button('Prodloužit odhadovaný čas o 15 minut').props.disabled, true);
    assert.equal(view.button('Zkrátit odhadovaný čas o 15 minut').props.disabled, true);
    view.byClass('mrd-next-button')[0].props.onClick();
    assert.equal(calls.length, 0);
    assert.equal(app.render().overlay('step-confirmation').props.pendingStepIndex, null);
    assert.equal(view.byClass('mrd-action').length, 4, 'Disabled actions remain visible');
  }
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

test('Volat and Příjezd remain labelled after use and retain one-call/arrival sequencing', async t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  const calls = [];
  const app = harness({ onPatientStatusChange: (...args) => calls.push(args) });
  assert.equal(app.render().button('Potvrdit příjezd pacienta').props.disabled, true);
  await app.render().button('Volat pacienta').props.onClick();
  let view = app.render();
  assert.equal(view.button('Volat pacienta').props.disabled, true);
  assert.ok(content(view.button('Volat pacienta')).startsWith('Volat'));
  assert.equal(view.button('Potvrdit příjezd pacienta').props.disabled, false);
  await view.button('Volat pacienta').props.onClick();
  assert.equal(calls.length, 1);
  await view.button('Potvrdit příjezd pacienta').props.onClick();
  view = app.render();
  assert.equal(view.button('Potvrdit příjezd pacienta').props.disabled, true);
  assert.ok(content(view.button('Potvrdit příjezd pacienta')).includes('Příjezd'));
  assert.deepEqual(app.events.map(event => event.event_type), ['patient_call', 'patient_arrived']);
  assert.equal(calls[1][0], calls[0][0]);
  assert.ok(Number.isFinite(Date.parse(calls[1][1])));
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

const detailStyles = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-room-detail.css', import.meta.url), 'utf8'));

function styleDeclarations(selector, containerCondition = null) {
  const values = {};
  detailStyles.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    let container = null;
    for (let ancestor = rule.parent; ancestor; ancestor = ancestor.parent) {
      if (ancestor.type === 'atrule' && ancestor.name === 'container') container = ancestor.params;
    }
    if (containerCondition === null ? container !== null : !containerCondition.test(container || '')) return;
    rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

test('mobile detail uses its available viewport and a flowing footer with one navigation reservation', () => {
  const shell = styleDeclarations('.mobile-room-detail.mobile-room-reference');
  assert.equal(shell.container, 'room-detail / size');
  assert.equal(shell['min-height'], '0');
  const body = styleDeclarations('.mobile-room-detail.mobile-room-reference > .mrd-scroll-content');
  assert.equal(body.flex, '1 1 auto');
  assert.equal(body['min-height'], '0');
  assert.match(body.gap, /cqh/, 'Spacing must follow the available container height');
  assert.equal(body.padding, '0 var(--m-page-gutter) 0', 'Do not reserve the tab bar twice');
  const footer = styleDeclarations('.mobile-room-reference .mrd-footer');
  assert.equal(footer.flex, '0 0 auto');
  const reservedBottom = Number(footer.padding.match(/calc\((\d+)px \+ env\(safe-area-inset-bottom, 0px\)\)/)?.[1]);
  assert.ok(reservedBottom >= 70 && reservedBottom <= 78, 'Reserve the 70px tab bar plus a small inset and the safe area');
  detailStyles.walkRules(rule => {
    if (!rule.selectors.includes('.mobile-room-reference .mrd-footer')) return;
    rule.walkDecls('position', declaration => assert.ok(!['fixed', 'absolute'].includes(declaration.value), 'The CTA must participate in layout, not cover controls'));
  });
});

test('compact detail fits four actions and two personnel assignments without shrinking touch targets', () => {
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-actions')['grid-template-columns'], 'repeat(4, minmax(0, 1fr))');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-staff-list')['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  for (const selector of [
    '.mobile-room-reference .mrd-action',
    '.mobile-room-reference .mrd-staff-row',
    '.mobile-room-reference .mrd-next-button',
    '.mobile-room-reference .mrd-time-adjustments button',
  ]) {
    detailStyles.walkRules(rule => {
      if (!rule.selectors.includes(selector)) return;
      rule.walkDecls('min-height', declaration => assert.ok(parseFloat(declaration.value) >= 44, `${selector} must keep a 44px touch target`));
    });
  }
  const compact = /room-detail \(max-height: 900px\)/;
  const estimate = styleDeclarations('.mobile-room-reference .mrd-time-card--estimate', compact);
  assert.equal(estimate.display, 'grid');
  assert.equal(estimate['grid-template-columns'], '44px minmax(0, 1fr) 44px');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-time-adjustments', compact).display, 'contents');
  const view = harness().render();
  assert.equal(view.byClass('mrd-time-card--estimate').length, 1);
  assert.equal(elements(view.byClass('mrd-time-card--estimate'), element => element.type === 'button').length, 2);
});

test('compact phase rail shows every marker and keeps full phase names accessible', () => {
  const compact = /room-detail \(max-height: 900px\)/;
  const rail = styleDeclarations('.mobile-room-reference .mrd-phase-steps', compact);
  assert.equal(rail.overflow, 'visible');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-phase-steps li', compact).flex, '1 1 0');
  const label = styleDeclarations('.mobile-room-reference .mrd-step-name', compact);
  assert.notEqual(label.display, 'none', 'Phase names must remain in the accessibility tree');
  assert.notEqual(label.visibility, 'hidden');
  assert.equal(label['clip-path'], 'inset(50%)');
  const view = harness().render();
  for (const status of statuses) assert.ok(content(view.byClass('mrd-phase-steps')).includes(status.title));
});

test('short landscape has a two-column layout instead of scaling down clinical controls', () => {
  const landscape = /room-detail \(min-width: 500px\) and \(max-height: 500px\)/;
  const body = styleDeclarations('.mobile-room-detail.mobile-room-reference > .mrd-scroll-content', landscape);
  assert.equal(body.display, 'contents');
  const shell = styleDeclarations('.mobile-room-detail.mobile-room-reference');
  assert.equal(shell.display, 'grid');
  assert.equal(shell['grid-template-columns'], 'minmax(0, 1fr) minmax(0, 1fr)');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-phase-card', landscape)['grid-column'], '1');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-timing', landscape)['grid-column'], '2');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-staff', landscape)['grid-column'], '2');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-actions', landscape)['grid-column'], '1');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-footer', landscape)['grid-column'], '2');
  assert.equal(styleDeclarations('.mobile-room-reference .mrd-footer', landscape)['grid-row'], '4');
  detailStyles.walkDecls('transform', declaration => assert.doesNotMatch(declaration.value, /scale\(/));
});
