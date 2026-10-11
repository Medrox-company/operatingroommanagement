import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';

// This is a stylesheet contract, not a replacement for browser/contrast QA.
// It reads real production sources and never imports credentials or calls the API.
const css = readFileSync(new URL('../../components/acute/acute-requests.css', import.meta.url), 'utf8');
const view = readFileSync(new URL('../../components/AcuteRequestsModule.tsx', import.meta.url), 'utf8');
const ast = postcss.parse(css);
const rules = [];
ast.walkRules(rule => rules.push(rule));
const ruleFor = selector => {
  const rule = rules.find(item => item.selector === selector);
  assert.ok(rule, `Missing scoped rule: ${selector}`);
  return rule;
};
const value = (rule, property) => rule.nodes.filter(node => node.type === 'decl' && node.prop === property).at(-1)?.value;
const rgb = declaration => {
  const channels = declaration.split(',').map(Number);
  assert.equal(channels.length, 3);
  assert.ok(channels.every(channel => Number.isFinite(channel) && channel >= 0 && channel <= 255));
  return channels;
};
const rgba = declaration => {
  const match = declaration.match(/^rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/);
  assert.ok(match, `Expected a translucent RGBA surface: ${declaration}`);
  return match.slice(1).map(Number);
};
const URGENCIES = ['emergent', 'urgent', 'expedited'];
const mapping = (urgency, light = false) => ruleFor(`${light ? ':root:not(.m-dark) ' : ''}.acute-card[data-urgency='${urgency}']`);
function assertSemanticPalette(palettes) {
  const [red, green, blue] = palettes;
  assert.ok(red[0] > red[1] * 1.3 && red[2] > red[1], 'Emergent remains red/pink');
  assert.ok(green[1] > green[0] && green[1] > green[2], 'Urgent remains green');
  assert.ok(blue[2] > blue[0] && blue[1] > blue[0], 'Expedited remains blue');
  assert.equal(new Set(palettes.map(channels => channels.join(','))).size, 3);
}

test('card colors come from clinician urgency, never queue rank or elapsed waiting', () => {
  assertSemanticPalette(URGENCIES.map(urgency => rgb(value(mapping(urgency), '--acute-card-rgb'))));
  assert.match(view, /<article className="acute-card" data-urgency=\{request\.urgency\}/);
  for (const rule of rules) {
    assert.doesNotMatch(rule.selector, /data-(?:queue|rank|position|wait|elapsed)|\.acute-card(?::nth-child|:nth-of-type)/);
    for (const declaration of rule.nodes.filter(node => node.type === 'decl' && node.prop === '--acute-card-rgb')) {
      assert.ok(rule.selector === '.acute-card' || rule.selector.includes('[data-urgency='), `Palette mapped to non-urgency selector: ${rule.selector}`);
    }
  }
});

test('the main glass surface layers semantic gradients above a translucent floor', () => {
  const main = ruleFor('.acute-card-main');
  const background = value(main, 'background');
  assert.match(background, /radial-gradient\(/);
  assert.match(background, /linear-gradient\(/);
  assert.match(background, /rgba\(var\(--acute-card-rgb\), var\(--acute-card-wash\)\)/);
  assert.match(background, /rgba\(var\(--acute-card-rgb\), var\(--acute-card-soft-wash\)\)/);
  assert.match(background, /transparent/);
  assert.match(background, /var\(--acute-card-floor\)/);
  for (const urgency of URGENCIES) {
    const alpha = rgba(value(mapping(urgency), '--acute-card-floor'))[3];
    assert.ok(alpha > 0 && alpha < 1, `${urgency} glass floor must not be opaque`);
  }
  assert.match(value(main, 'border'), /var\(--acute-card-edge\)/);
});

test('footer and the transparent concave action pocket retain a continuous semantic floor', () => {
  const footer = ruleFor('.acute-card-footer');
  const pocket = ruleFor('.acute-card-footer::before');
  const outline = ruleFor('.acute-card-footer::after');
  assert.equal(value(footer, 'background'), 'var(--acute-card-floor)');
  assert.match(value(footer, 'border'), /var\(--acute-card-edge\)/);
  assert.equal(value(footer, 'border-right-color'), 'transparent');
  assert.match(value(pocket, 'background'), /radial-gradient\(circle 32px at 100% 100%, transparent 31px/);
  assert.match(value(pocket, 'background'), /var\(--acute-card-edge\)/);
  assert.match(value(pocket, 'background'), /var\(--acute-card-floor\)/);
  assert.equal(value(pocket, 'pointer-events'), 'none');
  assert.match(value(outline, 'border-right'), /var\(--acute-card-edge\)/);
  assert.equal(value(ruleFor('.acute-card-hitarea'), 'background'), 'transparent');
  assert.equal(value(ruleFor('.acute-card-hitarea'), 'min-height'), '44px');
  assert.equal(value(footer, 'margin'), '0 72px 0 0');
});

test('light-phone color variants stay theme-gated and do not darken the light surface', () => {
  const lightCard = ruleFor(':root:not(.m-dark) .acute-card');
  assert.equal(lightCard.parent.type, 'atrule');
  assert.equal(lightCard.parent.name, 'media');
  assert.match(lightCard.parent.params, /max-width:\s*767px/);
  assertSemanticPalette(URGENCIES.map(urgency => rgb(value(mapping(urgency, true), '--acute-card-rgb'))));
  for (const urgency of URGENCIES) {
    const light = mapping(urgency, true);
    assert.match(light.parent.params, /max-width:\s*767px/);
    const [r, g, b, alpha] = rgba(value(light, '--acute-card-floor'));
    assert.ok(Math.min(r, g, b) > 200 && alpha > 0 && alpha < 1, `${urgency} phone floor stays pale and translucent`);
  }
  assert.ok(Number(value(lightCard, '--acute-card-wash')) < Number(value(ruleFor('.acute-card'), '--acute-card-wash')));
  assert.match(value(ruleFor(':root:not(.m-dark) .acute-module, :root:not(.m-dark) .acute-dialog'), '--acute-text'), /^#[0-9a-f]{6}$/i);
});

test('color treatment preserves reduced motion and mobile single-column geometry', () => {
  const reduced = rules.find(rule => rule.parent.type === 'atrule' && /prefers-reduced-motion:\s*reduce/.test(rule.parent.params));
  assert.ok(reduced);
  for (const property of ['transition', 'animation']) {
    const declaration = reduced.nodes.find(node => node.type === 'decl' && node.prop === property);
    assert.equal(declaration.value, 'none');
    assert.equal(declaration.important, true);
  }
  assert.doesNotMatch(css, /@keyframes/);
  const mobileGrid = rules.find(rule => rule.selector === '.acute-card-grid' && rule.parent.type === 'atrule' && /max-width:\s*900px/.test(rule.parent.params));
  assert.equal(value(mobileGrid, 'grid-template-columns'), 'minmax(0, 1fr)');
});

test('the design remains acute-scoped without modifying the global app canvas', () => {
  for (const rule of rules) {
    for (const selector of rule.selectors) assert.match(selector, /\.acute-[a-z-]+/, `Unscoped selector: ${selector}`);
    for (const declaration of rule.nodes.filter(node => node.type === 'decl')) {
      assert.doesNotMatch(declaration.prop, /^--(?:app-spatial-background|app-background|color-background|m-background)$/);
    }
  }
  assert.equal(value(ruleFor('.acute-module'), 'background'), undefined);
  assert.equal(value(ruleFor('.acute-card'), 'background'), undefined);
  assert.doesNotMatch(css, /url\(/); // No raster overlay or unrelated image background.
});
