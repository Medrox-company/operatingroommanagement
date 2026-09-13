import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { configureRoomSurface } from './room-surfaces.js';

const loader = new GLTFLoader();
const referenceSize = new THREE.Vector3(7.0300002098, 3.0899999142, 6.8249998093);
let roomPrototypePromise;

// Zdrojový model už obsahuje chladné odstíny. Jemná korekce zachová rozdíly
// mezi modrošedou architekturou, světlým smaltem a stříbřitým vybavením.
const inactiveMaterialGrade = {
  wall: { color: 0x5b6184, mix: 0.15, environment: 0.24 },
  wall_lower: { color: 0x535a7c, mix: 0.18, environment: 0.22 },
  edge: { color: 0x929cbb, mix: 0.2, environment: 0.42 },
  seam: { color: 0x2d3556, mix: 0.22, environment: 0.1 },
  floor: { color: 0x828bac, mix: 0.45, environment: 0.32 },
  floor_seam: { color: 0x4e587d, mix: 0.22, environment: 0.15 },
  plinth: { color: 0x1c2443, mix: 0.12, environment: 0.1 },
  white: { color: 0xc0c7dd, mix: 0.24, environment: 0.52 },
  steel: { color: 0xa1acc6, mix: 0.3, environment: 0.8 },
  bin: { color: 0xb6bdd1, mix: 0.12, environment: 0.35 },
  pack: { color: 0x9da8c7, mix: 0.14, environment: 0.22 },
};

// Odlesky rozlišují skutečné povrchy i při malé velikosti sálu na dashboardu.
// Obrazovkám zůstávají původní barevné i emisní textury z GLB.
const materialFinish = {
  wall: { roughness: 0.78, metalness: 0 },
  wall_lower: { roughness: 0.76, metalness: 0 },
  edge: { roughness: 0.5, metalness: 0.08 },
  seam: { roughness: 0.9, metalness: 0 },
  floor: { roughness: 0.62, metalness: 0.02 },
  floor_seam: { roughness: 0.84, metalness: 0 },
  plinth: { roughness: 0.88, metalness: 0 },
  white: { roughness: 0.44, metalness: 0.015 },
  steel: { roughness: 0.35, metalness: 0.45 },
  bin: { roughness: 0.5, metalness: 0.02 },
  pack: { roughness: 0.9, metalness: 0 },
  rubber: { roughness: 0.96, metalness: 0 },
  pad: { roughness: 0.86, metalness: 0 },
  glass: { roughness: 0.2, metalness: 0 },
  screen: { roughness: 0.2, metalness: 0 },
  screenblue: { roughness: 0.24, metalness: 0 },
  yellow: { roughness: 0.4, metalness: 0 },
  light: { roughness: 0.28, metalness: 0 },
  warm: { roughness: 0.75, metalness: 0 },
  ui_tablet: { roughness: 0.28, metalness: 0 },
  ui_monitor: { roughness: 0.28, metalness: 0 },
  ui_routing: { roughness: 0.28, metalness: 0 },
};

function assetUrl(file = 'pcho-3-detailed.glb') {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${base.endsWith('/') ? base : `${base}/`}spatial/models/${file}`;
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
  const preparedMaterials = new Set();
  scene.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.sharedSpatialGeometry = true;
    for (const entry of materialsOf(node)) {
      // GLTFLoader sdílí jeden materiál mezi více sítěmi; barevnou korekci
      // proto aplikujeme jen jednou, nezávisle na počtu částí vybavení.
      if (!entry || preparedMaterials.has(entry)) continue;
      preparedMaterials.add(entry);
      entry.userData = { ...entry.userData, sharedSpatialMaterial: true };
      const grade = inactiveMaterialGrade[entry.name];
      if (grade && entry.color) entry.color.lerp(new THREE.Color(grade.color), grade.mix);
      const finish = materialFinish[entry.name];
      if (finish) Object.assign(entry, finish);
      entry.envMapIntensity = grade?.environment ?? 0.3;
      if (entry.map) entry.map.colorSpace = THREE.SRGBColorSpace;
      if (entry.emissiveMap) entry.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      configureRoomSurface(entry);
    }
  });
  return scene;
}

function loadPrototype() {
  roomPrototypePromise ??= loader.loadAsync(assetUrl())
    .catch(() => loader.loadAsync(assetUrl('pcho-3.glb')))
    .then((gltf) => preparePrototype(gltf.scene));
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
      for (const entry of cloned) {
        entry.userData = { ...entry.userData, sharedSpatialMaterial: false };
        // Three material.clone() does not copy shader customisation callbacks.
        configureRoomSurface(entry);
      }
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
    // Keep the current activity visibility. Enabling all selection strips here
    // would light up ready rooms after the asynchronous GLB load completes.
    if (child.isMesh) {
      if (!child.userData.selectionLight) child.visible = false;
    }
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
