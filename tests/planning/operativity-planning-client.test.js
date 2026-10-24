import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/operativity-planning-client.ts', import.meta.url), 'utf8');
const exports = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);
const { loadOperativityPlanningYear: load } = exports;
const response = body => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

test('annual import follows all pages and never writes to the source API', async () => {
  const calls = [];
  const departments = [{ id: 'spec-1', name: 'Chirurgie' }];
  const result = await load(2026, new AbortController().signal, async (url, options) => {
    calls.push(url);
    assert.equal(options.method, undefined);
    assert.equal(options.cache, 'no-store');
    return response({ departments, allocations: calls.length === 1 ? Array.from({ length: 1000 }, (_, id) => ({ id })) : [{ id: 1000 }], nextOffset: calls.length === 1 ? 1000 : null });
  });
  assert.equal(result.allocations.length, 1001);
  assert.deepEqual(result.departments, departments);
  assert.deepEqual(calls, ['/api/room-specialty-allocations?year=2026&offset=0', '/api/room-specialty-allocations?year=2026&offset=1000']);
});

test('failed, incomplete or looping pages never become a plausible empty or truncated plan', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(load(2026, signal, async () => new Response('{"error":"Přístup odepřen"}', { status: 403 })), /Přístup odepřen/);
  await assert.rejects(load(2026, signal, async () => response({ departments: [], allocations: Array(1000).fill({}) })), /úplný roční rozpis/);
  await assert.rejects(load(2026, signal, async () => response({ departments: [], allocations: [], nextOffset: 0 })), /úplný roční rozpis/);
  await assert.rejects(load(2026, signal, async () => response({ allocations: [] })), /neplatné podklady/);
});

test('aborted hospital or year loads stop before another request is issued', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(load(2026, controller.signal, async () => {
    calls++;
    controller.abort();
    return response({ departments: [], allocations: [{}], nextOffset: 1000 });
  }), { name: 'AbortError' });
  assert.equal(calls, 1);
});
