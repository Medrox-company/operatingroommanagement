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
