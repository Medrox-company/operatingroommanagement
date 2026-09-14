import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the production registration expressions against precomputed tab data.
// This covers the report contract and readiness gates, not React effects,
// upstream database calculations, browser layout, or PDF pagination.
const sourceFile = name => {
  const path = new URL(`../../components/statistics/${name}.tsx`, import.meta.url);
  return ts.createSourceFile(path.pathname, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
};
const shared = sourceFile('shared');

function declaration(source, name) {
  let result;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) result = `const ${node.getText(source)};`;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) result = node.getText(source).replace(/^export\s+/, '');
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(result, `Missing production declaration: ${name}`);
  return result;
}

const reportPrograms = Object.fromEntries(['FinanceTab', 'RoomsTab', 'PhasesTab'].map(name => {
  const source = sourceFile(name);
  let registration;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useStatisticsReport') {
      assert.equal(registration, undefined, `${name} must register exactly one report`);
      registration = node;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(registration, `${name} must register a report`);
  const helpers = ['formatNumber', 'formatMinutes', 'formatPercent'].map(helper => declaration(shared, helper));
  if (name === 'FinanceTab') helpers.push(...['localDateKey', 'formatDuration', 'reportMoney', 'reportHours', 'reportScope', 'financeReportReady'].map(helper => declaration(source, helper)));
  if (name === 'PhasesTab') helpers.push(declaration(source, 'activePeriodLabel'));
  const code = `${helpers.join('\n')}\n({ tab: ${registration.arguments[0].getText(source)}, report: ${registration.arguments[1].getText(source)} });`;
  return [name, ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText];
}));

function capture(name, data) {
  return JSON.parse(JSON.stringify(vm.runInNewContext(reportPrograms[name], data)));
}
function section(report, title) {
  const found = report.sections.find(item => item.title === title);
  assert.ok(found, `Missing section: ${title}`);
  return found;
}
function metric(report, label) {
  const found = report.metrics.find(item => item.label === label);
  assert.ok(found, `Missing metric: ${label}`);
  return found.value;
}
function validateTables(report) {
  for (const table of report.sections) {
    for (const row of table.rows) {
      assert.equal(row.length, table.columns.length, table.title);
      assert.ok(row.every(value => typeof value === 'string' || typeof value === 'number'), table.title);
    }
  }
}

const rooms = Array.from({ length: 8 }, (_, index) => ({
  id: `room-${index}`, name: `Sál ${index + 1}`, department: 'Chirurgie',
  rate: index === 7 ? null : index === 6 ? 0 : 1_000,
  hourlyOperatingCost: index === 7 ? null : index === 6 ? 0 : 1_000,
  hours: 123.4, capacityHours: 200, cost: index === 7 ? null : index === 6 ? 0 : 123_456.78,
  configured: index !== 7, utilizationPct: 61.7, opsCount: 10,
  downtimeMinutes: 12, downtimeIntervals: 2, downtimeCost: index === 7 ? null : index === 6 ? 0 : 200,
  delayedStartMinutes: 5, delayedStartDays: 1, scheduledDaysWithOperation: index === 7 ? 0 : 2,
  delayedStartCost: index === 7 ? null : index === 6 ? 0 : 83,
  lateSurgeon: 1, lateAnesthesiologist: 0, patientNotReady: 0,
  surgeonSpecialties: [{ name: 'Chirurgie', count: 1 }],
  currentStepIndex: 0, queueCount: 0, status: 'volny',
}));

function financeData(overrides = {}) {
  return {
    view: 'finance', rooms, roomFinance: rooms, allRoomsByCost: rooms,
    allRoomPhaseCosts: rooms.filter(room => (room.cost ?? 0) > 0).map(room => ({
      ...room, phases: [{ name: 'Operace', hours: 123.4, cost: 123_456.78 }],
    })),
    summary: { totalCost: 740_740.68, totalHours: 863.8, costPerHour: 857.54, costPerOperation: 10_582.01, avgRate: 857.14, configuredCount: 7, unconfiguredCount: 1 },
    workingOpsCount: 80, workingAvgUtilization: 61.7, costCoverage: 88,
    departmentBreakdown: [{ label: 'Chirurgie', value: 740_740.68, hours: 863.8, ops: 70 }],
    dailySeries: [{ date: '2026-09-14', hours: 10, cost: 10_000 }],
    calculationPeriod: 'rok', periodLabel: 'rok', LATEST_PROGRAM_START_GRACE_MINUTES: 60,
    providedHistory: [], highestRateRoom: rooms[0], lowestRateRoom: rooms[6], medianRate: 1_000, rateSpread: 1_000,
    savingRoomId: null, editingRoomId: null, calendarDay: new Date(2026, 8, 12), calendarSelectionActive: false,
    historyLoading: false, historyReportError: false, delayDataLoading: false, delayDataReportError: false,
    selectedDayLoading: false, selectedDayReportKey: null,
    ...overrides,
  };
}

test('Finance exports all rooms and phase costs beyond the UI top five with complete CZK amounts', () => {
  const { tab, report } = capture('FinanceTab', financeData());
  assert.equal(tab, 'finance');
  assert.match(report.context, /Vybrané období: rok/);
  assert.equal(section(report, 'Náklady všech operačních sálů').rows.length, 8);
  assert.equal(section(report, 'Náklady jednotlivých fází podle sálů').rows.length, 6);
  assert.equal(section(report, 'Pozdní operatér podle odbornosti v rozpisu').rows.length, 8);
  assert.equal(section(report, 'Náklady všech operačních sálů').rows[0][4].replace(/\s/g, ' '), '123 457 Kč');
  assert.equal(metric(report, 'Celkové náklady provozu').replace(/\s/g, ' '), '740 741 Kč');
  assert.match(section(report, 'Denní vývoj nákladů').description, /posledních 30 kalendářních dnů/);
  validateTables(report);
});

test('Finance and Sazby retain zero rates separately from absent rates and unpriced costs', () => {
  const finance = capture('FinanceTab', financeData()).report;
  const costs = section(finance, 'Náklady všech operačních sálů').rows;
  assert.deepEqual(costs.slice(6).map(row => [row[2], row[4]]), [['0 Kč/h', '0 Kč'], ['Nenastaveno', 'Sazba chybí']]);
  assert.deepEqual(section(finance, 'Prostoje mezi operacemi').rows.slice(6).map(row => row[3]), ['0 Kč', 'Sazba chybí']);
  const { tab, report: rates } = capture('FinanceTab', financeData({ view: 'rates', editingRoomId: rooms[0].id }));
  assert.equal(tab, 'sazby');
  assert.equal(section(rates, 'Hodinové sazby všech operačních sálů').rows.length, 8);
  assert.deepEqual(section(rates, 'Hodinové sazby všech operačních sálů').rows.slice(6).map(row => row[2]), ['0 Kč/h', 'Nenastaveno']);
  assert.equal(metric(rates, 'Nastavené sály'), '7 / 8');
  assert.equal(metric(rates, 'Nejnižší sazba'), '0 Kč/h');
  assert.match(rates.context, /Rozepsaná neuložená hodnota.*není zahrnuta/);
  validateTables(rates);
});

test('Finance custom days require matching committed data; loading and errors register null', () => {
  const selected = financeData({ calendarSelectionActive: true, selectedDayReportKey: '2026-09-12', calculationPeriod: 'den', dailySeries: [] });
  const { report } = capture('FinanceTab', selected);
  assert.match(report.context, /Kalendářní den 12\. září 2026, od 00:00 do 24:00/);
  assert.equal(report.sections.some(item => item.title === 'Denní vývoj nákladů'), false);
  for (const state of [{ selectedDayLoading: true }, { selectedDayReportKey: null }, { selectedDayReportKey: '2026-09-11' }, { delayDataLoading: true }, { delayDataReportError: true }]) {
    assert.equal(capture('FinanceTab', { ...selected, ...state }).report, null, JSON.stringify(state));
  }
  for (const state of [{ historyLoading: true }, { historyReportError: true }]) {
    assert.equal(capture('FinanceTab', financeData(state)).report, null);
  }
  assert.notEqual(capture('FinanceTab', financeData({ view: 'rates', historyLoading: true, delayDataLoading: true })).report, null,
    'Current rates do not depend on historical measurements or specialty loading');
});

test('Finance labels the standalone history limit only for the limited global-period fetch', () => {
  assert.match(capture('FinanceTab', financeData({ providedHistory: undefined })).report.context, /5 000 záznamů/);
  const custom = financeData({ providedHistory: undefined, calendarSelectionActive: true, selectedDayReportKey: '2026-09-12', calculationPeriod: 'den', dailySeries: [] });
  assert.doesNotMatch(capture('FinanceTab', custom).report.context, /5 000/);
});

test('Sály exports every sorted room and phase with selected operational-day context', () => {
  const data = {
    calendarSelectionActive: true, selectedDayLabel: '12. září 2026', periodLabel: 'rok', sortBy: 'name', rooms,
    selectedDayBounds: { start: new Date(2026, 8, 12, 7), end: new Date(2026, 8, 13, 7) },
    avgUtilization: 61.7, totalOps: 80, roomsInOperation: 8, freeCount: 8, cleanCount: 0, maintCount: 0,
    sortedRooms: [...rooms].reverse().map(room => ({ room, utilization: 61.7, operations: 10, avgOpTime: null })),
    phaseRings: Array.from({ length: 7 }, (_, index) => ({ label: `Fáze ${index + 1}`, detail: '60 min', percent: 14.3 })),
    insights: [],
  };
  const { tab, report } = capture('RoomsTab', data);
  assert.equal(tab, 'saly');
  assert.equal(report.requiredHistoryFrom, data.selectedDayBounds.start.toISOString());
  assert.match(report.context, /Provozní den 12\. září 2026, od 07:00 do 07:00 následujícího dne/);
  assert.match(report.context, /Řazení sálů: abecedně/);
  assert.equal(section(report, 'Výkonnost všech operačních sálů').rows.length, 8);
  assert.equal(section(report, 'Výkonnost všech operačních sálů').rows[0][0], 'Sál 8');
  assert.equal(section(report, 'Výkonnost všech operačních sálů').rows[0][3], '—');
  assert.equal(section(report, 'Čas naměřených provozních fází').rows.length, 7);
  assert.match(section(report, 'Aktuální stav sálů').description, /není historickým snímkem/);
  assert.match(capture('RoomsTab', { ...data, calendarSelectionActive: false }).report.context, /Vybrané období: rok/);
  validateTables(report);
});

test('Fáze keeps all aggregate rows, cumulative time and current assignments with truthful date scope', () => {
  const workflowSteps = Array.from({ length: 7 }, (_, index) => ({ title: `Fáze ${index + 1}`, organizer: 'Personál' }));
  const data = {
    calendarSelectionActive: true, calendarDay: new Date(2026, 8, 12), periodLabel: 'rok',
    avgCycleDuration: 70, avgStepDurations: [10, 10, 10, 10, 10, 10, 10], longestPhaseIdx: 0, shortestPhaseIdx: 0,
    workflowSteps, cyclePhaseIndices: [0, 1, 2, 3, 4, 5, 6], rooms, roomsPerPhase: [8, 0, 0, 0, 0, 0, 0],
    workflowAgg: workflowSteps.map(() => ({ pct: 14 })), cumulativeData: workflowSteps.map((_, index) => ({ cumulative: (index + 1) * 10 })),
  };
  const { tab, report } = capture('PhasesTab', data);
  assert.equal(tab, 'faze');
  assert.match(report.context, /Provozní den 12\. září 2026, od 07:00 do 07:00/);
  assert.match(report.context, /délky fází nejsou oříznuté na hranici dne/);
  const table = section(report, 'Úplný přehled fází operačního cyklu');
  assert.equal(table.rows.length, 7);
  assert.equal(table.rows[6][4], '70 min');
  assert.match(section(report, 'Aktuální rozložení sálů v cyklu').rows[0][2], /Sál 8/);
  assert.match(capture('PhasesTab', { ...data, calendarSelectionActive: false }).report.context, /Vybrané období: rok/);
  validateTables(report);
});
