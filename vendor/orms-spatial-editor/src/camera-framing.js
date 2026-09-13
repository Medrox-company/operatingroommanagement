import * as THREE from 'three';

export const PRESENTATION_DIRECTION = new THREE.Vector3(-10, 46, 54).normalize();

/** Fit the projected building, not its longest world axis, into the canvas. */
export function fitOrthographicCamera(camera, bounds, width, height, top = false) {
  const center = bounds.getCenter(new THREE.Vector3());
  const distance = Math.max(60, bounds.getSize(new THREE.Vector3()).length() * 1.5);
  const direction = top ? new THREE.Vector3(0, 1, 0.0001).normalize() : PRESENTATION_DIRECTION;
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.up.set(0, 1, 0);
  camera.near = 0.1;
  camera.far = distance * 3;
  camera.zoom = 1;
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const projected = new THREE.Box3();
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
    }
  }
  const size = projected.getSize(new THREE.Vector3());
  const aspect = width / height;
  const halfHeight = Math.max(size.y / 2, size.x / (2 * aspect), 1) * 1.055;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
  return center;
}
