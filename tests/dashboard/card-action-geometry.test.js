import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import { calculateDashboardGridLayout } from '../../lib/dashboard-grid-layout.js';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = postcss.parse(read('app/globals.css'));
function declarations(selector) {
  const result = {};
  css.walkRules(rule => {
    if (rule.parent.type !== 'root' || !rule.selectors.includes(selector)) return;
    rule.walkDecls(decl => { result[decl.prop] = decl.value; });
  });
  return result;
}

const control = declarations('.dashboard-workspace-card-corner-control');
const emergency = declarations('.dashboard-workspace-card-emergency');
const lock = declarations('.dashboard-workspace-card-lock');

test('emergency and lock retain the same subtle neon glow and white icon on hover and activation', () => {
  for (const [name, rgb] of [['emergency', '239, 68, 68'], ['lock', '245, 158, 11']]) {
    const hover = declarations(`.dashboard-workspace-card-${name}:hover`);
    const active = declarations(`.dashboard-workspace-card-${name}.is-active`);
    assert.deepEqual(active, hover, 'active appearance remains when the pointer leaves');
    assert.equal(active.background, `rgba(${rgb}, 0.08)`, 'no opaque fill');
    assert.match(active['border-color'], /0\.85\)$/, 'clear neon edge');
    assert.equal(active['box-shadow'], `0 0 6px rgba(${rgb}, 0.35), inset 0 0 12px rgba(${rgb}, 0.38), inset 0 0 4px rgba(${rgb}, 0.28)`,
      'preserve the exterior halo and add a feathered inner glow with a brighter inner rim');
    assert.equal(active.color, '#FFFFFF', 'Lucide icons inherit an opaque white stroke');
    assert.equal(active.transform, undefined, 'state styling must not move the button');
  }
});

// Sample the actual SVG pocket in physical pixels, including its two curved
// shoulders. Button bounding boxes alone missed the reported card collision.
function pocketPoints(width, height) {
  const points = [];
  for (let step = 0; step <= 90; step += 1) {
    const angle = step * Math.PI / 180;
    for (const [x, y] of [
      [760 + 84 * Math.cos(Math.PI + angle), 674 + 84 * Math.sin(Math.PI + angle)],
      [600 + 76 * Math.cos(angle), 674 + 76 * Math.sin(angle)],
      [898 + 82 * Math.cos(angle), 508 + 82 * Math.sin(angle)],
      [760 + (898 - 760) * step / 90, 590],
    ]) points.push([x * width / 980, y * height / 750]);
  }
  return points;
}

test('action geometry follows the current CSS and normalized SVG pocket', () => {
  assert.equal(control.width, 'clamp(44px, 12cqw, 64px)');
  assert.equal(control['min-width'], '44px');
  assert.equal(control['min-height'], '44px');
  assert.equal(control.bottom, '.816cqw');
  assert.equal(emergency.left, '77.551%');
  assert.equal(lock.left, '92.653%');
  assert.equal(declarations('.dashboard-workspace-card-corner-action:hover').transform, control.transform,
    'hover must not move controls into the card outline');
  assert.ok(read('components/RoomCard.tsx').includes('V 508 A 82 82 0 0 1 898 590 H 760 A 84 84 0 0 0 676 674 A 76 76 0 0 1 600 750'),
    'update geometric verification if the visible SVG pocket changes');
});

test('continuous resize keeps touch targets separated and outside the card silhouette', () => {
  for (let width = 600; width <= 3400; width += 8) {
    for (const height of [260, 800, 1400]) {
      const layout = calculateDashboardGridLayout({ width, height, count: 15 });
      const w = (layout.maxWidth - (layout.columns - 1) * layout.gap) / layout.columns;
      const h = layout.cardHeight;
      const size = Math.min(64, Math.max(44, w * 0.12));
      const radius = size / 2;
      const centers = [parseFloat(emergency.left), parseFloat(lock.left)].map(left => left / 100 * w);
      const y = h - parseFloat(control.bottom) / 100 * w - radius;
      assert.ok(centers[1] - centers[0] - size >= 4, `${width}×${height}: at least 4px between buttons`);
      for (const x of centers) {
        assert.ok(x - radius >= 0 && x + radius <= w && y + radius <= h,
          `${width}×${height}: controls stay inside their own card bounds`);
        const clearance = Math.min(...pocketPoints(w, h).map(([px, py]) => Math.hypot(x - px, y - py) - radius));
        assert.ok(clearance >= 4, `${width}×${height}: control clears the SVG pocket (${clearance}px)`);
        assert.ok(y - radius > h * 590 / 750, 'controls remain below the pocket shoulder, not inside the filled card');
      }
    }
  }
});
