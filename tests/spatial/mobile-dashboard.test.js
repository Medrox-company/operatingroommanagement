import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import ts from 'typescript';

const componentSource = readFileSync(new URL('../../components/spatial/SpatialDashboardView.tsx', import.meta.url), 'utf8');
const mobileCss = postcss.parse(readFileSync(new URL('../../components/spatial/mobile-spatial-dashboard.css', import.meta.url), 'utf8'));

// Render the existing presentation component without mounting a database client
// or WebGL viewer. Its real formatter functions are extracted alongside it.
function loadRoomDetailPanel() {
  const sourceFile = ts.createSourceFile('SpatialDashboardView.tsx', componentSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set(['formatClock', 'formatElapsed', 'staffCount', 'RoomDetailPanel']);
  const fragments = sourceFile.statements.filter((statement) => {
    if (ts.isFunctionDeclaration(statement)) return names.has(statement.name?.text);
    if (ts.isVariableStatement(statement)) return statement.declarationList.declarations.some((declaration) => names.has(declaration.name.getText(sourceFile)));
    return false;
  }).map((statement) => statement.getText(sourceFile));
  assert.equal(fragments.length, 4);
  const code = ts.transpileModule(`
    import React from 'react';
    import { ArrowRight, CalendarDays, Clock3, Timer, UsersRound, X } from 'lucide-react';
    ${fragments.join('\n')}
    export { RoomDetailPanel };
  `, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), module, module.exports);
  return module.exports.RoomDetailPanel;
}

const RoomDetailPanel = loadRoomDetailPanel();

test('all mobile spatial CSS stays behind the phone breakpoint', () => {
  mobileCss.walkRules((rule) => {
    let ancestor = rule.parent;
    while (ancestor && !(ancestor.type === 'atrule' && ancestor.name === 'media' && ancestor.params.includes('max-width: 767px'))) {
      ancestor = ancestor.parent;
    }
    assert.ok(ancestor, `${rule.selector} must not alter desktop presentation`);
  });
});

test('mobile presentation keeps two timing cards and hides only secondary dashboard information', () => {
  const displayNone = [];
  mobileCss.walkDecls('display', (declaration) => {
    if (declaration.value === 'none') displayNone.push(declaration.parent.selector);
  });
  const hiddenSelectors = displayNone.join('\n');
  assert.match(hiddenSelectors, /\.spatial-room-secondary-info/);
  assert.match(hiddenSelectors, /\.spatial-room-progress/);
  assert.match(hiddenSelectors, /\.spatial-summary-grid/);
  assert.doesNotMatch(hiddenSelectors, /\.spatial-room-timing(?:\s*,|\s*$)/m);
  assert.doesNotMatch(hiddenSelectors, /\.spatial-dashboard-canvas(?:\s*,|\s*$)/m);
});

test('the compact detail uses live selected-room values, including a paused phase', () => {
  const now = Date.parse('2026-09-15T12:00:00Z');
  const estimatedEnd = new Date(now + 25 * 60_000).toISOString();
  const element = React.createElement(RoomDetailPanel, {
    room: { name: 'Sál <3>', operationStartedAt: new Date(now - 95 * 60_000).toISOString(), phaseStartedAt: new Date(now - 10 * 60_000).toISOString(), estimatedEndTime: estimatedEnd, queueCount: 0 },
    phaseName: 'Pauza', phaseColor: '#22D3EE', progress: 50, now, onClose() {}, onOpen() {},
  });
  const html = renderToStaticMarkup(element);
  assert.match(html, /Sál &lt;3&gt;/);
  assert.match(html, /Pauza/);
  assert.match(html, /--spatial-phase-color:#22D3EE/);
  assert.match(html, /01:35/);
  assert.ok(html.includes(new Date(estimatedEnd).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })));
  assert.equal((html.match(/class="spatial-room-timing"/g) || []).length, 2);
  assert.equal((html.match(/class="spatial-room-secondary-info"/g) || []).length, 2, 'desktop still receives its team and next-operation cards');
});

test('detail close and open controls preserve their callbacks', () => {
  let opened = 0;
  let closed = 0;
  const tree = RoomDetailPanel({
    room: { name: 'Sál 1', queueCount: 0 }, phaseName: 'Připraven', phaseColor: '#2DD4BF', progress: 0,
    now: Date.now(), onOpen: () => opened++, onClose: () => closed++,
  });
  const buttons = [];
  const visit = (element) => {
    if (!React.isValidElement(element)) return;
    if (element.type === 'button') buttons.push(element);
    React.Children.forEach(element.props.children, visit);
  };
  visit(tree);
  buttons.find((button) => button.props.className === 'spatial-open-room').props.onClick();
  buttons.find((button) => button.props['aria-label'] === 'Zavřít detail vybraného sálu').props.onClick();
  assert.equal(opened, 1);
  assert.equal(closed, 1);
});
