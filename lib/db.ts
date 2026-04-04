import { supabase, isSupabaseConfigured } from './supabase';
import { OperatingRoom, RoomStatus, WeeklySchedule } from '../types';

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
  is_enhanced_hygiene: boolean;
  is_paused: boolean;
  patient_called_at: string | null;
  patient_arrived_at: string | null;
  phase_started_at: string | null;
  operation_started_at: string | null;
  status_history: any[] | null;
  completed_operations: any[] | null;
  current_step_index: number;
  estimated_end_time: string | null;
  doctor_id: string | null;
  nurse_id: string | null;
  anesthesiologist_id: string | null;
  current_patient_id: string | null;
  current_procedure_id: string | null;
  weekly_schedule: Record<string, any> | null;
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
    isEnhancedHygiene: row.is_enhanced_hygiene,
    isPaused: row.is_paused,
    patientCalledAt: row.patient_called_at,
    patientArrivedAt: row.patient_arrived_at,
    phaseStartedAt: row.phase_started_at,
    operationStartedAt: row.operation_started_at,
    statusHistory: row.status_history || [],
    completedOperations: row.completed_operations || [],
    isLocked: row.is_locked,
    currentStepIndex: row.current_step_index,
    estimatedEndTime: row.estimated_end_time || undefined,
    weeklySchedule: row.weekly_schedule as WeeklySchedule | undefined,
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
    // Fetch rooms and staff data in parallel
    const [roomsRes, staffRes] = await Promise.all([
      supabase.from('operating_rooms').select('*').order('name'),
      supabase.from('staff').select('*'),
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
    name: string;
    department: string;
    status: string;
    is_emergency: boolean;
    is_enhanced_hygiene: boolean;
    is_paused: boolean;
    is_locked: boolean;
    patient_called_at: string | null;
    patient_arrived_at: string | null;
    phase_started_at: string | null;
    current_step_index: number;
    estimated_end_time: string | null;
    weekly_schedule: Record<string, any>;
    doctor_id: string | null;
    nurse_id: string | null;
    anesthesiologist_id: string | null;
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }
}

// Fetch completed operations for a specific room on a given day
export interface CompletedOperation {
  startedAt: string;
  endedAt: string;
  statusHistory: Array<{ stepIndex: number; startedAt: string; color?: string; stepName?: string }>;
}

export async function fetchCompletedOperationsForDay(
  roomId: string,
  date: Date
): Promise<CompletedOperation[] | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('room_status_history')
      .select('*')
      .eq('operating_room_id', roomId)
      .gte('timestamp', startOfDay.toISOString())
      .lte('timestamp', endOfDay.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Group events into operations
    // Strategy: Look for operation_end events or "Úklid sálu" to mark end of operation
    // Then collect all events backwards to operation_start or first event
    const operations: CompletedOperation[] = [];
    let i = 0;
    
    while (i < data.length) {
      const event = data[i];
      
      // Check if this is start of an operation (operation_start or first step_change)
      if (event.event_type === 'operation_start' || 
          (event.event_type === 'step_change' && event.step_name === 'Příjezd na sál')) {
        
        const operationStart = i;
        let operationEnd = i;
        
        // Find the end of this operation (operation_end or "Úklid sálu")
        for (let j = i + 1; j < data.length; j++) {
          if (data[j].event_type === 'operation_end' || 
              (data[j].event_type === 'step_change' && data[j].step_name === 'Úklid sálu')) {
            operationEnd = j;
            break;
          }
        }
        
        // Extract events for this operation
        const operationEvents = data.slice(operationStart, operationEnd + 1);
        const op = buildCompletedOperation(operationEvents);
        
        if (op) {
          operations.push(op);
        }
        
        // Move to next event after this operation
        i = operationEnd + 1;
      } else {
        i++;
      }
    }

    return operations;
  } catch (error) {
    console.error('[DB] Failed to fetch completed operations:', error);
    return null;
  }
}

// Build a completed operation from events
function buildCompletedOperation(events: StatusHistoryRow[]): CompletedOperation | null {
  if (events.length === 0) return null;
  
  // Find first "Příjezd na sál" and last "Úklid sálu" or operation_end
  let startTime = events[0].timestamp;
  let endTime = events[events.length - 1].timestamp;
  
  // Collect all step_change events as status history
  const statusHistory = events
    .filter(e => e.event_type === 'step_change' && e.step_index !== null)
    .map(e => ({
      stepIndex: e.step_index as number,
      startedAt: e.timestamp,
      color: getStepColor(e.step_index as number),
      stepName: e.step_name || ''
    }))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  if (statusHistory.length === 0) return null;

  // Set startTime to "Příjezd na sál" (step_index 2)
  const prijezdEvent = statusHistory.find(s => s.stepIndex === 2);
  if (prijezdEvent) {
    startTime = prijezdEvent.startedAt;
  }

  // Set endTime to "Úklid sálu" (step_index 0)
  const uklidEvent = statusHistory.find(s => s.stepIndex === 0);
  if (uklidEvent) {
    endTime = uklidEvent.startedAt;
  }

  return {
    startedAt: startTime,
    endedAt: endTime,
    statusHistory: statusHistory as any
  };
}

// Get color for a step index (you can adjust these colors)
function getStepColor(stepIndex: number): string {
  const colors: Record<number, string> = {
    0: '#6b7280', // Sál připraven - gray
    1: '#3b82f6', // Příjezd na sál - blue
    2: '#8b5cf6', // Začátek anestezie - purple
    3: '#ec4899', // Chirurgický výkon - pink
    4: '#f59e0b', // Ukončení výkonu - amber
    5: '#10b981', // Odjezd ze sálu - green
    6: '#ef4444', // Úklid sálu - red
  };
  return colors[stepIndex] || '#6b7280';
}

// Subscribe to real-time changes with granular updates
export function subscribeToOperatingRooms(
  onFullRefresh: () => void,
  onRoomUpdate?: (roomId: string, changes: Partial<DBOperatingRoom>) => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const channel = supabase
    .channel('operating_rooms_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'operating_rooms' },
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
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// Transform a single DB row to app type (for real-time updates)
export function transformSingleRoom(row: Partial<DBOperatingRoom>): Partial<OperatingRoom> {
  const result: Partial<OperatingRoom> = {};
  
  if (row.id !== undefined) result.id = row.id;
  if (row.name !== undefined) result.name = row.name;
  if (row.department !== undefined) result.department = row.department;
  if (row.status !== undefined) result.status = row.status as RoomStatus;
  if (row.queue_count !== undefined) result.queueCount = row.queue_count;
  if (row.operations_24h !== undefined) result.operations24h = row.operations_24h;
  if (row.is_septic !== undefined) result.isSeptic = row.is_septic;
  if (row.is_emergency !== undefined) result.isEmergency = row.is_emergency;
  if (row.is_enhanced_hygiene !== undefined) result.isEnhancedHygiene = row.is_enhanced_hygiene;
  if (row.is_paused !== undefined) result.isPaused = row.is_paused;
  if (row.patient_called_at !== undefined) result.patientCalledAt = row.patient_called_at;
  if (row.patient_arrived_at !== undefined) result.patientArrivedAt = row.patient_arrived_at;
  if (row.phase_started_at !== undefined) result.phaseStartedAt = row.phase_started_at;
  if (row.operation_started_at !== undefined) result.operationStartedAt = row.operation_started_at;
  if (row.status_history !== undefined) result.statusHistory = row.status_history || [];
  if (row.completed_operations !== undefined) result.completedOperations = row.completed_operations || [];
  if (row.is_locked !== undefined) result.isLocked = row.is_locked;
  if (row.current_step_index !== undefined) result.currentStepIndex = row.current_step_index;
  if (row.estimated_end_time !== undefined) result.estimatedEndTime = row.estimated_end_time || undefined;
  if (row.weekly_schedule !== undefined) result.weeklySchedule = row.weekly_schedule as WeeklySchedule | undefined;
  
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

// ============= BACKGROUND SETTINGS =============

export interface BackgroundSettings {
  type: 'solid' | 'linear' | 'radial';
  colors: { color: string; position: number }[];
  direction: string;
  opacity: number;
  imageUrl: string;
  imageOpacity: number;
  imageBlur: number;
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
      .eq('id', 'global')
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
      imageUrl: data.background_image_url || '',
      imageOpacity: data.background_image_opacity ?? 15,
      imageBlur: data.background_image_blur ?? 0,
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
    const dbData = {
      id: 'global',
      background_type: settings.type,
      background_colors: settings.colors,
      background_direction: settings.direction,
      background_opacity: settings.opacity,
      background_image_url: settings.imageUrl,
      background_image_opacity: settings.imageOpacity,
      background_image_blur: settings.imageBlur,
      updated_at: new Date().toISOString(),
    };

    // Upsert - insert or update
    const { error } = await supabase
      .from('app_settings')
      .upsert(dbData, { onConflict: 'id' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[DB] Failed to save background settings:', error);
    return false;
  }
}
