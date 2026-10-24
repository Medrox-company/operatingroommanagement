import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = postcss.parse(read('components/planning/operativity-workspace.module.css'));
const upstream = postcss.parse(read('public/planning/operativity-source.txt').match(/<style>([\s\S]*?)<\/style>/)[1]);
const host = read('components/OperativityPlanningWorkspace.tsx');
const declarations = (sheet, selector) => {
  const result = {};
  sheet.walkRules(rule => {
    if (rule.selector === selector) rule.walkDecls(declaration => { result[declaration.prop] = declaration.value; });
  });
  return result;
};

test('native planner surfaces use the original source palettes without redefining clinical tokens', () => {
  const mappings = { '--or-bg': '--bg', '--or-surface': '--surface', '--or-raised': '--raised', '--or-line': '--line', '--or-ink': '--ink', '--or-ink-2': '--ink-2', '--or-ink-3': '--ink-3', '--or-warn': '--warn', '--or-bad': '--bad' };
  for (const [nativeSelector, originalSelector] of [
    ['.workspace', ':root[data-ui="dark"]'],
    [":global(html[data-operativity-design='light']) .workspace", ':root'],
  ]) {
    const native = declarations(css, nativeSelector), original = declarations(upstream, originalSelector);
    for (const [local, source] of Object.entries(mappings)) assert.equal(native[local].toLowerCase(), original[source].toLowerCase(), `${local} retains ${originalSelector}`);
  }
  css.walkDecls(declaration => {
    if (declaration.prop.startsWith('--')) assert.ok(declaration.prop.startsWith('--or-'));
  });
});

test('iframe canvas color scheme tracks appearance to avoid an opaque white inner window in light mode', () => {
  for (const appearance of ['dark', 'light']) {
    const frame = declarations(css, `:global(html[data-operativity-design='${appearance}']) .frame`);
    assert.equal(frame['color-scheme'], appearance);
  }
  const canvas = postcss.parse(read('components/planning/operativity-canvas.css'));
  canvas.walkRules(rule => {
    if (rule.selector === 'html:has(.planner-rail:not(.planner-rail--collapsed)) .settings-module-wrapper') {
      assert.equal(rule.parent.params, '(min-width: 768px)');
      rule.walkDecls(d => { assert.equal(d.prop, 'padding-left'); assert.equal(d.value, '324px'); });
    } else {
      assert.match(rule.selector, /^html\[data-operativity-design="(?:light|dark)"\] \.app-module-background$/);
      rule.walkDecls(d => assert.equal(d.prop, 'background'));
    }
  });
});

test('native appearance is isolated, persistent, restored on unmount and does not grant frame privileges', () => {
  assert.match(host, /medrox-operativity-appearance:v1/);
  assert.match(host, /root\.setAttribute\('data-operativity-design', appearance\)/);
  assert.match(host, /if \(previous === null\) root\.removeAttribute\('data-operativity-design'\)/);
  assert.match(host, /theme: appearanceRef\.current/);
  assert.match(host, /event\.data\.theme === 'dark' \|\| event\.data\.theme === 'light'/);
  assert.match(host, /event\.source !== frame\.current\?\.contentWindow/);
  assert.match(host, /event\.data\.channel !== loaded\.channel/);
  assert.doesNotMatch(host, /sandbox="[^"]*(?:allow-same-origin|allow-top-navigation)/);
});

test('graphics are fetched locally and integrity checked before building the initialized frame', () => {
  assert.match(host, /get\(OPERATIVITY_THREE_RUNTIME_URL, true\)\.then\(validateOperativityThreeRuntime\)/);
  assert.match(host, /buildOperativityFrame\(source, \{ threeRuntime \}\)/);
  assert.match(host, /Promise\.all\(\[/);
});
