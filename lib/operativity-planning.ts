import type { DayWorkingHours, OperatingRoom, WeeklySchedule } from '../types';
import { roomSpecialtyColor, type RoomScheduleAllocationKind, type RoomScheduleDayPart } from './room-specialty';

export interface OperativityPlanningDepartment {
  id: string;
  name: string;
  short_code?: string | null;
  accent_color?: string | null;
  is_active?: boolean;
}

export interface OperativityPlanningAllocation {
  id?: string;
  operating_room_id: string;
  department_id: string | null;
  allocation_date: string;
  day_part: RoomScheduleDayPart;
  allocation_kind?: RoomScheduleAllocationKind | null;
  updated_at?: string;
}

export interface OperativityPlanningSnapshot {
  hospitalId: string;
  hospitalName: string;
  rooms: ReadonlyArray<Pick<OperatingRoom, 'id' | 'name' | 'department' | 'weeklySchedule' | 'sort_order'>>;
  departments: ReadonlyArray<OperativityPlanningDepartment>;
  allocations: ReadonlyArray<OperativityPlanningAllocation>;
  /** Import this calendar year and the following one; no unbounded date expansion. */
  year?: number;
}

export interface OperativityPlanningHours {
  from: string;
  split: string;
  to: string;
}

export interface OperativityPlanningRoom {
  id: string;
  name: string;
  code: string;
  site: string;
  group: string | null;
  an: 'CA+LA';
  kind: 'or';
  active: boolean;
  hours?: OperativityPlanningHours;
}

export interface OperativityPlanningBlock {
  id: string;
  roomIds: string[];
  type: string;
  from: string;
  to: string;
  part: 'am' | 'pm' | 'full';
  note: string;
}

export interface OperativityPlanningLink {
  src: 'blk' | 'req';
  id: string;
  from: string;
  s: string;
  s0?: string;
  od?: string;
  oi?: 0 | 1;
  ts?: number;
}

export interface OperativityPlanningData extends Record<string, unknown> {
  v: 2;
  specs: Array<{ id: string; name: string; c: string }>;
  rooms: OperativityPlanningRoom[];
  groups: Array<{ id: string; site: string; name: string }>;
  template: Record<string, unknown>;
  overrides: Record<string, unknown>;
  notes: Record<string, unknown>;
  requests: unknown[];
  blocks: OperativityPlanningBlock[];
  staff: { norm: Record<string, Record<string, number>>; cap: Record<string, Record<string, number>> };
  hours: OperativityPlanningHours;
  dayHours: Record<string, OperativityPlanningHours>;
  seasons: unknown[];
  flags: Record<string, boolean>;
  claims: unknown[];
  map: Record<string, unknown>;
  mapCfg: Record<string, number>;
  wait: Record<string, unknown>;
  quotas: Record<string, unknown>;
  links: Record<string, OperativityPlanningLink>;
  planSkip: Record<string, 1>;
  _medrox: {
    hospitalId: string;
    years: number[];
    closedDays: Record<string, true>;
    anesthesiaKnown: false;
    staffCapacityKnown: false;
  };
}

export interface OperativityPlanningSeed {
  data: OperativityPlanningData;
  sites: Array<{ id: string; name: string; sub: string }>;
  years: number[];
  warnings: string[];
}

const IDENTIFIER = /^[a-zA-Z0-9_-]{1,150}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS: Array<keyof WeeklySchedule> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_HOURS = { from: '07:00', split: '12:00', to: '15:30' };
const MAX_DRAFT_BYTES = 8_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validHours(value: unknown): value is OperativityPlanningHours {
  if (!isRecord(value)) return false;
  const minutes = (time: unknown) => typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : -1;
  const [from, split, to] = [minutes(value.from), minutes(value.split), minutes(value.to)];
  return from >= 0 && from < split && split < to;
}

function hoursFromDay(day: DayWorkingHours | undefined): OperativityPlanningHours | null {
  if (!day?.enabled) return null;
  if (![day.startHour, day.startMinute, day.endHour, day.endMinute].every(Number.isInteger)
    || day.startHour < 0 || day.startHour > 23 || day.endHour < 0 || day.endHour > 23
    || day.startMinute < 0 || day.startMinute > 59 || day.endMinute < 0 || day.endMinute > 59) return null;
  const from = day.startHour * 60 + day.startMinute, to = day.endHour * 60 + day.endMinute;
  if (to - from < 2) return null;
  const split = from < 720 && to > 720 ? 720 : Math.floor((from + to) / 2);
  const time = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return { from: time(from), split: time(split), to: time(to) };
}

/** Build a data-only planning snapshot. Clinical state, patients and named staff never cross into the planner. */
export function buildOperativityPlanningSeed(snapshot: OperativityPlanningSnapshot): OperativityPlanningSeed {
  if (!IDENTIFIER.test(snapshot.hospitalId)) throw new Error('Neplatné zdravotnické zařízení.');
  const year = snapshot.year ?? new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2020 || year > 2099) throw new Error('Neplatný plánovací rok.');
  const years = [year, year + 1], site = snapshot.hospitalId;
  const warnings = [
    'Typ anestezie a vybavení sálů nejsou propojené. Označení CA/LA v pracovním návrhu je pouze předpoklad.',
    'Personální normativy a kapacity nejsou propojené. Výchozí nuly znamenají nevyplněné údaje, nikoli skutečný počet pracovníků.',
    'Dopoledne a odpoledne se dělí ve 12:00; pokud pracovní doba poledne neobsahuje, používá návrh její střed. Přestávky nejsou v půldenním modelu odečteny.',
  ];
  const groups = new Map<string, { id: string; site: string; name: string }>();
  const rooms: OperativityPlanningRoom[] = [];
  const seenRooms = new Set<string>();
  for (const room of snapshot.rooms) {
    if (!IDENTIFIER.test(room.id) || seenRooms.has(room.id)) continue;
    seenRooms.add(room.id);
    const groupName = room.department?.trim();
    if (groupName && !groups.has(groupName)) groups.set(groupName, { id: `host-group-${groups.size + 1}`, site, name: groupName });
    rooms.push({ id: room.id, name: room.name, code: room.name, site, group: groupName ? groups.get(groupName)!.id : null, an: 'CA+LA', kind: 'or', active: true });
  }
  const seenSpecs = new Set<string>();
  const specs = snapshot.departments.filter(department => {
    if (!IDENTIFIER.test(department.id) || seenSpecs.has(department.id)) return false;
    seenSpecs.add(department.id); return true;
  }).map((department, index) => ({
    id: department.id, name: department.name,
    c: department.accent_color && /^#[0-9a-f]{6}$/i.test(department.accent_color) ? department.accent_color : roomSpecialtyColor(index),
  }));
  const data: OperativityPlanningData = {
    v: 2, specs, rooms, groups: [...groups.values()], template: {}, overrides: {}, notes: {}, requests: [], blocks: [],
    staff: { norm: { CA: { doc: 0, nurse: 0, scrub: 0 }, LA: { doc: 0, nurse: 0, scrub: 0 } }, cap: { [site]: { doc: 0, nurse: 0, scrub: 0, docH: 0, nurseH: 0, scrubH: 0 } } },
    hours: { ...DEFAULT_HOURS }, dayHours: {}, seasons: [], flags: { alt: true, claims: true, reqStatus: true, wait: true, cosgyn: true }, claims: [],
    map: {}, mapCfg: { speed: 0.8, walk: 1.3, wait: 45, floor: 5, handover: 120 }, wait: {}, quotas: {}, links: {}, planSkip: {},
    _medrox: { hospitalId: site, years, closedDays: {}, anesthesiaKnown: false, staffCapacityKnown: false },
  };
  let missingHours = 0;
  for (const hostRoom of snapshot.rooms) {
    if (!seenRooms.has(hostRoom.id)) continue;
    if (!hostRoom.weeklySchedule) { missingHours++; continue; }
    for (let date = new Date(Date.UTC(year, 0, 1)); date.getUTCFullYear() <= year + 1; date.setUTCDate(date.getUTCDate() + 1)) {
      const key = `${hostRoom.id}|${date.toISOString().slice(0, 10)}`;
      const hours = hoursFromDay(hostRoom.weeklySchedule[WEEKDAYS[date.getUTCDay()]]);
      if (hours) data.dayHours[key] = hours;
      else data._medrox.closedDays[key] = true;
    }
  }
  if (missingHours) warnings.push(`U ${missingHours} sálů není dostupná týdenní pracovní doba; návrh používá výchozí čas 07:00–15:30.`);

  const byDay = new Map<string, Map<RoomScheduleDayPart, OperativityPlanningAllocation>>();
  let skipped = 0;
  for (const allocation of snapshot.allocations) {
    if (!seenRooms.has(allocation.operating_room_id) || !validDate(allocation.allocation_date)
      || !years.includes(Number(allocation.allocation_date.slice(0, 4))) || !['AM', 'PM'].includes(allocation.day_part)
      || (allocation.allocation_kind && !['SPECIALTY', 'CLOSED', 'SERVICE'].includes(allocation.allocation_kind))
      || ((!allocation.allocation_kind || allocation.allocation_kind === 'SPECIALTY') && !seenSpecs.has(allocation.department_id ?? ''))) { skipped++; continue; }
    const key = `${allocation.operating_room_id}|${allocation.allocation_date}`;
    const halves = byDay.get(key) ?? new Map();
    const previous = halves.get(allocation.day_part);
    if (!previous || (allocation.updated_at ?? '') >= (previous.updated_at ?? '')) halves.set(allocation.day_part, allocation);
    byDay.set(key, halves);
  }
  for (const [key, halves] of byDay) {
    const [roomId, date] = key.split('|');
    const part = (allocation: OperativityPlanningAllocation | undefined) => allocation && (!allocation.allocation_kind || allocation.allocation_kind === 'SPECIALTY') ? { s: allocation.department_id, an: 'CA' } : null;
    const am = halves.get('AM'), pm = halves.get('PM');
    const a = part(am), b = part(pm);
    // Always explicit: absence of one half never expands an allocation to a full day.
    data.overrides[key] = a || b ? { split: true, a, b } : null;
    const restrictions = [am, pm].filter((item): item is OperativityPlanningAllocation => !!item && (item.allocation_kind === 'CLOSED' || item.allocation_kind === 'SERVICE'));
    if (restrictions.length === 2 && am?.allocation_kind === pm?.allocation_kind) restrictions.splice(1, 1);
    for (const restriction of restrictions) {
      data.blocks.push({
        id: `host-block-${data.blocks.length + 1}`, roomIds: [roomId], type: restriction.allocation_kind === 'SERVICE' ? 'Servis / údržba' : 'Útlum provozu',
        from: date, to: date, part: am?.allocation_kind === pm?.allocation_kind ? 'full' : restriction.day_part === 'AM' ? 'am' : 'pm',
        note: restriction.allocation_kind === 'SERVICE' ? 'Servis převzatý z uloženého rozpisu.' : 'Uzavření převzaté z uloženého rozpisu.',
      });
    }
  }
  if (skipped) warnings.push(`${skipped} přiřazení mimo načtené období nebo bez platného sálu/oboru nebylo do návrhu převzato.`);
  return { data, sites: [{ id: site, name: snapshot.hospitalName, sub: 'Operační sály' }], years, warnings };
}

/** Copy JSON without prototype keys, oversized payloads, executable values or clinical objects. */
function copyDraft(value: unknown): Record<string, unknown> | null {
  try {
    const json = JSON.stringify(value);
    if (!json || json.length > MAX_DRAFT_BYTES) return null;
    const forbidden = new Set(['__proto__', 'prototype', 'constructor', 'currentPatient', 'currentProcedure', 'statusHistory', 'completedOperations', 'noticeMessage', 'noticeSender', 'staffCredentials', 'access_token', 'refresh_token']);
    let count = 0;
    const copy = (item: unknown, depth: number): unknown => {
      if (depth > 18 || ++count > 500_000) throw new Error('Návrh je příliš velký.');
      if (item === null || typeof item === 'boolean' || typeof item === 'string') return item;
      if (typeof item === 'number') return Number.isFinite(item) ? item : null;
      if (Array.isArray(item)) return item.map(child => copy(child, depth + 1));
      if (isRecord(item)) return Object.fromEntries(Object.entries(item).filter(([key]) => !forbidden.has(key)).map(([key, child]) => [key, copy(child, depth + 1)]));
      return null;
    };
    const result = copy(JSON.parse(json), 0);
    return isRecord(result) ? result : null;
  } catch { return null; }
}

/** Local drafts retain planning edits, while master rooms, specialties and tenant identity stay authoritative. */
export function mergeOperativityPlanningDraft(seed: OperativityPlanningData, draft: unknown): OperativityPlanningData {
  const next = copyDraft(draft);
  const base = JSON.parse(JSON.stringify(seed)) as OperativityPlanningData;
  if (!next || next.v !== 2 || !isRecord(next._medrox) || next._medrox.hospitalId !== seed._medrox.hospitalId) return base;
  const rooms = new Set(seed.rooms.map(room => room.id)), specs = new Set(seed.specs.map(spec => spec.id));
  const keyAllowed = (key: string) => { const [roomId, date, extra] = key.split('|'); return !extra && rooms.has(roomId) && validDate(date) && seed._medrox.years.includes(Number(date.slice(0, 4))); };
  const filterSlot = (slot: unknown, depth = 0): unknown => {
    if (slot === null) return null;
    if (!isRecord(slot) || depth > 2) return null;
    if (slot.alt === true) return { alt: true, l: filterSlot(slot.l ?? null, depth + 1), s: filterSlot(slot.s ?? null, depth + 1) };
    const half = (value: unknown) => isRecord(value) && typeof value.s === 'string' && specs.has(value.s) && ['CA', 'LA'].includes(String(value.an)) ? { s: value.s, an: value.an } : null;
    return { split: slot.split === true, a: half(slot.a), ...(slot.split === true ? { b: half(slot.b) } : {}) };
  };
  const template = (value: unknown) => Object.fromEntries(Object.entries(isRecord(value) ? value : {}).filter(([id]) => rooms.has(id)).map(([id, days]) => [id, Object.fromEntries(Object.entries(isRecord(days) ? days : {}).filter(([day]) => /^[1-7]$/.test(day)).map(([day, slot]) => [day, filterSlot(slot)]))]));
  if (isRecord(next.template)) base.template = template(next.template);
  if (isRecord(next.overrides)) base.overrides = Object.fromEntries(Object.entries(next.overrides).filter(([key]) => keyAllowed(key)).map(([key, slot]) => [key, filterSlot(slot)]));
  if (isRecord(next.notes)) base.notes = Object.fromEntries(Object.entries(next.notes).filter(([key, value]) => keyAllowed(key) && typeof value === 'string'));
  if (validHours(next.hours)) base.hours = { from: next.hours.from, split: next.hours.split, to: next.hours.to };
  if (isRecord(next.dayHours)) base.dayHours = { ...base.dayHours, ...Object.fromEntries(Object.entries(next.dayHours).filter(([key, value]) => keyAllowed(key) && validHours(value))) } as typeof base.dayHours;
  if (Array.isArray(next.groups)) {
    const groups = new Map(base.groups.map(group => [group.id, group]));
    for (const group of next.groups) if (isRecord(group) && typeof group.id === 'string' && IDENTIFIER.test(group.id) && typeof group.name === 'string' && !groups.has(group.id)) groups.set(group.id, { id: group.id, site: seed._medrox.hospitalId, name: group.name.slice(0, 200) });
    base.groups = [...groups.values()];
  }
  const draftRooms = new Map((Array.isArray(next.rooms) ? next.rooms : []).filter(isRecord).map(room => [room.id, room]));
  base.rooms = base.rooms.map(room => {
    const planned = draftRooms.get(room.id), group = planned?.group;
    return { ...room, ...(typeof group === 'string' && base.groups.some(item => item.id === group) ? { group } : {}), ...(validHours(planned?.hours) ? { hours: { from: planned.hours.from, split: planned.hours.split, to: planned.hours.to } } : {}) };
  });
  if (Array.isArray(next.blocks)) base.blocks = next.blocks.filter(isRecord).filter(block => validDate(block.from) && validDate(block.to) && block.from <= block.to && typeof block.id === 'string' && IDENTIFIER.test(block.id) && typeof block.type === 'string' && Array.isArray(block.roomIds)).map<OperativityPlanningBlock>(block => ({
    id: String(block.id), roomIds: (block.roomIds as unknown[]).filter((id): id is string => typeof id === 'string' && rooms.has(id)), type: String(block.type), from: String(block.from), to: String(block.to), part: block.part === 'am' || block.part === 'pm' ? block.part : 'full', note: typeof block.note === 'string' ? block.note : '',
  })).filter(block => block.roomIds.length > 0);
  if (Array.isArray(next.requests)) base.requests = next.requests.filter(isRecord).filter(request => typeof request.specId === 'string' && specs.has(request.specId) && validDate(request.from) && validDate(request.to) && request.from <= request.to).map(request => ({
    ...request, site: seed._medrox.hospitalId,
    ...(request.scope !== undefined ? { scope: ['all', 'cnt', 'rooms'].includes(String(request.scope)) ? request.scope : 'all' } : {}),
    ...(request.rooms !== undefined ? { rooms: Array.isArray(request.rooms) ? [...new Set(request.rooms.filter((id): id is string => typeof id === 'string' && rooms.has(id)))] : [] } : {}),
    ...(request.cnt !== undefined ? { cnt: typeof request.cnt === 'number' && Number.isFinite(request.cnt) ? Math.max(1, Math.min(rooms.size || 1, Math.floor(request.cnt))) : 1 } : {}),
  }));
  if (Array.isArray(next.claims)) base.claims = next.claims.filter(isRecord).filter(claim => typeof claim.roomId === 'string' && rooms.has(claim.roomId) && typeof claim.specId === 'string' && specs.has(claim.specId) && validDate(claim.d));
  if (Array.isArray(next.seasons)) base.seasons = next.seasons.filter(isRecord).filter(season => typeof season.id === 'string' && IDENTIFIER.test(season.id) && typeof season.name === 'string' && /^\d{2}-\d{2}$/.test(String(season.from)) && /^\d{2}-\d{2}$/.test(String(season.to))).map(season => ({ ...season, template: template(season.template) }));
  const halfKeyAllowed = (key: string) => {
    const [roomId, date, half, extra] = key.split('|');
    return extra === undefined && (half === '0' || half === '1') && keyAllowed(`${roomId}|${date}`);
  };
  if (isRecord(next.links)) base.links = Object.fromEntries(Object.entries(next.links).flatMap(([key, link]) => {
    if (!halfKeyAllowed(key) || !isRecord(link) || !['blk', 'req'].includes(String(link.src))
      || typeof link.id !== 'string' || !IDENTIFIER.test(link.id) || typeof link.from !== 'string' || !rooms.has(link.from)
      || typeof link.s !== 'string' || !specs.has(link.s)) return [];
    const clean: OperativityPlanningLink = { src: link.src as 'blk' | 'req', id: link.id, from: link.from, s: link.s };
    if (typeof link.s0 === 'string' && specs.has(link.s0)) clean.s0 = link.s0;
    if (validDate(link.od) && seed._medrox.years.includes(Number(link.od.slice(0, 4)))) clean.od = link.od;
    if (link.oi === 0 || link.oi === 1) clean.oi = link.oi;
    if (typeof link.ts === 'number' && Number.isFinite(link.ts) && link.ts >= 0) clean.ts = link.ts;
    return [[key, clean]];
  }));
  if (isRecord(next.planSkip)) base.planSkip = Object.fromEntries(Object.entries(next.planSkip).filter(([key, value]) => {
    const [kind, ...halfKey] = key.split('|');
    return (kind === 'b' || kind === 'r') && halfKeyAllowed(halfKey.join('|')) && value === 1;
  })) as Record<string, 1>;
  // These are local model inputs, never counts inferred from clinical staff assignments.
  if (isRecord(next.staff) && isRecord(next.staff.norm) && isRecord(next.staff.cap)) {
    const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10_000 ? value : 0;
    for (const type of ['CA', 'LA']) {
      const norm = next.staff.norm[type];
      if (isRecord(norm)) for (const role of ['doc', 'nurse', 'scrub']) base.staff.norm[type][role] = count(norm[role]);
    }
    const capacity = next.staff.cap[seed._medrox.hospitalId];
    if (isRecord(capacity)) for (const role of ['doc', 'nurse', 'scrub', 'docH', 'nurseH', 'scrubH']) base.staff.cap[seed._medrox.hospitalId][role] = count(capacity[role]);
  }
  for (const key of ['map', 'mapCfg', 'wait', 'quotas', 'region', 'pub']) if (isRecord(next[key])) base[key] = next[key];
  // Migration flags must remain set so the original standalone app cannot inject its example data.
  base.flags = { ...base.flags, alt: true, claims: true, reqStatus: true, wait: true, cosgyn: true };
  return base;
}
