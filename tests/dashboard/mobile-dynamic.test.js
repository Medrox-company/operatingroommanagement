import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server';
import ts from 'typescript';

// Real React.lazy/Suspense rendering without a browser, data providers or network.
const source = readFileSync(new URL('../../mobile/next-dynamic.tsx', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'next-dynamic.tsx',
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
});

function loadAdapter(react = React) {
  const mod = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(dependency => {
    assert.equal(dependency, 'react', 'The adapter must stay independent of network and app state');
    return react;
  }, mod.exports, mod);
  return mod.exports.default;
}

async function renderLoaded(loader) {
  const Dynamic = loadAdapter()(loader);
  const stream = await renderToReadableStream(React.createElement(Dynamic, { label: 'PCHO sál č. 2' }));
  await stream.allReady;
  return new Response(stream).text();
}

const Panel = ({ label }) => React.createElement('section', { 'data-loaded': 'panel' }, label);

test('mobile dynamic renders a directly selected function export with its props', async () => {
  assert.match(await renderLoaded(async () => Panel), /<section data-loaded="panel">PCHO sál č. 2<\/section>/);
});

test('mobile dynamic renders an imported module with a default export', async () => {
  assert.match(await renderLoaded(async () => ({ default: Panel })), /<section data-loaded="panel">PCHO sál č. 2<\/section>/);
});

test('mobile dynamic renders a directly selected memo export such as RoomsTab', async () => {
  const MemoPanel = React.memo(Panel);
  assert.equal(typeof MemoPanel, 'object', 'Regression requires a real React memo object');
  assert.match(await renderLoaded(async () => MemoPanel), /<section data-loaded="panel">PCHO sál č. 2<\/section>/);
});

test('mobile dynamic renders a directly selected forwardRef export', async () => {
  const ForwardPanel = React.forwardRef(({ label }, ref) => React.createElement('section', { ref, 'data-loaded': 'ref' }, label));
  assert.equal(typeof ForwardPanel, 'object');
  assert.match(await renderLoaded(async () => ForwardPanel), /<section data-loaded="ref">PCHO sál č. 2<\/section>/);
});

test('mobile dynamic also accepts a module whose default component is memoized', async () => {
  assert.match(await renderLoaded(async () => ({ default: React.memo(Panel) })), /<section data-loaded="panel">PCHO sál č. 2<\/section>/);
});

test('mobile dynamic preserves module identity and wraps direct component objects', async () => {
  for (const loaded of [Panel, { default: Panel }, React.memo(Panel), React.forwardRef(() => null)]) {
    let resolveModule;
    const dynamic = loadAdapter({ ...React, lazy: resolver => { resolveModule = resolver; return Panel; } });
    dynamic(async () => loaded);
    const resolved = await resolveModule();
    if (typeof loaded === 'object' && 'default' in loaded) assert.equal(resolved, loaded);
    else assert.equal(resolved.default, loaded);
  }
});

test('mobile dynamic retains the supplied loading component and Suspense child props', () => {
  const Loading = () => React.createElement('span', null, 'Načítání');
  const Dynamic = loadAdapter()(async () => React.memo(Panel), { loading: Loading, ssr: false });
  const tree = Dynamic({ label: 'Sál č. 3' });
  assert.equal(tree.type, React.Suspense);
  assert.equal(tree.props.fallback.type, Loading);
  assert.equal(tree.props.children.props.label, 'Sál č. 3');
  const DefaultFallback = loadAdapter()(async () => Panel);
  assert.equal(DefaultFallback({ label: 'Sál č. 1' }).props.fallback, null);
});
