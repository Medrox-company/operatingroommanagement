import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/liberec-campus-equipment.ts', import.meta.url), 'utf8');
const equipment = {};
new Function('exports', 'require', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(equipment, name => {
  assert.equal(name, 'three', 'equipment has no DOM, data or external asset dependency');
  return THREE;
});
const factories = [
  ['hospitalBed', equipment.createHospitalBed, 'hospital-bed'],
  ['operatingTheatre', equipment.createOperatingTheatre, 'operating-theatre'],
  ['departmentMarker', equipment.createDepartmentMarker, 'department-marker'],
];
const resourcesOf = root => {
  const resources = [];
  root.traverse(object => {
    if (object.geometry) resources.push(object.geometry);
    if (object.material) resources.push(...(Array.isArray(object.material) ? object.material : [object.material]));
  });
  return resources;
};
const dispose = root => { for (const resource of resourcesOf(root)) resource.dispose(); root.clear(); };

for (const [key, create, kind] of factories) {
  test(`${key} is finite, centered, floor-based and inside its declared placement envelope`, () => {
    const root = create();
    try {
      assert.ok(root instanceof THREE.Group);
      assert.deepEqual(root.userData, { equipmentKind: kind, schematic: true });
      const bounds = new THREE.Box3().setFromObject(root);
      const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
      const envelope = equipment.EQUIPMENT_FOOTPRINTS[key];
      assert.ok(Math.abs(center.x) < 1e-6 && Math.abs(center.z) < 1e-6, 'centered on x/z');
      assert.ok(Math.abs(bounds.min.y) < 1e-6, 'rests exactly on floor');
      assert.ok(size.x > 0 && size.x <= envelope.width, 'bounded width');
      assert.ok(size.z > 0 && size.z <= envelope.depth, 'bounded depth');
      assert.ok(size.y > 0 && size.y <= envelope.height, 'bounded height');
      let meshes = 0;
      root.traverse(object => {
        assert.ok(object.matrixWorld.elements.every(Number.isFinite));
        if (object.isMesh) meshes += 1;
        if (object.geometry) {
          for (const attribute of Object.values(object.geometry.attributes)) assert.ok([...attribute.array].every(Number.isFinite));
          const index = object.geometry.getIndex();
          if (index) assert.ok([...index.array].every(value => value < object.geometry.getAttribute('position').count));
        }
        if (object.material) {
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            assert.ok([material.opacity, material.color.r, material.color.g, material.color.b].every(Number.isFinite));
            assert.equal(material.map, null, 'no external or canvas texture');
            if (material.isMeshStandardMaterial) assert.ok([material.roughness, material.metalness].every(Number.isFinite));
          }
        }
      });
      assert.ok(meshes >= (key === 'departmentMarker' ? 12 : 25), 'recognizable equipment geometry, not a plain placeholder');
    } finally { dispose(root); }
  });
}

test('bed and theatre preserve recognizable original equipment without patients or fake clinical states', () => {
  const bed = equipment.createHospitalBed(), theatre = equipment.createOperatingTheatre();
  try {
    for (const name of ['Bed frame', 'Mattress', 'Blanket', 'Pillow', 'Bedside monitor', 'Headboard', 'Footboard']) assert.ok(bed.getObjectByName(name), name);
    for (const name of ['Surgical table pad', 'Surgical head support', 'Surgical lamp 1', 'Surgical lamp 2', 'Anaesthesia machine', 'Anaesthesia monitor', 'Theatre monitor', 'Instrument trolley top']) assert.ok(theatre.getObjectByName(name), name);
    for (const root of [bed, theatre]) root.traverse(object => {
      assert.doesNotMatch(object.name, /patient|surgeon|vital|ECG|active status/i);
      if (object !== root) assert.deepEqual(object.userData, {}, 'no generated clinical identity');
    });
    assert.doesNotMatch(source, /Math\.random|requestAnimationFrame|setInterval|CanvasTexture|TextureLoader|\bfetch\s*\(/);
  } finally { dispose(bed); dispose(theatre); }
});

test('every resource is owned once per factory result and can be disposed without affecting another instance', () => {
  for (const [, create] of factories) {
    const first = create(), second = create();
    const firstResources = resourcesOf(first), secondResources = resourcesOf(second);
    assert.equal(new Set(firstResources).size, firstResources.length, 'traversal cleanup will not double-dispose shared resources');
    assert.equal(new Set(secondResources).size, secondResources.length);
    const secondSet = new Set(secondResources);
    assert.ok(firstResources.every(resource => !secondSet.has(resource)), 'no cross-instance shared resource');
    const counts = new Map();
    for (const resource of [...firstResources, ...secondResources]) {
      counts.set(resource, 0);
      resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
    dispose(first);
    assert.ok(firstResources.every(resource => counts.get(resource) === 1));
    assert.ok(secondResources.every(resource => counts.get(resource) === 0));
    dispose(second);
    assert.ok(secondResources.every(resource => counts.get(resource) === 1));
  }
});
