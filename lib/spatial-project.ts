import {
  createRoom,
  furnish,
  uid,
  validateProject,
  type BuildingProject,
  type Room,
} from '../vendor/orms-spatial-editor/src/model.js';

export type { BuildingProject, Floor, Room, Equipment } from '../vendor/orms-spatial-editor/src/model.js';

export interface SpatialProjectPayload {
  project: BuildingProject | null;
  revision: number;
  updatedAt: string | null;
}

const sanitizeIdPart = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80) || 'room';
type SpatialRoomSource = { id: string; name: string };

/**
 * Vytvoří použitelný první návrh přímo ze sálů daného zařízení. Kompaktní rastr
 * zachovává čitelné rozestupy i u 15+ sálů a mezi řadami vede průchozí chodba.
 * Po prvním uložení už je zdrojem pravdy databáze.
 */
export function createDefaultSpatialProject(
  rooms: SpatialRoomSource[],
  hospitalId: string | null,
  hospitalName?: string | null,
): BuildingProject {
  const floorId = 'floor-operating-block';
  const floor = {
    id: floorId,
    name: 'Operační blok',
    elevation: 0,
    perimeterWalls: true,
    perimeterWallHeight: 3,
    perimeterWallThickness: 0.42,
    knlBoundaryEnabled: true,
    knlBoundaryOffsetMode: 'corridor' as const,
    knlBoundaryOffset: 3,
    knlBoundaryPreset: 'facade' as const,
  };
  const count = Math.max(rooms.length, 1);
  const columns = Math.min(count, Math.max(3, Math.ceil(Math.sqrt(count * 1.4))));
  const rows = Math.max(1, Math.ceil(count / columns));
  const roomSize = 7;
  // Sousední sály sdílejí stejnou konstrukční osu stěny; nevznikají mezi nimi
  // světlé spáry a celek čteme jako jeden souvislý operační trakt.
  const spacing = 7;
  const rowSpacing = 10;
  const width = Math.max(23, Math.min(columns, rooms.length) * spacing);

  const corridors: Room[] = [];
  const corridorPositions = rows > 1
    ? Array.from({ length: rows - 1 }, (_, index) => (index - (rows - 2) / 2) * rowSpacing)
    : [rowSpacing / 2];
  corridorPositions.forEach((z, index) => {
    const corridor = createRoom(floorId, 'corridor', 0, z);
    corridor.id = `central-corridor-${index + 1}`;
    corridor.name = corridorPositions.length === 1 ? 'Centrální chodba' : `Centrální chodba ${index + 1}`;
    corridor.width = width;
    corridor.depth = 3;
    corridors.push(corridor);
  });

  const spatialRooms: Room[] = [];
  const items: BuildingProject['items'] = [];
  rooms.forEach((room, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rowCount = Math.min(columns, rooms.length - row * columns);
    const x = (column - Math.max(rowCount - 1, 0) / 2) * spacing;
    const z = (row - (rows - 1) / 2) * rowSpacing;
    const spatialRoom = createRoom(floorId, 'operating', x, z);
    spatialRoom.id = `operating-${sanitizeIdPart(room.id)}`;
    spatialRoom.name = room.name;
    spatialRoom.externalId = room.id;
    spatialRoom.rotation = 0;
    spatialRooms.push(spatialRoom);
    items.push(...furnish(spatialRoom));
  });

  return validateProject({
    schemaVersion: 1,
    id: `building-${sanitizeIdPart(hospitalId || 'default')}`,
    name: hospitalName?.trim() || 'Operační trakt',
    units: 'm',
    floors: [floor],
    rooms: [...corridors, ...spatialRooms],
    items,
  });
}

/** Doplní prázdné vazby na aplikační sály podle názvu a následně pořadí. */
export function autoLinkSpatialRooms(project: BuildingProject, rooms: SpatialRoomSource[]): BuildingProject {
  const next = structuredClone(project);
  const operatingRooms = next.rooms.filter((room) => room.type === 'operating');
  const used = new Set(operatingRooms.map((room) => room.externalId).filter(Boolean));

  for (const spatialRoom of operatingRooms) {
    if (spatialRoom.externalId && rooms.some((room) => room.id === spatialRoom.externalId)) continue;
    const byName = rooms.find((room) => room.name.trim().toLocaleLowerCase('cs') === spatialRoom.name.trim().toLocaleLowerCase('cs') && !used.has(room.id));
    const fallback = rooms.find((room) => !used.has(room.id));
    const match = byName || fallback;
    spatialRoom.externalId = match?.id || '';
    if (match) {
      used.add(match.id);
      spatialRoom.name = match.name;
    }
  }

  return validateProject(next);
}

export function spatialProjectCounts(project: BuildingProject) {
  const operatingRooms = project.rooms.filter((room) => room.type === 'operating');
  return {
    floors: project.floors.length,
    spaces: project.rooms.length,
    equipment: project.items.length,
    linkedRooms: operatingRooms.filter((room) => Boolean(room.externalId)).length,
    operatingRooms: operatingRooms.length,
  };
}

export function newSpatialId(prefix: string) {
  return uid(prefix);
}
