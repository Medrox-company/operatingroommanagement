import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import postcss from 'postcss';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const parse = path => ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const timeline = parse('components/TimelineModule.tsx');
const app = parse('App.tsx');

function findAll(source, predicate) {
  const result = [];
  function visit(node) {
    if (predicate(node)) result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

function find(source, predicate, description) {
  const result = findAll(source, predicate)[0];
  assert.ok(result, description);
  return result;
}

function evaluate(expression, dependencies = {}) {
  const module = { exports: null };
  const { outputText } = ts.transpileModule(`module.exports = (${expression});`, {
    fileName: 'timeline-test.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  });
  new Function('module', 'React', ...Object.keys(dependencies), outputText)(module, React, ...Object.values(dependencies));
  return module.exports;
}

function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
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
const icon = () => React.createElement('span');
const proposals = load('components/timeline/AcuteProposalLane.tsx', {
  react: React, 'lucide-react': { AlertTriangle: icon, Siren: icon },
  '../../lib/acute-requests': acute, './constants': constants, './acute-proposal-lane.css': {},
});
const { AcuteTimelineStatusTile } = proposals;

function attribute(node, name) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  return opening.attributes.properties.find(value => ts.isJsxAttribute(value) && value.name.getText() === name)?.initializer;
}

function className(node) {
  const value = attribute(node, 'className');
  return value && ts.isStringLiteral(value) ? value.text : '';
}

const tileUses = findAll(timeline, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(timeline) === 'AcuteTimelineStatusTile');
assert.equal(tileUses.length, 1, 'The desktop toolbar has one acute status tile');
let statusGroup = tileUses[0].parent;
while (statusGroup && !(ts.isJsxElement(statusGroup) && className(statusGroup).split(/\s+/).includes('timeline-status-group'))) {
  statusGroup = statusGroup.parent;
}
assert.ok(statusGroup, 'The acute tile belongs to the desktop ARO status group');

const motionElement = tag => ({ children, animate, transition, initial, ...props }) => React.createElement(tag, props, children);
const headerDependencies = (overrides = {}) => ({
  aroOvertimeRooms: [], setShowAroPopup: () => assert.fail('Opening acute requests must not open the ARO popup'),
  acuteEnabled: true, acuteRequests: [{ id: 'first' }, { id: 'second' }], unassignedAcuteCount: 1,
  acute: { error: null, loading: false }, onOpenAcuteRequests: () => {},
  motion: { button: motionElement('button'), div: motionElement('div') },
  AlertTriangle: icon, CheckCircle: icon, C: constants.C, AcuteTimelineStatusTile,
  ...overrides,
});
const renderStatusGroup = overrides => evaluate(statusGroup.getText(timeline), headerDependencies(overrides));
const elementChildren = tree => React.Children.toArray(tree.props.children).filter(React.isValidElement);
const initializer = name => find(timeline, node => ts.isVariableDeclaration(node) && node.name.getText(timeline) === name, name).initializer.getText(timeline);

test('desktop acute status sits immediately beside ARO in both normal and overtime states without a separate summary strip', () => {
  const desktop = find(timeline, node => ts.isJsxElement(node) && className(node).includes('app-module-content'), 'Desktop Timeline');
  assert.equal(findAll(desktop, node => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
    && node.tagName.getText(timeline) === 'AcuteTimelineSummary').length, 0);
  for (const aroOvertimeRooms of [[], [{ id: 'overtime' }]]) {
    const tree = renderStatusGroup({ aroOvertimeRooms });
    const [aro, tile, ...extra] = elementChildren(tree);
    assert.ok(aro);
    assert.equal(tile.type, AcuteTimelineStatusTile);
    assert.deepEqual(extra, [], 'No other control separates ARO and acute requests');
    assert.ok(aro.props.className.split(/\s+/).includes('timeline-status-tile'));
    const nativeTile = AcuteTimelineStatusTile(tile.props);
    assert.ok(nativeTile.props.className.split(/\s+/).includes('timeline-status-tile'), 'Both status tiles share their dimensions');
    assert.equal(tile.props.count, 2);
    assert.equal(tile.props.unassignedCount, 1);
    const html = renderToStaticMarkup(tree);
    assert.ok(html.indexOf(aroOvertimeRooms.length ? 'ARO PŘESAH' : 'ARO STATUS') < html.indexOf('Akutní požadavky'));
    assert.doesNotMatch(html, /acute-timeline-summary|Bloky odhadu[^<]*<\/small>|Otevřít <span/);
  }
});

test('compact acute status preserves the true count and unassigned information for assistive technology', () => {
  for (const [count, visible] of [[0, '0 čekajících'], [1, '1 čekající'], [2, '2 čekající'], [4, '4 čekající'], [5, '5 čekajících']]) {
    const tile = AcuteTimelineStatusTile({ count, unassignedCount: 2, onOpen: () => {} });
    const html = renderToStaticMarkup(tile);
    assert.match(html, /Akutní požadavky/);
    assert.ok(html.includes(visible), visible);
    assert.ok(tile.props['aria-label'].includes(visible));
    assert.match(tile.props['aria-label'], /bez přiřazeného sálu 2/);
    assert.match(tile.props.title, /rezervací sálu/);
  }
});

test('ARO and acute tiles share equal desktop dimensions and remain together on narrower desktop widths', () => {
  const css = postcss.parse(read('components/timeline/acute-proposal-lane.css'));
  const declarations = selector => {
    const rule = css.nodes.find(node => node.type === 'rule' && node.selector === selector);
    assert.ok(rule, selector);
    return Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  };
  const group = declarations('.timeline-status-group:has(.timeline-acute-control)');
  assert.equal(group.display, 'grid');
  assert.equal(group['grid-template-columns'], 'repeat(2, minmax(0, 1fr))');
  const tile = declarations('.timeline-status-group:has(.timeline-acute-control) > .timeline-status-tile');
  assert.equal(tile.width, '100%');
  assert.equal(tile.height, '48px');
  const narrowDesktop = css.nodes.find(node => node.type === 'atrule' && node.name === 'media'
    && node.params === '(min-width: 768px) and (max-width: 1180px)');
  assert.ok(narrowDesktop);
  const rule = narrowDesktop.nodes.find(node => node.type === 'rule' && node.selector === '.timeline-commandbar:has(.timeline-acute-control) > .timeline-status-group');
  assert.ok(rule);
  assert.ok(rule.nodes.some(node => node.type === 'decl' && node.prop === 'grid-column' && node.value === '1 / -1'));
});

test('loading and failure remain explicit in the compact status and never appear as an empty queue', () => {
  for (const [state, visible, accessible] of [
    [{ loading: true }, 'Načítání…', /Načítání akutních požadavků/],
    [{ error: 'Offline' }, 'Nelze načíst', /Akutní požadavky se nepodařilo načíst/],
    [{ loading: true, error: 'Offline' }, 'Nelze načíst', /Akutní požadavky se nepodařilo načíst/],
  ]) {
    const tile = AcuteTimelineStatusTile({ count: 0, unassignedCount: 0, onOpen: () => {}, ...state });
    assert.ok(renderToStaticMarkup(tile).includes(visible));
    assert.match(tile.props['aria-label'], accessible);
    assert.doesNotMatch(tile.props['aria-label'], /požadavky: 0/);
    assert.doesNotMatch(renderToStaticMarkup(tile), /0 čekajících/);
  }
});

test('native acute button passes the existing App navigation callback through without a clinical action', () => {
  const appTimeline = find(app, node => ts.isJsxSelfClosingElement(node) && node.tagName.getText(app) === 'TimelineModule', 'App Timeline');
  const open = attribute(appTimeline, 'onOpenAcuteRequests');
  assert.ok(open && ts.isJsxExpression(open));
  const calls = [];
  const callback = evaluate(open.expression.getText(app), { handleNavigate: view => calls.push(view) });
  const tile = elementChildren(renderStatusGroup({ onOpenAcuteRequests: callback }))[1];
  const button = AcuteTimelineStatusTile(tile.props);
  assert.equal(button.type, 'button');
  assert.equal(button.props.type, 'button');
  assert.equal(button.props.onClick, callback);
  assert.equal(button.props.onKeyDown, undefined, 'Native button handles Enter and Space');
  button.props.onClick();
  assert.deepEqual(calls, ['acute-requests']);
  const passive = AcuteTimelineStatusTile({ count: 2, unassignedCount: 1 });
  assert.equal(passive.type, 'div');
  assert.equal(passive.props.onClick, undefined);
});

test('disabled or unavailable acute module removes only its tile and retains ARO status', () => {
  const enabled = { hospitalLoading: false, permissionsLoading: false,
    modules: [{ id: 'acute-requests', is_enabled: true }], hasModuleAccess: () => true };
  const expression = initializer('acuteEnabled');
  assert.equal(evaluate(expression, enabled), true);
  for (const overrides of [{ hospitalLoading: true }, { permissionsLoading: true }, { modules: [] },
    { modules: [{ id: 'acute-requests', is_enabled: false }] }, { hasModuleAccess: () => false }]) {
    const acuteEnabled = evaluate(expression, { ...enabled, ...overrides });
    assert.equal(acuteEnabled, false);
    const tree = renderStatusGroup({ acuteEnabled });
    assert.equal(elementChildren(tree).length, 1);
    const html = renderToStaticMarkup(tree);
    assert.match(html, /ARO STATUS/);
    assert.doesNotMatch(html, /Akutní požadavky/);
  }
  for (const hook of ['useAcuteRequests', 'useAcuteCycleLinks']) {
    const call = find(timeline, node => ts.isCallExpression(node) && node.expression.getText(timeline) === hook, hook);
    assert.equal(call.arguments[0].getText(timeline), 'acuteEnabled');
  }
});

test('status uses the existing active unlinked request projection without changing its source data', () => {
  const requests = Object.freeze([
    Object.freeze({ id: 'assigned', status: 'pending', proposedRoomId: 'room-1' }),
    Object.freeze({ id: 'unassigned', status: 'acknowledged', proposedRoomId: null }),
    Object.freeze({ id: 'linked', status: 'pending', proposedRoomId: 'room-1' }),
    Object.freeze({ id: 'completed', status: 'completed', proposedRoomId: 'room-1' }),
    Object.freeze({ id: 'cancelled', status: 'cancelled', proposedRoomId: null }),
  ]);
  const before = structuredClone(requests);
  const state = { acuteEnabled: true, acute: { error: null, requests }, linkedRequestIds: new Set(['linked']),
    useMemo: callback => callback(), isActiveAcuteRequest: acute.isActiveAcuteRequest };
  const acuteRequests = evaluate(initializer('acuteRequests'), state);
  assert.deepEqual(acuteRequests.map(request => request.id), ['assigned', 'unassigned']);
  const unassignedAcuteCount = evaluate(initializer('unassignedAcuteCount'), { acuteRequests, useMemo: callback => callback() });
  assert.equal(unassignedAcuteCount, 1);
  const tile = elementChildren(renderStatusGroup({ acuteRequests, unassignedAcuteCount }))[1];
  assert.equal(tile.props.count, acuteRequests.length);
  assert.equal(tile.props.unassignedCount, unassignedAcuteCount);
  assert.deepEqual(requests, before);
  for (const overrides of [{ acuteEnabled: false }, { acute: { error: 'Offline', requests } }]) {
    assert.deepEqual(evaluate(initializer('acuteRequests'), { ...state, ...overrides }), []);
  }
});
