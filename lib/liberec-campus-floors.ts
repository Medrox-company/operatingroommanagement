import * as THREE from 'three';
import type { CampusBuilding } from './liberec-campus';

function floorOrder(label: string, fallback: number) {
  const basement = label.match(/^podlaží\s+s(\d+)$/i) ?? label.match(/^(\d+)\.\s*suterén$/i);
  if (basement) return -Number(basement[1]);
  if (/suterén/i.test(label)) return -1;
  if (/^(přízemí|hala)$/i.test(label)) return 0;
  return Number(label.match(/^(\d+)\.\s*(?:podlaží|patro)$/i)?.[1] ?? fallback);
}

/** Published floor labels on an illustrative shell. Never creates rooms, beds or capacities. */
export function createCampusFloors(building: CampusBuilding, selectedFloor: string | null = null) {
  const root = new THREE.Group();
  root.name = `Public floor directory — ${building.id}`;
  const meshes = new Map<string, THREE.Mesh>();
  const anchors = new Map<string, THREE.Vector3>();
  const floors = building.floors ?? [];
  // The public directory for R is listed top-down. Keep source listing order, but
  // draw basements below ground; relative display spacing is not a measured height.
  const ordered = floors.map((floor, index) => ({ label: floor.label, order: floorOrder(floor.label, index) }))
    .sort((a, b) => a.order - b.order);
  const displayIndex = new Map(ordered.map((floor, index) => [floor.label, index]));
  const xs = building.points.map(point => point[0]);
  const zs = building.points.map(point => point[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const scale = 34 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 1);
  const shape = new THREE.Shape(building.points.map(([x, z]) => new THREE.Vector2((x - cx) * scale, -(z - cz) * scale)));
  const bounds = new THREE.Box3();

  root.add(new THREE.HemisphereLight(0x87a5d8, 0x04070d, 1.2));
  const light = new THREE.DirectionalLight(0xd6e4ff, 1.6);
  light.position.set(-35, 65, 45); root.add(light);
  const rim = new THREE.DirectionalLight(0x3f6fff, 1);
  rim.position.set(40, 20, -40); root.add(rim);

  floors.forEach(floor => {
    if (selectedFloor !== null && selectedFloor !== floor.label) return;
    // Expanded spacing is for legibility, not measured floor heights.
    const y = selectedFloor === null ? displayIndex.get(floor.label)! * 5.4 : 0;
    const slab = new THREE.ExtrudeGeometry(shape, { depth: .32, bevelEnabled: false });
    slab.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x172c47, metalness: .25, roughness: .45, transparent: true, opacity: .9 });
    const mesh = new THREE.Mesh(slab, material);
    mesh.position.y = y; mesh.userData.floorLabel = floor.label;
    root.add(mesh); meshes.set(floor.label, mesh);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(slab, 25), new THREE.LineBasicMaterial({ color: 0x76c8ed, transparent: true, opacity: .9 }));
    outline.position.y = y; root.add(outline);

    const shellGeometry = new THREE.ExtrudeGeometry(shape, { depth: 2.8, bevelEnabled: false });
    shellGeometry.rotateX(-Math.PI / 2);
    const shell = new THREE.Mesh(shellGeometry, new THREE.MeshStandardMaterial({
      color: 0x8ccfff, metalness: .25, roughness: .06, transparent: true, opacity: .08,
      depthWrite: false, side: THREE.DoubleSide,
    }));
    shell.position.y = y + .32; root.add(shell);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeometry, 25), new THREE.LineBasicMaterial({ color: 0x4f86c9, transparent: true, opacity: .45 }));
    edges.position.y = shell.position.y; root.add(edges);
    slab.computeBoundingBox();
    const box = slab.boundingBox!;
    anchors.set(floor.label, new THREE.Vector3(box.max.x + 1.2, y + .5, box.max.z * .25));
    bounds.union(box.clone().translate(mesh.position));
    bounds.expandByPoint(new THREE.Vector3(box.max.x, y + 3.2, box.max.z));
  });
  const dispose = () => {
    root.traverse(object => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
    });
    root.clear(); meshes.clear(); anchors.clear();
  };
  return { root, meshes, anchors, bounds, dispose };
}

/** Fit the selected reference geometry without assuming a desktop aspect ratio. */
export function frameCampusBounds(camera: THREE.PerspectiveCamera, bounds: THREE.Box3, flat: boolean) {
  if (bounds.isEmpty()) return new THREE.Vector3();
  const center = bounds.getCenter(new THREE.Vector3());
  const direction = (flat ? new THREE.Vector3(0, 1, .001) : new THREE.Vector3(.85, .85, 1.2)).normalize();
  camera.position.copy(center).add(direction); camera.lookAt(center);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  let distance = 8;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const relative = new THREE.Vector3(x, y, z).sub(center);
    distance = Math.max(distance, relative.dot(direction) + Math.max(Math.abs(relative.dot(right)) / tanH, Math.abs(relative.dot(up)) / tanV));
  }
  camera.position.copy(center).addScaledVector(direction, distance * 1.25);
  // Portrait campus views need more depth than a single building's floor stack.
  camera.far = Math.max(500, distance * 1.25 + bounds.getSize(new THREE.Vector3()).length() * 2);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return center;
}
