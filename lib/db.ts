import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';
import { OperatingRoom, RoomStatus, WeeklySchedule, SkillLevel } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';

type JsonObject = Record<string, unknown>;
type RoomStatusHistoryEntry = NonNullable<OperatingRoom['statusHistory']>[number];

const ROOM_WRITE_ATTEMPTS = 3;
const ROOM_WRITE_RETRY_DELAYS_MS = [450, 1_250] as const;
const roomWriteQueues = new Map<string, Promise<boolean>>();

const wait = (durationMs: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, durationMs);
});

function createEventId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function requestHospitalAccessRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('hospitalAccessRefreshRequested'));
}

function reportOperatingRoomWriteFailure(
  roomId: string,
  hospitalId: string,
  columns: string[],
) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('operatingRoomWriteFailed', {
    detail: { roomId, hospitalId, columns },
  }));
}

// Type for database row
export interface DBOperatingRoom {
  id: string;
  hospital_id: string;
  state_revision?: number;
  name: string;
  department: string;
  status: string;
  queue_count: number;
  operations_24h: number;
  is_septic: boolean;
  is_emergency: boolean;
  is_locked: boolean;
  is_enhanced_hygiene: boolean;
  enhanced_hygiene_at: string | null;
  is_paused: boolean;
  paused_at: string | null;
  patient_called_at: string | null;
  patient_arrived_at: string | null;
  phase_started_at: string | null;
  operation_started_at: string | null;
  status_history: RoomStatusHistoryEntry[] | null;
  completed_operations: CompletedOperation[] | string | null;
  current_step_index: number;
  estimated_end_time: string | null;
  aro_overtime_since?: string | null;
  doctor_id: string | null;
  nurse_id: string | null;
  anesthesiologist_id: string | null;
  current_patient_id: string | null;
  current_procedure_id: string | null;
  weekly_schedule: WeeklySchedule | null;
  sort_order: number | null;
  hourly_operating_cost: number | string | null;
  notice_message: string | null;
  notice_at: string | null;
  notice_sender: string | null;
}

// Aktivní zařízení nastavuje HospitalContext. Všechny dotazy na sály pak mají
// stejný tenant filtr i při přímém použití Supabase klienta.
let activeHospitalId: string | null = null;
export function setDatabaseHospitalId(id: string | null) {
  activeHospitalId = id;
}
export function getDatabaseHospitalId(): string {
  return activeHospitalId || 'default';
}

interface DBStaff {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  skill_level?: string;
  availability?: number;
  is_external?: boolean;
  is_recommended?: boolean;
  sick_leave_days?: number;
  vacation_days?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface DBPatient {
  id: string;
  name: string;
  age: number;
  blood_type: string | null;
}

interface DBProcedure {
  id: string;
  name: string;
  start_time: string;
  estimated_duration: number;
  progress: number;
}

function parseCompletedOperations(
  completedOperations: DBOperatingRoom['completed_operations'] | undefined
): CompletedOperation[] {
  if (Array.isArray(completedOperations)) {
    return completedOperations;
  }
  if (typeof completedOperations === 'string') {
    try {
      const parsed: unknown = JSON.parse(completedOperations);
      return Array.isArray(parsed) ? parsed as CompletedOperation[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Transform DB row to app type
function transformRoom(
  row: DBOperatingRoom,
  staffMap: Map<string, DBStaff>,
  patientMap: Map<string, DBPatient>,
  procedureMap: Map<string, DBProcedure>
): OperatingRoom {
  const doctor = row.doctor_id ? staffMap.get(row.doctor_id) : null;
  const nurse = row.nurse_id ? staffMap.get(row.nurse_id) : null;
  const anesthesiologist = row.anesthesiologist_id ? staffMap.get(row.anesthesiologist_id) : null;
  const patient = row.current_patient_id ? patientMap.get(row.current_patient_id) : null;
  const procedure = row.current_procedure_id ? procedureMap.get(row.current_procedure_id) : null;

  // Parse completed_operations - Supabase returns JSONB arrays as-is, older
  // payloads can still arrive as serialized JSON.
  const completedOps = parseCompletedOperations(row.completed_operations);

  return {
    id: row.id,
    stateRevision: typeof row.state_revision === 'number' ? row.state_revision : undefined,
    name: row.name,
    department: row.department,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : undefined,
    status: (row.status as RoomStatus) || RoomStatus.FREE,
    queueCount: row.queue_count,
    operations24h: row.operations_24h,
    isSeptic: row.is_septic,
    isEmergency: row.is_emergency,
    isEnhancedHygiene: row.is_enhanced_hygiene,
    enhancedHygieneAt: row.enhanced_hygiene_at,
    isPaused: row.is_paused,
    pausedAt: row.paused_at,
    patientCalledAt: row.patient_called_at,
    patientArrivedAt: row.patient_arrived_at,
    phaseStartedAt: row.phase_started_at,
    operationStartedAt: row.operation_started_at,
    statusHistory: row.status_history || [],
    completedOperations: completedOps,
    isLocked: row.is_locked,
    currentStepIndex: row.current_step_index,
    noticeMessage: row.notice_message ?? null,
    noticeAt: row.notice_at ?? null,
    noticeSender: row.notice_sender ?? null,
    estimatedEndTime: row.estimated_end_time || undefined,
    aroOvertimeSince: row.aro_overtime_since ?? null,
    weeklySchedule: row.weekly_schedule as WeeklySchedule | undefined,
    // Finance — hodinová sazba provozu (CZK/h). NULL = nenastaveno.
    hourlyOperatingCost: row.hourly_operating_cost === null || row.hourly_operating_cost === undefined
      ? null
      : Number(row.hourly_operating_cost),
    staff: {
      doctor: { 
        id: doctor?.id,
        name: doctor?.name || null, 
        role: 'DOCTOR',
        skill_level: doctor?.skill_level as SkillLevel | undefined,
        availability: doctor?.availability,
        is_external: doctor?.is_external,
        is_recommended: doctor?.is_recommended,
        is_active: doctor?.is_active,
        sick_leave_days: doctor?.sick_leave_days,
        vacation_days: doctor?.vacation_days,
        notes: doctor?.notes,
      },
      nurse: { 
        id: nurse?.id,
        name: nurse?.name || null, 
        role: 'NURSE',
        skill_level: nurse?.skill_level as SkillLevel | undefined,
        availability: nurse?.availability,
        is_external: nurse?.is_external,
        is_recommended: nurse?.is_recommended,
        is_active: nurse?.is_active,
        sick_leave_days: nurse?.sick_leave_days,
        vacation_days: nurse?.vacation_days,
        notes: nurse?.notes,
      },
      anesthesiologist: anesthesiologist 
        ? { 
            id: anesthesiologist.id, 
            name: anesthesiologist.name, 
            role: 'ANESTHESIOLOGIST',
            skill_level: anesthesiologist.skill_level as SkillLevel | undefined,
            availability: anesthesiologist.availability,
            is_external: anesthesiologist.is_external,
            is_recommended: anesthesiologist.is_recommended,
            is_active: anesthesiologist.is_active,
            sick_leave_days: anesthesiologist.sick_leave_days,
            vacation_days: anesthesiologist.vacation_days,
            notes: anesthesiologist.notes,
          }
        : undefined,
    },
    currentPatient: patient ? {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      bloodType: patient.blood_type || undefined,
    } : undefined,
    currentProcedure: procedure ? {
      name: procedure.name,
      startTime: procedure.start_time,
      estimatedDuration: procedure.estimated_duration,
      progress: procedure.progress,
    } : undefined,
  };
}

// Fetch all operating rooms with related data
export async function fetchOperatingRooms(
  hospitalId: string = getDatabaseHospitalId(),
  databaseClient: SupabaseClient | null = supabase,
): Promise<OperatingRoom[] | null> {
  if (!databaseClient) {
    return null;
  }

  try {
    // Fetch rooms and staff data in parallel
    // Explicitly select columns including completed_operations JSONB
    const [roomsRes, staffRes] = await Promise.all([
      databaseClient
        .from('operating_rooms')
        .select('*, completed_operations')
        .eq('hospital_id', hospitalId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
      databaseClient.from('staff').select('*').eq('hospital_id', hospitalId),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (!roomsRes.data || roomsRes.data.length === 0) return null;

    // Create staff lookup map
    const staffMap = new Map<string, DBStaff>();
    (staffRes.data || []).forEach((s: DBStaff) => staffMap.set(s.id, s));

    // Empty maps for removed tables
    const patientMap = new Map<string, DBPatient>();
    const procedureMap = new Map<string, DBProcedure>();
    
    // Transform rows
    const transformed = roomsRes.data.map((row: DBOperatingRoom) => 
      transformRoom(row, staffMap, patientMap, procedureMap)
    );
    
    return transformed;
  } catch (error) {
    console.error('[DB] Failed to fetch operating rooms:', error);
    return null;
  }
}

// „Light" varianta — vynechá těžký JSONB sloupec status_history (historie pro
// časovou osu) pro RYCHLÉ první vykreslení dashboardu; ta se doplní následným
// fetchOperatingRooms(). Transform ho při chybějící hodnotě bezpečně doplní
// prázdným polem.
//
// completed_operations se naopak načítá VŽDY, i když je to JSONB. Dashboard
// z něj počítá číslo cyklů uprostřed karty — bez něj se po startu zobrazovaly
// samé nuly, dokud uživatel neotevřel detail sálu. Navíc by se prázdné pole
// mohlo při dokončení výkonu zapsat zpět do DB a přepsat archiv.
const LIGHT_ROOM_COLUMNS = [
  'id', 'state_revision', 'name', 'department', 'status', 'queue_count', 'operations_24h',
  'completed_operations',
  'is_septic', 'is_emergency', 'is_locked', 'is_enhanced_hygiene', 'enhanced_hygiene_at',
  'is_paused', 'paused_at', 'patient_called_at', 'patient_arrived_at',
  'phase_started_at', 'operation_started_at', 'current_step_index', 'estimated_end_time',
  'aro_overtime_since',
  'doctor_id', 'nurse_id', 'anesthesiologist_id', 'current_patient_id', 'current_procedure_id',
  'weekly_schedule', 'sort_order', 'hourly_operating_cost',
  'notice_message', 'notice_at', 'notice_sender',
].join(', ');

export async function fetchOperatingRoomsLight(hospitalId: string = getDatabaseHospitalId()): Promise<OperatingRoom[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const [roomsRes, staffRes] = await Promise.all([
      supabase
        .from('operating_rooms')
        .select(LIGHT_ROOM_COLUMNS)
        .eq('hospital_id', hospitalId)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true }),
      supabase
        .from('staff')
        .select('id, name, role, skill_level, availability, is_external, is_recommended, is_active, sick_leave_days, vacation_days, notes')
        .eq('hospital_id', hospitalId),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (!roomsRes.data || roomsRes.data.length === 0) return null;

    const staffMap = new Map<string, DBStaff>();
    (staffRes.data || []).forEach((s: DBStaff) => staffMap.set(s.id, s));
    const patientMap = new Map<string, DBPatient>();
    const procedureMap = new Map<string, DBProcedure>();

    return (roomsRes.data as unknown as DBOperatingRoom[]).map((row) =>
      transformRoom(row, staffMap, patientMap, procedureMap)
    );
  } catch (error) {
    // Při chybě (např. přejmenovaný sloupec) → null; volající použije plný fetch.
    console.warn('[DB] Light fetch selhal, použiju plný fetch:', error);
    return null;
  }
}

// Načte jediný sál včetně jeho těžších historických dat. Používá se pro detail
// sálu a Realtime INSERT / změnu obsazení, aby změna jednoho sálu nikdy
// nespouštěla opakovaný dotaz na celé zařízení.
export async function fetchOperatingRoomById(
  roomId: string,
  hospitalId: string = getDatabaseHospitalId(),
): Promise<OperatingRoom | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const roomRes = await supabase
      .from('operating_rooms')
      .select('*, completed_operations')
      .eq('hospital_id', hospitalId)
      .eq('id', roomId)
      .maybeSingle();

    if (roomRes.error) throw roomRes.error;
    if (!roomRes.data) return null;

    const row = roomRes.data as DBOperatingRoom;
    const staffIds = [row.doctor_id, row.nurse_id, row.anesthesiologist_id]
      .filter((id): id is string => Boolean(id));
    const staffMap = new Map<string, DBStaff>();

    if (staffIds.length > 0) {
      const staffRes = await supabase
        .from('staff')
        .select('*')
        .eq('hospital_id', hospitalId)
        .in('id', staffIds);
      if (staffRes.error) throw staffRes.error;
      (staffRes.data || []).forEach((staff: DBStaff) => staffMap.set(staff.id, staff));
    }

    return transformRoom(
      row,
      staffMap,
      new Map<string, DBPatient>(),
      new Map<string, DBProcedure>(),
    );
  } catch (error) {
    console.error(`[DB] Failed to fetch operating room ${roomId}:`, error);
    return null;
  }
}

// Update operating room
type OperatingRoomUpdate = Partial<{
  name: string;
  department: string;
  status: string;
  is_emergency: boolean;
  is_enhanced_hygiene: boolean;
  enhanced_hygiene_at: string | null;
  is_paused: boolean;
  paused_at: string | null;
  is_locked: boolean;
  patient_called_at: string | null;
  patient_arrived_at: string | null;
  phase_started_at: string | null;
  operation_started_at: string | null;
  current_step_index: number;
  estimated_end_time: string | null;
  weekly_schedule: WeeklySchedule;
  doctor_id: string | null;
  nurse_id: string | null;
  anesthesiologist_id: string | null;
  status_history: RoomStatusHistoryEntry[] | null;
  completed_operations: CompletedOperation[] | null;
  hourly_operating_cost: number | null;
  notice_message: string | null;
  notice_at: string | null;
  notice_sender: string | null;
}>;

async function performOperatingRoomUpdate(
  id: string, 
  updates: OperatingRoomUpdate,
  hospitalId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    reportOperatingRoomWriteFailure(id, hospitalId, Object.keys(updates));
    return false;
  }

  let effectiveUpdates: Record<string, unknown> = { ...(updates as Record<string, unknown>) };
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= ROOM_WRITE_ATTEMPTS; attempt += 1) {
    try {
      const { data, error } = await supabase
        .from('operating_rooms')
        .update(effectiveUpdates)
        .eq('id', id)
        .eq('hospital_id', hospitalId)
        .select('id')
        .maybeSingle();

      if (!error && data?.id === id) return true;

      lastError = error ?? new Error('Databáze nepotvrdila změnu operačního sálu.');

      // Chybějící volitelný sloupec (kód 42703, např. paused_at / enhanced_hygiene_at,
      // dokud nebyla spuštěna migrace) → odeber tyto sloupce a zkus to znovu,
      // aby základní změna (např. is_paused, is_enhanced_hygiene) prošla.
      if (error?.code === '42703') {
        const OPTIONAL_COLUMNS = ['paused_at', 'enhanced_hygiene_at', 'notice_message', 'notice_at', 'notice_sender'];
        const stripped = { ...effectiveUpdates };
        let removed = false;
        for (const col of OPTIONAL_COLUMNS) {
          if (col in stripped) { delete stripped[col]; removed = true; }
        }
        if (removed && Object.keys(stripped).length > 0) {
          effectiveUpdates = stripped;
          logger.warn('[DB] Volitelný sloupec chybí; opakuji zápis bez něj.');
          continue;
        }
      }

      if (attempt === 1) requestHospitalAccessRefresh();
    } catch (error) {
      lastError = error;
      if (attempt === 1) requestHospitalAccessRefresh();
    }

    if (attempt < ROOM_WRITE_ATTEMPTS) {
      await wait(ROOM_WRITE_RETRY_DELAYS_MS[attempt - 1] ?? 1_250);
    }
  }

  const error = lastError as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  logger.error('[DB] Zápis operačního sálu nebyl potvrzen ani po opakování:', {
    roomId: id,
    hospitalId,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
    columns: Object.keys(updates),
  });
  reportOperatingRoomWriteFailure(id, hospitalId, Object.keys(updates));
  return false;
}

/**
 * Zápisy stejného sálu jsou serializované. Rychlé po sobě jdoucí akce se tak
 * nemohou v síti předběhnout a přepsat novější stav starším požadavkem.
 */
export function updateOperatingRoom(
  id: string,
  updates: OperatingRoomUpdate,
): Promise<boolean> {
  const hospitalId = getDatabaseHospitalId();
  const queueKey = `${hospitalId}:${id}`;
  const previous = roomWriteQueues.get(queueKey) ?? Promise.resolve(true);
  const next = previous
    .catch(() => false)
    .then(() => performOperatingRoomUpdate(id, updates, hospitalId));

  roomWriteQueues.set(queueKey, next);
  void next.finally(() => {
    if (roomWriteQueues.get(queueKey) === next) roomWriteQueues.delete(queueKey);
  });
  return next;
}

/**
 * Zapíše okamžik, kdy sál vstoupil do přesahu pracovní doby.
 *
 * Pořadové číslo u ikony ARO se řídí tímhle časem, proto musí být uložený
 * v databázi — jen tak zůstane stejný po obnovení stránky i na jiném zařízení.
 *
 * Zápis je podmíněný (`is('aro_overtime_since', null)`), takže i když přesah
 * zaznamená několik zařízení současně, uloží se jen ten první a pořadí se
 * nepřepíše. Vrací `true`, když se hodnota skutečně zapsala.
 */
export async function markRoomAroOvertimeStart(roomId: string, since: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('operating_rooms')
      .update({ aro_overtime_since: since, updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .eq('hospital_id', getDatabaseHospitalId())
      .is('aro_overtime_since', null);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[DB] Zápis začátku přesahu ARO selhal:', error);
    return false;
  }
}

/** Zruší příznak přesahu, jakmile sál z přesahu vystoupí. */
export async function clearRoomAroOvertimeStart(roomId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('operating_rooms')
      .update({ aro_overtime_since: null, updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .eq('hospital_id', getDatabaseHospitalId())
      .not('aro_overtime_since', 'is', null);
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn('[DB] Vymazání příznaku přesahu ARO selhalo:', error);
    return false;
  }
}

/**
 * Aktualizuje hodinovou sazbu provozu sálu (CZK/h).
 * `null` = sazba nenastavena (FinanceTab pak sál vyloučí z výpočtů).
 */
export async function updateRoomHourlyOperatingCost(
  roomId: string,
  hourlyCost: number | null,
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase
      .from('operating_rooms')
      .update({ hourly_operating_cost: hourlyCost })
      .eq('id', roomId)
      .eq('hospital_id', activeHospitalId || 'default');
    if (error) {
      console.error('[DB] Failed to update hourly_operating_cost:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[DB] Exception updating hourly_operating_cost:', err);
    return false;
  }
}

// Create a new operating room
export async function createOperatingRoom(
  roomData: {
    id: string;
    name: string;
    department: string;
    status?: string;
    queue_count?: number;
    operations_24h?: number;
    current_step_index?: number;
    is_emergency?: boolean;
    is_locked?: boolean;
    is_paused?: boolean;
    is_septic?: boolean;
    sort_order?: number;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    console.error('[DB] Supabase not configured - URL or key missing');
    return false;
  }
  
  try {
    const insertData = {
      id: roomData.id,
      name: roomData.name,
      department: roomData.department || '',
      status: roomData.status || 'FREE',
      queue_count: roomData.queue_count || 0,
      operations_24h: roomData.operations_24h || 0,
      current_step_index: roomData.current_step_index ?? 6,
      is_emergency: roomData.is_emergency ?? false,
      is_locked: roomData.is_locked ?? false,
      is_paused: roomData.is_paused ?? false,
      is_septic: roomData.is_septic ?? false,
      sort_order: roomData.sort_order ?? 0,
      hospital_id: activeHospitalId || 'default',
    };
    
    logger.debug('[DB] Attempting to create room:', {
      id: insertData.id,
      name: insertData.name,
      department: insertData.department,
      status: insertData.status
    });
    
    const { data, error } = await supabase
      .from('operating_rooms')
      .insert([insertData])
      .select();
    
    if (error) {
      console.error('[DB] Error creating operating room:');
      console.error('  Message:', error.message);
      console.error('  Code:', error.code);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);
      return false;
    }
    
    logger.info('[DB] Successfully created operating room:', roomData.id);
    return true;
  } catch (err) {
    console.error('[DB] Exception creating operating room:', err instanceof Error ? err.message : err);
    return false;
  }
}

// Delete an operating room
export async function deleteOperatingRoom(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('operating_rooms')
      .delete()
      .eq('id', id)
      .eq('hospital_id', activeHospitalId || 'default');
    
    if (error) {
      console.error('[DB] Error deleting operating room:', error);
      return false;
    }
    logger.info('[DB] Successfully deleted operating room:', id);
    return true;
  } catch (err) {
    console.error('[DB] Error deleting operating room:', err);
    return false;
  }
}

// Fetch completed operations for a specific room on a given day
export interface CompletedOperation {
  startedAt: string;
  endedAt: string;
  statusHistory: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }>;
}

// Fetch ALL completed operations for ALL rooms in a single query (fast)
export async function fetchAllCompletedOperationsForDay(
  date: Date
): Promise<Map<string, CompletedOperation[]> | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    // Use 7:00 AM window like timeline (7:00 today to 6:59 tomorrow)
    const startOfWindow = new Date(date);
    startOfWindow.setHours(7, 0, 0, 0);
    const endOfWindow = new Date(date);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(6, 59, 59, 999);
    const matchingStart = new Date(startOfWindow.getTime() - 24 * 60 * 60 * 1_000);

    const { data, error } = await supabase
      .from('room_status_history')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .gte('timestamp', matchingStart.toISOString())
      .lte('timestamp', endOfWindow.toISOString())
      .order('operating_room_id')
      .order('timestamp', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return new Map();

    // Group by room
    const byRoom = new Map<string, StatusHistoryRow[]>();
    for (const row of data) {
      const roomId = row.operating_room_id;
      if (!byRoom.has(roomId)) {
        byRoom.set(roomId, []);
      }
      byRoom.get(roomId)!.push(row);
    }

    // Build operations for each room
    const result = new Map<string, CompletedOperation[]>();
    for (const [roomId, events] of byRoom) {
      const ops = buildCompletedOperationsFromEvents(events).filter((operation) => (
        new Date(operation.startedAt).getTime() <= endOfWindow.getTime()
        && new Date(operation.endedAt).getTime() >= startOfWindow.getTime()
      ));
      if (ops.length > 0) {
        result.set(roomId, ops);
      }
    }

    return result;
  } catch (error) {
    console.error('[DB] Failed to fetch completed operations:', error);
    return null;
  }
}

// Sestaví dokončené cykly z append-only logu. Hranice cyklu jsou výhradně
// explicitní operation_start / operation_end; názvy fází se mohou v nastavení
// nemocnice měnit a nesmí proto rozhodovat o tom, zda výkon z časové osy zmizí.
export function buildCompletedOperationsFromEvents(
  events: StatusHistoryRow[],
): CompletedOperation[] {
  const operations: CompletedOperation[] = [];
  let current: CompletedOperation | null = null;
  const ordered = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (const event of ordered) {
    if (event.event_type === 'operation_start') {
      if (
        current
        && Math.abs(
          new Date(event.timestamp).getTime() - new Date(current.startedAt).getTime(),
        ) <= 120_000
      ) {
        // Stejný přechod mohl při souběhu více stanic dorazit vícekrát.
        continue;
      }
      const stepIndex = event.step_index ?? 1;
      current = {
        startedAt: event.timestamp,
        endedAt: '',
        statusHistory: [{
          stepIndex,
          startedAt: event.timestamp,
          color: getStepColor(stepIndex),
          stepName: event.step_name || undefined,
        }],
      };
      continue;
    }

    if (!current) continue;

    if (event.event_type === 'step_change' && event.step_index !== null) {
      // step_name u této události popisuje právě ukončenou (předchozí) fázi.
      // Doplníme jej k poslednímu záznamu a pro index 0 už novou fázi
      // nevytváříme — ten pouze signalizuje návrat do připraveného stavu.
      const lastPhase = current.statusHistory[current.statusHistory.length - 1];
      const isActualTransition = lastPhase?.stepIndex !== event.step_index;
      if (isActualTransition && lastPhase && event.step_name) {
        lastPhase.stepName = event.step_name;
      }

      if (isActualTransition && event.step_index !== 0) {
        current.statusHistory.push({
          stepIndex: event.step_index,
          startedAt: event.timestamp,
          color: getStepColor(event.step_index),
        });
      }
      continue;
    }

    if (event.event_type === 'operation_end' || event.event_type === 'operation_completed') {
      if (new Date(event.timestamp).getTime() > new Date(current.startedAt).getTime()) {
        operations.push({
          ...current,
          endedAt: event.timestamp,
        });
      }
      current = null;
    }
  }

  return operations.sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
}

// Keep old function for compatibility but make it use new logic
export async function fetchCompletedOperationsForDay(
  roomId: string,
  date: Date
): Promise<CompletedOperation[] | null> {
  const allOps = await fetchAllCompletedOperationsForDay(date);
  if (!allOps) return null;
  return allOps.get(roomId) || [];
}

// Get color for a step index - synchronized with STEP_COLORS in constants.ts
function getStepColor(stepIndex: number): string {
  const colors: Record<number, string> = {
    0: '#6B7280', // Sál připraven - gray
    1: '#8B5CF6', // Příjezd na sál - purple
    2: '#EC4899', // Začátek anestezie - pink
    3: '#EF4444', // Chirurgický výkon - red
    4: '#F59E0B', // Ukončení výkonu - amber
    5: '#A855F7', // Ukončení anestezie - purple
    6: '#10B981', // Odjezd ze sálu - green
    7: '#F97316', // Úklid sálu - orange
  };
  return colors[stepIndex] || '#6B7280';
}

// Subscribe to real-time changes with granular updates
export function subscribeToOperatingRooms(
  onFullRefresh: () => void,
  onRoomUpdate?: (roomId: string, changes: Partial<DBOperatingRoom>) => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const hospitalId = activeHospitalId || 'default';
  const channel = supabase
    .channel(`operating_rooms_realtime:${hospitalId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operating_rooms', filter: `hospital_id=eq.${hospitalId}` },
      (payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
        if (payload.eventType === 'UPDATE' && payload.new && onRoomUpdate) {
          const newRecord = payload.new as unknown as DBOperatingRoom;
          const oldRecord = payload.old as unknown as DBOperatingRoom | null;
          
          // Check if staff changed - if so, do full refresh to get staff names
          // If we don't have old record (REPLICA IDENTITY not FULL), check if staff IDs exist
          let staffChanged = false;
          
          if (oldRecord) {
            // Compare old and new staff IDs
            staffChanged = (
              newRecord.doctor_id !== oldRecord.doctor_id ||
              newRecord.nurse_id !== oldRecord.nurse_id ||
              newRecord.anesthesiologist_id !== oldRecord.anesthesiologist_id
            );
          } else {
            // No old record available - check if any staff field is in the payload
            // This happens when REPLICA IDENTITY is not FULL
            const changedKeys = Object.keys(payload.new);
            staffChanged = changedKeys.includes('doctor_id') || 
                          changedKeys.includes('nurse_id') || 
                          changedKeys.includes('anesthesiologist_id');
          }
          
          if (staffChanged) {
            // Staff changed - need full refresh to get updated staff names
            onFullRefresh();
          } else {
            // Granular update - only update the changed room
            onRoomUpdate(newRecord.id, newRecord);
          }
        } else {
          // Full refresh for INSERT/DELETE or if no granular handler
          onFullRefresh();
        }
      }
    )
    .subscribe((status) => {
      logger.debug('[DB] Realtime subscription status:', status);
    });

  return () => {
    logger.debug('[DB] Unsubscribing from realtime');
    channel.unsubscribe();
  };
}

// Transform a single DB row to app type (for real-time updates)
export function transformSingleRoom(row: Partial<DBOperatingRoom>): Partial<OperatingRoom> {
  const result: Partial<OperatingRoom> = {};
  
  if (row.id !== undefined) result.id = row.id;
  if (row.state_revision !== undefined) result.stateRevision = row.state_revision;
  if (row.name !== undefined) result.name = row.name;
  if (row.department !== undefined) result.department = row.department;
  if (row.sort_order !== undefined) result.sort_order = row.sort_order ?? undefined;
  if (row.status !== undefined) result.status = row.status as RoomStatus;
  if (row.queue_count !== undefined) result.queueCount = row.queue_count;
  if (row.operations_24h !== undefined) result.operations24h = row.operations_24h;
  if (row.is_septic !== undefined) result.isSeptic = row.is_septic;
  if (row.is_emergency !== undefined) result.isEmergency = row.is_emergency;
  if (row.is_enhanced_hygiene !== undefined) result.isEnhancedHygiene = row.is_enhanced_hygiene;
  if (row.enhanced_hygiene_at !== undefined) result.enhancedHygieneAt = row.enhanced_hygiene_at;
  if (row.is_paused !== undefined) result.isPaused = row.is_paused;
  if (row.paused_at !== undefined) result.pausedAt = row.paused_at;
  if (row.patient_called_at !== undefined) result.patientCalledAt = row.patient_called_at;
  if (row.patient_arrived_at !== undefined) result.patientArrivedAt = row.patient_arrived_at;
  if (row.phase_started_at !== undefined) result.phaseStartedAt = row.phase_started_at;
  if (row.operation_started_at !== undefined) result.operationStartedAt = row.operation_started_at;
  if (row.status_history !== undefined) result.statusHistory = row.status_history || [];
  if (row.completed_operations !== undefined) result.completedOperations = parseCompletedOperations(row.completed_operations);
  if (row.is_locked !== undefined) result.isLocked = row.is_locked;
  if (row.current_step_index !== undefined) result.currentStepIndex = row.current_step_index;
  if (row.notice_message !== undefined) result.noticeMessage = row.notice_message ?? null;
  if (row.notice_at !== undefined) result.noticeAt = row.notice_at ?? null;
  if (row.notice_sender !== undefined) result.noticeSender = row.notice_sender ?? null;
  if (row.estimated_end_time !== undefined) result.estimatedEndTime = row.estimated_end_time || undefined;
  if (row.aro_overtime_since !== undefined) result.aroOvertimeSince = row.aro_overtime_since ?? null;
  if (row.weekly_schedule !== undefined) result.weeklySchedule = row.weekly_schedule as WeeklySchedule | undefined;
  if (row.hourly_operating_cost !== undefined) {
    result.hourlyOperatingCost = row.hourly_operating_cost === null
      ? null
      : Number(row.hourly_operating_cost);
  }
  
  return result;
}

// ============= ROOM STATUS HISTORY =============

export interface StatusHistoryEvent {
  id?: string;
  operating_room_id: string;
  event_type: 'step_change' | 'pause' | 'resume' | 'patient_call' | 'patient_arrival' | 'patient_arrived' | 'emergency_on' | 'emergency_off' | 'lock' | 'unlock' | 'operation_start' | 'operation_end' | 'enhanced_hygiene_on' | 'enhanced_hygiene_off' | 'staff_change';
  step_index?: number;
  step_name?: string;
  duration_seconds?: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// Record a status change event
export async function recordStatusEvent(event: StatusHistoryEvent): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  // Stejné ID a čas používáme při všech pokusech. Upsert je díky tomu
  // idempotentní i v situaci, kdy databáze zápis přijala, ale klient před
  // potvrzením ztratil spojení a pokus zopakoval.
  const row = {
    id: event.id || createEventId(),
    hospital_id: activeHospitalId || 'default',
    operating_room_id: event.operating_room_id,
    event_type: event.event_type,
    step_index: event.step_index,
    step_name: event.step_name,
    duration_seconds: event.duration_seconds,
    timestamp: event.timestamp || new Date().toISOString(),
    metadata: event.metadata || {},
  };
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= ROOM_WRITE_ATTEMPTS; attempt += 1) {
    try {
      const { error } = await supabase
        .from('room_status_history')
        .upsert(row, { onConflict: 'id', ignoreDuplicates: true });

      if (!error) return true;
      lastError = error;
      if (attempt === 1) requestHospitalAccessRefresh();
    } catch (error) {
      lastError = error;
      if (attempt === 1) requestHospitalAccessRefresh();
    }

    if (attempt < ROOM_WRITE_ATTEMPTS) {
      await wait(ROOM_WRITE_RETRY_DELAYS_MS[attempt - 1] ?? 1_250);
    }
  }

  logger.error('[DB] Událost operačního cyklu nebyla uložena ani po opakování:', {
    eventId: row.id,
    roomId: row.operating_room_id,
    eventType: row.event_type,
    error: lastError,
  });
  return false;
}

// Fetch status history for statistics
export interface StatusHistoryRow {
  id: string;
  operating_room_id: string;
  event_type: string;
  step_index: number | null;
  step_name: string | null;
  duration_seconds: number | null;
  timestamp: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function fetchStatusHistory(
  options?: {
    roomId?: string;
    eventTypes?: string[];
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    all?: boolean;
  }
): Promise<StatusHistoryRow[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    // PostgREST obvykle vrací nejvýše 1 000 řádků na požadavek. Statistiky
    // ale za měsíc/rok obsahují násobně více událostí, proto je načítáme po
    // stránkách. `limit` zůstává celkovým limitem, nikoli limitem jedné stránky.
    const requestedLimit = options?.all
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, options?.limit ?? 1_000);
    if (requestedLimit === 0) return [];

    const pageSize = Math.min(1_000, requestedLimit);
    const rows: StatusHistoryRow[] = [];

    while (rows.length < requestedLimit) {
      const currentPageSize = Math.min(pageSize, requestedLimit - rows.length);
      let query = supabase
        .from('room_status_history')
        .select('*')
        .eq('hospital_id', activeHospitalId || 'default')
        .order('timestamp', { ascending: false })
        .range(rows.length, rows.length + currentPageSize - 1);

      if (options?.roomId) query = query.eq('operating_room_id', options.roomId);
      if (options?.eventTypes && options.eventTypes.length > 0) query = query.in('event_type', options.eventTypes);
      if (options?.fromDate) query = query.gte('timestamp', options.fromDate.toISOString());
      if (options?.toDate) query = query.lte('timestamp', options.toDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      const page = (data ?? []) as StatusHistoryRow[];
      rows.push(...page);
      if (page.length < currentPageSize) break;
    }

    return rows;
  } catch (error) {
    console.error('[DB] Failed to fetch status history:', error);
    return null;
  }
}

// Get aggregated statistics from history
export interface RoomStatistics {
  totalOperations: number;
  averageOperationDuration: number; // in minutes
  averageStepDurations: Record<string, number>; // step_name -> avg duration in minutes
  emergencyCount: number;
  utilizationRate: number; // percentage
  operationsByRoom: Record<string, number>;
  operationsByDay: Record<string, number>; // ISO date -> count
}

export async function fetchRoomStatistics(
  fromDate?: Date,
  toDate?: Date
): Promise<RoomStatistics | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30 days
    const to = toDate || new Date();

    const { data, error } = await supabase
      .from('room_status_history')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .gte('timestamp', from.toISOString())
      .lte('timestamp', to.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return {
        totalOperations: 0,
        averageOperationDuration: 0,
        averageStepDurations: {},
        emergencyCount: 0,
        utilizationRate: 0,
        operationsByRoom: {},
        operationsByDay: {},
      };
    }

    // Calculate statistics
    const operationStarts = data.filter((e: StatusHistoryRow) => e.event_type === 'operation_start');
    const operationEnds = data.filter((e: StatusHistoryRow) => e.event_type === 'operation_end');
    const emergencyEvents = data.filter((e: StatusHistoryRow) => e.event_type === 'emergency_on');
    const stepChanges = data.filter((e: StatusHistoryRow) => e.event_type === 'step_change' && e.duration_seconds);

    // Total operations (completed)
    const totalOperations = operationEnds.length;

    // Average operation duration
    const durations = operationEnds
      .map((e: StatusHistoryRow) => e.duration_seconds)
      .filter((d): d is number => d !== null && d !== undefined);
    const averageOperationDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60)
      : 0;

    // Average step durations
    const stepDurations: Record<string, number[]> = {};
    stepChanges.forEach((e: StatusHistoryRow) => {
      if (e.step_name && e.duration_seconds) {
        if (!stepDurations[e.step_name]) stepDurations[e.step_name] = [];
        stepDurations[e.step_name].push(e.duration_seconds);
      }
    });
    const averageStepDurations: Record<string, number> = {};
    Object.entries(stepDurations).forEach(([name, durations]) => {
      averageStepDurations[name] = Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length / 60
      );
    });

    // Emergency count
    const emergencyCount = emergencyEvents.length;

    // Operations by room
    const operationsByRoom: Record<string, number> = {};
    operationEnds.forEach((e: StatusHistoryRow) => {
      operationsByRoom[e.operating_room_id] = (operationsByRoom[e.operating_room_id] || 0) + 1;
    });

    // Operations by day
    const operationsByDay: Record<string, number> = {};
    operationEnds.forEach((e: StatusHistoryRow) => {
      const day = e.timestamp.split('T')[0];
      operationsByDay[day] = (operationsByDay[day] || 0) + 1;
    });

    // Utilization rate (simplified: total operation time / total available time)
    const totalDays = Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    const totalAvailableMinutes = totalDays * 12 * 60 * 12; // 12 rooms, 12 hours/day
    const totalOperationMinutes = durations.reduce((a, b) => a + b, 0) / 60;
    const utilizationRate = totalAvailableMinutes > 0
      ? Math.round((totalOperationMinutes / totalAvailableMinutes) * 100)
      : 0;

    return {
      totalOperations,
      averageOperationDuration,
      averageStepDurations,
      emergencyCount,
      utilizationRate,
      operationsByRoom,
      operationsByDay,
    };
  } catch (error) {
    console.error('[DB] Failed to fetch room statistics:', error);
    return null;
  }
}

// ============= PERIOD COMPARISON — REAL TREND DATA =============

export interface PeriodComparisonStats {
  currentPeriod: {
    totalOperations: number;
    avgUtilization: number;
    totalQueue: number;
    avgOpDuration: number; // minutes
  };
  previousPeriod: {
    totalOperations: number;
    avgUtilization: number;
    totalQueue: number;
    avgOpDuration: number;
  };
  /** Trend data points for sparklines - daily aggregates */
  trendData: {
    date: string;
    operations: number;
    utilization: number;
  }[];
}

/**
 * Fetches statistics for current period AND previous period for comparison.
 * Also returns daily trend data for sparklines.
 */
export async function fetchPeriodComparison(
  period: 'den' | 'týden' | 'měsíc' | 'rok'
): Promise<PeriodComparisonStats | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const now = new Date();
    let periodMs: number;
    
    switch (period) {
      case 'den':    periodMs = 24 * 60 * 60 * 1000; break;
      case 'týden':  periodMs = 7 * 24 * 60 * 60 * 1000; break;
      case 'měsíc':  periodMs = 30 * 24 * 60 * 60 * 1000; break;
      case 'rok':    periodMs = 365 * 24 * 60 * 60 * 1000; break;
    }
    
    const currentStart = new Date(now.getTime() - periodMs);
    const previousStart = new Date(now.getTime() - periodMs * 2);
    
    // Fetch all history for both periods
    const { data, error } = await supabase
      .from('room_status_history')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .gte('timestamp', previousStart.toISOString())
      .lte('timestamp', now.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;
    
    const history = data || [];
    
    // Split into current and previous period
    const currentHistory = history.filter((e: StatusHistoryRow) => 
      new Date(e.timestamp).getTime() >= currentStart.getTime()
    );
    const previousHistory = history.filter((e: StatusHistoryRow) => 
      new Date(e.timestamp).getTime() < currentStart.getTime()
    );
    
    // Calculate stats for each period
    const calcPeriodStats = (events: StatusHistoryRow[]) => {
      const opEnds = events.filter(e => e.event_type === 'operation_end');
      const stepChanges = events.filter(e => e.event_type === 'step_change' && e.duration_seconds);
      
      const totalOperations = opEnds.length;
      
      const durations = opEnds
        .map(e => e.duration_seconds)
        .filter((d): d is number => d !== null && d !== undefined);
      const avgOpDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60)
        : 0;
      
      // Simplified utilization - sum of all step durations / expected working time
      const totalStepMinutes = stepChanges.reduce((sum, e) => sum + (e.duration_seconds || 0) / 60, 0);
      const expectedMinutesPerDay = 10 * 60; // 10 hours per day
      const days = Math.max(1, events.length > 0 ? 
        Math.ceil((new Date(events[events.length - 1].timestamp).getTime() - 
                   new Date(events[0].timestamp).getTime()) / (24 * 60 * 60 * 1000)) : 1);
      const avgUtilization = Math.min(100, Math.round((totalStepMinutes / (expectedMinutesPerDay * days)) * 100));
      
      return { totalOperations, avgUtilization, totalQueue: 0, avgOpDuration };
    };
    
    // Build daily trend data from current period
    const trendData: { date: string; operations: number; utilization: number }[] = [];
    const dailyOps: Record<string, number> = {};
    const dailyMinutes: Record<string, number> = {};
    
    currentHistory.forEach((e: StatusHistoryRow) => {
      const day = e.timestamp.split('T')[0];
      if (e.event_type === 'operation_end') {
        dailyOps[day] = (dailyOps[day] || 0) + 1;
      }
      if (e.event_type === 'step_change' && e.duration_seconds) {
        dailyMinutes[day] = (dailyMinutes[day] || 0) + e.duration_seconds / 60;
      }
    });
    
    // Generate trend for each day in period
    const dayCount = period === 'den' ? 24 : period === 'týden' ? 7 : period === 'měsíc' ? 30 : 12;
    for (let i = dayCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * (periodMs / dayCount));
      const dayKey = date.toISOString().split('T')[0];
      const ops = dailyOps[dayKey] || 0;
      const mins = dailyMinutes[dayKey] || 0;
      const util = Math.min(100, Math.round((mins / (10 * 60)) * 100)); // 10h working day
      trendData.push({ date: dayKey, operations: ops, utilization: util });
    }
    
    return {
      currentPeriod: calcPeriodStats(currentHistory),
      previousPeriod: calcPeriodStats(previousHistory),
      trendData,
    };
  } catch (error) {
    console.error('[DB] Failed to fetch period comparison:', error);
    return null;
  }
}

// ============= STATISTICS — RAW TABLE FETCHES =============

// ── safety_checklists ──────────────────────────────────────────────
export interface SafetyChecklistRow {
  id: string;
  operating_room_id: string | null;
  patient_name: string | null;
  patient_id_external: string | null;
  procedure_name: string | null;
  surgeon_name: string | null;
  anesthesiologist_name: string | null;
  nurse_name: string | null;
  sign_in_completed: boolean;
  sign_in_completed_at: string | null;
  sign_in_completed_by: string | null;
  sign_in_data: JsonObject | null;
  time_out_completed: boolean;
  time_out_completed_at: string | null;
  time_out_completed_by: string | null;
  time_out_data: JsonObject | null;
  sign_out_completed: boolean;
  sign_out_completed_at: string | null;
  sign_out_completed_by: string | null;
  sign_out_data: JsonObject | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSafetyChecklists(
  options?: { fromDate?: Date; toDate?: Date; limit?: number }
): Promise<SafetyChecklistRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    let query = supabase
      .from('safety_checklists')
      .select('*')
      .eq('hospital_id', getDatabaseHospitalId())
      .order('created_at', { ascending: false });

    if (options?.fromDate) query = query.gte('created_at', options.fromDate.toISOString());
    if (options?.toDate)   query = query.lte('created_at', options.toDate.toISOString());
    if (options?.limit)    query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as SafetyChecklistRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch safety_checklists:', error);
    return null;
  }
}

// ── equipment ─────────────────────────────────────────────────────�����
export interface EquipmentRow {
  id: string;
  name: string;
  type: string | null;
  operating_room_id: string | null;
  is_available: boolean;
  last_maintenance: string | null;
  next_maintenance: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchEquipment(): Promise<EquipmentRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .order('next_maintenance', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as EquipmentRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch equipment:', error);
    return null;
  }
}

// ── staff (full table — pro Personál tab) ─────���───────────────────
export interface StaffRow {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  skill_level: string | null;
  availability: number | null;
  is_external: boolean | null;
  is_recommended: boolean | null;
  vacation_days: number | null;
  sick_leave_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchAllStaff(hospitalId: string = getDatabaseHospitalId()): Promise<StaffRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('role', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as StaffRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch staff:', error);
    return null;
  }
}

// ── schedules (planned ops) ───────────────────────────────────────
export interface ScheduleRow {
  id: string;
  operating_room_id: string | null;
  patient_id: string | null;
  procedure_id: string | null;
  scheduled_date: string;        // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM:SS
  duration_minutes: number | null;
  priority: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchSchedules(
  options?: { fromDate?: Date; toDate?: Date; limit?: number }
): Promise<ScheduleRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    let query = supabase
      .from('schedules')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true, nullsFirst: false });

    if (options?.fromDate) {
      const from = options.fromDate.toISOString().split('T')[0];
      query = query.gte('scheduled_date', from);
    }
    if (options?.toDate) {
      const to = options.toDate.toISOString().split('T')[0];
      query = query.lte('scheduled_date', to);
    }
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ScheduleRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch schedules:', error);
    return null;
  }
}

// ============= BACKGROUND SETTINGS =============

export type BackgroundAnimation = 'none' | 'gradient-shift' | 'aurora' | 'particles' | 'pulse';

export interface BackgroundSettings {
  type: 'solid' | 'linear' | 'radial';
  colors: { color: string; position: number }[];
  direction: string;
  opacity: number;
  imageUrl: string;
  imageOpacity: number;
  imageBlur: number;
  /** Animovaný efekt pozadí (CSS, lehké). */
  animation?: BackgroundAnimation;
  /** Rychlost animace 1 (pomalu) – 5 (rychle). Výchozí 3. */
  animationSpeed?: number;
}

// Fetch background settings for all users
export async function fetchBackgroundSettings(): Promise<BackgroundSettings | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('hospital_id', getDatabaseHospitalId())
      .eq('id', `${getDatabaseHospitalId()}-global`)
      .single();

    if (error || !data) {
      // Settings don't exist yet, return null
      return null;
    }

    // Map database columns to BackgroundSettings interface
    return {
      type: (data.background_type as 'solid' | 'linear' | 'radial') || 'linear',
      colors: (data.background_colors as { color: string; position: number }[]) || [{ color: '#0a0a12', position: 0 }, { color: '#1a1a2e', position: 100 }],
      direction: data.background_direction || 'to bottom',
      opacity: data.background_opacity ?? 100,
      // Obrazová pozadí jsou z výkonových důvodů vypnutá i pro starší záznamy.
      imageUrl: '',
      imageOpacity: 0,
      imageBlur: 0,
      animation: (data.background_animation as BackgroundAnimation) ?? 'none',
      animationSpeed: data.background_animation_speed ?? 3,
    };
  } catch (error) {
    console.error('[DB] Failed to fetch background settings:', error);
    return null;
  }
}

// Save background settings for all users
export async function saveBackgroundSettings(settings: BackgroundSettings): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    // Map BackgroundSettings to database columns
    const dbData: Record<string, unknown> = {
      id: `${getDatabaseHospitalId()}-global`,
      hospital_id: getDatabaseHospitalId(),
      background_type: settings.type,
      background_colors: settings.colors,
      background_direction: settings.direction,
      background_opacity: settings.opacity,
      background_image_url: '',
      background_image_opacity: 0,
      background_image_blur: 0,
      background_animation: settings.animation ?? 'none',
      background_animation_speed: settings.animationSpeed ?? 3,
      updated_at: new Date().toISOString(),
    };

    // Upsert - insert or update
    let { error } = await supabase
      .from('app_settings')
      .upsert(dbData, { onConflict: 'id' });

    // Resilience: pokud DB ještě nemá sloupce pro animaci (42703),
    // ulož zbytek bez nich (animace pak funguje lokálně do migrace).
    if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message))) {
      delete dbData.background_animation;
      delete dbData.background_animation_speed;
      ({ error } = await supabase.from('app_settings').upsert(dbData, { onConflict: 'id' }));
    }

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[DB] Failed to save background settings:', error);
    return false;
  }
}

// ============= NOTIFICATIONS LOG =============

export interface NotificationLogRow {
  id: string;
  notification_type: string;
  room_id: string | null;
  room_name: string | null;
  recipient_count: number;
  custom_reason: string | null;
  created_at: string;
}

export async function fetchNotificationsLog(
  options?: { fromDate?: Date; toDate?: Date; limit?: number; all?: boolean }
): Promise<NotificationLogRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const requestedLimit = options?.all
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, options?.limit ?? 1_000);
    if (requestedLimit === 0) return [];

    const pageSize = Math.min(1_000, requestedLimit);
    const rows: NotificationLogRow[] = [];

    while (rows.length < requestedLimit) {
      const currentPageSize = Math.min(pageSize, requestedLimit - rows.length);
      let query = supabase
        .from('notifications_log')
        .select('*')
        .eq('hospital_id', activeHospitalId || 'default')
        .order('created_at', { ascending: false })
        .range(rows.length, rows.length + currentPageSize - 1);

      if (options?.fromDate) query = query.gte('created_at', options.fromDate.toISOString());
      if (options?.toDate) query = query.lte('created_at', options.toDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      const page = (data ?? []) as NotificationLogRow[];
      rows.push(...page);
      if (page.length < currentPageSize) break;
    }

    return rows;
  } catch (error) {
    console.error('[DB] Failed to fetch notifications_log:', error);
    return null;
  }
}

/**
 * Zapíše událost do notifications_log (kdo/co/kdy). Používá se např. při
 * vyhlášení zvýšeného hygienického režimu (infekční pacient), aby zůstal
 * trvalý záznam na kterém sále a v jakém čase k tomu došlo.
 */
export async function logNotificationEvent(params: {
  roomId: string;
  roomName: string;
  notificationType: string;
  customReason?: string | null;
}): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('notifications_log').insert({
      hospital_id: activeHospitalId || 'default',
      room_id: params.roomId,
      room_name: params.roomName,
      notification_type: params.notificationType,
      custom_reason: params.customReason ?? null,
      recipient_count: 0,
      // created_at doplní databáze (DEFAULT NOW())
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[DB] Failed to log notification event:', error instanceof Error ? error.message : error);
    return false;
  }
}

// ============= SHIFT SCHEDULES =============

export interface ShiftScheduleRow {
  id: string;
  staff_id: string;
  operating_room_id: string | null;
  shift_date: string;
  shift_type: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchShiftSchedules(
  options?: { fromDate?: Date; toDate?: Date; staffId?: string }
): Promise<ShiftScheduleRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    let query = supabase
      .from('shift_schedules')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: false });

    if (options?.fromDate) {
      const from = options.fromDate.toISOString().split('T')[0];
      query = query.gte('shift_date', from);
    }
    if (options?.toDate) {
      const to = options.toDate.toISOString().split('T')[0];
      query = query.lte('shift_date', to);
    }
    if (options?.staffId) query = query.eq('staff_id', options.staffId);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ShiftScheduleRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch shift_schedules:', error);
    return null;
  }
}

// ============= DEPARTMENTS =============

export interface DepartmentRow {
  id: string;
  name: string;
  description: string | null;
  accent_color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubDepartmentRow {
  id: string;
  department_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchDepartments(): Promise<DepartmentRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DepartmentRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch departments:', error);
    return null;
  }
}

export async function fetchSubDepartments(): Promise<SubDepartmentRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('sub_departments')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as SubDepartmentRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch sub_departments:', error);
    return null;
  }
}

// ============= MANAGEMENT CONTACTS =============

export interface ManagementContactRow {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  notify_emergencies: boolean;
  notify_daily_reports: boolean;
  notify_statistics: boolean;
  notify_late_surgeon: boolean;
  notify_late_anesthesiologist: boolean;
  notify_late_arrival: boolean;
  notify_patient_not_ready: boolean;
  notify_other: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchManagementContacts(): Promise<ManagementContactRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('management_contacts')
      .select('*')
      .eq('hospital_id', getDatabaseHospitalId())
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ManagementContactRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch management_contacts:', error);
    return null;
  }
}

// ============= DEVICES =============

export interface DeviceRow {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type: string | null;
  platform: string | null;
  browser: string | null;
  ip_address: string | null;
  is_active: boolean;
  is_pwa_installed: boolean;
  last_seen_at: string | null;
  installed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchDevices(): Promise<DeviceRow[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('hospital_id', activeHospitalId || 'default')
      .order('last_seen_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data ?? []) as DeviceRow[];
  } catch (error) {
    console.error('[DB] Failed to fetch devices:', error);
    return null;
  }
}
