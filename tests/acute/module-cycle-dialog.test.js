import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// Synthetic render-only fixtures. No application auth, backend, timers or clinical writes.
const require = createRequire(import.meta.url);
const root = new URL('../../', import.meta.url);
function load(path, imports = {}) {
  const output = ts.transpileModule(readFileSync(new URL(path, root), 'utf8'), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', output)(name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    assert.ok(!name.startsWith('.'), `Unmapped local dependency: ${name}`);
    return require(name);
  }, exports);
  return exports;
}
const acute = load('lib/acute-requests.ts');
const cycles = load('lib/acute-module-cycles.ts', { './acute-requests': acute });
const display = load('components/acute/display.ts');
const childrenOnly = ({ children }) => React.createElement(React.Fragment, null, children);
const dialogs = load('components/acute/AcuteDialogs.tsx', {
  '../../lib/acute-requests': acute,
  '../../lib/acute-module-cycles': cycles,
  './display': display,
  '@radix-ui/react-dialog': {
    Root: childrenOnly, Portal: childrenOnly, Close: childrenOnly, Overlay: () => null,
    Content: ({ className, children }) => React.createElement('div', { className, role: 'dialog' }, children),
    Title: ({ children }) => React.createElement('h2', null, children),
    Description: ({ children }) => React.createElement('p', null, children),
  },
});
const now = Date.parse('2026-10-09T15:00:00Z');
const request = (extra = {}) => ({
  id: 'synthetic-request', hospitalId: 'synthetic-hospital', procedureName: 'Aktuální název požadavku',
  department: 'Chirurgie', reference: '', description: '', urgency: 'urgent', estimatedDurationMinutes: 30,
  receivedAt: '2026-10-08T07:00:00Z', clinicalDecisionAt: null, latestStartAt: null,
  proposedRoomId: 'proposal-room', proposedStartAt: null, status: 'pending', queuePosition: 2,
  submissionPosition: 2, acknowledgedAt: null, acknowledgedBy: null, createdBy: 'synthetic-user',
  updatedAt: '2026-10-09T14:00:00Z', revision: 1, ...extra,
});
const cycle = (extra = {}) => ({
  requestId: 'synthetic-request', hospitalId: 'synthetic-hospital', roomId: 'actual-room',
  operationStartedAt: '2026-10-08T08:00:00.000Z', startedAt: '2026-10-08T08:00:00.001Z',
  startEventId: 'synthetic-start-event', endedAt: '2026-10-08T09:30:30.001Z', endEventId: 'synthetic-end-event',
  procedureName: 'Původně provedená APPE', urgency: 'emergent', submissionPosition: 7, ...extra,
});
const rooms = [
  { id: 'actual-room', name: 'PCHO SÁL Č. 2', department: 'Chirurgie' },
  { id: 'proposal-room', name: 'SÁL Č. 7', department: 'Urologie' },
];
const controller = (extra = {}) => ({
  requests: [], events: [], revision: 1, loading: false, busy: false, canManage: true,
  historyLimited: false, error: null, errorCode: null,
  execute: () => { assert.fail('Rendering must not mutate requests or clinical room state'); },
  refresh: () => { assert.fail('Dialogs must reuse their supplied data, not fetch'); }, ...extra,
});
const base = { rooms, controller: controller(), now, onClose() {}, onEdit() {}, onNotice() {}, onCloseAutoFocus() {} };
const detail = (item = request(), evidence, overrides = {}) => renderToStaticMarkup(React.createElement(dialogs.AcuteDetailDialog, {
  ...base, request: item, cycle: evidence, ...overrides,
}));
const readonlyDetail = (evidence = cycle(), overrides = {}) => renderToStaticMarkup(React.createElement(dialogs.AcuteCycleDetailDialog, {
  cycle: evidence, rooms, onClose() {}, onCloseAutoFocus() {}, ...overrides,
}));
const evidenceSection = html => html.match(/<section[^>]*data-acute-cycle-evidence=""[^>]*>[\s\S]*?<\/section>/)?.[0];

test('a proved full cycle renders before separate manual queue state even if its request is still pending', () => {
  const html = detail(request(), cycle());
  const evidence = evidenceSection(html);
  assert.ok(evidence);
  assert.match(evidence, /Provedeno · skutečný operační cyklus/);
  assert.match(evidence, /data-cycle-completed="true"/);
  assert.match(evidence, /<dt>Celý cyklus<\/dt><dd>91 min<\/dd>/);
  assert.match(evidence, /včetně úklidu/);
  assert.match(html, /Samostatný stav požadavku v pořadníku/);
  assert.ok(html.indexOf('data-acute-cycle-evidence') < html.indexOf('Samostatný stav požadavku'));
  assert.match(html, /Nepřevzato/);
  assert.match(html, /Uzavřít požadavek/);
  assert.match(html, /Odhad chirurgického výkonu<\/dt><dd>30 min/);
});

test('frozen cycle identity, original submission number and actual room are not replaced by later proposal edits', () => {
  const html = detail(request({ procedureName: 'Dodatečně přejmenovaný URS', urgency: 'expedited', submissionPosition: 1 }), cycle());
  assert.match(html, /<h2>Původně provedená APPE<\/h2>/);
  const evidence = evidenceSection(html);
  assert.match(evidence, /Emergentní/);
  assert.match(evidence, /Pořadí při zápisu #7/);
  assert.match(evidence, /<dt>Skutečný sál<\/dt><dd>PCHO SÁL Č\. 2<\/dd>/);
  assert.doesNotMatch(evidence, /SÁL Č\. 7|Dodatečně přejmenovaný URS|Pořadí při zápisu #1/);
  assert.match(html, /Dodatečně přejmenovaný URS\. Uzavření nebo zrušení požadavku/);
  assert.match(evidence, /dateTime="2026-10-08T08:00:00\.001Z"/i);
  assert.match(evidence, /dateTime="2026-10-08T09:30:30\.001Z"/i);
});

test('bound waiting stops at the recorded start rather than now or later manual closure', () => {
  for (const status of ['pending', 'acknowledged', 'completed', 'cancelled']) {
    const html = detail(request({ status }), cycle());
    assert.match(html, /<dt>Čekání do zahájení cyklu<\/dt><dd>60 min<\/dd>/);
    assert.doesNotMatch(html, /<dt>Čekání od přijetí do aplikace<\/dt>/);
    assert.match(detail(request({ status }), cycle(), { now: now + 86400000 }), /<dt>Čekání do zahájení cyklu<\/dt><dd>60 min<\/dd>/);
  }
});

test('manual request closure without cycle evidence never claims a performed operation', () => {
  const html = detail(request({ status: 'completed', queuePosition: null }));
  assert.match(html, /Požadavek uzavřen/);
  assert.match(html, /Doba do uzavření požadavku/);
  assert.equal(evidenceSection(html), undefined);
  assert.doesNotMatch(html, /Provedeno|Celý cyklus|Dokončení cyklu/);
});

test('start-only evidence shows Cyklus zahájen with no fabricated final time or full-cycle estimate', () => {
  const html = detail(request(), cycle({ endedAt: null, endEventId: null }));
  const evidence = evidenceSection(html);
  assert.match(evidence, /Cyklus zahájen/);
  assert.doesNotMatch(evidence, /Provedeno|91 min|30 min|data-cycle-completed/);
  assert.match(evidence, /<dt>Dokončení cyklu<\/dt><dd>Dosud nepotvrzeno/);
  assert.match(evidence, /<dt>Celý cyklus<\/dt><dd>—/);
});

test('invalid or incomplete completion proof never renders Provedeno or a recorded duration', () => {
  for (const invalid of [
    { endEventId: null }, { endedAt: 'invalid' }, { startedAt: 'invalid' },
    { endedAt: '2026-10-08T08:00:00.001Z' }, { endedAt: '2026-10-08T07:59:59Z' },
    { startEventId: '' },
  ]) {
    const html = readonlyDetail(cycle(invalid));
    const evidence = evidenceSection(html);
    assert.doesNotMatch(evidence, /Provedeno|91 min|NaN|Invalid Date|data-cycle-completed/);
    assert.match(evidence, /Dokončení cyklu není doloženo/);
  }
});

test('a wrong request or hospital link cannot replace the selected request with foreign clinical evidence', () => {
  for (const invalid of [{ requestId: 'another-request' }, { hospitalId: 'another-hospital' }]) {
    const html = detail(request(), cycle(invalid));
    assert.equal(evidenceSection(html), undefined);
    assert.match(html, /<h2>Aktuální název požadavku<\/h2>/);
    assert.doesNotMatch(html, /Původně provedená APPE|Provedeno/);
    assert.match(html, /Čekání od přijetí do aplikace/);
  }
});

test('an older cycle without a snapshot request has a readonly accessible Timeline-style detail', () => {
  const html = readonlyDetail();
  assert.match(html, /role="dialog"/);
  assert.match(html, /acute-dialog timeline-popup-panel acute-dialog-wide/);
  assert.match(html, /<h2>Původně provedená APPE<\/h2>/);
  assert.match(html, /Zaznamenaný akutní výkon · údaje ze skutečného operačního cyklu/);
  assert.match(html, /aria-labelledby="[^"]+"/);
  assert.match(html, /aria-label="Zavřít okno"/);
  assert.match(html, /Původní požadavek není v načteném výběru pořadníku/);
  assert.doesNotMatch(html, /Uzavřít požadavek|Upravit požadavek|Převzít koordinaci|<form|<input|<textarea/);
  const missing = readonlyDetail(cycle({ submissionPosition: null }), { rooms: [] });
  assert.match(missing, /Pořadí při zápisu —/);
  assert.match(missing, /Původní sál není v aktuálním seznamu/);
  assert.doesNotMatch(missing, /Sál 1|#1|SÁL Č\. 7/);
});
