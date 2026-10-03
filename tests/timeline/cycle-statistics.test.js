import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/timeline-cycle-statistics.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const module = { exports: {} };
new Function('exports', 'module', outputText)(module.exports, module);
const { completedCycleSnapshot, cyclePhaseMinutes, dailyCycleStatistics } = module.exports;
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute);
const iso = (day, hour, minute = 0) => at(day, hour, minute).toISOString();
const cycle = {
  startedAt: iso(3, 9), endedAt: iso(3, 11),
  statusHistory: [
    { stepIndex: 1, startedAt: iso(3, 9) },
    { stepIndex: 2, startedAt: iso(3, 9, 15) },
    { stepIndex: 3, startedAt: iso(3, 10, 45) },
  ],
};
const room = { id: 'external', currentStepIndex: 0, completedOperations: [cycle], weeklySchedule: { saturday: { enabled: false } } };

test('historický snímek má stabilní identitu a hranice celého cyklu', () => {
  const snapshot = completedCycleSnapshot({ ...room, isPaused: true, estimatedEndTime: iso(3, 20) }, cycle);
  assert.equal(snapshot.id, `external:cycle:${cycle.startedAt}:${cycle.endedAt}`);
  assert.equal(snapshot.operationStartedAt, cycle.startedAt);
  assert.equal(snapshot.estimatedEndTime, cycle.endedAt);
  assert.deepEqual(snapshot.statusHistory, cycle.statusHistory);
  assert.equal(snapshot.isPaused, false);
});

test('podíly fází pokrývají celý vybraný cyklus a neprodlužují se k aktuálnímu času', () => {
  assert.deepEqual(cyclePhaseMinutes(cycle.statusHistory, at(3, 9).getTime(), at(3, 11).getTime()), { 1: 15, 2: 90, 3: 15 });
});

test('historie se ořízne na hranice cyklu, bez mutace a bez odhadovaných fází', () => {
  const history = [cycle.statusHistory[2], { stepIndex: 1, startedAt: iso(3, 8) }, cycle.statusHistory[1], { stepIndex: 0, startedAt: iso(3, 12) }];
  const copy = structuredClone(history);
  assert.deepEqual(cyclePhaseMinutes(history, at(3, 9).getTime(), at(3, 11).getTime()), { 1: 15, 2: 90, 3: 15 });
  assert.deepEqual(history, copy);
  assert.deepEqual(cyclePhaseMinutes([], at(3, 9).getTime(), at(3, 11).getTime()), {});
});

test('denní souhrn zahrne skutečný sobotní cyklus i při zavřeném rozvrhu', () => {
  const result = dailyCycleStatistics(room, at(3, 18));
  assert.equal(result.operations, 1);
  assert.equal(result.durationMs / 60_000, 120);
  assert.deepEqual(result.phaseMs, { 1: 15 * 60_000, 2: 90 * 60_000, 3: 15 * 60_000 });
});

test('souhrn dne nezahrne předchozí a budoucí cykly ani minuty před půlnocí', () => {
  const overnight = { startedAt: iso(2, 23), endedAt: iso(3, 1), statusHistory: [{ stepIndex: 2, startedAt: iso(2, 23) }] };
  const other = day => ({ startedAt: iso(day, 9), endedAt: iso(day, 11), statusHistory: [] });
  const result = dailyCycleStatistics({ ...room, completedOperations: [other(2), cycle, overnight, other(4)] }, at(3, 18));
  assert.equal(result.operations, 2);
  assert.equal(result.durationMs / 60_000, 180);
  assert.equal(result.phaseMs[2] / 60_000, 150);
});

test('probíhající cyklus používá skutečný čas, ne odhad, a měření oddělí od aktuální pauzy', () => {
  const active = { ...room, completedOperations: [], currentStepIndex: 6, operationStartedAt: iso(3, 9),
    estimatedEndTime: iso(3, 20), statusHistory: [{ stepIndex: 6, startedAt: iso(3, 9) }] };
  assert.equal(dailyCycleStatistics(active, at(3, 10)).durationMs / 60_000, 60);
  const paused = dailyCycleStatistics({ ...active, isPaused: true, pausedAt: iso(3, 9, 45) }, at(3, 10));
  assert.equal(paused.operations, 1);
  assert.equal(paused.durationMs / 60_000, 45);
  assert.equal(paused.phaseMs[6] / 60_000, 45);
  assert.equal(paused.pausedMs / 60_000, 15);
});
