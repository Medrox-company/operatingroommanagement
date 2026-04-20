import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Stethoscope, Heart, Check, UserX, ShieldPlus, Star, MapPin, Percent, AlertTriangle, Ban, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SkillLevel, OperatingRoom } from '../types';

export type StaffRole = 'DOCTOR' | 'NURSE';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  skill_level?: SkillLevel;
  availability?: number;
  is_external?: boolean;
  is_recommended?: boolean;
  is_active: boolean;
  sick_leave_days?: number;
  vacation_days?: number;
}

interface StaffPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (staffId: string, staffName: string) => void;
  onUnassign?: () => void;
  currentStaffId?: string | null;
  currentStaffName?: string | null;
  filterRole?: StaffRole;
  title?: string;
  allRooms?: OperatingRoom[];
  currentRoomId?: string;
}

// Skill level metadata
const SKILL_LEVELS: Record<SkillLevel, { label: string; color: string; bgColor: string }> = {
  'L3': { label: 'L3', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
  'L2': { label: 'L2', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/30' },
  'L1': { label: 'L1', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30' },
  'A': { label: 'Abs.', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
  'SR': { label: 'SR', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30' },
  'N': { label: 'Nov.', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30' },
  'S': { label: 'Stáž', color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30' },
};

function RoleIcon({ role, size = 'md' }: { role: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  if (role === 'DOCTOR') return <Stethoscope className={`${sz} text-violet-400`} />;
  return <Heart className={`${sz} text-emerald-400`} />;
}

export default function StaffPickerModal({
  isOpen,
  onClose,
  onSelect,
  onUnassign,
  currentStaffId,
  currentStaffName,
  filterRole,
  title = 'Vybrat personál',
  allRooms = [],
  currentRoomId,
}: StaffPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper: Check if staff member is on sick leave or vacation
  const getLeaveStatus = (member: StaffMember): { isOnLeave: boolean; reason: string } => {
    if (member.sick_leave_days && member.sick_leave_days > 0) {
      return { isOnLeave: true, reason: `PN (${member.sick_leave_days} dní)` };
    }
    if (member.vacation_days && member.vacation_days > 0) {
      return { isOnLeave: true, reason: `Dovolená (${member.vacation_days} dní)` };
    }
    return { isOnLeave: false, reason: '' };
  };

  // Helper: Check if staff member is already assigned to another room
  const getAssignedRoom = (memberId: string): { isAssigned: boolean; roomName: string } => {
    if (!allRooms || allRooms.length === 0) return { isAssigned: false, roomName: '' };
    for (const room of allRooms) {
      if (room.id === currentRoomId) continue;
      if (room.staff?.doctor?.id === memberId ||
          room.staff?.nurse?.id === memberId ||
          room.staff?.anesthesiologist?.id === memberId) {
        return { isAssigned: true, roomName: room.name };
      }
    }
    return { isAssigned: false, roomName: '' };
  };

  // Fetch staff when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    setConfirmUnassign(false);
    setLoading(true);

    async function fetchStaff() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setStaff(data || []);
      } catch (err) {
        console.error('[StaffPickerModal] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Free staff — not assigned to any room, not on leave
  const freeStaff = useMemo(() => {
    return staff.filter((m) => {
      if (filterRole && m.role !== filterRole) return false;
      if (m.id === currentStaffId) return false; // skip current
      const leaveStatus = getLeaveStatus(m);
      if (leaveStatus.isOnLeave) return false;
      const assigned = getAssignedRoom(m.id);
      if (assigned.isAssigned) return false;
      return true;
    });
  }, [staff, filterRole, currentStaffId, allRooms]);

  // Searched staff — triggered only when query is typed
  const searchedStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return staff
      .filter((m) => {
        if (filterRole && m.role !== filterRole) return false;
        const text = [m.name, m.role === 'DOCTOR' ? 'Lékař MUDr.' : 'Sestra'].join(' ').toLowerCase();
        return text.includes(q);
      })
      .slice(0, 8);
  }, [staff, searchQuery, filterRole]);

  const displayStaff = searchQuery.trim() ? searchedStaff : freeStaff;

  const handleSelect = (member: StaffMember) => {
    const leaveStatus = getLeaveStatus(member);
    const assignedRoom = getAssignedRoom(member.id);
    if (leaveStatus.isOnLeave || assignedRoom.isAssigned) return;
    onSelect(member.id, member.name);
    onClose();
  };

  const handleUnassign = () => {
    if (!confirmUnassign) {
      setConfirmUnassign(true);
      return;
    }
    onUnassign?.();
    onClose();
  };

  const accentColor = filterRole === 'DOCTOR'
    ? { text: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/25', glow: 'rgba(167,139,250,0.6)' }
    : { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25', glow: 'rgba(52,211,153,0.6)' };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop - exact same as RoomDetail */}
        <motion.div
          className="absolute inset-0 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            background: 'radial-gradient(120% 80% at 50% 0%, #13302a 0%, #0c1f1a 45%, #081512 100%)',
          }}
        />

        {/* Ambient glow — same as RoomDetail */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-25"
            style={{ background: 'radial-gradient(circle, #4FEDC7 0%, transparent 65%)' }}
          />
        </div>

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-2xl flex flex-col rounded-[2rem] overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(10, 10, 18, 0.92)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '80vh',
          }}
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        >
          {/* Top glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor.glow}, transparent)` }}
          />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {filterRole && (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accentColor.bg} border ${accentColor.border}`}>
                    <RoleIcon role={filterRole} size="sm" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {loading ? 'Načítání...' : `${freeStaff.length} volných · kliknutím vyberte`}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/5 border border-white/8 hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>

            {/* Currently assigned — unassign button */}
            {currentStaffName && onUnassign && (
              <motion.div
                className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{
                  background: confirmUnassign ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.03)',
                  borderColor: confirmUnassign ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.08)',
                }}
                layout
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accentColor.bg} border ${accentColor.border}`}>
                  <RoleIcon role={filterRole || 'DOCTOR'} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/35 uppercase tracking-wide">Aktuálně přiřazen/a</p>
                  <p className="text-sm font-semibold text-white/90 truncate">{currentStaffName}</p>
                </div>
                <button
                  onClick={handleUnassign}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide transition-all flex-shrink-0 ${
                    confirmUnassign
                      ? 'bg-red-500 text-white border border-red-400 hover:bg-red-600'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                  }`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {confirmUnassign ? 'Potvrdit' : 'Odhlásit'}
                </button>
              </motion.div>
            )}

            {/* Search input */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-white/25" />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="Hledat podle jména..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setConfirmUnassign(false); }}
                className="w-full pl-11 pr-10 py-3.5 bg-transparent text-white placeholder-white/25 focus:outline-none text-sm"
                style={{ caretColor: '#a78bfa' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  <X className="w-4 h-4 text-white/30 hover:text-white/60 transition-colors" />
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-6 h-px bg-white/5 flex-shrink-0" />

          {/* Section label */}
          <div className="px-6 pt-3 pb-1 flex-shrink-0">
            <p className="text-[10px] text-white/25 uppercase tracking-widest">
              {searchQuery.trim() ? `Výsledky hledání (${searchedStaff.length})` : `Volný personál (${freeStaff.length})`}
            </p>
          </div>

          {/* Staff list */}
          <div className="flex-1 overflow-y-auto px-4 pb-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#00D8C1] animate-spin" />
              </div>
            ) : displayStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <UserX className="w-10 h-10 text-white/10" />
                <p className="text-sm text-white/30">
                  {searchQuery.trim() ? `Žádné výsledky pro "${searchQuery}"` : 'Žádný volný personál'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {displayStaff.map((member) => {
                  const isSelected = member.id === currentStaffId;
                  const skillLevel = member.skill_level as SkillLevel | undefined;
                  const skillMeta = skillLevel ? SKILL_LEVELS[skillLevel] : null;
                  const leaveStatus = getLeaveStatus(member);
                  const assignedRoom = getAssignedRoom(member.id);
                  const isUnavailable = leaveStatus.isOnLeave || assignedRoom.isAssigned;

                  let unavailableReason = '';
                  if (leaveStatus.isOnLeave) unavailableReason = leaveStatus.reason;
                  else if (assignedRoom.isAssigned) unavailableReason = `Sal: ${assignedRoom.roomName}`;

                  return (
                    <motion.button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      disabled={isUnavailable}
                      className={`flex flex-col items-start gap-2 px-3.5 py-3 rounded-2xl transition-all text-left ${
                        isUnavailable ? 'opacity-45 cursor-not-allowed' : 'hover:bg-white/[0.04]'
                      }`}
                      style={{
                        background: isUnavailable
                          ? 'rgba(239,68,68,0.04)'
                          : isSelected
                          ? 'rgba(0,216,193,0.08)'
                          : 'rgba(255,255,255,0.025)',
                        border: isUnavailable
                          ? '1px solid rgba(239,68,68,0.15)'
                          : isSelected
                          ? '1px solid rgba(0,216,193,0.30)'
                          : '1px solid rgba(255,255,255,0.06)',
                      }}
                      whileHover={isUnavailable ? {} : { scale: 1.01 }}
                      whileTap={isUnavailable ? {} : { scale: 0.985 }}
                    >
                      {/* Unavailable banner */}
                      {isUnavailable && (
                        <div className="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg bg-red-500/8 border border-red-500/15">
                          <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                          <span className="text-[9px] text-red-300 truncate">{unavailableReason}</span>
                        </div>
                      )}

                      {/* Name row */}
                      <div className="flex items-center gap-2 w-full">
                        {skillMeta && (
                          <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-black text-[9px] border ${skillMeta.bgColor} ${skillMeta.color}`}>
                            {skillMeta.label}
                          </div>
                        )}
                        <span className={`text-sm font-semibold truncate flex-1 ${
                          isUnavailable ? 'text-white/35 line-through' :
                          isSelected ? 'text-[#00D8C1]' : 'text-white/90'
                        }`}>
                          {member.name}
                        </span>
                        {member.is_recommended && !isUnavailable && <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                        {isSelected && <Check className="w-4 h-4 text-[#00D8C1] flex-shrink-0" />}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          member.role === 'DOCTOR'
                            ? 'bg-violet-500/15 text-violet-300 border-violet-500/25'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        }`}>
                          {member.role === 'DOCTOR' ? 'MUDr.' : 'Sestra'}
                        </span>
                        {member.availability !== undefined && member.availability < 100 && !isUnavailable && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
                            member.availability >= 50
                              ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25'
                              : 'bg-red-500/15 text-red-300 border-red-500/25'
                          }`}>
                            <Percent className="w-2.5 h-2.5" />
                            {member.availability}%
                          </span>
                        )}
                        {member.is_external && !isUnavailable && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/15 text-orange-300 border-orange-500/25 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            Ext.
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 flex items-center justify-between flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[11px] text-white/20 tracking-widest uppercase">
              {searchQuery.trim() ? 'Všichni · volní i obsazení' : 'Pouze volný personál'}
            </p>
            <button
              onClick={onClose}
              className="text-[11px] font-semibold text-white/25 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              Zavřít
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
