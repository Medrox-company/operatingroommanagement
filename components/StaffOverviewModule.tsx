import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Activity, 
  CheckCircle2, Loader2, Building2, UserCheck, Circle
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

  return (
    <div className="w-full min-h-full">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-400 tracking-[0.3em] uppercase">LIVE</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Přehled personálu
        </h1>
        <p className="text-white/40 mt-2 text-sm">
          Reálný přehled přiřazení personálu k operačním sálům
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/20 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-blue-300/70 uppercase tracking-wider">Aktivní sály</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{stats.activeRooms}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Celkem sálů</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalRooms}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white/60" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-300/70 uppercase tracking-wider">Volní lékaři</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{stats.freeDoctors}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-600/5 border border-pink-500/20 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-pink-300/70 uppercase tracking-wider">Volné sestry</p>
              <p className="text-3xl font-bold text-pink-400 mt-1">{stats.freeNurses}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-400" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
        </motion.div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Rooms Grid */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Operační sály</h2>
                <p className="text-xs text-white/40">Přiřazený personál ke každému sálu</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {rooms.map((room, index) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      relative overflow-hidden rounded-2xl p-5
                      ${room.isActive 
                        ? 'bg-gradient-to-br from-blue-500/15 to-blue-600/5 border-2 border-blue-500/30' 
                        : 'bg-white/[0.02] border border-white/[0.06]'}
                    `}
                  >
                    {/* Room Header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg
                          ${room.isActive 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-white/5 text-white/40'}
                        `}>
                          {room.name.replace(/[^0-9]/g, '') || '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{room.name}</h3>
                          {room.isActive ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              Probíhá operace
                            </span>
                          ) : room.is_locked ? (
                            <span className="text-xs text-amber-400">Uzamčeno</span>
                          ) : (
                            <span className="text-xs text-white/30">Volný</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Staff List */}
                    <div className="space-y-2.5">
                      {/* Doctor */}
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03]">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="w-4 h-4 text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Lékař</p>
                          {room.doctor ? (
                            <p className="text-sm font-semibold text-white truncate">{room.doctor.name}</p>
                          ) : (
                            <p className="text-sm text-white/25 italic">Nepřiřazeno</p>
                          )}
                        </div>
                        {room.doctor && (
                          <Circle className="w-2.5 h-2.5 text-violet-400 fill-violet-400" />
                        )}
                      </div>

                      {/* Anesthesiologist */}
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03]">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Anesteziolog</p>
                          {room.anesthesiologist ? (
                            <p className="text-sm font-semibold text-white truncate">{room.anesthesiologist.name}</p>
                          ) : (
                            <p className="text-sm text-white/25 italic">Nepřiřazeno</p>
                          )}
                        </div>
                        {room.anesthesiologist && (
                          <Circle className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                        )}
                      </div>

                      {/* Nurse */}
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03]">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                          <Heart className="w-4 h-4 text-pink-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Sestra</p>
                          {room.nurse ? (
                            <p className="text-sm font-semibold text-white truncate">{room.nurse.name}</p>
                          ) : (
                            <p className="text-sm text-white/25 italic">Nepřiřazeno</p>
                          )}
                        </div>
                        {room.nurse && (
                          <Circle className="w-2.5 h-2.5 text-pink-400 fill-pink-400" />
                        )}
                      </div>
                    </div>

                    {/* Active glow effect */}
                    {room.isActive && (
                      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          {/* Free Staff Section */}
          {(freeStaff.doctors.length > 0 || freeStaff.nurses.length > 0) && (
            <section className="pt-6 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Volný personál</h2>
                  <p className="text-xs text-white/40">Dostupný pro přiřazení</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Free Doctors */}
                {freeStaff.doctors.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Stethoscope className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-semibold text-white">Lékaři</span>
                      <span className="text-xs text-white/40 ml-auto">{freeStaff.doctors.length} dostupných</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {freeStaff.doctors.map(doc => (
                        <motion.div 
                          key={doc.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-white">{doc.name}</span>
                          {doc.is_external && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">EXT</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free Nurses */}
                {freeStaff.nurses.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-4 h-4 text-pink-400" />
                      <span className="text-sm font-semibold text-white">Sestry</span>
                      <span className="text-xs text-white/40 ml-auto">{freeStaff.nurses.length} dostupných</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {freeStaff.nurses.map(nurse => (
                        <motion.div 
                          key={nurse.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                        >
                          <UserCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-medium text-white">{nurse.name}</span>
                          {nurse.is_external && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold">EXT</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffOverviewModule;
