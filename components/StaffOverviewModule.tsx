import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Shield, Activity, 
  Clock, CheckCircle2, Loader2,
  Building2, UserCheck, Coffee
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchAllStaff, StaffRow } from '../lib/db';

// Types
interface StaffMember {
  id: string;
  name: string;
  role: 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';
  skill_level?: string;
  is_active: boolean;
  is_external?: boolean;
  assignedRoom?: {
    id: string;
    name: string;
    department?: string;
    currentStepIndex?: number;
    isActive: boolean;
  } | null;
}

interface RoomData {
  id: string;
  name: string;
  department: string | null;
  current_step_index: number | null;
  doctor_id: string | null;
  nurse_id: string | null;
  anesthesiologist_id: string | null;
  is_locked: boolean | null;
  is_paused: boolean | null;
}

// Design tokens
const C = {
  accent: '#FBBF24',
  green: '#10B981',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  red: '#EF4444',
  orange: '#F97316',
  border: 'rgba(255,255,255,0.07)',
  surface: 'rgba(255,255,255,0.025)',
  muted: 'rgba(255,255,255,0.35)',
  glass: 'rgba(255,255,255,0.03)',
};

const StaffOverviewModule: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch staff and rooms data
  const fetchData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // Fetch staff using existing function
      const staffData = await fetchAllStaff();
      
      // Fetch rooms with staff assignments
      const { data: roomsData, error: roomsError } = await supabase
        .from('operating_rooms')
        .select('id, name, department, current_step_index, doctor_id, nurse_id, anesthesiologist_id, is_locked, is_paused')
        .order('sort_order', { ascending: true });

      if (roomsError) throw roomsError;

      setStaffList(staffData || []);
      setRooms(roomsData || []);
    } catch (err) {
      console.error('[StaffOverview] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up realtime subscription
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('staff-overview-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operating_rooms' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Build staff members with room assignments
  const staffMembers = useMemo((): StaffMember[] => {
    return staffList
      .filter(s => s.is_active)
      .map(staff => {
        // Find room where this staff member is assigned
        let assignedRoom: StaffMember['assignedRoom'] = null;
        
        for (const room of rooms) {
          const isDoctor = room.doctor_id === staff.id;
          const isNurse = room.nurse_id === staff.id;
          const isAnesthesiologist = room.anesthesiologist_id === staff.id;
          
          if (isDoctor || isNurse || isAnesthesiologist) {
            // Check if room is active (has operation in progress)
            const isActiveRoom = room.current_step_index !== null && 
                                 room.current_step_index >= 0 && 
                                 room.current_step_index < 6 &&
                                 !room.is_locked;
            
            assignedRoom = {
              id: room.id,
              name: room.name,
              department: room.department || undefined,
              currentStepIndex: room.current_step_index || undefined,
              isActive: isActiveRoom
            };
            break;
          }
        }

        return {
          id: staff.id,
          name: staff.name,
          role: staff.role as 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST',
          skill_level: staff.skill_level || undefined,
          is_active: staff.is_active,
          is_external: staff.is_external || false,
          assignedRoom
        };
      });
  }, [staffList, rooms]);

  // Separate staff by role
  const doctors = useMemo(() => 
    staffMembers.filter(s => s.role === 'DOCTOR' || s.role === 'ANESTHESIOLOGIST'), 
    [staffMembers]
  );
  const nurses = useMemo(() => 
    staffMembers.filter(s => s.role === 'NURSE'), 
    [staffMembers]
  );

  // Get status info
  const getStatusInfo = (member: StaffMember) => {
    if (member.assignedRoom) {
      return { 
        label: member.assignedRoom.name, 
        color: member.assignedRoom.isActive ? C.blue : C.orange,
        bgColor: member.assignedRoom.isActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)',
        icon: Building2,
        isWorking: member.assignedRoom.isActive
      };
    }
    
    return { 
      label: 'Volný', 
      color: C.green, 
      bgColor: 'rgba(16, 185, 129, 0.15)',
      icon: CheckCircle2,
      isWorking: false
    };
  };

  // Stats
  const stats = useMemo(() => ({
    workingDoctors: doctors.filter(d => d.assignedRoom?.isActive).length,
    availableDoctors: doctors.filter(d => !d.assignedRoom).length,
    assignedDoctors: doctors.filter(d => d.assignedRoom && !d.assignedRoom.isActive).length,
    workingNurses: nurses.filter(n => n.assignedRoom?.isActive).length,
    availableNurses: nurses.filter(n => !n.assignedRoom).length,
    assignedNurses: nurses.filter(n => n.assignedRoom && !n.assignedRoom.isActive).length,
  }), [doctors, nurses]);

  // Staff card component
  const StaffCard = ({ member, roleColor }: { member: StaffMember; roleColor: string }) => {
    const status = getStatusInfo(member);
    const StatusIcon = status.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:bg-white/[0.03]"
        style={{ 
          background: status.isWorking ? status.bgColor : C.glass,
          border: `1px solid ${status.isWorking ? status.color + '30' : C.border}`,
        }}
      >
        {/* Avatar/Icon */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: roleColor + '20' }}
        >
          {member.role === 'DOCTOR' || member.role === 'ANESTHESIOLOGIST' ? (
            <Stethoscope className="w-5 h-5" style={{ color: roleColor }} />
          ) : (
            <Heart className="w-5 h-5" style={{ color: roleColor }} />
          )}
        </div>

        {/* Name */}
        <p className="text-xs font-semibold text-white text-center leading-tight w-full truncate" title={member.name}>
          {member.name}
        </p>
        
        {/* External badge */}
        {member.is_external && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
            EXTERNÍ
          </span>
        )}
        
        {/* Status/Room */}
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg w-full justify-center"
          style={{ background: status.color + '15' }}
        >
          <StatusIcon className="w-3 h-3 flex-shrink-0" style={{ color: status.color }} />
          <span className="text-[10px] font-medium truncate" style={{ color: status.color }} title={status.label}>
            {status.label}
          </span>
        </div>

        {/* Working indicator */}
        {status.isWorking && (
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 animate-pulse" style={{ color: status.color }} />
            <span className="text-[9px] text-white/40">Pracuje</span>
          </div>
        )}
      </motion.div>
    );
  };

  // Section component
  const StaffSection = ({ 
    title, 
    icon: Icon, 
    iconColor, 
    members, 
    workingCount, 
    availableCount,
    assignedCount 
  }: { 
    title: string;
    icon: React.ElementType;
    iconColor: string;
    members: StaffMember[];
    workingCount: number;
    availableCount: number;
    assignedCount: number;
  }) => (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: iconColor + '15' }}
          >
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-xs text-white/40">{members.length} celkem</p>
          </div>
        </div>

        {/* Mini stats */}
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20" title="Aktivně operuje">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm font-bold text-blue-400">{workingCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20" title="Přiřazen na sál">
            <Building2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{assignedCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20" title="Volný">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{availableCount}</span>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 w-full">
        {members.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-10 text-white/30">
            <Users className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Žádný personál</p>
          </div>
        ) : (
          members
            .sort((a, b) => {
              // Sort: working first, then assigned, then available
              const aScore = a.assignedRoom?.isActive ? 0 : a.assignedRoom ? 1 : 2;
              const bScore = b.assignedRoom?.isActive ? 0 : b.assignedRoom ? 1 : 2;
              if (aScore !== bScore) return aScore - bScore;
              return a.name.localeCompare(b.name);
            })
            .map(member => (
              <StaffCard key={member.id} member={member} roleColor={iconColor} />
            ))
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#FBBF24]" />
            <p className="text-[10px] font-bold text-[#FBBF24] tracking-[0.4em] uppercase">STAFF OVERVIEW</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
            PŘEHLED <span className="text-white/20">PERSONÁLU</span>
          </h1>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-2 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-x-auto">
          {[
            { label: 'LÉKAŘI OPERUJÍ', value: stats.workingDoctors, icon: Activity, color: 'text-blue-400' },
            { label: 'LÉKAŘI PŘIŘAZENI', value: stats.assignedDoctors, icon: Building2, color: 'text-orange-400' },
            { label: 'LÉKAŘI VOLNÍ', value: stats.availableDoctors, icon: UserCheck, color: 'text-emerald-400' },
            { label: 'SESTRY OPERUJÍ', value: stats.workingNurses, icon: Activity, color: 'text-blue-400' },
            { label: 'SESTRY PŘIŘAZENY', value: stats.assignedNurses, icon: Building2, color: 'text-orange-400' },
            { label: 'SESTRY VOLNÉ', value: stats.availableNurses, icon: UserCheck, color: 'text-emerald-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-4 md:px-6 py-3 rounded-2xl hover:bg-white/5 transition-all min-w-[100px]">
              <div className="flex items-center gap-1.5 mb-1.5 opacity-50">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <p className="text-[7px] font-bold uppercase tracking-[0.1em] whitespace-nowrap">{stat.label}</p>
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : (
        /* Full Width Sections */
        <div className="flex flex-col gap-8 w-full">
          {/* Doctors Section */}
          <StaffSection
            title="Lékaři"
            icon={Stethoscope}
            iconColor="#8B5CF6"
            members={doctors}
            workingCount={stats.workingDoctors}
            availableCount={stats.availableDoctors}
            assignedCount={stats.assignedDoctors}
          />

          {/* Divider */}
          <div className="h-px bg-white/10" />

          {/* Nurses Section */}
          <StaffSection
            title="Sestry"
            icon={Heart}
            iconColor="#10B981"
            members={nurses}
            workingCount={stats.workingNurses}
            availableCount={stats.availableNurses}
            assignedCount={stats.assignedNurses}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="w-3 h-3 rounded-full bg-blue-500/50" />
          <span>Aktivně operuje</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="w-3 h-3 rounded-full bg-orange-500/50" />
          <span>Přiřazen na sál</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
          <span>Volný</span>
        </div>
      </div>
    </div>
  );
};

export default StaffOverviewModule;
