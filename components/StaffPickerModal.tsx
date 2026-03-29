import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Stethoscope, Heart, Check, UserX, Syringe, ShieldPlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type StaffRole = 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
}

interface StaffPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (staffId: string, staffName: string) => void;
  currentStaffId?: string | null;
  filterRole?: StaffRole;
  title?: string;
}

// Role metadata — label, color, icon, badge
const ROLE_META: Record<string, {
  label: string;
  badge: string;
  badgeClass: string;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
}> = {
  DOCTOR: {
    label: 'Chirurg / Lékař',
    badge: 'MUDr.',
    badgeClass: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    accentBorder: 'border-violet-500/50',
    accentBg: 'bg-violet-500/10',
    accentText: 'text-violet-300',
  },
  ANESTHESIOLOGIST: {
    label: 'Anesteziolog',
    badge: 'ARO',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    accentBorder: 'border-amber-500/50',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-300',
  },
  NURSE: {
    label: 'Sestra / Zdravotník',
    badge: 'Sestra',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    accentBorder: 'border-emerald-500/50',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-300',
  },
};

function RoleIcon({ role, size = 'md' }: { role: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  const meta = ROLE_META[role] || ROLE_META['NURSE'];
  if (role === 'DOCTOR') return <Stethoscope className={`${sz} ${meta.iconColor}`} />;
  if (role === 'ANESTHESIOLOGIST') return <Syringe className={`${sz} ${meta.iconColor}`} />;
  return <Heart className={`${sz} ${meta.iconColor}`} />;
}

export default function StaffPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentStaffId,
  filterRole,
  title = 'Vybrat personál',
}: StaffPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Filtered list — only show results when query is typed, max 6
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    return staff
      .filter((m) => {
        if (filterRole) {
          if (filterRole === 'DOCTOR') {
            if (m.role !== 'DOCTOR' && m.role !== 'ANESTHESIOLOGIST') return false;
          } else {
            if (m.role !== filterRole) return false;
          }
        }
        const meta = ROLE_META[m.role];
        const searchableText = [
          m.name,
          meta?.label ?? '',
          meta?.badge ?? '',
          m.role,
        ].join(' ').toLowerCase();
        return searchableText.includes(q);
      })
      .slice(0, 6);
  }, [staff, searchQuery, filterRole]);

  // Split counts for header chips
  const doctorCount = useMemo(
    () => staff.filter((s) => s.role === 'DOCTOR' || s.role === 'ANESTHESIOLOGIST').length,
    [staff]
  );
  const nurseCount = useMemo(
    () => staff.filter((s) => s.role === 'NURSE').length,
    [staff]
  );

  const handleSelect = (member: StaffMember) => {
    onSelect(member.id, member.name);
    onClose();
  };

  // Header accent by filterRole
  const headerMeta = filterRole ? ROLE_META[filterRole] : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Blurred backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal panel */}
        <motion.div
          className="relative w-full max-w-3xl flex flex-col rounded-[2rem] overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(10, 10, 18, 0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '85vh',
          }}
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        >
          {/* Top glow line */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
            style={{
              background: headerMeta
                ? `linear-gradient(90deg, transparent, ${
                    filterRole === 'DOCTOR' ? 'rgba(167,139,250,0.6)' :
                    filterRole === 'NURSE' ? 'rgba(52,211,153,0.6)' :
                    'rgba(251,191,36,0.6)'
                  }, transparent)`
                : 'linear-gradient(90deg, transparent, rgba(0,216,193,0.6), transparent)',
            }}
          />

          {/* ── Header ─────────────────────────────── */}
          <div className="px-7 pt-7 pb-5">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  {filterRole && (
                    <div className={`p-1.5 rounded-lg ${ROLE_META[filterRole]?.iconBg}`}>
                      <RoleIcon role={filterRole} size="sm" />
                    </div>
                  )}
                  <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
                </div>
                {/* Count chips */}
                <div className="flex gap-2">
                  {(!filterRole || filterRole === 'DOCTOR' || filterRole === 'ANESTHESIOLOGIST') && (
                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">
                      <Stethoscope className="w-3 h-3" />
                      {doctorCount} lékaři
                    </span>
                  )}
                  {(!filterRole || filterRole === 'NURSE') && (
                    <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                      <ShieldPlus className="w-3 h-3" />
                      {nurseCount} sestry
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <X className="w-5 h-5 text-white/50" />
              </button>
            </div>

            {/* ── Big search input - glassmorphism card style ────────────────── */}
            <div 
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(88,28,135,0.12) 50%, rgba(59,7,100,0.08) 100%)',
                border: '1px solid rgba(139,92,246,0.25)',
                boxShadow: '0 0 40px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Top glow accent line */}
              <div 
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.5) 50%, transparent 100%)',
                }}
              />
              
              {/* Search icon container */}
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <Search className="w-5 h-5 text-violet-400" />
                </div>
              </div>
              
              {/* Input field */}
              <input
                ref={inputRef}
                type="text"
                placeholder="Hledat podle jména nebo specializace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="relative w-full pl-24 pr-14 py-6 bg-transparent text-white placeholder-white/30 focus:outline-none text-base font-medium tracking-wide"
                style={{ caretColor: '#a78bfa' }}
              />
              
              {/* Clear button */}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center"
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <X className="w-4 h-4 text-white/40" />
                  </div>
                </button>
              )}
            </div>

            {/* Live count - only when searching */}
            {!loading && searchQuery.trim() && (
              <p className="mt-3 text-[11px] text-white/25 tracking-wider uppercase">
                {filteredStaff.length === 0
                  ? 'Žádné výsledky'
                  : `${filteredStaff.length} z max. 6 výsledků`}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="mx-7 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

          {/* ── Staff list ─────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 rounded-full border-2 border-white/10 border-t-[#00D8C1] animate-spin" />
              </div>
            ) : !searchQuery.trim() ? (
              /* Empty state — prompt to search */
              <div className="flex flex-col items-center justify-center py-14 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.18)' }}
                >
                  <Search className="w-7 h-7 text-violet-400/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white/40 mb-1">Začněte psát pro vyhledání</p>
                  <p className="text-[11px] text-white/20 tracking-wide">
                    Zobrazí se max. 6 nejbližších shod
                  </p>
                </div>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <UserX className="w-10 h-10 text-white/15" />
                <p className="text-sm text-white/30">
                  {`Žádný personál pro "${searchQuery}"`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredStaff.map((member) => {
                  const isSelected = member.id === currentStaffId;
                  const meta = ROLE_META[member.role] || ROLE_META['NURSE'];

                  return (
                    <motion.button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group text-left"
                      style={{
                        background: isSelected
                          ? 'rgba(0,216,193,0.08)'
                          : 'rgba(255,255,255,0.02)',
                        border: isSelected
                          ? '1px solid rgba(0,216,193,0.35)'
                          : '1px solid rgba(255,255,255,0.05)',
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.985 }}
                    >
                      {/* Icon avatar */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg}`}
                      >
                        <RoleIcon role={member.role} size="md" />
                      </div>

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-bold truncate ${isSelected ? 'text-[#00D8C1]' : 'text-white'}`}>
                            {member.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                            {meta.badge}
                          </span>
                          <span className="text-[10px] text-white/30 font-medium tracking-wide">
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      {/* Selected checkmark */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(0,216,193,0.15)', border: '1px solid rgba(0,216,193,0.4)' }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            <Check className="w-4 h-4 text-[#00D8C1]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Footer ───────────────���─────────────── */}
          <div
            className="px-7 py-4 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}
          >
            <p className="text-[11px] text-white/20 tracking-widest uppercase">
              Kliknutím vyberte personál
            </p>
            <button
              onClick={onClose}
              className="text-[11px] font-semibold text-white/30 hover:text-white/60 transition-colors tracking-wider uppercase"
            >
              Zavřít
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
