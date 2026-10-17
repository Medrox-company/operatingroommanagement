import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = postcss.parse(read('components/mobile/mobile-orbit-more.css'));
const declarations = selector => {
  const values = {};
  css.walkRules(rule => {
    if (rule.selectors.includes(`html[data-app-design="cliniq"] ${selector}`)) {
      rule.walkDecls(decl => { values[decl.prop] = decl.value; });
    }
  });
  return values;
};

test('More appearance is confined to optional Cliniq and the mobile viewport', () => {
  let count = 0;
  css.walkRules(rule => {
    count++;
    for (const selector of rule.selectors) {
      assert.match(selector, /^html\[data-app-design="cliniq"\] \.mobile-(?:nav-more-sheet|more-)/);
    }
    let parent = rule.parent;
    while (parent && !(parent.type === 'atrule' && parent.name === 'media'
      && /max-width:\s*767px/.test(parent.params))) parent = parent.parent;
    assert.ok(parent, `${rule.selector} must remain mobile-only`);
  });
  assert.ok(count > 10);
  assert.ok(read('components/MobileNav.tsx').includes("import './mobile/mobile-orbit-more.css'"));
});

test('More shares room-detail artwork and keeps only the background frosted', () => {
  assert.match(declarations('.mobile-nav-more-sheet').background, /mobile-orbit-background-v3\.png/);
  assert.equal(declarations('.mobile-more-group > button')['backdrop-filter'], 'blur(9px)');
  assert.equal(declarations('.mobile-more-group > button')['-webkit-backdrop-filter'], 'blur(9px)');
  css.walkDecls('filter', () => assert.fail('Do not blur menu contents'));
  assert.equal(declarations('.mobile-more-icon')['border-radius'], '50%');
  assert.equal(declarations('.mobile-more-icon').color, '#100C62');
});

test('More retains reachable touch targets, safe-area scrolling, active and keyboard states', () => {
  assert.ok(parseInt(declarations('.mobile-more-group > button')['min-height']) >= 44);
  assert.match(declarations('.mobile-nav-more-sheet')['max-height'], /100dvh.*safe-area-inset-top/);
  assert.match(declarations('.mobile-nav-more-sheet > div:last-child').padding, /safe-area-inset-bottom/);
  assert.equal(declarations('.mobile-nav-more-sheet > div:last-child')['min-height'], '0');
  assert.ok(declarations('.mobile-more-group > button[aria-current="page"]').background);
  assert.ok(declarations('.mobile-nav-more-sheet button:focus-visible').outline);
});
