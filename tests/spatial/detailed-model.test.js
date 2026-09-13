import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

function readGlb(name) {
  const bytes = readFileSync(new URL(`../../public/spatial/models/${name}`, import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const document = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  const binary = bytes.subarray(28 + jsonLength);
  return { bytes, document, image(index) {
    const view = document.bufferViews[document.images[index].bufferView];
    return binary.subarray(view.byteOffset, view.byteOffset + view.byteLength);
  } };
}

test('detailed room preserves source UI assets and shares one bounded AO atlas', () => {
  const source = readGlb('pcho-3.glb');
  const detailed = readGlb('pcho-3-detailed.glb');
  const doc = detailed.document;
  assert.ok(detailed.bytes.length < 6_000_000, 'detail model remains under 6 MB');
  const triangles = doc.meshes.flatMap(mesh => mesh.primitives).reduce((sum, primitive) => sum + doc.accessors[primitive.indices].count / 3, 0);
  assert.ok(triangles > 34_526 && triangles < 60_000, 'small bevels, not a high-poly replacement');
  const sourceNames = new Set(source.document.meshes.flatMap(mesh => mesh.primitives).map(primitive => source.document.materials[primitive.material].name));
  assert.deepEqual(new Set(doc.materials.map(material => material.name)), sourceNames);
  const occlusion = doc.materials.flatMap(material => material.occlusionTexture ? [material.occlusionTexture] : []);
  assert.equal(occlusion.length, 18);
  assert.equal(new Set(occlusion.map(texture => texture.index)).size, 1, 'one shared GPU AO texture');
  assert.ok(occlusion.every(texture => texture.texCoord === 1), 'AO never overwrites UI UV0');
  for (const mesh of doc.meshes) for (const primitive of mesh.primitives) {
    if (doc.materials[primitive.material].occlusionTexture) assert.ok(primitive.attributes.TEXCOORD_1 !== undefined);
  }
  for (const name of ['ui_tablet', 'ui_monitor', 'ui_routing']) {
    const before = source.document.materials.find(material => material.name === name).pbrMetallicRoughness.baseColorTexture;
    const after = doc.materials.find(material => material.name === name).pbrMetallicRoughness.baseColorTexture;
    assert.equal(after.texCoord ?? 0, 0);
    assert.ok(source.image(source.document.textures[before.index].source).equals(detailed.image(doc.textures[after.index].source)), `${name} image is unchanged`);
  }
});
