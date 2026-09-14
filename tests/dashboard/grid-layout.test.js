import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDashboardGridLayout } from '../../lib/dashboard-grid-layout.js';

// Dimensions represent the usable content box after navigation and heading.
const viewports = [
  { width: 600, height: 550 },
  { width: 704, height: 640 },
  { width: 1112, height: 540 },
  { width: 1272, height: 730 },
  { width: 1752, height: 880 },
  { width: 2392, height: 1240 },
  { width: 3300, height: 1240 },
];

function cardWidth(layout) {
  return (layout.maxWidth - (layout.columns - 1) * layout.gap) / layout.columns;
}

function gridHeight(layout) {
  return layout.rows === 0 ? 0 : layout.rows * layout.cardHeight + (layout.rows - 1) * layout.gap;
}

function assertFiniteLayout(layout) {
  for (const key of ['columns', 'rows', 'gap', 'cardHeight', 'maxWidth']) {
    assert.ok(Number.isFinite(layout[key]), `${key} must be finite`);
    assert.ok(layout[key] >= 0, `${key} must be nonnegative`);
  }
  for (const key of ['columns', 'rows', 'gap', 'cardHeight']) {
    assert.ok(Number.isInteger(layout[key]), `${key} must be an integer`);
  }
  assert.ok(layout.columns >= 1, 'CSS grid always has at least one column');
  assert.ok(['compact', 'comfortable'].includes(layout.density));
}

for (const viewport of viewports) {
  for (const count of [0, 1, 4, 15, 40]) {
    test(`${viewport.width} × ${viewport.height}, ${count} rooms: readable cards stay inside the available width`, () => {
      const layout = calculateDashboardGridLayout({ ...viewport, count });
      assertFiniteLayout(layout);
      assert.ok(layout.maxWidth <= viewport.width, 'the grid does not overflow horizontally');
      assert.ok(layout.gap >= 12 && layout.gap <= 24);
      assert.ok(cardWidth(layout) <= 520, 'sparse dashboards do not stretch cards indefinitely');
      assert.ok(layout.cardHeight >= 280, 'short screens preserve readable card content');
      assert.ok(layout.cardHeight >= Math.ceil(cardWidth(layout) * 0.72), 'circular actions fit the wave pocket');

      if (count === 0) {
        assert.equal(layout.rows, 0);
        return;
      }
      assert.ok(layout.columns <= count, 'no redundant empty columns');
      assert.ok(layout.columns * layout.rows >= count, 'every room has a slot');
      assert.ok((layout.rows - 1) * layout.columns < count, 'no empty trailing row');
      assert.ok((layout.columns - 1) * layout.rows < count, 'columns are balanced within the chosen number of rows');
      assert.ok(cardWidth(layout) >= (viewport.width >= 2500 ? 360 : viewport.width >= 1800 ? 300 : 240));

      const minimumHeight = Math.max(280, Math.ceil(cardWidth(layout) * 0.72));
      const minimumGridHeight = layout.rows * minimumHeight + (layout.rows - 1) * layout.gap;
      if (minimumGridHeight <= viewport.height) {
        assert.ok(gridHeight(layout) <= viewport.height, 'all rows fit vertically when the minimum readable sizes fit');
      } else {
        assert.equal(layout.cardHeight, minimumHeight, 'overflow preserves the minimum readable height');
      }
    });
  }
}

test('six rooms use two balanced rows instead of leaving one isolated room', () => {
  const layout = calculateDashboardGridLayout({ width: 1272, height: 900, count: 6 });
  assert.equal(layout.columns, 3);
  assert.equal(layout.rows, 2);
});

test('room grids use available height for larger cards while respecting readable width tiers', () => {
  const cases = [
    [600, 2],
    [704, 2],
    [1112, 4],
    [1272, 4],
    [1752, 5],
    [2392, 5],
    [3300, 5],
  ];
  for (const [width, columns] of cases) {
    const layout = calculateDashboardGridLayout({ width, height: 1240, count: 15 });
    assert.equal(layout.columns, columns, `${width}px content width`);
  }
});

test('a tall 4K dashboard gives fifteen rooms larger cards in three balanced rows', () => {
  const layout = calculateDashboardGridLayout({ width: 3300, height: 1950, count: 15 });
  assert.equal(layout.columns, 5);
  assert.equal(layout.rows, 3);
  assert.equal(cardWidth(layout), 520);
  assert.equal(layout.cardHeight, 540);
  assert.equal(layout.density, 'comfortable');
  assert.ok(gridHeight(layout) <= 1950);
});

test('six rooms use two rows when the extra height makes each card more readable', () => {
  const layout = calculateDashboardGridLayout({ width: 1752, height: 1240, count: 6 });
  assert.equal(layout.columns, 3);
  assert.equal(layout.rows, 2);
  assert.equal(cardWidth(layout), 520);
  assert.equal(layout.cardHeight, 540);
  assert.ok(gridHeight(layout) <= 1240);
});

test('equally large cards use fewer rows as a stable tie-break', () => {
  const layout = calculateDashboardGridLayout({ width: 3300, height: 1240, count: 6 });
  assert.equal(layout.columns, 6);
  assert.equal(layout.rows, 1);
  assert.equal(cardWidth(layout), 520);
  assert.equal(layout.cardHeight, 540);
});

test('a short dense dashboard retains the widest balanced grid and scrolls', () => {
  const layout = calculateDashboardGridLayout({ width: 3300, height: 260, count: 40 });
  assert.equal(layout.columns, 8);
  assert.equal(layout.rows, 5);
  assert.equal(layout.cardHeight, 282);
  assert.ok(gridHeight(layout) > 260);
  assert.ok(layout.cardHeight >= cardWidth(layout) * 0.72);
});

test('one room is capped at 520px wide even on an ultrawide display', () => {
  const layout = calculateDashboardGridLayout({ width: 3300, height: 1240, count: 1 });
  assert.equal(layout.columns, 1);
  assert.equal(layout.rows, 1);
  assert.equal(layout.maxWidth, 520);
  assert.equal(layout.cardHeight, 540);
  assert.equal(layout.density, 'comfortable');
});

test('short screens scroll without crushing cards and fitting screens round down safely', () => {
  const short = calculateDashboardGridLayout({ width: 1272, height: 200, count: 15 });
  assert.equal(short.cardHeight, 280);
  assert.equal(short.density, 'compact');
  assert.ok(gridHeight(short) > 200);

  const fitting = calculateDashboardGridLayout({ width: 1272, height: 866.9, count: 15 });
  assert.equal(fitting.cardHeight, 280);
  assert.ok(gridHeight(fitting) <= 866.9);

  const fractional = calculateDashboardGridLayout({ width: 2392.5, height: 1069.8, count: 15 });
  assert.ok(gridHeight(fractional) <= 1069.8);
  assert.ok(Number.isInteger(fractional.cardHeight));
});

test('wave pocket minimum is rounded up even when the available height is too short', () => {
  const layout = calculateDashboardGridLayout({ width: 500.25, height: 200, count: 1 });
  assert.equal(layout.cardHeight, 361);
  assert.ok(layout.cardHeight >= cardWidth(layout) * 0.72);
});

test('zero or invalid measurements and counts return finite layouts without dividing by zero', () => {
  for (const input of [
    undefined,
    {},
    { width: 0, height: 0, count: 0 },
    { width: -1, height: -1, count: -1 },
    { width: Number.NaN, height: Infinity, count: Number.NaN },
    { width: Infinity, height: -Infinity, count: Infinity },
    { width: 600, height: 550, count: -40 },
    { width: 600, height: 550, count: 4.9 },
    { width: 1, height: 1, count: 40 },
    { width: Number.MAX_VALUE, height: Number.MAX_VALUE, count: Number.MAX_VALUE },
  ]) {
    const layout = calculateDashboardGridLayout(input);
    assertFiniteLayout(layout);
    assert.ok(cardWidth(layout) >= 0);
    assert.ok(layout.cardHeight >= 280);
  }
  assert.equal(calculateDashboardGridLayout({ count: -1 }).rows, 0);
  assert.deepEqual(
    calculateDashboardGridLayout({ width: 600, height: 550, count: 4.9 }),
    calculateDashboardGridLayout({ width: 600, height: 550, count: 4 }),
  );
});
