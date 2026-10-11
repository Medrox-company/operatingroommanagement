import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

// Presentation contracts only. Browser layout, keyboard dispatch and clinical
// callbacks are verified separately; these tests never contact live services.
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const stylesheet = read('components/dashboard/dashboard-card-polish.css');
const css = postcss.parse(stylesheet);
const scope = '.dashboard-cards-layout .dashboard-workspace-card';

function declarations(selector, { reducedMotion = false } = {}) {
  const result = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    let ancestor = rule.parent;
    let withinReducedMotion = false;
    while (ancestor) {
      if (ancestor.type === 'atrule' && /prefers-reduced-motion:\s*reduce/.test(ancestor.params)) withinReducedMotion = true;
      ancestor = ancestor.parent;
    }
    if (withinReducedMotion !== reducedMotion) return;
    rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
  });
  return result;
}

test('card polish is imported by the dashboard and every rule is scoped to desktop cards only', () => {
  assert.match(read('components/DashboardModule.tsx'), /import '\.\/dashboard\/dashboard-card-polish\.css';/);
  let count = 0;
  css.walkRules(rule => {
    count += 1;
    assert.ok(rule.selectors.every(selector => selector.startsWith(scope)), rule.selector);
    let ancestor = rule.parent;
    let desktopOnly = false;
    while (ancestor) {
      if (ancestor.type === 'atrule' && ancestor.name === 'media') {
        const minimum = ancestor.params.match(/min-width:\s*(\d+)px/);
        if (minimum && Number(minimum[1]) >= 768) desktopOnly = true;
      }
      ancestor = ancestor.parent;
    }
    assert.ok(desktopOnly, `${rule.selector} must not restyle mobile or Cliniq cards`);
  });
  assert.ok(count > 0);
  assert.doesNotMatch(stylesheet, /html\[|:root|\.mobile-|\.mro-|\.spatial-dashboard/);
});

test('the adapter cannot move, resize or reshape the tested card grid, rings or action pocket', () => {
  css.walkRules(rule => {
    assert.doesNotMatch(rule.selector, /corner-control|corner-action|card-emergency|card-lock|card-surface|room-grid|card-content|card-footer/);
    rule.walkDecls(declaration => {
      assert.doesNotMatch(declaration.prop, /^(?:width|height|min-width|min-height|max-width|max-height|aspect-ratio|position|inset|top|right|bottom|left|transform|translate|scale|rotate|clip-path|border-radius|padding(?:-.+)?|margin(?:-.+)?|gap|row-gap|column-gap|grid-.+|container-.+|display|overflow(?:-.+)?|--dashboard-.+)$/,
        `${rule.selector}: ${declaration.prop} must remain authoritative in the original layout`);
    });
  });
  assert.doesNotMatch(stylesheet, /(?:linear|radial|conic)-gradient\(|url\(|backdrop-filter|filter:|animation:/);
});

test('the SVG card has one subtle uniform fill, including emergency and locked states', () => {
  const outline = `${scope} .dashboard-workspace-card-outline-path`;
  const base = declarations(outline);
  assert.equal(base.fill, 'rgba(159, 180, 237, 0.05)');
  const hover = declarations(`${scope}:hover .dashboard-workspace-card-outline-path`);
  const focus = declarations(`${scope}:focus-visible .dashboard-workspace-card-outline-path`);
  assert.deepEqual(focus, hover, 'keyboard focus receives the same visual evidence as pointer hover');
  assert.equal(hover.fill, 'rgba(159, 180, 237, 0.075)');
  for (const state of ['emergency', 'locked']) {
    const stateOutline = `${scope} .dashboard-workspace-card-outline-path--${state}`;
    assert.equal(declarations(stateOutline).fill, undefined, `${state} uses the shared card fill`);
    const hovered = declarations(`${scope}:hover .dashboard-workspace-card-outline-path--${state}`);
    const focused = declarations(`${scope}:focus-visible .dashboard-workspace-card-outline-path--${state}`);
    assert.deepEqual(focused, hovered);
    assert.equal(hovered.fill, undefined, `${state} hover keeps the shared fill`);
    assert.ok(declarations(stateOutline).stroke, `${state} retains its semantic border`);
    assert.ok(hovered.stroke, `${state} retains its semantic border on hover/focus`);
  }
});

test('transparent numeric rings and actual clinical colors are not repainted by the polish', () => {
  css.walkRules(rule => {
    if (!rule.selector.includes('cycle-indicator')) return;
    assert.ok(rule.selectors.every(selector => selector.endsWith('text:not([fill])')),
      'Only neutral number typography may be adjusted, not ring circles or explicit clinical colors');
    const props = [];
    rule.walkDecls(declaration => props.push(declaration.prop));
    assert.deepEqual(props.sort(), ['font-variant-numeric', 'font-weight']);
  });
  const roomCard = read('components/RoomCard.tsx');
  const gaugeStart = roomCard.indexOf('className="dashboard-workspace-cycle-indicator');
  const gaugeEnd = roomCard.indexOf('</svg>', gaugeStart);
  const gauge = roomCard.slice(gaugeStart, gaugeEnd);
  assert.equal((gauge.match(/fill="none"/g) ?? []).length, 3, 'All three status ring circles remain transparent');
  assert.match(gauge, /stroke=\{themeColor\}/);
  assert.match(gauge, /\{todayOperationCount\}/);
  assert.match(gauge, /fill="#22D3EE"/, 'The paused label retains its explicit clinical color');
});

test('neutral avatar and department presentation exclude emergency, lock and pause colors', () => {
  const department = `${scope} .dashboard-room-department:not(.text-red-300):not(.text-amber-300)`;
  assert.equal(declarations(department).color, 'rgba(209, 221, 252, 0.74)');
  const avatar = `${scope} .dashboard-staff-avatar:not(.bg-red-500\\/10):not(.bg-amber-500\\/10):not(.bg-cyan-500\\/10)`;
  assert.ok(declarations(avatar).background, 'Only the normal avatar surface receives the neutral color');
  const icon = `${scope} .dashboard-staff-avatar svg:not(.text-red-400):not(.text-amber-400):not(.text-cyan-400)`;
  assert.equal(declarations(icon).color, 'rgba(209, 221, 252, 0.68)');
});

test('polish keeps tabular numbers, visible keyboard feedback and reduced-motion support', () => {
  const number = declarations(`${scope} .dashboard-workspace-cycle-indicator text:not([fill])`);
  assert.equal(number['font-variant-numeric'], 'tabular-nums');
  assert.equal(declarations(`${scope} .dashboard-workspace-card-outline-path`, { reducedMotion: true }).transition, 'none');
  assert.doesNotMatch(stylesheet, /outline:\s*(?:none|0)|visibility:\s*hidden|pointer-events:\s*none/);
  const card = read('components/RoomCard.tsx');
  assert.match(card, /onKeyDown=\{handleCardKeyDown\}/);
  assert.match(card, /focus-visible:ring-2 focus-visible:ring-cyan-300\/55/);
  assert.match(card, /if \(event\.target !== event\.currentTarget\) return;/);
  assert.match(card, /e\.stopPropagation\(\)/);
});
