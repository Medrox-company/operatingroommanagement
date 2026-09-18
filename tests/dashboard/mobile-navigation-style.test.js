import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../../components/mobile/mobile-navigation.css', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../../components/MobileNav.tsx', import.meta.url), 'utf8');

function declarationsFor(selector) {
  const declarations = {};
  css.walkRules((rule) => {
    if (rule.selector !== selector || rule.parent.params?.includes('prefers-reduced-motion')) return;
    rule.walkDecls((declaration) => { declarations[declaration.prop] = declaration.value; });
  });
  return declarations;
}

test('iOS navigation styles remain mobile-only, including reduced-motion overrides', () => {
  css.walkRules((rule) => {
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media' && parent.params.includes('max-width: 767px'))) parent = parent.parent;
    assert.ok(parent, `${rule.selector} must not alter desktop presentation`);
  });
});

test('tab bar preserves the 70px plus safe-area contract and native typography', () => {
  const bar = declarationsFor('.mobile-reference-nav');
  assert.equal(bar.height, 'calc(70px + env(safe-area-inset-bottom, 0px))');
  assert.equal(bar['min-height'], bar.height);
  assert.equal(bar['max-height'], bar.height);
  assert.equal(bar['box-sizing'], 'border-box');
  assert.equal(bar.background, 'var(--m-nav-bg)');
  assert.equal(bar['font-family'], 'var(--m-font-sans, var(--font-sans))');
  assert.ok(bar['backdrop-filter'].includes('blur('));
});

test('tab and close controls keep minimum 44px targets and readable labels', () => {
  const tab = declarationsFor('.mobile-reference-nav > button');
  const close = declarationsFor('.mobile-more-close');
  assert.ok(parseFloat(tab['min-width']) >= 44);
  assert.ok(parseFloat(tab['min-height']) >= 44);
  assert.ok(parseFloat(tab['font-size']) >= 10 && parseFloat(tab['font-size']) <= 11);
  assert.ok(parseFloat(close.width) >= 44 && parseFloat(close.height) >= 44);
});

test('More groups module rows without hiding logout and disables decorative motion on request', () => {
  assert.match(source, /moreItems\.length > 0 && <div className="mobile-more-group" role="group" aria-label="Další moduly">/);
  assert.match(source, /<button className="mobile-more-logout" type="button" disabled=\{loggingOut\}/);
  assert.match(source, /<ChevronRight className="mobile-more-chevron"[^>]*aria-hidden/);
  const logout = declarationsFor('.mobile-more-logout');
  assert.equal(logout.color, 'var(--mobile-more-danger)');
  let reducedMotion = false;
  css.walkAtRules('media', (media) => {
    if (!media.params.includes('prefers-reduced-motion: reduce')) return;
    const rules = media.nodes.filter((node) => node.type === 'rule');
    reducedMotion = rules.some((rule) => rule.selector.includes('.mobile-nav-more-sheet')
      && rule.nodes.some((node) => node.prop === 'transition' && node.value === 'none')
      && rule.nodes.some((node) => node.prop === 'animation' && node.value === 'none'));
  });
  assert.ok(reducedMotion);
});
