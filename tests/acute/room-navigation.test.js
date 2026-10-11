import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const parse = path => ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const app = parse('App.tsx');
const detail = parse('components/RoomDetail.tsx');

function findNode(source, predicate) {
  let result;
  function visit(node) {
    if (result) return;
    if (predicate(node)) { result = node; return; }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(result, 'Expected source contract not found');
  return result;
}

function initializer(name) {
  return findNode(app, node => ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name).initializer;
}

function callback(name) {
  const expression = initializer(name);
  assert.ok(ts.isCallExpression(expression) && expression.expression.getText(app) === 'useCallback');
  return expression.arguments[0].getText(app);
}

function evaluate(expression, dependencies) {
  const module = { exports: null };
  const { outputText } = ts.transpileModule(`module.exports = (${expression});`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  new Function('module', ...Object.keys(dependencies), outputText)(module, ...Object.values(dependencies));
  return module.exports;
}

const request = overrides => ({ id: 'request-1', hospitalId: 'hospital-1', status: 'pending', proposedRoomId: 'room-1', ...overrides });
function navigationDependencies(overrides = {}) {
  const calls = [];
  return {
    calls,
    dependencies: {
      hospitalLoading: false, permissionsLoading: false, activeHospitalId: 'hospital-1',
      user: { id: 'user-1' }, modules: [{ id: 'acute-requests', is_enabled: true }],
      rooms: [{ id: 'room-1' }, { id: 'room-2' }], hasModuleAccess: () => true,
      selectedAcuteRoom: null, acuteRoomOpenerRef: { current: null },
      document: { activeElement: null }, HTMLElement: class {},
      window: { requestAnimationFrame: callback => callback() },
      isActiveAcuteRequest: input => ['pending', 'acknowledged'].includes(input.status),
      setSelectedAcuteRoom: value => calls.push(['acute', value]),
      setSelectedRoomId: value => calls.push(['room', value]),
      setCurrentView: () => assert.fail('Opening/closing acute detail must preserve the mounted Timeline'),
      updateRoomStep: () => assert.fail('Opening detail must not advance the clinical cycle'),
      updateOperatingRoom: () => assert.fail('Opening detail must not write clinical data'),
      ...overrides,
    },
  };
}

test('acute block opens the ordinary room detail by scoped IDs only, with no clinical write or navigation reset', () => {
  const { calls, dependencies } = navigationDependencies();
  evaluate(callback('handleOpenAcuteRoom'), dependencies)(request());
  assert.deepEqual(calls, [
    ['acute', { requestId: 'request-1', hospitalId: 'hospital-1', userId: 'user-1' }],
    ['room', 'room-1'],
  ]);
});

test('acute navigation rejects wrong tenants, inactive/unassigned requests, unavailable rooms and denied modules', () => {
  const cases = [
    [{ hospitalLoading: true }], [{ permissionsLoading: true }], [{ user: null }],
    [{ hasModuleAccess: id => id !== 'dashboard' }], [{ hasModuleAccess: id => id !== 'acute-requests' }],
    [{ modules: [{ id: 'acute-requests', is_enabled: false }] }],
    [{}, { hospitalId: 'other-hospital' }], [{}, { status: 'completed' }], [{}, { status: 'cancelled' }],
    [{}, { proposedRoomId: null }], [{}, { proposedRoomId: 'missing-room' }],
  ];
  for (const [overrides, input] of cases) {
    const { calls, dependencies } = navigationDependencies(overrides);
    evaluate(callback('handleOpenAcuteRoom'), dependencies)(request(input));
    assert.deepEqual(calls, [], JSON.stringify([overrides, input]));
  }
});

test('the selected acute overlay becomes unavailable immediately after hospital/user/permission scope changes', () => {
  const expression = initializer('acuteRoomEnabled').getText(app);
  const base = {
    selectedAcuteRoom: { hospitalId: 'hospital-1', userId: 'user-1', requestId: 'request-1' },
    isAuthenticated: true, hospitalLoading: false, permissionsLoading: false,
    activeHospitalId: 'hospital-1', user: { id: 'user-1' },
    modules: [{ id: 'acute-requests', is_enabled: true }], hasModuleAccess: () => true,
  };
  assert.equal(evaluate(expression, base), true);
  for (const overrides of [
    { selectedAcuteRoom: null }, { isAuthenticated: false }, { hospitalLoading: true },
    { permissionsLoading: true }, { activeHospitalId: 'hospital-2' }, { user: { id: 'user-2' } },
    { modules: [] }, { modules: [{ id: 'acute-requests', is_enabled: false }] },
    { hasModuleAccess: id => id !== 'dashboard' }, { hasModuleAccess: id => id !== 'acute-requests' },
  ]) assert.equal(evaluate(expression, { ...base, ...overrides }), false);
});

test('close and native Back clear acute selection while leaving the existing Timeline mounted', () => {
  const { calls, dependencies } = navigationDependencies();
  evaluate(callback('handleCloseRoomDetail'), dependencies)();
  assert.deepEqual(calls, [['room', null], ['acute', null]]);
  assert.match(read('App.tsx'), /if \(selectedRoomId\) \{ e\.preventDefault\(\); handleCloseRoomDetail\(\); return; \}/);
  assert.match(read('App.tsx'), /currentView === 'timeline' && acuteRoomEnabled/);
});

test('close restores the original Timeline opener, while selecting following requests never replaces it', () => {
  class Element {
    constructor(connected = true) { this.isConnected = connected; this.focusCount = 0; }
    focus() { this.focusCount += 1; }
  }
  const opener = new Element();
  const nextControl = new Element();
  const ref = { current: null };
  const { dependencies } = navigationDependencies({
    acuteRoomOpenerRef: ref, HTMLElement: Element, document: { activeElement: opener },
  });
  evaluate(callback('handleOpenAcuteRoom'), dependencies)(request());
  assert.equal(ref.current, opener);
  evaluate(callback('handleOpenAcuteRoom'), {
    ...dependencies, selectedAcuteRoom: { requestId: 'request-1' }, document: { activeElement: nextControl },
  })(request({ id: 'request-2', proposedRoomId: 'room-2' }));
  assert.equal(ref.current, opener);
  evaluate(callback('handleCloseRoomDetail'), dependencies)();
  assert.equal(ref.current, null);
  assert.equal(opener.focusCount, 1);
  assert.equal(nextControl.focusCount, 0);
  const disconnected = new Element(false);
  ref.current = disconnected;
  evaluate(callback('handleCloseRoomDetail'), dependencies)();
  assert.equal(disconnected.focusCount, 0);
});

test('acute entry focuses a visible nonclinical close/back control, never a workflow advance action', () => {
  const effect = findNode(detail, node => ts.isCallExpression(node) && node.expression.getText(detail) === 'useEffect'
    && node.arguments[0]?.getText(detail).includes('target?.focus()')).arguments[0].getText(detail);
  const focus = [];
  const hidden = { getClientRects: () => [], focus: () => assert.fail('Hidden responsive controls cannot receive focus') };
  const visible = { getClientRects: () => [{}], focus: () => focus.push('close') };
  for (const mobile of [true, false]) evaluate(effect, {
    acuteContext: { selectedRequest: request() }, acuteContextMessage: undefined,
    acuteMobileBackRef: { current: mobile ? visible : hidden },
    acuteDesktopCloseRef: { current: mobile ? hidden : visible },
  })();
  assert.deepEqual(focus, ['close', 'close']);
  evaluate(effect, {
    acuteContext: undefined, acuteContextMessage: undefined,
    acuteMobileBackRef: { current: visible }, acuteDesktopCloseRef: { current: visible },
  })();
  assert.equal(focus.length, 2, 'Ordinary room entry must keep existing focus behavior');
});

test('permission-driven module redirection clears both room and acute context selection', () => {
  const effect = findNode(app, node => ts.isCallExpression(node) && node.expression.getText(app) === 'useEffect'
    && node.arguments[0]?.getText(app).includes('currentView !== defaultView && !isModuleEnabled(currentView)'));
  const text = effect.arguments[0].getText(app);
  assert.match(text, /setSelectedRoomId\(null\)/);
  assert.match(text, /setSelectedAcuteRoom\(null\)/);
});

test('the covered Timeline is inert and hidden from assistive technology, without being unmounted', () => {
  const wrapper = findNode(app, node => ts.isJsxOpeningElement(node) && node.tagName.getText(app) === 'div'
    && node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(app) === 'inert'));
  const attrs = wrapper.attributes.properties.filter(ts.isJsxAttribute);
  const attributeExpression = name => attrs.find(attribute => attribute.name.getText(app) === name).initializer.expression.getText(app);
  assert.equal(attributeExpression('inert'), 'acuteRoomEnabled');
  assert.equal(attributeExpression('aria-hidden'), 'acuteRoomEnabled || undefined');
});

test('desktop and mobile acute lanes pass the selected real request to the clinical detail callback', () => {
  for (const path of ['components/TimelineModule.tsx', 'components/mobile/MobileTimelineView.tsx']) {
    const source = read(path);
    assert.match(source, /onOpen=\{onOpenAcuteRoom \? \(\) => onOpenAcuteRoom\(proposal\.request\) : onOpenAcuteRequests\}/);
  }
  assert.match(read('components/TimelineModule.tsx'), /onOpenAcuteRoom=\{onOpenAcuteRoom\}/);
  assert.match(read('App.tsx'), /onStepChange=\{handleStepChange\}/);
  assert.match(read('App.tsx'), /onEndTimeChange=\{handleEndTimeChange\}/);
  assert.match(read('App.tsx'), /onPauseChange=\{handlePauseChangeSelected\}/);
});

test('RoomDetail memo comparator refreshes selected request, queue, scoped error and actual room names', () => {
  const expression = findNode(detail, node => ts.isCallExpression(node) && node.expression.getText(detail) === 'memo'
    && node.arguments[0]?.getText(detail) === 'RoomDetail').arguments[1].getText(detail);
  const equal = evaluate(expression, {});
  const context = { selectedRequest: request(), followingRequests: [] };
  const base = { room: { id: 'room-1' }, allRooms: [{ id: 'room-1', name: 'Sál 1' }], acuteContext: context };
  assert.equal(equal(base, base), true);
  for (const next of [
    { ...base, acuteContext: { ...context } },
    { ...base, acuteContextMessage: 'Není aktivní' },
    { ...base, onSelectAcuteRequest() {} },
    { ...base, allRooms: [{ id: 'room-1', name: 'Nový skutečný název' }] },
    { ...base, onPauseChange() {} },
    { ...base, onClearNotice() {} },
  ]) assert.equal(equal(base, next), false);
});
