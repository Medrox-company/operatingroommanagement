import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

process.env.TZ = 'Europe/Prague';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
}
const samplingModule = { exports: {} };
runInNewContext(compile('../../lib/timeline-sampling.ts'), { exports: samplingModule.exports, module: samplingModule });
const sampling = samplingModule.exports;
const compiled = {
  forecast: compile('../../components/timeline/CapacityForecast.tsx'),
  aro: compile('../../components/AroOvertimePopup.tsx'),
};

// Execute the real component/memo bodies with a deadline so the vulnerable
// version fails safely instead of allocating centuries of chart samples.
function render(kind, props) {
  const memos = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useEffect: () => {},
    useMemo: fn => { const value = fn(); memos.push(value); return value; },
  };
  const imports = {
    react,
    'framer-motion': { motion: new Proxy({}, { get: (_, key) => key }), AnimatePresence: 'presence' },
    'lucide-react': {},
    './constants': { C: {}, TIMELINE_START_HOUR: 7, TIMELINE_HOURS: 24 },
    './timeline/constants': { C: {} },
    '../../lib/timeline-sampling': sampling,
    '../lib/timeline-sampling': sampling,
  };
  const module = { exports: {} };
  runInNewContext(`${compiled[kind]}\nmodule.exports.default(props);`, {
    module, exports: module.exports, props,
    require: name => { assert.ok(name in imports, `Unexpected import ${name}`); return imports[name]; },
  }, { timeout: 200 });
  return memos;
}

const now = new Date('2026-10-21T10:00:00Z');
const room = extra => ({
  id: 'room-1', name: 'Sál 1', isLocked: false, currentStepIndex: 2,
  operationStartedAt: '2026-10-21T08:00:00Z', completedOperations: [], ...extra,
});
const forecast = (rooms, currentTime = now, isOpen = true) => render('forecast', { rooms, currentTime, isOpen, onClose() {} });
const aro = (overtimeRooms, isOpen = true) => render('aro', { overtimeRooms, currentTime: now, isOpen, roomsMap: new Map(), onClose() {} })[0];
const overtime = extra => ({
  roomId: 'room-1', roomName: 'Sál 1', workingEndTime: new Date('2026-10-21T09:00:00Z'),
  estimatedEndTime: new Date('2026-10-21T12:00:00Z'), overtimeMinutes: 180, enteredAt: 0, ...extra,
});

test('far-future estimate has bounded forecast samples and hourly markers', () => {
  for (const date of ['9999-12-31T23:59:59Z', '+275760-09-13T00:00:00.000Z']) {
    const input = room({ estimatedEndTime: date });
    const [model, , marks] = forecast([input]);
    assert.ok(model.samples.length > 0 && model.samples.length <= sampling.MAX_FORECAST_SAMPLES);
    assert.ok(marks.length <= sampling.MAX_FORECAST_MARKERS);
    assert.equal(model.freeing[0].at, Date.parse(date));
    assert.equal(input.estimatedEndTime, date);
  }
});

test('completed-operation endpoints cannot bypass the forecast budget', () => {
  const [model, , marks] = forecast([room({ currentStepIndex: 0, isLocked: true,
    completedOperations: [{ startedAt: '2026-10-21T08:00:00Z', endedAt: '9999-12-31T23:59:59Z' }],
  })]);
  assert.ok(model.samples.length <= sampling.MAX_FORECAST_SAMPLES);
  assert.ok(marks.length <= sampling.MAX_FORECAST_MARKERS);
});

test('coarse chart sampling never changes the live occupancy count', () => {
  const ordinary = room({ id: 'ordinary', estimatedEndTime: '2026-10-21T10:10:00Z' });
  const farFuture = room({ estimatedEndTime: '9999-12-31T23:59:59Z' });
  assert.equal(forecast([ordinary, farFuture])[0].currentLoad, 2);
  assert.equal(forecast([ordinary, room({ currentStepIndex: 0, completedOperations: [{
    startedAt: '2026-10-22T08:00:00Z', endedAt: '9999-12-31T23:59:59Z',
  }] })])[0].currentLoad, 1);
});

test('closed forecast and ARO panels never inspect their room inputs', () => {
  const forbidden = new Proxy([], { get() { throw new Error('Closed panel inspected rooms'); } });
  assert.deepEqual(Array.from(forecast(forbidden, now, false)[0].samples), []);
  assert.deepEqual(Array.from(aro(forbidden, false).markers), []);
});

test('ARO bounds far-future, ancient and invalid endpoints, including procedure fallback dates', () => {
  const fallback = new Date(now.getTime() + 1_000_000_000 * 60_000);
  for (const estimate of [new Date('9999-12-31T23:59:59Z'), new Date(8.64e15), fallback]) {
    const result = aro([overtime({ estimatedEndTime: estimate, workingEndTime: new Date(-8.64e15) })]);
    assert.ok(result.markers.length <= sampling.MAX_ARO_MARKERS);
    assert.ok(result.markers.every(mark => Number.isFinite(mark.t) && Number.isFinite(mark.p)));
  }
  const invalid = aro([overtime({ estimatedEndTime: new Date(NaN), workingEndTime: new Date(NaN) })]);
  assert.ok(Number.isFinite(invalid.tStart) && Number.isFinite(invalid.tEnd));
});

test('ordinary forecast keeps six-minute samples, two-hour markers and exact release times', () => {
  const end = '2026-10-21T13:00:00Z';
  const [model, , marks] = forecast([room({ estimatedEndTime: end })]);
  assert.equal(model.samples[1].t - model.samples[0].t, 6 * 60_000);
  assert.equal(marks[1].x - marks[0].x, (2 * 3600_000 / model.rangeMs) * 984);
  assert.equal(model.freeing[0].at, Date.parse(end));
  assert.equal(model.currentLoad, 1);
});

test('overnight and greater-than-24-hour operations retain exact dates and normal cadence', () => {
  const clock = new Date('2026-10-21T23:30:00+02:00');
  const end = '2026-10-23T01:00:00+02:00';
  const [model] = forecast([room({ operationStartedAt: '2026-10-21T00:00:00+02:00', estimatedEndTime: end })], clock);
  assert.equal(model.freeing[0].at, Date.parse(end));
  assert.equal(model.samples[1].t - model.samples[0].t, 6 * 60_000);
  const normal = aro([overtime()]);
  assert.equal(normal.markers[1].t - normal.markers[0].t, 30 * 60_000);
});

test('sampling rejects invalid/reversed ranges and enforces budgets across date representations', () => {
  const ticks = sampling.boundedTimelineTicks;
  for (const [start, end] of [[NaN, 10], [0, Infinity], [10, 0]]) assert.equal(ticks(start, end, 1, 25).length, 0);
  for (const budget of [0, 1, 1.5, Infinity, 482]) assert.equal(ticks(0, 100, 1, budget).length, 0);
  for (const end of [100, 1e12, 8.64e15]) {
    const result = ticks(-8.64e15, end, 30 * 60_000, 97);
    assert.ok(result.length > 0 && result.length <= 97);
    assert.ok(result.every(t => Number.isFinite(t) && t <= end));
  }
});
