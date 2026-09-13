import { createRoom, demoProject, furnish, validateProject } from '../../vendor/orms-spatial-editor/src/model.js';

/** Local visual fixture only. No application state, API or persistence is used. */
export function createReferenceProject() {
  const project = demoProject();
  project.id = 'visual-reference-building';
  project.name = 'Vizuální reference · šest operačních sálů';
  const floor = project.floors[0];
  floor.id = 'visual-reference-floor';
  floor.name = 'Operační blok';
  floor.knlBoundaryEnabled = false;
  project.floors = [floor];
  project.rooms = [];
  project.items = [];

  const width = 7.03;
  const depth = 6.825;
  const corridorDepth = 2.8;
  const rowCenter = (depth + corridorDepth) / 2;
  const buildingDepth = depth * 2 + corridorDepth;

  const addRoom = (id, name, type, x, z, roomWidth, roomDepth, rotation = 0) => {
    const room = Object.assign(createRoom(floor.id, type, x, z), {
      id, name, width: roomWidth, depth: roomDepth, height: 3.09, rotation,
    });
    project.rooms.push(room);
    project.items.push(...furnish(room).map((item, index) => ({ ...item, id: `${id}-item-${index + 1}` })));
    return room;
  };

  for (let index = 0; index < 6; index++) {
    addRoom(
      `or-${index + 1}`, `PCHO ${index + 1}`, 'operating',
      (index % 3 - 1) * width, index < 3 ? -rowCenter : rowCenter,
      width, depth, index < 3 ? 0 : 180,
    );
  }

  addRoom('center-corridor', 'Centrální chodba', 'corridor', 0, 0, width * 3, corridorDepth);
  addRoom('west-corridor', 'Boční chodba', 'corridor', -width * 1.5 - 1.2, 0, 2.4, buildingDepth);
  addRoom('east-preparation', 'Přípravna', 'preparation', width * 1.5 + 1.4, -rowCenter, 2.8, depth);
  addRoom('east-storage', 'Sklad materiálu', 'storage', width * 1.5 + 1.4, rowCenter, 2.8, depth, 180);
  addRoom('east-corridor', 'Spojovací chodba', 'corridor', width * 1.5 + 1.4, 0, 2.8, corridorDepth);

  return validateProject(project);
}
