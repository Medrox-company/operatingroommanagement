import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = readFileSync(new URL('../../components/SpeedDiagnosticsPanel.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'SpeedDiagnosticsPanel.tsx',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
});
const result = {
  appMs: 124, databaseMs: 8.2, serverMs: 9, downloadMbps: 42, jitterMs: 6,
  score: 93, measuredAt: '2026-10-03T18:00:00.000Z',
  appSamples: [122, 118, 132, 124], databaseSamples: [8, 9, 8, 7.8],
};

function setup({ state = ['idle', 0, null, null, null, null], hospitalId = 'test', request } = {}) {
  const values = [...state];
  let slot = 0;
  let clock = 0;
  let runTest;
  const module = { exports: {} };
  const dependencies = {
    react: { ...React,
      useState() { const index = slot++; return [values[index], value => { values[index] = value; }]; },
      useMemo: fn => fn(),
      useCallback: fn => { runTest = fn; return fn; },
    },
    'lucide-react': new Proxy({}, { get: () => () => React.createElement('svg', { 'aria-hidden': true }) }),
    './settings/settings-theme': { COLORS: { green: '#34D399', cyan: '#36D9EC', amber: '#FBBF24', red: '#FB7185', blue: '#38BDF8' } },
  };
  new Function('require', 'exports', 'module', 'window', 'fetch', 'performance', outputText)(
    name => { assert.ok(name in dependencies, name); return dependencies[name]; },
    module.exports, module,
    { setTimeout: (fn, ms) => setTimeout(fn, ms < 1000 ? 0 : ms), clearTimeout },
    request ?? (() => { throw new Error('Rendering must not start a network request'); }),
    { now: () => (clock += 25) },
  );
  const tree = module.exports.default({ hospitalName: 'Testovací zařízení', hospitalId });
  return { html: renderToStaticMarkup(tree), values, runTest };
}

test('idle diagnostics reuses Settings surfaces and primary control without an invented score or chart', () => {
  const { html } = setup();
  assert.match(html, /Rychlost aplikace a databáze/);
  assert.match(html, /system-settings-primary/);
  assert.match(html, /speed-diagnostics-surface/);
  assert.match(html, /Čeká na data/);
  assert.equal((html.match(/>—<\/span>/g) ?? []).length, 3);
  assert.doesNotMatch(html, /Celkové skóre|role="listitem"|role="progressbar"/);
  assert.doesNotMatch(source, /conic-gradient|radial-gradient|backgroundImage|boxShadow|Sparkles/);
});

test('running diagnostics exposes actual progress, live values and disables restarting', () => {
  const { html } = setup({ state: ['download', 77, null, 126, 8, null] });
  assert.match(html, /role="progressbar"[^>]+aria-valuenow="77"/);
  assert.match(html, /width:77%/);
  assert.match(html, /<button[^>]+disabled=""/);
  assert.match(html, /Probíhá měření/);
  assert.match(html, />126<\/span>/);
  assert.match(html, />8\.0<\/span>/);
});

test('completed diagnostics keeps score, quality, metrics, timestamp, recommendation and each sample once', () => {
  const { html } = setup({ state: ['done', 100, result, null, null, null] });
  assert.match(html, /Celkové skóre/);
  assert.match(html, />93<span/);
  assert.match(html, /VÝBORNÉ/);
  assert.match(html, />8\.2<\/span>/);
  assert.match(html, /Změřit znovu/);
  assert.match(html, /Poslední test/);
  assert.match(html, /Připojení je stabilní/);
  assert.equal((html.match(/role="listitem"/g) ?? []).length, 4);
  assert.match(html, /Měření 3: 132 ms/);
});

test('error stays readable and retry is available, but missing hospital and running state cannot launch a test', async () => {
  const { html } = setup({ state: ['error', 0, null, null, null, 'Spojení selhalo'] });
  assert.match(html, /role="alert"/);
  assert.match(html, /Spojení selhalo/);
  assert.doesNotMatch(html, /<button[^>]+disabled=/);
  const noHospital = setup({ hospitalId: null });
  assert.match(noHospital.html, /<button[^>]+disabled=""/);
  assert.match(noHospital.html, /nejprve vyberte zdravotnické zařízení/);
  await noHospital.runTest();
  assert.equal(noHospital.values[0], 'idle');
  const running = setup({ state: ['application', 4, null, null, null, null] });
  await running.runTest();
  assert.equal(running.values[0], 'application');
});

test('original probe/download workflow and calculations still complete using controlled responses only', async () => {
  const requests = [];
  const instance = setup({ request: async (url, options) => {
    requests.push({ url, options });
    if (url.includes('mode=probe')) return { ok: true, json: async () => ({ ok: true, databaseMs: 8, serverMs: 9 }) };
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(256 * 1024) };
  } });
  await instance.runTest();
  assert.equal(requests.filter(r => r.url.includes('mode=probe')).length, 4);
  assert.equal(requests.filter(r => r.url.includes('mode=download')).length, 2);
  assert.ok(requests.every(r => r.options.credentials === 'include' && r.options.cache === 'no-store'));
  assert.equal(instance.values[0], 'done');
  assert.equal(instance.values[1], 100);
  assert.equal(instance.values[2].appMs, 25);
  assert.equal(instance.values[2].databaseMs, 8);
  assert.equal(instance.values[2].serverMs, 9);
  assert.equal(instance.values[2].jitterMs, 0);
  assert.equal(instance.values[2].appSamples.length, 4);
});

test('failed and timed-out probes still produce the existing error states', async () => {
  const failure = setup({ request: async () => ({ ok: false, status: 503, json: async () => ({ error: 'Testovací chyba' }) }) });
  await failure.runTest();
  assert.equal(failure.values[0], 'error');
  assert.equal(failure.values[5], 'Testovací chyba');
  const timeout = setup({ request: async () => { throw new DOMException('Timeout', 'AbortError'); } });
  await timeout.runTest();
  assert.equal(timeout.values[0], 'error');
  assert.match(timeout.values[5], /12 sekund/);
});
