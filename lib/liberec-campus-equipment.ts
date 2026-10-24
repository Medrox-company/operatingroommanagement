import * as THREE from 'three';

/**
 * Reusable visual symbols in the original operativity renderer's palette.
 * These do not establish an actual room, bed count, clinical state or location.
 * Mount them only from supplied floor plans / confirmed inventory. Dimensions
 * are illustrative model units, not measurements of equipment or the hospital.
 * Every returned group owns its geometry and materials; the caller disposes them.
 */
export const EQUIPMENT_FOOTPRINTS = {
  hospitalBed: { width: 2.2, depth: 3, height: 1.7 },
  operatingTheatre: { width: 4.2, depth: 4.2, height: 3.3 },
  departmentMarker: { width: 2.8, depth: 2.2, height: 1.7 },
} as const;

const palette = {
  metal: 0x8796ad, metalDark: 0x2c384b, dark: 0x111a28,
  pad: 0x1b2a44, frame: 0x3a4860, mattress: 0x6d7f99,
  blanket: 0x2b4d7c, pillow: 0x8fa2bc, cyan: 0x63d4ff,
  cabinet: 0x162238, desk: 0x1b2940, neutral: 0xb4c2d4,
};

function surface(color: number, roughness = .45, metalness = .4) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function box(parent: THREE.Object3D, name: string, size: [number, number, number], position: [number, number, number], color: number, outlined = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface(color));
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  if (outlined) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({
      color: palette.cyan, transparent: true, opacity: .6,
    }));
    edges.name = `${name} outline`; mesh.add(edges);
  }
  return mesh;
}

function cylinder(parent: THREE.Object3D, name: string, radius: number, height: number, position: [number, number, number], color = palette.metal) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 16), surface(color));
  mesh.name = name; mesh.position.set(...position); mesh.castShadow = true; parent.add(mesh);
  return mesh;
}

function rod(parent: THREE.Object3D, name: string, from: [number, number, number], to: [number, number, number], radius = .025) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const mesh = cylinder(parent, name, radius, a.distanceTo(b), [0, 0, 0]);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return mesh;
}

function castors(parent: THREE.Object3D, width: number, depth: number, x = 0, z = 0) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const wheel = cylinder(parent, 'Castor', .075, .045, [x + sx * width / 2, .075, z + sz * depth / 2], palette.dark);
    wheel.rotation.z = Math.PI / 2;
    rod(parent, 'Castor support', [wheel.position.x, .1, wheel.position.z], [wheel.position.x, .26, wheel.position.z], .025);
  }
}

/** Neutral inactive display: no simulated patient readings, ECG or clinical colors. */
function display(parent: THREE.Object3D, name: string, x: number, y: number, z: number, scale = 1) {
  const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group);
  box(group, 'Monitor casing', [.5 * scale, .34 * scale, .08], [0, 0, 0], palette.dark, true);
  box(group, 'Inactive display', [.44 * scale, .27 * scale, .012], [0, 0, .047], 0x0a1220);
  for (let i = 0; i < 3; i += 1) {
    box(group, 'Neutral display line', [(.28 - i * .04) * scale, .012 * scale, .006], [-.025 * scale, (.07 - i * .07) * scale, .057], palette.pillow);
  }
  return group;
}

function finish(content: THREE.Group, name: string, kind: string) {
  content.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(content);
  const center = bounds.getCenter(new THREE.Vector3());
  content.position.set(-center.x, -bounds.min.y, -center.z);
  const root = new THREE.Group(); root.name = name;
  root.userData = { equipmentKind: kind, schematic: true };
  root.add(content); root.updateMatrixWorld(true);
  return root;
}

/** Centered X/Z, resting at Y=0; fits EQUIPMENT_FOOTPRINTS.hospitalBed. */
export function createHospitalBed(): THREE.Group {
  const group = new THREE.Group();
  castors(group, .84, 1.58);
  box(group, 'Bed underframe', [.88, .12, 1.66], [0, .3, 0], palette.metalDark);
  box(group, 'Bed frame', [1.08, .14, 2.12], [0, .52, 0], palette.frame, true);
  box(group, 'Mattress', [1, .16, 1.96], [0, .67, 0], palette.mattress);
  box(group, 'Blanket', [1.02, .06, 1.2], [0, .78, .31], palette.blanket);
  box(group, 'Pillow', [.74, .12, .32], [0, .81, -.69], palette.pillow);
  box(group, 'Headboard', [1.1, .54, .08], [0, .76, -1.08], palette.frame, true);
  box(group, 'Footboard', [1.1, .36, .08], [0, .67, 1.08], palette.frame, true);
  for (const x of [-.58, .58]) {
    rod(group, 'Side rail', [x, .95, -.7], [x, .95, .7]);
    for (const z of [-.7, 0, .7]) rod(group, 'Rail support', [x, .57, z], [x, .95, z], .018);
  }
  cylinder(group, 'Monitor stand', .025, 1.28, [.87, .64, -.8]);
  box(group, 'Monitor stand base', [.35, .05, .3], [.87, .025, -.8], palette.metalDark);
  display(group, 'Bedside monitor', .87, 1.37, -.8, .9);
  return finish(group, 'Hospital bed — schematic equipment', 'hospital-bed');
}

function surgicalLamp(parent: THREE.Object3D, index: number, x: number, y: number, z: number) {
  const bend: [number, number, number] = [x * .6, 2.73, z * .45];
  rod(parent, `Lamp ${index} upper arm`, [0, 2.9, -.16], bend, .036);
  rod(parent, `Lamp ${index} articulated arm`, bend, [x, y + .14, z], .032);
  cylinder(parent, `Lamp ${index} joint`, .065, .08, bend);
  const head = new THREE.Group(); head.name = `Surgical lamp ${index}`; head.position.set(x, y, z); parent.add(head);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(.1, .35, .14, 24), surface(0x9aa8bc, .28, .6));
  shell.name = 'Lamp housing'; head.add(shell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.32, .024, 8, 32), new THREE.MeshBasicMaterial({ color: 0xbfe4ff }));
  rim.name = 'Lamp rim'; rim.rotation.x = Math.PI / 2; rim.position.y = -.07; head.add(rim);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.29, 24), new THREE.MeshBasicMaterial({ color: 0x8fa9c6, side: THREE.DoubleSide }));
  lens.name = 'Neutral lamp lens'; lens.rotation.x = Math.PI / 2; lens.position.y = -.071; head.add(lens);
}

function trolley(parent: THREE.Object3D, x: number, z: number) {
  castors(parent, .6, .36, x, z);
  box(parent, 'Instrument trolley shelf', [.76, .05, .5], [x, .35, z], palette.metalDark);
  box(parent, 'Instrument trolley top', [.78, .045, .52], [x, 1, z], palette.metal, true);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(parent, 'Trolley upright', [x + sx * .3, .2, z + sz * .18], [x + sx * .3, 1, z + sz * .18], .02);
  box(parent, 'Instrument tray', [.34, .04, .26], [x, 1.04, z], palette.neutral);
}

/** One schematic theatre equipment set, not one inferred real operating room. */
export function createOperatingTheatre(): THREE.Group {
  const group = new THREE.Group();
  box(group, 'Surgical table base', [.75, .12, .65], [0, .06, 0], palette.metalDark, true);
  cylinder(group, 'Surgical table column', .14, .86, [0, .55, 0]);
  box(group, 'Surgical table frame', [.68, .1, 1.98], [0, 1, 0], palette.metal);
  box(group, 'Surgical table pad', [.64, .09, 1.78], [0, 1.095, .05], palette.pad, true);
  box(group, 'Surgical head support', [.5, .08, .34], [0, 1.09, -1.03], palette.pad);
  for (const x of [-.48, .48]) box(group, 'Surgical arm support', [.25, .065, .68], [x, 1.06, -.2], palette.pad);

  cylinder(group, 'Lamp ceiling hub', .18, .1, [0, 3.1, -.16], palette.metalDark);
  cylinder(group, 'Lamp suspension', .04, .24, [0, 2.93, -.16]);
  surgicalLamp(group, 1, -.64, 2.26, .18);
  surgicalLamp(group, 2, .62, 2.38, -.48);

  castors(group, .54, .48, -1.14, -.85);
  box(group, 'Anaesthesia machine', [.7, .86, .64], [-1.14, .65, -.85], palette.cabinet, true);
  box(group, 'Anaesthesia machine top', [.78, .05, .72], [-1.14, 1.105, -.85], palette.metal);
  display(group, 'Anaesthesia monitor', -1.14, 1.45, -.9, 1.15);
  for (const x of [-1.34, -1.08]) cylinder(group, 'Neutral equipment control', .05, .1, [x, 1.18, -.57], palette.pillow);
  for (const y of [.4, .66, .92]) box(group, 'Machine drawer handle', [.32, .018, .03], [-1.14, y, -.515], palette.metal);

  box(group, 'Monitor stand base', [.52, .08, .42], [1.13, .04, -.82], palette.metalDark);
  cylinder(group, 'Theatre monitor pole', .027, 1.4, [1.13, .78, -.82]);
  display(group, 'Theatre monitor', 1.13, 1.57, -.82, 1.15);
  trolley(group, -1.08, 1.16); trolley(group, 1.08, 1.16);

  for (const x of [-.5, .5]) {
    box(group, 'Storage cabinet', [.86, 1.5, .34], [x, .75, -1.68], palette.cabinet, true);
    box(group, 'Cabinet glazed panel', [.74, 1.28, .025], [x, .76, -1.493], palette.pad);
    box(group, 'Cabinet handle', [.02, .22, .025], [x + .27, .78, -1.471], palette.metal);
  }
  return finish(group, 'Operating theatre — schematic equipment', 'operating-theatre');
}

/** Generic administrative desk; does not infer clinical equipment for a department. */
export function createDepartmentMarker(): THREE.Group {
  const group = new THREE.Group();
  box(group, 'Department desk', [2.12, .12, .86], [0, .9, 0], palette.desk, true);
  for (const x of [-.88, .88]) box(group, 'Desk pedestal', [.25, .84, .66], [x, .42, 0], palette.cabinet);
  cylinder(group, 'Desk display stand', .025, .24, [0, 1.08, -.12]);
  display(group, 'Department display', 0, 1.34, -.12, 1.2);
  box(group, 'Keyboard', [.62, .025, .21], [0, .975, .25], palette.metalDark);
  cylinder(group, 'Chair pedestal', .04, .44, [0, .22, .9]);
  box(group, 'Chair base', [.64, .05, .52], [0, .025, .9], palette.metalDark);
  box(group, 'Chair seat', [.6, .1, .55], [0, .49, .9], palette.pad);
  box(group, 'Chair back', [.6, .48, .08], [0, .74, 1.15], palette.pad);
  return finish(group, 'Department desk — schematic marker', 'department-marker');
}
