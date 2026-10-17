import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
function load(path, imports = {}) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', 'module', compiled)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected ${path} dependency: ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const performance = load('lib/statistics-performance.ts');
const helper = load('lib/statistics-export.ts', { './statistics-performance': performance,
  './statistics-export-utilization': load('lib/statistics-export-utilization.ts'),
  './statistics-export-notifications': load('lib/statistics-export-notifications.ts'),
});
const { exportDateRange, statisticsExportOperationalDate, statisticsExportProgress, buildStatisticsPeriodExport, statisticsExportCycles } = helper;
const csv = load('lib/statistics-csv.ts');
const print = load('lib/statistics-print.ts');
const event = (id, type, at, seconds = null, metadata = {}, room = 'room-a', stepName = 'Chirurgický výkon') => ({
  id, event_type: type, operating_room_id: room, timestamp: at, created_at: at,
  duration_seconds: seconds, step_index: 2, step_name: stepName, metadata,
});
const notification = (id, at) => ({ id, notification_type: 'enhanced_hygiene', room_id: 'room-a', room_name: 'Sál A', recipient_count: 2, created_at: at, custom_reason: 'PATIENT PRIVATE REASON' });
const room = { id: 'room-a', name: 'Sál A', department: 'Private current department', status: 'BUSY', isEmergency: true,
  currentPatient: { name: 'PRIVATE PATIENT' }, staff: { doctor: { name: 'PRIVATE DOCTOR' } }, hourlyOperatingCost: 999,
  weeklySchedule: { monday: { enabled: true, startHour: 7, endHour: 15, startMinute: 0, endMinute: 0 } } };
const build = (overrides = {}) => buildStatisticsPeriodExport({
  hospitalId: 'hospital-a', hospitalName: 'Synthetic hospital', rooms: [room], history: [], notifications: [],
  range: exportDateRange('custom', '2020-07-01', '2020-07-01', '2020-07-15'), excludeShortPhases: false,
  generatedAt: new Date('2026-10-13T12:00:00Z'), ...overrides,
});
const section = (value, title) => value.report.sections.find(section => section.title === title);
const csvSection = (value, title) => value.csvReport.sections.find(section => section.title === title);

test('custom dates include every day and the complete final Prague operational day', () => {
  const range = exportDateRange('custom', '2020-07-01', '2020-07-01', '2020-07-15');
  assert.equal(range.days.length, 15);
  assert.equal(range.days[0], '2020-07-01');
  assert.equal(range.days.at(-1), '2020-07-15');
  assert.equal(range.start.toISOString(), '2020-07-01T05:00:00.000Z');
  assert.equal(range.end.toISOString(), '2020-07-16T05:00:00.000Z');
  const data = build({ history: [event('last', 'step_change', '2020-07-16T04:59:59.999Z', 60), event('outside', 'step_change', '2020-07-16T05:00:00Z', 60)],
    notifications: [notification('last', '2020-07-16T04:59:59.999Z'), notification('outside', '2020-07-16T05:00:00Z')] });
  assert.deepEqual(data.json.sourceRows.room_status_history.map(row => row.id), ['last']);
  assert.deepEqual(data.json.sourceRows.notifications_log.map(row => row.id), ['last']);
});

test('week, month and year are real calendar periods including Monday weeks and leap years', () => {
  const week = exportDateRange('week', '2026-01-01');
  assert.equal(week.from, '2025-12-29'); assert.equal(week.to, '2026-01-04'); assert.equal(week.days.length, 7);
  assert.equal(exportDateRange('month', '2024-02-10').days.length, 29);
  const year = exportDateRange('year', '2024-06-15');
  assert.equal(year.from, '2024-01-01'); assert.equal(year.to, '2024-12-31'); assert.equal(year.days.length, 366);
  assert.equal(exportDateRange('year', '2025-06-15').days.length, 365);
  for (const args of [['day', '2026-02-30'], ['month', ''], ['bad', '2026-07-01'], ['custom', '2026-07-01', '2026-07-15', '2026-07-01']]) {
    assert.throws(() => exportDateRange(...args), RangeError);
  }
});

test('Prague DST boundaries retain 07:00 and operational today before 07:00 uses the preceding date', () => {
  const spring = exportDateRange('day', '2026-03-28');
  const autumn = exportDateRange('day', '2026-10-24');
  assert.equal((spring.end - spring.start) / 3600000, 23);
  assert.equal((autumn.end - autumn.start) / 3600000, 25);
  assert.equal(spring.start.toISOString(), '2026-03-28T06:00:00.000Z');
  assert.equal(spring.end.toISOString(), '2026-03-29T05:00:00.000Z');
  assert.equal(statisticsExportOperationalDate(new Date('2026-07-01T04:59:59Z')), '2026-06-30');
  assert.equal(statisticsExportOperationalDate(new Date('2026-07-01T05:00:00Z')), '2026-07-01');
});

test('one-minute filtering never deletes raw records or lifecycle pairing across the lower date boundary', () => {
  const history = [event('start', 'operation_start', '2020-07-01T04:50:00Z'),
    event('short', 'step_change', '2020-07-01T05:00:30Z', 30),
    event('measured', 'step_change', '2020-07-01T05:02:00Z', 90),
    event('end', 'operation_end', '2020-07-01T05:10:00Z', 30)];
  const unfiltered = build({ history });
  const filtered = build({ history, excludeShortPhases: true });
  assert.deepEqual(filtered.json.sourceRows, unfiltered.json.sourceRows);
  assert.deepEqual(filtered.json.supportingRows, unfiltered.json.supportingRows);
  assert.deepEqual(filtered.json.completedCycles, unfiltered.json.completedCycles);
  assert.equal(filtered.json.completedCycles.length, 1);
  assert.equal(filtered.json.completedCycles[0].seconds, 1200);
  assert.equal(filtered.json.completedCycles[0].overlapSeconds, 600);
  assert.deepEqual(csvSection(filtered, 'Fáze').rows[0].slice(1), [1, 0.025, 0.025, 2, 0.033]);
  assert.deepEqual(csvSection(unfiltered, 'Fáze').rows[0].slice(1), [2, 0.033, 0.017, 2, 0.033]);
});

test('daily cycle elapsed time splits at real DST boundaries and facility totals include notifications without a room', () => {
  const range = exportDateRange('custom', '2026-03-28', '2026-03-28', '2026-03-29');
  const data = build({ range, history: [event('start', 'operation_start', '2026-03-28T06:00:00Z'),
    event('end', 'operation_end', '2026-03-29T07:00:00Z')],
    notifications: [{ ...notification('global', '2026-03-28T10:00:00Z'), room_id: null, room_name: null }] });
  const rows = csvSection(data, 'Provozní dny zařízení').rows;
  assert.equal(rows[0][5], 23);
  assert.equal(rows[1][5], 2);
  assert.equal(rows[0][4], 0); assert.equal(rows[1][4], 1);
  assert.equal(rows[0][6], 1);
});

test('multi-year exports keep early performance measurements and more than one source page without a cache cap', () => {
  const range = exportDateRange('custom', '2019-01-01', '2019-01-01', '2020-12-31');
  const history = [event('early', 'step_change', '2019-01-02T09:00:00Z', 60, {}, 'room-a', 'Úklid sálu'),
    event('late', 'step_change', '2020-07-01T09:00:00Z', 120, {}, 'room-a', 'Úklid sálu')];
  history.forEach(row => { row.step_index = 0; });
  const notifications = Array.from({ length: 2001 }, (_, index) => notification(`notice-${index}`, '2020-07-01T10:00:00Z'));
  const data = build({ range, history, notifications });
  // The inclusive Dec31 operational day also contains Jan1 00:00–07:00.
  assert.equal(data.json.performance.months.length, 25);
  assert.equal(data.json.performance.totals.cleanup.rawCount, 2);
  assert.equal(data.json.sourceRows.notifications_log.length, 2001);
  const content = csv.buildStatisticsCsv(data.csvReport, data.metadata);
  assert.match(content, /notice-2000/);
  assert.equal(data.json.range.from, '2019-01-01');
});

test('later closing phases prove an earlier selected KPI endpoint without adding their raw rows to the selected period', () => {
  const range = exportDateRange('day', '2026-07-01');
  const rows = [
    event('older', 'patient_called', '2026-06-30T10:00:00Z'),
    event('start', 'operation_start', '2026-07-02T04:30:00Z', null, {}, 'room-a', 'Příjezd na sál'),
    event('arrival', 'step_change', '2026-07-02T04:50:00Z', 1200, {}, 'room-a', 'Příjezd na sál'),
    event('surgery', 'step_change', '2026-07-02T06:20:00Z', 5400, {}, 'room-a', 'Chirurgický výkon'),
    event('surgery-end', 'step_change', '2026-07-02T06:35:00Z', 900, {}, 'room-a', 'Ukončení výkonu'),
    event('departure', 'step_change', '2026-07-02T06:40:00Z', 300, {}, 'room-a', 'Odjezd ze sálu'),
    event('cleanup', 'step_change', '2026-07-02T07:00:00Z', 1200, {}, 'room-a', 'Úklid sálu'),
    event('end', 'operation_end', '2026-07-02T07:00:00.001Z'),
  ];
  rows.find(row => row.id === 'cleanup').step_index = 0;
  const full = build({ range, history: rows, generatedAt: new Date('2026-07-03T12:00:00Z') });
  const truncated = build({ range, history: rows.filter(row => Date.parse(row.timestamp) < range.end.getTime()), generatedAt: new Date(range.end.getTime() - 1) });
  assert.equal(truncated.json.performance.totals.aroStart.rawCount, 0);
  assert.equal(full.json.performance.totals.aroStart.rawCount, 1);
  assert.equal(full.json.performance.totals.aroStart.rawAverageMinutes, 20);
  assert.equal(full.json.performance.totals.surgery.rawCount, 0, 'Its measured endpoint is outside the selected day');
  assert.deepEqual(full.json.sourceRows.room_status_history.map(row => row.id), ['start', 'arrival']);
  assert.deepEqual(full.json.supportingRows.beforeRange.room_status_history.map(row => row.id), ['older']);
  assert.deepEqual(full.json.supportingRows.afterRange.room_status_history.map(row => row.id), ['surgery', 'surgery-end', 'departure', 'cleanup', 'end']);
  assert.equal(full.json.completedCycles.length, 0, 'Completion itself is outside the selected day');
});

test('reference phase costs use whole measured durations and current rates, keep missing rates unknown and preserve raw short phases', () => {
  const history = [event('short', 'step_change', '2020-07-01T05:00:30Z', 30),
    event('long', 'step_change', '2020-07-01T05:02:00Z', 90),
    event('missing', 'step_change', '2020-07-01T10:00:00Z', 60, {}, 'room-missing'),
    event('zero', 'step_change', '2020-07-01T11:00:00Z', 60, {}, 'room-zero')];
  const rooms = [{ ...room, hourlyOperatingCost: 1200 }, { ...room, id: 'room-missing', name: 'Bez sazby', hourlyOperatingCost: null },
    { ...room, id: 'room-zero', name: 'Výslovná nula', hourlyOperatingCost: 0 }];
  const raw = build({ rooms, history });
  const filtered = build({ rooms, history, excludeShortPhases: true });
  const row = (data, id) => data.json.financialReference.rooms.find(row => row.roomId === id);
  assert.equal(row(raw, 'room-a').referenceCostCzk, 40);
  assert.equal(row(filtered, 'room-a').referenceCostCzk, 30);
  assert.equal(row(raw, 'room-missing').currentRateCzkPerHour, null);
  assert.equal(row(raw, 'room-missing').referenceCostCzk, null);
  assert.equal(row(raw, 'room-zero').referenceCostCzk, 0);
  assert.deepEqual(raw.json.sourceRows, filtered.json.sourceRows);
  assert.equal(raw.json.financialReference.historicalRates, false);
  const reference = section(raw, 'Náklady zaznamenaných fází podle současné sazby (referenční výpočet)');
  assert.match(reference.description, /nikoli sazba platná v minulosti|není.*historick/i);
  assert.match(reference.description, /není oříznut podle pracovní doby/);
  const crossing = build({ rooms: [{ ...room, hourlyOperatingCost: 1200 }],
    history: [event('crossing', 'step_change', '2020-07-01T05:01:00Z', 240)] });
  assert.equal(row(crossing, 'room-a').referenceCostCzk, 80, 'The recorded full4minutes are not clipped to1minute');
  const alteredSchedule = build({ rooms: [{ ...room, hourlyOperatingCost: 1200, weeklySchedule: undefined }],
    history: [event('crossing', 'step_change', '2020-07-01T05:01:00Z', 240)] });
  assert.deepEqual(crossing.json.financialReference.rooms, alteredSchedule.json.financialReference.rooms);
});

test('long idle Ready phases never inflate operating phase summaries or reference cost and remain complete in source data', () => {
  for (const idleName of ['Sál připraven', 'SÁL PŘIPRAVEN', 'sal pripraven', 'Připravený operační sál']) {
    for (const excludeShortPhases of [false, true]) {
      const idle = event('idle', 'step_change', '2020-07-01T09:00:00Z', 9000, { previous_step: idleName }, 'room-a', 'New phase label');
      const measured = event('measured', 'step_change', '2020-07-01T10:00:00Z', 60);
      const data = build({ rooms: [{ ...room, hourlyOperatingCost: 1200 }], history: [idle, measured], excludeShortPhases });
      assert.equal(section(data, 'Fáze').rows.length, 1);
      assert.deepEqual(section(data, 'Fáze').rows[0], ['Chirurgický výkon', 1, 0.017, 0.017, 100]);
      assert.equal(data.json.financialReference.rooms[0].recordedPhaseSeconds, 60);
      assert.equal(data.json.financialReference.rooms[0].referenceCostCzk, 20);
      assert.equal(data.json.sourceRows.room_status_history.length, 2);
      const preservedIdle = data.json.sourceRows.room_status_history.find(row => row.id === 'idle');
      assert.equal(preservedIdle.duration_seconds, 9000);
      assert.equal(preservedIdle.metadata.previous_step, idleName);
      assert.equal(data.json.quality.find(row => row[0].startsWith('Klidové fáze'))[1], 1);
      const content = csv.buildStatisticsCsv(data.csvReport, data.metadata);
      assert.match(content, /2\.5/, 'Human-readable source table uses hours; raw JSON retains 9000seconds');
    }
  }
});

test('orphaned phase-duration end markers are not fabricated full operations; archived completed durations remain usable', () => {
  const range = exportDateRange('day', '2020-07-01');
  const orphan = event('orphan', 'operation_end', '2020-07-01T09:00:00Z', 300);
  assert.deepEqual(statisticsExportCycles([orphan], range), []);
  const archived = event('archived', 'operation_completed', '2020-07-01T10:00:00Z', 1800);
  const explicit = [event('start', 'operation_start', '2020-07-01T09:30:00Z'), event('end', 'operation_end', '2020-07-01T10:00:00Z')];
  assert.equal(statisticsExportCycles([archived], range)[0].seconds, 1800);
  assert.equal(statisticsExportCycles([...explicit, archived], range).length, 1);
  assert.equal(statisticsExportCycles([event('open', 'operation_start', '2020-07-01T11:00:00Z')], range).length, 0);
});

test('raw sources retain invalid durations, synthetic records, nonphase events and rooms absent from the current list', () => {
  const history = [event('zero', 'step_change', '2020-07-01T09:00:00Z', 0), event('missing', 'step_change', '2020-07-01T10:00:00Z'),
    event('synthetic', 'step_change', '2020-07-01T11:00:00Z', 120, { synthetic: true }),
    event('auxiliary', 'patient_called', '2020-07-01T12:00:00Z', null, {}, 'deleted-room')];
  const data = build({ history });
  assert.equal(data.json.sourceRows.room_status_history.length, 4);
  assert.equal(section(data, 'Fáze').rows.length, 0);
  assert.equal(csvSection(data, 'Sály za období').rows.length, 2);
  assert.equal(data.json.quality[0][1], 2);
  assert.equal(data.json.quality[2][1], 1);
});

test('safe raw export omits arbitrary metadata, clinical labels/reasons and all current room state', () => {
  const history = [event('legacy', 'operation_completed', '2020-07-01T09:00:00Z', 600, {
    patient: { name: 'PRIVATE PATIENT' }, procedure: 'PRIVATE PROCEDURE', access_token: 'SECRET TOKEN',
    startedAt: '2020-07-01T08:50:00Z', endedAt: '2020-07-01T09:00:00Z', previous_step_index: 2,
  }, 'room-a', 'PRIVATE COMPLETION LABEL')];
  const data = build({ history, notifications: [notification('notice', '2020-07-01T10:00:00Z')] });
  const json = JSON.stringify(data.json);
  assert.doesNotMatch(json, /PRIVATE|SECRET TOKEN|isEmergency|hourlyOperatingCost|weeklySchedule|custom_reason":"/);
  assert.equal(data.json.sourceRows.room_status_history[0].step_name, null);
  assert.equal(data.json.sourceRows.room_status_history[0].metadata.previous_step_index, 2);
  assert.deepEqual(helper.sanitizeStatisticsHistory(event('bad', 'step_change', '2020-07-01T10:00:00Z', 60, { startedAt: 'SECRET BAD TIME' })).metadata, {});
  const html = print.buildStatisticsPrintHtml(data.report, data.metadata);
  assert.doesNotMatch(html, /PRIVATE|SECRET TOKEN|CURRENT PATIENT/);
});

test('CSV retains all summary and source tables and neutralizes spreadsheet formulas; PDF remains historical summaries', () => {
  const data = build({ rooms: [{ ...room, name: '=HYPERLINK("bad")' }], history: [event('one', 'step_change', '2020-07-01T09:00:00Z', 60)],
    notifications: [notification('notice', '2020-07-01T10:00:00Z')] });
  const content = csv.buildStatisticsCsv(data.csvReport, data.metadata);
  for (const value of data.csvReport.sections) assert.ok(content.includes(value.title));
  assert.equal(section(data, 'Původ a úplnost zdrojů'), undefined);
  assert.ok(data.json.provenance.some(row => row[0] === 'room_status_history'), 'Technical provenance is retained in machine-readable JSON only');
  const roomCell = data.csvReport.sections.find(value => value.title === 'Sály za období').rows[0][0];
  assert.equal(roomCell, '\'=HYPERLINK("bad")');
  const html = print.buildStatisticsPrintHtml(data.report, data.metadata);
  assert.doesNotMatch(html, /Zdrojové řádky room_status_history|Zdrojové řádky notifications_log/);
  assert.match(html, /Europe\/Prague|07:00/);
});

test('actual record progress stays indeterminate when a source count is unknown and cannot reach 100 until assembly completes', () => {
  const one = { loaded: 10, total: 10, complete: true };
  assert.equal(statisticsExportProgress(one, { loaded: 0, total: null, complete: false }).percent, null);
  assert.equal(statisticsExportProgress(one, one).percent, 99);
  assert.equal(statisticsExportProgress(one, one, true).percent, 100);
  assert.equal(statisticsExportProgress({ loaded: 0, total: 0, complete: true }, { loaded: 0, total: 0, complete: true }).percent, null);
});

test('compact historical report prioritizes capacity-weighted utilization, with complete names and hours instead of room IDs', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const range = exportDateRange('day', '2026-07-06');
  const data = build({ range, rooms: [{ ...room, id, name: 'Sál první' }, { ...room, id: 'idle-room', name: 'Sál bez výkonu' }],
    history: [event('start', 'operation_start', '2026-07-06T05:00:00Z', null, {}, id),
      event('end', 'operation_end', '2026-07-06T09:00:00Z', null, {}, id)] });
  assert.equal(data.report.presentation, 'compact');
  assert.equal(data.json.utilization.utilizationPercent, 25);
  assert.equal(data.report.metrics[0].value, '25 %');
  assert.equal(data.report.sections[0].chart.points.length, 2);
  assert.equal(data.report.sections[0].chart.points[1].value, 0);
  const html = print.buildStatisticsPrintHtml(data.report, data.metadata);
  const content = csv.buildStatisticsCsv(data.csvReport, data.metadata);
  assert.match(html, /Sál první|Sál bez výkonu/);
  assert.doesNotMatch(html, /11111111|ID sálu|Původ a úplnost zdrojů|Minuty cyklů/);
  assert.doesNotMatch(content, /11111111|ID sálu|Minuty fází/);
  assert.match(content, /Hodiny cyklů/);
  assert.equal(data.json.completedCycles[0].seconds, 14400);
});

test('archived ID-as-name fallbacks never leak IDs into paper or human CSV, including unassigned notifications', () => {
  const id = '22222222-2222-4222-8222-222222222222';
  const data = build({ rooms: [], history: [event('archived', 'operation_completed', '2020-07-01T10:00:00Z', 3600, {}, id)],
    notifications: [{ ...notification('notice', '2020-07-01T10:00:00Z'), room_id: id, room_name: id },
      { ...notification('global', '2020-07-01T10:00:00Z'), room_id: null, room_name: id }] });
  const html = print.buildStatisticsPrintHtml(data.report, data.metadata);
  const content = csv.buildStatisticsCsv(data.csvReport, data.metadata);
  assert.doesNotMatch(html, /22222222/);
  assert.doesNotMatch(content, /22222222/);
  assert.match(html, /Archivovaný sál|Bez přiřazení sálu/);
  assert.equal(data.json.completedCycles[0].roomId, id, 'Machine evidence keeps authoritative keys');
  assert.equal(data.report.sections[0].chart.points[0].value, null);
  assert.match(data.report.sections[0].chart.points[0].detail, /zaznamenáno 1 h/);
});

test('record-only late arrivals remain in compact charts and room summaries independently of short-phase filtering', () => {
  const notice = { ...notification('late', '2020-07-01T10:00:00Z'), notification_type: 'notify_late_surgeon', recipient_count: 0 };
  const data = build({ notifications: [notice], history: [event('short', 'step_change', '2020-07-01T10:00:00Z', 30)], excludeShortPhases: true });
  const alerts = section(data, 'Notifikace a provozní upozornění').chart.points;
  assert.equal(alerts[0].label, 'Pozdní příchod operatéra');
  assert.equal(alerts[0].value, 1);
  assert.equal(section(data, 'Upozornění podle sálu').rows[0][2], 1);
  assert.equal(data.json.sourceRows.notifications_log[0].recipient_count, 0);
  assert.match(csv.buildStatisticsCsv(data.csvReport, data.metadata), /Pozdní příchod operatéra/);
});

test('compact multi-year paper contains aggregate charts, not a huge day-room or cycle dump; detailed data stay complete', () => {
  const data = build({ range: exportDateRange('custom', '2020-01-01', '2020-01-01', '2021-12-31') });
  assert.equal(section(data, 'Provozní dny a sály'), undefined);
  assert.equal(section(data, 'Dokončené cykly'), undefined);
  assert.equal(section(data, 'Vývoj vytížení').chart.points.length, 24);
  assert.equal(data.json.daily.facility.length, 731);
  assert.equal(csvSection(data, 'Provozní dny zařízení').rows.length, 731);
});

test('actual preparation phases remain counted and tiny measured hours never display as a fabricated zero', () => {
  const data = build({ history: [event('prep', 'step_change', '2020-07-01T09:00:00Z', 60, {}, 'room-a', 'Příprava sálu'),
    event('tiny', 'step_change', '2020-07-01T09:01:00Z', 1, {}, 'room-a', 'Krátká měřená fáze')] });
  const rows = section(data, 'Fáze').rows;
  assert.equal(rows.find(row => row[0] === 'Příprava sálu')[1], 1);
  assert.equal(rows.find(row => row[0] === 'Krátká měřená fáze')[2], '< 0,001');
});

test('historical report separates ÚPS hours, share and elapsed utilization into named columns without mixing break-weighted time', () => {
  const weeklySchedule = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => [day,
    { enabled: true, startHour: 7, startMinute: 0, endHour: 15, endMinute: 0, breakMinutes: 60 }]));
  const data = build({ range: exportDateRange('day', '2026-07-06'), rooms: [{ ...room, weeklySchedule }],
    history: [event('start', 'operation_start', '2026-07-06T09:00:00Z'), event('end', 'operation_end', '2026-07-06T15:00:00Z')] });
  const ups = section(data, 'Provoz v rozpisu a ÚPS');
  assert.deepEqual(ups.columns.map(column => column.label), ['Sál', 'V rozpisu (h)', 'ÚPS (h)', 'Podíl ÚPS (%)', 'Vytížení ÚPS (%)', 'Časové okno ÚPS (h)']);
  assert.deepEqual(ups.rows, [['Sál A', 4, 2, 33.333, 12.5, 16]]);
  assert.equal(ups.startNewPage, true);
  assert.equal(data.json.utilization.totalActiveSeconds, 3.5 * 3600);
  assert.equal(data.json.utilization.totalUpsSeconds, 2 * 3600);
  assert.equal(data.report.metrics.find(metric => metric.label === 'Provoz cyklů v ÚPS').value, '2 h');
  assert.equal(data.report.metrics.find(metric => metric.label === 'Vytížení času ÚPS').value, '12,5 %');
  assert.doesNotMatch(data.report.sections[0].chart.points[0].detail, /mimo rozpis/);
  assert.deepEqual(csvSection(data, 'Provoz v rozpisu a ÚPS').rows, ups.rows);
  assert.deepEqual(csvSection(data, 'ÚPS v provozních dnech').rows[0].slice(1), [4, 2, 33.333, 12.5, 16]);
  assert.match(ups.description, /nejde o personální kapacitu|Přestávka/);
});

test('ÚPS with an unknown roster is visibly unknown, not zero or all historical activity classified as on-call', () => {
  const data = build({ rooms: [{ ...room, weeklySchedule: undefined }], history: [event('done', 'operation_completed', '2020-07-01T09:00:00Z', 3600)] });
  assert.deepEqual(section(data, 'Provoz v rozpisu a ÚPS').rows, [['Sál A', '—', '—', '—', '—', '—']]);
  assert.equal(data.report.metrics.find(metric => metric.label === 'Provoz cyklů v ÚPS').value, '—');
  assert.equal(data.report.metrics.find(metric => metric.label === 'Vytížení času ÚPS').value, '—');
  assert.match(section(data, 'Provoz v rozpisu a ÚPS').description, /nelze zařadit/);
  assert.equal(data.json.utilization.unknownScheduleRecordedSeconds, 3600);
});

test('complete detailed ÚPS day rows remain in CSV/JSON only, keeping a multi-year paper compact', () => {
  const data = build({ range: exportDateRange('year', '2024-07-06') });
  assert.equal(section(data, 'ÚPS v provozních dnech'), undefined);
  assert.equal(csvSection(data, 'ÚPS v provozních dnech').rows.length, 366);
  assert.equal(data.json.utilization.daily.length, 366);
  assert.equal(data.report.metrics.length, 6);
});

function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) }; }
function elements(node, match) {
  if (Array.isArray(node)) return node.flatMap(value => elements(value, match));
  if (!React.isValidElement(node)) return [];
  return [...(match(node) ? [node] : []), ...elements(node.props.children, match)];
}
function dialogHarness() {
  const state = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, effectIndex = 0;
  let tree, props = { open: true, onClose: () => { props.open = false; }, rooms: [room], hospitalId: 'hospital-a', excludeShortPhases: true };
  let databaseHospital = 'hospital-a';
  const pending = [], calls = [], downloads = [];
  const makeLoad = kind => options => { const value = deferred(); calls.push({ kind, options }); pending.push(value); return value.promise; };
  const Preloader = () => null;
  const imports = {
    react: { __esModule: true, default: React, useId: () => 'export-dialog',
      useState: initial => { const index = stateIndex++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
      useRef: initial => { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useEffect: (callback, dependencies) => { const index = effectIndex++; const old = effects[index]; if (!old || dependencies.some((value, i) => value !== old.dependencies[i])) effects[index] = { dependencies, callback, pending: true, cleanup: old?.cleanup }; },
    },
    '@radix-ui/react-dialog': Object.fromEntries(['Root', 'Portal', 'Overlay', 'Content', 'Title', 'Description'].map(name => [name, `Dialog${name}`])),
    'lucide-react': Object.fromEntries(['Download', 'FileJson', 'FileText', 'LoaderCircle', 'X'].map(name => [name, () => null])),
    '../../lib/db': { getDatabaseHospitalId: () => databaseHospital, fetchStatusHistory: makeLoad('history'), fetchNotificationsLog: makeLoad('notifications') },
    '../../lib/statistics-csv': { downloadStatisticsCsv: () => downloads.push('csv') },
    '../../lib/statistics-print': { openStatisticsPrintReport: () => downloads.push('pdf') },
    '../../lib/statistics-export': helper,
    './statistics-theme': { C: {} }, './StatisticsPreloader': { StatisticsPreloader: Preloader },
  };
  const Component = load('components/statistics/StatisticsExportDialog.tsx', imports).default;
  const render = changes => {
    props = { ...props, ...changes }; stateIndex = 0; refIndex = 0; effectIndex = 0;
    tree = Component(props);
    for (const effect of effects) if (effect.pending) { effect.cleanup?.(); effect.cleanup = effect.callback(); effect.pending = false; }
    return tree;
  };
  const button = text => elements(tree, node => node.type === 'button').find(node =>
    elements(node, child => false).length === 0 && React.Children.toArray(node.props.children).some(child => typeof child === 'string' && child.includes(text)));
  render(); render();
  return { render, button, calls, pending, downloads, get tree() { return tree; }, setHospital: id => { databaseHospital = id; },
    unmount: () => { effects.forEach(effect => effect.cleanup?.()); } };
}

test('dialog performs uncapped historical reads, waits for both complete sources and blocks stale hospital downloads', async () => {
  const app = dialogHarness();
  elements(app.tree, node => node.type === 'input' && node.props.value === 'custom')[0].props.onChange(); app.render();
  elements(app.tree, node => node.props.id === 'export-dialog-from')[0].props.onChange({ target: { value: '2020-07-01' } }); app.render();
  elements(app.tree, node => node.props.id === 'export-dialog-to')[0].props.onChange({ target: { value: '2020-07-15' } }); app.render();
  const requestedAt = Date.now();
  const work = app.button('Připravit export').props.onClick();
  app.render();
  assert.equal(app.calls.length, 2);
  const history = app.calls.find(call => call.kind === 'history').options;
  const notifications = app.calls.find(call => call.kind === 'notifications').options;
  assert.equal(history.all, true); assert.equal(history.fromDate, undefined); assert.equal(history.limit, undefined);
  assert.ok(history.toDate.getTime() >= requestedAt && history.toDate.getTime() <= Date.now(), 'Historical support loads through the real current instant');
  assert.equal(notifications.all, true); assert.ok(notifications.fromDate instanceof Date); assert.ok(notifications.toDate instanceof Date);
  assert.equal(notifications.fromDate.toISOString(), '2020-07-01T05:00:00.000Z');
  assert.equal(notifications.toDate.toISOString(), '2020-07-16T04:59:59.999Z');
  assert.equal(typeof history.onProgress, 'function'); assert.equal(typeof notifications.onProgress, 'function');
  app.pending[0].resolve([]); await Promise.resolve(); app.render();
  assert.equal(app.button('CSV').props.disabled, true);
  app.pending[1].resolve([]); await work; await new Promise(done => setImmediate(done)); app.render();
  assert.equal(app.button('CSV').props.disabled, false);
  const staleDownload = app.button('CSV').props.onClick;
  app.setHospital('hospital-b'); app.render({ hospitalId: 'hospital-b' });
  staleDownload();
  assert.deepEqual(app.downloads, []);
});

test('closing/cancelling export and failed source reads never enable a partial or late download; retries start fresh', async () => {
  const app = dialogHarness();
  app.button('Připravit export').props.onClick(); app.render();
  app.button('Zrušit načítání').props.onClick();
  app.pending[0].resolve([]); app.pending[1].resolve([]);
  await new Promise(done => setImmediate(done)); app.render();
  assert.equal(app.button('CSV').props.disabled, true);
  app.button('Připravit export').props.onClick(); app.render();
  app.pending[2].resolve(null); app.pending[3].resolve([]);
  await new Promise(done => setImmediate(done)); app.render();
  assert.equal(app.button('CSV').props.disabled, true);
  assert.ok(app.button('Zkusit znovu'));
  app.button('Zkusit znovu').props.onClick(); app.render();
  app.render({ open: false });
  app.pending[4].resolve([]); app.pending[5].resolve([]);
  await new Promise(done => setImmediate(done)); app.render();
  assert.equal(app.button('CSV').props.disabled, true);
  assert.deepEqual(app.downloads, []);
});

test('unmounting the dialog invalidates previously ready download callbacks even if hospital identity is unchanged', async () => {
  const app = dialogHarness();
  app.button('Připravit export').props.onClick(); app.render();
  app.pending[0].resolve([]); app.pending[1].resolve([]);
  await new Promise(done => setImmediate(done)); app.render();
  const oldDownload = app.button('CSV').props.onClick;
  assert.equal(app.button('CSV').props.disabled, false);
  app.unmount(); oldDownload();
  assert.deepEqual(app.downloads, []);
});
