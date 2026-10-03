import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/statistics/RoomsTab.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('RoomsTab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let calculation;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === 'phaseRings') {
    calculation = node.initializer.arguments[0].getText(parsed);
  }
  ts.forEachChild(node, visit);
}
visit(parsed);
assert.ok(calculation);
const code = ts.transpileModule(`(${calculation})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function rings(durations) {
  const workflowSteps = Object.keys(durations).map(title => ({ title, color: '#fff' }));
  const analysisHistory = Object.entries(durations).map(([step_name, duration_seconds]) => ({
    operating_room_id: 'a', event_type: 'step_change', step_name, duration_seconds,
    timestamp: '2026-09-29T12:00:00Z',
  }));
  return JSON.parse(JSON.stringify(vm.runInNewContext(code, {
    workflowSteps, analysisHistory, rooms: [{ id: 'a' }],
    calendarSelectionActive: false, selectedDayBounds: {}, C: { yellow: '#ff0' },
    formatMinutes: minutes => `${minutes} min`,
    roomWorkingOverlapSeconds: (_room, start, end) => Math.max(0, (end - start) / 1000),
  })));
}

test('ready time is excluded from both cycle phases and percentage denominator', () => {
  const result = rings({ 'Sál připraven': 7200, 'Chirurgický výkon': 3600, 'Úklid': 1200 });
  assert.deepEqual(result.map(r => [r.label, r.percent, r.duration]), [
    ['Chirurgický výkon', 75, 60], ['Úklid', 25, 20],
  ]);
});

test('only ready history has no cycle; spelling normalization does not remove actual preparation', () => {
  assert.deepEqual(rings({ 'Sál připraven': 3600 }), []);
  const result = rings({ '  SÁL   PŘIPRAVEN ': 7200, 'Příprava sálu': 600, 'Úklid': 600 });
  assert.deepEqual(result.map(r => [r.label, r.percent]), [['Příprava sálu', 50], ['Úklid', 50]]);
});
