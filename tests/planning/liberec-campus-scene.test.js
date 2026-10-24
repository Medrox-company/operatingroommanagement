import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import ts from 'typescript';

const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const campus = {};
const directory = {};
new Function('exports', transpile(readFileSync(new URL('../../lib/liberec-campus-directory.ts', import.meta.url), 'utf8')))(directory);
new Function('exports', 'require', transpile(readFileSync(new URL('../../lib/liberec-campus.ts', import.meta.url), 'utf8')))(campus, name => {
  assert.equal(name, './liberec-campus-directory');
  return directory;
});
const sceneSource = readFileSync(new URL('../../lib/liberec-campus-scene.ts', import.meta.url), 'utf8');
const sceneModule = {};
new Function('exports', 'require', transpile(sceneSource))(sceneModule, name => {
  if (name === 'three') return THREE;
  if (name === './liberec-campus') return campus;
  throw new Error(`Unexpected campus scene dependency: ${name}`);
});
const { createCampusScene } = sceneModule;
const { CAMPUS_BUILDINGS, CAMPUS_MAP_WIDTH, CAMPUS_MAP_HEIGHT } = campus;
const approximately = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: ${actual} ≈ ${expected}`);
const withScene = callback => {
  const scene = createCampusScene();
  try { callback(scene); } finally { scene.dispose(); }
};
const outlinesFor = scene => scene.root.children.filter(object => object instanceof THREE.LineSegments);

test('dark-glass scene retains all 22 official selectable footprints and illustrative heights', () => {
  withScene(scene => {
    assert.deepEqual([...scene.meshes.keys()], CAMPUS_BUILDINGS.map(building => building.id));
    assert.equal(scene.meshes.size, 22);
    assert.equal(scene.anchors.size, 22);
    for (const building of CAMPUS_BUILDINGS) {
      const mesh = scene.meshes.get(building.id);
      assert.ok(mesh instanceof THREE.Mesh, building.id);
      assert.ok(mesh.geometry instanceof THREE.ExtrudeGeometry, building.id);
      assert.equal(mesh.parent, scene.root, building.id);
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox;
      const xs = building.points.map(([x]) => (x - CAMPUS_MAP_WIDTH / 2) / 10);
      const zs = building.points.map(([, y]) => (y - CAMPUS_MAP_HEIGHT / 2) / 10);
      approximately(bounds.min.x, Math.min(...xs), `${building.id}: minimum x`);
      approximately(bounds.max.x, Math.max(...xs), `${building.id}: maximum x`);
      approximately(bounds.min.z, Math.min(...zs), `${building.id}: minimum z`);
      approximately(bounds.max.z, Math.max(...zs), `${building.id}: maximum z`);
      approximately(bounds.min.y, 0, `${building.id}: base height`);
      approximately(bounds.max.y, building.height / 10, `${building.id}: illustrative extrusion height`);
      assert.ok([...mesh.geometry.getAttribute('position').array].every(Number.isFinite), building.id);
      const anchor = scene.anchors.get(building.id);
      assert.ok([anchor.x, anchor.y, anchor.z].every(Number.isFinite), building.id);
      assert.ok(anchor.y > bounds.max.y + mesh.position.y, `${building.id}: label is above roof`);
    }
  });
});

test('building surfaces use the original translucent icy glass instead of opaque status-colored blocks', () => {
  withScene(scene => {
    for (const [id, mesh] of scene.meshes) {
      const material = mesh.material;
      assert.ok(material instanceof THREE.MeshStandardMaterial, id);
      assert.equal(material.color.getHex(), 0x8ccfff, id);
      assert.equal(material.transparent, true, id);
      assert.equal(material.depthWrite, false, id);
      assert.equal(material.side, THREE.DoubleSide, id);
      assert.ok(material.opacity > 0 && material.opacity < .3, id);
      assert.equal(material.roughness, .06, id);
      assert.equal(material.metalness, .25, id);
    }
    const outlines = outlinesFor(scene);
    assert.equal(outlines.length, CAMPUS_BUILDINGS.length);
    for (const outline of outlines) {
      assert.ok(outline.geometry instanceof THREE.EdgesGeometry);
      assert.equal(outline.material.color.getHex(), 0x4f86c9);
      assert.equal(outline.material.transparent, true);
    }
  });
});

test('selection highlights only the selected outline and glass without changing map geometry or source data', () => {
  const sourceBefore = JSON.stringify(CAMPUS_BUILDINGS);
  withScene(scene => {
    const outlines = outlinesFor(scene);
    const geometryBefore = new Map([...scene.meshes].map(([id, mesh]) => [id, {
      geometry: mesh.geometry,
      positions: [...mesh.geometry.getAttribute('position').array],
      position: mesh.position.clone(),
    }]));
    scene.select('B');
    for (const [index, building] of CAMPUS_BUILDINGS.entries()) {
      const mesh = scene.meshes.get(building.id);
      const selected = building.id === 'B';
      assert.equal(outlines[index].material.color.getHex(), selected ? 0xa6edff : 0x4f86c9, building.id);
      assert.equal(outlines[index].material.opacity, selected ? 1 : .65, building.id);
      assert.equal(mesh.material.opacity, selected ? .28 : .16, building.id);
      assert.equal(mesh.material.emissiveIntensity, selected ? .55 : .15, building.id);
      assert.equal(mesh.material.color.getHex(), 0x8ccfff, `${building.id}: glass tint is not a clinical status`);
      const before = geometryBefore.get(building.id);
      assert.equal(mesh.geometry, before.geometry, building.id);
      assert.deepEqual([...mesh.geometry.getAttribute('position').array], before.positions, building.id);
      assert.ok(mesh.position.equals(before.position), building.id);
    }
    scene.select('A');
    assert.equal(outlines[0].material.color.getHex(), 0xa6edff);
    assert.equal(outlines[1].material.color.getHex(), 0x4f86c9, 'previous selection is restored');
    scene.select('not-an-official-building');
    assert.ok(outlines.every(outline => outline.material.color.getHex() === 0x4f86c9), 'unknown selection does not fabricate a building');
    assert.equal(JSON.stringify(CAMPUS_BUILDINGS), sourceBefore);
  });
});

test('pickable scene metadata contains only official building IDs, never inferred clinical room assignments', () => {
  withScene(scene => {
    const officialIds = new Set(CAMPUS_BUILDINGS.map(building => building.id));
    let identifiedObjects = 0;
    scene.root.traverse(object => {
      const keys = Object.keys(object.userData);
      if (keys.length) {
        assert.deepEqual(keys, ['buildingId']);
        assert.ok(officialIds.has(object.userData.buildingId));
        assert.equal(scene.meshes.get(object.userData.buildingId), object);
        identifiedObjects += 1;
      }
    });
    assert.equal(identifiedObjects, 22);
    assert.doesNotMatch(sceneSource, /\b(?:roomId|roomIds|patientId|staffId|hospitalId|clinicalStatus)\b/);
  });
});

test('scene disposal releases every unique geometry and material exactly once and clears retained maps', () => {
  const scene = createCampusScene();
  const resources = new Set();
  scene.root.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    if (object.material) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) resources.add(material);
    }
  });
  assert.ok(resources.size > 22 * 2, 'includes foundations, outlines, terrain and ground resources');
  const disposalCounts = new Map();
  for (const resource of resources) {
    disposalCounts.set(resource, 0);
    resource.addEventListener('dispose', () => disposalCounts.set(resource, disposalCounts.get(resource) + 1));
  }
  scene.select('B');
  scene.dispose();
  assert.equal(scene.root.children.length, 0);
  assert.equal(scene.meshes.size, 0);
  assert.equal(scene.anchors.size, 0);
  for (const resource of resources) assert.equal(disposalCounts.get(resource), 1, `${resource.type ?? resource.constructor.name}: disposed once`);
  assert.doesNotThrow(() => scene.select('A'), 'selection cannot retain disposed mesh resources');
  assert.doesNotThrow(() => scene.dispose(), 'cleanup is safe when called again');
  for (const resource of resources) assert.equal(disposalCounts.get(resource), 1, `${resource.type ?? resource.constructor.name}: not disposed twice`);
});
