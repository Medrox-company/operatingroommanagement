import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}
const acute = load('lib/acute-requests.ts');
const constants = load('components/timeline/constants.ts');
const names = ['ribbon', 'mobile', 'selected', 'eyebrow', 'statusDot', 'submission', 'procedure', 'metadata', 'urgency', 'separator', 'selectedRoom', 'orderWarning', 'warningIcon', 'queue', 'queueHeading', 'count', 'queueNote', 'empty', 'scroll', 'list', 'item', 'node', 'selectable', 'nodeHeading', 'nodeUrgency', 'arrow', 'nodeProcedure', 'nodeRoom', 'nodeBottom', 'nodeEstimate', 'selectedNode', 'selectedMarker'];
const ribbonDependencies = {
  react: React, '../../lib/acute-requests': acute, '../timeline/constants': constants,
  './acute-room-queue-ribbon.module.css': { __esModule: true, default: Object.fromEntries(names.map(name => [name, name])) },
};
const component = load('components/room/AcuteRoomQueueRibbon.tsx', ribbonDependencies);
const request = (overrides = {}) => ({
  id: 'one', hospitalId: 'hospital-1', procedureName: 'Výkon z databáze', department: 'Chirurgie', description: '', reference: '',
  urgency: 'urgent', status: 'pending', queuePosition: 1, submissionPosition: 4, estimatedDurationMinutes: 60,
  proposedRoomId: 'real-room-1', proposedStartAt: null, receivedAt: '2026-10-08T09:00:00Z', ...overrides,
});
const rooms = [{ id: 'real-room-1', name: 'TRAUMATOLOGIE - 1' }, { id: 'real-room-2', name: 'Skutečný nakonfigurovaný sál' }];
const render = (props = {}) => renderToStaticMarkup(React.createElement(component.AcuteRoomQueueRibbon, {
  selectedRequest: request(), followingRequests: [], rooms, ...props,
}));

test('selected request is a selection, not an invented running cycle or scheduled time', () => {
  const html = render();
  assert.match(html, /Vybraný akutní výkon/);
  assert.match(html, /Výkon z databáze/);
  assert.match(html, /Urgentní/);
  assert.match(html, /Odhad 60 min/);
  assert.match(html, /TRAUMATOLOGIE - 1/);
  assert.match(html, /Pořadí při zápisu 4/);
  assert.match(html, />#4</);
  assert.doesNotMatch(html, /[Pp]robíhá|[Ss]puštěn|[Rr]ezervace|09:00|10:00/);
  assert.equal(component.default, component.AcuteRoomQueueRibbon);
});

test('only a persisted cycle link makes the ribbon say running or completed', () => {
  assert.match(render({ cycleLink: { endedAt: null } }), /Probíhající akutní cyklus/);
  assert.match(render({ cycleLink: { endedAt: '2026-10-08T12:00:00Z' } }), /Dokončený akutní cyklus/);
  assert.doesNotMatch(render(), /Probíhající akutní cyklus|Dokončený akutní cyklus/);
});

test('an unrelated running cycle is explicitly distinguished from the selected next request', () => {
  const html = render({ rooms: [{ ...rooms[0], currentStepIndex: 3 }] });
  assert.match(html, /Vybráno pro další cyklus/);
  assert.match(html, /Přiřazení při dalším příjezdu pacienta/);
  assert.doesNotMatch(html, /Probíhající akutní cyklus/);
});

test('following requests show exact actual room names and current rank, not submission number as rank', () => {
  const html = render({ followingRequests: [request({ id: 'two', queuePosition: 8, submissionPosition: 2, proposedRoomId: 'real-room-2', procedureName: 'Další výkon' })] });
  assert.match(html, /Následující požadavky/);
  assert.match(html, /Počet následujících požadavků 1/);
  assert.match(html, /Pořadí 8/);
  assert.doesNotMatch(html, /Pořadí 2/);
  assert.match(html, /Skutečný nakonfigurovaný sál/);
  assert.match(html, /<ol class="list">/);
});

test('out-of-order selection stays in the actual queue, with preceding requests and an explicit warning', () => {
  const first = request({ id: 'first', procedureName: 'První čekající výkon', queuePosition: 2, submissionPosition: 20, proposedRoomId: 'real-room-2' });
  const selected = request({ id: 'selected', procedureName: 'Vybraný třetí výkon', queuePosition: 3, submissionPosition: 1 });
  const last = request({ id: 'last', procedureName: 'Další čtvrtý výkon', queuePosition: 4 });
  const html = render({ selectedRequest: selected, followingRequests: [first, selected, last], orderWarning: { selectedPosition: 3, firstRequest: first }, onSelectRequest: () => {} });
  assert.match(html, /Není dodrženo pořadí výkonů/);
  assert.match(html, /Vybrán požadavek na 3\. místě\./);
  assert.match(html, /První čeká \(pořadí 2\): První čekající výkon · Skutečný nakonfigurovaný sál\./);
  assert.match(html, /Pořadí při zápisu 1/);
  assert.match(html, /Počet následujících požadavků 3/);
  const queueHtml = html.slice(html.indexOf('<ol class="list">'));
  assert.ok(queueHtml.indexOf('data-request-id="first"') < queueHtml.indexOf('data-request-id="selected"'));
  assert.ok(queueHtml.indexOf('data-request-id="selected"') < queueHtml.indexOf('data-request-id="last"'));
  assert.match(queueHtml, /data-request-id="selected" data-selected="true"/);
  assert.match(queueHtml, /class="node selectedNode selectable"/);
  assert.match(queueHtml, /Vybráno · mimo pořadí/);
  assert.match(queueHtml, /aria-current="true"/);
  assert.match(queueHtml, /aria-describedby="[^"]+-order-warning"/);
  assert.equal((queueHtml.match(/data-selected="true"/g) ?? []).length, 1);
  assert.equal((queueHtml.match(/<button\b/g) ?? []).length, 3);
  assert.doesNotMatch(html, /Vybrán požadavek na 1\. místě/);
});

test('warning uses only the supplied current ranks; missing ranks are honest and mobile selection is visible', () => {
  const selected = request({ queuePosition: null, submissionPosition: 9 });
  const first = request({ id: 'first', queuePosition: null, procedureName: 'První požadavek' });
  const html = render({ mobile: true, selectedRequest: selected, followingRequests: [first, selected], orderWarning: { selectedPosition: null, firstRequest: first } });
  assert.match(html, /class="ribbon mobile"/);
  assert.match(html, /Aktuální pořadí vybraného požadavku není dostupné/);
  assert.match(html, /První čeká: První požadavek/);
  assert.match(html, /Pořadí při zápisu 9/);
  assert.match(html, /Vybráno · mimo pořadí/);
  assert.doesNotMatch(html, /pořadí 9|na 9\. místě|na 0\. místě/);
});

test('a persisted cycle never invents a historical order violation from an optional warning', () => {
  const props = { orderWarning: { selectedPosition: 3, firstRequest: request({ id: 'first' }) }, followingRequests: [request()] };
  for (const cycleLink of [{ endedAt: null }, { endedAt: '2026-10-08T12:00:00Z' }]) {
    const html = render({ ...props, cycleLink });
    assert.doesNotMatch(html, /Není dodrženo pořadí výkonů|Vybráno · mimo pořadí|aria-current|data-selected/);
  }
  assert.doesNotMatch(render(), /Není dodrženo pořadí výkonů/);
});

test('both production RoomDetail layouts receive the derived order warning without changing phase handlers', () => {
  const source = read('components/RoomDetail.tsx');
  assert.equal((source.match(/orderWarning=\{acuteContext\.orderWarning\}/g) ?? []).length, 2);
});

test('a long queue reveals the selected node locally without page scrolling or animated/timer jumps', () => {
  const source = read('components/room/AcuteRoomQueueRibbon.tsx');
  assert.match(source, /const orderSelectionKey = warning \? `\$\{selectedRequest\.id\}:\$\{currentPosition \?\? '-'\}:\$\{warning\.firstRequest\.id\}` : null/);
  assert.match(source, /\}, \[orderSelectionKey\]\)/);
  assert.match(source, /ref=\{scrollRef\}/);
  assert.match(source, /ref=\{selectedOutOfOrder \? selectedNodeRef : undefined\}/);
  assert.match(source, /scroll\.scrollTo\(\{ left: nextLeft, behavior: 'instant' \}\)/);
  assert.doesNotMatch(source, /scrollIntoView|window\.scroll|behavior: 'smooth'|setInterval|setTimeout/);
});

test('selected-node reveal scrolls only as far as necessary and has stable primitive dependencies', () => {
  const calls = [];
  const effects = [];
  const scroll = { scrollLeft: 0, clientWidth: 500, scrollTo: options => calls.push(options) };
  const item = { offsetLeft: 1500, offsetWidth: 256 };
  let refs;
  const harness = load('components/room/AcuteRoomQueueRibbon.tsx', {
    ...ribbonDependencies,
    react: { ...React, useId: () => 'test', useRef: () => refs.shift(), useEffect: (run, dependencies) => effects.push({ run, dependencies }) },
  });
  const selected = request({ id: 'late-selection', queuePosition: 7 });
  const first = request({ id: 'first', queuePosition: 1 });
  const props = { selectedRequest: selected, followingRequests: [first, selected], rooms, orderWarning: { selectedPosition: 7, firstRequest: first } };
  const run = inputs => {
    refs = [{ current: scroll }, { current: item }];
    harness.AcuteRoomQueueRibbon(inputs);
    effects.at(-1).run();
  };
  run(props);
  assert.deepEqual(calls.pop(), { left: 1258, behavior: 'instant' });
  scroll.scrollLeft = 1400;
  run({ ...props, selectedRequest: { ...selected }, orderWarning: { ...props.orderWarning, firstRequest: { ...first } } });
  assert.equal(calls.length, 0, 'Already-visible selection does not move the queue');
  assert.deepEqual(effects[0].dependencies, effects[1].dependencies, 'Same-data revalidation does not retrigger the effect');
  scroll.scrollLeft = 1800;
  run(props);
  assert.deepEqual(calls.pop(), { left: 1498, behavior: 'instant' });
  run({ ...props, orderWarning: undefined });
  assert.equal(calls.length, 0);
  assert.deepEqual(effects.at(-1).dependencies, [null]);
});

test('only an available actual room and callback produce a navigable button', () => {
  const inputs = [
    request({ id: 'two', queuePosition: 2 }),
    request({ id: 'three', proposedRoomId: null, queuePosition: 3 }),
    request({ id: 'four', proposedRoomId: 'removed-room', queuePosition: 4 }),
  ];
  const html = render({ followingRequests: inputs, onSelectRequest: () => {} });
  assert.equal((html.match(/<button\b/g) ?? []).length, 1);
  assert.match(html, /Sál nepřiřazen/);
  assert.match(html, /Sál není dostupný/);
  assert.match(html, /Otevřít detail sálu pro tento požadavek/);
  assert.doesNotMatch(render({ followingRequests: inputs }), /<button\b/);
});

test('clinical urgency palette is rose, green, blue independent of queue rank', () => {
  for (const [urgency, color] of [['emergent', constants.C.red], ['urgent', constants.C.green], ['expedited', constants.C.blue]]) {
    const html = render({ selectedRequest: request({ urgency, queuePosition: 99 }) });
    assert.ok(html.includes(`--ribbon-urgency:${color}`));
    assert.ok(html.includes(acute.ACUTE_URGENCY_LABELS[urgency]));
  }
});

test('no following requests means an honest quiet empty state, invalid numbers are not fabricated', () => {
  const html = render({ selectedRequest: request({ submissionPosition: NaN, estimatedDurationMinutes: 0 }), followingRequests: [request({ id: 'two', queuePosition: null })] });
  assert.doesNotMatch(html, /#NaN|#0/);
  assert.match(html, /Odhad není dostupný/);
  assert.match(html, /Pořadí není dostupné/);
  assert.match(render(), /Žádný další požadavek v pořadí/);
});

test('ribbon keeps gentle project surfaces, overflow access, minimum targets and reduced-motion', () => {
  const source = read('components/room/acute-room-queue-ribbon.module.css');
  const css = postcss.parse(source);
  const rule = selector => Object.fromEntries(css.nodes.find(node => node.type === 'rule' && node.selector === selector).nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.equal(rule('.ribbon')['grid-template-columns'], 'minmax(0, .35fr) minmax(0, .65fr)');
  assert.equal(rule('.node')['min-height'], '44px');
  assert.equal(rule('.scroll')['overflow-x'], 'auto');
  assert.match(source, /\.selectable:focus-visible/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /--ribbon-text: var\(--m-text-strong\)/);
  assert.match(source, /--ribbon-node: var\(--m-card\)/);
  assert.doesNotMatch(source, /animation:|text-overflow: ellipsis/);
  assert.match(render({ mobile: true }), /class="ribbon mobile"/);
});

test('ribbon is an open part of room detail, with the same neutral glass as its action controls', () => {
  const css = postcss.parse(read('components/room/acute-room-queue-ribbon.module.css'));
  const rule = selector => Object.fromEntries(css.nodes.find(node => node.type === 'rule' && node.selector === selector).nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.equal(rule('.ribbon').background, 'transparent');
  assert.equal(rule('.ribbon').border, '0');
  assert.equal(rule('.ribbon')['box-shadow'], 'none');
  assert.equal(rule('.ribbon').padding, '0');
  assert.equal(rule('.selected').background, 'transparent');
  assert.equal(rule('.node')['border-radius'], '16px');
  assert.equal(rule('.node').background, 'var(--ribbon-node)');
  assert.match(rule('.ribbon')['--ribbon-node'], /5%, transparent/);
  assert.equal(rule('.nodeProcedure')['font-size'], '15px');
  assert.equal(rule('.nodeRoom')['font-size'], '12px');
  assert.equal(rule('.nodeBottom')['flex-wrap'], 'wrap');
  assert.equal(rule('.nodeRoom')['min-width'], '0');
  assert.equal(rule('.orderWarning')['border-left'], '2px solid var(--color-warning)');
  assert.equal(rule('.orderWarning p')['overflow-wrap'], 'anywhere');
  assert.equal(rule('.selectedMarker')['font-size'], '11px');
  assert.match(rule('.selectedNode')['border-color'], /var\(--color-warning\)/);
  assert.equal(rule('.ribbon.mobile')['--ribbon-warning'], 'var(--m-text-strong)');
});
