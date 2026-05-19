import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Shield, Activity, 
  MapPin, Clock, CheckCircle2, AlertCircle, Loader2,
  Building2, UserCheck, Coffee
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Types
interface StaffMember {
  id: string;
  name: string;
  role: 'DOCTOR' | 'NURSE';
  skill_level?: string;
  is_active: boolean;
  current_room_id?: string | null;
  status?: 'working' | 'available' | 'break' | 'off';
}

interface RoomInfo {
  id: string;
  name: string;
  department?: string;
  currentStepIndex?: number;
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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch staff and rooms data
  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConfigured || !supabase) {
        // Mock data for development
        setStaff([
          { id: '1', name: 'MUDr. Novák', role: 'DOCTOR', is_active: true, current_room_id: '1', status: 'working' },
          { id: '2', name: 'MUDr. Svoboda', role: 'DOCTOR', is_active: true, current_room_id: '2', status: 'working' },
          { id: '3', name: 'MUDr. Kučera', role: 'DOCTOR', is_active: true, current_room_id: null, status: 'available' },
          { id: '4', name: 'MUDr. Procházka', role: 'DOCTOR', is_active: true, current_room_id: null, status: 'break' },
          { id: '5', name: 'Bc. Veselá', role: 'NURSE', is_active: true, current_room_id: '1', status: 'working' },
          { id: '6', name: 'Bc. Malá', role: 'NURSE', is_active: true, current_room_id: '2', status: 'working' },
          { id: '7', name: 'Bc. Horáková', role: 'NURSE', is_active: true, current_room_id: null, status: 'available' },
          { id: '8', name: 'Bc. Králová', role: 'NURSE', is_active: true, current_room_id: '3', status: 'working' },
        ]);
        setRooms([
          { id: '1', name: 'Sál č. 1', department: 'TRA', currentStepIndex: 3 },
          { id: '2', name: 'Sál č. 2', department: 'CHIR', currentStepIndex: 4 },
          { id: '3', name: 'Sál č. 3', department: 'URO', currentStepIndex: 2 },
        ]);
        setLoading(false);
        return;
      }

      try {
        // Fetch staff
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('is_active', true);

        if (staffError) throw staffError;

        // Fetch rooms
        const { data: roomsData, error: roomsError } = await supabase
          .from('operating_rooms')
          .select('id, name, department, current_step_index');

        if (roomsError) throw roomsError;

        setStaff(staffData || []);
        setRooms(roomsData?.map(r => ({
          id: r.id,
          name: r.name,
          department: r.department,
          currentStepIndex: r.current_step_index
        })) || []);
      } catch (err) {
        console.error('[StaffOverview] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('staff-overview')
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

  // Separate staff by role
  const doctors = useMemo(() => staff.filter(s => s.role === 'DOCTOR'), [staff]);
  const nurses = useMemo(() => staff.filter(s => s.role === 'NURSE'), [staff]);

  // Get room name by ID
  const getRoomName = (roomId: string | null | undefined) => {
    if (!roomId) return null;
    return rooms.find(r => r.id === roomId)?.name || null;
  };

  // Get status info
  const getStatusInfo = (member: StaffMember) => {
    if (member.current_room_id) {
      const roomName = getRoomName(member.current_room_id);
      return { 
        label: roomName || 'Na sále', 
        color: C.blue, 
        bgColor: 'rgba(59, 130, 246, 0.15)',
        icon: Building2,
        isWorking: true
      };
    }
    
    switch (member.status) {
      case 'break':
        return { 
          label: 'Přestávka', 
          color: C.orange, 
          bgColor: 'rgba(249, 115, 22, 0.15)',
          icon: Coffee,
          isWorking: false
        };
      case 'off':
        return { 
          label: 'Mimo službu', 
          color: C.muted, 
          bgColor: 'rgba(255, 255, 255, 0.05)',
          icon: AlertCircle,
          isWorking: false
        };
      default:
        return { 
          label: 'Volný', 
          color: C.green, 
          bgColor: 'rgba(16, 185, 129, 0.15)',
          icon: CheckCircle2,
          isWorking: false
        };
    }
  };

  // Stats
  const stats = useMemo(() => ({
    workingDoctors: doctors.filter(d => d.current_room_id).length,
    availableDoctors: doctors.filter(d => !d.current_room_id && d.status !== 'break' && d.status !== 'off').length,
    workingNurses: nurses.filter(n => n.current_room_id).length,
    availableNurses: nurses.filter(n => !n.current_room_id && n.status !== 'break' && n.status !== 'off').length,
  }), [doctors, nurses]);

  // Staff card component
  const StaffCard = ({ member, roleColor }: { member: StaffMember; roleColor: string }) => {
    const status = getStatusInfo(member);
    const StatusIcon = status.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/[0.03]"
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
          {member.role === 'DOCTOR' ? (
            <Stethoscope className="w-5 h-5" style={{ color: roleColor }} />
          ) : (
            <Heart className="w-5 h-5" style={{ color: roleColor }} />
          )}
        </div>

        {/* Name and status */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{member.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
            <span className="text-xs" style={{ color: status.color }}>{status.label}</span>
          </div>
        </div>

        {/* Working indicator */}
        {status.isWorking && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: status.color + '20' }}>
            <Activity className="w-3 h-3 animate-pulse" style={{ color: status.color }} />
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
    availableCount 
  }: { 
    title: string;
    icon: React.ElementType;
    iconColor: string;
    members: StaffMember[];
    workingCount: number;
    availableCount: number;
  }) => (
    <div className="flex-1 min-w-[300px]">
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-sm font-bold text-blue-400">{workingCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{availableCount}</span>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-white/30">
            <Users className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">Žádný personál</p>
          </div>
        ) : (
          members.map(member => (
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
            { label: 'LÉKAŘI PRACUJÍ', value: stats.workingDoctors, icon: Stethoscope, color: 'text-blue-400' },
            { label: 'LÉKAŘI VOLNÍ', value: stats.availableDoctors, icon: UserCheck, color: 'text-emerald-400' },
            { label: 'SESTRY PRACUJÍ', value: stats.workingNurses, icon: Heart, color: 'text-blue-400' },
            { label: 'SESTRY VOLNÉ', value: stats.availableNurses, icon: UserCheck, color: 'text-emerald-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-6 md:px-8 py-4 rounded-2xl hover:bg-white/5 transition-all min-w-[120px]">
              <div className="flex items-center gap-2 mb-2 opacity-50">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] whitespace-nowrap">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
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
        /* Two Column Layout */
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Doctors Section */}
          <StaffSection
            title="Lékaři"
            icon={Stethoscope}
            iconColor="#8B5CF6"
            members={doctors}
            workingCount={stats.workingDoctors}
            availableCount={stats.availableDoctors}
          />

          {/* Divider */}
          <div className="hidden lg:block w-px bg-white/10" />
          <div className="lg:hidden h-px bg-white/10" />

          {/* Nurses Section */}
          <StaffSection
            title="Sestry"
            icon={Heart}
            iconColor="#10B981"
            members={nurses}
            workingCount={stats.workingNurses}
            availableCount={stats.availableNurses}
          />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="w-3 h-3 rounded-full bg-blue-500/50" />
          <span>Na sále</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
          <span>Volný</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className="w-3 h-3 rounded-full bg-orange-500/50" />
          <span>Přestávka</span>
        </div>
      </div>
    </div>
  );
};

export default StaffOverviewModule;
