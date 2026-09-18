import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { roomScope } from './load-room-scope.js';

// Exercise the real module callbacks with explicit dependencies. These tests
// cover report selection and value forwarding, not React scheduling or PDF layout.
const source = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('StatisticsModule.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function initializer(name) {
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      assert.equal(result, undefined, `Expected one declaration of ${name}`);
      result = node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(result, `Missing declaration ${name}`);
  return result;
}

function loadExpression(node, scope = {}) {
  const { outputText } = ts.transpileModule(`exports.value = (${node.getText(parsed)});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function('exports', ...Object.keys(scope), outputText)(exports, ...Object.values(scope));
  return exports.value;
}

const tabLabelMap = loadExpression(initializer('tabLabelMap'));
const periodLabelMap = loadExpression(initializer('periodLabelMap'));
const labels = ['Přehled', 'Finance', 'Sazby', 'Sály', 'Fáze', 'Notifikace', 'Zařízení'];
const payload = marker => ({ context: marker, metrics: [], sections: [] });

function printer(overrides = {}) {
  const opened = [];
  const errors = [];
  let overviewBuilds = 0;
  const overview = payload('CURRENT OVERVIEW');
  const reports = Object.fromEntries(Object.keys(tabLabelMap).map(tab => [tab, payload(tab)]));
  const scope = {
    tab: 'finance', period: 'týden', tabLabelMap, periodLabelMap,
    reportData: { current: reports }, isStatisticsLoading: false, statisticsError: undefined,
    dayHistoryCoverageStart: '2026-08-14T10:00:00.000Z',
    activeHospital: { hospital_name: 'Nemocnice Žďár', hospital_short_name: 'NŽ' },
    setPrintError: error => errors.push(error),
    buildOverviewReport: () => { overviewBuilds += 1; return overview; },
    openStatisticsPrintReport: (...args) => opened.push(args),
    ...overrides,
  };
  const print = loadExpression(initializer('handlePrint'), scope);
  return { print, opened, errors, reports, overview, overviewBuilds: () => overviewBuilds };
}

test('registry cleanup cannot remove a newer report or another tab', () => {
  const reportData = { current: {} };
  const callback = initializer('registerReport');
  assert.ok(ts.isCallExpression(callback));
  const register = loadExpression(callback.arguments[0], { reportData });
  const oldReport = payload('old finance');
  const newReport = payload('new finance');
  const deviceReport = payload('devices');
  const cleanupOld = register('finance', oldReport);
  const cleanupNew = register('finance', newReport);
  const cleanupDevice = register('zarizeni', deviceReport);
  cleanupOld();
  assert.equal(reportData.current.finance, newReport);
  assert.equal(reportData.current.zarizeni, deviceReport);
  cleanupNew();
  assert.equal('finance' in reportData.current, false);
  assert.equal(reportData.current.zarizeni, deviceReport);
  const cleanupLoading = register('zarizeni', null);
  cleanupDevice();
  assert.equal(reportData.current.zarizeni, null);
  cleanupLoading();
  assert.deepEqual(reportData.current, {});
});

test('all seven tab handlers open exactly the active payload with current metadata', () => {
  assert.deepEqual(Object.values(tabLabelMap), labels);
  for (const [tab, label] of Object.entries(tabLabelMap)) {
    const fixture = printer({ tab });
    fixture.print();
    assert.equal(fixture.opened.length, 1);
    const [report, metadata] = fixture.opened[0];
    assert.equal(report, tab === 'prehled' ? fixture.overview : fixture.reports[tab]);
    assert.equal(fixture.overviewBuilds(), tab === 'prehled' ? 1 : 0);
    assert.equal(metadata.tabLabel, label);
    assert.equal(metadata.periodLabel, periodLabelMap['týden']);
    assert.equal(metadata.hospitalName, 'Nemocnice Žďár');
    assert.ok(metadata.generatedAt instanceof Date);
    assert.match(metadata.filename, new RegExp(`^Statistiky_${tab}_\\d{4}-\\d{2}-\\d{2}$`));
    assert.deepEqual(fixture.errors, [null]);
  }
  assert.equal(initializer('handleExportPdf').getText(parsed), 'handlePrint');
});

test('source errors block only dependent tabs, so missing Devices permission cannot block other reports', () => {
  const reportSources = loadExpression(initializer('reportSources'));
  const affectedTabs = {
    statusHistory: ['prehled', 'finance', 'saly', 'faze', 'notifikace'],
    dayHistory: ['prehled', 'finance', 'saly'],
    notifications: ['finance', 'notifikace'],
    devices: ['zarizeni'],
  };
  assert.deepEqual(reportSources.sazby, [], 'Rates do not require activity or device data');
  for (const [failedSource, blockedTabs] of Object.entries(affectedTabs)) {
    const reportSourceErrors = { statusHistory: null, dayHistory: null, notifications: null, devices: null };
    reportSourceErrors[failedSource] = `Zdroj ${failedSource} se nepodařilo načíst.`;
    for (const tab of Object.keys(tabLabelMap)) {
      const statisticsError = loadExpression(initializer('statisticsError'), { reportSources, reportSourceErrors, tab });
      const blocked = blockedTabs.includes(tab);
      assert.equal(statisticsError, blocked ? reportSourceErrors[failedSource] : undefined, `${failedSource} → ${tab}`);
      const fixture = printer({ tab, statisticsError });
      fixture.print();
      assert.equal(fixture.opened.length, blocked ? 0 : 1, `${tab} print eligibility after ${failedSource} failure`);
      if (blocked) assert.match(fixture.errors[0], /Data se nepodařilo úplně načíst/);
    }
  }
  const reportSourceErrors = Object.fromEntries(Object.keys(affectedTabs).map(key => [key, 'Nedostupný zdroj']));
  assert.equal(loadExpression(initializer('statisticsError'), { reportSources, reportSourceErrors, tab: 'sazby' }), undefined);
});

test('loading, source errors, missing reports and null reports block preview creation', () => {
  for (const overrides of [
    { isStatisticsLoading: true },
    { statisticsError: new Error('Unavailable') },
    { reportData: { current: {} } },
    { reportData: { current: { finance: null, saly: payload('inactive') } } },
  ]) {
    const fixture = printer(overrides);
    fixture.print();
    assert.equal(fixture.opened.length, 0);
    assert.equal(fixture.overviewBuilds(), 0);
    assert.equal(fixture.errors.length, 1);
    assert.equal(typeof fixture.errors[0], 'string');
    assert.ok(fixture.errors[0].length > 20);
  }
});

test('an empty valid report remains printable and popup failures surface to the user', () => {
  const empty = payload('No matching rows');
  const fixture = printer({ reportData: { current: { finance: empty } }, activeHospital: { hospital_short_name: 'NŽ' } });
  fixture.print();
  assert.equal(fixture.opened[0][0], empty);
  assert.equal(fixture.opened[0][1].hospitalName, 'NŽ');
  const failed = printer({ openStatisticsPrintReport: () => { throw new Error('Povolte náhled reportu.'); } });
  failed.print();
  assert.deepEqual(failed.errors, [null, 'Povolte náhled reportu.']);
});

test('reports requiring historical coverage block missing or too-old data, but accept the loaded boundary', () => {
  const requiredHistoryFrom = '2026-08-14T10:00:00.000Z';
  const report = { ...payload('Requires a complete selected day'), requiredHistoryFrom };
  for (const [dayHistoryCoverageStart, allowed] of [
    [null, false],
    ['2026-08-14T10:00:00.001Z', false],
    [requiredHistoryFrom, true],
    ['2026-08-14T09:59:59.999Z', true],
  ]) {
    const fixture = printer({ reportData: { current: { finance: report } }, dayHistoryCoverageStart });
    fixture.print();
    assert.equal(fixture.opened.length, allowed ? 1 : 0);
    if (!allowed) assert.match(fixture.errors[0], /mimo úplně načtenou historii/);
  }
});

function overviewFixture(overrides = {}) {
  const metricsDay = new Date(2026, 8, 10, 12);
  const dayHistory = [{ id: 'DAY HISTORY' }];
  const statusHistory = [{ id: 'PERIOD HISTORY' }];
  const rooms = Array.from({ length: 15 }, (_, index) => ({ id: `room-${index}`, name: `Sál č. ${index + 1}`, index }));
  const dayCalls = [];
  const periodCalls = [];
  const durationInputs = [];
  const daily = value => (room, history, day) => {
    assert.equal(history, dayHistory);
    assert.equal(day, metricsDay);
    dayCalls.push(room.id);
    return value + room.index;
  };
  const periodValue = value => (room, history, period) => {
    assert.equal(history, statusHistory);
    assert.equal(period, overrides.period ?? 'týden');
    periodCalls.push(room.id);
    return value + room.index;
  };
  const scope = {
    metricsDay, period: 'týden', periodLabelMap, rooms, dayRooms: rooms, dayHistory, statusHistory,
    STATISTICS_ROOM_SCOPE_NOTE: roomScope.STATISTICS_ROOM_SCOPE_NOTE,
    dayBounds: day => {
      assert.equal(day, metricsDay);
      const start = new Date(day);
      start.setHours(7, 0, 0, 0);
      return { start };
    },
    dayStats: { totalOps: 17, avgUtil: 61, activeRooms: 4, openRooms: 10 },
    orbitRoom: rooms[14], selectedOp: { label: 'Výkon 15' },
    dayPhaseRings: [{ label: 'Řez → Šití', detail: '2 h 10 min', percent: 25.5 }],
    roomOperationRings: [{ label: '08:00–10:00', centerLabel: '2 h', detail: 'Dokončeno' }, { label: '10:30–nyní' }],
    selectedOpPhases: [{ label: 'Anestezie', ms: 120000 }, { label: 'Operace', ms: 3600000 }],
    weekdayIndex: day => { assert.equal(day, metricsDay); return 3; },
    formatRoomWorkingHours: (_room, weekday) => { assert.equal(weekday, 3); return '07:00–15:00'; },
    calculateRoomUtilizationForDay: daily(50),
    countOperationsForDay: daily(0),
    calculateActiveMinutesForDay: daily(90.4),
    getRoomWorkingMinutesForDate: (_room, day) => { assert.equal(day, metricsDay); return 480; },
    getRoomTotalWorkingMinutes: () => 480,
    calculatePausedMinutesForDay: daily(3.6),
    calculateOvertimeMinutesForDay: daily(0),
    countOperationsInWorkingHours: periodValue(12),
    calculateRoomUtilization: periodValue(77),
    roomStatusLabel: room => `Aktuální stav ${room.index}`,
    fmtDurationMin: minutes => { durationInputs.push(minutes); return `${minutes} min`; },
    deptMap: Array.from({ length: 9 }, (_, index) => [`Oddělení ${index + 1}`, index]),
    dbStats: { operationsByDay: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`2026-09-${String(12 - index).padStart(2, '0')}`, 12 - index])) },
    intervalCompare: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((t, v) => ({ t, v })),
    overviewInsights: [{ title: 'Zjištění', text: 'Doporučení' }],
    ...overrides,
  };
  return { report: loadExpression(initializer('buildOverviewReport'), scope)(), scope, dayCalls, periodCalls, durationInputs };
}

test('Overview forwards the selected day and period separately and preserves minute units', () => {
  const { report, scope, dayCalls, periodCalls, durationInputs } = overviewFixture();
  const section = title => report.sections.find(item => item.title === title);
  assert.ok(report.context.includes(scope.metricsDay.toLocaleDateString('cs-CZ', { dateStyle: 'long' })));
  assert.ok(report.context.includes('07:00'));
  assert.ok(report.context.includes(periodLabelMap['týden'].toLowerCase()));
  assert.ok(report.context.includes('Sál č. 15'));
  assert.equal(report.requiredHistoryFrom, scope.dayBounds(scope.metricsDay).start.toISOString());
  assert.equal(report.metrics.find(metric => metric.label === 'Výkony ve vybraném dni').value, 17);
  assert.equal(report.metrics.find(metric => metric.label === 'Průměrné vytížení dne').value, '61 %');
  const daily = section('Provozní metriky jednotlivých sálů');
  assert.equal(daily.rows.length, 15);
  assert.deepEqual(daily.rows[0], ['Sál č. 1', '07:00–15:00', '50 %', 0, '90 / 480', 4, 0]);
  assert.equal(daily.rows.at(-1)[0], 'Sál č. 15');
  assert.ok(daily.columns.some(column => column.label === 'Aktivní / kapacita (min)'));
  assert.equal(new Set(dayCalls).size, 15);
  const period = section(`Souhrn za období: ${periodLabelMap['týden']}`);
  assert.equal(period.rows.length, 15);
  assert.deepEqual(period.rows[0], ['Sál č. 1', 12, '77 %', 'Aktuální stav 0']);
  assert.equal(new Set(periodCalls).size, 15);
  assert.deepEqual(section('Fáze operačního cyklu ve vybraném dni').rows, [['Řez → Šití', '2 h 10 min', '25,5 %']]);
  assert.deepEqual(section('Fáze vybraného výkonu: Výkon 15').rows, [['Anestezie', '2 min'], ['Operace', '60 min']]);
  assert.deepEqual(durationInputs, [2, 60]);
  assert.deepEqual(section('Výkony vybraného sálu: Sál č. 15').rows.at(-1), ['10:30–nyní', '', '']);
});

test('Overview includes all departments, available daily history and weekday rows without UI truncation', () => {
  const { report, scope } = overviewFixture({ orbitRoom: null, selectedOp: null });
  const section = title => report.sections.find(item => item.title === title);
  assert.deepEqual(section('Výkony podle oddělení').rows, scope.deptMap);
  const trend = section('Dokončené výkony podle dne').rows;
  assert.equal(trend.length, 12);
  assert.deepEqual(trend.map(row => row[1]), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.deepEqual(section('Průměrný počet výkonů podle dne v týdnu').rows, scope.intervalCompare.map(day => [day.t, day.v]));
  assert.deepEqual(section('Provozní doporučení').rows[0], ['Zjištění', 'Doporučení']);
  assert.equal(report.sections.some(item => item.title.startsWith('Výkony vybraného sálu:')), false);
  assert.equal(report.sections.some(item => item.title.startsWith('Fáze vybraného výkonu:')), false);
});

test('Overview qualifies daily utilization and distinguishes current emergency rooms from historical events', () => {
  const { report } = overviewFixture({
    period: 'den',
    overviewInsights: [
      { title: 'Nouzový režim: 12 sály', text: 'Historical event count must not appear as current rooms' },
      { title: 'Bez mimořádností', text: 'Historical period advice' },
      { title: 'Využití vybraného dne', text: 'Keep the actual day insight' },
    ],
  });
  const period = report.sections.find(item => item.title === `Souhrn za období: ${periodLabelMap.den}`);
  assert.match(period.description, /aktuálnímu provoznímu dni od 07:00, nikoli k posuvným 24 hodinám/);
  const insights = report.sections.find(item => item.title === 'Provozní doporučení').rows;
  assert.deepEqual(insights[0], ['Využití vybraného dne', 'Keep the actual day insight']);
  assert.equal(insights.length, 2);
  assert.equal(insights[1][0], 'Aktuální nouzový režim');
  assert.match(insights[1][1], /^0 sálů/);
  assert.match(insights[1][1], /okamžiku vytvoření reportu/);
});

test('print shortcut routes Ctrl/Cmd+P to the latest handler without hijacking unrelated keys', () => {
  let calls = 0;
  let prevented = 0;
  const printHandlerRef = { current: () => { calls += 1; } };
  const shortcut = loadExpression(initializer('onPrintShortcut'), { printHandlerRef });
  const event = overrides => ({ key: 'p', ctrlKey: false, metaKey: false, altKey: false, preventDefault: () => { prevented += 1; }, ...overrides });
  shortcut(event({ ctrlKey: true }));
  shortcut(event({ metaKey: true, key: 'P' }));
  assert.equal(calls, 2);
  assert.equal(prevented, 2);
  printHandlerRef.current = () => { calls += 10; };
  shortcut(event({ metaKey: true }));
  assert.equal(calls, 12);
  for (const unrelated of [event({}), event({ ctrlKey: true, key: 's' }), event({ ctrlKey: true, altKey: true })]) shortcut(unrelated);
  assert.equal(calls, 12);
  assert.equal(prevented, 3);
});
