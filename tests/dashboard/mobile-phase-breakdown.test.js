import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const compile = path => ts.transpileModule(read(path), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
} }).outputText;
const model = { exports: {} };
new Function('exports', 'module', compile('lib/mobile-phase-breakdown.ts'))(model.exports, model);
const { mobilePhaseBreakdown: breakdown, phaseDurationLabel: duration } = model.exports;
const at = minute => Date.UTC(2026, 9, 18, 8, minute);
const entry = (minute, stepIndex, extra = {}) => ({ startedAt: new Date(at(minute)).toISOString(), stepIndex, ...extra });
const statuses = [{ name: 'Sál připraven' }, { name: 'Příjezd', color: '#00aa00' }, { name: 'Výkon', color: '#aa0000' }];

test('recorded phase ranges retain repeats, historical labels and exact bounded durations', () => {
  const history = [entry(40, 1), entry(10, 1), entry(20, 2, { stepName: 'Původní výkon', color: '#123456' })];
  const original = structuredClone(history);
  const rows = breakdown(history, statuses, at(15), at(50), true);
  assert.deepEqual(rows.map(row => [row.stepIndex, row.startMs, row.endMs, row.live]), [
    [1, at(15), at(20), false], [2, at(20), at(40), false], [1, at(40), at(50), true],
  ]);
  assert.equal(rows[1].name, 'Původní výkon');
  assert.equal(rows[1].color, '#123456');
  assert.deepEqual(history, original);
});

test('missing, invalid, reversed and future records never become estimated phase times', () => {
  assert.deepEqual(breakdown([], statuses, at(0), at(60), true), []);
  assert.deepEqual(breakdown([entry(10, 1)], statuses, NaN, at(60), true), []);
  assert.deepEqual(breakdown([entry(10, 1)], statuses, at(60), at(0), true), []);
  assert.deepEqual(breakdown([entry(90, 1), { stepIndex: 1, startedAt: 'invalid' }], statuses, at(0), at(60), true), []);
  const rows = breakdown([entry(10, 1), entry(10, 2)], statuses, at(0), at(60), false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].startMs, at(10), 'Unrecorded initial gap is not filled');
  assert.equal(rows[0].live, false);
});

test('duration labels support subminute and overnight intervals without rounding up', () => {
  assert.equal(duration(20_000), '< 1 min');
  assert.equal(duration(89_000), '1 min');
  assert.equal(duration(125 * 60_000), '2 h 5 min');
  const rows = breakdown([entry(0, 2)], statuses, at(0), at(1500), false);
  assert.equal(rows[0].endMs - rows[0].startMs, 1500 * 60_000);
});

function content(node) {
  if (Array.isArray(node)) return node.map(content).join(' ');
  if (React.isValidElement(node)) return content(node.props.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
function render(room, cycleEndedAt) {
  const imports = {
    react: { ...React, useEffect: () => {}, useRef: () => ({ current: null }), useState: init => [typeof init === 'function' ? init() : init, () => {}] },
    'react-dom': { createPortal: child => child }, 'lucide-react': require('lucide-react'),
    '../../lib/mobile-phase-breakdown': model.exports,
    '../../lib/mobile-room-display': { mobileRoomPhase: () => ({ title: 'Pauza', color: '#abcdef' }) },
    '../../hooks/useSharedClock': { useNowMsAtGranularity: () => at(60) },
    './mobile-timeline-room-detail.css': {},
  };
  const module = { exports: {} };
  new Function('require', 'exports', 'module', 'document', compile('components/mobile/MobileTimelineRoomDetail.tsx'))(
    name => { assert.ok(name in imports, name); return imports[name]; }, module.exports, module, { body: {} });
  return module.exports.default({ room, statuses, cycleEndedAt, onClose: () => {} });
}
const baseRoom = { id: 'room', name: 'Dlouhý název sálu', currentStepIndex: 2,
  operationStartedAt: new Date(at(0)).toISOString(), statusHistory: [entry(0, 1), entry(10, 2)] };

test('mobile page shows real phase ranges and stops the active phase at a recorded pause', () => {
  const page = render({ ...baseRoom, isPaused: true, pausedAt: new Date(at(40)).toISOString() });
  const text = content(page);
  assert.match(text, /Časy jednotlivých fází/);
  assert.match(text, /30 min/);
  assert.match(text, /Pauza od/);
  assert.match(text, /20 min/);
  assert.doesNotMatch(text, /Probíhá/);
});

test('completed cycle default on a ready room stays fixed; ready room without a cycle has no invented time', () => {
  const completed = { startedAt: new Date(at(0)).toISOString(), endedAt: new Date(at(30)).toISOString(), statusHistory: [entry(0, 1), entry(10, 2)] };
  const page = render({ ...baseRoom, currentStepIndex: 0, completedOperations: [completed] });
  assert.match(content(page), /Dokončený cyklus/);
  assert.match(content(page), /20 min/);
  assert.doesNotMatch(content(page), /Probíhá/);
  const empty = content(render({ ...baseRoom, currentStepIndex: 0 }));
  assert.match(empty, /nemá aktivní cyklus/);
  assert.doesNotMatch(empty, /60 min/);
});

test('only new phone design replaces the popup, preserving underlying timeline and global dock', () => {
  const source = read('components/TimelineModule.tsx');
  assert.match(source, /useMediaQuery\('\(max-width: 767px\)'\)/);
  assert.match(source, /mobilePhaseDetail = phoneViewport && design === 'cliniq'/);
  assert.match(source, /detailRoom && \(mobilePhaseDetail \? <MobileTimelineRoomDetail/);
  assert.match(source, /inert=\{mobilePhaseDetail && Boolean\(detailRoom\)\}/);
  assert.match(source, /<RoomDetailPopup/);
  const component = read('components/mobile/MobileTimelineRoomDetail.tsx');
  assert.match(component, /createPortal/);
  assert.match(component, /addEventListener\('nativeBackButton'/);
  assert.match(component, /removeEventListener\('nativeBackButton'/);
  assert.doesNotMatch(component, /<MobileNav/);
  assert.equal(render(baseRoom).props['aria-modal'], undefined);
  const css = postcss.parse(read('components/mobile/mobile-timeline-room-detail.css'));
  css.walkRules(rule => {
    assert.equal(rule.parent.name, 'media');
    assert.match(rule.parent.params, /max-width: 767px/);
    assert.ok(rule.selectors.every(selector => selector.includes('mobile-phase-')));
  });
  assert.match(css.toString(), /z-index: 90/); // Global dock remains above the page at100.
  assert.match(css.toString(), /safe-area-inset-bottom/);
});
