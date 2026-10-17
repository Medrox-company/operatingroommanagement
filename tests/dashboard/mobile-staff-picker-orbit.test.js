import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = postcss.parse(read('components/mobile/mobile-staff-picker-orbit.css'));
const source = read('components/StaffPickerModal.tsx');
test('staff appearance only applies to optional Cliniq mobile, never shared schedule dialogs', () => {
  css.walkRules(rule => {
    for (const selector of rule.selectors) assert.match(selector, /^html\[data-app-design="cliniq"\](?: \.staff-picker-|:has\(\.staff-picker-overlay\) \.mobile-reference-nav$)/);
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media' && /max-width:\s*767px/.test(parent.params))) parent = parent.parent;
    assert.ok(parent);
  });
  assert.match(source, /import '\.\/mobile\/mobile-staff-picker-orbit.css'/);
});
test('staff popup shares Orbit artwork and retains readable search, scrolling and state cues', () => {
  const text = css.toString();
  assert.match(text, /mobile-orbit-background-v3\.png/);
  assert.match(text, /staff-picker-search input \{[^}]*font-size: 16px/s);
  assert.match(text, /safe-area-inset-bottom/);
  assert.match(text, /staff-picker-list \{[^}]*min-height: 0/s);
  assert.match(text, /staff-picker-person\[data-selected="true"\]/);
  assert.match(text, /staff-picker-person:disabled/);
  assert.match(text, /:focus-visible/);
  css.walkDecls('filter', () => assert.fail('Foreground content must stay sharp'));
});

// Exercise the real picker with synthetic staff; never connect to clinical IO.
const require = createRequire(import.meta.url);
function renderPicker({ query = '', current = null, role = 'DOCTOR' } = {}) {
  let slot = 0;
  const selected = [];
  let closed = 0;
  let unassigned = 0;
  const staff = [
    { id: 'free', name: 'Test Volný', role: 'DOCTOR' },
    { id: 'busy', name: 'Test Obsazený', role: 'DOCTOR' },
    { id: 'leave', name: 'Test Dovolená', role: 'DOCTOR', vacation_days: 2 },
    { id: 'nurse', name: 'Test Sestra', role: 'NURSE' },
  ];
  const imports = {
    react: { ...React, useState: () => [[query, staff, false][slot++], () => {}], useEffect: () => {}, useMemo: factory => factory(), useRef: () => ({ current: null }) },
    'framer-motion': { motion: { div: 'div', button: 'button' }, AnimatePresence: 'presence', useReducedMotion: () => true },
    'lucide-react': require('lucide-react'),
    '../lib/supabase': { supabase: null, isSupabaseConfigured: false },
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'test-only' }) },
    './mobile/mobile-staff-picker-orbit.css': {},
  };
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(Object.hasOwn(imports, name), name);
    return imports[name];
  }, module, module.exports);
  const tree = module.exports.default({ isOpen: true, filterRole: role, currentStaffId: current,
    currentStaffName: current ? 'Test Volný' : null, currentRoomId: 'here',
    allRooms: [{ id: 'elsewhere', name: 'Test sál', staff: { doctor: { id: 'busy' } } }],
    onSelect: (...args) => selected.push(args), onClose: () => closed++, onUnassign: () => unassigned++,
  });
  const buttons = [];
  const visit = node => {
    if (!React.isValidElement(node)) return;
    if (node.type === 'button') buttons.push(node);
    React.Children.forEach(node.props.children, visit);
  };
  visit(tree);
  return { buttons, selected, closed: () => closed, unassigned: () => unassigned,
    people: buttons.filter(button => button.props.className?.includes('staff-picker-person')) };
}
test('role filtering and free-person selection keep original callbacks', () => {
  const app = renderPicker();
  assert.deepEqual(app.people.map(person => person.key), ['free']);
  app.people[0].props.onClick();
  assert.deepEqual(app.selected, [['free', 'Test Volný']]);
  assert.equal(app.closed(), 1);
  assert.deepEqual(renderPicker({ role: 'NURSE' }).people.map(person => person.key), ['nurse']);
});
test('searched unavailable people remain disabled and selected staff retains its check state', () => {
  const app = renderPicker({ query: 'Test', current: 'free' });
  assert.equal(app.people.find(person => person.key === 'free').props['data-selected'], true);
  for (const id of ['busy', 'leave']) {
    const person = app.people.find(person => person.key === id);
    assert.equal(person.props.disabled, true);
    person.props.onClick();
  }
  assert.deepEqual(app.selected, []);
  app.buttons.find(button => button.props.className?.includes('staff-picker-unassign')).props.onClick();
  assert.equal(app.unassigned(), 1);
  assert.equal(app.closed(), 1);
});
