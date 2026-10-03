import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../../components/statistics/performance-tab.css', import.meta.url), 'utf8');
function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...css.matchAll(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]+)\\}`, 'g'))];
  assert.ok(matches.length, `Missing selector: ${selector}`);
  return matches.map(match => match[1]).join('\n');
}
function luminance(hex) {
  const channels = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function assertReadable(declarations) {
  const foreground = declarations.match(/(?:^|[;\n])\s*color:\s*(#[\da-f]{6})/i)?.[1];
  const background = declarations.match(/background-color:\s*(#[\da-f]{6})/i)?.[1];
  assert.ok(foreground && background, 'Native popup text and solid background must both be explicit');
  const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  assert.ok((values[1] + .05) / (values[0] + .05) >= 4.5, 'Option text must retain at least 4.5:1 contrast');
}

test('dark native performance filters own their color scheme and contrasting opaque option colors', () => {
  assert.match(rule('.stats-performance-room-filter select'), /color-scheme:\s*dark/);
  assertReadable(rule('.stats-performance-room-filter select optgroup'));
  assertReadable(rule('.stats-performance-room-filter select option:checked'));
});

test('light phone filters override popup text and background together without changing desktop menus', () => {
  assert.match(rule('.mobile-statistics.is-light .stats-performance-room-filter select'), /color-scheme:\s*light/);
  assertReadable(rule('.mobile-statistics.is-light .stats-performance-room-filter select optgroup'));
  assertReadable(rule('.mobile-statistics.is-light .stats-performance-room-filter select option:checked'));
});
