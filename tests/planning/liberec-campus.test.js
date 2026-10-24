import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ExtrudeGeometry, Shape, ShapeUtils, Vector2 } from 'three';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/liberec-campus.ts', import.meta.url), 'utf8');
const directory = {};
new Function('exports', ts.transpileModule(readFileSync(new URL('../../lib/liberec-campus-directory.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(directory);
const exports = {};
new Function('exports', 'require', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(exports, name => {
  assert.equal(name, './liberec-campus-directory');
  return directory;
});
const { CAMPUS_BUILDINGS, CAMPUS_TERRAIN, CAMPUS_MAP_WIDTH, CAMPUS_MAP_HEIGHT, CAMPUS_SOURCE } = exports;
const expectedIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'I', 'J', 'K', 'L', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'UA', 'UB', 'PD'];

test('campus snapshot contains all 22 official roof identifiers exactly once', () => {
  assert.deepEqual(CAMPUS_BUILDINGS.map(building => building.id), expectedIds);
  assert.equal(new Set(CAMPUS_BUILDINGS.map(building => building.id)).size, 22);
  for (const building of CAMPUS_BUILDINGS) {
    assert.equal(typeof building.name, 'string');
    assert.ok(building.name.trim().length > 0, building.id);
  }
});

test('campus provenance identifies the public official map and the pinned SVG revision', () => {
  assert.equal(CAMPUS_SOURCE.url, 'https://www.nemlib.cz/mapa/');
  assert.equal(CAMPUS_SOURCE.geometryUrl, 'https://www.nemlib.cz/assets/map/map-lib-v21.svg');
  assert.equal(CAMPUS_SOURCE.retrievedAt, '2026-10-24');
  assert.match(CAMPUS_SOURCE.geometry, /Obrysy střech/);
  assert.match(CAMPUS_SOURCE.geometry, /nejde o zaměřený půdorys/);
  assert.match(CAMPUS_SOURCE.departments, /Úplný snímek zveřejněných podlaží/);
  assert.match(CAMPUS_SOURCE.departments, /nejde o úplný registr nemocnice ani živý provoz/);
});

test('all building points are finite within the shared normalized SVG coordinate space', () => {
  assert.equal(CAMPUS_MAP_WIDTH, 1160);
  assert.equal(CAMPUS_MAP_HEIGHT, 784);
  for (const building of CAMPUS_BUILDINGS) {
    assert.ok(building.points.length >= 3, building.id);
    assert.equal(new Set(building.points.map(point => point.join(','))).size, building.points.length, `${building.id}: distinct vertices`);
    for (const point of building.points) {
      assert.equal(point.length, 2, building.id);
      const [x, y] = point;
      assert.ok(Number.isFinite(x) && Number.isFinite(y), building.id);
      assert.ok(x >= 0 && x <= CAMPUS_MAP_WIDTH, `${building.id}: x=${x}`);
      assert.ok(y >= 0 && y <= CAMPUS_MAP_HEIGHT, `${building.id}: y=${y}`);
    }
    const area = Math.abs(ShapeUtils.area(building.points.map(([x, y]) => new Vector2(x, y))));
    assert.ok(area > 1, `${building.id}: nondegenerate polygon`);
  }
});

test('all roof polygons triangulate without losing or adding their footprint area', () => {
  for (const building of CAMPUS_BUILDINGS) {
    const vertices = building.points.map(([x, y]) => new Vector2(x, y));
    const area = Math.abs(ShapeUtils.area(vertices));
    const triangles = ShapeUtils.triangulateShape(vertices, []);
    assert.ok(triangles.length > 0, building.id);
    let triangulatedArea = 0;
    for (const triangle of triangles) {
      assert.equal(triangle.length, 3, building.id);
      assert.ok(triangle.every(index => Number.isInteger(index) && index >= 0 && index < vertices.length), building.id);
      triangulatedArea += Math.abs(ShapeUtils.area(triangle.map(index => vertices[index])));
    }
    assert.ok(Math.abs(triangulatedArea - area) <= area * 1e-8, `${building.id}: triangulation preserves area`);
  }
});

test('all buildings create finite non-empty extruded Three.js geometry at the renderer scale', () => {
  for (const building of CAMPUS_BUILDINGS) {
    const shape = new Shape(building.points.map(([x, y]) => new Vector2(x / 10, y / 10)));
    const geometry = new ExtrudeGeometry(shape, { depth: building.height / 10, bevelEnabled: false });
    try {
      const positions = geometry.getAttribute('position');
      assert.ok(positions.count > 0, building.id);
      assert.ok([...positions.array].every(Number.isFinite), building.id);
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox.max.x > geometry.boundingBox.min.x, building.id);
      assert.ok(geometry.boundingBox.max.y > geometry.boundingBox.min.y, building.id);
      assert.ok(Math.abs(geometry.boundingBox.max.z - geometry.boundingBox.min.z - building.height / 10) < 1e-5, building.id);
    } finally {
      geometry.dispose();
    }
  }
});

test('positive model heights remain explicitly illustrative rather than measured metres', () => {
  assert.match(CAMPUS_SOURCE.heights, /ilustrační/);
  assert.match(CAMPUS_SOURCE.heights, /bez podkladu pro skutečné rozměry/);
  assert.match(source, /Jednotkou není metr/);
  for (const building of CAMPUS_BUILDINGS) {
    assert.ok(Number.isFinite(building.height) && building.height > 0, building.id);
    assert.equal(Object.hasOwn(building, 'heightMeters'), false, building.id);
  }
});

test('all 21 buildings with public floor directories retain the complete source floor labels', () => {
  assert.deepEqual(CAMPUS_BUILDINGS.filter(building => building.floors).map(building => building.id), expectedIds.filter(id => id !== 'PD'));
  const expectedFloors = {
    A: ['Přízemí', '1. podlaží', '2. podlaží', '3. podlaží', '4. podlaží', '5. podlaží'],
    B: ['Podlaží S2', 'Podlaží S1', 'Přízemí', '1. podlaží', '2. podlaží', '3. podlaží', '4. podlaží', '5. podlaží', '6. podlaží', '7. podlaží', '8. podlaží'],
    C: ['Podlaží S2', 'Podlaží S1', 'Přízemí', '1.podlaží'],
    D: ['Přízemí', '1. podlaží', '2. podlaží', '3. podlaží', '4. podlaží'],
    E: ['Přízemí', '1. podlaží', '2. podlaží'],
    F: ['Přízemí', '1. podlaží'],
    G: ['Přízemí', '1. podlaží', '2. podlaží', '3. podlaží', '4. podlaží'],
    I: ['Přízemí', '1. podlaží', '2. podlaží'],
    J: ['Přízemí', '1. podlaží', '2. podlaží', '3. podlaží'],
    K: ['Suterén', 'Přízemí', '1. podlaží', '2. podlaží'],
    L: ['Přízemí'],
    N: ['Přízemí'],
    O: ['Přízemí', '1. podlaží'],
    P: ['Přízemí', '1. podlaží'],
    Q: ['Hala', '2. podlaží', '3. podlaží', '4. podlaží', '5. podlaží', '6. podlaží'],
    R: ['1. podlaží', 'Přízemí', 'Suterén'],
    S: ['Přízemí'],
    T: ['Přízemí', '1. podlaží', '2. podlaží'],
    U: ['Přízemí', '1. podlaží'],
    UA: ['1. patro', '2. patro', '3. patro', '4. patro'],
    UB: ['1. patro', '2. patro', '3. patro', '4. patro'],
  };
  for (const building of CAMPUS_BUILDINGS.filter(building => building.floors)) {
    assert.deepEqual(building.floors.map(floor => floor.label), expectedFloors[building.id]);
    assert.deepEqual(building.floors, directory.getCampusDirectoryEntry(building.id).floors);
    for (const floor of building.floors) {
      assert.ok(floor.departments.every(department => typeof department === 'string' && department.trim().length > 0));
    }
  }
  assert.equal(CAMPUS_BUILDINGS.reduce((sum, building) => sum + (building.floors?.length ?? 0), 0), 76);
  assert.equal(CAMPUS_BUILDINGS.flatMap(building => building.floors ?? []).reduce((sum, floor) => sum + floor.departments.length, 0), 319);
  const departmentsAt = (id, label) => CAMPUS_BUILDINGS.find(building => building.id === id).floors.find(floor => floor.label === label).departments;
  assert.ok(departmentsAt('A', '3. podlaží').includes('Centrální operační sály'));
  assert.ok(departmentsAt('B', '8. podlaží').includes('COS NO'));
  assert.ok(departmentsAt('D', '4. podlaží').includes('COS OZO'));
  assert.ok(departmentsAt('G', '3. podlaží').includes('COS GYN'));
});

test('static campus metadata cannot imply assignments to clinical room IDs or live statuses', () => {
  const allowedBuildingKeys = new Set(['id', 'name', 'points', 'height', 'floors']);
  for (const building of CAMPUS_BUILDINGS) {
    assert.ok(Object.keys(building).every(key => allowedBuildingKeys.has(key)), building.id);
    for (const floor of building.floors ?? []) {
      assert.deepEqual(Object.keys(floor).sort(), ['departments', 'label']);
    }
  }
  assert.doesNotMatch(source, /\b(?:roomId|roomIds|patientId|staffId|hospitalId|clinicalStatus)\b/);
  assert.match(source, /import \{ getCampusDirectoryEntry \} from '\.\/liberec-campus-directory'/);
  assert.doesNotMatch(source, /\b(?:fetch|supabase|localStorage)\b/);
  assert.match(source, /Data nemají vazbu na skutečné sály/);
  assert.match(source, /Model není podklad pro navigaci, evakuaci nebo klinická rozhodnutí/);
});

test('campus terrain retains separate official fill contours without duplicating the SVG copy', () => {
  assert.equal(CAMPUS_TERRAIN.length, 22);
  assert.equal(new Set(CAMPUS_TERRAIN.map(contour => contour.id)).size, CAMPUS_TERRAIN.length);
  assert.equal(new Set(CAMPUS_TERRAIN.map(contour => JSON.stringify(contour.points))).size, CAMPUS_TERRAIN.length);
  assert.deepEqual(CAMPUS_TERRAIN.filter(contour => contour.id.startsWith('path4117-')).map(contour => contour.id), ['path4117-1', 'path4117-2', 'path4117-3', 'path4117-4']);
  assert.equal(CAMPUS_TERRAIN.some(contour => contour.id.startsWith('path970-')), false, 'identical SVG duplicate is omitted');
});

test('clipped terrain contours stay finite, in bounds and fully triangulatable', () => {
  for (const contour of CAMPUS_TERRAIN) {
    assert.ok(contour.points.length >= 3, contour.id);
    assert.equal(new Set(contour.points.map(point => point.join(','))).size, contour.points.length, contour.id);
    for (const point of contour.points) {
      assert.equal(point.length, 2, contour.id);
      const [x, y] = point;
      assert.ok(Number.isFinite(x) && Number.isFinite(y), contour.id);
      assert.ok(x >= 0 && x <= CAMPUS_MAP_WIDTH && y >= 0 && y <= CAMPUS_MAP_HEIGHT, contour.id);
    }
    const vertices = contour.points.map(([x, y]) => new Vector2(x, y));
    const area = Math.abs(ShapeUtils.area(vertices));
    assert.ok(area > 1, contour.id);
    const triangles = ShapeUtils.triangulateShape(vertices, []);
    assert.ok(triangles.length > 0, contour.id);
    const triangulatedArea = triangles.reduce((total, indices) => total + Math.abs(ShapeUtils.area(indices.map(index => vertices[index]))), 0);
    assert.ok(Math.abs(triangulatedArea - area) <= area * 1e-8, `${contour.id}: triangulation preserves area`);
  }
});

test('terrain represents source fill geometry, not invented routes or clinical connections', () => {
  assert.match(CAMPUS_SOURCE.terrain, /Výplňové polygony vrstvy cesty/);
  assert.match(CAMPUS_SOURCE.terrain, /nejde o síť průchozích cest ani navigační trasy/);
  assert.match(source, /Tato vrstva neurčuje průchodnost, vstupy, klinické přesuny ani bezpečné trasy/);
  for (const contour of CAMPUS_TERRAIN) assert.deepEqual(Object.keys(contour).sort(), ['id', 'points']);
});
