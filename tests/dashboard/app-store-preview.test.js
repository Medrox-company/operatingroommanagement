import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const config = read('vite.mobile.config.ts');
const productionEntry = read('mobile/main.tsx');
const previewEntry = read('mobile/preview-main.tsx');
const preview = read('mobile/AppStorePreview.tsx');
const css = postcss.parse(read('mobile/app-store-preview.css'));

test('App Store preview is selected only by the explicit compile-time build flag', () => {
  assert.match(config, /VITE_APP_STORE_PREVIEW\s*===\s*'1'/);
  assert.match(config, /'\/main\.tsx'.*preview-main\.tsx/s);
  assert.match(config, /publicDir:\s*appStorePreview\s*\?\s*false/s);
  assert.doesNotMatch(productionEntry, /AppStorePreview|VITE_APP_STORE_PREVIEW|preview-main/);
  assert.match(previewEntry, /AppStorePreview/);
  assert.doesNotMatch(previewEntry, /from ['"]\.\.\/App['"]|native-api|AuthProvider|Supabase|supabase/);
});

test('preview contains six deterministic query-addressable screenshot states', () => {
  for (const screen of ['overview', 'detail', 'spatial', 'timeline', 'statistics', 'overview-light']) {
    assert.ok(preview.includes(`'${screen}'`), `Missing preview screen: ${screen}`);
  }
  assert.match(preview, /URLSearchParams\(window\.location\.search\)\.get\('screen'\)/);
  assert.match(preview, /data-screen=\{screen\}/);
  assert.match(preview, /15\. 9\. 2026/);
});

test('preview is synthetic and cannot touch production data or authentication', () => {
  assert.doesNotMatch(preview, /fetch\s*\(|supabase|updateOperatingRoom|recordStatusEvent|localStorage|sessionStorage|\/api\//i);
  assert.doesNotMatch(previewEntry, /fetch\s*\(|supabase|installNativeApiBridge|captureNativeGoogleCallback/i);
});

test('screenshot canvas is viewport-contained and has phone, tablet and short-height layouts', () => {
  const media = [];
  let canvasHidden = false;
  css.walkAtRules('media', rule => media.push(rule.params));
  css.walkRules(rule => {
    if (rule.selector !== '.asp-preview-root') return;
    const declarations = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
    canvasHidden ||= declarations.height === '100dvh' && declarations.overflow === 'hidden';
  });
  assert.equal(canvasHidden, true);
  assert.ok(media.some(value => /min-width:\s*768px/.test(value)), 'Missing tablet layout');
  assert.ok(media.some(value => /max-height:\s*720px/.test(value)), 'Missing short phone layout');
  assert.match(preview, /grid-template-columns|asp-room-grid/);
});
