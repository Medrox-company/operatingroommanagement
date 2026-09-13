import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildFloor, disposeTree } from '../../vendor/orms-spatial-editor/src/geometry.js';
import { createItem, createRoom, VERSION } from '../../vendor/orms-spatial-editor/src/model.js';

function makeProject() {
  const floor = { id: 'rotation-floor', name: 'Rotation test', elevation: 0, perimeterWalls: false, knlBoundaryEnabled: false };
  const rooms = Array.from({ length: 6 }, (_, index) => Object.assign(
    createRoom(floor.id, 'operating', (index % 3 - 1) * 7, index < 3 ? -5 : 5),
    { id: `room-${index + 1}`, name: `Room ${index + 1}`, rotation: index < 3 ? 0 : 180 },
  ));
  return { schemaVersion: VERSION, id: 'rotation-project', name: 'Rotation test', units: 'm', floors: [floor], rooms, items: [] };
}

function assertVector(actual, expected, message) {
  assert.ok(actual.distanceTo(expected) < 1e-9, `${message}: expected ${expected.toArray()}, received ${actual.toArray()}`);
}

test('every reused 180-degree room keeps its door facing the central corridor', () => {
  const project = makeProject();
  const built = buildFloor(project, project.floors[0].id, { cutaway: true, reuseGeometry: true });
  built.group.updateMatrixWorld(true);
  try {
    for (const room of project.rooms) {
      const group = built.entities.get(room.id);
      const forward = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
      const expectedForward = new THREE.Vector3(0, 0, room.z < 0 ? 1 : -1);
      assertVector(forward, expectedForward, `${room.name} door direction`);
      assertVector(new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld), new THREE.Vector3(0, 1, 0), `${room.name} remains upright`);

      const doorPosition = new THREE.Vector3(0, 0, room.depth / 2).applyMatrix4(group.matrixWorld);
      assert.ok(Math.abs(doorPosition.z) < Math.abs(room.z), `${room.name} door is closer to the corridor than the room center`);
    }
  } finally {
    disposeTree(built.group);
  }
});

test('equipment cloned from a 180-degree prototype respects every requested local rotation', () => {
  const project = makeProject();
  const rotations = [180, 180, 0, 90, 270, 180];
  project.items = rotations.map((rotation, index) => Object.assign(
    createItem(project.floors[0].id, project.rooms[index].id, 'table'),
    { id: `table-${index + 1}`, rotation },
  ));
  const built = buildFloor(project, project.floors[0].id, { cutaway: true, reuseGeometry: true });
  built.group.updateMatrixWorld(true);
  try {
    for (const item of project.items) {
      const group = built.entities.get(item.id);
      const room = project.rooms.find((candidate) => candidate.id === item.roomId);
      const localAngle = item.rotation * Math.PI / 180;
      const worldAngle = (item.rotation + room.rotation) * Math.PI / 180;
      assertVector(
        new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion),
        new THREE.Vector3(Math.sin(localAngle), 0, Math.cos(localAngle)),
        `${item.id} local rotation`,
      );
      assertVector(
        new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld),
        new THREE.Vector3(Math.sin(worldAngle), 0, Math.cos(worldAngle)),
        `${item.id} room-relative world rotation`,
      );
      assertVector(new THREE.Vector3(0, 1, 0).transformDirection(group.matrixWorld), new THREE.Vector3(0, 1, 0), `${item.id} remains upright`);
    }
  } finally {
    disposeTree(built.group);
  }
});
