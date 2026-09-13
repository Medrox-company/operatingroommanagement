import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const referenceSize = new THREE.Vector3(7.0300002098, 3.0899999142, 6.8249998093);
let roomPrototypePromise;

// Barevné odstíny neaktivního sálu podle referenční vizualizace. Zachovávají
// původní materiál GLB, pouze potlačují šedý studiový nádech a vracejí chladný
// modrofialový tón podlahám, stěnám a zdravotnickému vybavení.
const inactiveMaterialGrade = {
  wall: { color: 0x263a70, mix: 0.72, environment: 0.15 },
  wall_lower: { color: 0x213565, mix: 0.72, environment: 0.14 },
  edge: { color: 0x516fa8, mix: 0.58, environment: 0.2 },
  seam: { color: 0x1b2d5d, mix: 0.5, environment: 0.1 },
  floor: { color: 0x3e5eae, mix: 0.56, environment: 0.2 },
  floor_seam: { color: 0x304c91, mix: 0.46, environment: 0.12 },
  plinth: { color: 0x101b42, mix: 0.2, environment: 0.1 },
  white: { color: 0x6f8ec6, mix: 0.22, environment: 0.34 },
  steel: { color: 0x526fa4, mix: 0.2, environment: 0.38 },
  bin: { color: 0x607dab, mix: 0.26, environment: 0.26 },
  pack: { color: 0x4d6ba7, mix: 0.3, environment: 0.24 },
};

function assetUrl() {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${base.endsWith('/') ? base : `${base}/`}spatial/models/pcho-3.glb`;
}

function materialsOf(node) {
  return Array.isArray(node.material) ? node.material : [node.material];
}

function isStatusWall(material) {
  return material?.name === 'wall' || material?.name === 'wall_lower';
}

function preparePrototype(scene) {
  scene.name = 'Referenční operační sál · PCHO 3';
  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.sharedSpatialGeometry = true;
    for (const entry of materialsOf(node)) {
      if (!entry) continue;
      entry.userData = { ...entry.userData, sharedSpatialMaterial: true };
      const grade = inactiveMaterialGrade[entry.name];
      if (grade && entry.color) entry.color.lerp(new THREE.Color(grade.color), grade.mix);
      entry.envMapIntensity = grade?.environment ?? Math.max(entry.envMapIntensity ?? 0, entry.name === 'steel' ? 0.42 : 0.24);
      if (entry.map) entry.map.colorSpace = THREE.SRGBColorSpace;
      if (entry.emissiveMap) entry.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    }
  });
  return scene;
}

function loadPrototype() {
  roomPrototypePromise ??= loader.loadAsync(assetUrl()).then((gltf) => preparePrototype(gltf.scene));
  return roomPrototypePromise;
}

function cloneRoom(prototype, room) {
  const model = prototype.clone(true);
  model.name = `Referenční model · ${room.name}`;
  model.userData = { referenceRoomModel: true, roomId: room.id };
  model.scale.set(
    room.width / referenceSize.x,
    room.height / referenceSize.y,
    room.depth / referenceSize.z,
  );
  model.traverse((node) => {
    if (!node.isMesh) return;
    const sourceMaterials = materialsOf(node);
    const mutable = sourceMaterials.some(isStatusWall);
    if (mutable) {
      const cloned = sourceMaterials.map((entry) => entry.clone());
      for (const entry of cloned) entry.userData = { ...entry.userData, sharedSpatialMaterial: false };
      node.material = Array.isArray(node.material) ? cloned : cloned[0];
      node.userData.referenceRoomSurface = true;
      node.userData.referenceBaseMaterials = cloned.map((entry) => ({
        color: entry.color?.getHex() ?? 0xffffff,
        emissive: entry.emissive?.getHex() ?? 0x000000,
        emissiveIntensity: entry.emissiveIntensity ?? 1,
      }));
    }
    node.userData.sharedSpatialGeometry = true;
  });
  return model;
}

function installRoomModel(group, model) {
  for (const child of group.children) {
    if (child.isMesh) child.visible = Boolean(child.userData.selectionLight);
    else if (child.userData?.entity === 'item') child.visible = false;
  }
  group.add(model);
  group.userData.referenceRoomLoaded = true;
}

/**
 * Presentation mode uses one texture-bearing room model as a shared prototype.
 * Room transforms and dimensions stay data-driven; only its visual shell and
 * equipment are replaced. Procedural geometry remains a safe loading fallback.
 */
export async function hydrateOperatingRoomModels(entities, rooms, {
  onProgress = () => {},
  shouldApply = () => true,
} = {}) {
  const targets = rooms.filter((room) => room.type === 'operating' && entities.get(room.id));
  if (!targets.length) {
    onProgress(1, 1);
    return false;
  }
  let prototype;
  try {
    prototype = await loadPrototype();
    onProgress(1, 1);
  } catch (error) {
    console.warn('Referenční model operačního sálu se nepodařilo načíst.', error);
    onProgress(1, 1);
    return false;
  }
  if (!shouldApply()) return false;
  for (const room of targets) installRoomModel(entities.get(room.id), cloneRoom(prototype, room));
  return true;
}
