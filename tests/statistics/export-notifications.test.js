import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/statistics-export-notifications.ts', import.meta.url), 'utf8');
const module = { exports: {} };
new Function('require', 'exports', 'module', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(name => assert.fail(`The notification summary must remain pure: ${name}`), module.exports, module);
const { summarizeStatisticsExportNotifications, normalizeStatisticsExportNotificationType, statisticsExportNotificationLabel } = module.exports;

const log = (id, type, overrides = {}) => ({
  id,
  notification_type: type,
  room_id: '11111111-1111-1111-1111-111111111111',
  room_name: 'Sál 7',
  recipient_count: 0,
  custom_reason: 'PRIVATE PATIENT DETAILS',
  created_at: '2026-10-13T10:00:00Z',
  ...overrides,
});
const namedRoom = (_id, historicalName) => historicalName ?? '';

test('real notification aliases share Czech labels and one summary category', () => {
  const summary = summarizeStatisticsExportNotifications([
    log('1', 'notify_late_surgeon'), log('2', ' LATE-SURGEON '),
    log('3', 'notify emergencies'), log('4', 'emergency'),
    log('5', 'notify_daily_reports'), log('6', 'daily_report'),
  ], namedRoom);
  assert.equal(summary.total, 6);
  assert.equal(summary.incidentCount, 4);
  assert.equal(summary.types.length, 3);
  assert.deepEqual(summary.types.map(item => [item.type, item.count]).sort(), [
    ['daily_report', 2], ['emergency', 2], ['late_surgeon', 2],
  ]);
  assert.equal(summary.types.find(item => item.type === 'late_surgeon').label, 'Pozdní příchod operatéra');
  assert.equal(summary.types.find(item => item.type === 'late_surgeon').color, '#F97316');
  assert.equal(summary.types.find(item => item.type === 'emergency').label, 'Stav nouze');
  assert.equal(summary.types.find(item => item.type === 'daily_report').label, 'Denní provozní report');
  assert.ok(Math.abs(summary.types.reduce((sum, item) => sum + item.sharePercent, 0) - 100) < 1e-10);
  assert.deepEqual(summary.rooms[0], {
    roomName: 'Sál 7', count: 6, lateSurgeon: 2, lateAnesthesiologist: 0,
    lateArrival: 0, patientNotReady: 0, emergency: 2, other: 2,
  });
});

test('record-only notifications count without recipients; all standard warning types are represented', () => {
  const rows = [
    log('1', 'notify_late_anesthesiologist'),
    log('2', 'notify_late_arrival'),
    log('3', 'notify_patient_not_ready'),
    log('4', 'notify_other'),
    log('5', 'infectious_patient'),
    log('6', 'statistics', { recipient_count: 10 }),
  ];
  const before = structuredClone(rows);
  const summary = summarizeStatisticsExportNotifications(rows, namedRoom);
  assert.equal(summary.total, 6);
  assert.equal(summary.incidentCount, 5);
  assert.deepEqual(summary.rooms[0], {
    roomName: 'Sál 7', count: 6, lateSurgeon: 0, lateAnesthesiologist: 1,
    lateArrival: 1, patientNotReady: 1, emergency: 0, other: 3,
  });
  assert.equal(summary.types.find(item => item.type === 'late_anesthesiologist').label, 'Pozdní příchod anesteziologa');
  assert.equal(summary.types.find(item => item.type === 'late_arrival').label, 'Pozdní příjezd na sál');
  assert.equal(summary.types.find(item => item.type === 'patient_not_ready').label, 'Nepřipravený pacient');
  assert.deepEqual(rows, before);
  const output = JSON.stringify(summary);
  assert.doesNotMatch(output, /PRIVATE PATIENT|custom_reason|recipient_count|11111111|delay|delivery/i);
});

test('unknown legacy types stay counted and readable without inventing a clinical meaning', () => {
  const summary = summarizeStatisticsExportNotifications([
    log('1', 'notify_legacy_hygiene_event'), log('2', ' LEGACY-HYGIENE EVENT '),
    log('3', '', { room_name: 'Sál 2', room_id: 'room-2' }),
  ], namedRoom);
  assert.equal(summary.total, 3);
  assert.equal(summary.incidentCount, 1);
  assert.deepEqual(summary.types.find(item => item.type === 'legacy_hygiene_event'), {
    type: 'legacy_hygiene_event', label: 'Legacy hygiene event', color: '#60A5FA', count: 2, sharePercent: 2 / 3 * 100,
  });
  assert.equal(summary.rooms.find(item => item.roomName === 'Sál 7').other, 2);
  assert.equal(statisticsExportNotificationLabel('notify_other'), 'Jiný důvod');
  assert.equal(normalizeStatisticsExportNotificationType(' notify -- late surgeon '), 'late_surgeon');
});

test('historical room names and safe fallbacks never expose room IDs', () => {
  const rows = [
    log('1', 'notify_late_surgeon'),
    log('2', 'notify_late_surgeon', { room_id: 'archived-room-id', room_name: 'Původní sál' }),
    log('3', 'notify_late_surgeon', { room_id: '22222222-2222-2222-2222-222222222222', room_name: null }),
    log('4', 'notify_late_surgeon', { room_id: null, room_name: null }),
    log('5', 'notify_late_surgeon', { room_id: null, room_name: 'Zrušený sál' }),
  ];
  const summary = summarizeStatisticsExportNotifications(rows, id => id ?? '');
  assert.deepEqual(summary.rooms.map(item => item.roomName).sort(), [
    'Archivovaný sál — název nedostupný', 'Bez přiřazení sálu', 'Původní sál', 'Sál 7', 'Zrušený sál',
  ].sort());
  assert.doesNotMatch(JSON.stringify(summary), /11111111|22222222|archived-room-id|room_id/);
  assert.equal(summarizeStatisticsExportNotifications([rows[0]], () => 'Aktuální sál 7').rooms[0].roomName, 'Aktuální sál 7');
});

test('unknown types matching object property names stay safe and readable', () => {
  const summary = summarizeStatisticsExportNotifications([
    log('1', '__proto__'), log('2', 'constructor'), log('3', 'toString'),
  ], namedRoom);
  assert.equal(summary.total, 3);
  assert.equal(summary.incidentCount, 0);
  assert.deepEqual(summary.types.map(item => item.label).sort(), ['Constructor', 'Proto', 'Tostring']);
  assert.ok(summary.types.every(item => item.color === '#60A5FA' && item.count === 1));
});

test('identically named rooms remain separate; empty periods contain no fake values', () => {
  const summary = summarizeStatisticsExportNotifications([
    log('1', 'notify_late_surgeon', { room_id: 'room-one', room_name: 'Sál' }),
    log('2', 'notify_late_surgeon', { room_id: 'room-two', room_name: 'Sál' }),
  ], namedRoom);
  assert.equal(summary.rooms.length, 2);
  assert.ok(summary.rooms.every(item => item.count === 1));
  assert.deepEqual(summarizeStatisticsExportNotifications([], namedRoom), { total: 0, incidentCount: 0, types: [], rooms: [] });
});
