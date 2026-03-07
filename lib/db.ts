import { supabase, isSupabaseConfigured } from './supabase';
import { OperatingRoom, RoomStatus } from '../types';

// Type for database row
interface DBOperatingRoom {
  id: string;
  name: string;
  department: string;
  status: string;
  queue_count: number;
  operations_24h: number;
  is_septic: boolean;
  is_emergency: boolean;
  is_locked: boolean;
  current_step_index: number;
  estimated_end_time: string | null;
  doctor_id: string | null;
  nurse_id: string | null;
  anesthesiologist_id: string | null;
  current_patient_id: string | null;
  current_procedure_id: string | null;
}

interface DBStaff {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
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

  return {
    id: row.id,
    name: row.name,
    department: row.department,
    status: (row.status as RoomStatus) || RoomStatus.FREE,
    queueCount: row.queue_count,
    operations24h: row.operations_24h,
    isSeptic: row.is_septic,
    isEmergency: row.is_emergency,
    isLocked: row.is_locked,
    currentStepIndex: row.current_step_index,
    estimatedEndTime: row.estimated_end_time || undefined,
    staff: {
      doctor: { name: doctor?.name || null, role: 'DOCTOR' },
      nurse: { name: nurse?.name || null, role: 'NURSE' },
      anesthesiologist: anesthesiologist 
        ? { name: anesthesiologist.name, role: 'ANESTHESIOLOGIST' }
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
export async function fetchOperatingRooms(): Promise<OperatingRoom[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    // Fetch all data in parallel
    const [roomsRes, staffRes, patientsRes, proceduresRes] = await Promise.all([
      supabase.from('operating_rooms').select('*').order('name'),
      supabase.from('staff').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('procedures').select('*'),
    ]);

    if (roomsRes.error) throw roomsRes.error;
    if (!roomsRes.data || roomsRes.data.length === 0) return null;

    // Create lookup maps
    const staffMap = new Map<string, DBStaff>();
    (staffRes.data || []).forEach((s: DBStaff) => staffMap.set(s.id, s));

    const patientMap = new Map<string, DBPatient>();
    (patientsRes.data || []).forEach((p: DBPatient) => patientMap.set(p.id, p));

    const procedureMap = new Map<string, DBProcedure>();
    (proceduresRes.data || []).forEach((p: DBProcedure) => procedureMap.set(p.id, p));

    // Transform rows
    return roomsRes.data.map((row: DBOperatingRoom) => 
      transformRoom(row, staffMap, patientMap, procedureMap)
    );
  } catch (error) {
    console.error('[DB] Failed to fetch operating rooms:', error);
    return null;
  }
}

// Update operating room
export async function updateOperatingRoom(
  id: string, 
  updates: Partial<{
    status: string;
    is_emergency: boolean;
    is_locked: boolean;
    current_step_index: number;
    estimated_end_time: string | null;
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('operating_rooms')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[DB] Failed to update operating room:', error);
    return false;
  }
}

// Subscribe to real-time changes
export function subscribeToOperatingRooms(
  onUpdate: () => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const channel = supabase
    .channel('operating_rooms_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operating_rooms' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// ============= ROOM STATUS HISTORY =============

export interface StatusHistoryEvent {
  id?: string;
  operating_room_id: string;
  event_type: 'step_change' | 'pause' | 'resume' | 'patient_call' | 'patient_arrival' | 'emergency_on' | 'emergency_off' | 'lock' | 'unlock' | 'operation_start' | 'operation_end';
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

  try {
    const { error } = await supabase
      .from('room_status_history')
      .insert({
        operating_room_id: event.operating_room_id,
        event_type: event.event_type,
        step_index: event.step_index,
        step_name: event.step_name,
        duration_seconds: event.duration_seconds,
        timestamp: event.timestamp || new Date().toISOString(),
        metadata: event.metadata || {},
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[DB] Failed to record status event:', error);
    return false;
  }
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
  }
): Promise<StatusHistoryRow[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    let query = supabase
      .from('room_status_history')
      .select('*')
      .order('timestamp', { ascending: false });

    if (options?.roomId) {
      query = query.eq('operating_room_id', options.roomId);
    }
    if (options?.eventTypes && options.eventTypes.length > 0) {
      query = query.in('event_type', options.eventTypes);
    }
    if (options?.fromDate) {
      query = query.gte('timestamp', options.fromDate.toISOString());
    }
    if (options?.toDate) {
      query = query.lte('timestamp', options.toDate.toISOString());
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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
