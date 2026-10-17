import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
function load(path, imports = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(new URL(path, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', 'module', compiled)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected ${path} dependency: ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const helpers = load('lib/statistics-export.ts', {
  './statistics-performance': load('lib/statistics-performance.ts'),
  './statistics-export-utilization': load('lib/statistics-export-utilization.ts'),
  './statistics-export-notifications': load('lib/statistics-export-notifications.ts'),
});
const schedule = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  .map(day => [day, { enabled: true, startHour: 7, endHour: 15, startMinute: 0, endMinute: 0, breakMinutes: 60 }]));
const room = (id = 'a', overrides = {}) => ({ id, name: `Celý název operačního sálu ${id}`, weeklySchedule: schedule, ...overrides });
const event = (id, type, timestamp, overrides = {}) => ({
  id, event_type: type, timestamp, created_at: timestamp, operating_room_id: 'a',
  metadata: {}, duration_seconds: null, step_index: null, step_name: null, ...overrides,
});
const cycle = (id, start, end, roomId = 'a') => [
  event(`${id}-start`, 'operation_start', start, { operating_room_id: roomId }),
  event(`${id}-end`, 'operation_end', end, { operating_room_id: roomId }),
];
const build = (overrides = {}) => helpers.buildStatisticsPeriodExport({
  hospitalId: 'synthetic', hospitalName: 'Synthetic test fixture', rooms: [room()], history: [], notifications: [],
  range: helpers.exportDateRange('day', '2026-07-06'), generatedAt: new Date('2026-07-08T18:00:00Z'),
  excludeShortPhases: false, ...overrides,
});
const dashboardSection = (value, title) => value.report.dashboard.find(section => section.title === title);

test('historical PDF has a five-panel graphic dashboard with shared original charts and complete detail sections', () => {
  const value = build();
  assert.equal(value.report.layout, 'dashboard');
  assert.equal(value.report.dashboard.length, 5);
  assert.deepEqual(value.report.dashboard.map(section => section.chart.kind), ['bars', 'donut', 'columns', 'donut', 'bars']);
  assert.equal(value.report.dashboard[0], value.report.sections[0], 'Shared chart can be omitted from the paper appendix without guessing its title');
  assert.equal(value.report.dashboard[4], value.report.sections.find(section => section.title === 'Notifikace a provozní upozornění'));
  assert.ok(value.report.sections.some(section => section.title === 'Fáze' && section.columns.length));
  assert.ok(value.report.sections.some(section => section.title === 'Provoz v rozpisu a ÚPS' && section.columns.length));
  assert.ok(value.csvReport.sections.some(section => section.title === 'Zdrojové řádky room_status_history'));
  assert.ok(!value.csvReport.sections.some(section => section.title === 'Zastoupení operačních fází'), 'CSV remains exact tabular evidence, not decorative dashboard sections');
});

test('operations chart retains every real room, complete names, zero counts and historical archived rooms', () => {
  const rooms = Array.from({ length: 17 }, (_, index) => room(`room-${index}`));
  const history = [...cycle('one', '2026-07-06T06:00:00Z', '2026-07-06T07:00:00Z', 'room-0'),
    event('archived-completion', 'operation_completed', '2026-07-06T09:00:00Z', { operating_room_id: 'archived', duration_seconds: 3600 })];
  const value = build({ rooms, history });
  const points = dashboardSection(value, 'Dokončené cykly podle sálu').chart.points;
  assert.equal(points.length, 18, 'No first-page top-N truncation drops rooms');
  assert.deepEqual(points.slice(0, 17).map(point => point.label), rooms.map(room => room.name));
  assert.equal(points[0].value, 1);
  assert.equal(points[1].value, 0);
  assert.equal(points[17].value, 1);
  assert.equal(points[17].label, 'Archivovaný sál — název nedostupný');
  assert.equal(points.reduce((total, point) => total + point.value, 0), value.json.completedCycles.length);
});

test('phase composition uses exact hours after the requested filter and never includes ready idle time', () => {
  const history = [
    event('surgery', 'step_change', '2026-07-06T09:00:00Z', { step_name: 'Chirurgický výkon', duration_seconds: 3600 }),
    event('cleanup', 'step_change', '2026-07-06T10:00:00Z', { step_name: 'Úklid', duration_seconds: 600 }),
    event('short', 'step_change', '2026-07-06T10:01:00Z', { step_name: 'Krátká fáze', duration_seconds: 30 }),
    event('idle', 'step_change', '2026-07-06T11:00:00Z', { step_name: 'Sál připraven', duration_seconds: 3600 }),
  ];
  const value = build({ history, excludeShortPhases: true });
  const section = dashboardSection(value, 'Zastoupení operačních fází');
  assert.equal(section.chart.unit, 'h');
  assert.deepEqual(section.chart.points.map(point => [point.label, point.value]), [['Chirurgický výkon', 1], ['Úklid', 1 / 6]]);
  assert.match(section.description, /bez klidového stavu Sál připraven/);
  assert.match(section.description, /filtr/);
  const unfiltered = dashboardSection(build({ history }), 'Zastoupení operačních fází');
  assert.equal(unfiltered.chart.points.find(point => point.label === 'Krátká fáze').value, 1 / 120, 'Tiny measurements are not rounded to invented zero before charting');
});

test('roster versus ÚPS composition uses raw closed-cycle time from the same known-roster population', () => {
  const history = [...cycle('known', '2026-07-06T09:00:00Z', '2026-07-06T15:00:00Z'),
    ...cycle('unknown', '2026-07-06T09:00:00Z', '2026-07-06T10:00:00Z', 'unknown')];
  const value = build({ rooms: [room(), room('unknown', { weeklySchedule: undefined })], history });
  const section = dashboardSection(value, 'Provoz v rozpisu a ÚPS — podíl času');
  assert.deepEqual(section.chart.points.map(point => [point.label, point.value]), [['V rozpisu', 4], ['ÚPS', 2]]);
  assert.equal(value.json.utilization.totalActiveSeconds / 3600, 3.5, 'Break-weighted scheduled utilization must not enter the raw composition denominator');
  assert.match(section.description, /Jen sály s úplným rozpisem/);
  assert.match(section.description, /1 h bez doloženého rozpisu se nezahrnuje/);
  assert.equal(value.json.utilization.unknownScheduleRecordedSeconds / 3600, 1);
});

test('unknown and empty data do not become fabricated donut slices or fake time trends', () => {
  const value = build({ rooms: [room('a', { weeklySchedule: undefined })] });
  assert.deepEqual(dashboardSection(value, 'Provoz v rozpisu a ÚPS — podíl času').chart.points, []);
  assert.match(dashboardSection(value, 'Provoz v rozpisu a ÚPS — podíl času').description, /nelze bezpečně rozdělit/);
  assert.deepEqual(dashboardSection(value, 'Zastoupení operačních fází').chart.points, []);
  assert.deepEqual(dashboardSection(value, 'Notifikace a provozní upozornění').chart.points, []);
  assert.ok(!value.report.dashboard.some(section => section.chart.kind === 'line'), 'One operational day is not presented as an invented trend');
  assert.equal(value.report.sections.find(section => section.title === 'Vývoj vytížení').chart.points.length, 1);
});

test('notifications dashboard includes recorded late arrivals even without email recipients and short phases filtered', () => {
  const value = build({ excludeShortPhases: true, notifications: [{
    id: 'late', notification_type: 'notify_late_surgeon', room_id: 'a', room_name: room().name,
    recipient_count: 0, created_at: '2026-07-06T09:00:00Z', custom_reason: 'PRIVATE TEST TEXT',
  }] });
  const points = dashboardSection(value, 'Notifikace a provozní upozornění').chart.points;
  assert.equal(points[0].label, 'Pozdní příchod operatéra');
  assert.equal(points[0].value, 1);
  assert.doesNotMatch(JSON.stringify(value.report.dashboard), /PRIVATE TEST TEXT|custom_reason|recipient_count/);
});
