import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const source = readFileSync(new URL('../../components/SettingsPage.tsx', import.meta.url), 'utf8');
const css = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-settings.css', import.meta.url), 'utf8'));

function declarationsFor(selector) {
  const declarations = {};
  css.walkRules(rule => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(declaration => { declarations[declaration.prop] = declaration.value; });
  });
  return declarations;
}

test('Settings presentation rules are phone-only and do not override carousel transforms', () => {
  css.walkRules(rule => {
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('max-width: 767px'))) parent = parent.parent;
    assert.ok(parent, `${rule.selector} must not affect desktop`);
    rule.walkDecls(declaration => {
      assert.ok(!['transform', 'opacity', 'filter', 'pointer-events'].includes(declaration.prop), `${declaration.prop} belongs to carousel positioning, not card styling`);
    });
  });
});

test('both mobile landing modes reuse MobileHeader and selected administration modules are excluded', () => {
  assert.equal((source.match(/<MobileHeader kicker="Konfigurace systému" title="Nastavení" right=\{viewToggle\} \/>/g) || []).length, 2);
  assert.match(source, /data-settings-landing=\{selectedModule \? undefined : landingView\}/);
  assert.match(source, /<header className="mb-7 hidden md:block">/);
  const wrapper = declarationsFor('.settings-page-root[data-settings-landing="grid"] > .settings-module-wrapper');
  assert.equal(wrapper.padding, 'calc(18px + env(safe-area-inset-top, 0px)) 20px calc(20px + env(safe-area-inset-bottom, 0px))');
});

test('mobile grid and carousel cards share 20px surfaces and top-left 17px semibold titles', () => {
  for (const selector of ['.settings-grid-card', '.settings-carousel-card']) {
    const card = declarationsFor(selector);
    assert.equal(card['border-radius'], '20px');
    assert.equal(card.padding, '16px');
    assert.equal(card.background, 'var(--m-card)');
  }
  const title = declarationsFor('.settings-card-title');
  assert.equal(title['font-size'], '17px');
  assert.equal(title['font-weight'], '600');
  assert.equal(title['text-align'], 'left');
  assert.equal(declarationsFor('.settings-carousel-card .settings-card-title').order, '-1');
  assert.equal(declarationsFor('.settings-carousel-icon').color, 'var(--m-muted)');
  assert.equal(declarationsFor('.settings-carousel-card[aria-current="true"] .settings-carousel-icon').color, 'var(--settings-accent)');
});

test('module access, grid filtering, view switching and carousel input handlers remain intact', () => {
  assert.match(source, /if \(item.id === 'settings'\) return canViewSystemSettings/);
  assert.match(source, /return permissionId \? hasSubmoduleAccess\(permissionId\) : false/);
  assert.match(source, /onClick=\{\(\) => setLandingView\(value\)\}/);
  assert.match(source, /if \(group !== 'all' && item.group !== group\) return false/);
  assert.match(source, /onClick=\{\(\) => isActive \? setSelectedModule\(setting.id\) : goToModule\(index\)\}/);
  assert.match(source, /onKeyDown=\{/);
  assert.match(source, /onWheel=\{/);
  assert.match(source, /onPointerUp=\{/);
  assert.match(source, /transform: `translate3d\(/);
});
