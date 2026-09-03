import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Search, X, Stethoscope, Heart, Check, UserX, Star, MapPin, Percent, AlertTriangle, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SkillLevel, OperatingRoom } from '../types';
import { useHospital } from '../contexts/HospitalContext';

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

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
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
  const { activeHospitalId } = useHospital();
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

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
          .eq('hospital_id', activeHospitalId || 'default')
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
  }, [isOpen, activeHospitalId]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
    onUnassign?.();
    onClose();
  };

  const accentColor = filterRole === 'DOCTOR'
    ? { bg: 'bg-violet-500/12', border: 'border-violet-400/20', avatar: 'staff-picker-avatar-doctor', label: 'Lékař' }
    : { bg: 'bg-emerald-500/12', border: 'border-emerald-400/20', avatar: 'staff-picker-avatar-nurse', label: 'Sestra' };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="staff-picker-overlay fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="staff-picker-backdrop absolute inset-0"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-picker-title"
          className="staff-picker-dialog relative flex max-h-[min(84vh,780px)] w-full max-w-4xl flex-col overflow-hidden rounded-xl"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.985, y: 12 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
        >
          <header className="staff-picker-header flex flex-shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              {filterRole && (
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${accentColor.bg} ${accentColor.border}`}>
                  <RoleIcon role={filterRole} />
                </div>
              )}
              <div className="min-w-0">
                <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65">Personální obsazení sálu</p>
                <h2 id="staff-picker-title" className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Zavřít výběr personálu"
              className="staff-picker-icon-button flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            >
              <X className="h-4 w-4 text-white/65" />
            </button>
          </header>

          <div className="staff-picker-current-bar flex flex-shrink-0 items-center gap-3 px-4 py-3 sm:px-5">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${accentColor.avatar}`}>
              {currentStaffName ? getInitials(currentStaffName) : <UserX className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38">Aktuální obsazení · {accentColor.label}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-white/90">{currentStaffName || 'Nepřiřazeno'}</p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xl font-light tabular-nums text-white/85">{loading ? '—' : freeStaff.length}</span>
              <span className="max-w-14 text-[8px] uppercase leading-tight tracking-[0.12em] text-white/35">osob k dispozici</span>
            </div>
            {currentStaffName && onUnassign && (
              <button
                onClick={handleUnassign}
                className="ml-1 flex flex-shrink-0 items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/[0.07] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-red-300/80 transition-colors hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Odhlásit ze sálu</span>
                <span className="sm:hidden">Odhlásit</span>
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <section className="flex min-h-0 flex-1 flex-col">
              <div className="p-3 pb-0 sm:px-4 sm:pt-4">
                <div className="staff-picker-search relative overflow-hidden rounded-lg">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="h-4 w-4 text-white/30" />
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Hledat podle jména…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent py-3 pl-11 pr-10 text-sm text-white caret-cyan-300 placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/35"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} aria-label="Vymazat hledání" className="absolute inset-y-0 right-0 flex items-center px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/50">
                      <X className="h-4 w-4 text-white/40 transition-colors hover:text-white/70" />
                    </button>
                  )}
                </div>
              </div>

          {/* Section label */}
          <div className="flex flex-shrink-0 items-center justify-between px-4 pb-2 pt-3 sm:px-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">
              {searchQuery.trim() ? `Výsledky hledání (${searchedStaff.length})` : `Volný personál (${freeStaff.length})`}
            </p>
            <p className="hidden text-[10px] text-white/30 sm:block">Výběrem osobu přiřadíte k sálu</p>
          </div>

          {/* Staff list */}
          <div className="staff-picker-list flex-1 overflow-y-auto px-3 pb-3 sm:px-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#FBBF24] animate-spin" />
              </div>
            ) : displayStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <UserX className="w-10 h-10 text-white/10" />
                <p className="text-sm text-white/30">
                  {searchQuery.trim() ? `Žádné výsledky pro "${searchQuery}"` : 'Žádný volný personál'}
                </p>
              </div>
            ) : (
              <div className="staff-picker-grid grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2">
                {displayStaff.map((member) => {
                  const isSelected = member.id === currentStaffId;
                  const skillLevel = member.skill_level as SkillLevel | undefined;
                  const skillMeta = skillLevel ? SKILL_LEVELS[skillLevel] : null;
                  const leaveStatus = getLeaveStatus(member);
                  const assignedRoom = getAssignedRoom(member.id);
                  const isUnavailable = leaveStatus.isOnLeave || assignedRoom.isAssigned;

                  let unavailableReason = '';
                  if (leaveStatus.isOnLeave) unavailableReason = leaveStatus.reason;
                  else if (assignedRoom.isAssigned) unavailableReason = `Sál: ${assignedRoom.roomName}`;

                  return (
                    <motion.button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      disabled={isUnavailable}
                      className={`staff-picker-person grid min-h-[78px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/60 ${
                        isUnavailable ? 'cursor-not-allowed opacity-45' : ''
                      }`}
                      style={{
                        background: isUnavailable
                          ? 'rgba(239,68,68,0.045)'
                          : isSelected
                          ? 'rgba(34,211,238,0.09)'
                          : 'rgba(12,19,37,0.82)',
                      }}
                    >
                      <div className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${member.role === 'DOCTOR' ? 'staff-picker-avatar-doctor' : 'staff-picker-avatar-nurse'}`}>
                        {getInitials(member.name)}
                        {skillMeta && (
                          <span className={`absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-[4px] border px-0.5 text-[7px] font-bold ${skillMeta.bgColor} ${skillMeta.color}`}>
                            {skillMeta.label}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`truncate text-sm font-semibold ${isUnavailable ? 'text-white/40' : isSelected ? 'text-cyan-200' : 'text-white/90'}`}>
                            {member.name}
                          </span>
                          {member.is_recommended && !isUnavailable && <Star className="h-3 w-3 flex-shrink-0 fill-amber-300/20 text-amber-300" />}
                        </div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-white/38">
                          <span>{member.role === 'DOCTOR' ? 'Anesteziologický lékař' : 'Sálová sestra'}</span>
                          {member.is_external && !isUnavailable && (
                            <span className="flex items-center gap-1 text-orange-300/75"><MapPin className="h-2.5 w-2.5" />Externí</span>
                          )}
                          {member.availability !== undefined && member.availability < 100 && !isUnavailable && (
                            <span className="flex items-center gap-1 text-amber-200/70"><Percent className="h-2.5 w-2.5" />{member.availability}%</span>
                          )}
                        </div>
                        {isUnavailable && (
                          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[9px] text-red-300/80">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{unavailableReason}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-7 items-center justify-end">
                        {isSelected ? (
                          <span className="staff-picker-selected flex h-7 w-7 items-center justify-center rounded-md">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
            </section>
          </div>

          {/* Footer */}
          <div className="staff-picker-footer flex flex-shrink-0 items-center justify-between border-t border-white/[0.07] px-4 py-3 sm:px-5">
            <p className="text-[9px] uppercase tracking-[0.16em] text-white/30">
              {searchQuery.trim() ? 'Všichni · volní i obsazení' : 'Pouze volný personál'}
            </p>
            <button
              onClick={onClose}
              className="rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            >
              Zavřít
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
