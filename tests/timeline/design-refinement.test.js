import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

// Presentation-only contracts. All runtime checks use synthetic props and
// local component stubs: no authenticated session, service or clinical write.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const timelineSource = read('components/TimelineModule.tsx');
const timeline = ts.createSourceFile('TimelineModule.tsx', timelineSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const rowSource = read('components/timeline/TimelineRoomRow.tsx');
const scope = '.timeline-desktop-workspace';

function descendants(source, predicate) {
  const result = [];
  const visit = node => {
    if (predicate(node)) result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return result;
}

function classAttribute(node) {
  const opening = ts.isJsxElement(node) ? node.openingElement : node;
  const value = opening.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText() === 'className')?.initializer;
  return value && ts.isStringLiteral(value) ? value.text : '';
}

function presentationStylesheet() {
  const imports = [...timelineSource.matchAll(/import\s+['"]\.\/timeline\/([^'"]+\.css)['"];?/g)];
  const candidates = imports.map(match => read(`components/timeline/${match[1]}`));
  const adapter = candidates.find(source => source.includes(scope));
  assert.ok(adapter, 'The existing Timeline must import its scoped presentation adapter');
  return postcss.parse(adapter);
}

function isReducedMotion(rule) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (parent.type === 'atrule' && /prefers-reduced-motion:\s*reduce/.test(parent.params)) return true;
  }
  return false;
}

function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected runtime dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports;
}

const constants = load('components/timeline/constants.ts');
const { TimelineAxisHeader } = load('components/timeline/TimelineAxisHeader.tsx', {
  react: React, './constants': constants,
  './utils': { hourLabelCompact: hour => `${(constants.TIMELINE_START_HOUR + hour) % 24}:00` },
});

function elements(node, predicate = () => true) {
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => elements(child, predicate))];
}

function text(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!React.isValidElement(node)) return '';
  return React.Children.toArray(node.props.children).map(text).join('');
}

function axis(overrides = {}) {
  return TimelineAxisHeader({
    zoom: 1, TIME_MARKERS: constants.TIME_MARKERS, TIMELINE_HOURS: constants.TIMELINE_HOURS,
    axisWidth: 1200, currentHour: 9, statusFilter: 'all', setStatusFilter: () => {},
    timelineRef: { current: null }, ...overrides,
  });
}

test('the design adapter belongs only to the existing desktop Timeline, not dialogs, phone or another module', () => {
  const workspaces = descendants(timeline, node => ts.isJsxElement(node)
    && classAttribute(node).split(/\s+/).includes(scope.slice(1)));
  assert.equal(workspaces.length, 1, 'One existing desktop workspace, not a replacement dashboard');
  const classes = classAttribute(workspaces[0]);
  assert.ok(classes.includes('app-module-content'));
  assert.ok(classes.includes('hidden') && classes.includes('md:flex'), 'Original phone renderer stays authoritative');
  assert.equal(descendants(workspaces[0], node => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText() === 'MobileTimelineView').length, 0);
  assert.match(timelineSource, /<MobileTimelineView[\s\S]*?rooms=\{sortedRooms\}/);

  let rules = 0;
  presentationStylesheet().walkRules(rule => {
    rules += 1;
    assert.ok(rule.selectors.every(selector => selector.startsWith(scope)), `${rule.selector} leaks out of the live desktop workspace`);
    assert.doesNotMatch(rule.selector, /timeline-popup|acute-proposal|acute-cycle|\.mtl-|\.mobile-|\.dashboard-|\.spatial-/);
  });
  assert.ok(rules > 0);
});

test('polish never distorts timestamp positions, duration widths, phase colors or scheduler row geometry', () => {
  assert.equal(constants.ROOM_LABEL_WIDTH, 320);
  assert.equal(constants.MIN_ROW_HEIGHT, 24);
  assert.equal(constants.TIMELINE_START_HOUR, 7);
  assert.equal(constants.TIMELINE_HOURS, 24);
  const geometry = /^(?:width|height|min-width|min-height|max-width|max-height|aspect-ratio|position|inset(?:-.+)?|top|right|bottom|left|transform|translate|scale|rotate|padding(?:-.+)?|margin(?:-.+)?|gap|flex(?:-.+)?|grid-.+|order)$/;
  presentationStylesheet().walkRules(rule => {
    const timelineGeometry = /timeline-(?:operation|phase|room-row|room-label|axis-header|scheduler-shell|rows|track)/.test(rule.selector);
    rule.walkDecls(declaration => {
      if (timelineGeometry) {
        assert.doesNotMatch(declaration.prop, /^(?:filter|backdrop-filter|-webkit-backdrop-filter)$/,
          'No per-block offscreen filter/blur layers in the schedule');
        assert.doesNotMatch(declaration.prop, geometry,
          `${rule.selector}: ${declaration.prop} changes the authoritative time/row geometry`);
      }
    });
  });
  assert.match(rowSource, /left:\s*`\$\{position\.left\}%`/);
  assert.match(rowSource, /width:\s*`\$\{Math\.max\(0\.5, position\.width\)\}%`/);
  assert.match(rowSource, /left:\s*`\$\{Math\.max\(0, boxLeftPct\)\}%`/);
  assert.match(rowSource, /width:\s*`\$\{boxWidthPct\}%`/);
  assert.match(rowSource, /activeStatuses\.forEach\(\(s, idx\) => \{[\s\S]*?s\.accent_color \|\| s\.color/);
  assert.match(timelineSource, /timelineRef\.current\.scrollLeft = e\.currentTarget\.scrollLeft/);
});

test('native filters have legible complete labels, selected evidence and their original callbacks', () => {
  for (const selected of ['all', 'active', 'free', 'attention']) {
    const calls = [];
    const buttons = elements(axis({ statusFilter: selected, setStatusFilter: value => calls.push(value) }), node => node.type === 'button');
    assert.equal(buttons.length, 4);
    assert.equal(buttons.filter(button => button.props['aria-pressed']).length, 1);
    assert.doesNotMatch(buttons.map(text).join(' '), /(?:Akt\.|Vol\.|Poz\.)/);
    assert.ok(buttons.every(button => text(button).trim().length >= 3), 'Visible text must not be reduced to symbols');
    ['all', 'active', 'free', 'attention'].forEach((key, index) => {
      assert.equal(buttons[index].props['aria-pressed'], key === selected);
      buttons[index].props.onClick();
    });
    assert.deepEqual(calls, ['all', 'active', 'free', 'attention']);
  }
});

test('desktop toolbar targets remain touchable and the status pair moves together at narrow module widths', () => {
  const css = presentationStylesheet();
  const base = selector => {
    const values = {};
    css.walkRules(rule => {
      if (rule.parent.type !== 'root' || !rule.selectors.includes(selector)) return;
      rule.walkDecls(declaration => { values[declaration.prop] = declaration.value; });
    });
    return values;
  };
  const tool = base(`${scope} .timeline-tool-button`);
  assert.ok(Number.parseFloat(tool.height) >= 44);
  assert.ok(Number.parseFloat(tool['min-width']) >= 44);
  assert.ok(Number.parseFloat(base(`${scope} .timeline-room-filter`).height) >= 44);
  const compact = css.nodes.find(node => node.type === 'atrule' && node.name === 'container'
    && /timeline-workspace\s*\(max-width:\s*880px\)/.test(node.params));
  assert.ok(compact, 'Wrapping responds to available module width, not only the browser width');
  const statusRule = compact.nodes.find(node => node.type === 'rule'
    && node.selectors.some(selector => selector.includes('.timeline-status-group')));
  assert.ok(statusRule);
  assert.ok(statusRule.nodes.some(node => node.type === 'decl' && node.prop === 'grid-column' && node.value === '1 / -1'));
});

test('axis markers retain the real 24-hour coordinates, zoom width and current-time accessibility', () => {
  for (const zoom of [1, 2, 3]) {
    const tree = axis({ zoom });
    const markers = elements(tree, node => node.props.style?.left !== undefined
      && node.props.style?.width !== undefined && node.props.style?.background === 'transparent');
    assert.equal(markers.length, constants.TIME_MARKERS.length);
    markers.forEach((marker, index) => {
      assert.equal(marker.props.style.left, `${index * (100 / constants.TIMELINE_HOURS)}%`);
      assert.equal(marker.props.style.width, index === markers.length - 1 ? 0 : `${100 / constants.TIMELINE_HOURS}%`);
      assert.equal(marker.props['aria-current'], index === 2 ? 'time' : undefined);
    });
    assert.ok(elements(tree).some(node => node.props.style?.width === `${zoom * 100}%`));
  }
});

test('mouse, keyboard and reduced-motion presentation are explicit without removing clinical controls', () => {
  let focused = false;
  let reduced = false;
  presentationStylesheet().walkRules(rule => {
    if (rule.selector.includes(':focus-visible')) {
      focused = true;
      const props = new Map(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
      assert.ok(props.has('outline') || props.has('box-shadow') || props.has('background'), 'Keyboard focus must be visible');
    }
    if (isReducedMotion(rule)) {
      const declarations = rule.nodes.filter(node => node.type === 'decl');
      if (declarations.some(node => /^(?:transition|animation)$/.test(node.prop) && node.value === 'none')) reduced = true;
    }
  });
  assert.ok(focused, 'Native controls have intentional keyboard evidence');
  assert.ok(reduced, 'Scoped transitions respect reduced motion with matching selectors');
  assert.match(rowSource, /setStatsRoomId\(room\.id\)/);
  assert.match(rowSource, /openCompletedCycle\(room, operation\)/);
  assert.match(rowSource, /openLiveRoom\(room\.id\)/);
  assert.match(rowSource, /event\.stopPropagation\(\)/);
  assert.match(rowSource, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(timelineSource, /acuteCycles\.links/);
  assert.match(timelineSource, /<AcuteProposalLane[\s\S]*?onOpen=\{onOpenAcuteRoom \? \(\) => onOpenAcuteRoom\(proposal\.request\)/);
});
