import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Shield, Activity, 
  CheckCircle2, Loader2, Building2, UserCheck, AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchAllStaff, StaffRow } from '../lib/db';

// Types
interface RoomWithStaff {
  id: string;
  name: string;
  department: string | null;
  current_step_index: number | null;
  is_locked: boolean | null;
  is_paused: boolean | null;
  doctor: StaffRow | null;
  nurse: StaffRow | null;
  anesthesiologist: StaffRow | null;
  isActive: boolean;
}

// Design tokens
const C = {
  accent: '#FBBF24',
  green: '#10B981',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  orange: '#F97316',
  border: 'rgba(255,255,255,0.07)',
  glass: 'rgba(255,255,255,0.03)',
};

const StaffOverviewModule: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [rooms, setRooms] = useState<RoomWithStaff[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  const fetchData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const staffData = await fetchAllStaff();
      
      const { data: roomsData } = await supabase
        .from('operating_rooms')
        .select('id, name, department, current_step_index, doctor_id, nurse_id, anesthesiologist_id, is_locked, is_paused')
        .order('sort_order', { ascending: true });

      const staffMap = new Map(staffData?.map(s => [s.id, s]) || []);
      
      const roomsWithStaff: RoomWithStaff[] = (roomsData || []).map(room => ({
        id: room.id,
        name: room.name,
        department: room.department,
        current_step_index: room.current_step_index,
        is_locked: room.is_locked,
        is_paused: room.is_paused,
        doctor: room.doctor_id ? staffMap.get(room.doctor_id) || null : null,
        nurse: room.nurse_id ? staffMap.get(room.nurse_id) || null : null,
        anesthesiologist: room.anesthesiologist_id ? staffMap.get(room.anesthesiologist_id) || null : null,
        isActive: room.current_step_index !== null && 
                  room.current_step_index >= 0 && 
                  room.current_step_index < 6 &&
                  !room.is_locked
      }));

      setStaffList(staffData || []);
      setRooms(roomsWithStaff);
    } catch (err) {
      console.error('[StaffOverview] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('staff-overview-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operating_rooms' }, fetchData)
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  // Get free staff (not assigned to any room)
  const freeStaff = useMemo(() => {
    const assignedIds = new Set<string>();
    rooms.forEach(room => {
      if (room.doctor) assignedIds.add(room.doctor.id);
      if (room.nurse) assignedIds.add(room.nurse.id);
      if (room.anesthesiologist) assignedIds.add(room.anesthesiologist.id);
    });
    
    return {
      doctors: staffList.filter(s => s.is_active && (s.role === 'DOCTOR' || s.role === 'ANESTHESIOLOGIST') && !assignedIds.has(s.id)),
      nurses: staffList.filter(s => s.is_active && s.role === 'NURSE' && !assignedIds.has(s.id))
    };
  }, [staffList, rooms]);

  // Stats
  const stats = useMemo(() => {
    const activeRooms = rooms.filter(r => r.isActive);
    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      freeDoctors: freeStaff.doctors.length,
      freeNurses: freeStaff.nurses.length,
    };
  }, [rooms, freeStaff]);

  // Staff badge component
  const StaffBadge = ({ staff, role, color }: { staff: StaffRow | null; role: string; color: string }) => {
    if (!staff) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
          <AlertCircle className="w-4 h-4 text-white/20" />
          <span className="text-sm text-white/30">Nepřiřazeno</span>
        </div>
      );
    }

    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ background: color + '15', border: `1px solid ${color}30` }}
      >
        {role === 'doctor' ? (
          <Stethoscope className="w-4 h-4" style={{ color }} />
        ) : (
          <Heart className="w-4 h-4" style={{ color }} />
        )}
        <span className="text-sm font-medium text-white">{staff.name}</span>
        {staff.is_external && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-semibold">
            EXT
          </span>
        )}
      </div>
    );
  };

  // Room row component
  const RoomRow = ({ room }: { room: RoomWithStaff }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-2xl transition-all"
      style={{ 
        background: room.isActive ? 'rgba(59, 130, 246, 0.08)' : C.glass,
        border: `1px solid ${room.isActive ? 'rgba(59, 130, 246, 0.2)' : C.border}`,
      }}
    >
      {/* Room name */}
      <div className="flex items-center gap-3 lg:w-48 flex-shrink-0">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: room.isActive ? C.blue + '20' : 'rgba(255,255,255,0.05)' }}
        >
          <Building2 className="w-5 h-5" style={{ color: room.isActive ? C.blue : 'rgba(255,255,255,0.4)' }} />
        </div>
        <div>
          <p className="text-base font-bold text-white">{room.name}</p>
          <div className="flex items-center gap-2">
            {room.isActive ? (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Activity className="w-3 h-3 animate-pulse" />
                Aktivní
              </span>
            ) : room.is_locked ? (
              <span className="text-xs text-amber-400">Uzamčen</span>
            ) : (
              <span className="text-xs text-white/40">Neaktivní</span>
            )}
          </div>
        </div>
      </div>

      {/* Staff assignments */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">Lékař</p>
          <StaffBadge staff={room.doctor} role="doctor" color={C.violet} />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">Anesteziolog</p>
          <StaffBadge staff={room.anesthesiologist} role="doctor" color={C.orange} />
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">Sestra</p>
          <StaffBadge staff={room.nurse} role="nurse" color={C.green} />
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#FBBF24]" />
            <p className="text-[10px] font-bold text-[#FBBF24] tracking-[0.4em] uppercase">REAL-TIME DATA</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
            PŘEHLED <span className="text-white/20">PERSONÁLU</span>
          </h1>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-blue-400">{stats.activeRooms}</span>
            <span className="text-xs text-blue-400/60">aktivních sálů</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
            <Building2 className="w-4 h-4 text-white/50" />
            <span className="text-sm font-bold text-white">{stats.totalRooms}</span>
            <span className="text-xs text-white/40">celkem sálů</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Stethoscope className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{stats.freeDoctors}</span>
            <span className="text-xs text-emerald-400/60">volných lékařů</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Heart className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{stats.freeNurses}</span>
            <span className="text-xs text-emerald-400/60">volných sester</span>
          </div>
        </div>
      </header>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rooms with Staff */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-white/50" />
              <h2 className="text-lg font-bold text-white">Přiřazení personálu k sálům</h2>
            </div>
            
            <div className="space-y-3">
              {rooms.map(room => (
                <RoomRow key={room.id} room={room} />
              ))}
            </div>
          </div>

          {/* Free Staff */}
          {(freeStaff.doctors.length > 0 || freeStaff.nurses.length > 0) && (
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Volný personál</h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Free Doctors */}
                {freeStaff.doctors.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold flex items-center gap-2">
                      <Stethoscope className="w-3.5 h-3.5 text-violet-400" />
                      Lékaři ({freeStaff.doctors.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {freeStaff.doctors.map(doc => (
                        <div 
                          key={doc.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-white">{doc.name}</span>
                          {doc.is_external && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-semibold">EXT</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free Nurses */}
                {freeStaff.nurses.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-green-400" />
                      Sestry ({freeStaff.nurses.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {freeStaff.nurses.map(nurse => (
                        <div 
                          key={nurse.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-white">{nurse.name}</span>
                          {nurse.is_external && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-semibold">EXT</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffOverviewModule;
