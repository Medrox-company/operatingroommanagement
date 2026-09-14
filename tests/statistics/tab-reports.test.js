import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

// Data-registration tests with synchronous hooks. These do not exercise React
// lifecycle, network requests, browser rendering, or PDF pagination.
const require = createRequire(import.meta.url);
const sources = Object.fromEntries(['NotificationsTab', 'DevicesTab'].map(name => {
  const source = readFileSync(new URL(`../../components/statistics/${name}.tsx`, import.meta.url), 'utf8');
  return [name, ts.transpileModule(source, {
    fileName: `${name}.tsx`,
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText];
}));

function captureReport(name, props, stateOverrides = {}) {
  const reports = [];
  let stateIndex = 0;
  const reactStub = {
    ...React,
    memo: component => component,
    useMemo: factory => factory(),
    useCallback: callback => callback,
    useEffect: () => {},
    useState: initial => {
      const index = stateIndex++;
      return [Object.hasOwn(stateOverrides, index)
        ? stateOverrides[index]
        : typeof initial === 'function' ? initial() : initial, () => {}];
    },
  };
  const noFetch = () => assert.fail('Report registration must not fetch data');
  const imports = {
    react: reactStub,
    'react-dom': { createPortal: () => assert.fail('No notification detail is selected') },
    'lucide-react': require('lucide-react'),
    './shared': {
      C: new Proxy({}, { get: () => '#123456' }),
      Card: () => null,
      DistributionHeader: () => null,
      DistributionRing: () => null,
      formatNumber: (value, digits = 0) => new Intl.NumberFormat('cs-CZ', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(value),
    },
    './AppCharts': { GlassCalendar: () => null },
    './StatisticsReportContext': { useStatisticsReport: (tab, report) => reports.push({ tab, report }) },
    '../../lib/db': { fetchNotificationsLog: noFetch, fetchStatusHistory: noFetch },
  };
  const moduleStub = { exports: {} };
  new Function('require', 'exports', 'module', sources[name])(
    dependency => {
      assert.ok(Object.hasOwn(imports, dependency), `Unexpected dependency: ${dependency}`);
      return imports[dependency];
    }, moduleStub.exports, moduleStub,
  );
  moduleStub.exports[name](props);
  assert.equal(reports.length, 1, 'Each render must register exactly one report, even when loading');
  return reports[0];
}

const notification = (id, room = `room-${id}`, overrides = {}) => ({
  id: String(id), notification_type: 'other', room_id: room, room_name: `Sál ${id}`,
  recipient_count: 2, custom_reason: null, created_at: '2026-09-14T09:00:00', ...overrides,
});
const section = (report, title) => {
  const result = report.sections.find(item => item.title === title);
  assert.ok(result, `Missing report section: ${title}`);
  return result;
};
const metric = (report, label) => {
  const result = report.metrics.find(item => item.label === label);
  assert.ok(result, `Missing report metric: ${label}`);
  return result.value;
};

test('notification reports retain every filtered record and every room beyond UI ranking limits', () => {
  const notifications = Array.from({ length: 12 }, (_, index) => notification(index));
  notifications[0].custom_reason = '<b>Doslovný důvod</b>';
  const { tab, report } = captureReport('NotificationsTab', { notifications, rooms: [], periodLabel: 'Celý měsíc' });
  assert.equal(tab, 'notifikace');
  assert.match(report.context, /Celý měsíc/);
  assert.equal(metric(report, 'Odeslané notifikace'), '12');
  assert.equal(metric(report, 'Příjemci celkem'), '24');
  assert.equal(section(report, 'Evidence jednotlivých notifikací').rows.length, 12);
  assert.equal(section(report, 'Souhrn podle operačního sálu').rows.length, 12);
  assert.equal(section(report, 'Finanční dopady jednotlivých notifikací').rows.length, 12);
  assert.equal(section(report, 'Evidence jednotlivých notifikací').rows[0][4], '<b>Doslovný důvod</b>');
  for (const table of report.sections) {
    for (const row of table.rows) {
      assert.equal(row.length, table.columns.length);
      assert.ok(row.every(value => typeof value === 'string' || typeof value === 'number'));
    }
  }
});

test('notification reports use the selected day and never leak the global-period rows', () => {
  const globalRow = notification('global');
  const selectedRow = notification('selected', null, { created_at: '2026-09-12T11:00:00', custom_reason: 'Pouze vybraný den' });
  const dayState = { 0: new Date('2026-09-12T00:00:00'), 1: true, 2: [selectedRow], 7: '2026-09-12' };
  const props = { notifications: [globalRow], rooms: [], periodLabel: 'Celý měsíc' };
  const { report } = captureReport('NotificationsTab', props, dayState);
  assert.match(report.context, /Vybraný den: 12\. září 2026/);
  assert.equal(metric(report, 'Odeslané notifikace'), '1');
  const rows = section(report, 'Evidence jednotlivých notifikací').rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0][4], 'Pouze vybraný den');
  assert.equal(captureReport('NotificationsTab', props, { ...dayState, 5: true }).report, null);
  assert.equal(captureReport('NotificationsTab', props, { ...dayState, 2: [globalRow] }).report, null,
    'A previous day must not be registered under the newly selected date');
  assert.equal(captureReport('NotificationsTab', props, { ...dayState, 2: [], 7: '2026-09-11' }).report, null,
    'Even an empty previous-day response must not be published under a new date');
  assert.equal(captureReport('NotificationsTab', props, { ...dayState, 7: null }).report, null,
    'Partially loaded or failed selected-day data is not a printable report');
  const confirmedEmpty = captureReport('NotificationsTab', props, { ...dayState, 2: [] }).report;
  assert.equal(metric(confirmedEmpty, 'Odeslané notifikace'), '0');
});

test('selected-day report readiness requires both fetches to succeed, including valid empty arrays', async () => {
  const source = readFileSync(new URL('../../components/statistics/NotificationsTab.tsx', import.meta.url), 'utf8');
  const parsed = ts.createSourceFile('NotificationsTab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useEffect'
      && node.arguments[0]?.getText(parsed).includes('fetchStatusHistory')) effect = node.arguments[0];
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(effect, 'The selected-day loading effect exists');
  const { outputText } = ts.transpileModule(`exports.effect = (${effect.getText(parsed)});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  for (const [rows, history] of [[null, []], [[], null], [null, null], [[], []]]) {
    const state = { reportDate: 'old-date', loading: false };
    let fetches = 0;
    const scope = {
      calendarSelectionActive: true, calendarDay: new Date('2026-09-12T12:00:00'),
      localDateKey: () => '2026-09-12',
      setSelectedDayLoading: value => { state.loading = value; },
      setSelectedDayReportDate: value => { state.reportDate = value; },
      setSelectedDayNotifications: value => { state.notifications = value; },
      setSelectedDayStatusHistory: value => { state.history = value; },
      fetchNotificationsLog: async () => { fetches += 1; return rows; },
      fetchStatusHistory: async () => { fetches += 1; return history; },
    };
    const exports = {};
    new Function('exports', ...Object.keys(scope), outputText)(exports, ...Object.values(scope));
    const cleanup = exports.effect();
    assert.equal(state.reportDate, null, 'A new request immediately invalidates previous report readiness');
    assert.equal(state.loading, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fetches, 2, 'Readiness adds no requests');
    assert.equal(state.loading, false);
    assert.equal(state.reportDate, rows !== null && history !== null ? '2026-09-12' : null);
    assert.deepEqual(state.notifications, []);
    assert.deepEqual(state.history, []);
    cleanup();
  }
});

test('notification impacts keep zero distinct from unavailable and label overlapping sums', () => {
  const rooms = [600, 0].map((hourlyOperatingCost, index) => ({
    id: `room-${index}`, name: `Sál ${index}`, hourlyOperatingCost,
    weeklySchedule: { monday: { enabled: true, startHour: 0, startMinute: 0, endHour: 23, endMinute: 59 } },
  }));
  const notifications = [
    notification(0, 'room-0', { notification_type: 'emergency' }),
    notification(1, 'room-1', { notification_type: 'emergency' }),
    notification(2, null),
  ];
  const statusHistory = rooms.map(room => ({
    operating_room_id: room.id, timestamp: '2026-09-14T10:00:00', event_type: 'emergency_off',
  }));
  const { report } = captureReport('NotificationsTab', { notifications, statusHistory, rooms, periodLabel: '14. září' });
  const impacts = section(report, 'Finanční dopady jednotlivých notifikací');
  assert.deepEqual(impacts.rows.map(row => row[4]), ['600 Kč', '0 Kč', 'Nevyčíslitelné']);
  assert.equal(metric(report, 'Vyčíslitelné dopady'), '2 / 3');
  assert.equal(metric(report, 'Součet vyčíslených dopadů'), '600 Kč');
  assert.match(impacts.description, /překrývající se intervaly mohou být započteny opakovaně/);
});

test('device reports export all loaded rows and distributions without extra sensitive fields', () => {
  const devices = Array.from({ length: 12 }, (_, index) => ({
    id: `internal-${index}`, device_id: `device-id-secret-${index}`, device_name: `Zařízení ${index}`,
    device_type: index % 2 ? 'mobile' : 'desktop', platform: `platforma-${index}`,
    browser: `prohlizec-${index}`, is_active: true, is_pwa_installed: index % 2 === 0,
    last_seen_at: index === 0 ? new Date(Date.now() - 1_000).toISOString() : null,
    ip_address: '192.0.2.123', installed_at: 'sensitive-installation-value',
  }));
  const { tab, report } = captureReport('DevicesTab', { devices, periodLabel: 'Posledních 7 dní' });
  assert.equal(tab, 'zarizeni');
  assert.match(report.context, /tuto evidenci nefiltruje/);
  assert.equal(metric(report, 'Registrovaná zařízení'), '12');
  assert.equal(metric(report, 'Online nyní'), '1');
  assert.equal(section(report, 'Evidence zařízení').rows.length, 12);
  assert.equal(section(report, 'Platformy').rows.length, 12);
  assert.equal(section(report, 'Prohlížeče').rows.length, 12);
  assert.equal(section(report, 'Evidence zařízení').rows[0][0], 'Online');
  const serialized = JSON.stringify(report);
  for (const hidden of ['192.0.2.123', 'device-id-secret', 'sensitive-installation-value', 'internal-']) {
    assert.equal(serialized.includes(hidden), false, `Unexposed field leaked: ${hidden}`);
  }
});

test('loading registers null while empty loaded datasets register explicit empty reports', () => {
  assert.equal(captureReport('DevicesTab', { devices: null, periodLabel: 'Dnes' }).report, null);
  assert.equal(captureReport('NotificationsTab', { notifications: null, rooms: [], periodLabel: 'Dnes' }).report, null);
  const emptyDevices = captureReport('DevicesTab', { devices: [], periodLabel: 'Dnes' }).report;
  assert.equal(metric(emptyDevices, 'Registrovaná zařízení'), '0');
  assert.deepEqual(section(emptyDevices, 'Evidence zařízení').rows, []);
  const emptyNotifications = captureReport('NotificationsTab', { notifications: [], rooms: [], periodLabel: 'Dnes' }).report;
  assert.equal(metric(emptyNotifications, 'Odeslané notifikace'), '0');
  assert.deepEqual(section(emptyNotifications, 'Evidence jednotlivých notifikací').rows, []);
});
