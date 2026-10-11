import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compiled = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
function load(path, imports = {}) {
  const exports = {};
  new Function('exports', 'require', compiled(readFileSync(new URL(path, import.meta.url), 'utf8')))(exports, name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name.endsWith('.css')) return {};
    return require(name);
  });
  return exports;
}
const display = load('../../components/acute/display.ts');
const cycleDisplay = load('../../lib/acute-module-cycles.ts', { './acute-requests': load('../../lib/acute-requests.ts') });
const dayDisplay = load('../../lib/acute-day-view.ts');
const heading = load('../../components/ModulePageHeading.tsx');
const NOW = Date.parse('2026-10-07T12:50:00Z');
const ui = load('../../components/AcuteRequestsModule.tsx', {
  '../hooks/useAcuteRequests': { useAcuteRequests: () => { throw new Error('QA must not call the live API hook'); } },
  '../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: () => { throw new Error('QA must not call the live cycle API hook'); } },
  '../lib/acute-module-cycles': cycleDisplay,
  '../lib/acute-day-view': dayDisplay,
  '../lib/acute-circular-timeline': {},
  '../hooks/useSharedClock': { useNowMinuteMs: () => NOW },
  './ModulePageHeading': heading,
  './statistics/AppCharts': { DayNavigator: () => null, GlassCalendar: () => null },
  './acute/display': display,
  './acute/AcuteDialogs': {},
  './acute/AcuteCircularTimeline': {},
});
const request = (id, rank, urgency = 'urgent') => ({
  id, hospitalId: 'test-hospital', reference: `AK-${id}`, procedureName: `Výkon ${id}`, department: 'Chirurgie',
  description: '', urgency, estimatedDurationMinutes: 60, clinicalDecisionAt: null, latestStartAt: null,
  receivedAt: '2026-10-07T12:05:00Z', proposedRoomId: null, proposedStartAt: null,
  status: 'pending', queuePosition: rank, acknowledgedAt: null, acknowledgedBy: null, createdBy: 'test-user',
  updatedAt: '2026-10-07T12:05:00Z', revision: 1,
});
const controller = (overrides = {}) => ({
  requests: [], events: [], revision: 0, canManage: true, historyLimited: false,
  loading: false, busy: false, error: null, errorCode: null,
  refresh: async () => undefined, execute: async () => { throw new Error('Unexpected mutation'); }, ...overrides,
});
const render = state => renderToStaticMarkup(React.createElement(ui.default, { rooms: [], controller: state, now: NOW }));
const dialogs = load('../../components/acute/AcuteDialogs.tsx', {
  '../../lib/acute-requests': { ACUTE_INPUT_LIMITS: { durationMin: 1, durationMax: 1440 } },
  '../../lib/acute-module-cycles': cycleDisplay,
  './display': display,
});

test('duration bands preserve saved minutes until changed and map over-60 selection to the approved 120-minute estimate', () => {
  for (const [minutes, band] of [['1', 'up-to-30'], ['30', 'up-to-30'], ['31', 'up-to-60'], ['60', 'up-to-60'], ['61', 'over-60'], ['1440', 'over-60']]) assert.equal(dialogs.acuteDurationBand(minutes), band);
  for (const value of ['', '0', '-1', '30.5', '1441', 'bad']) assert.equal(dialogs.acuteDurationBand(value), '');
  assert.equal(dialogs.selectAcuteDuration('', 'up-to-30'), '30');
  assert.equal(dialogs.selectAcuteDuration('', 'up-to-60'), '60');
  assert.equal(dialogs.selectAcuteDuration('60', 'over-60'), '120');
  assert.equal(dialogs.selectAcuteDuration('', 'over-60'), '120');
  assert.equal(dialogs.selectAcuteDuration('45', 'up-to-60'), '45');
  assert.equal(dialogs.selectAcuteDuration('20', 'up-to-30'), '20');
  assert.equal(dialogs.selectAcuteDuration('200', 'over-60'), '120');
});

test('duration picker exposes three required keyboard-accessible boxes without manual time entry', () => {
  const props = { id: 'duration-picker', band: '', minutes: '', disabled: false, onBandChange() {} };
  const html = renderToStaticMarkup(React.createElement(dialogs.AcuteDurationPicker, props));
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
  assert.equal((html.match(/required=""/g) ?? []).length, 3);
  for (const name of ['Do 30 min', 'Do 60 min', 'Více než 60 min']) assert.ok(html.includes(`aria-label="${name}"`));
  assert.doesNotMatch(html, /checked=""|type="number"/);
  const selected = renderToStaticMarkup(React.createElement(dialogs.AcuteDurationPicker, { ...props, band: 'up-to-60', minutes: '45' }));
  assert.match(selected, /Odhad pro časovou osu: 45 min/);
  assert.equal((selected.match(/checked=""/g) ?? []).length, 1);
  const long = renderToStaticMarkup(React.createElement(dialogs.AcuteDurationPicker, { ...props, band: 'over-60', minutes: '120', disabled: true }));
  assert.match(long, /<fieldset[^>]*disabled=""/);
  assert.doesNotMatch(long, /type="number"|Přesný odhad/);
  assert.match(long, /Odhad pro časovou osu: 120 min/);
  assert.match(long, /Nejde o skutečně naměřený čas/);
  const css = readFileSync(new URL('../../components/acute/acute-requests.css', import.meta.url), 'utf8');
  assert.match(css, /\.acute-duration-option \{[^}]*min-height: 44px/);
  assert.match(css, /\.acute-duration-input:focus-visible \+ \.acute-duration-option/);
});

test('over-60 selection flows through intake into a two-hour unconfirmed timeline block, not a recorded cycle', () => {
  const acute = load('../../lib/acute-requests.ts');
  const proposals = load('../../components/timeline/AcuteProposalLane.tsx', {
    '../../lib/acute-requests': acute, './constants': load('../../components/timeline/constants.ts'),
  });
  const input = dialogs.acuteIntakeInput({ procedureName: 'QA výkon', department: 'QA', description: '', urgency: 'urgent', proposedRoomId: 'qa-room', estimatedDurationMinutes: dialogs.selectAcuteDuration('', 'over-60') }, null);
  assert.equal(input.estimatedDurationMinutes, 120);
  assert.equal(input.proposedStartAt, null, 'Duration selection must not invent a start time');
  const start = Date.parse('2026-10-08T07:00:00Z');
  const [proposal] = proposals.acuteProposalsForWindow([{ ...request('qa', 1), ...input, receivedAt: new Date(start + 60 * 60_000).toISOString() }], 'qa-room', start, start + 240 * 60_000);
  assert.equal(proposal.endMs - proposal.startMs, 120 * 60_000);
  assert.equal(proposal.leftPercent, 25);
  assert.equal(proposal.widthPercent, 50);
  const html = renderToStaticMarkup(React.createElement(proposals.AcuteProposalLane, { proposal, roomName: 'QA sál' }));
  assert.match(html, /120 minut/);
  assert.match(html, /Návrh — nepotvrzeno/);
  const existing = { ...request('legacy', 1), estimatedDurationMinutes: 200 };
  assert.equal(dialogs.acuteIntakeInput({ ...input, estimatedDurationMinutes: '200' }, existing).estimatedDurationMinutes, 200);
});

test('room options preserve exact configured names and the management module saved order', () => {
  const rooms = [
    { id: 'one', name: 'PCHO SÁL Č.2', department: 'CÉVNÍ, DĚTSKÉ, MAMMO', sort_order: 2 },
    { id: 'two', name: 'ORL - ÚČOCH - OČNÍ', department: 'MALÉ OBORY', sort_order: 1 },
    { id: 'three', name: 'Sál s velmi dlouhým neobvyklým názvem bez definované zkratky', department: 'Popis', sort_order: 3 },
  ];
  const options = display.acuteRoomOptions(rooms);
  assert.deepEqual(options.map(option => option.label), [rooms[1].name, rooms[0].name, rooms[2].name]);
  assert.equal(options.length, rooms.length);
  assert.equal(options[0].room, rooms[1]);
  assert.deepEqual(rooms.map(room => room.id), ['one', 'two', 'three']);
  assert.ok(options.every(option => option.label === option.room.name));
  assert.deepEqual(display.acuteRoomOptions([]), []);
  const duplicateNames = display.acuteRoomOptions([rooms[0], { ...rooms[0], id: 'another' }]);
  assert.deepEqual(duplicateNames.map(option => option.label), [rooms[0].name, rooms[0].name]);
  assert.deepEqual(duplicateNames.map(option => option.room.id), ['one', 'another']);
  assert.deepEqual(display.acuteRoomOptions([{ ...rooms[0], sort_order: undefined }, { ...rooms[1], sort_order: 0 }]).map(option => option.room.id), ['one', 'two']);
  assert.equal(display.acuteRoomShortLabel, undefined);
});

test('acute room picker uses the same App rooms source as Operating Rooms, with no preview room fixtures', () => {
  const app = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<AcuteRequestsModule rooms=\{rooms\}/);
  assert.match(app, /<SettingsPage\s+rooms=\{rooms\}/);
  const settings = readFileSync(new URL('../../components/SettingsPage.tsx', import.meta.url), 'utf8');
  assert.match(settings, /<OperatingRoomsManager\s+key=\{activeHospitalId \|\| 'no-hospital'\}\s+rooms=\{rooms\}/);
  const management = readFileSync(new URL('../../components/OperatingRoomsManager.tsx', import.meta.url), 'utf8');
  assert.match(management, /\(a\.sort_order \|\| 0\) - \(b\.sort_order \|\| 0\)/);
  const preview = readFileSync(new URL('../../scripts/acute-preview/main.tsx', import.meta.url), 'utf8');
  assert.match(preview, /const rooms: OperatingRoom\[\] = \[\]/);
  assert.doesNotMatch(preview, /roomExamples|qa-room-|qa-pcho-/);
});

test('compact room selector is a labelled required native radio row with full names', () => {
  const rooms = [{ id: 'actual-tra-1', name: 'TRAUMATOLOGIE - 1', department: 'Traumatologie' }, { id: 'actual-chir-2', name: 'PCHO SÁL Č. 2', department: 'Chirurgie' }];
  const props = { id: 'room-picker', rooms, value: '', department: '', required: true, disabled: false, onChange() {} };
  const html = renderToStaticMarkup(React.createElement(dialogs.AcuteRoomPicker, props));
  assert.equal((html.match(/type="radio"/g) ?? []).length, 2);
  assert.equal((html.match(/required=""/g) ?? []).length, 2);
  assert.doesNotMatch(html, /checked=""|<select|<datalist/);
  assert.match(html, /aria-label="TRAUMATOLOGIE - 1"/);
  assert.match(html, /class="acute-room-code">TRAUMATOLOGIE - 1<\/span>/);
  assert.match(html, /class="acute-room-code">PCHO SÁL Č. 2<\/span>/);
  assert.doesNotMatch(html, />TRA 1<|>CHIR 2</);
  assert.match(html, /value="actual-chir-2"/);
  assert.match(html, /name="room-picker"/);
  const selected = renderToStaticMarkup(React.createElement(dialogs.AcuteRoomPicker, { ...props, value: rooms[1].id, department: rooms[1].department, disabled: true }));
  assert.equal((selected.match(/checked=""/g) ?? []).length, 1);
  assert.match(selected, /<fieldset[^>]*disabled=""/);
  assert.match(selected, /PCHO SÁL Č. 2 · Chirurgie\. Návrh sálu není rezervace/);
  assert.match(selected, /lucide-check/);
  const css = readFileSync(new URL('../../components/acute/acute-requests.css', import.meta.url), 'utf8');
  assert.match(css, /\.acute-room-options \{ display: flex; flex-wrap: wrap/);
  assert.match(css, /\.acute-room-input:focus-visible \+ \.acute-room-option/);
  assert.match(css, /\.acute-room-option \{[^}]*min-height: 60px/);
  assert.match(css, /\.acute-room-code \{[^}]*white-space: normal; overflow-wrap: anywhere/);
});

test('room selection updates only the actual proposal ID and configured department', () => {
  const draft = { procedureName: 'Test', department: 'Původní obor', urgency: 'urgent', estimatedDurationMinutes: '45', proposedRoomId: '', proposedStartAt: '2026-10-08T16:30', reference: 'TEST', description: 'Koordinace' };
  const room = { id: 'real-room', name: 'PCHO SÁL Č. 2', department: 'Chirurgie' };
  const selected = dialogs.selectAcuteRoom(draft, room);
  assert.deepEqual(selected, { ...draft, department: 'Chirurgie', proposedRoomId: 'real-room' });
  assert.equal(draft.proposedRoomId, '');
  assert.equal(draft.department, 'Původní obor');
  assert.equal(dialogs.selectAcuteRoom(draft, { ...room, department: '' }).department, room.name);
  const source = readFileSync(new URL('../../components/acute/AcuteDialogs.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<datalist|<label[^>]*>Navržený operační sál/);
  assert.match(source, /setDraft\(current => selectAcuteRoom\(current, room\)\)/);
  assert.match(source, /rooms\.some\(room => room\.id === draft\.proposedRoomId\)/);
});

test('room selector explains empty/missing/legacy proposals without guessing a room', () => {
  const props = { id: 'room-picker', rooms: [], value: '', department: '', required: true, disabled: false, onChange() {} };
  const html = renderToStaticMarkup(React.createElement(dialogs.AcuteRoomPicker, props));
  assert.doesNotMatch(html, /type="radio"|checked=""/);
  assert.match(html, /V zařízení nejsou nastavené operační sály/);
  const missing = renderToStaticMarkup(React.createElement(dialogs.AcuteRoomPicker, { ...props, value: 'removed', department: 'Chirurgie', onClear() {} }));
  assert.match(missing, /Původně navržený sál není v aktuálním seznamu/);
  assert.match(missing, /Zrušit návrh sálu/);
  const legacy = renderToStaticMarkup(React.createElement(dialogs.AcuteRoomPicker, { ...props, rooms: [{ id: 'room-a', name: 'CHIR 2', department: 'Chirurgie' }], department: 'Původní obor', required: false }));
  assert.match(legacy, /Stávající obor: Původní obor/);
  assert.doesNotMatch(legacy, /checked=""|required=""/);
});

test('urgency uses three required native icon radios without an implicit clinical default', () => {
  const html = renderToStaticMarkup(React.createElement(dialogs.AcuteUrgencyPicker, { id: 'test-priority', value: '', disabled: false, onChange() {} }));
  assert.match(html, /<fieldset[^>]*aria-describedby="test-priority-help"/);
  assert.match(html, /<legend>Klinická naléhavost<\/legend>/);
  assert.equal((html.match(/type="radio"/g) ?? []).length, 3);
  assert.equal((html.match(/name="test-priority"/g) ?? []).length, 3);
  assert.equal((html.match(/required=""/g) ?? []).length, 3);
  assert.doesNotMatch(html, /checked=""|<select/);
  for (const urgency of ['emergent', 'urgent', 'expedited']) {
    assert.match(html, new RegExp(`value="${urgency}"`));
    assert.match(html, new RegExp(`for="test-priority-${urgency}"`));
    assert.ok(html.includes(display.URGENCY_DESCRIPTIONS[urgency]));
  }
  assert.equal((html.match(/width="42"/g) ?? []).length, 3);
  assert.match(html, /Výběr priority nenahrazuje klinické posouzení/);
});

test('urgency edit preserves the selected enum with a check mark, and disabled controls remain native', () => {
  for (const urgency of ['emergent', 'urgent', 'expedited']) {
    const html = renderToStaticMarkup(React.createElement(dialogs.AcuteUrgencyPicker, { id: 'edit-priority', value: urgency, disabled: true, onChange() {} }));
    assert.match(html, /<fieldset[^>]*disabled=""/);
    assert.equal((html.match(/checked=""/g) ?? []).length, 1);
    const selected = [...html.matchAll(/<input[^>]*>/g)].find(match => match[0].includes('checked=""'))[0];
    assert.ok(selected.includes(`value="${urgency}"`));
    assert.equal((html.match(/lucide-check/g) ?? []).length, 1);
  }
  const css = readFileSync(new URL('../../components/acute/acute-requests.css', import.meta.url), 'utf8');
  assert.match(css, /\.acute-urgency-input:focus-visible \+ \.acute-urgency-option/);
  assert.match(css, /\.acute-urgency-picker:disabled/);
  assert.match(css, /\.acute-urgency-options \{ grid-template-columns: minmax\(0, 1fr\)/);
  const source = readFileSync(new URL('../../components/acute/AcuteDialogs.tsx', import.meta.url), 'utf8');
  assert.match(source, /disabled=\{controller\.busy \|\| !controller\.canManage\} onChange=\{value => set\('urgency', value\)\}/);
});

test('controlled dialogs return focus to the actual opener and never steal focus from a replacement dialog', () => {
  const focused = [];
  let replacementOpen = false;
  const document = { activeElement: null, querySelector: () => replacementOpen ? {} : null };
  const element = name => ({
    ownerDocument: document, isConnected: true, getClientRects: () => [{}], matches: () => false, closest: () => null,
    focus(options) { focused.push([name, options]); document.activeElement = this; },
  });
  const opener = element('card');
  const fallback = element('active tab');
  let prevented = 0;
  const event = { preventDefault() { prevented++; } };
  dialogs.restoreAcuteDialogFocus(event, opener, fallback);
  assert.deepEqual(focused, [['card', { preventScroll: true }]]);
  opener.isConnected = false; // The request was archived and its card has left the active queue.
  dialogs.restoreAcuteDialogFocus(event, opener, fallback);
  assert.equal(focused.at(-1)[0], 'active tab');
  replacementOpen = true; // Detail → edit, or edit → detail; the new dialog owns focus.
  dialogs.restoreAcuteDialogFocus(event, opener, fallback);
  assert.equal(focused.length, 2);
  assert.equal(prevented, 3);
  const view = readFileSync(new URL('../../components/AcuteRequestsModule.tsx', import.meta.url), 'utf8');
  assert.equal((view.match(/onCloseAutoFocus=\{closeAutoFocus\}/g) ?? []).length, 4);
  assert.match(view, /onEdit=\{\(\) => setForm/); // Editing keeps the initial card, not the removed detail button.
});

test('active requests preserve clinician urgency while sorting operational rank', () => {
  const input = [request('urgent', 1), request('emergent', 3, 'emergent'), { ...request('closed', 2), status: 'completed' }];
  const sorted = display.activeRequests(input);
  assert.deepEqual(sorted.map(item => item.id), ['urgent', 'emergent']);
  assert.equal(sorted[1].urgency, 'emergent');
  assert.equal(input[0].queuePosition, 1);
});

test('Czech summary pluralization distinguishes one, two to four, and five plus', () => {
  assert.equal(display.waitingRequestsLabel(1), '1 čekající požadavek');
  assert.equal(display.waitingRequestsLabel(4), '4 čekající požadavky');
  assert.equal(display.waitingRequestsLabel(5), '5 čekajících požadavků');
  assert.equal(display.urgencyCountLabel(1, 'emergent'), '1 emergentní');
  assert.equal(display.urgencyCountLabel(4, 'urgent'), '4 urgentní');
  assert.equal(display.urgencyCountLabel(5, 'expedited'), '5 časných');
});

test('waiting uses recorded receipt and includes nights and weekends, never fractional minutes', () => {
  const elapsed = display.wholeWaitingMinutes('2026-10-02T12:50:00Z', NOW);
  assert.equal(elapsed, 5 * 24 * 60);
  assert.equal(display.wholeWaitingMinutes('not-a-date', NOW), null);
  assert.equal(display.wholeWaitingMinutes('2026-10-08T12:50:00Z', NOW), 0);
  assert.equal(Number.isInteger(display.wholeWaitingMinutes('2026-10-07T12:49:30Z', NOW)), true);
});

test('latest reorder annotation includes only genuine moved-position audit events', () => {
  const event = (id, time, from, to) => ({ id, requestId: 'a', action: 'reorder', occurredAt: time, previousPosition: from, newPosition: to, reason: 'Tým připraven' });
  const events = [event('old', '2026-10-07T10:00:00Z', 4, 3), event('same', '2026-10-07T12:00:00Z', 2, 2), event('latest', '2026-10-07T11:00:00Z', 3, 2)];
  assert.equal(display.latestReorder('a', events).id, 'latest');
  assert.equal(display.latestReorder('other', events), undefined);
});

test('empty/error/loading states never fabricate request cards or successful counts', () => {
  const empty = render(controller());
  assert.match(empty, /Žádné čekající požadavky/);
  assert.doesNotMatch(empty, /acute-card-rank/);
  const error = render(controller({ error: 'Databáze není dostupná', errorCode: 'ACUTE_MIGRATION_REQUIRED', canManage: false }));
  assert.match(error, /role="alert"/);
  assert.match(error, /Databáze není dostupná/);
  assert.doesNotMatch(error, /0 čekajících požadavků/);
  assert.doesNotMatch(error, /acute-card-rank/);
  const loading = render(controller({ loading: true, canManage: false }));
  assert.match(loading, /Načítání akutních požadavků/);
  assert.doesNotMatch(loading, /acute-card-rank/);
});

test('cards render rank order, whole minutes, clinical priority and accessible detail control', () => {
  const html = render(controller({ requests: [request('b', 2, 'emergent'), request('a', 1)] }));
  assert.ok(html.indexOf('Výkon a') < html.indexOf('Výkon b'));
  assert.match(html, /45 <span>min/);
  assert.match(html, /60 <span>min/);
  assert.match(html, /Emergentní/);
  assert.match(html, /aria-label="Otevřít detail požadavku Výkon a"/);
  assert.match(html, /Pořadí není klinická naléhavost/);
  assert.match(html, /Bez přiděleného sálu/);
  assert.equal((html.match(/class="acute-card-hitarea"/g) ?? []).length, 2);
  for (const match of html.matchAll(/<button[^>]*class="acute-card-hitarea"[^>]*>([\s\S]*?)<\/button>/g)) assert.doesNotMatch(match[1], /<button/);
});

test('empty request queue shows an accessible circular create control, not loading or error', () => {
  const empty = render(controller());
  assert.match(empty, /<button[^>]*class="acute-empty-orb"[^>]*aria-label="Nový požadavek z prázdného přehledu"/);
  assert.match(empty, /acute-empty-rings/);
  assert.match(empty, /Kliknutím na kruh zadáte nový akutní výkon/);
  assert.doesNotMatch(empty, /Ručně nastavené pořadí|role="progressbar"/);
  const busy = render(controller({ busy: true }));
  assert.match(busy, /class="acute-empty-orb" disabled=""/);
  for (const state of [controller({ loading: true }), controller({ error: 'Chyba' }), controller({ requests: [request('a', 1)] })]) {
    assert.doesNotMatch(render(state), /acute-empty-orb/);
  }
});

test('read-only empty queue keeps its circular illustration without a create action', () => {
  const html = render(controller({ canManage: false }));
  assert.match(html, /acute-empty-orb-readonly/);
  assert.match(html, /Nové požadavky může zadávat koordinátor/);
  assert.doesNotMatch(html, /Nový požadavek|<button[^>]*class="acute-empty-orb"/);
});

test('a changed rank visibly identifies the author as well as old/new position and reason', () => {
  const html = render(controller({ requests: [request('a', 1)], events: [{ id: 'event', requestId: 'a', action: 'reorder', actorName: 'Koordinátor', actorId: 'test-user', occurredAt: '2026-10-07T12:32:00Z', previousPosition: 4, newPosition: 1, reason: 'Dostupnost týmu', changes: {} }] }));
  assert.match(html, /Pořadí změněno 4 → 1/);
  assert.match(html, /Koordinátor · Důvod: Dostupnost týmu/);
});

test('read-only users receive no create or reorder controls', () => {
  const html = render(controller({ requests: [request('a', 1), request('b', 2)], canManage: false }));
  assert.doesNotMatch(html, /Nový požadavek/);
  assert.doesNotMatch(html, /Upravit pořadí/);
  assert.match(html, /Otevřít detail požadavku/);
});

test('API persistence is revision checked, authenticated and without optimistic fixture fallback', () => {
  const hook = readFileSync(new URL('../../hooks/useAcuteRequests.ts', import.meta.url), 'utf8');
  assert.match(hook, /credentials: 'include'/);
  assert.match(hook, /expectedRevision/);
  assert.match(hook, /caught.status === 409/);
  assert.match(hook, /activeHospitalId/);
  assert.match(hook, /hasModuleAccess\('acute-requests'\)/);
  assert.doesNotMatch(hook, /fallbackData|optimisticData|localStorage/);
});

test('simplified intake removes optional controls but retains privacy and keyboard-accessible audit controls', () => {
  const dialogs = readFileSync(new URL('../../components/acute/AcuteDialogs.tsx', import.meta.url), 'utf8');
  assert.match(dialogs, /Dialog\.Title/);
  assert.match(dialogs, /Dialog\.Description/);
  assert.match(dialogs, /Dialog\.Close/);
  assert.match(dialogs, /Neuvádějte jméno, rodné číslo/);
  const intake = dialogs.slice(dialogs.indexOf('export function AcuteRequestFormDialog'), dialogs.indexOf('export function AcuteReorderDialog'));
  assert.doesNotMatch(intake, /Interní reference|Čas klinického rozhodnutí|Termín a návrh zařazení|Nejzazší zahájení|Navržené zahájení|datetime-local/);
  assert.match(intake, /acute-intake-workspace/);
  assert.match(intake, /acute-intake-main/);
  assert.match(intake, /acute-intake-side/);
  assert.match(intake, /Důvod změny/);
  assert.match(dialogs, /Posunout .*výše/);
  assert.match(dialogs, /Důvod změny pořadí/);
  assert.match(dialogs, /nevytváří dokončený operační cyklus do statistik/);
  const css = readFileSync(new URL('../../components/acute/acute-requests.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /max-width: 900px.*grid-template-columns: minmax\(0, 1fr\)/);
});

test('new simplified intake leaves removed fields unset and preserves exact legacy values on edit', () => {
  const draft = { procedureName: ' Výkon ', department: ' Popis ', description: ' Koordinace ', urgency: 'urgent', estimatedDurationMinutes: '45', proposedRoomId: 'room-a' };
  const fresh = dialogs.acuteIntakeInput(draft, null);
  assert.equal(fresh.reference, '');
  for (const field of ['clinicalDecisionAt', 'latestStartAt', 'proposedStartAt']) assert.equal(fresh[field], null);
  assert.equal(fresh.estimatedDurationMinutes, 45);
  assert.equal(fresh.procedureName, 'Výkon');
  assert.equal(fresh.proposedRoomId, 'room-a');
  const legacy = { ...request('legacy', 1), reference: 'ORIGINAL', clinicalDecisionAt: '2026-10-07T12:01:23.456Z', latestStartAt: '2026-10-07T13:04:56.789Z', proposedStartAt: '2026-10-07T12:39:01.234Z', proposedRoomId: 'room-a' };
  const edited = dialogs.acuteIntakeInput(draft, legacy);
  for (const field of ['reference', 'clinicalDecisionAt', 'latestStartAt', 'proposedStartAt']) assert.equal(edited[field], legacy[field]);
  assert.equal(dialogs.acuteIntakeInput({ ...draft, proposedRoomId: '' }, legacy).proposedStartAt, null);
  assert.throws(() => dialogs.acuteIntakeInput({ ...draft, urgency: '' }, null), /Vyberte naléhavost/);
  assert.equal(draft.procedureName, ' Výkon ');
});
