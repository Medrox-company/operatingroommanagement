'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Building2, Cuboid, ExternalLink, Layers, Map as MapIcon, Minus, Plus, RotateCcw, Search } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CAMPUS_BUILDINGS } from '../../lib/liberec-campus';
import { CAMPUS_DIRECTORY, CAMPUS_DIRECTORY_ALIASES, getCampusDirectoryEntry } from '../../lib/liberec-campus-directory';
import { createCampusScene } from '../../lib/liberec-campus-scene';
import { createCampusFloors, frameCampusBounds } from '../../lib/liberec-campus-floors';
import styles from './liberec-campus.module.css';

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const directoryItems = [
  ...CAMPUS_BUILDINGS,
  ...CAMPUS_DIRECTORY.filter(item => !CAMPUS_BUILDINGS.some(building => building.id === item.id) && !Object.values(CAMPUS_DIRECTORY_ALIASES).includes(item.id)),
];
type SceneSelection = { buildingId: string; inside: boolean; floor: string | null };
type SceneAPI = { show: (selection: SceneSelection) => void; view: (flat: boolean) => void; zoom: (factor: number) => void; reset: () => void };

/** Public campus reference only. No inferred linkage to tenant room records. */
export default function LiberecCampusMap({ appearance }: { appearance: 'dark' | 'light' }) {
  const [selected, setSelected] = useState('A');
  const [query, setQuery] = useState('');
  const [floor, setFloor] = useState<string | null>(null);
  const [inside, setInside] = useState(false);
  const [flat, setFlat] = useState(false);
  const [error, setError] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const mapHeading = useRef<HTMLHeadingElement>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<'map' | 'detail' | null>(null);
  const sceneAPI = useRef<SceneAPI | null>(null);
  const selectionRef = useRef<SceneSelection>({ buildingId: selected, inside, floor });
  selectionRef.current = { buildingId: selected, inside, floor };
  const queryRef = useRef(query);
  queryRef.current = query;
  const building = directoryItems.find(item => item.id === selected) ?? CAMPUS_BUILDINGS[0];
  const hasGeometry = CAMPUS_BUILDINGS.some(item => item.id === selected);
  const information = getCampusDirectoryEntry(selected)?.information;
  const filtered = directoryItems.filter(item => normalize(`${item.id} ${item.name} ${item.floors?.flatMap(level => [level.label, ...level.departments]).join(' ') || ''}`).includes(normalize(query.trim())));
  const choose = (id: string) => {
    const item = directoryItems.find(candidate => candidate.id === id);
    if (!item) return;
    const search = normalize(queryRef.current.trim());
    const match = search ? item.floors?.find(level => normalize([level.label, ...level.departments].join(' ')).includes(search)) : null;
    setSelected(id); setFloor(match?.label ?? null); setInside(Boolean(item.floors?.length && CAMPUS_BUILDINGS.some(candidate => candidate.id === id)));
  };
  const chooseFloor = (label: string | null) => {
    setFloor(label);
    setInside(Boolean(CAMPUS_BUILDINGS.find(item => item.id === selectionRef.current.buildingId)?.floors?.length));
  };
  const level = building.floors?.find(item => item.label === floor);

  useEffect(() => {
    const target = host.current;
    if (!target) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError('3D zobrazení není v tomto prohlížeči dostupné. Budovy a podlaží lze dál procházet v seznamu.'); return; }
    setError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    target.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Prostorový přehled areálu; budovy lze vybrat také v seznamu');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050920);
    scene.fog = new THREE.FogExp2(0x050920, .0025);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
    const model = createCampusScene(); scene.add(model.root);
    let floorModel: ReturnType<typeof createCampusFloors> | null = null;
    const campusBounds = new THREE.Box3();
    model.meshes.forEach(mesh => campusBounds.union(new THREE.Box3().setFromObject(mesh)));
    let isFlat = false;
    let contextAvailable = true;
    const composer = new EffectComposer(renderer);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .55, .55, .42);
    const output = new OutputPass();
    composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(output);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 6; controls.maxDistance = 400;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minPolarAngle = .02;
    controls.screenSpacePanning = true;
    function render() {
      if (!contextAvailable) return;
      composer.render();
      const width = target.clientWidth, height = target.clientHeight;
      const occupied: { left: number; top: number; right: number; bottom: number }[] = [];
      // Prioritize selection and declutter nearby labels; every building remains in the accessible list.
      const buttons = [...(labels.current?.querySelectorAll<HTMLButtonElement>('button[data-scene-label]') ?? [])];
      const selection = selectionRef.current;
      const selectedLabel = selection.inside ? selection.floor : selection.buildingId;
      buttons.sort((a, b) => {
        const selectionPriority = Number(b.dataset.sceneLabel === selectedLabel) - Number(a.dataset.sceneLabel === selectedLabel);
        if (selectionPriority || !floorModel) return selectionPriority;
        // In a top view, show the nearest (uppermost) overlapping floor label.
        return (floorModel.anchors.get(a.dataset.sceneLabel!)?.clone().project(camera).z ?? 1)
          - (floorModel.anchors.get(b.dataset.sceneLabel!)?.clone().project(camera).z ?? 1);
      });
      buttons.forEach(button => {
        const point = (floorModel ?? model).anchors.get(button.dataset.sceneLabel!)?.clone().project(camera);
        if (!point) { button.style.visibility = 'hidden'; return; }
        const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
        const rect = { left: x - button.offsetWidth / 2, right: x + button.offsetWidth / 2, top: y - button.offsetHeight - 12, bottom: y - 12 };
        const visible = point.z > -1 && point.z < 1 && rect.left > 8 && rect.right < width - 8 && rect.top > (selection.inside ? 64 : 8) && rect.bottom < height - 80
          && !occupied.some(other => rect.left < other.right + 4 && rect.right > other.left - 4 && rect.top < other.bottom + 4 && rect.bottom > other.top - 4);
        if (visible) occupied.push(rect);
        button.style.visibility = visible ? 'visible' : 'hidden';
        button.style.left = `${x}px`; button.style.top = `${y}px`;
      });
    }
    const view = (flatView: boolean) => {
      isFlat = flatView;
      controls.target.copy(frameCampusBounds(camera, floorModel?.bounds ?? campusBounds, flatView));
      controls.maxDistance = Math.max(240, camera.position.distanceTo(controls.target) * 2);
      camera.far = Math.max(camera.far, controls.maxDistance + 200);
      camera.updateProjectionMatrix();
      controls.update(); render();
    };
    const show = (selection: SceneSelection) => {
      if (floorModel) { scene.remove(floorModel.root); floorModel.dispose(); floorModel = null; }
      const item = CAMPUS_BUILDINGS.find(candidate => candidate.id === selection.buildingId);
      model.root.visible = !selection.inside;
      if (selection.inside && item?.floors?.length) {
        floorModel = createCampusFloors(item, selection.floor); scene.add(floorModel.root);
      } else model.root.visible = true;
      model.select(selection.buildingId);
      view(isFlat);
    };
    sceneAPI.current = { show, view, zoom: factor => {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset); controls.update(); render();
    }, reset: () => view(false) };
    const resize = () => { const w = target.clientWidth, h = target.clientHeight; if (!w || !h) return; renderer.setSize(w, h); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); view(isFlat); };
    const observer = new ResizeObserver(resize); observer.observe(target);
    controls.addEventListener('change', render);
    const ray = new THREE.Raycaster();
    let down: { x: number; y: number; id: number } | null = null;
    const activePointers = new Set<number>();
    const pointerDown = (event: PointerEvent) => {
      activePointers.add(event.pointerId);
      down = event.isPrimary && event.button === 0 && activePointers.size === 1 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
    };
    const pointerUp = (event: PointerEvent) => {
      activePointers.delete(event.pointerId);
      const start = down; down = null;
      if (!start || !event.isPrimary || event.button !== 0 || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
      const hit = ray.intersectObjects([...(floorModel ?? model).meshes.values()])[0];
      if (hit?.object.userData.floorLabel) chooseFloor(hit.object.userData.floorLabel);
      else if (hit?.object.userData.buildingId) choose(hit.object.userData.buildingId);
    };
    const pointerCancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); down = null; };
    const contextLost = (event: Event) => { event.preventDefault(); contextAvailable = false; setError('Grafické zobrazení bylo přerušeno. Použijte seznam budov nebo modul znovu otevřete.'); };
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('pointercancel', pointerCancel);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    resize(); show(selectionRef.current); setFlat(false);
    return () => {
      sceneAPI.current = null; observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      renderer.domElement.removeEventListener('pointercancel', pointerCancel);
      floorModel?.dispose(); model.dispose(); bloom.dispose(); output.dispose(); composer.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, []);
  useEffect(() => {
    sceneAPI.current?.show({ buildingId: selected, inside, floor });
    if (pendingFocus.current) {
      (pendingFocus.current === 'map' ? mapHeading : detailHeading).current?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [selected, inside, floor]);

  return <section className={styles.campus} data-appearance={appearance} aria-label="3D mapa areálu Liberec">
    <header className={styles.heading}><div><span>KNL · REFERENČNÍ AREÁL</span><h1 ref={mapHeading} tabIndex={-1}>Nemocnice Liberec</h1></div><div className={styles.tools}>
      <button type="button" aria-pressed={!flat} onClick={() => { setFlat(false); sceneAPI.current?.view(false); }}><Cuboid size={17} />3D</button>
      <button type="button" aria-pressed={flat} onClick={() => { setFlat(true); sceneAPI.current?.view(true); }}><MapIcon size={17} />Shora</button>
      <button type="button" onClick={() => { setFlat(false); sceneAPI.current?.reset(); }}><RotateCcw size={17} />Výchozí pohled</button>
    </div></header>
    <p className={styles.disclaimer}>Obrysy podle veřejné mapy KNL · výšky budov jsou ilustrační. Nejde o navigaci pro převoz pacientů ani živý stav sálů.</p>
    <div className={styles.layout}>
      <div className={styles.viewport}>
        <div ref={host} className={styles.scene} />
        {inside && <nav className={styles.breadcrumb} aria-label="Úroveň 3D mapy">
          <button type="button" onClick={event => { if (event.detail === 0) pendingFocus.current = 'map'; setInside(false); setFloor(null); }}><ArrowLeft size={16} />Areál</button>
          <button type="button" onClick={() => chooseFloor(null)}><Building2 size={16} />Budova {building.id}</button>
          {floor && <span>{floor}</span>}
        </nav>}
        {!error && <div ref={labels} className={styles.labels}>{inside
          ? building.floors?.filter(item => floor === null || item.label === floor).map(item => <button key={`${selected}-${item.label}`} data-scene-label={item.label} type="button" aria-pressed={floor === item.label} onClick={() => chooseFloor(item.label)}><Layers size={15} /><b>{item.label}</b></button>)
          : CAMPUS_BUILDINGS.map(item => <button key={item.id} data-scene-label={item.id} type="button" title={`${item.id} · ${item.name}`} aria-label={`${item.id} · ${item.name}`} aria-pressed={selected === item.id} onClick={event => { if (event.detail === 0 && item.floors?.length) pendingFocus.current = 'detail'; choose(item.id); }}><b>{item.id}</b>{selected === item.id && <span>{item.name}</span>}</button>)}</div>}
        {error && <p role="status" className={styles.fallback}>{error}</p>}
        <div className={styles.sceneCaption}><span><i />{inside ? `Budova ${selected} · ${floor ?? `${building.floors?.length} podlaží`}` : `${CAMPUS_BUILDINGS.length} budov v podkladu`}</span><span>{inside ? 'Schematické podlaží · není zaměřený půdorys' : !hasGeometry ? `${building.id} · pouze adresář, bez ověřeného obrysu` : 'Tažením otáčet · kolečkem přiblížit'}</span></div>
        <div className={styles.zoom}><button type="button" aria-label="Přiblížit mapu" onClick={() => sceneAPI.current?.zoom(.8)}><Plus /></button><button type="button" aria-label="Oddálit mapu" onClick={() => sceneAPI.current?.zoom(1.25)}><Minus /></button></div>
      </div>
      <aside className={styles.inspector} data-inside={inside} aria-label="Budovy a podlaží">
        <label className={styles.search}><Search size={18} /><input aria-label="Hledat budovu nebo oddělení" placeholder="Budova nebo oddělení…" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <div className={styles.buildings} aria-label="Seznam budov">{filtered.map(item => <button key={item.id} type="button" aria-pressed={selected === item.id} onClick={() => choose(item.id)}><b>{item.id}</b><span>{item.name}</span></button>)}{!filtered.length && <p role="status">Nenalezena žádná budova.</p>}</div>
        <div className={styles.detail} aria-live="polite"><span className={styles.eyebrow}><Building2 size={16} />{hasGeometry ? 'BUDOVA' : 'ADRESÁŘ'} {building.id}</span><h2 ref={detailHeading} tabIndex={-1}>{building.name}</h2>
          {!hasGeometry && <p className={styles.muted}>Zveřejněný záznam bez ověřeného obrysu v tomto 3D podkladu. Umístění nevymýšlíme.</p>}
          {building.floors?.length ? <><p>Podlaží a pracoviště podle KNL</p>{floor !== null
            ? <label className={styles.floorSelect}><Layers size={16} /><select aria-label={`Vybrat podlaží — ${building.id}`} value={floor} onChange={event => { if (!event.target.value) pendingFocus.current = 'detail'; chooseFloor(event.target.value || null); }}><option value="">{hasGeometry ? 'Všechna podlaží' : 'Vyberte podlaží'}</option>{building.floors.map(item => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
            : <div className={styles.floors}>
            {hasGeometry && <button type="button" aria-pressed={inside && floor === null} onClick={() => chooseFloor(null)}><Layers size={14} />Všechna podlaží</button>}
            {building.floors.map(item => <button key={item.label} type="button" aria-pressed={floor === item.label} onClick={event => { if (event.detail === 0) pendingFocus.current = 'detail'; chooseFloor(item.label); }}>{item.label}</button>)}
          </div>}
          {level ? <section className={styles.departments} aria-label={`Pracoviště — ${level.label}`}><h3>{level.label}</h3>
            {level.departments.length ? <ul>{level.departments.map((name, index) => <li key={`${index}-${name}`}>{name}</li>)}</ul> : <p>Pro toto podlaží zdroj neuvádí žádné pracoviště.</p>}
          </section> : <p className={styles.muted}>Vyberte podlaží v modelu nebo v seznamu a zobrazí se všechna zveřejněná pracoviště.</p>}</> : <p>Veřejná mapa pro tuto budovu neuvádí podlaží ani rozpis pracovišť.</p>}
          {information?.map(item => <a className={styles.infoLink} key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}<ExternalLink size={14} /></a>)}
          <div className={styles.pendingPlans}><Layers size={16} /><div><strong>Lůžka a sály podle vašich podkladů</strong><p>Přesné rozmístění a počty doplníme po dodání půdorysů. Zde nejsou zobrazené odhadované kapacity ani živý stav.</p></div></div>
        </div>
      </aside>
    </div>
    <footer className={styles.source}><span>Veřejný podklad KNL · ověřeno 24. 10. 2026 · orientační 3D rekonstrukce</span><a href="https://www.nemlib.cz/mapa/" target="_blank" rel="noopener noreferrer">Oficiální mapa a omezení v areálu <ExternalLink size={14} /></a></footer>
  </section>;
}
