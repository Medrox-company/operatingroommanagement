import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// These bounded tests inspect the component's returned element props and invoke
// its handlers. Hooks are synchronous stubs: this is not a React lifecycle,
// browser event-dispatch, accessibility-tree, or responsive-layout test.
// Contexts are mocked so no live data, browser APIs, or database is accessed.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../components/RoomCard.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'RoomCard.tsx',
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

const dayStart = Date.parse('2026-09-14T05:00:00Z');
const dayEnd = Date.parse('2026-09-15T04:59:59.999Z');
let nextId = 0;
const reactStub = {
  ...React,
  memo: (component) => component,
  useMemo: (factory) => factory(),
  useId: () => `room-card-test-${++nextId}`,
};
const moduleStub = { exports: {} };
const imports = {
  react: reactStub,
  'lucide-react': require('lucide-react'),
  '../contexts/WorkflowStatusesContext': {
    useWorkflowStatusesContext: () => ({
      workflowStatuses: [
        { name: 'Sál připraven', title: 'Sál připraven', accent_color: '#6B7280' },
        { name: 'Začátek chirurgického výkonu', title: 'Chirurgický výkon', accent_color: '#EF4444' },
      ],
    }),
  },
  '../hooks/useOperationalDayWindow': {
    useOperationalDayWindow: () => ({ start: dayStart, end: dayEnd }),
  },
};
new Function('require', 'exports', 'module', outputText)(
  (name) => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected component dependency: ${name}`);
    return imports[name];
  },
  moduleStub.exports,
  moduleStub,
);
const RoomCard = moduleStub.exports.default;

const baseRoom = {
  id: 'room-1',
  name: 'Operační sál 1',
  department: 'Chirurgie',
  currentStepIndex: 1,
  isEmergency: false,
  isLocked: false,
  isPaused: false,
  staff: { doctor: { name: 'Jan Novák' }, nurse: { name: 'Eva Malá' } },
  completedOperations: [
    { endedAt: '2026-09-14T10:00:00Z' },
    { endedAt: '2026-09-14T04:59:59Z' },
    { endedAt: '2026-09-15T05:00:00Z' },
    {},
  ],
};

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

function render(overrides = {}) {
  const tree = RoomCard({ room: baseRoom, ...overrides });
  const cards = elements(tree, (node) => node.props.role === 'button');
  assert.equal(cards.length, 2, 'Both mobile and desktop cards must be covered');
  return { tree, cards };
}

function keyEvent(key, currentTarget, target = currentTarget) {
  return {
    key,
    currentTarget,
    target,
    prevented: 0,
    preventDefault() { this.prevented += 1; },
  };
}

test('both card controls open detail using Enter or Space only when the card owns focus', () => {
  let details = 0;
  const { cards } = render({ onClick: () => { details += 1; } });
  for (const card of cards) {
    assert.equal(card.props.tabIndex, 0);
    for (const key of ['Enter', ' ']) {
      const event = keyEvent(key, card);
      const before = details;
      card.props.onKeyDown(event);
      assert.equal(details, before + 1);
      assert.equal(event.prevented, 1);
    }
    const unrelated = keyEvent('Escape', card);
    const before = details;
    card.props.onKeyDown(unrelated);
    assert.equal(details, before);
    assert.equal(unrelated.prevented, 0);
  }
});

test('nested emergency and lock actions keep keyboard events and stop click propagation', () => {
  let details = 0;
  const emergencies = [];
  const locks = [];
  const { cards } = render({
    onClick: () => { details += 1; },
    onEmergency: (event) => emergencies.push(event),
    onLock: (event) => locks.push(event),
  });
  for (const card of cards) {
    const buttons = elements(card, (node) => node.type === 'button');
    assert.equal(buttons.length, 2);
    for (const [index, button] of buttons.entries()) {
      assert.equal(button.props.type, 'button');
      assert.equal(button.props['aria-pressed'], false);
      for (const key of ['Enter', ' ']) {
        const event = keyEvent(key, card, button);
        card.props.onKeyDown(event);
        assert.equal(details, 0);
        assert.equal(event.prevented, 0, 'The nested button must retain native keyboard handling');
      }
      const click = { stopped: 0, stopPropagation() { this.stopped += 1; } };
      const calls = index === 0 ? emergencies : locks;
      const before = calls.length;
      button.props.onClick(click);
      assert.equal(click.stopped, 1);
      assert.equal(calls.length, before + 1);
      assert.equal(calls.at(-1), click);
      assert.equal(details, 0);
    }
  }
  assert.equal(emergencies.length, 2);
  assert.equal(locks.length, 2);
});

test('both cards reference an external accessible description with operational information', () => {
  const { tree, cards } = render({ specialties: [
    { departmentId: 'surgery', name: 'Chirurgie', dayPart: 'AM' },
    { departmentId: 'urology', name: 'Urologie', dayPart: 'PM' },
  ] });
  const descriptionId = cards[0].props['aria-describedby'];
  assert.ok(descriptionId);
  const descriptions = elements(tree, (node) => node.props.id === descriptionId);
  assert.equal(descriptions.length, 1);
  const description = descriptions[0];
  assert.equal(description.props.className, 'sr-only');
  for (const card of cards) {
    assert.equal(card.props['aria-label'], 'Otevřít detail sálu Operační sál 1');
    assert.equal(card.props['aria-describedby'], descriptionId);
    assert.equal(elements(card, (node) => node === description).length, 0);
  }
  const text = textContent(description).replace(/\s+/g, ' ');
  for (const expected of [
    'Chirurgický výkon.', 'Dokončené cykly: 1.',
    'Dopoledne: Chirurgie.', 'Odpoledne: Urologie.',
    'Lékař: Jan Novák.', 'Sestra: Eva Malá.',
  ]) assert.ok(text.includes(expected), `Missing description content: ${expected}`);

  const another = render().cards[0].props['aria-describedby'];
  assert.notEqual(another, descriptionId, 'Different cards must not share description IDs');
});

test('accessible descriptions prioritize emergency, lock, and pause states', () => {
  for (const [overrides, expected] of [
    [{ isEmergency: true, isLocked: true, isPaused: true }, 'Nouzový stav.'],
    [{ isLocked: true, isPaused: true }, 'Sál uzamčen.'],
    [{ isPaused: true }, 'Pozastaveno.'],
  ]) {
    const { tree, cards } = render({ room: { ...baseRoom, ...overrides } });
    const [description] = elements(tree, (node) => node.props.id === cards[0].props['aria-describedby']);
    assert.ok(textContent(description).startsWith(expected));
    for (const card of cards) {
      const [emergency, lock] = elements(card, (node) => node.type === 'button');
      assert.equal(emergency.props['aria-pressed'], Boolean(overrides.isEmergency));
      assert.equal(lock.props['aria-pressed'], Boolean(overrides.isLocked));
    }
  }
});

test('AM and PM assignments render in their corresponding visible specialty fields', () => {
  const { cards } = render({ specialties: [
    { departmentId: 'urology', name: 'Urologie', dayPart: 'PM' },
    { departmentId: 'orthopedics', name: 'Ortopedická chirurgie', dayPart: 'AM' },
  ] });
  for (const card of cards) {
    const slots = elements(card, (node) => node.props.className === 'dashboard-specialty-slot');
    assert.deepEqual(slots.map(textContent), ['Dopol.Ortopedie', 'Odpol.Urologie']);
    assert.deepEqual(slots.map((slot) => slot.props.title), ['Ortopedie · dopoledne', 'Urologie · odpoledne']);
  }
});

test('a full-day specialty occupies both fields and both accessible day-part descriptions', () => {
  const { tree, cards } = render({ specialties: [
    { departmentId: 'urology', name: 'Urologie', dayPart: 'AM' },
    { departmentId: 'surgery', name: 'Chirurgie', dayPart: 'FULL_DAY' },
    { departmentId: 'orthopedics', name: 'Ortopedie', dayPart: 'PM' },
  ] });
  for (const card of cards) {
    const slots = elements(card, (node) => node.props.className === 'dashboard-specialty-slot');
    assert.deepEqual(slots.map(textContent), ['Dopol.Chirurgie', 'Odpol.Chirurgie']);
  }
  const [description] = elements(tree, (node) => node.props.id === cards[0].props['aria-describedby']);
  const text = textContent(description);
  assert.ok(text.includes('Dopoledne: Chirurgie.'));
  assert.ok(text.includes('Odpoledne: Chirurgie.'));
});

test('missing specialty and personnel data retains readable fallback descriptions', () => {
  const { tree, cards } = render({ room: { ...baseRoom, staff: {} } });
  const [staffLabel] = elements(tree, (node) => node.props.className?.includes('dashboard-staff-name'));
  assert.equal(textContent(staffLabel), 'Personál');
  assert.equal(staffLabel.props.title, 'Personál');
  for (const card of cards) {
    const slots = elements(card, (node) => node.props.className === 'dashboard-specialty-slot');
    assert.deepEqual(slots.map(textContent), ['Dopol.Bez oboru', 'Odpol.Bez oboru']);
  }
  const [description] = elements(tree, (node) => node.props.id === cards[0].props['aria-describedby']);
  const text = textContent(description);
  for (const expected of ['Dopoledne: bez oboru.', 'Odpoledne: bez oboru.', 'Lékař: neurčen.', 'Sestra: neurčena.']) {
    assert.ok(text.includes(expected), `Missing fallback description: ${expected}`);
  }
});
