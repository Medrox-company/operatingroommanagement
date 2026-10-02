import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Řádek sálu byl vyjmut z TimelineModule do vlastní komponenty. Tento test ho
// skutečně vykreslí — neověřuje jen to, že projde typová kontrola. Zároveň
// hlídá dvě vlastnosti, na kterých ten refaktor stojí:
//   1. komponenta nemá vlastní stav ani hooky (čistá funkce props),
//   2. nepřitáhla si žádnou runtime závislost na databázi ani React kontextech.

const load = (path, requireStub) => {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path.split('/').pop(),
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(requireStub, module.exports, module);
  return module.exports;
};

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const schedule = () => Object.fromEntries(DAY_KEYS.map(day => [day, {
  enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 30, breakMinutes: 30,
}]));

// Atrapy propouštějí className, style a title — barvy a rozměry řádku jsou
// součástí toho, co se testuje.
const stubComponent = tag => ({ children, className, style, title }) =>
  React.createElement(tag === 'div' ? 'div' : 'span', { 'data-stub': tag, className, style, title }, children ?? null);
const constants = load('../../components/timeline/constants.ts', name => { throw new Error(`constants nemá mít závislost: ${name}`); });
const utils = load('../../components/timeline/utils.ts', name => {
  if (name === './constants') return constants;
  throw new Error(`utils nemá mít závislost: ${name}`);
});
const warningLabels = load('../../lib/timeline-operational-warnings.ts', name => {
  throw new Error(`Upozornění nemají mít runtime závislost: ${name}`);
});
const unusedMinutes = load('../../lib/timeline-unused-minutes.ts', name => {
  if (name === '../types') return { DEFAULT_DAILY_BREAK_MINUTES: 30 };
  throw new Error(`Výpočet nevyužitých minut nemá mít runtime závislost: ${name}`);
});

const allowed = {
  react: React,
  'framer-motion': {
    motion: new Proxy({}, { get: (_t, key) => stubComponent(String(key)) }),
    AnimatePresence: stubComponent('div'),
  },
  'lucide-react': new Proxy({}, { get: () => stubComponent('span') }),
  '../../types': { DEFAULT_WEEKLY_SCHEDULE: schedule(), DEFAULT_DAILY_BREAK_MINUTES: 30 },
  '../RoomSpecialtyBadge': { TimelineRoomSpecialtyStrip: stubComponent('span') },
  './constants': constants,
  './utils': utils,
  '../../lib/timeline-operational-warnings': warningLabels,
  '../../lib/timeline-unused-minutes': unusedMinutes,
};

const { TimelineRoomRow } = load('../../components/timeline/TimelineRoomRow.tsx', name => {
  if (name in allowed) return allowed[name];
  assert.fail(`Řádek sálu si přitáhl neočekávanou runtime závislost: ${name}`);
});

const at = (hour, minute = 0) => new Date(2026, 8, 28, hour, minute);
const currentTime = at(11, 30);

const status = (name, order) => ({ id: `s${order}`, name, title: name, order_index: order, color: '#38BDF8', accent_color: '#38BDF8' });
const activeStatuses = [status('Sál připraven', 0), status('Příprava', 1), status('Výkon', 2), status('Úklid', 3)];

const room = (overrides = {}) => ({
  id: 'sal-1',
  name: 'PCHO SÁL Č.2',
  department: 'CHIR',
  currentStepIndex: 2,
  isEmergency: false,
  isLocked: false,
  isPaused: false,
  isSeptic: false,
  operationStartedAt: at(9).toISOString(),
  phaseStartedAt: at(10).toISOString(),
  estimatedEndTime: at(13).toISOString(),
  statusHistory: [],
  completedOperations: [],
  weeklySchedule: schedule(),
  staff: {},
  ...overrides,
});

const props = (overrides = {}) => ({
  room: room(),
  warnings: [],
  roomIndex: 0,
  currentTime,
  dayWindowStartMs: at(7).getTime(),
  TIMELINE_HOURS: 17,
  rowHeight: 48,
  density: 'auto',
  showSummary: false,
  scrubActive: false,
  scrubTime: null,
  activeStatuses,
  statusByOrderIndex: Object.fromEntries(activeStatuses.map(item => [item.order_index, item])),
  currentSpecialties: new Map(),
  roomUtilization: { rows: [{ id: 'sal-1', utilizationPct: 64, operations: 3, occupiedMinutes: 260 }] },
  getTimePercentForTimeline: () => 25,
  getOperationPosition: () => ({ leftPct: 10, widthPct: 20, visible: true }),
  getRemainingTime: () => '1h 30m',
  getAroPosition: () => null,
  getOvertimeInfo: () => undefined,
  statusAtTime: () => ({ color: '#38BDF8', name: 'Výkon' }),
  utilColor: () => '#34D399',
  openLiveRoom: () => {},
  openHistoricalPhase: () => {},
  setStatsRoomId: () => {},
  setHoveredOp: () => {},
  ...overrides,
});

test('řádek sálu se vykreslí z reálných props a ukáže název sálu i aktuální fázi', () => {
  const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props()));
  assert.match(markup, /PCHO SÁL Č\.2/, 'Název sálu musí zůstat v značkování');
  assert.ok(markup.length > 500, 'Řádek nesmí skončit jako prázdný fragment');
});

test('vykreslení je deterministické — řádek si nedrží ani nemění žádný stav', () => {
  const first = renderToStaticMarkup(React.createElement(TimelineRoomRow, props()));
  const second = renderToStaticMarkup(React.createElement(TimelineRoomRow, props()));
  assert.equal(first, second, 'Dvě vykreslení se stejnými props musí dát shodné značkování');
});

test('volný, uzamčený a nouzový sál se vykreslí bez výjimky', () => {
  for (const overrides of [
    { currentStepIndex: 0, roomNumber: 0 },
    { isLocked: true, roomNumber: 0 },
    { isEmergency: true, roomNumber: 0 },
    { isPaused: true, pausedAt: at(11).toISOString() },
    { currentStepIndex: 3 },
  ]) {
    const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({ room: room(overrides) })));
    assert.match(markup, /PCHO SÁL Č\.2/, `Stav ${JSON.stringify(overrides)} musí zůstat vykreslitelný`);
  }
});

test('kolize je viditelná v řádku i ve správném úseku osy a má přístupný popis', () => {
  const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
    warnings: [{ type: 'schedule_collision', roomId: 'sal-1', scheduleIds: ['a', 'b'],
      overlapStartMs: at(10).getTime(), overlapEndMs: at(10, 30).getTime(), overlapMinutes: 30 }],
  })));
  assert.match(markup, /Kolize/);
  assert.match(markup, /Kolize plánovaných výkonů 10:00–10:30/);
  assert.match(markup, /background:#FBBF24/);
});

test('obsazení ARO lékaře a sestry ukazují dvě tečky bez textového štítku Chybí tým', () => {
  const currentRoom = room({ staff: { doctor: { name: 'MUDr. Novák' }, nurse: { name: '' } } });
  const missingTeam = [{ type: 'missing_staff', roomId: currentRoom.id, missingRoles: ['nurse'] }];
  for (const isEmergency of [false, true]) {
    const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
      room: { ...currentRoom, isEmergency }, warnings: missingTeam,
    })));
    assert.match(markup, /data-team-role="doctor" data-team-assigned="true"/);
    assert.match(markup, /data-team-role="nurse" data-team-assigned="false"/);
    assert.match(markup, /ARO lékař: vyplněno; ARO sestra: nevyplněno/);
    assert.doesNotMatch(markup, />Chybí tým(?:<|\s)/);
  }
});

test('štítek místo skluzu ukazuje dosud nevyužité minuty nastavené směny', () => {
  const overdue = [{ type: 'overdue', roomId: 'sal-1', estimatedEndMs: at(10).getTime(), minutesOverdue: 90 }];
  const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
    room: room({ estimatedEndTime: at(10).toISOString() }), warnings: overdue,
  })));
  assert.match(markup, /Nevyužito 113 min/);
  assert.match(markup, /113 nevyužitých minut/);
  assert.doesNotMatch(markup, />Skluz(?:<|\s)/);
  assert.match(markup, /Překročený odhad konce/);
});

test('připravený sál spojuje stav a nevyužité minuty do jedné karty vpravo', () => {
  const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
    room: room({ currentStepIndex: 0, operationStartedAt: null }),
  })));
  const summaryStart = markup.indexOf('timeline-room-availability-summary');
  assert.ok(summaryStart > 0, 'Souhrnná karta připraveného sálu musí být zobrazena');
  assert.match(markup.slice(summaryStart), /Sál připraven[\s\S]*?>Nevyužito \d+ min</);
  assert.match(markup.slice(summaryStart), /data-room-availability="ready"/);
  assert.equal((markup.match(/>Nevyužito \d+ min</g) ?? []).length, 1,
    'Údaj nesmí být zároveň vedle názvu sálu');
});

test('aktivní, uzamčený a nouzový sál používají stejnou dvouřádkovou kartu vpravo', () => {
  for (const [overrides, kind, label] of [
    [{}, 'busy', 'Sál v provozu'],
    [{ isLocked: true }, 'locked', 'Sál uzamčen'],
    [{ isEmergency: true }, 'emergency', 'Stav nouze'],
  ]) {
    const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
      room: room(overrides),
    })));
    assert.match(markup, /timeline-room-availability-summary absolute right-3/);
    assert.match(markup, new RegExp(`data-room-availability="${kind}"[\\s\\S]*?${label}[\\s\\S]*?>Nevyužito \\d+ min<`));
    assert.equal((markup.match(/>Nevyužito \d+ min</g) ?? []).length, 1);
    assert.ok(markup.indexOf('timeline-room-availability-summary') > markup.indexOf('timeline-room-label'),
      'Metrika nesmí být v levém sloupci s názvem sálu');
  }
});

test('stavové karty vpravo zobrazují text bez piktogramů', () => {
  for (const overrides of [
    { currentStepIndex: 0, operationStartedAt: null },
    {},
    { isLocked: true },
    { isPaused: true },
    { isEmergency: true },
  ]) {
    const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({ room: room(overrides) })));
    const start = markup.indexOf('timeline-room-availability-summary');
    const end = markup.indexOf('data-unused-severity=', start);
    assert.ok(start >= 0 && end > start);
    assert.doesNotMatch(markup.slice(start, end), /data-stub="span"/,
      `Stavová karta ${JSON.stringify(overrides)} nesmí obsahovat ikonu`);
  }
});

test('barevná linka rozlišuje množství nevyužitých minut a neznámý rozvrh', () => {
  for (const [time, severity, color] of [
    [at(7, 30), 'low', '#34D399'],
    [at(9), 'medium', '#FBBF24'],
    [at(10), 'high', '#FB923C'],
    [at(12), 'critical', '#F43F5E'],
  ]) {
    const markup = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
      room: room({ currentStepIndex: 0, operationStartedAt: null }), currentTime: time,
    })));
    assert.match(markup, new RegExp(`style="background:${color}" data-unused-severity="${severity}"`));
  }
  const withoutSchedule = renderToStaticMarkup(React.createElement(TimelineRoomRow, props({
    room: room({ currentStepIndex: 0, operationStartedAt: null, weeklySchedule: undefined }),
  })));
  assert.match(withoutSchedule, /data-unused-severity="unknown"/);
  assert.match(withoutSchedule, />Nevyužito —</);
});
