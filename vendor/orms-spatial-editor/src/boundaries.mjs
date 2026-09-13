import * as THREE from 'three';

const copy = value => JSON.parse(JSON.stringify(value));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const vec3 = value => Array.isArray(value) && value.length === 3 && value.every(finite);

/** Portable KNL boundary document validation without a WebGL dependency. */
export function validateDocument(document) {
  if (!document || document.format !== 'medrox.boundaries' || document.schemaVersion !== 1) throw Error('Unsupported boundary document');
  if (document.units !== 'm' || document.coordinates?.up !== 'Y') throw Error('Expected metres and Y-up');
  if (!document.materials || !Array.isArray(document.elements) || document.elements.length > 10000) throw Error('Invalid materials/elements (maximum 10000)');
  if (document.placement && (!vec3(document.placement.position) || !vec3(document.placement.rotation) || !vec3(document.placement.scale) || document.placement.scale.some(value => value <= 0))) throw Error('Invalid group placement');
  const ids = new Set();
  for (const element of document.elements) {
    if (typeof element.id !== 'string' || !element.id || ids.has(element.id)) throw Error(`Duplicate/invalid element ID: ${element.id}`);
    ids.add(element.id);
    if (element.primitive !== 'box' || !vec3(element.position) || !vec3(element.size) || element.size.some(value => value <= 0) || !vec3(element.rotation)) throw Error(`Invalid geometry: ${element.id}`);
    if (!Object.hasOwn(document.materials, element.material)) throw Error(`Unknown material: ${element.material}`);
    if (element.visible !== undefined && typeof element.visible !== 'boolean') throw Error(`Invalid visibility: ${element.id}`);
  }
  for (const [id, material] of Object.entries(document.materials)) {
    if (!vec3(material.colorLinearRGB) || material.colorLinearRGB.some(value => value < 0 || value > 1)) throw Error(`Invalid linear color: ${id}`);
    for (const key of ['opacity', 'roughness', 'metalness']) if (!finite(material[key]) || material[key] < 0 || material[key] > 1) throw Error(`Invalid ${key}: ${id}`);
  }
  return true;
}

function makeMesh(element, document) {
  const source = document.materials[element.material];
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().fromArray(source.colorLinearRGB),
    roughness: source.roughness,
    metalness: source.metalness,
    transparent: source.opacity < 1,
    opacity: source.opacity,
    depthWrite: source.opacity === 1,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...element.size), material);
  mesh.position.fromArray(element.position);
  mesh.rotation.set(...element.rotation, 'XYZ');
  mesh.name = element.label || element.id;
  mesh.visible = element.visible !== false;
  mesh.castShadow = source.opacity === 1;
  mesh.receiveShadow = source.opacity === 1;
  mesh.renderOrder = source.opacity < 1 ? 3 : 0;
  mesh.userData = { elementId: element.id, kind: element.kind, materialId: element.material, floorId: element.floorId, editable: true };
  return mesh;
}

/** Every generated boundary element remains an independent editable mesh. */
export function createBoundaries(document) {
  validateDocument(document);
  const group = new THREE.Group();
  group.name = document.name || 'Boundary elements';
  group.userData.boundaryDocument = copy(document);
  if (document.placement) {
    group.position.fromArray(document.placement.position);
    group.rotation.set(...document.placement.rotation, 'XYZ');
    group.scale.fromArray(document.placement.scale);
  }
  for (const element of document.elements) group.add(makeMesh(element, document));
  return group;
}

export function findElement(group, id) {
  return group.children.find(mesh => mesh.userData.elementId === id) || null;
}

export function updateElement(group, id, patch) {
  if (!group.userData.boundaryDocument) throw Error('Not a boundary group');
  if (patch.id !== undefined && patch.id !== id) throw Error('Use duplicateElement to create a new ID');
  const document = exportDocument(group);
  const index = document.elements.findIndex(element => element.id === id);
  if (index < 0) throw Error(`Unknown element: ${id}`);
  document.elements[index] = { ...document.elements[index], ...copy(patch), id };
  validateDocument(document);
  const previous = findElement(group, id);
  const next = makeMesh(document.elements[index], document);
  group.remove(previous);
  previous.geometry.dispose();
  previous.material.dispose();
  group.add(next);
  group.userData.boundaryDocument = document;
  return next;
}

export function duplicateElement(group, id, newId, position) {
  const document = exportDocument(group);
  const source = document.elements.find(element => element.id === id);
  if (!source) throw Error(`Unknown element: ${id}`);
  const next = { ...copy(source), id: newId, position: position ? copy(position) : copy(source.position) };
  document.elements.push(next);
  validateDocument(document);
  group.add(makeMesh(next, document));
  group.userData.boundaryDocument = document;
  return findElement(group, newId);
}

export function removeElement(group, id) {
  const mesh = findElement(group, id);
  if (!mesh) return false;
  group.remove(mesh);
  mesh.geometry.dispose();
  mesh.material.dispose();
  group.userData.boundaryDocument.elements = group.userData.boundaryDocument.elements.filter(element => element.id !== id);
  return true;
}

export function exportDocument(group) {
  const document = copy(group.userData.boundaryDocument);
  for (const element of document.elements) {
    const mesh = findElement(group, element.id);
    if (!mesh) continue;
    element.position = mesh.position.toArray();
    element.rotation = [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z];
    element.visible = mesh.visible;
    element.size = [
      mesh.geometry.parameters.width * mesh.scale.x,
      mesh.geometry.parameters.height * mesh.scale.y,
      mesh.geometry.parameters.depth * mesh.scale.z,
    ];
  }
  document.placement = {
    position: group.position.toArray(),
    rotation: [group.rotation.x, group.rotation.y, group.rotation.z],
    scale: group.scale.toArray(),
  };
  validateDocument(document);
  return document;
}

export function disposeBoundaries(group) {
  for (const mesh of [...group.children]) {
    group.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  group.userData.boundaryDocument = null;
}

/** Generate continuous KNL glass panels with shared corner posts. */
export function generateBoundary(preset, points, { idPrefix = 'new-boundary', floorId = 'floor-1', baseY = 0, closed = false } = {}) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 500 || !points.every(point => Array.isArray(point) && point.length === 2 && point.every(finite))) throw Error('Expected 2–500 [x,z] points');
  for (const key of ['glassHeight', 'glassThickness', 'postHeight', 'postWidth', 'postDepth', 'postSpacingMax']) if (!finite(preset[key]) || preset[key] <= 0) throw Error(`Invalid ${key}`);
  if (!finite(preset.glassBottom) || !finite(baseY)) throw Error('Invalid elevation');
  const path = points.map(point => [...point]);
  if (closed && (path[0][0] !== path.at(-1)[0] || path[0][1] !== path.at(-1)[1])) path.push([...path[0]]);
  const elements = [];
  const posts = new Set();
  let count = 0;
  const emit = (kind, position, size, rotation, material) => {
    if (elements.length >= 10000) throw Error('Maximum 10000 generated elements');
    elements.push({ id: `${idPrefix}-${kind}-${count++}`, label: kind === 'glass_panel' ? 'Skleněná výplň' : 'Sloupek', kind, primitive: 'box', floorId, position, size, rotation, material, visible: true, source: { status: 'parametric-new' } });
  };
  for (let index = 0; index < path.length - 1; index++) {
    const [x, z] = path[index];
    const [nextX, nextZ] = path[index + 1];
    const deltaX = nextX - x;
    const deltaZ = nextZ - z;
    const length = Math.hypot(deltaX, deltaZ);
    if (length < 1e-6) continue;
    const yaw = -Math.atan2(deltaZ, deltaX);
    const steps = Math.ceil(length / preset.postSpacingMax);
    if (steps > 10000) throw Error('Too many posts');
    emit('glass_panel', [(x + nextX) / 2, baseY + preset.glassBottom + preset.glassHeight / 2, (z + nextZ) / 2], [length, preset.glassHeight, preset.glassThickness], [0, yaw, 0], preset.glassMaterial);
    for (let step = 0; step <= steps; step++) {
      const postX = x + deltaX * step / steps;
      const postZ = z + deltaZ * step / steps;
      const key = `${postX.toFixed(6)}:${postZ.toFixed(6)}`;
      if (posts.has(key)) continue;
      posts.add(key);
      emit('post', [postX, baseY + preset.postHeight / 2, postZ], [preset.postWidth, preset.postHeight, preset.postDepth], [0, yaw, 0], preset.postMaterial);
    }
  }
  return elements;
}
