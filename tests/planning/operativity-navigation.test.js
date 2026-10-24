import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/operativity-navigation.ts', import.meta.url), 'utf8');
const api = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(api);

test('host navigation has unique view IDs and accepts only known permission-aware sections', () => {
  const views = api.OPERATIVITY_NAVIGATION.flatMap(group => group.items.map(item => item.id));
  assert.equal(new Set(views).size, views.length);
  for (const view of views) assert.equal(api.isOperativityView(view), true);
  assert.deepEqual(api.operativityAllowedViews(['home', 'unknown', 'timeline', 'home', null, '__proto__', 'constructor']), ['home', 'timeline']);
  for (const invalid of [null, {}, 'home', 5]) assert.deepEqual(api.operativityAllowedViews(invalid), []);
});

test('frame height is finite, bounded and rounded without trusting malformed messages', () => {
  assert.equal(api.operativityFrameHeight(800.2), 801);
  assert.equal(api.operativityFrameHeight(20), 240);
  assert.equal(api.operativityFrameHeight(500_000), 100_000);
  for (const invalid of [null, undefined, '800', 0, -1, NaN, Infinity, -Infinity]) assert.equal(api.operativityFrameHeight(invalid), null);
});
