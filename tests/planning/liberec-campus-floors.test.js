import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/liberec-campus-floors.ts', import.meta.url), 'utf8');
const moduleExports = {};
new Function('exports', 'require', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(moduleExports, name => {
  if (name === 'three') return THREE;
  throw new Error(`Unexpected floor model dependency: ${name}`);
});
const { createCampusFloors, frameCampusBounds } = moduleExports;
const floorLabels = ['2. suterén', '1. suterén', 'Přízemí', ...Array.from({ length: 8 }, (_, index) => `${index + 1}. podlaží`)];
const mockBuilding = () => ({
  id: 'B', name: 'Reference test building', height: 56,
  points: [[100, 200], [170, 200], [170, 230], [140, 230], [140, 250], [100, 250]],
  floors: floorLabels.map((label, index) => ({ label, departments: index === 2 ? [] : [`Veřejné pracoviště ${index}`, `Veřejné pracoviště ${index}`] })),
});
const withFloors = (building, selected, callback) => {
  const model = createCampusFloors(building, selected);
  try { callback(model); } finally { model.dispose(); }
};
const deepFreeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const approximately = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: ${actual} ≈ ${expected}`);
const cornersOf = bounds => [bounds.min.x, bounds.max.x].flatMap(x => [bounds.min.y, bounds.max.y].flatMap(y => [bounds.min.z, bounds.max.z].map(z => new THREE.Vector3(x, y, z))));

test('floor overview preserves every supplied source floor in order, including basement and empty directory entries', () => {
  withFloors(mockBuilding(), null, model => {
    assert.deepEqual([...model.meshes.keys()], floorLabels);
    assert.deepEqual([...model.anchors.keys()], floorLabels);
    assert.equal(model.meshes.size, 11);
    assert.equal(model.bounds.isEmpty(), false);
    floorLabels.forEach((label, index) => {
      const mesh = model.meshes.get(label);
      assert.equal(mesh.parent, model.root, label);
      assert.equal(mesh.userData.floorLabel, label);
      approximately(mesh.position.y, index * 5.4, `${label}: ordered illustrative stack`);
      assert.ok([...mesh.geometry.getAttribute('position').array].every(Number.isFinite), label);
      assert.ok(model.bounds.containsPoint(mesh.position), label);
      const anchor = model.anchors.get(label);
      assert.ok([anchor.x, anchor.y, anchor.z].every(Number.isFinite), label);
    });
  });
});

test('each source floor can be isolated without inventing another floor or its contents', () => {
  for (const label of floorLabels) {
    withFloors(mockBuilding(), label, model => {
      assert.deepEqual([...model.meshes.keys()], [label]);
      assert.deepEqual([...model.anchors.keys()], [label]);
      assert.equal(model.meshes.get(label).position.y, 0, label);
      approximately(model.bounds.min.y, 0, `${label}: selected floor starts at model origin`);
      approximately(model.bounds.max.y, 3.2, `${label}: illustrative shell bounds`);
    });
  }
});

test('building R keeps its published top-down listing but draws the basement below the ground and first floor', () => {
  const labels = ['1. podlaží', 'Přízemí', 'Suterén'];
  const building = deepFreeze({
    ...mockBuilding(), id: 'R',
    floors: labels.map(label => ({ label, departments: [] })),
  });
  const snapshot = JSON.stringify(building);
  withFloors(building, null, model => {
    assert.deepEqual([...model.meshes.keys()], labels, 'directory iteration retains its source order');
    approximately(model.meshes.get('Suterén').position.y, 0, 'basement is at the bottom');
    approximately(model.meshes.get('Přízemí').position.y, 5.4, 'ground floor is above the basement');
    approximately(model.meshes.get('1. podlaží').position.y, 10.8, 'first floor is above ground');
    assert.ok(model.anchors.get('Suterén').y < model.anchors.get('Přízemí').y);
    assert.ok(model.anchors.get('Přízemí').y < model.anchors.get('1. podlaží').y);
  });
  assert.equal(JSON.stringify(building), snapshot, 'visual sorting never mutates the public directory');
});

test('official B labels Podlaží S2 and Podlaží S1 sort below ground regardless of directory iteration order', () => {
  const ascending = ['Podlaží S2', 'Podlaží S1', 'Přízemí', ...Array.from({ length: 8 }, (_, index) => `${index + 1}. podlaží`)];
  for (const labels of [ascending, [...ascending].reverse()]) {
    const building = deepFreeze({ ...mockBuilding(), floors: labels.map(label => ({ label, departments: [] })) });
    const snapshot = JSON.stringify(building);
    withFloors(building, null, model => {
      assert.deepEqual([...model.meshes.keys()], labels, 'public source order stays untouched');
      ascending.forEach((label, index) => approximately(model.meshes.get(label).position.y, index * 5.4, `${label}: physical floor ordering`));
    });
    assert.equal(JSON.stringify(building), snapshot);
  }
});

test('unknown selection and buildings without published floors yield no fabricated geometry', () => {
  for (const [building, selection] of [
    [mockBuilding(), '99. podlaží'],
    [{ ...mockBuilding(), floors: [] }, null],
    [{ ...mockBuilding(), floors: undefined }, null],
    [{ ...mockBuilding(), floors: [] }, 'Přízemí'],
  ]) {
    withFloors(building, selection, model => {
      assert.equal(model.meshes.size, 0);
      assert.equal(model.anchors.size, 0);
      assert.equal(model.bounds.isEmpty(), true);
      assert.equal(model.root.children.some(object => object.geometry), false);
    });
  }
});

test('illustrative floors reuse only the normalized source outline, never an inferred interior or bed inventory', () => {
  const building = mockBuilding();
  withFloors(building, null, model => {
    const visualMeshes = model.root.children.filter(object => object instanceof THREE.Mesh);
    const outlines = model.root.children.filter(object => object instanceof THREE.LineSegments);
    assert.equal(visualMeshes.length, floorLabels.length * 2, 'one slab and one transparent outer shell per floor');
    assert.equal(outlines.length, floorLabels.length * 2, 'only perimeter outlines');
    const expectedFootprint = new THREE.Box3(
      new THREE.Vector3(-17, 0, -25 * 34 / 70),
      new THREE.Vector3(17, 0, 25 * 34 / 70),
    );
    for (const mesh of visualMeshes) {
      assert.ok(mesh.geometry instanceof THREE.ExtrudeGeometry, 'no furniture primitives or guessed partitions');
      mesh.geometry.computeBoundingBox();
      const bounds = mesh.geometry.boundingBox;
      for (const axis of ['x', 'z']) {
        approximately(bounds.min[axis], expectedFootprint.min[axis], `source outline minimum ${axis}`);
        approximately(bounds.max[axis], expectedFootprint.max[axis], `source outline maximum ${axis}`);
      }
      assert.ok(Object.keys(mesh.userData).every(key => key === 'floorLabel'));
    }
    model.root.traverse(object => {
      assert.ok(Object.keys(object.userData).every(key => key === 'floorLabel'));
    });
    assert.doesNotMatch(source, /\b(?:roomId|roomIds|bedCount|bedIds|patientId|staffId|clinicalStatus|capacity)\b/);
  });
});

test('creating and disposing floor models never mutates the supplied public geometry or directory', () => {
  const building = deepFreeze(mockBuilding());
  const snapshot = JSON.stringify(building);
  withFloors(building, null, () => {});
  withFloors(building, floorLabels[0], () => {});
  withFloors(building, 'unknown', () => {});
  assert.equal(JSON.stringify(building), snapshot);
});

test('floor disposal releases every unique geometry and material once and clears retained objects', () => {
  const model = createCampusFloors(mockBuilding());
  const counts = new Map();
  model.root.traverse(object => {
    const resources = [object.geometry, ...(Array.isArray(object.material) ? object.material : [object.material])].filter(Boolean);
    for (const resource of resources) {
      if (counts.has(resource)) continue;
      counts.set(resource, 0);
      resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
    }
  });
  assert.equal(counts.size, floorLabels.length * 8);
  model.dispose();
  assert.equal(model.root.children.length, 0);
  assert.equal(model.meshes.size, 0);
  assert.equal(model.anchors.size, 0);
  for (const [resource, count] of counts) assert.equal(count, 1, resource.type ?? resource.constructor.name);
  assert.doesNotThrow(() => model.dispose());
  assert.ok([...counts.values()].every(count => count === 1), 'repeat cleanup does not dispose resources twice');
});

test('camera framing keeps all eight floor-model corners visible for landscape and portrait in flat and 3D views', () => {
  withFloors(mockBuilding(), null, model => {
    const cases = [
      ['stacked floors', model.bounds],
      ['one floor', new THREE.Box3(new THREE.Vector3(-17, 0, -12), new THREE.Vector3(17, 3.2, 12))],
      ['translated floors', model.bounds.clone().translate(new THREE.Vector3(65, -14, 39))],
    ];
    for (const [label, bounds] of cases) for (const aspect of [16 / 9, 32 / 9, 9 / 16, 390 / 844, 1]) for (const flat of [false, true]) {
      const camera = new THREE.PerspectiveCamera(38, aspect, .1, 500);
      const before = bounds.clone();
      const target = frameCampusBounds(camera, bounds, flat);
      assert.ok(target.equals(bounds.getCenter(new THREE.Vector3())), `${label}: target is geometry center`);
      assert.ok(bounds.equals(before), `${label}: framing preserves bounds`);
      for (const corner of cornersOf(bounds)) {
        const ndc = corner.clone().project(camera);
        const context = `${label}, aspect ${aspect}, flat ${flat}, corner ${corner.toArray()}`;
        assert.ok([ndc.x, ndc.y, ndc.z].every(Number.isFinite), context);
        assert.ok(Math.abs(ndc.x) < 1, `${context}: horizontal fit ${ndc.x}`);
        assert.ok(Math.abs(ndc.y) < 1, `${context}: vertical fit ${ndc.y}`);
        assert.ok(ndc.z > -1 && ndc.z < 1, `${context}: depth fit ${ndc.z}`);
      }
    }
  });
});

test('framing empty bounds returns a finite target without moving the camera', () => {
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, .1, 500);
  camera.position.set(65, 110, 115);
  const original = camera.position.clone();
  const target = frameCampusBounds(camera, new THREE.Box3(), false);
  assert.deepEqual(target.toArray(), [0, 0, 0]);
  assert.ok(camera.position.equals(original));
});

test('portrait framing expands the far plane so the full campus is not clipped behind 500 units', () => {
  const bounds = new THREE.Box3(new THREE.Vector3(-58, -.3, -39.2), new THREE.Vector3(58, 8, 39.2));
  for (const aspect of [9 / 16, 390 / 844]) for (const flat of [false, true]) {
    const camera = new THREE.PerspectiveCamera(38, aspect, .1, 500);
    const target = frameCampusBounds(camera, bounds, flat);
    assert.ok(target.equals(bounds.getCenter(new THREE.Vector3())));
    assert.ok(camera.far >= 500, 'framing must not reduce the original depth range');
    if (!flat) assert.ok(camera.far > 500, 'portrait 3D requires a farther clipping plane');
    for (const corner of cornersOf(bounds)) {
      const ndc = corner.clone().project(camera);
      const context = `campus portrait aspect ${aspect}, flat ${flat}, corner ${corner.toArray()}`;
      assert.ok(Math.abs(ndc.x) < 1, `${context}: horizontal fit ${ndc.x}`);
      assert.ok(Math.abs(ndc.y) < 1, `${context}: vertical fit ${ndc.y}`);
      assert.ok(ndc.z > -1 && ndc.z < 1, `${context}: depth fit ${ndc.z}`);
    }
  }
});
