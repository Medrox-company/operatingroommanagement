import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const source = readFileSync(new URL('../../components/LoginPage.tsx', import.meta.url), 'utf8');
const css = postcss.parse(readFileSync(new URL('../../components/login-orbit.css', import.meta.url), 'utf8'));
function declarations(selector) {
  const values = {};
  css.walkRules(rule => { if (rule.selectors.includes(selector)) rule.walkDecls(d => { values[d.prop] = d.value; }); });
  return values;
}
test('Orbit is limited to mobile while desktop retains its original login design', () => {
  assert.match(source, /login-orbit mobile-login-page/);
  assert.match(source, /login-desktop-page app-module-background/);
  assert.doesNotMatch(source, /className="login-orbit login-orbit-desktop/);
  assert.doesNotMatch(source, /localStorage\.setItem\(['"]or-app-design/);
  css.walkRules(rule => assert.ok(rule.selectors.every(selector => selector.startsWith('.login-orbit') || selector.startsWith('.login-hospital-') || selector.startsWith('.login-desktop-page .login-hospital-trigger')), rule.selector));
});

test('smaller role glyphs keep large targets and hospital menu supports wrapped labels', () => {
  assert.equal(declarations('.login-orbit.login-orbit .login-role-icon svg').width, '22px');
  assert.equal(declarations('.login-orbit.login-orbit .mobile-login-role')['min-height'], '54px');
  assert.equal(declarations('.login-hospital-option')['min-height'], '54px');
  assert.match(source, /HospitalMenu.Portal/);
  assert.match(source, /HospitalMenu.ItemIndicator/);
  assert.match(source, /disabled=\{hospitalsLoading \|\| hospitals.length === 0\}/);
});

test('role tiles are translucent with white ink and redundant visible headings are removed', () => {
  const tiles = declarations('.login-orbit.login-orbit :is(.mobile-login-role, .login-role-tile)');
  assert.equal(tiles.color, '#FFFFFF');
  assert.match(tiles.background, /rgba\(202, 199, 255, .08\)/);
  assert.doesNotMatch(source, />Vaše role</);
  for (const id of ['login-hospital', 'desktop-role-hospital']) {
    assert.ok(source.includes(`<label htmlFor="${id}" className="sr-only">Zdravotnické zařízení</label>`));
  }
});
test('login reuses Orbit artwork, neutral glass and lavender controls independent of legacy light/dark', () => {
  const tokens = declarations('.login-orbit.login-orbit.login-orbit');
  assert.equal(tokens['color-scheme'], 'dark');
  assert.equal(tokens['--orbit-login-glass'], 'rgba(146, 141, 190, .08)');
  assert.equal(tokens['--orbit-login-lavender'], 'linear-gradient(165deg, #EEECFF 0%, #C8C9FF 48%, #B9BFFF 100%)');
  assert.match(declarations('.login-orbit.login-orbit.mobile-login-page').background, /mobile-login-surgery\.webp/);
  const detail = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-room-orbit.css', import.meta.url), 'utf8'));
  for (const [login, room] of [['glass', 'glass-surface'], ['lavender', 'action-surface'], ['glass-shadow', 'glass-shadow'], ['action-border', 'action-border'], ['action-shadow', 'action-shadow']]) {
    let reference;
    detail.walkDecls(`--mrd-orbit-${room}`, declaration => { reference = declaration.value; });
    assert.equal(tokens[`--orbit-login-${login}`], reference, `Login must match room detail ${room}`);
  }
});
test('login retains visible focus, reduced motion and full-width fifth mobile role', () => {
  assert.equal(declarations('.login-orbit.login-orbit :is(button, input, select):focus-visible').outline, '2px solid #D5D0FF');
  assert.equal(declarations('.login-orbit.login-orbit .mobile-login-role:last-child')['grid-column'], '1 / -1');
  assert.equal(declarations('.login-orbit.login-orbit .mobile-login-field')['font-size'], '16px');
  assert.match(css.toString(), /prefers-reduced-motion: reduce/);
});
