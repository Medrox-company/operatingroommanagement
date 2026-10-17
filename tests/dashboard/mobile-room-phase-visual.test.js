import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Run the actual pure display helper. Database, React and browser imports would
// fail here rather than silently making these tests depend on clinical state.
const source = readFileSync(new URL('../../lib/mobile-room-phase-visual.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'mobile-room-phase-visual.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const mod = { exports: {} };
new Function('require', 'exports', 'module', outputText)(name => {
  assert.fail(`Phase visuals must not load runtime dependencies: ${name}`);
}, mod.exports, mod);
const { mobileRoomPhaseVisual } = mod.exports;

const examples = {
  ready: ['Sál připraven', 'Připravený operační sál', 'Sál připraven po úklidu', 'Ready', 'Operating room ready'],
  preparation: ['Příprava sálu', 'Příprava operačního sálu', 'Room preparation', 'Preparation of the operating room'],
  arrival: ['Příjezd na sál', 'Příjem pacienta', 'Příjem pacienta na sál', 'Patient arrival to the operating room', 'Patient admission'],
  anesthesia: ['Začátek anestezie', 'Zahájení anestezie', 'Anestezie', 'Anesthesia start', 'Anaesthesia'],
  'anesthesia-end': ['Ukončení anestezie', 'Konec anestezie', 'Anesthesia end', 'Anaesthesia completed', 'End of anesthesia'],
  surgery: ['Chirurgický výkon', 'Operační výkon', 'Zahájení chirurgického výkonu', 'Surgery', 'Surgical procedure'],
  'surgery-end': ['Ukončení výkonu', 'Ukončení chirurgického výkonu', 'Dokončení operačního výkonu', 'Surgery completed', 'End of surgery'],
  departure: ['Odjezd ze sálu', 'Odvoz pacienta z operačního sálu', 'Patient departure', 'Patient discharge'],
  handover: ['Předání pacienta', 'Patient handover', 'Hand over', 'Transfer of care'],
  cleaning: ['Úklid sálu', 'Zahájení úklidu', 'Dezinfekce sálu', 'Cleaning', 'Operating room cleaning'],
  documentation: ['Závěrečná dokumentace', 'Dokumentace', 'Final documentation', 'Clinical records'],
};

for (const [kind, names] of Object.entries(examples)) {
  test(`${kind} uses its own thematic visual for Czech and English labels`, () => {
    for (const name of names) {
      assert.deepEqual(mobileRoomPhaseVisual({ name, color: '#A813C8' }), { kind, color: '#A813C8' }, name);
    }
  });
}

test('normalization handles decomposed Czech, case, whitespace, underscores and typographic dashes', () => {
  for (const name of ['  SÁL   PŘIPRAVEN  ', 'Sál připraven'.normalize('NFD'), 'sál_připraven', 'sál—připraven']) {
    assert.equal(mobileRoomPhaseVisual({ name }).kind, 'ready', name);
  }
  assert.equal(mobileRoomPhaseVisual({ name: '  ANESTHESIA–END  ' }).kind, 'anesthesia-end');
});

test('recognized title wins, while a custom or missing title falls back to the phase name', () => {
  assert.equal(mobileRoomPhaseVisual({ title: 'Příprava sálu', name: 'Surgery' }).kind, 'preparation');
  assert.equal(mobileRoomPhaseVisual({ title: 'Probíhá výkon', name: 'Chirurgický výkon' }).kind, 'surgery');
  assert.equal(mobileRoomPhaseVisual({ title: ' ', name: 'Úklid sálu' }).kind, 'cleaning');
  assert.equal(mobileRoomPhaseVisual({ title: null, name: 'Předání pacienta' }).kind, 'handover');
});

test('completed and end phases never receive the generic active procedure icon', () => {
  for (const name of ['Ukončení chirurgického výkonu', 'Surgical procedure completed', 'Operation end']) {
    assert.equal(mobileRoomPhaseVisual({ name }).kind, 'surgery-end', name);
  }
  for (const name of ['Ukončení anestezie', 'Anesthesia complete', 'Anaesthesia ended']) {
    assert.equal(mobileRoomPhaseVisual({ name }).kind, 'anesthesia-end', name);
  }
});

test('reordering or renumbering configured phases cannot change their visual kind or color', () => {
  const phases = [
    { id: 'custom-id-c', order_index: 90, name: 'Úklid sálu', color: '#F59E0B' },
    { id: 'custom-id-a', order_index: 30, name: 'Sál připraven', color: '#08BA95' },
    { id: 'custom-id-b', order_index: 10, name: 'Chirurgický výkon', color: '#FF5178' },
  ];
  const byName = new Map(phases.map(phase => [phase.name, mobileRoomPhaseVisual(phase)]));
  for (const phase of [...phases].reverse()) {
    assert.deepEqual(mobileRoomPhaseVisual({ ...phase, id: 'changed-id', order_index: 0 }), byName.get(phase.name));
  }
});

test('configured accent is preferred without recoloring or replacing a custom phase color', () => {
  assert.equal(mobileRoomPhaseVisual({ accent_color: '#bA18eF', color: '#0049F5' }).color, '#bA18eF');
  assert.equal(mobileRoomPhaseVisual({ accent_color: '  #9aC  ', color: '#0049F5' }).color, '#9aC');
  for (const color of ['#FFF', '#09AF', '#00FFEE', '#0049F5FF']) {
    assert.equal(mobileRoomPhaseVisual({ color }).color, color);
  }
  assert.deepEqual(mobileRoomPhaseVisual({ name: 'Vlastní fáze', color: '#E341A7' }), { kind: 'unknown', color: '#E341A7' });
});

test('invalid or absent configured colors fall through safely to color and then neutral', () => {
  for (const invalid of [undefined, null, '', ' ', '#12', '#GGGGGG', 'red', 'transparent', 'url(/unsafe)', '#12345', '#1234567']) {
    assert.equal(mobileRoomPhaseVisual({ accent_color: invalid, color: '#048A6B' }).color, '#048A6B');
    assert.equal(mobileRoomPhaseVisual({ accent_color: invalid, color: invalid }).color, '#7890A8');
  }
});

test('unknown, empty or missing phases remain neutral rather than pretending to be surgery', () => {
  for (const phase of [undefined, null, {}, { name: null }, { name: '' }, { name: '   ' }, { name: 'Vlastní fáze' }, { name: 'Neurochirurgie' }, { name: 'Operatingroom Manager' }]) {
    assert.deepEqual(mobileRoomPhaseVisual(phase), { kind: 'unknown', color: '#7890A8' });
  }
});

test('visual lookup does not mutate a configured phase or infer emergency, lock and pause states', () => {
  const phase = Object.freeze({ name: 'Chirurgický výkon', accent_color: '#A019CA', isEmergency: true, isLocked: true, isPaused: true });
  assert.deepEqual(mobileRoomPhaseVisual(phase), { kind: 'surgery', color: '#A019CA' });
  assert.equal(phase.accent_color, '#A019CA');
});
