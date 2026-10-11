import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'exports', 'module', outputText)(name => {
    assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
    return imports[name];
  }, module.exports, module);
  return module.exports;
}
const model = load('lib/dashboard-carousel.ts', {});
const Placeholder = () => null;
const Carousel = () => null;
const props = {
  rooms: [{ id: 'real-room', name: 'Konfigurovaný sál' }], roomsLoaded: true,
  onSelectRoom: () => {}, onEmergency: () => {}, onLock: () => {},
};
function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...Object.values(node.props).flatMap(value => elements(value, predicate))];
}
function chosen(tree) {
  return elements(tree, element => element.type === 'button' && element.props['aria-pressed'] === true)
    .find(element => ['Karty', '3D dispozice', 'Carousel'].includes(element.props['aria-label']))?.props['aria-label'];
}

// Execute the actual client component with bounded hooks: render first, then
// flush only layout effects before its simulated paint. No provider/backend IO.
function harness(storage, initialHospital = 'hospital-a', initialPermission = true) {
  let hospital = initialHospital;
  let permission = initialPermission;
  let slots = [];
  let cursor = 0;
  let pending = [];
  let dirty = false;
  const gridEnabled = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const hooks = {
    ...React, memo: component => component,
    useState: initial => {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [slots[index].value, next => {
        const value = typeof next === 'function' ? next(slots[index].value) : next;
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true; }
      }];
    },
    useMemo: (factory, deps) => {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback: (callback, deps) => hooks.useMemo(() => callback, deps),
    useEffect: () => {},
    useLayoutEffect: (effect, deps) => {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) { slots[index] = { deps }; pending.push(effect); }
    },
  };
  const Dashboard = load('components/DashboardModule.tsx', {
    react: hooks, 'next/dynamic': () => Placeholder, 'lucide-react': require('lucide-react'),
    './LiveClock': Placeholder, './RoomCard': Placeholder, './mobile/MobileRoomOverview': Placeholder,
    './mobile/MobileShell': { MobileHeader: Placeholder }, './ModulePageHeading': Placeholder,
    '../contexts/HospitalContext': { useHospital: () => ({ activeHospitalId: hospital }) },
    '../contexts/AuthContext': { useAuth: () => ({ hasSubmoduleAccess: () => permission }) },
    '../hooks/useCurrentRoomSpecialties': { useCurrentRoomSpecialties: () => ({ currentByRoom: new Map() }) },
    '../hooks/useTimelineCompletedOperations': { useTimelineCompletedOperations: () => ({ completedOperationsByRoom: new Map() }) },
    '../lib/completed-operations': { mergeCompletedOperations: () => [] },
    '../hooks/useSpatialProject': { preloadSpatialProject: () => Promise.resolve() },
    './spatial/SpatialLoadingBar': Placeholder, './spatial/SpatialDashboardView': Placeholder,
    '../hooks/useDashboardGridLayout': { useDashboardGridLayout: (_, enabled) => { gridEnabled.push(enabled); return null; } },
    '../lib/dashboard-carousel': model, './dashboard/DashboardCarousel': Carousel,
    './tutorial/tutorial.css': {}, './dashboard/dashboard-card-polish.css': {},
  }).default;
  const render = () => { cursor = 0; pending = []; dirty = false; return Dashboard(props); };
  return {
    gridEnabled,
    render,
    paint: () => {
      let tree = render();
      for (let pass = 0; pass < 6; pass++) {
        for (const effect of pending) effect();
        if (!dirty) return tree;
        tree = render();
      }
      assert.fail('Layout restoration did not settle');
    },
    remount: () => { slots = []; return render(); },
    hospital: value => { hospital = value; },
    permission: value => { permission = value; },
    storage,
  };
}
function withStorage(values, run, failures = {}) {
  const previous = globalThis.window;
  const stored = new Map(Object.entries(values));
  const accesses = [];
  const storage = {
    getItem: key => { accesses.push(key); if (failures.read) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
    setItem: (key, value) => { if (failures.write) throw new Error('Storage blocked'); stored.set(key, value); },
  };
  try {
    globalThis.window = { localStorage: storage };
    run({ storage, stored, accesses });
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

test('saved carousel renders on the very first frame, including remount after another module/detail', () => {
  withStorage({ 'or-dashboard-view:hospital-a': 'carousel' }, ({ storage }) => {
    const app = harness(storage);
    for (const tree of [app.render(), app.remount(), app.remount()]) {
      assert.equal(chosen(tree), 'Carousel');
      assert.equal(elements(tree, element => element.type === Carousel).length, 1);
      assert.equal(elements(tree, element => element.props.className === 'dashboard-room-grid').length, 0);
    }
    assert.ok(app.gridEnabled.every(value => value === false));
  });
});
test('missing/invalid preference keeps original Cards, and spatial remains permission-gated on first frame', () => {
  for (const [saved, permission, expected] of [[null, true, 'Karty'], ['unknown', true, 'Karty'], ['cards', true, 'Karty'], ['spatial', false, 'Karty'], ['spatial', true, '3D dispozice'], ['carousel', false, 'Carousel']]) {
    withStorage(saved ? { 'or-dashboard-view:hospital-a': saved } : {}, ({ storage }) => {
      assert.equal(chosen(harness(storage, 'hospital-a', permission).render()), expected);
    });
  }
});
test('facility switch resolves its own preference before paint; neither selection overwrites the other', () => {
  withStorage({ 'or-dashboard-view:hospital-a': 'carousel', 'or-dashboard-view:hospital-b': 'cards' }, ({ storage, stored, accesses }) => {
    const app = harness(storage);
    assert.equal(chosen(app.paint()), 'Carousel');
    app.hospital('hospital-b');
    assert.equal(chosen(app.paint()), 'Karty');
    app.hospital('hospital-a');
    assert.equal(chosen(app.paint()), 'Carousel');
    app.hospital(null);
    assert.equal(chosen(app.paint()), 'Karty');
    assert.equal(stored.get('or-dashboard-view:hospital-a'), 'carousel');
    assert.equal(stored.get('or-dashboard-view:hospital-b'), 'cards');
    assert.ok(!accesses.includes('or-dashboard-view:null'));
  });
});
test('revoked spatial access falls back before paint without replacing the saved spatial preference', () => {
  withStorage({ 'or-dashboard-view:hospital-a': 'spatial' }, ({ storage, stored }) => {
    const app = harness(storage);
    assert.equal(chosen(app.render()), '3D dispozice');
    app.permission(false);
    assert.equal(chosen(app.paint()), 'Karty');
    assert.equal(stored.get('or-dashboard-view:hospital-a'), 'spatial');
  });
});
test('manual selection persists under the original facility key and restores on remount', () => {
  withStorage({}, ({ storage, stored }) => {
    const app = harness(storage);
    const button = elements(app.render(), element => element.type === 'button' && element.props['aria-label'] === 'Carousel')[0];
    button.props.onClick();
    assert.equal(stored.get('or-dashboard-view:hospital-a'), 'carousel');
    assert.equal(chosen(app.remount()), 'Carousel');
  });
});
test('blocked storage does not crash initial render or manual selection', () => {
  withStorage({}, ({ storage }) => {
    const app = harness(storage);
    assert.equal(chosen(app.paint()), 'Karty');
    const button = elements(app.render(), element => element.type === 'button' && element.props['aria-label'] === 'Carousel')[0];
    assert.doesNotThrow(() => button.props.onClick());
    assert.equal(chosen(app.render()), 'Carousel');
  }, { read: true, write: true });
});
test('non-browser render keeps a safe default without touching browser storage', () => {
  const previous = globalThis.window;
  try {
    delete globalThis.window;
    assert.equal(chosen(harness(null).render()), 'Karty');
    assert.match(read('App.tsx'), /DashboardModule = dynamic\([^\n]+ssr: false/);
  } finally {
    if (previous !== undefined) globalThis.window = previous;
  }
});
