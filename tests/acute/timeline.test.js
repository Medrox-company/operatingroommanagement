import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const acute = load('lib/acute-requests.ts');
const constants = load('components/timeline/constants.ts');
const proposals = load('components/timeline/AcuteProposalLane.tsx', {
  react: React, 'lucide-react': { AlertTriangle: () => null, Siren: () => null },
  '../../lib/acute-requests': acute, './constants': constants, './acute-proposal-lane.css': {},
});
const start = Date.parse('2026-10-08T07:00:00Z');
const end = start + 4 * 3600_000;
const at = minutes => new Date(start + minutes * 60_000).toISOString();
const request = (override = {}) => ({
  id: 'request-1', procedureName: 'Ukázkový výkon', department: 'Chirurgie', reference: 'TEST-1', description: '',
  urgency: 'urgent', status: 'pending', queuePosition: 1, proposedRoomId: 'room-1', proposedStartAt: at(60),
  estimatedDurationMinutes: 60, receivedAt: at(60), ...override,
});

test('request projections require an active request, actual room and valid recorded receipt, not a proposed start', () => {
  const invalid = [
    { proposedRoomId: null }, { receivedAt: '' }, { receivedAt: 'bad-date' },
    { proposedRoomId: 'other-room' }, { status: 'completed' }, { status: 'cancelled' },
    { estimatedDurationMinutes: 0 }, { estimatedDurationMinutes: Infinity },
  ].map(request);
  assert.deepEqual(proposals.acuteProposalsForWindow(invalid, 'room-1', start, end), []);
  for (const status of ['pending', 'acknowledged']) {
    assert.equal(proposals.acuteProposalsForWindow([request({ status, proposedStartAt: null })], 'room-1', start, end).length, 1);
  }
});

test('receipt stays authoritative even with a different legacy proposal, updates, reorder or timezone offsets', () => {
  const receivedAt = '2026-10-08T10:00:23.123+02:00';
  const input = request({ receivedAt, proposedStartAt: at(180), estimatedDurationMinutes: 120, updatedAt: at(190) });
  const [result] = proposals.acuteProposalsForWindow([input], 'room-1', start, end);
  assert.equal(result.startMs, Date.parse(receivedAt));
  assert.equal(result.endMs - result.startMs, 120 * 60_000);
  const [edited] = proposals.acuteProposalsForWindow([{ ...input, proposedStartAt: null, updatedAt: at(200), queuePosition: 7 }], 'room-1', start, end);
  assert.equal(edited.startMs, result.startMs);
  assert.equal(edited.leftPercent, result.leftPercent);
  assert.equal(edited.widthPercent, 50);
});

test('positions clip at the visible window, preserve true duration and never extend beyond 100%', () => {
  const cases = [
    [request(), 25, 25],
    [request({ receivedAt: at(-30) }), 0, 12.5],
    [request({ receivedAt: at(210) }), 87.5, 12.5],
    [request({ receivedAt: at(-20), estimatedDurationMinutes: 300 }), 0, 100],
  ];
  for (const [input, left, width] of cases) {
    const [result] = proposals.acuteProposalsForWindow([input], 'room-1', start, end);
    assert.equal(result.leftPercent, left);
    assert.equal(result.widthPercent, width);
    assert.equal(result.endMs - result.startMs, input.estimatedDurationMinutes * 60_000);
  }
  for (const receivedAt of [at(-60), at(240), at(300)]) {
    assert.deepEqual(proposals.acuteProposalsForWindow([request({ receivedAt })], 'room-1', start, end), []);
  }
  assert.deepEqual(proposals.acuteProposalsForWindow([request()], 'room-1', start, start), []);
});

test('overlapping proposals stay separate and operational reorder cannot alter their urgency or actual events', () => {
  const inputs = [request({ id: 'two', queuePosition: 2, urgency: 'emergent' }), request({ id: 'one', queuePosition: 1 })];
  const before = structuredClone(inputs);
  const results = proposals.acuteProposalsForWindow(inputs, 'room-1', start, end);
  assert.deepEqual(results.map(result => result.request.id), ['one', 'two']);
  assert.equal(results[1].request.urgency, 'emergent');
  assert.deepEqual(inputs, before);
  assert.equal(results.length, 2);
});

test('each rendered sub-lane is labelled unconfirmed and explains surgical-only time, even for locked/emergency rooms', () => {
  const [proposal] = proposals.acuteProposalsForWindow([request()], 'room-1', start, end);
  for (const roomWarning of [undefined, 'Sál uzamčen', 'Sál ve stavu nouze']) {
    const html = renderToStaticMarkup(React.createElement(proposals.AcuteProposalLane, {
      proposal, roomName: 'Sál č. 1', roomWarning, onOpen: () => {},
    }));
    assert.match(html, /Návrh — nepotvrzeno/);
    assert.match(html, /Urgentní/);
    assert.match(html, /Požadavek zadán/);
    assert.match(html, /Nejde o skutečný začátek výkonu, rezervaci ani celkovou obsazenost sálu/);
    assert.match(html, /left:25%;width:25%/);
    assert.equal((html.match(/<button\b/g) ?? []).length, 1);
    if (roomWarning) assert.ok(html.includes(roomWarning));
  }
});

test('summary distinguishes unassigned requests and does not present a fetch failure as an empty queue', () => {
  const html = renderToStaticMarkup(React.createElement(proposals.AcuteTimelineSummary, { count: 3, unassignedCount: 2, onOpen: () => {} }));
  assert.match(html, /Akutní požadavky: 3/);
  assert.match(html, /bez přiřazeného sálu 2/);
  const failed = renderToStaticMarkup(React.createElement(proposals.AcuteTimelineSummary, { count: 0, unassignedCount: 0, error: 'Error' }));
  assert.match(failed, /nepodařilo načíst/);
  assert.doesNotMatch(failed, /požadavky: 0/);
});

test('urgency-tinted lanes keep neutral readable labels and explicit estimates, with the approved green urgent palette', () => {
  for (const [urgency, color] of [['emergent', constants.C.red], ['urgent', constants.C.green], ['expedited', constants.C.blue]]) {
    const [proposal] = proposals.acuteProposalsForWindow([request({ urgency, estimatedDurationMinutes: 30 })], 'room-1', start, end);
    const html = renderToStaticMarkup(React.createElement(proposals.AcuteProposalLane, { proposal, roomName: 'Sál 1' }));
    assert.ok(html.includes(`--acute-proposal-color:${color}`));
    assert.match(html, /acute-proposal-block-title/);
    assert.match(html, /Odhad/);
    assert.match(html, /acute-proposal-block-duration">30<span class="acute-proposal-block-unit"> min/);
    assert.match(html, /left:25%;width:12.5%/);
  }
});

test('request blocks stretch over the full lane without hatching or widening the time estimate', () => {
  const css = postcss.parse(read('components/timeline/acute-proposal-lane.css'));
  const declarations = selector => {
    const rule = css.nodes.find(node => node.type === 'rule' && node.selector === selector);
    assert.ok(rule, selector);
    return Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  };
  const lane = declarations('.acute-proposal-lane');
  assert.equal(lane['align-items'], 'stretch');
  assert.equal(lane.padding, '0');
  assert.equal(lane['min-height'], '44px');
  const track = declarations('.acute-proposal-track');
  assert.equal(track['align-self'], 'stretch');
  assert.equal(track.height, undefined);
  const block = declarations('.acute-proposal-block');
  assert.equal(block.top, '0');
  assert.equal(block.bottom, '0');
  assert.equal(block['min-width'], '1px');
  assert.match(block.border, /solid/);
  assert.doesNotMatch(block.background, /repeating/);
  assert.equal(block['container-type'], 'inline-size');
  const label = declarations('.acute-proposal-lane-label');
  assert.match(label.background, /var\(--acute-proposal-color\) 13%/);
  assert.equal(label.margin, '0', 'Tint fills the entire room-name column');
  assert.equal(label['border-radius'], '0', 'Urgency stripe has square ends');
  assert.equal(label['border-left'], '3px solid var(--acute-proposal-color)');
  assert.equal(declarations('.acute-proposal-lane-label strong').color, 'var(--acute-proposal-text)');
  assert.equal(lane['--acute-proposal-text'], 'var(--color-text-primary)');
  assert.match(read('components/timeline/acute-proposal-lane.css'), /--acute-proposal-text: var\(--m-text-strong\)/);
  assert.match(read('components/timeline/acute-proposal-lane.css'), /@container \(max-width: 44px\)/);
  assert.match(read('components/timeline/acute-proposal-lane.css'), /\.acute-proposal-mobile \.acute-proposal-lane-label \{ margin: 0;/);
});

test('Timeline shows the audited submission number in the label and block, unaffected by reorder or clipping', () => {
  for (const mobile of [false, true]) {
    for (const queuePosition of [1, 4]) {
      const [proposal] = proposals.acuteProposalsForWindow([request({ submissionPosition: 2, queuePosition, receivedAt: at(-30) })], 'room-1', start, end);
      const html = renderToStaticMarkup(React.createElement(proposals.AcuteProposalLane, { proposal, roomName: 'Sál 1', mobile }));
      assert.match(html, /Pořadí při zápisu: 2/);
      assert.match(html, /class="acute-proposal-position"[^>]*>#2</);
      assert.match(html, /class="acute-proposal-block-position">#2 /);
      assert.match(html, /left:0%;width:12.5%/);
    }
  }
  const [missing] = proposals.acuteProposalsForWindow([request({ queuePosition: 77 })], 'room-1', start, end);
  const html = renderToStaticMarkup(React.createElement(proposals.AcuteProposalLane, { proposal: missing, roomName: 'Sál 1' }));
  assert.match(html, /Pořadí při zápisu není dostupné/);
  assert.doesNotMatch(html, /#77/);
});

test('desktop gating checks real enabled hospital configuration, and proposals remain outside all actual/capacity inputs', () => {
  const source = read('components/TimelineModule.tsx');
  assert.match(source, /modules\.some\(module => module\.id === 'acute-requests' && module\.is_enabled\)/);
  assert.match(source, /hasModuleAccess\('acute-requests'\)/);
  assert.match(source, /useAcuteRequests\(acuteEnabled\)/);
  assert.match(source, /acuteEnabled && !acute\.error/);
  assert.doesNotMatch(source, /completedOperations:[^\n]*acute|deriveTimelineOperationalWarnings\([^)]*acute|setRooms\([^)]*acute/);
  assert.doesNotMatch(read('components/timeline/AcuteProposalLane.tsx'), /supabase|updateOperatingRoom|MOCK_|setEmergency/);
  for (const path of ['components/TimelineModule.tsx', 'components/mobile/MobileTimelineView.tsx', 'components/AcuteRequestsModule.tsx']) {
    assert.doesNotMatch(read(path), /!request\.proposedRoomId \|\| !request\.proposedStartAt|request\.proposedRoomId && request\.proposedStartAt/);
  }
  assert.match(read('components/AcuteRequestsModule.tsx'), /<AcuteCircularTimeline nodes=\{timelineNodes\}/);
  assert.match(read('lib/acute-circular-timeline.ts'), /anchorAt: request\.receivedAt/);
  assert.match(read('components/acute/AcuteCircularTimeline.tsx'), /dateTime=\{node\.anchorAt\}/);
});

test('mobile keeps every actual room and warning; the proposal click is a separate sibling control', () => {
  const display = load('lib/mobile-room-display.ts');
  const timeline = load('lib/mobile-timeline.ts', { './mobile-room-display': display });
  const warnings = load('lib/timeline-operational-warnings.ts');
  const unused = load('lib/timeline-unused-minutes.ts', { '../types': { DEFAULT_DAILY_BREAK_MINUTES: 30 } });
  const icon = ({ children }) => React.createElement('span', null, children);
  const Mobile = load('components/mobile/MobileTimelineView.tsx', {
    react: React, 'lucide-react': { ChevronLeft: icon, ChevronRight: icon, LocateFixed: icon },
    '../../lib/mobile-room-display': display, '../../lib/mobile-timeline': timeline,
    '../../lib/timeline-operational-warnings': warnings, '../../lib/timeline-unused-minutes': unused,
    '../timeline/AcuteProposalLane': proposals,
    '../../lib/acute-cycle-links': load('lib/acute-cycle-links.ts'),
    '../../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: () => ({ links: [] }) },
    '../timeline/CompletedAcuteCycleLabel': { CompletedAcuteCycleLabel: () => null, completedAcuteCycleDescription: () => '' },
    './MobileShell': { MobileModuleHeader: () => null, MobilePillTabs: () => null }, './mobile-timeline.css': {},
  }).default;
  const rooms = Array.from({ length: 15 }, (_, i) => ({ id: `room-${i + 1}`, name: `Sál ${i + 1}`, currentStepIndex: 0, isLocked: i === 0, completedOperations: [] }));
  const stats = Object.freeze({ operations: 0, cleaning: 0, free: 15, completed: 0, emergencyCount: 0 });
  const props = { rooms, currentSpecialties: new Map(), activeStatuses: [], currentTime: new Date(start + 60 * 60000), stats,
    onSelectRoom: () => {}, onOpenAcuteRequests: () => {}, acuteEnabled: true, acuteRequests: [request({ proposedStartAt: null })] };
  const html = renderToStaticMarkup(React.createElement(Mobile, props));
  assert.equal((html.match(/class="mtl-row"/g) ?? []).length, 15);
  assert.match(html, /acute-proposal-mobile/);
  assert.match(html, /Návrh — nepotvrzeno/);
  assert.match(html, /Sál uzamčen/);
  let buttonDepth = 0;
  for (const tag of html.matchAll(/<\/?button\b[^>]*>/g)) {
    buttonDepth += tag[0].startsWith('</') ? -1 : 1;
    assert.ok(buttonDepth <= 1, 'Proposal controls must not nest inside actual room buttons');
  }
  assert.equal(buttonDepth, 0);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Mobile, { ...props, acuteEnabled: false })), /acute-proposal-mobile/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Mobile, { ...props, acuteError: 'Offline' })), /acute-proposal-mobile/);
  assert.deepEqual(stats, { operations: 0, cleaning: 0, free: 15, completed: 0, emergencyCount: 0 });
});
