import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const now = new Date(2026, 9, 3, 18);
const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  static now() { return now.getTime(); }
}
function load(path, imports = {}) {
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { fileName: path, compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'Date', js)(name => {
    if (name.endsWith('.css')) return {};
    assert.ok(Object.hasOwn(imports, name), `Unexpected runtime dependency: ${name}`);
    return imports[name];
  }, module, module.exports, FixedDate);
  return module.exports;
}
const activity = load('lib/statistics-room-activity.ts');
const scope = load('lib/statistics-room-scope.ts');
const detail = load('lib/statistics-room-detail.ts');
const chartNames = ['AreaChart', 'Area', 'BarChart', 'Bar', 'PieChart', 'Pie', 'Cell', 'ResponsiveContainer', 'XAxis', 'YAxis', 'Tooltip', 'Line', 'CartesianGrid', 'ComposedChart'];
const charts = Object.fromEntries(chartNames.map(name => [name, name]));
const panel = load('components/statistics/RoomActivityPanels.tsx', {
  react: { ...React, useMemo: fn => fn(), memo: fn => fn },
  'lucide-react': { Clock: 'Clock', X: 'X' },
  recharts: charts,
  '../../lib/statistics-room-activity': activity,
  '../../lib/statistics-room-scope': scope,
  '../../lib/statistics-room-detail': detail,
  './statistics-theme': { C: {}, TIP: {} },
  './StatisticsPrimitives': { roomStatusColor: () => '#fff', roomStatusLabel: () => 'Volný', Card: 'Card', SectionLabel: 'SectionLabel' },
}).RoomDetailPanel;
const room = { id: 'room-a', name: 'Sál A', currentStepIndex: 0, operations24h: 0, queueCount: 0 };
const steps = [
  { title: 'Sál připraven', color: '#0f0' },
  { title: 'Chirurgický výkon', color: '#f00' },
  { title: 'Ukončení výkonu', color: '#00f' },
];
const at = (day, hour, minute = 0) => new NativeDate(2026, 9, day, hour, minute).toISOString();
const event = (type, day, hour, extras = {}) => ({ operating_room_id: room.id, event_type: type, timestamp: at(day, hour), ...extras });
const history = [
  event('operation_start', 3, 9), event('operation_end', 3, 10),
  event('step_change', 3, 10, { step_name: 'Chirurgický výkon', duration_seconds: 3600 }),
  event('step_change', 3, 11, { step_name: 'Ukončení  výkonu', duration_seconds: 1800 }),
  event('step_change', 3, 9, { step_name: 'Sál připraven', duration_seconds: 7200 }),
  event('operation_start', 2, 9), event('operation_end', 2, 11),
  event('step_change', 2, 11, { step_name: 'Chirurgický výkon', duration_seconds: 7200 }),
];
const props = { room, workflowSteps: steps, onClose() {}, period: 'den', selectedDay: new NativeDate(2026, 9, 3), history, trendHistory: history, loading: false, error: null };
function flatten(node) {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node == null || typeof node === 'boolean') return [];
  return typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [node];
}
const text = tree => flatten(tree).filter(n => typeof n !== 'object').join(' ');
const kpi = (tree, label) => flatten(tree).find(n => n?.type === 'Card' && text(n).startsWith(label));

test('popup shows recorded operations on a closed Saturday despite a zero room counter', () => {
  const tree = panel(props);
  assert.equal(text(kpi(tree, 'Výkony ve výběru')), 'Výkony ve výběru 1');
  assert.equal(text(kpi(tree, 'Vytížení sálu')), 'Vytížení sálu —');
  const curve = flatten(tree).find(n => n?.type === 'AreaChart').props.data;
  assert.equal(curve.length, 24);
  assert.equal(curve.reduce((sum, row) => sum + row.v, 0), 4);
  assert.match(text(tree), /Bez nastavené kapacity/);
});

test('selected date clips measured intervals, normalizes names, and excludes ready time', () => {
  const phases = detail.roomDetailPhaseDistribution(history, room.id, steps, scope.statisticsDayWindow(props.selectedDay));
  assert.deepEqual(phases.map(p => [p.title, p.min]), [['Chirurgický výkon', 60], ['Ukončení výkonu', 30]]);
  assert.equal(phases[0].pct, 60 / 90 * 100);
  const yesterday = panel({ ...props, selectedDay: new NativeDate(2026, 9, 2) });
  assert.match(text(yesterday), /2\. října 2026/);
  const bars = flatten(yesterday).find(n => n?.type === 'BarChart' && n.props.layout === 'vertical').props.data;
  assert.equal(bars[0].min, 120);
});

test('boundary-spanning phase contributes only its measured overlap and retains sub-minute values', () => {
  const rows = [event('step_change', 3, 8, { step_name: steps[1].title, duration_seconds: 7200 }),
    event('step_change', 3, 9, { step_name: steps[2].title, duration_seconds: 12 }),
    event('step_change', 3, 9, { step_name: steps[1].title, duration_seconds: -12 }),
    event('step_change', 3, 9, { operating_room_id: 'other', step_name: steps[1].title, duration_seconds: 7200 })];
  assert.deepEqual(detail.roomDetailPhaseDistribution(rows, room.id, steps, scope.statisticsDayWindow(props.selectedDay)).map(p => p.min), [60, 0.2]);
});

test('night activity belongs to the operational day; no schedule filters hourly counts', () => {
  const rows = [event('operation_start', 4, 6), event('operation_start', 4, 7), event('operation_start', 3, 6)];
  assert.equal(activity.countOperationsForDay(room, rows, props.selectedDay), 1);
  const bins = detail.roomDetailHourlyEvents(rows, room.id, scope.statisticsDayWindow(props.selectedDay));
  assert.equal(bins[6].v, 1);
  assert.equal(bins.reduce((sum, bin) => sum + bin.v, 0), 1);
});

test('popup follows updated shared history without a separate capped database request', () => {
  const updated = [...history, event('operation_start', 3, 12), event('operation_end', 3, 13)];
  assert.equal(text(kpi(panel({ ...props, history: updated, trendHistory: updated }), 'Výkony ve výběru')), 'Výkony ve výběru 2');
  const many = Array.from({ length: 1101 }, (_, i) => ({ ...event('operation_start', 3, 12), id: String(i) }));
  assert.equal(text(kpi(panel({ ...props, history: many }), 'Výkony ve výběru')), 'Výkony ve výběru 1101');
});

test('global period selection uses the same count rule as the room card', () => {
  for (const [period, expected] of [['den', 1], ['týden', 2], ['měsíc', 2], ['rok', 2]]) {
    const tree = panel({ ...props, selectedDay: null, period });
    assert.equal(text(kpi(tree, 'Výkony ve výběru')), `Výkony ve výběru ${expected}`);
    assert.equal(expected, activity.countOperationsInWorkingHours(room, history, period));
  }
});

test('loading and failed history never render misleading zero statistics', () => {
  for (const overrides of [{ loading: true }, { error: 'Historii se nepodařilo načíst.' }]) {
    const tree = panel({ ...props, ...overrides });
    assert.equal(kpi(tree, 'Výkony ve výběru'), undefined);
    assert.ok(flatten(tree).some(n => ['status', 'alert'].includes(n?.props?.role)));
  }
});

test('archive fallback is deduplicated against lifecycle events and still works alone', () => {
  const archived = { ...room, completedOperations: [{ startedAt: at(3, 9), endedAt: at(3, 10) }] };
  assert.equal(text(kpi(panel({ ...props, room: archived }), 'Výkony ve výběru')), 'Výkony ve výběru 1');
  assert.equal(text(kpi(panel({ ...props, room: archived, history: [] }), 'Výkony ve výběru')), 'Výkony ve výběru 1');
});

test('weekly context does not mix multiple weeks into the same weekday', () => {
  const old = event('step_change', 26, 10, { timestamp: new NativeDate(2026, 8, 26, 10).toISOString(), step_name: steps[1].title, duration_seconds: 7200 });
  const tree = panel({ ...props, trendHistory: [...history, old] });
  const weekly = flatten(tree).find(n => n?.type === 'BarChart' && n.props.barSize === 16).props.data;
  assert.equal(weekly.reduce((sum, row) => sum + row[steps[1].title], 0), 180);
  assert.equal(weekly.at(-1)[steps[1].title], 60);
});

test('every room entry point forwards the calendar selection and parent shares realtime data', () => {
  const rooms = readFileSync(new URL('../../components/statistics/RoomsTab.tsx', import.meta.url), 'utf8');
  assert.match(rooms, /onRoomSelect\?\.\(room, calendarSelectionActive \? calendarDay : null\)/);
  assert.equal((rooms.match(/onClick=\{\(\) => openRoom\(/g) || []).length, 3);
  const parent = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
  assert.match(parent, /history=\{roomSelection\?\.day \? allDayHistory : allStatusHistory\}/);
  assert.match(parent, /roomSelection\?\.hospitalId === activeHospitalId/);
  assert.match(parent, /allRooms\.find\(room => room\.id === roomSelection\?\.id\)/);
});
