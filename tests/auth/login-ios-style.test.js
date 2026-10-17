import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';
import ts from 'typescript';

// Presentation contracts complement login-role-ui.test.js, which exercises
// the actual component's form handlers with inert auth/network adapters.
// These checks never load production credentials or submit a real login.
const source = readFileSync(new URL('../../components/LoginPage.tsx', import.meta.url), 'utf8');
const stylesheet = postcss.parse(readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8'));
const tree = ts.createSourceFile('LoginPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function rulesFor(selector) {
  const result = [];
  stylesheet.walkRules(rule => {
    if (rule.selectors.includes(selector)) result.push(rule);
  });
  assert.ok(result.length, `Missing actual presentation rule: ${selector}`);
  return result;
}

function declarationsFor(selector) {
  const result = {};
  for (const rule of rulesFor(selector)) {
    for (const node of rule.nodes) {
      if (node.type === 'decl') result[node.prop] = node.value;
    }
  }
  return result;
}

const light = declarationsFor('.mobile-login-page');
const dark = { ...light, ...declarationsFor('.m-dark .mobile-login-page') };

function rgb(value) {
  assert.match(value, /^#[\da-f]{6}$/i, `Expected a concrete, auditable sRGB token, got ${value}`);
  return value.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
}

function resolve(value, tokens) {
  const variable = value.match(/^var\((--[\w-]+)\)$/);
  return rgb(variable ? tokens[variable[1]] : value);
}

const mix = (foreground, background, alpha) => foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
function luminance(color) {
  const linear = color.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}

function contrast(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

function assertContrast(foreground, background, minimum, context) {
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= minimum, `${context}: ${ratio.toFixed(3)}:1 is below ${minimum}:1`);
}

function openingElements() {
  const result = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return result;
}

function attribute(node, name) {
  return node.attributes.properties.find(property => ts.isJsxAttribute(property) && property.name.getText(tree) === name);
}

function stringAttribute(node, name) {
  const value = attribute(node, name)?.initializer;
  return value && ts.isStringLiteral(value) ? value.text : undefined;
}

function elementById(id) {
  const result = openingElements().find(node => stringAttribute(node, 'id') === id);
  assert.ok(result, `Missing actual JSX element #${id}`);
  return result;
}

function isReducedMotionRule(rule) {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'atrule' && parent.name === 'media' && /prefers-reduced-motion:\s*reduce/.test(parent.params)) return true;
    parent = parent.parent;
  }
  return false;
}

test('mobile iOS role icons override the pale desktop glyph without changing the shared desktop rule', () => {
  const selector = '.mobile-login-page .login-role-icon';
  const actual = declarationsFor(selector);
  assert.equal(actual.color, 'var(--login-role-icon)');
  assert.equal(actual.opacity, '1', 'Pale semi-transparent desktop glyphs must not return on white cards');
  assert.equal(actual.filter, 'none');
  assert.equal(actual.width, '44px');
  assert.equal(actual.height, '44px');
  assert.equal(declarationsFor('.login-role-icon').color, '#e2e9ed', 'Dark desktop icons retain their existing palette');
  assert.ok(rulesFor(selector).every(rule => rule.selectors.every(value => value.startsWith('.mobile-login-page '))));
  assert.ok(rulesFor(selector).at(-1).source.start.line > rulesFor('.login-role-icon').at(-1).source.start.line,
    'The scoped correction must be emitted after the shared desktop default');
});

for (const [theme, tokens] of [['light', light], ['dark', dark]]) {
  test(`${theme} iOS role glyphs meet icon contrast on every actual role tint and fallback`, () => {
    const actual = declarationsFor('.mobile-login-page .login-role-icon');
    const backgrounds = rulesFor('.mobile-login-page .login-role-icon').flatMap(rule => rule.nodes)
      .filter(node => node.type === 'decl' && node.prop === 'background').map(node => node.value);
    assert.ok(backgrounds.length >= 2, 'A concrete fallback must precede the color-mix enhancement');
    assert.equal(backgrounds[0], 'var(--login-role-icon-bg)');
    const formula = backgrounds.at(-1).match(/^color-mix\(in srgb, var\(--login-role-tone, var\(--login-role-icon\)\)\s+([\d.]+)%, var\(--login-role\)\s+([\d.]+)%\)$/);
    assert.ok(formula, 'Read the actual tint proportions instead of assuming a former card color');
    const strength = Number(formula[1]) / 100;
    assert.equal(Number(formula[1]) + Number(formula[2]), 100);
    const roleBlock = source.slice(source.indexOf('const QUICK_ROLES'), source.indexOf('const GoogleMark'));
    const tones = [...roleBlock.matchAll(/tone:\s*'(#[\da-f]{6})'/gi)].map(match => match[1]);
    assert.equal(tones.length, 5, 'All real roles remain in the contrast check');
    const foreground = resolve(actual.color, tokens);
    const card = resolve('var(--login-role)', tokens);
    for (const tone of [...tones, tokens['--login-role-icon']]) {
      assertContrast(foreground, mix(rgb(tone), card, strength), 3, `${theme} role glyph on ${tone}`);
    }
    assertContrast(foreground, rgb(tokens['--login-role-icon-bg']), 3, `${theme} fallback glyph`);
  });

  test(`${theme} mobile text, fields, secondary access and errors retain readable contrast`, () => {
    const surfaces = [tokens['--login-role'], tokens['--login-field'], tokens['--login-option-bg']];
    if (theme === 'light') {
      const stops = [...tokens['--login-bg'].matchAll(/#[\da-f]{6}/gi)].map(match => match[0]);
      assert.ok(stops.length >= 2, 'The light background keeps its soft grey-to-white transition');
      surfaces.push(...stops);
    }
    for (const token of ['--login-title', '--login-copy', '--login-muted']) {
      for (const surface of surfaces) assertContrast(rgb(tokens[token]), rgb(surface), 4.5, `${theme} ${token} on ${surface}`);
    }
    for (const selector of ['.mobile-login-title', '.mobile-login-role', '.mobile-login-label', '.mobile-login-footer', '.mobile-login-subtitle', '.mobile-login-selected-title', '.mobile-login-selected-hospital']) {
      assert.match(declarationsFor(selector).color, /^var\(--login-(?:title|copy|muted)\)$/, `${selector} uses the audited text palette`);
    }
    assert.equal(declarationsFor('.mobile-login-field-icon').color, 'var(--login-field-icon)');
    assertContrast(rgb(tokens['--login-field-icon']), rgb(tokens['--login-field']), 3, `${theme} field icons`);
    assertContrast(rgb(tokens['--login-field-text']), rgb(tokens['--login-field']), 4.5, `${theme} field value and Google access`);
    assertContrast(rgb(tokens['--login-field-text']), rgb(tokens['--login-role-icon-bg']), 4.5, `${theme} selected native option`);
    assert.equal(declarationsFor('.mobile-login-google').color, 'var(--login-field-text)');
    assert.equal(declarationsFor('.mobile-login-google').background, 'var(--login-field)');
    const error = { ...declarationsFor('.mobile-login-error'), ...(theme === 'dark' ? declarationsFor('.m-dark .mobile-login-error') : {}) };
    assertContrast(rgb(error.color), rgb(error.background), 4.5, `${theme} authentication error`);
  });
}

test('only the mobile native hospital picker inherits the matching light or dark palette', () => {
  assert.equal(light['color-scheme'], 'light');
  assert.equal(dark['color-scheme'], 'dark');
  const mobileRule = rulesFor('.mobile-login-page .login-hospital-select').at(-1);
  const scheme = mobileRule.nodes.find(node => node.type === 'decl' && node.prop === 'color-scheme');
  assert.equal(scheme.value, 'inherit');
  assert.equal(scheme.important, true, 'Override the earlier shared desktop !important, not just the normal cascade');
  assert.equal(declarationsFor('.login-hospital-select')['color-scheme'], 'dark', 'The existing dark desktop menu is untouched');
  for (const selector of ['.mobile-login-page .login-hospital-select option', '.mobile-login-page .login-hospital-select optgroup']) {
    const declarations = declarationsFor(selector);
    assert.equal(declarations['background-color'], 'var(--login-option-bg)');
    assert.equal(declarations.color, 'var(--login-field-text)');
  }
  assert.match(source, /renderHospitalPicker\('login-hospital'/);
  assert.match(source, /renderHospitalPicker\('desktop-role-hospital'/);
  assert.match(source, /HospitalMenu.RadioGroup value=\{selectedHospitalId\}/);
});

test('iOS controls keep comfortable targets and full readable role names', () => {
  const passwordToggle = declarationsFor('.mobile-login-password-toggle');
  assert.ok(parseFloat(passwordToggle.width) >= 44);
  assert.ok(parseFloat(passwordToggle.height) >= 44);
  const toggle = declarationsFor('.mobile-login-theme-toggle');
  assert.ok(parseFloat(toggle['min-width']) >= 44);
  assert.ok(parseFloat(toggle['min-height']) >= 44);
  const role = declarationsFor('.mobile-login-role');
  assert.ok(parseFloat(role['min-height']) >= 116);
  assert.equal(role['min-width'], '0', 'Cards must be allowed to shrink within the phone grid');
  const label = declarationsFor('.mobile-login-role-label');
  assert.ok(parseFloat(label['font-size']) >= 14);
  assert.equal(label['overflow-wrap'], 'normal');
  assert.equal(label['word-break'], 'normal');
  const labelElement = openingElements().find(node => stringAttribute(node, 'className')?.split(/\s+/).includes('mobile-login-role-label'));
  assert.ok(labelElement);
  assert.doesNotMatch(stringAttribute(labelElement, 'className'), /truncate|line-clamp|whitespace-nowrap/);
  assert.equal(declarationsFor('.mobile-login-role-grid')['grid-template-columns'], 'repeat(3, minmax(0, 1fr))');
  const grid = rulesFor('.mobile-login-role-grid');
  assert.equal(grid[0].nodes.find(node => node.type === 'decl' && node.prop === 'grid-template-columns').value, 'repeat(2, minmax(0, 1fr))');
  assert.equal(grid.at(-1).parent.params, '(min-width: 540px)');
  assert.match(source, /mobile-login-field-icon mobile-login-password-toggle/);
});

test('keyboard focus and reduced-motion alternatives remain explicit and scoped to mobile login', () => {
  const focus = declarationsFor('.mobile-login-page :is(button, input, select):focus-visible');
  assert.equal(focus.outline, '3px solid var(--login-field-focus)');
  assert.equal(focus['outline-offset'], '3px');
  const transitionRule = rulesFor('.mobile-login-page :is(button, input, select)').find(isReducedMotionRule);
  assert.ok(transitionRule);
  assert.equal(transitionRule.nodes.find(node => node.type === 'decl' && node.prop === 'transition').value, 'none');
  for (const selector of ['.mobile-login-role:active:not(:disabled)', '.mobile-login-submit:active', '.mobile-login-google:active']) {
    const rule = rulesFor(selector).find(isReducedMotionRule);
    assert.ok(rule, `Missing reduced-motion alternative for ${selector}`);
    assert.equal(rule.nodes.find(node => node.type === 'decl' && node.prop === 'transform').value, 'none');
  }
  assert.ok(rulesFor('.mobile-login-aurora').some(rule => isReducedMotionRule(rule) && rule.nodes.some(node => node.prop === 'animation' && node.value === 'none')));
});

test('password view describes the selected real role and hospital without restoring a username field', () => {
  assert.match(source, /className="mobile-login-selected-title">\{activeRole\?\.label\}/);
  assert.match(source, /className="mobile-login-selected-hospital">\{hospitals\.find\(hospital => hospital\.id === selectedHospitalId\)\?\.hospital_name\}/);
  assert.match(source, /<div role="alert" className="mobile-login-error/);
  const inputs = openingElements().filter(node => node.tagName.getText(tree) === 'input');
  assert.equal(inputs.length, 2, 'Only the existing mobile and desktop password fields remain');
  for (const input of inputs) {
    assert.equal(stringAttribute(input, 'autoComplete'), 'current-password');
    assert.match(attribute(input, 'type').getText(tree), /showPassword\s*\?\s*'text'\s*:\s*'password'/);
    assert.doesNotMatch(stringAttribute(input, 'id'), /email|username/i);
  }
});
