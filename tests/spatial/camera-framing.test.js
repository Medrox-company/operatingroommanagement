import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { fitOrthographicCamera } from '../../vendor/orms-spatial-editor/src/camera-framing.js';

const scenarios = [
  { name: 'six-room reference', viewport: [1000, 560], min: [-13, -0.6, -8.3], max: [13.4, 3.2, 8.3] },
  { name: 'full dashboard', viewport: [1448, 1086], min: [-22, -0.6, -15], max: [22, 3.2, 15] },
  { name: 'portrait viewport', viewport: [390, 844], min: [-22, -0.6, -15], max: [22, 3.2, 15] },
  { name: 'wide shallow viewport', viewport: [1920, 320], min: [-14, -0.6, -24], max: [14, 4.2, 24] },
  { name: 'narrow panel', viewport: [280, 760], min: [-8, 0, -6], max: [8, 5, 6] },
  { name: 'translated building', viewport: [1280, 720], min: [120, 14, -280], max: [155, 18, -253] },
  { name: 'large campus', viewport: [2560, 1440], min: [-500, -20, -700], max: [1200, 180, 900] },
];

function corners(bounds) {
  const points = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) points.push(new THREE.Vector3(x, y, z));
    }
  }
  return points;
}

function pixelPoint(point, camera, width, height) {
  const projected = point.clone().project(camera);
  return new THREE.Vector2((projected.x + 1) * width / 2, (1 - projected.y) * height / 2);
}

for (const { name, viewport: [width, height], min, max } of scenarios) {
  for (const top of [false, true]) {
    test(`${name}: ${top ? 'plan' : '3D'} fits all corners and preserves scale`, () => {
      const camera = new THREE.OrthographicCamera();
      const bounds = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
      const center = fitOrthographicCamera(camera, bounds, width, height, top);

      for (const corner of corners(bounds)) {
        const projected = corner.project(camera);
        for (const axis of ['x', 'y', 'z']) {
          assert.ok(Number.isFinite(projected[axis]), `${axis} is finite`);
          assert.ok(Math.abs(projected[axis]) < 1, `${axis} lies inside the visible camera volume: ${projected[axis]}`);
        }
      }

      const screenCenter = pixelPoint(center, camera, width, height);
      assert.ok(screenCenter.distanceTo(new THREE.Vector2(width / 2, height / 2)) < 1e-6, 'building center is centered');

      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const depth = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2);
      const horizontalMetre = screenCenter.distanceTo(pixelPoint(center.clone().add(right), camera, width, height));
      const verticalMetre = screenCenter.distanceTo(pixelPoint(center.clone().add(up), camera, width, height));
      assert.ok(Math.abs(horizontalMetre - verticalMetre) < 1e-6, 'a metre has the same horizontal and vertical pixel length');

      const nearRight = pixelPoint(center.clone().add(right).addScaledVector(depth, 5), camera, width, height);
      const farRight = pixelPoint(center.clone().add(right).addScaledVector(depth, -5), camera, width, height);
      assert.ok(nearRight.distanceTo(farRight) < 1e-6, 'orthographic size and position do not change with depth');
    });
  }
}

test('repeated resizing and view changes leave every building corner visible', () => {
  const camera = new THREE.OrthographicCamera();
  const bounds = new THREE.Box3(new THREE.Vector3(-13, -0.6, -8.3), new THREE.Vector3(13.4, 3.2, 8.3));
  for (const [width, height, top] of [[1000, 560, false], [390, 844, true], [1920, 320, false], [1000, 560, true]]) {
    // Simulate a previous orbit/pan/zoom before each fit.
    camera.position.set(200, 80, -160);
    camera.zoom = 3;
    fitOrthographicCamera(camera, bounds, width, height, top);
    for (const point of corners(bounds)) {
      const projected = point.project(camera);
      assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1);
    }
  }
});
