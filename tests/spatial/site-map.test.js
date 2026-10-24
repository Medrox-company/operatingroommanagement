import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { buildFloor, disposeTree } from '../../vendor/orms-spatial-editor/src/geometry.js';
import {
  ROOFTOP_CLEARANCE,
  SITE_LIMITS,
  SiteStore,
  clampSiteElement,
  createDefaultSiteProject,
  createSiteElement,
  metres,
  pavilionUnder,
  siteWarnings,
  validateSiteProject,
} from '../../vendor/orms-spatial-editor/src/site-model.js';
import { validateProject } from '../../vendor/orms-spatial-editor/src/model.js';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const heliportOf = project => project.rooms.find(room => room.type === 'heliport');

function deckTop(project) {
  const built = buildFloor(project, project.floors[0].id);
  try {
    built.group.updateMatrixWorld(true);
    const deck = built.entities.get(heliportOf(project).id).children.find(mesh => mesh.name === 'heliport deck');
    return new THREE.Box3().setFromObject(deck).max.y;
  } finally {
    disposeTree(built.group);
  }
}

test('default site is a valid, separate project kind with a rooftop heliport', () => {
  const project = createDefaultSiteProject('hospital-a', 'Nemocnice A');
  assert.equal(project.kind, 'site');
  assert.equal(project.name, 'Nemocnice A');
  assert.deepEqual(project.items, []);
  const heliport = heliportOf(project);
  const roof = pavilionUnder(project, heliport);
  assert.ok(roof, 'Default heliport stands on a pavilion');
  assert.equal(heliport.height, +(roof.height + ROOFTOP_CLEARANCE).toFixed(3));
  assert.deepEqual(siteWarnings(project), []);
  // Mapa areálu se nesmí dostat do tabulky dispozice sálů ani naopak.
  assert.throws(() => validateProject(project));
  assert.throws(() => validateSiteProject({ ...project, kind: undefined }));
});

test('heliport height is editable within limits and rendered at the requested level', () => {
  const project = createDefaultSiteProject(null);
  const heliport = heliportOf(project);
  assert.ok(Math.abs(deckTop(project) - heliport.height) < 0.01, 'Deck top matches the stored rooftop height');

  for (const height of [0, 7.5, 42, SITE_LIMITS.heliportHeight[1]]) {
    const store = new SiteStore(project);
    store.commit(next => { heliportOf(next).height = height; heliportOf(next).x = 200; });
    const expected = Math.max(0.14, height);
    assert.ok(Math.abs(deckTop(store.value) - expected) < 0.01, `Deck at ${height} m`);
  }

  const invalid = structuredClone(project);
  heliportOf(invalid).height = SITE_LIMITS.heliportHeight[1] + 1;
  assert.throws(() => validateSiteProject(invalid), /výška heliportu/);
  assert.equal(clampSiteElement({ ...heliportOf(invalid) }).height, SITE_LIMITS.heliportHeight[1]);
  assert.equal(clampSiteElement({ ...heliportOf(invalid), height: -4 }).height, 0);
});

test('a heliport below the roof it stands on is reported, flat elements may overlap', () => {
  const project = createDefaultSiteProject(null);
  heliportOf(project).height = 5;
  assert.match(siteWarnings(project).join('\n'), /Heliport: plošina \(5 m\) leží pod střechou Pavilon A \(21,6 m\)/);

  const flat = createDefaultSiteProject(null);
  const road = createSiteElement(flat.floors[0].id, 'road', 0, 0);
  flat.rooms.push(road);
  assert.deepEqual(siteWarnings(validateSiteProject(flat)), [], 'Roads may cross pavilions and plazas');
  assert.equal(metres(21.6), '21,6 m');
});

test('every site element type builds selectable geometry with selection lights', () => {
  const project = createDefaultSiteProject(null);
  const built = buildFloor(project, project.floors[0].id, { selectedIds: project.rooms.map(room => room.id) });
  try {
    for (const room of project.rooms) {
      const group = built.entities.get(room.id);
      assert.equal(group.userData.entity, 'room');
      assert.equal(group.userData.entityId, room.id);
      assert.ok(group.children.some(mesh => mesh.userData.selectionLight && mesh.visible), `${room.type} shows selection`);
    }
  } finally {
    disposeTree(built.group);
  }
});

test('the API stores site maps separately, validates them and reuses the 3D permission', () => {
  const route = read('app/api/spatial-site/route.ts');
  assert.match(route, /const TABLE = 'spatial_site_projects'/);
  assert.match(route, /const SUBMODULE = 'dashboard\.spatial'/);
  assert.match(route, /validateSiteProject\(body\.project\)/);
  assert.match(route, /requireHospitalAccess\(request, write \? \{ adminOnly: true \} : undefined\)/);
  assert.match(route, /assertSameOrigin\(request\)/);
  const sql = read('scripts/24-spatial-site-projects.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.spatial_site_projects/);
  assert.match(sql, /project ->> 'kind' = 'site'/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
});

test('settings expose the site map with the same editor chrome as the 3D layout', () => {
  const manager = read('components/SiteMapEditorManager.tsx');
  assert.ok(manager.includes("import './spatial/spatial-editor-theme.css'"));
  assert.match(manager, /className="spatial-settings-module/);
  assert.match(manager, /className="spatial-editor-commandbar"/);
  assert.match(manager, /mountSiteEditor\(/);
  const settings = read('components/SettingsPage.tsx');
  assert.match(settings, /id: 'site-map'/);
  assert.match(settings, /title: 'Mapa areálu'/);
});
