import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const base = new URL('../../public/planning/vendor/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('three-r128-manifest.json', base), 'utf8'));
const runtime = readFileSync(new URL('three-r128-runtime.txt', base), 'utf8');
const helperSource = readFileSync(new URL('../../lib/operativity-three-assets.ts', import.meta.url), 'utf8');
const exports = {};
new Function('exports', ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports);

test('the local classic Three.js runtime matches the pinned version, manifest and license', () => {
  const sha256 = value => createHash('sha256').update(value).digest('hex');
  assert.equal(manifest.version, '0.128.0');
  assert.equal(manifest.revision, '128');
  assert.equal(manifest.license, 'MIT');
  assert.equal(manifest.runtime.bytes, Buffer.byteLength(runtime));
  assert.equal(sha256(runtime), manifest.runtime.sha256);
  assert.equal(manifest.runtime.sha256, exports.OPERATIVITY_THREE_RUNTIME_SHA256);
  assert.equal(exports.OPERATIVITY_THREE_RUNTIME_URL, '/planning/vendor/three-r128-runtime.txt');
  assert.equal(exports.OPERATIVITY_THREE_RUNTIME_VERSION, manifest.version);
  const license = readFileSync(new URL(manifest.licenseFile.file, base), 'utf8');
  assert.equal(sha256(license), manifest.licenseFile.sha256);
  assert.match(license, /Permission is hereby granted/);
  assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS"/);
  for (const [index, entry] of manifest.sources.entries()) {
    const marker = `\n/* Vendored three@0.128.0: ${entry.path} */\n`;
    const next = manifest.sources[index + 1];
    const start = runtime.indexOf(marker) + marker.length;
    const end = next ? runtime.indexOf(`\n/* Vendored three@0.128.0: ${next.path} */\n`) : runtime.length;
    const original = runtime.slice(start, end - 3);
    assert.equal(Buffer.byteLength(original), entry.bytes, entry.path);
    assert.equal(sha256(original), entry.sha256, entry.path);
  }
});

test('all original 3D postprocessing constructors load in order without a DOM or network', () => {
  const context = vm.createContext({ console });
  new vm.Script(runtime).runInContext(context, { timeout: 5000 });
  const THREE = context.THREE;
  assert.equal(THREE.REVISION, '128');
  for (const name of ['Pass', 'FullScreenQuad', 'ShaderPass', 'EffectComposer', 'RenderPass', 'UnrealBloomPass']) {
    assert.equal(typeof THREE[name], 'function', name);
  }
  assert.ok(THREE.CopyShader.uniforms.tDiffuse);
  assert.ok(THREE.LuminosityHighPassShader.uniforms.luminosityThreshold);
  const renderer = { getSize: target => target.set(640, 480), getPixelRatio: () => 1 };
  const composer = new THREE.EffectComposer(renderer);
  const renderPass = new THREE.RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(640, 480), 0.6, 0.4, 0.85);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  assert.equal(composer.passes.length, 2);
  assert.ok(bloomPass instanceof THREE.Pass);
  bloomPass.dispose();
  composer.renderTarget1.dispose();
  composer.renderTarget2.dispose();
  assert.doesNotMatch(runtime, /<\/script/i, 'the reviewed asset cannot terminate its containing script');
});

test('host validation accepts the exact runtime and rejects changed or empty data', async () => {
  assert.ok(globalThis.crypto?.subtle ?? webcrypto.subtle);
  assert.equal(await exports.validateOperativityThreeRuntime(runtime), runtime);
  await assert.rejects(exports.validateOperativityThreeRuntime(runtime + '\n'), /Kontrola knihovny/);
  await assert.rejects(exports.validateOperativityThreeRuntime(''), /není dostupná/);
});
