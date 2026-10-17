import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { roomScope } from './load-room-scope.js';

// Run the actual pure projection and existing aggregation helpers without
// importing credentials, querying clinical data, or exercising browser layout.
function loadModule(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(dependency => {
    assert.ok(Object.hasOwn(dependencies, dependency), `Unexpected dependency: ${dependency}`);
    return dependencies[dependency];
  }, exports);
  return exports;
}

const phaseFilter = loadModule('../../lib/statistics-phase-filter.ts');
const activity = loadModule('../../lib/statistics-room-activity.ts', {
  '../components/mobile/mobile-statistics.css': {},
});
const phase = (id, duration, overrides = {}) => ({
  id, operating_room_id: 'qa-room', event_type: 'step_change',
  timestamp: '2026-09-14T09:00:00.000Z', step_index: 2,
  step_name: 'Chirurgický výkon', duration_seconds: duration,
  metadata: { synthetic: true, label: 'QA fixture only' }, ...overrides,
});

test('phase quality projection uses the exact one-minute boundary and preserves unknown measurements', () => {
  const durations = [0, 59, 59.999, 60, 60.001, null, undefined, -1, NaN, Infinity, -Infinity, '59'];
  const history = durations.map((duration, index) => phase(`qa-${index}`, duration));
  const projected = phaseFilter.filterStatisticsPhaseDurations(history, true);
  for (let index = 0; index < durations.length; index += 1) {
    const short = index < 3;
    assert.equal(phaseFilter.isShortStatisticsPhase(history[index]), short, String(durations[index]));
    assert.equal(projected[index].duration_seconds, short ? null : durations[index], String(durations[index]));
    assert.equal(projected[index] === history[index], !short, 'Only excluded measurements need a copied row');
  }
});

test('disabled projection is the original history and enabled projection never mutates source evidence', () => {
  const history = Object.freeze([
    Object.freeze(phase('qa-short', 59)),
    Object.freeze(phase('qa-minute', 60)),
  ]);
  assert.equal(phaseFilter.filterStatisticsPhaseDurations(history, false), history);
  const projected = phaseFilter.filterStatisticsPhaseDurations(history, true);
  assert.equal(history[0].duration_seconds, 59);
  assert.equal(projected.length, history.length);
  for (let index = 0; index < history.length; index += 1) {
    assert.deepEqual(projected[index], {
      ...history[index], duration_seconds: index === 0 ? null : history[index].duration_seconds,
    });
    assert.equal(projected[index].metadata, history[index].metadata);
  }
});

test('short phase projection retains every lifecycle, reset and unknown event without reordering', () => {
  const eventTypes = ['operation_start', 'step_change', 'operation_end', 'operation_completed', 'operation_reset', 'pause', 'unknown'];
  const history = eventTypes.map((event_type, index) => phase(`qa-${index}`, 59, { event_type }));
  const projected = phaseFilter.filterStatisticsPhaseDurations(history, true);
  assert.deepEqual(projected.map(event => event.id), history.map(event => event.id));
  for (let index = 0; index < history.length; index += 1) {
    if (eventTypes[index] !== 'step_change') assert.equal(projected[index], history[index]);
    assert.equal(projected[index].timestamp, history[index].timestamp);
    assert.equal(projected[index].step_index, history[index].step_index);
  }
});

test('null excluded phases are omitted from the real average denominator, not counted as zero minutes', () => {
  const workflow = [{ title: 'Chirurgický výkon' }, { title: 'Sál připraven' }, { title: 'Bez měření' }];
  const history = [29, 29, 60, 120, null].map((duration, index) => phase(`qa-${index}`, duration));
  history.push(phase('qa-idle', 3600, { step_name: 'Sál připraven' }));
  assert.deepEqual(activity.calculateAvgStepDurations(history, workflow), [1, 0, 0]);
  assert.deepEqual(activity.calculateAvgStepDurations(
    phaseFilter.filterStatisticsPhaseDurations(history, true), workflow,
  ), [2, 0, 0], 'Only the retained 60 and 120 seconds enter the average denominator');
  assert.deepEqual(activity.calculateAvgStepDurations(
    phaseFilter.filterStatisticsPhaseDurations([phase('qa-only-short', 59)], true), workflow,
  ), [0, 0, 0]);
});

test('real lifecycle pairing and operation counts survive filtering even when whole cycles are under a minute', () => {
  const room = { id: 'qa-room', name: 'QA fixture only', currentStepIndex: 0, weeklySchedule: {} };
  const history = [
    phase('qa-start', 59, { event_type: 'operation_start', timestamp: '2026-09-14T08:00:00.000Z' }),
    phase('qa-short', 59, { timestamp: '2026-09-14T08:00:59.000Z' }),
    phase('qa-end', 59, { event_type: 'operation_end', timestamp: '2026-09-14T08:00:59.000Z' }),
    phase('qa-archive', 59, {
      event_type: 'operation_completed', timestamp: '2026-09-14T09:00:59.000Z',
      metadata: { startedAt: '2026-09-14T09:00:00.000Z', endedAt: '2026-09-14T09:00:59.000Z' },
    }),
  ];
  const projected = phaseFilter.filterStatisticsPhaseDurations(history, true);
  const intervals = activity.buildRoomOperationIntervals(room, history);
  assert.equal(intervals.length, 2);
  assert.deepEqual(activity.buildRoomOperationIntervals(room, projected), intervals);
  assert.deepEqual(activity.getRecordedOperationStarts(room, projected), activity.getRecordedOperationStarts(room, history));
  assert.equal(activity.getRecordedOperationStarts(room, projected).length, 2);
});

const moduleSource = readFileSync(new URL('../../components/StatisticsModule.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('StatisticsModule.tsx', moduleSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function initializer(name, optional = false) {
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) {
      assert.equal(expression, undefined, `Expected one declaration of ${name}`);
      expression = node.initializer;
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  if (!optional) assert.ok(expression, `Missing production declaration: ${name}`);
  return expression;
}
function evaluate(expression, scope) {
  const code = ts.transpileModule(`exports.value = (${expression.getText(parsed)});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function('exports', ...Object.keys(scope), code)(exports, ...Object.values(scope));
  return exports.value;
}

test('global filter cannot remove rooms whose only historical operating evidence is a measured short phase', () => {
  const window = { start: new Date('2026-09-14T07:00:00.000Z'), end: new Date('2026-09-15T07:00:00.000Z') };
  const room = { id: 'qa-room', name: 'QA short phase only', currentStepIndex: 0, weeklySchedule: {} };
  const raw = [phase('qa-proof', 59)];
  for (const excluded of [false, true]) {
    const scope = {
      ...roomScope, ...phaseFilter, excludeShortPhases: excluded,
      useMemo: factory => factory(), allRooms: [room], rawStatusHistory: raw, rawDayHistory: raw,
      allStatusHistory: raw, allDayHistory: raw,
      period: 'den', metricsDay: window.start,
      statisticsPeriodWindow: () => window, statisticsDayWindow: () => window,
    };
    // Evaluate explicit derived histories when present. After the regression
    // fix these names are direct raw useStatisticsData aliases instead.
    for (const name of ['allStatusHistory', 'allDayHistory']) {
      const expression = initializer(name, true);
      if (expression) scope[name] = evaluate(expression, scope);
    }
    for (const name of ['periodScope', 'dayScope']) {
      const result = evaluate(initializer(name), scope);
      assert.deepEqual(result.rooms.map(item => item.id), [room.id], `${name}, excluded=${excluded}`);
      scope[name] = result;
    }
    assert.equal(evaluate(initializer('statusHistory'), scope)[0].duration_seconds, excluded ? null : 59);
    assert.equal(evaluate(initializer('dayHistory'), scope)[0].duration_seconds, excluded ? null : 59);
  }
});

test('locally loaded tab history is projected with the global phase-filter context', () => {
  const history = [phase('qa-short', 59.999), phase('qa-minute', 60)];
  for (const excluded of [false, true]) {
    const contexts = loadModule('../../components/statistics/StatisticsPhaseFilterContext.tsx', {
      react: { createContext: value => ({ defaultValue: value }), useContext: () => excluded, useMemo: factory => factory() },
      '../../lib/statistics-phase-filter': phaseFilter,
    });
    assert.deepEqual(contexts.useStatisticsPhaseHistory(history), phaseFilter.filterStatisticsPhaseDurations(history, excluded));
    assert.equal(contexts.StatisticsPhaseFilterContext.defaultValue, false);
  }
});

test('report registration appends the actual global filter note without mutating the committed report', () => {
  const report = Object.freeze({ context: 'Historické naměřené hodnoty.', metrics: [], sections: [] });
  for (const excluded of [false, true]) {
    const phaseContext = {};
    const registered = [];
    let cleanup;
    const unregister = () => {};
    const contexts = loadModule('../../components/statistics/StatisticsReportContext.tsx', {
      react: {
        createContext: value => ({ defaultValue: value }),
        useContext: context => context === phaseContext ? excluded : (tab, payload) => {
          registered.push({ tab, payload });
          return unregister;
        },
        useMemo: factory => factory(),
        useEffect: effect => { cleanup = effect(); },
      },
      './StatisticsPhaseFilterContext': { StatisticsPhaseFilterContext: phaseContext },
      '../../lib/statistics-phase-filter': phaseFilter,
    });
    contexts.useStatisticsReport('finance', report);
    assert.equal(registered.length, 1);
    assert.equal(registered[0].tab, 'finance');
    assert.equal(registered[0].payload.context, `${report.context} ${phaseFilter.statisticsPhaseFilterNote(excluded)}`);
    assert.notEqual(registered[0].payload, report);
    assert.equal(registered[0].payload.sections, report.sections);
    assert.equal(report.context, 'Historické naměřené hodnoty.');
    assert.equal(cleanup, unregister, 'Effect cleanup unregisters the exact published snapshot');
    contexts.useStatisticsReport('finance', null);
    assert.equal(registered[1].payload, null, 'Loading/error reports stay null, not a note-only printable snapshot');
  }
});

test('Performance receives raw lifecycle history and the same global controlled filter', () => {
  let occurrences = 0;
  function visit(node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(parsed) === 'PerformanceTab') {
      occurrences += 1;
      const props = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(prop => [
        prop.name.getText(parsed), prop.initializer?.expression?.getText(parsed),
      ]));
      assert.equal(props.history, 'performance.history');
      assert.equal(props.excludeShortPhases, 'excludeShortPhases');
      assert.equal(props.onExcludeShortPhasesChange, 'setExcludeShortPhases');
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.ok(occurrences > 0);
});
