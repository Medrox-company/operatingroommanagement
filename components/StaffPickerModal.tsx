import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Stethoscope, Heart, Check, UserX, ShieldPlus, Star, MapPin, Percent } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SkillLevel } from '../types';

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
}

interface StaffPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (staffId: string, staffName: string) => void;
  currentStaffId?: string | null;
  filterRole?: StaffRole;
  title?: string;
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
        if (filterRole && m.role !== filterRole) return false;
        const searchableText = [
          m.name,
          m.role === 'DOCTOR' ? 'Lékař MUDr.' : 'Sestra',
          m.role,
        ].join(' ').toLowerCase();
        return searchableText.includes(q);
      })
      .slice(0, 6);
  }, [staff, searchQuery, filterRole]);

  // Split counts for header chips
  const doctorCount = useMemo(
    () => staff.filter((s) => s.role === 'DOCTOR').length,
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
  const headerAccent = filterRole === 'DOCTOR' 
    ? { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' }
    : filterRole === 'NURSE'
    ? { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' }
    : { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)' };

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
              background: `linear-gradient(90deg, transparent, ${
                filterRole === 'DOCTOR' ? 'rgba(167,139,250,0.6)' :
                filterRole === 'NURSE' ? 'rgba(52,211,153,0.6)' :
                'rgba(0,216,193,0.6)'
              }, transparent)`,
            }}
          />

          {/* ── Header ─────────────────────────────── */}
          <div className="px-7 pt-7 pb-5">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  {filterRole && (
                    <div className={`p-1.5 rounded-lg ${filterRole === 'DOCTOR' ? 'bg-violet-500/15' : 'bg-emerald-500/15'}`}>
                      <RoleIcon role={filterRole} size="sm" />
                    </div>
                  )}
                  <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
                </div>
                {/* Count chips */}
                <div className="flex gap-2">
                  {(!filterRole || filterRole === 'DOCTOR') && (
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
                  const skillLevel = member.skill_level as SkillLevel | undefined;
                  const skillMeta = skillLevel ? SKILL_LEVELS[skillLevel] : null;

                  return (
                    <motion.button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      className="flex flex-col items-start gap-2 px-4 py-3.5 rounded-2xl transition-all group text-left"
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
                      {/* Top row: Icon + Name + Selected */}
                      <div className="flex items-center gap-2 w-full">
                        {/* Skill Level Badge */}
                        {skillMeta && (
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] border ${skillMeta.bgColor} ${skillMeta.color}`}>
                            {skillMeta.label}
                          </div>
                        )}
                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-[#00D8C1]' : 'text-white'}`}>
                          {member.name}
                        </span>
                        {member.is_recommended && <Star className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#00D8C1] flex-shrink-0 ml-auto" />
                        )}
                      </div>

                      {/* Metadata badges */}
                      <div className="flex items-center gap-1.5 flex-wrap w-full">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
                          member.role === 'DOCTOR' 
                            ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {member.role === 'DOCTOR' ? 'MUDr.' : 'Sestra'}
                        </span>
                        
                        {member.availability !== undefined && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
                            member.availability === 100 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                            member.availability >= 50 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                            'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}>
                            <Percent className="w-2.5 h-2.5" />
                            {member.availability}%
                          </span>
                        )}
                        
                        {member.is_external && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-orange-500/20 text-orange-300 border-orange-500/30 flex items-center gap-0.5">
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
