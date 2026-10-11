import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
function load(path, imports = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    if (Object.hasOwn(imports, name)) return imports[name];
    if (name.endsWith('.css')) return {};
    return require(name);
  }, module, module.exports);
  return module.exports;
}

const display = load('components/acute/display.ts');
const cycles = load('lib/acute-module-cycles.ts', { './acute-requests': load('lib/acute-requests.ts') });
const projection = load('lib/acute-circular-timeline.ts', {
  '../components/acute/display': display,
  './acute-module-cycles': cycles,
});
const Timeline = load('components/acute/AcuteCircularTimeline.tsx', { './display': display }).default;
const css = postcss.parse(read('components/acute/acute-circular-timeline.css'));
const NOW = Date.parse('2026-10-09T12:00:00Z');
const request = (id, changes = {}) => ({
  id, hospitalId: 'qa-hospital', procedureName: `Mutable request ${id}`, department: 'QA', description: '', reference: '',
  urgency: 'urgent', estimatedDurationMinutes: 120, receivedAt: '2026-10-09T11:15:00Z', queuePosition: 2,
  submissionPosition: 7, proposedRoomId: 'proposed-room', status: 'pending', updatedAt: '2026-10-09T11:30:00Z', ...changes,
});
const link = (requestId, changes = {}) => ({
  requestId, hospitalId: 'qa-hospital', roomId: 'actual-room', operationStartedAt: '2026-10-09T10:00:00Z',
  startedAt: '2026-10-09T10:00:00.001Z', startEventId: `actual-start-${requestId}`, endedAt: '2026-10-09T11:00:30.001Z',
  endEventId: `actual-end-${requestId}`, procedureName: `Frozen procedure ${requestId}`, urgency: 'emergent', submissionPosition: 23,
  ...changes,
});
const roomNames = new Map([['actual-room', 'SKUTEČNÝ ÚČOCH / OČNÍ SÁL'], ['proposed-room', 'NÁVRHOVÝ SÁL']]);
const nodesFor = (requests = [], links = [], now = NOW) => projection.projectAcuteCircularTimeline(
  cycles.partitionAcuteModuleRequests(requests, links, cycles.acuteModuleCycleWindow(NOW)), requests, now,
);
const propsFor = (nodes, changes = {}) => ({
  nodes, roomNames, periodText: 'Posledních 30 kalendářních dní',
  onOpenRequest() { assert.fail('Rendering must not open or mutate a request'); },
  onOpenCycle() { assert.fail('Rendering must not open or mutate a cycle'); },
  ...changes,
});
const render = (nodes, changes) => renderToStaticMarkup(React.createElement(Timeline, propsFor(nodes, changes)));
const renderedNodes = html => [...html.matchAll(/<li[^>]*class="acute-time-node"[^>]*>[\s\S]*?<\/li>/g)].map(match => match[0]);
const renderedTrack = (html, className) => html.match(new RegExp(`<ol[^>]*class="${className}"[^>]*>[\\s\\S]*?<\\/ol>`))?.[0];
const center = html => html.match(/<span class="acute-time-center"[^>]*>([\s\S]*?)<\/span><\/button>/)?.[1];
const declarations = (selector, media = null) => {
  const result = {};
  css.walkRules(rule => {
    if (rule.selector !== selector) return;
    const ruleMedia = rule.parent.type === 'atrule' ? rule.parent.params : null;
    if (ruleMedia !== media) return;
    rule.walkDecls(decl => { result[decl.prop] = decl.value; });
  });
  assert.ok(Object.keys(result).length, `Missing style: ${selector} in ${media ?? 'base'}`);
  return result;
};
function collectElements(element, predicate, result = []) {
  if (!React.isValidElement(element)) return result;
  if (predicate(element)) result.push(element);
  React.Children.forEach(element.props.children, child => collectElements(child, predicate, result));
  return result;
}

test('waiting minutes are inside a transparent static circle with explicit urgency and accessible waiting text', () => {
  const html = render(nodesFor([request('waiting')]));
  const [node] = renderedNodes(html);
  assert.match(node, /data-state="waiting"/);
  assert.match(center(node), /<strong>45<\/strong><span>min čekání/);
  assert.match(node, /aria-label="Otevřít Mutable request waiting · Čeká na výkon · Čekání 45 min · NÁVRHOVÝ SÁL · Urgentní"/);
  assert.match(node, /<svg[^>]*class="acute-time-rings"[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.equal((node.match(/class="acute-time-ring-/g) ?? []).length, 3);
  assert.match(node, /Odhad výkonu <strong>120 min<\/strong>/);
  assert.match(node, /Návrh — nepotvrzeno/);
  assert.equal(declarations('.acute-time-orb').background, 'transparent');
  assert.equal(declarations('.acute-time-orb::before').background, 'transparent');
  assert.equal(declarations('.acute-time-rings').fill, 'none');
});

test('performed state uses a check and frozen identity, actual room and valid recorded zero whole-cycle minutes', () => {
  const evidence = link('short', { endedAt: '2026-10-09T10:00:09.001Z' });
  const html = render(nodesFor([request('short', {
    procedureName: 'Renamed request', urgency: 'expedited', proposedRoomId: 'proposed-room', submissionPosition: 1,
    receivedAt: '2026-10-09T09:00:00Z', estimatedDurationMinutes: 120,
  })], [evidence]));
  const [node] = renderedNodes(html);
  assert.match(node, /data-state="performed"/);
  assert.match(center(node), /lucide-check/);
  assert.match(center(node), /Provedeno/);
  assert.match(node, /<h3>Frozen procedure short<\/h3>/);
  assert.match(node, /SKUTEČNÝ ÚČOCH \/ OČNÍ SÁL/);
  assert.match(node, /Emergentní/);
  assert.match(node, /Původní zápis #23/);
  assert.match(node, /Čekání do zahájení cyklu <strong>60 min<\/strong>/);
  assert.match(node, /Celý cyklus <strong>0 min<\/strong>/);
  assert.doesNotMatch(node, /Renamed request|NÁVRHOVÝ SÁL|Časný|#1<|min čekání|Odhad výkonu|120 min/);
});

test('begun state stops live waiting and never renders a performed check or projected whole-cycle duration', () => {
  const begun = link('begun', { endedAt: null, endEventId: null });
  const [node] = renderedNodes(render(nodesFor([request('begun', { receivedAt: '2026-10-09T09:00:00Z' })], [begun])));
  assert.match(node, /data-state="begun"/);
  assert.match(center(node), /lucide-clock/);
  assert.match(center(node), /Cyklus zahájen/);
  assert.match(node, /Čekání do zahájení cyklu <strong>60 min<\/strong>/);
  assert.doesNotMatch(node, /Provedeno|lucide-check|Celý cyklus|min čekání|Odhad výkonu|120 min/);
});

test('missing waiting time stays an honest dash and absent historical receipt never becomes a fabricated zero', () => {
  const [waiting] = renderedNodes(render(nodesFor([request('unknown-wait')], [], NaN)));
  assert.match(center(waiting), /<strong>—<\/strong><span>min čekání/);
  assert.match(waiting, /Čas čekání není dostupný/);
  assert.doesNotMatch(waiting, /NaN|Invalid Date|Čekání 0 min/);
  const [historical] = renderedNodes(render(nodesFor([], [link('missing-request')])));
  assert.match(historical, /Frozen procedure missing-request/);
  assert.match(historical, /Celý cyklus <strong>61 min<\/strong>/);
  assert.doesNotMatch(historical, /Čekání do zahájení cyklu|Čekání 0 min|NaN|Invalid Date/);
});

test('long names, unassigned requests and large waiting numbers remain complete without guessed room identities', () => {
  const procedureName = 'Velmi dlouhý název komplexního akutního operačního výkonu bez zkracování';
  const actualName = 'DLOUHÝ KONFIGUROVANÝ NÁZEV ÚČOCH / OČNÍHO OPERAČNÍHO SÁLU';
  const names = new Map([['actual-room', actualName]]);
  const html = render(nodesFor([
    request('unassigned', { procedureName, proposedRoomId: null, receivedAt: '2025-10-09T11:15:00Z' }),
  ], [link('long-room')]), { roomNames: names });
  assert.ok(html.includes(`<h3>${procedureName}</h3>`));
  assert.ok(html.includes(actualName));
  assert.match(html, /Bez přiřazeného sálu/);
  assert.match(html, /data-long-number="true"/);
  assert.equal(declarations('.acute-time-copy h3')['overflow-wrap'], 'anywhere');
  assert.equal(declarations('.acute-time-room')['overflow-wrap'], 'anywhere');
  assert.ok(declarations(".acute-time-center[data-long-number='true'] > strong")['font-size']);
  const missing = render(nodesFor([], [link('removed-room', { roomId: 'removed-room' })]));
  assert.match(missing, /Sál není v aktuálním seznamu/);
  assert.doesNotMatch(missing, /Sál removed-room|Sál 1/);
});

test('chronological anchors stay truthful when performed nodes move below waiting and begun nodes', () => {
  const performed = link('done', { endedAt: '2026-10-09T10:20:00.001Z' });
  const begun = link('started', { endedAt: null, endEventId: null });
  const waiting = request('latest', { queuePosition: 1, proposedStartAt: '2026-10-09T07:00:00Z' });
  const html = render(nodesFor([waiting], [performed, begun]));
  const nodes = renderedNodes(html);
  assert.equal(nodes.length, 3);
  for (const [index, state, label, timestamp] of [
    [0, 'begun', 'Zahájeno', begun.startedAt],
    [1, 'waiting', 'Zadáno', waiting.receivedAt],
    [2, 'performed', 'Dokončeno', performed.endedAt],
  ]) {
    assert.ok(nodes[index].includes(`data-state="${state}"`));
    assert.ok(nodes[index].includes(`<span>${label}</span><time dateTime="${timestamp}">`));
  }
  assert.match(html, /<ol[^>]*aria-label="Čekající a zahájené výkony chronologicky podle zobrazeného času"/);
  assert.match(html, /<ol[^>]*aria-label="Provedené výkony chronologicky podle dokončení"/);
  assert.match(html, /Rozestupy jsou schematické, nikoli měřítkem času/);
  assert.match(html, /nikoli naléhavost nebo ručně upravené pořadí/);
  assert.doesNotMatch(html, /2026-10-09T07:00:00Z/);
});

test('performed procedures form a smaller bottom box list with chronology retained within both groups', () => {
  const nodes = nodesFor([
    request('waiting-early', { receivedAt: '2026-10-09T09:30:00Z' }),
    request('waiting-late', { receivedAt: '2026-10-09T11:30:00Z' }),
  ], [
    link('completed-late', { endedAt: '2026-10-09T11:15:00.001Z' }),
    link('completed-early', { endedAt: '2026-10-09T09:45:00.001Z', startedAt: '2026-10-09T09:00:00.001Z' }),
    link('begun-middle', { endedAt: null, endEventId: null }),
  ]);
  const originalOrder = nodes.map(node => node.id);
  const html = render(nodes);
  const main = renderedTrack(html, 'acute-time-track');
  const completed = renderedTrack(html, 'acute-time-completed-track');
  assert.ok(main, 'Waiting and begun procedures retain their main timeline');
  assert.ok(completed, 'Performed procedures receive a separate bottom box list');
  assert.match(html, /<section[^>]*aria-label="Provedené akutní výkony"/);
  assert.match(html, /<h3>Provedené výkony(?: <span>2<\/span>)?<\/h3>/);
  assert.ok(html.indexOf(main) < html.indexOf(completed), 'Completed boxes follow the main timeline');
  assert.deepEqual(renderedNodes(main).map(node => node.match(/<h3>(.*?)<\/h3>/)[1]), [
    'Mutable request waiting-early', 'Frozen procedure begun-middle', 'Mutable request waiting-late',
  ]);
  assert.deepEqual(renderedNodes(completed).map(node => node.match(/<h3>(.*?)<\/h3>/)[1]), [
    'Frozen procedure completed-early', 'Frozen procedure completed-late',
  ]);
  assert.doesNotMatch(main, /data-state="performed"|data-size="compact"/);
  for (const node of renderedNodes(completed)) {
    assert.match(node, /data-state="performed"/);
    assert.match(node, /data-size="compact"/);
  }
  assert.deepEqual(nodes.map(node => node.id), originalOrder, 'Presentation grouping cannot reorder the clinical projection');
});

test('completed-only timeline keeps a compact active-empty context and omits an empty completed section', () => {
  const completedOnly = render(nodesFor([], [link('completed-only')]));
  assert.match(completedOnly, /Žádné čekající ani zahájené výkony/);
  assert.doesNotMatch(completedOnly, /class="acute-time-empty"|Zatím bez výkonů na časové ose/);
  const completed = renderedTrack(completedOnly, 'acute-time-completed-track');
  assert.ok(completed, 'Completed-only timelines retain their bottom box list');
  assert.equal(renderedNodes(completed).length, 1);
  for (const html of [render([]), render(nodesFor([request('waiting-only')]))]) {
    assert.doesNotMatch(html, /aria-label="Provedené akutní výkony"|class="acute-time-completed-track"|<h3>Provedené výkony<\/h3>/);
  }
});

test('one native circle button routes waiting to request detail and every durable cycle to cycle detail without mutation', () => {
  const nodes = nodesFor([request('waiting')], [
    link('missing-from-archive'), link('begun', { endedAt: null, endEventId: null }),
  ]);
  const calls = [];
  const tree = Timeline(propsFor(nodes, {
    onOpenRequest: (id, button) => calls.push({ kind: 'request', id, button }),
    onOpenCycle: (cycle, button) => calls.push({ kind: 'cycle', cycle, button }),
  }));
  const buttons = collectElements(tree, element => element.type === 'button');
  const displayedNodes = [...nodes.filter(node => node.state !== 'performed'), ...nodes.filter(node => node.state === 'performed')];
  assert.equal(calls.length, 0, 'Rendering cannot invoke clinical callbacks');
  assert.equal(buttons.length, nodes.length);
  const fakeButton = { id: 'qa-circle-opener' };
  buttons.forEach((button, index) => {
    assert.equal(button.props.type, 'button');
    assert.equal(button.props.tabIndex, undefined, 'Native circles remain in keyboard tab order');
    button.props.onClick({ currentTarget: fakeButton });
    const call = calls[index];
    assert.equal(call.button, fakeButton, 'Detail receives the focus-restoration opener');
    if (displayedNodes[index].state === 'waiting') {
      assert.equal(call.kind, 'request');
      assert.equal(call.id, displayedNodes[index].requestId);
    } else {
      assert.equal(call.kind, 'cycle');
      assert.equal(call.cycle, displayedNodes[index].cycleLink);
      assert.ok(Object.isFrozen(call.cycle));
    }
  });
  assert.ok(calls.some(call => call.kind === 'cycle' && call.cycle.requestId === 'missing-from-archive'));
  assert.doesNotMatch(read('components/acute/AcuteCircularTimeline.tsx'), /controller\.execute|supabase|updateOperatingRoom|updateRoomStep|setEmergency/);
});

test('completed boxes stack in one full-width column without horizontal scrolling at any breakpoint', () => {
  const track = declarations('.acute-time-completed-track');
  assert.equal(track.display, 'grid');
  assert.equal(track['grid-auto-flow'], 'row');
  assert.equal(track['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(track['grid-auto-columns'], undefined, 'Completed boxes must not retain a fixed-width horizontal strip');
  css.walkRules(rule => {
    if (rule.selector !== '.acute-time-completed-track') return;
    rule.walkDecls(decl => {
      if (decl.prop === 'grid-auto-flow') assert.equal(decl.value, 'row', `Completed boxes must stay vertical in ${rule.parent.params ?? 'base'}`);
      if (decl.prop === 'grid-template-columns') assert.equal(decl.value, 'minmax(0, 1fr)');
      if (decl.prop === 'overflow' || decl.prop === 'overflow-x') assert.doesNotMatch(decl.value, /auto|scroll/);
      assert.notEqual(decl.prop, 'grid-auto-columns', 'A mobile rule must not restore horizontal card widths');
      assert.doesNotMatch(decl.prop, /^overscroll-behavior-x$|^scrollbar-/);
    });
  });
  const box = declarations('.acute-time-completed-track .acute-time-node');
  assert.match(box.border, /1px solid var\(--acute-border\)/);
  assert.match(box.background, /var\(--acute-/);
  assert.ok(Number.parseFloat(box['border-radius']) > 0, 'Completed procedures have a bounded box surface');
  assert.equal(declarations('.acute-time-completed-track .acute-time-node::before').display, 'none');
  const active = declarations('.acute-time-track');
  assert.equal(active['grid-auto-flow'], 'column', 'The active desktop timeline retains its existing layout');
  assert.equal(active['overflow-x'], 'auto');
  const activeMobile = declarations('.acute-time-track', '(max-width: 767px)');
  assert.equal(activeMobile['grid-auto-flow'], 'row');
  assert.equal(activeMobile['grid-template-columns'], 'minmax(0, 1fr)');
});

test('completed boxes keep small accessible circles, full names and all recorded cycle metadata on mobile', () => {
  const procedureName = 'Dlouhý dokončený akutní výkon s plným názvem pro identifikaci ve spodním boxu';
  const roomName = 'DLOUHÝ KONFIGUROVANÝ NÁZEV SKUTEČNÉHO OČNÍHO OPERAČNÍHO SÁLU';
  const evidence = link('completed-long', { procedureName });
  const html = render(nodesFor([request('completed-long', { receivedAt: '2026-10-09T09:00:00Z' })], [evidence]), {
    roomNames: new Map([['actual-room', roomName]]),
  });
  const completedTrack = renderedTrack(html, 'acute-time-completed-track');
  assert.ok(completedTrack, 'Completed procedures use their own box list');
  const [completed] = renderedNodes(completedTrack);
  assert.ok(completed.includes(`<h3>${procedureName}</h3>`));
  assert.ok(completed.includes(roomName));
  assert.ok(completed.includes(`aria-label="Otevřít ${procedureName} · Provedeno · ${roomName} · Emergentní"`));
  assert.match(completed, /Původní zápis #23/);
  assert.match(completed, /Čekání do zahájení cyklu <strong>60 min<\/strong>/);
  assert.match(completed, /Celý cyklus <strong>61 min<\/strong>/);
  assert.ok(completed.includes(`<span>Dokončeno</span><time dateTime="${evidence.endedAt}">`));
  assert.equal((completed.match(/<button\b/g) ?? []).length, 1, 'Each completed box retains one native detail opener');
  assert.match(center(completed), /lucide-check/);
  for (const media of [null, '(max-width: 767px)']) {
    const orb = declarations('.acute-time-completed-track .acute-time-orb', media);
    assert.equal(orb.width, '76px');
    assert.equal(orb.height, '76px');
  }
  assert.equal(declarations('.acute-time-copy h3')['overflow-wrap'], 'anywhere');
  assert.equal(declarations('.acute-time-room')['overflow-wrap'], 'anywhere');
});

test('timeline never exposes progress percentages, advances a clinical phase or animates a waiting ring', () => {
  const html = render(nodesFor([request('waiting')], [link('performed')]));
  assert.doesNotMatch(html, /role="progressbar"|aria-valuenow|aria-valuemin|aria-valuemax|\d+%|stroke-dashoffset|aria-live/);
  assert.doesNotMatch(read('components/acute/AcuteCircularTimeline.tsx'), /setInterval|requestAnimationFrame|strokeDashoffset|progressbar/);
  css.walkDecls(decl => assert.doesNotMatch(decl.prop, /^animation(?:-|$)|^stroke-dashoffset$/));
  css.walkAtRules(rule => assert.notEqual(rule.name, 'keyframes'));
  const reducedMotion = declarations('.acute-time-orb::before', '(prefers-reduced-motion: reduce)');
  assert.equal(reducedMotion.transition, 'none');
});

test('circle keyboard focus and responsive layout inherit the established clinical theme tokens', () => {
  const orb = declarations('.acute-time-orb');
  assert.ok(Number.parseInt(orb['min-height'], 10) >= 44);
  assert.match(declarations('.acute-time-orb:focus-visible').outline, /2px solid var\(--color-primary\)/);
  assert.equal(declarations('.acute-time-orb:focus-visible')['outline-offset'], '4px');
  assert.equal(declarations('.acute-time-ring-main').stroke, 'var(--acute-urgency)');
  assert.equal(declarations('.acute-time-copy h3').color, 'var(--acute-text)');
  assert.equal(declarations('.acute-time-room').color, 'var(--acute-muted)');
  const mobile = declarations('.acute-time-track', '(max-width: 767px)');
  assert.equal(mobile['grid-auto-flow'], 'row');
  assert.equal(mobile['grid-template-columns'], 'minmax(0, 1fr)');
  assert.equal(declarations('.acute-time-orb', '(max-width: 767px)').width, '124px');
  css.walkDecls(decl => {
    if (decl.prop === 'color' || decl.prop === 'stroke') assert.match(decl.value, /var\(--acute-|currentColor/);
  });
});

test('empty state is explicit and old supplemental cycles retain their historical context', () => {
  assert.match(render([]), /Zatím bez výkonů na časové ose/);
  assert.equal((render([]).match(/<button\b/g) ?? []).length, 0);
  const oldCycle = link('old-active', { startedAt: '2026-01-02T09:00:00Z', endedAt: '2026-01-02T10:00:00Z' });
  const html = render(nodesFor([request('old-active')], [oldCycle]));
  assert.match(html, /Starší cyklus mimo vybrané období/);
  assert.match(html, /data-state="performed"/);
  assert.doesNotMatch(html, /data-state="waiting"/);
});

test('requests without a valid timestamp remain explicitly available without a fabricated timeline position', () => {
  const html = render([], { unplacedCount: 2 });
  assert.match(html, /role="note"/);
  assert.match(html, /Počet požadavků bez platného času zadání: 2/);
  assert.match(html, /zůstávají dostupné v záložce Požadavky/);
  assert.match(html, /Požadavky nemají platný čas pro umístění na osu/);
  assert.equal(renderedNodes(html).length, 0);
  assert.doesNotMatch(html, /Nejsou evidovány čekající požadavky/);
  assert.match(render(nodesFor([], [link('short', { endedAt: '2026-10-09T10:00:09.001Z' })])), /0 min může znamenat cyklus kratší než 30 s/);
});
