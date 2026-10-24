import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const source = readFileSync(new URL('../../components/LoginPage.tsx', import.meta.url), 'utf8');
const css = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-login-wheel.css', import.meta.url), 'utf8'));
function declarations(selector) {
  const values = {};
  css.walkRules(rule => {
    if (rule.selectors.includes(selector)) rule.walkDecls(d => { values[d.prop] = d.value; });
  });
  return values;
}

test('wheel styling cannot alter tablet or desktop login', () => {
  css.walkRules(rule => {
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media' && parent.params === '(max-width: 767px)')) parent = parent.parent;
    assert.ok(parent, `Not mobile scoped: ${rule.selector}`);
  });
  assert.match(source, /login-desktop-page app-module-background/);
  assert.doesNotMatch(css.toString(), /login-desktop-page|data-app-design|\.m-dark/);
});

test('subtle photo blur is isolated from sharp foreground controls', () => {
  const backdrop = declarations('.login-orbit.mobile-login-page.mobile-login-wheel-page::before');
  assert.equal(backdrop.filter, 'blur(3px) brightness(.85)');
  assert.equal(backdrop.background, 'inherit');
  assert.equal(backdrop['pointer-events'], 'none');
  assert.equal(backdrop['clip-path'], 'inset(0)');
  assert.equal(declarations('.login-orbit.mobile-login-page.mobile-login-wheel-page').filter, undefined);
  assert.equal(declarations('.mobile-login-wheel-page.login-orbit .mobile-login-main').filter, undefined);
});

test('five live role buttons keep hospital and authentication wiring', () => {
  const wheel = source.slice(source.indexOf('role="group" aria-label="Vyberte svou roli"'), source.indexOf('mobile-login-hospital-section'));
  assert.match(wheel, /QUICK_ROLES\.map/);
  assert.match(wheel, /onClick=\{\(\) => handleRoleSelect\(role.id\)\}/);
  assert.match(wheel, /disabled=\{isLoading \|\| !selectedHospitalId\}/);
  assert.match(wheel, /alt="" aria-hidden="true"/);
  assert.match(source, /mobile-login-brand-copy/);
  const selector = '.mobile-login-wheel-page.login-orbit .mobile-login-wheel-role';
  assert.equal(declarations(selector)['min-width'], '44px');
  assert.equal(declarations(selector)['min-height'], '44px');
  for (const role of ['admin', 'aro', 'cos', 'management', 'primar']) {
    const geometry = declarations(`.mobile-login-wheel-page .mobile-login-wheel-role[data-role='${role}']`);
    for (const axis of [['left', 'width'], ['top', 'height']]) {
      assert.ok(parseFloat(geometry[axis[0]]) >= 0);
      assert.ok(parseFloat(geometry[axis[0]]) + parseFloat(geometry[axis[1]]) <= 100);
    }
  }
});

test('role focus, reduced motion and readable password surfaces are explicit', () => {
  assert.match(declarations('.mobile-login-wheel-page.login-orbit .mobile-login-wheel-role:focus-visible').outline, /2px solid/);
  assert.match(css.toString(), /prefers-reduced-motion: reduce/);
  assert.match(css.toString(), /\.mobile-login-password-panel \.mobile-login-field/);
  assert.match(css.toString(), /\.login-hospital-menu:has\(\[data-picker-id='login-hospital'\]\)/);
});

test('decorative assets are local optimized WebP files, with no embedded labels', () => {
  const files = ['mobile-login-role-wheel.webp', 'mobile-login-theatre-blue.webp'];
  let total = 0;
  for (const file of files) {
    const path = new URL(`../../public/images/${file}`, import.meta.url);
    const bytes = readFileSync(path);
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
    total += statSync(path).size;
  }
  assert.ok(total < 200_000, `Mobile artwork payload is ${total} bytes`);
  assert.match(source, /<span className="mobile-login-role-label">\{role.id === 'admin' \? 'Admin' : role.label\}<\/span>/);
});

test('refined mobile wheel keeps white branding and centered sharp foreground', () => {
  assert.equal(declarations('.mobile-login-wheel-page .mobile-login-brand-mark').background, '#FFFFFF');
  const role = declarations('.mobile-login-wheel-page.login-orbit .mobile-login-wheel-role');
  assert.equal(role.display, 'grid');
  assert.equal(role['align-content'], 'center');
  assert.equal(role['justify-items'], 'center');
  assert.equal(role.opacity, undefined);
  assert.equal(role.filter, undefined);
  assert.equal(declarations('.mobile-login-wheel-page .mobile-login-wheel-art').opacity, '.78');
  assert.match(source, /aria-label=\{role.label\}/);
});

test('Management occupies the wider upper petal and password animation respects reduced motion', () => {
  const management = declarations(".mobile-login-wheel-page .mobile-login-wheel-role[data-role='management']");
  const admin = declarations(".mobile-login-wheel-page .mobile-login-wheel-role[data-role='admin']");
  assert.equal(management.top, '7%');
  assert.equal(management.width, '42%');
  assert.equal(admin.top, '65%');
  let reduced = false;
  css.walkAtRules('media', rule => {
    if (rule.params.includes('prefers-reduced-motion: reduce')) rule.walkDecls('animation', decl => { if (decl.value === 'none') reduced = true; });
  });
  assert.ok(reduced);
  assert.match(css.toString(), /mobile-login-password-enter 280ms/);
});
