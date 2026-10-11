import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

// Presentation and render wiring only; no session, database or clinical writes.
// Browser QA separately verifies real viewport sizes and the fixed navigation.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = read('components/mobile/MobileTimelineView.tsx');
const css = postcss.parse(read('components/mobile/mobile-timeline.css'));
const rulesFor = selector => {
  const rules = [];
  css.walkRules(rule => { if (rule.selectors.includes(selector)) rules.push(rule); });
  return rules;
};
const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
const base = selector => declarations(rulesFor(selector)[0]);

function compile(sourceText, filename, dependencies = {}) {
  const { outputText } = ts.transpileModule(sourceText, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, mod.exports, mod);
  return mod.exports;
}
const display = compile(read('lib/mobile-room-display.ts'), 'mobile-room-display.ts');
const timeline = compile(read('lib/mobile-timeline.ts'), 'mobile-timeline.ts', { './mobile-room-display': display });
const operationalWarnings = compile(read('lib/timeline-operational-warnings.ts'), 'timeline-operational-warnings.ts');
const unusedMinutes = compile(read('lib/timeline-unused-minutes.ts'), 'timeline-unused-minutes.ts', {
  '../types': { DEFAULT_DAILY_BREAK_MINUTES: 30 },
});
const statuses = [
  { title: 'Sál připraven', name: 'Sál připraven', color: '#00D6C4' },
  { title: 'Chirurgický výkon', name: 'Chirurgický výkon', color: '#E82064' },
];
const now = Date.parse('2026-09-17T10:35:00Z');
const room = (id, active = false) => ({
  id: String(id), name: `Operační sál ${id}`, currentStepIndex: active ? 1 : 0,
  operationStartedAt: active ? new Date(now - 30 * 60000).toISOString() : null,
  phaseStartedAt: active ? new Date(now - 30 * 60000).toISOString() : null,
  estimatedEndTime: active ? new Date(now + 30 * 60000).toISOString() : null,
  weeklySchedule: Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .map(day => [day, { enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 0, breakMinutes: 0 }])),
});
function MobileModuleHeader() { return null; }
function MobilePillTabs() { return null; }

function render(rooms, stateOverride = {}, warningsByRoom) {
  const state = ['4', 0, null];
  for (const [index, value] of Object.entries(stateOverride)) state[Number(index)] = value;
  const mutations = [];
  const selected = [];
  let cursor = 0;
  const Component = compile(source, 'MobileTimelineView.tsx', {
    react: {
      __esModule: true, default: React,
      useId: () => 'qa-timeline-description',
      useMemo: compute => compute(),
      useState: () => {
        const index = cursor++;
        return [state[index], next => {
          state[index] = typeof next === 'function' ? next(state[index]) : next;
          mutations.push([index, state[index]]);
        }];
      },
    },
    'lucide-react': { ChevronLeft: 'ChevronLeft', ChevronRight: 'ChevronRight', LocateFixed: 'LocateFixed' },
    '../../lib/mobile-room-display': display,
    '../../lib/mobile-timeline': timeline,
    '../../lib/timeline-operational-warnings': operationalWarnings,
    '../../lib/timeline-unused-minutes': unusedMinutes,
    '../../lib/acute-cycle-links': compile(read('lib/acute-cycle-links.ts'), 'acute-cycle-links.ts'),
    '../../hooks/useAcuteCycleLinks': { useAcuteCycleLinks: () => ({ links: [] }) },
    '../timeline/CompletedAcuteCycleLabel': { CompletedAcuteCycleLabel: () => null, completedAcuteCycleDescription: () => '' },
    './MobileShell': { MobileModuleHeader, MobilePillTabs },
    '../timeline/AcuteProposalLane': {
      AcuteProposalLane: () => null,
      AcuteTimelineSummary: () => null,
      acuteProposalsForWindow: () => [],
    },
    './mobile-timeline.css': {},
  }).default;
  const tree = Component({
    rooms, activeStatuses: statuses, currentSpecialties: new Map([['1', [{ name: 'Chirurgie' }]]]),
    currentTime: new Date(now), stats: { operations: 1, cleaning: 1, free: 2, completed: 3, emergencyCount: 0 },
    warningsByRoom,
    onSelectRoom: value => selected.push(value),
  });
  assert.equal(cursor, state.length, 'Time browsing must not depend on viewport-specific room paging state');
  return { tree, mutations, selected, state };
}
function findAll(node, predicate) {
  const found = [];
  const visit = value => {
    if (!React.isValidElement(value)) return;
    if (predicate(value)) found.push(value);
    React.Children.toArray(value.props.children).forEach(visit);
  };
  visit(node);
  return found;
}
const byClass = (tree, cls) => findAll(tree, node => node.props.className?.split(/\s+/).includes(cls));
const byLabel = (tree, label) => findAll(tree, node => node.props['aria-label'] === label)[0];
function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return React.Children.toArray(node?.props?.children).map(text).join('');
}

test('mobile timeline stays viewport-bounded with one room-list scroll fallback', () => {
  const screen = base('.mtl-screen');
  assert.equal(screen.height, '100%');
  assert.equal(screen['min-height'], '0');
  assert.equal(screen.display, 'flex');
  assert.equal(screen['flex-direction'], 'column');
  assert.equal(screen.overflow, 'hidden');
  assert.match(screen.padding, /env\(safe-area-inset-top/);
  assert.match(screen.padding, /env\(safe-area-inset-bottom/);
  for (const selector of ['.mtl-axis', '.mtl-rows']) {
    const rule = base(selector);
    assert.equal(rule.flex, '1');
    assert.equal(rule['min-height'], '0');
  }
  assert.equal(base('.mtl-axis').overflow, 'hidden');
  assert.equal(base('.mtl-rows')['overflow-y'], 'auto');
  assert.equal(base('.mtl-rows')['overflow-x'], 'hidden');
  assert.equal(base('.mtl-rows')['grid-auto-rows'], 'minmax(32px, 1fr)');
  assert.equal(base('.mtl-row')['min-height'], '32px');
  assert.doesNotMatch(source, /overflow-[xy]-auto|MobileScreen|timeline-mobile-axis-scroll/);
  assert.match(read('App.tsx'), /currentView === 'dashboard' \|\| acuteRoomEnabled \? 'pb-0' : 'pb-20'/);
  assert.match(read('components/TimelineModule.tsx'), /w-full h-full text-white overflow-hidden flex flex-col/);
});

test('timeline presentation stays phone-only and preserves touchable time controls on short screens', () => {
  css.walkRules(rule => {
    let parent = rule.parent;
    let phoneOnly = false;
    while (parent) {
      if (parent.type === 'atrule' && parent.name === 'media' && /max-width:\s*767px/.test(parent.params)) phoneOnly = true;
      parent = parent.parent;
    }
    assert.ok(phoneOnly, `${rule.selector} must not change desktop`);
  });
  assert.ok(rulesFor('.mtl-screen').some(rule => /max-height:\s*700px/.test(rule.parent.params)));
  assert.ok(rulesFor('.mtl-screen').some(rule => /max-height:\s*500px/.test(rule.parent.params)));
  for (const selector of ['.mtl-time-pager button']) {
    const rule = base(selector);
    assert.equal(rule.width, '44px');
    assert.equal(rule.height, '44px');
    assert.ok(rulesFor(selector).every(rule => declarations(rule).display !== 'none'));
  }
  assert.equal(base('.mtl-now')['min-height'], '44px');
});

for (const count of [0, 1, 15, 25]) {
  test(`${count} rooms render together in source order without a hidden room page`, () => {
    const rooms = Array.from({ length: count }, (_, i) => room(i + 1, i === 0));
    const result = render(rooms);
    const rows = byClass(result.tree, 'mtl-row');
    assert.equal(rows.length, count);
    assert.equal(byClass(result.tree, 'mtl-room-pager').length, 0);
    assert.equal(byLabel(result.tree, 'Předchozí sály'), undefined);
    assert.equal(byLabel(result.tree, 'Další sály'), undefined);
    const countLabel = text(byClass(result.tree, 'mtl-room-count')[0]);
    assert.match(countLabel, /[Ss]ál/);
    assert.match(countLabel, new RegExp(`\\b${count}\\b`));
    rows.forEach((row, index) => {
      assert.equal(row.type, 'button');
      assert.equal(row.props.type, 'button');
      assert.ok(row.props['aria-label'].startsWith(`${rooms[index].name},`));
      const heading = byClass(row, 'mtl-row-heading')[0];
      const name = findAll(heading, node => node.type === 'strong')[0];
      assert.equal(text(name), rooms[index].name);
      assert.equal(name.props.title, rooms[index].name);
      row.props.onClick();
      assert.equal(result.selected.at(-1), rooms[index]);
    });
    if (count) {
      assert.match(rows[0].props['aria-label'], /Chirurgie.*Otevřít detail sálu/);
      assert.equal(byClass(result.tree, 'mtl-empty').length, 0);
    } else {
      assert.match(text(byClass(result.tree, 'mtl-empty')[0]), /Žádné operační sály/);
    }
  });
}

test('room-list sizing uses CSS rather than ResizeObserver or room pagination state', () => {
  assert.doesNotMatch(source, /ResizeObserver|useEffect|useRef|mobileTimelinePageSize|pageRooms|safeFirst|firstRoom|setPageSize/);
  const rows = byClass(render(Array.from({ length: 25 }, (_, i) => room(i + 1))).tree, 'mtl-rows')[0];
  assert.equal(rows.props.ref, undefined);
  assert.equal(rows.props.style?.gridTemplateRows, undefined);
});

test('each compact row has a name rail, subtle state dot and a matching miniature timeline', () => {
  assert.equal(base('.mtl-row').display, 'grid');
  assert.equal(base('.mtl-row')['grid-template-columns'], 'var(--mtl-label-width) minmax(0, 1fr)');
  assert.equal(base('.mtl-ruler')['margin-left'], 'var(--mtl-label-width)');
  assert.ok(Number.parseFloat(base('.mtl-track').height) <= 16, 'A single-line track must leave space for all rooms');
  assert.equal(base('.mtl-row-heading > strong')['-webkit-line-clamp'], '2');
  const rows = byClass(render([room(1, true), room(2)]).tree, 'mtl-row');
  rows.forEach((row, index) => {
    assert.equal(byClass(row, 'mtl-track').length, 1);
    const phase = byClass(row, 'mtl-phase')[0];
    assert.equal(findAll(phase, node => node.type === 'i')[0].props.style.background, statuses[index === 0 ? 1 : 0].color);
    assert.equal(text(byClass(phase, 'sr-only')[0]), statuses[index === 0 ? 1 : 0].title);
    assert.match(phase.props.title, /Aktuální stav:/);
  });
  assert.equal(base('.mtl-segment[data-kind=current]').background, 'var(--segment-color)');
  assert.match(base('.mtl-segment[data-kind=estimate]').border, /dashed/);
});

test('shrinking room sets and long room names keep every remaining room addressable', () => {
  const longName = 'EXTERNÍ ANESTEZIE — GASTROENTEROLOGIE, MAGNETICKÁ REZONANCE A CT';
  const rooms = [{ ...room(1), name: longName }];
  const result = render(rooms);
  const rows = byClass(result.tree, 'mtl-row');
  assert.equal(rows.length, 1);
  assert.ok(rows[0].props['aria-label'].includes(longName));
  assert.equal(text(findAll(byClass(rows[0], 'mtl-row-heading')[0], node => node.type === 'strong')[0]), longName);
  rows[0].props.onClick();
  assert.equal(result.selected[0], rooms[0]);
  assert.equal(byClass(render([]).tree, 'mtl-row').length, 0);
});

test('time paging anchors browsing and the current-time action resets the live window', () => {
  const result = render([room(1)]);
  byLabel(result.tree, 'Předchozí časový úsek').props.onClick();
  assert.deepEqual(result.mutations, [[2, now], [1, -1]]);
  byLabel(result.tree, 'Následující časový úsek').props.onClick();
  assert.deepEqual(result.mutations.slice(-2), [[2, now], [1, 0]]);
  byLabel(result.tree, 'Zobrazit aktuální čas').props.onClick();
  assert.deepEqual(result.mutations.slice(-2), [[1, 0], [2, null]]);
  const tabs = findAll(result.tree, node => node.type === MobilePillTabs)[0];
  assert.deepEqual(tabs.props.tabs.map(tab => tab.id), ['2', '4', 'day']);
  tabs.props.onChange('day');
  assert.deepEqual(result.mutations.slice(-3), [[0, 'day'], [1, 0], [2, null]]);
});

test('each time scale keeps all room rows and communicates the selected time window', () => {
  const rooms = Array.from({ length: 25 }, (_, i) => room(i + 1));
  for (const scale of ['2', '4', 'day']) {
    const anchor = now - 24 * 60 * 60000;
    const result = render(rooms, { 0: scale, 1: 1, 2: anchor });
    const window = timeline.getMobileTimelineWindow(anchor, scale === 'day' ? 'day' : Number(scale), 1);
    const ruler = byClass(result.tree, 'mtl-ruler')[0];
    const ticks = findAll(ruler, node => node.type === 'time');
    assert.equal(ticks.length, 5);
    assert.equal(Date.parse(ticks[0].props.dateTime), window.startMs);
    assert.equal(Date.parse(ticks.at(-1).props.dateTime), window.endMs);
    assert.equal(byClass(result.tree, 'mtl-row').length, rooms.length);
    assert.match(text(byClass(result.tree, 'mtl-range-announcement')[0]), /Časový úsek .* až /);
    byLabel(result.tree, 'Následující časový úsek').props.onClick();
    assert.deepEqual(result.mutations, [[2, anchor], [1, 2]]);
  }
});

test('actual progress, estimated end and current state remain distinguishable and accessible', () => {
  const completed = {
    ...room(3),
    completedOperations: [{
      startedAt: new Date(now - 80 * 60000).toISOString(),
      endedAt: new Date(now - 40 * 60000).toISOString(),
      statusHistory: [{ stepIndex: 1, startedAt: new Date(now - 80 * 60000).toISOString() }],
    }],
  };
  const result = render([room(1, true), room(2), completed]);
  const segments = byClass(result.tree, 'mtl-segment');
  assert.ok(segments.some(node => node.props['data-kind'] === 'current'));
  assert.ok(segments.some(node => node.props['data-kind'] === 'estimate'));
  assert.ok(segments.some(node => node.props['data-kind'] === 'history'));
  const estimate = segments.find(node => node.props['data-kind'] === 'estimate');
  assert.match(estimate.props.title, /Odhad konce/);
  const rows = byClass(result.tree, 'mtl-row');
  const intervalDescription = row => findAll(row, node => node.props.id === row.props['aria-describedby'])[0];
  assert.match(text(intervalDescription(rows[0])), /Chirurgický výkon.*Odhad konce/);
  assert.match(text(intervalDescription(rows[1])), /Bez záznamu/);
  assert.match(text(intervalDescription(rows[2])), /Chirurgický výkon/);
  const descriptionIds = rows.map(row => {
    const description = intervalDescription(row);
    assert.equal(row.props['aria-describedby'], description.props.id);
    assert.ok(description.props.id, 'Each room needs an addressable interval summary');
    return description.props.id;
  });
  assert.equal(new Set(descriptionIds).size, descriptionIds.length, 'Room summary identifiers must be distinct');
  assert.equal(byClass(result.tree, 'mtl-now-line').length, 3);
  assert.equal(byClass(result.tree, 'mtl-no-record').length, 1);
  assert.match(byClass(result.tree, 'mtl-no-record')[0].props.title || text(byClass(result.tree, 'mtl-no-record')[0]), /Bez záznamu/);
  assert.equal(byLabel(result.tree, 'Časová osa provozu').type, 'section');
  assert.equal(byLabel(result.tree, 'Stránkování sálů'), undefined);
});

test('operational warnings appear only on affected room rows and read out all details', () => {
  const warningsByRoom = new Map([['1', [
    { type: 'overdue', roomId: '1', estimatedEndMs: now - 18 * 60_000, minutesOverdue: 18 },
    { type: 'missing_staff', roomId: '1', missingRoles: ['doctor', 'nurse'] },
    { type: 'schedule_collision', roomId: '1', scheduleIds: ['a', 'b'], overlapStartMs: now, overlapEndMs: now + 15 * 60_000, overlapMinutes: 15 },
  ]]]);
  const result = render([room(1, true), room(2)], {}, warningsByRoom);
  const rows = byClass(result.tree, 'mtl-row');
  assert.equal(byClass(rows[0], 'mtl-warning-chip').length, 1);
  assert.equal(byClass(rows[0], 'mtl-warning-chip')[0].props['data-kind'], 'schedule_collision');
  assert.match(rows[0].props['aria-label'], /Upozornění:/);
  assert.ok(rows[0].props['aria-label'].includes(operationalWarnings.describeTimelineOperationalWarning(warningsByRoom.get('1')[2])));
  assert.doesNotMatch(rows[0].props['aria-label'], /Odhad konce překročen/);
  assert.equal(byClass(rows[0], 'mtl-unused-chip').length, 0);
  assert.match(rows[0].props['aria-label'], /\d+ nevyužitých minut/);
  assert.equal(byClass(rows[1], 'mtl-warning-chip').length, 0);
  assert.doesNotMatch(rows[1].props['aria-label'], /Upozornění:/);
  assert.equal(byClass(rows[1], 'mtl-unused-chip').length, 0);
  assert.match(rows[1].props['aria-label'], /\d+ nevyužitých minut/);
  rows[0].props.onClick();
  assert.equal(result.selected[0].id, '1');
});

test('team remains two stacked dots while working minutes stay accessible without visual badges', () => {
  const warningsByRoom = new Map([
    ['1', [{ type: 'overdue', roomId: '1', estimatedEndMs: now - 12 * 60_000, minutesOverdue: 12 }]],
    ['2', [{ type: 'missing_staff', roomId: '2', missingRoles: ['nurse'] }]],
  ]);
  const rooms = [room(1, true), {
    ...room(2, true), staff: { doctor: { name: 'MUDr. Novák' }, nurse: { name: '' } },
  }];
  const rows = byClass(render(rooms, {}, warningsByRoom).tree, 'mtl-row');
  assert.equal(byClass(rows[0], 'mtl-warning-chip').length, 0);
  assert.equal(byClass(rows[0], 'mtl-unused-chip').length, 0);
  assert.equal(byClass(rows[1], 'mtl-warning-chip').length, 0);
  const dots = byClass(rows[1], 'mtl-team-dots');
  assert.equal(dots.length, 1);
  assert.deepEqual(React.Children.toArray(dots[0].props.children).map(dot => [dot.props['data-team-role'], dot.props['data-team-assigned']]),
    [['doctor', true], ['nurse', false]]);
  assert.match(rows[1].props['aria-label'], /ARO lékař: vyplněno; ARO sestra: nevyplněno/);
  assert.match(rows[1].props['aria-label'], /nevyužitých minut/);
  assert.doesNotMatch(rows[1].props['aria-label'], /Odhad konce překročen/);
});

test('room without configured working hours announces unavailable minutes rather than zero', () => {
  const rows = byClass(render([room(1, false)], {}, new Map()).tree, 'mtl-row');
  assert.match(rows[0].props['aria-label'], /\d+ nevyužitých minut/);
  const unconfigured = byClass(render([{ ...room(1, false), weeklySchedule: undefined }], {}, new Map()).tree, 'mtl-row');
  assert.equal(byClass(unconfigured[0], 'mtl-unused-chip').length, 0);
  assert.match(unconfigured[0].props['aria-label'], /nelze určit/);
  assert.doesNotMatch(unconfigured[0].props['aria-label'], /0 nevyužitých minut/);
});
