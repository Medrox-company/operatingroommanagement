import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(path), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  new Function('require', 'exports', 'module', code)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const walk = (node, predicate) => Array.isArray(node) ? node.flatMap(child => walk(child, predicate))
  : React.isValidElement(node) ? [...(predicate(node) ? [node] : []), ...walk(node.props.children, predicate)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children)
  : typeof node === 'string' || typeof node === 'number' ? String(node) : '';

function calendarFixture(t) {
  const originalFetch = globalThis.fetch, originalWindow = globalThis.window;
  const ledger = [], effects = [], requests = [];
  let cursor = 0;
  const changed = (previous, deps) => !previous || !deps || deps.some((value, index) => value !== previous.deps[index]);
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      ledger[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [ledger[index].value, update => { ledger[index].value = typeof update === 'function' ? update(ledger[index].value) : update; }];
    },
    useRef(initial) { const index = cursor++; ledger[index] ??= { current: initial }; return ledger[index]; },
    useMemo(factory, deps) {
      const index = cursor++;
      if (changed(ledger[index], deps)) ledger[index] = { deps, value: factory() };
      return ledger[index].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useEffect(run, deps) {
      const index = cursor++, previous = ledger[index];
      if (changed(previous, deps)) {
        previous?.cleanup?.(); ledger[index] = { deps };
        effects.push(() => { ledger[index].cleanup = run(); });
      }
    },
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.fetch = (url, options) => new Promise(resolve => {
    requests.push({ url, options, resolve: body => resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })) });
  });
  t.after(() => {
    ledger.forEach(slot => slot?.cleanup?.());
    globalThis.fetch = originalFetch; globalThis.window = originalWindow;
  });
  const icons = new Proxy({}, { get: (_target, icon) => attributes => React.createElement('svg', { ...attributes, 'data-icon': icon }) });
  const Calendar = load('components/ScheduleCalendarManager.tsx', {
    react: hooks, 'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': icons,
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: 'hospital-a' }) },
    '../contexts/RealtimeContext': { useHospitalRealtime: () => {} },
    '../lib/room-specialty': load('lib/room-specialty.ts', {}),
    '../lib/czech-public-holidays': load('lib/czech-public-holidays.ts', {}),
    '../lib/operativity-planning-client': load('lib/operativity-planning-client.ts', {}),
    './ModulePageHeading': () => null,
  }).default;
  const render = () => {
    cursor = 0; const tree = Calendar({ rooms: [] }); effects.splice(0).forEach(run => run()); return tree;
  };
  return {
    requests, render,
    async flush() { await new Promise(resolve => setImmediate(resolve)); return render(); },
  };
}

const now = new Date();
const year = now.getFullYear();
const monthDate = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;
const blocks = (count, from = 0) => Array.from({ length: count }, (_, index) => ({
  id: `block-${from + index}`, operating_room_id: 'room-a', department_id: null,
  allocation_date: monthDate, day_part: index % 2 ? 'PM' : 'AM', allocation_kind: 'CLOSED',
}));
const assignedBlocks = tree => Number(text(tree).match(/Přiřazené bloky(\d+)bloků/)?.[1]);

test('annual schedule consumers read the year through the paginated planning client', () => {
  for (const path of ['components/ScheduleCalendarManager.tsx', 'components/statistics/FinanceTab.tsx']) {
    const source = read(path);
    assert.match(source, /import \{ loadOperativityPlanningYear \} from '(\.\.\/)+lib\/operativity-planning-client';/, path);
    assert.match(source, /loadOperativityPlanningYear\(year, controller\.signal\)/, path);
    // Přímé čtení endpointu by vrátilo jen první stránku po 1000 blocích.
    assert.doesNotMatch(source, /\/api\/room-specialty-allocations/, path);
  }
});

test('room calendar shows every page of the year, not only the first 1000 blocks', async t => {
  const app = calendarFixture(t);
  let tree = app.render();
  assert.deepEqual(app.requests.map(request => request.url), [`/api/room-specialty-allocations?year=${year}&offset=0`]);
  app.requests[0].resolve({ allocations: blocks(1000), departments: [], nextOffset: 1000 });
  tree = await app.flush();
  assert.equal(app.requests[1]?.url, `/api/room-specialty-allocations?year=${year}&offset=1000`);
  assert.equal(assignedBlocks(tree), 0, 'A first page alone is never shown as the complete plan');
  app.requests[1].resolve({ allocations: blocks(1, 1000), departments: [], nextOffset: null });
  tree = await app.flush();
  assert.equal(assignedBlocks(tree), 1001);
  assert.equal(walk(tree, node => node.props['aria-label'] === 'Obnovit kalendář')[0].props.disabled, false);
});

test('room calendar refresh cancels a stale load so its later pages cannot overwrite the plan', async t => {
  const app = calendarFixture(t);
  let tree = app.render();
  const stale = app.requests[0];
  app.requests.length = 0;
  walk(tree, node => node.props['aria-label'] === 'Obnovit kalendář')[0].props.onClick();
  assert.equal(stale.options.signal.aborted, true);
  app.requests[0].resolve({ allocations: blocks(1), departments: [], nextOffset: null });
  stale.resolve({ allocations: blocks(1000, 10), departments: [], nextOffset: 1000 });
  tree = await app.flush();
  assert.equal(app.requests.length, 1, 'The cancelled load requests no further page');
  assert.equal(assignedBlocks(tree), 1);
});

test('room calendar reports an incomplete year instead of showing a truncated plan', async t => {
  const app = calendarFixture(t);
  app.render();
  app.requests[0].resolve({ allocations: blocks(1000), departments: [] });
  const tree = await app.flush();
  assert.equal(assignedBlocks(tree), 0);
  assert.match(text(tree), /neposkytl úplný roční rozpis/);
});
