import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const modelCache = new Map();
const floorEquipment = new Set(['table', 'anesthesia', 'monitor', 'cabinet', 'trolley', 'sink', 'bed', 'stool']);

function assetUrl(kind) {
  const base = typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/';
  return `${base.endsWith('/') ? base : `${base}/`}spatial/models/${kind}.glb`;
}

function preparePrototype(kind, scene) {
  scene.name = `GLB · ${kind}`;
  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.userData.sharedSpatialGeometry = true;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const entry of materials) {
      if (!entry) continue;
      entry.envMapIntensity = Math.max(entry.envMapIntensity ?? 0, 0.24);
      const name = node.name.toLowerCase();
      if (name.includes('lamp_lens') || name.includes('led_module')) {
        entry.emissive?.setHex(0xc9e6ff);
        entry.emissiveIntensity = 0.95;
      } else if (name.includes('display_glass')) {
        entry.emissive?.setHex(0x0b3f70);
        entry.emissiveIntensity = 0.72;
      } else if (name.includes('screen_trace')) {
        entry.emissive?.setHex(0x8fdfff);
        entry.emissiveIntensity = 0.88;
      } else if (entry.color && entry.color.r + entry.color.g + entry.color.b > 1.65) {
        // Zdrojové modely jsou téměř bílé. V referenci je nerez a lakovaný
        // kov zřetelně studeně modrý, nikoli přepálený do bíla.
        entry.color.lerp(new THREE.Color(0x667ba8), 0.34);
      }
    }
  });
  return scene;
}

function loadPrototype(kind) {
  if (!modelCache.has(kind)) {
    modelCache.set(kind, loader.loadAsync(assetUrl(kind)).then((gltf) => preparePrototype(kind, gltf.scene)));
  }
  return modelCache.get(kind);
}

function contactShadowFor(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(0.34, size.x * 1.08), Math.max(0.34, size.z * 1.08)),
    new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec2 vUv; void main(){float d=length((vUv-0.5)*2.0);float a=(1.0-smoothstep(0.12,1.0,d))*0.16;gl_FragColor=vec4(0.018,0.03,0.075,a);}',
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shadow.name = 'equipment contact shadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(center.x, 0.009, center.z);
  shadow.renderOrder = 2;
  return shadow;
}

function clonePrototype(prototype, kind) {
  const clone = prototype.clone(true);
  clone.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    // Geometrie zůstává sdílená mezi sály, ale materiál klonujeme, aby živé
    // zvýraznění nebo případný editor nikdy nezměnily ostatní instance.
    node.material = Array.isArray(node.material)
      ? node.material.map((entry) => entry.clone())
      : node.material.clone();
    node.userData.sharedSpatialGeometry = true;
  });
  if (floorEquipment.has(kind)) clone.add(contactShadowFor(clone));
  return clone;
}

function replaceProceduralEquipment(item, prototype) {
  const model = clonePrototype(prototype, item.userData.assetKind);
  const previous = [...item.children];
  for (const child of previous) item.remove(child);
  item.add(model);
  item.userData.assetHydrated = true;
  item.userData.assetSource = 'glb';
  return previous;
}

/**
 * Nahradí rychlé procedurální zástupce autorskými GLB modely z dodaného
 * prostorového balíčku. Zástupci zůstávají fallbackem při síťové chybě.
 */
export async function hydrateEquipmentModels(root, {
  onProgress = () => {},
  shouldApply = () => true,
} = {}) {
  const items = [];
  root?.traverse((node) => {
    if (node.userData?.entity === 'item' && node.userData.assetKind) items.push(node);
  });
  const kinds = [...new Set(items.map((item) => item.userData.assetKind))];
  if (!kinds.length) {
    onProgress(1, 1);
    return false;
  }

  let loaded = 0;
  const entries = await Promise.all(kinds.map(async (kind) => {
    try {
      return [kind, await loadPrototype(kind)];
    } catch (error) {
      console.warn(`3D model ${kind} se nepodařilo načíst; zůstává procedurální náhrada.`, error);
      return [kind, null];
    } finally {
      loaded += 1;
      onProgress(loaded, kinds.length);
    }
  }));

  if (!shouldApply()) return false;
  const models = new Map(entries);
  let changed = false;
  const obsoleteGeometry = new Set();
  const obsoleteMaterials = new Set();
  for (const item of items) {
    const prototype = models.get(item.userData.assetKind);
    if (!prototype || item.userData.assetHydrated) continue;
    for (const root of replaceProceduralEquipment(item, prototype)) root.traverse((node) => {
      if (node.geometry) obsoleteGeometry.add(node.geometry);
      if (node.material) for (const entry of Array.isArray(node.material) ? node.material : [node.material]) obsoleteMaterials.add(entry);
    });
    changed = true;
  }
  for (const geometry of obsoleteGeometry) geometry.dispose();
  for (const entry of obsoleteMaterials) entry.dispose();
  return changed;
}
