import { supabase } from './supabase';
import type { OperatingRoom, Schedule, Shift } from '../types';

// ============= OPERATING ROOMS =============

export async function fetchOperatingRooms(): Promise<OperatingRoom[]> {
  const { data, error } = await supabase
    .from('operating_rooms')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching operating rooms:', error);
    throw error;
  }

  return data || [];
}

export async function createOperatingRoom(room: Omit<OperatingRoom, 'id' | 'created_at' | 'updated_at'>): Promise<OperatingRoom> {
  const { data, error } = await supabase
    .from('operating_rooms')
    .insert([room])
    .select()
    .single();

  if (error) {
    console.error('Error creating operating room:', error);
    throw error;
  }

  return data;
}

export async function updateOperatingRoom(id: string, updates: Partial<OperatingRoom>): Promise<OperatingRoom> {
  const { data, error } = await supabase
    .from('operating_rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating operating room:', error);
    throw error;
  }

  return data;
}

export async function deleteOperatingRoom(id: string): Promise<void> {
  const { error } = await supabase
    .from('operating_rooms')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting operating room:', error);
    throw error;
  }
}

// ============= DEPARTMENTS =============

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    throw error;
  }

  return data || [];
}

export async function createDepartment(dept: any) {
  const { data, error } = await supabase
    .from('departments')
    .insert([dept])
    .select()
    .single();

  if (error) {
    console.error('Error creating department:', error);
    throw error;
  }

  return data;
}

export async function updateDepartment(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating department:', error);
    throw error;
  }

  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting department:', error);
    throw error;
  }
}

// ============= STAFF =============

export async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching staff:', error);
    throw error;
  }

  return data || [];
}

export async function createStaff(staff: any) {
  const { data, error } = await supabase
    .from('staff')
    .insert([staff])
    .select()
    .single();

  if (error) {
    console.error('Error creating staff:', error);
    throw error;
  }

  return data;
}

export async function updateStaff(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from('staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating staff:', error);
    throw error;
  }

  return data;
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
}

// ============= SCHEDULES =============

export async function fetchSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }

  return data || [];
}

export async function createSchedule(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert([schedule])
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }

  return data;
}

export async function updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }

  return data;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
}

// ============= SHIFT SCHEDULES =============

export async function fetchShiftSchedules(): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shift_schedules')
    .select('*')
    .order('shift_date', { ascending: true });

  if (error) {
    console.error('Error fetching shift schedules:', error);
    throw error;
  }

  return data || [];
}

export async function createShiftSchedule(shift: Omit<Shift, 'id' | 'created_at' | 'updated_at'>): Promise<Shift> {
  const { data, error } = await supabase
    .from('shift_schedules')
    .insert([shift])
    .select()
    .single();

  if (error) {
    console.error('Error creating shift schedule:', error);
    throw error;
  }

  return data;
}

export async function updateShiftSchedule(id: string, updates: Partial<Shift>): Promise<Shift> {
  const { data, error } = await supabase
    .from('shift_schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating shift schedule:', error);
    throw error;
  }

  return data;
}

export async function deleteShiftSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from('shift_schedules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting shift schedule:', error);
    throw error;
  }
}

// ============= PATIENTS =============

export async function fetchPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }

  return data || [];
}

export async function createPatient(patient: any) {
  const { data, error } = await supabase
    .from('patients')
    .insert([patient])
    .select()
    .single();

  if (error) {
    console.error('Error creating patient:', error);
    throw error;
  }

  return data;
}

export async function updatePatient(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from('patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating patient:', error);
    throw error;
  }

  return data;
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
}

// ============= PROCEDURES =============

export async function fetchProcedures() {
  const { data, error } = await supabase
    .from('procedures')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching procedures:', error);
    throw error;
  }

  return data || [];
}

export async function createProcedure(procedure: any) {
  const { data, error } = await supabase
    .from('procedures')
    .insert([procedure])
    .select()
    .single();

  if (error) {
    console.error('Error creating procedure:', error);
    throw error;
  }

  return data;
}

export async function updateProcedure(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from('procedures')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating procedure:', error);
    throw error;
  }

  return data;
}

export async function deleteProcedure(id: string): Promise<void> {
  const { error } = await supabase
    .from('procedures')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting procedure:', error);
    throw error;
  }
}

// ============= EQUIPMENT =============

export async function fetchEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching equipment:', error);
    throw error;
  }

  return data || [];
}

export async function createEquipment(equipment: any) {
  const { data, error } = await supabase
    .from('equipment')
    .insert([equipment])
    .select()
    .single();

  if (error) {
    console.error('Error creating equipment:', error);
    throw error;
  }

  return data;
}

export async function updateEquipment(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from('equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating equipment:', error);
    throw error;
  }

  return data;
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting equipment:', error);
    throw error;
  }
}

// ============= SUB DEPARTMENTS =============

export async function fetchSubDepartments() {
  const { data, error } = await supabase
    .from('sub_departments')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching sub-departments:', error);
    throw error;
  }

  return data || [];
}

export async function createSubDepartment(subDept: any) {
  const { data, error } = await supabase
    .from('sub_departments')
    .insert([subDept])
    .select()
    .single();

  if (error) {
    console.error('Error creating sub-department:', error);
    throw error;
  }

  return data;
}

export async function updateSubDepartment(id: string, updates: any): Promise<any> {
  const { data, error } = await supabase
    .from('sub_departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating sub-department:', error);
    throw error;
  }

  return data;
}

export async function deleteSubDepartment(id: string): Promise<void> {
  const { error } = await supabase
    .from('sub_departments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting sub-department:', error);
    throw error;
  }
}

// ============= REAL-TIME SUBSCRIPTIONS =============

export function subscribeToOperatingRooms(
  onUpdate: (room: OperatingRoom) => void
): (() => void) | null {
  const subscription = supabase
    .channel('operating_rooms_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'operating_rooms',
      },
      (payload) => {
        console.log('[v0] Real-time update:', payload);
        if (payload.new) {
          onUpdate(payload.new as OperatingRoom);
        }
      }
    )
    .subscribe((status) => {
      console.log('[v0] Subscription status:', status);
    });

  return () => {
    subscription.unsubscribe();
  };
}
