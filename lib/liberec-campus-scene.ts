import * as THREE from 'three';
import { CAMPUS_BUILDINGS, CAMPUS_MAP_HEIGHT, CAMPUS_MAP_WIDTH, CAMPUS_TERRAIN } from './liberec-campus';

const mapShape = (points: [number, number][]) => new THREE.Shape(points.map(([x, y]) =>
  new THREE.Vector2((x - CAMPUS_MAP_WIDTH / 2) / 10, -(y - CAMPUS_MAP_HEIGHT / 2) / 10)));

/** Original planner's dark-glass vocabulary, not clinical state colors or measured architecture. */
export function createCampusScene() {
  const root = new THREE.Group();
  root.name = 'KNL reference campus';
  const meshes = new Map<string, THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>>();
  const outlines = new Map<string, THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>>();
  const anchors = new Map<string, THREE.Vector3>();

  root.add(new THREE.HemisphereLight(0x87a5d8, 0x04070d, .9));
  root.add(new THREE.AmbientLight(0x1c2d4c, .55));
  const key = new THREE.DirectionalLight(0xd6e4ff, 1.2);
  key.position.set(-55, 110, 75); root.add(key);
  const rim = new THREE.DirectionalLight(0x3f6fff, .7);
  rim.position.set(80, 45, -90); root.add(rim);

  // Procedural underglow: no external image, route data or per-frame animation.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 180), new THREE.ShaderMaterial({
    uniforms: { base: { value: new THREE.Color(0x050920) }, glow: { value: new THREE.Color(0x142b50) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform vec3 base; uniform vec3 glow; void main(){float falloff=1.0-smoothstep(0.0,0.52,length(vUv-0.5)); gl_FragColor=vec4(mix(base,glow,falloff),1.0);}',
    depthWrite: false,
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.3; root.add(ground);

  const dots: number[] = [];
  for (let x = -72; x <= 72; x += 2) for (let z = -50; z <= 50; z += 2) dots.push(x, -.22, z);
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
  const grid = new THREE.Points(gridGeometry, new THREE.PointsMaterial({
    color: 0x96bef5, size: .12, transparent: true, opacity: .22, depthWrite: false,
  }));
  grid.name = 'Reference grid — not measured distances'; root.add(grid);

  for (const area of CAMPUS_TERRAIN) {
    const geometry = new THREE.ShapeGeometry(mapShape(area.points));
    geometry.rotateX(-Math.PI / 2);
    const terrain = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0x35688f, transparent: true, opacity: .14, depthWrite: false,
    }));
    terrain.position.y = -.16; root.add(terrain);
  }

  for (const item of CAMPUS_BUILDINGS) {
    const shape = mapShape(item.points);
    const baseGeometry = new THREE.ExtrudeGeometry(shape, { depth: .25, bevelEnabled: false });
    baseGeometry.rotateX(-Math.PI / 2);
    const base = new THREE.Mesh(baseGeometry, new THREE.MeshStandardMaterial({ color: 0x08101d, roughness: .75, metalness: .2 }));
    root.add(base);

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: item.height / 10, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8ccfff, roughness: .06, metalness: .25, transparent: true,
      opacity: .16, depthWrite: false, side: THREE.DoubleSide,
      emissive: 0x1c5481, emissiveIntensity: .15,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = .25; mesh.userData.buildingId = item.id;
    root.add(mesh); meshes.set(item.id, mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), new THREE.LineBasicMaterial({
      color: 0x4f86c9, transparent: true, opacity: .65,
    }));
    edges.position.y = .25; root.add(edges); outlines.set(item.id, edges);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = box.getCenter(new THREE.Vector3()); center.y = box.max.y + 1.5;
    anchors.set(item.id, center);
  }

  const select = (id: string) => {
    meshes.forEach((mesh, key) => {
      mesh.material.opacity = key === id ? .28 : .16;
      mesh.material.emissiveIntensity = key === id ? .55 : .15;
      const outline = outlines.get(key)!.material;
      outline.color.set(key === id ? 0xa6edff : 0x4f86c9);
      outline.opacity = key === id ? 1 : .65;
    });
  };
  const dispose = () => {
    root.traverse(object => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
    });
    root.clear(); meshes.clear(); outlines.clear(); anchors.clear();
  };
  return { root, meshes, anchors, select, dispose };
}
