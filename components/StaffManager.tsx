import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Trash2, X, Check,
  Shield, Activity, UserPlus, Loader2, Star, MapPin, Percent,
  UserRoundCheck, UserRoundX, SlidersHorizontal, CalendarDays
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SkillLevel } from '../types';
import { useConfirm } from '@/components/ui/ConfirmDialog';

// Types from database
interface StaffMember {
  id: string;
  name: string;
  role: 'DOCTOR' | 'NURSE';
  skill_level?: SkillLevel;
  availability?: number;
  is_external?: boolean;
  is_recommended?: boolean;
  is_active: boolean;
  sick_leave_days?: number;
  vacation_days?: number;
  notes?: string;
}

type StaffCategory = 'doctors' | 'nurses';

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

const SKILL_LEVEL_OPTIONS: SkillLevel[] = ['L3', 'L2', 'L1', 'A', 'SR', 'N', 'S'];

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const staffInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const StaffCard: React.FC<{
  member: StaffMember;
  onEdit: () => void;
  onToggleActive: () => void;
}> = ({ member, onEdit, onToggleActive }) => {
  const isDoctor = member.role === 'DOCTOR';
  const accent = isDoctor ? COLORS.cyan : COLORS.amber;
  const RoleIcon = isDoctor ? Stethoscope : Heart;
  const availability = Math.max(0, Math.min(100, member.availability ?? 100));
  const skillMeta = member.skill_level ? SKILL_LEVELS[member.skill_level] : null;
  const absenceDays = (member.sick_leave_days ?? 0) + (member.vacation_days ?? 0);

  return (
    <article
      className="relative min-h-[202px] overflow-hidden rounded-[22px] p-3 font-sans"
      style={{
        background: member.is_active
          ? `linear-gradient(125deg, ${accent}0a, rgba(255,255,255,0.018) 52%, rgba(251,191,36,0.018))`
          : 'rgba(255,255,255,0.016)',
        border: `1px solid ${member.is_active ? 'rgba(125,165,185,0.16)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}90, transparent)` }}
      />

      <div className="grid h-full grid-cols-[118px_minmax(0,1fr)] gap-3 sm:grid-cols-[142px_minmax(0,1fr)]">
        <div
          className="flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl px-3 py-3"
          style={{
            background: member.is_active
              ? `linear-gradient(145deg, ${accent}2e, ${accent}12)`
              : 'linear-gradient(145deg, rgba(148,163,184,0.11), rgba(148,163,184,0.04))',
            border: `1px solid ${member.is_active ? `${accent}52` : 'rgba(148,163,184,0.15)'}`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/35">
              {isDoctor ? 'Anesteziologie' : 'Sálová péče'}
            </span>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: member.is_active ? COLORS.green : 'rgba(255,255,255,0.22)' }}
            />
          </div>

          <div className="my-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
              style={{ color: accent, background: `${accent}16`, border: `1px solid ${accent}25` }}
            >
              {staffInitials(member.name)}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-white">{member.name}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-semibold" style={{ color: accent }}>
              <RoleIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{isDoctor ? 'Anesteziologický lékař' : 'Sálová sestra'}</span>
            </div>
          </div>

          <span className={`text-[9px] font-semibold ${member.is_active ? 'text-emerald-300/75' : 'text-white/28'}`}>
            {member.is_active ? 'Aktivní' : 'Neaktivní'}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2 py-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] px-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/[0.09] text-cyan-300">
              <Percent className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-medium text-white/32">Dostupnost</p>
                <p className="text-xs font-semibold tabular-nums text-white/72">{availability}%</p>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${availability}%`, background: availability >= 70 ? COLORS.green : availability >= 40 ? COLORS.amber : COLORS.red }} />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border border-amber-300/10 bg-amber-300/[0.03] px-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/[0.08] text-amber-300">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-medium text-white/32">Absence</p>
              <p className="truncate text-xs font-semibold text-white/72">
                {absenceDays > 0
                  ? `PN ${member.sick_leave_days ?? 0} · Dovolená ${member.vacation_days ?? 0}`
                  : 'Bez evidované absence'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              {skillMeta && (
                <span className={`rounded-md border px-1.5 py-1 text-[8px] font-bold ${skillMeta.bgColor} ${skillMeta.color}`}>
                  {skillMeta.label}
                </span>
              )}
              {member.is_recommended && <Star className="h-3 w-3 text-amber-300/80" />}
              {member.is_external && <MapPin className="h-3 w-3 text-orange-300/80" />}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleActive}
                className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[8px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  member.is_active
                    ? 'border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-200/65 hover:text-emerald-100'
                    : 'border-white/[0.08] bg-white/[0.025] text-white/38 hover:text-white'
                }`}
              >
                {member.is_active ? <UserRoundCheck className="h-3 w-3" /> : <UserRoundX className="h-3 w-3" />}
                {member.is_active ? 'Aktivní' : 'Zapnout'}
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="flex h-7 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white/48 transition-colors hover:border-cyan-300/25 hover:text-cyan-200"
              >
                <SlidersHorizontal className="h-3 w-3" />
                Upravit
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

// Detail Edit Modal Component - all fields are directly editable
function DetailEditModal({
  staff,
  onClose,
  onSave,
  onDelete,
  saving,
}: {
  staff: StaffMember;
  onClose: () => void;
  onSave: (updated: StaffMember) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = React.useState<StaffMember>({ ...staff });

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-detail-title"
      className="max-h-[92vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-[26px] p-4 font-sans sm:p-6"
      style={{
        background: 'linear-gradient(145deg, rgba(8,20,30,0.985), rgba(5,12,20,0.985))',
        border: '1px solid rgba(125,165,185,0.22)',
        boxShadow: '0 30px 90px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === 'DOCTOR' ? 'bg-violet-500/15' : 'bg-emerald-500/15'}`}>
            {formData.role === 'DOCTOR' ? <Stethoscope className="w-5 h-5 text-violet-400" /> : <Heart className="w-5 h-5 text-emerald-400" />}
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">Detail pracovníka</p>
            <h3 id="staff-detail-title" className="mt-1 text-lg font-bold text-white">{formData.name || 'Upravit personál'}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Name Field */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Jméno</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all"
          placeholder="Zadejte jméno..."
        />
      </div>

      {/* Role Selection */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Role</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {(['DOCTOR', 'NURSE'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFormData({ ...formData, role })}
              className={`py-3 px-4 rounded-xl border font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                formData.role === role
                  ? role === 'DOCTOR'
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.05]'
              }`}
            >
              {role === 'DOCTOR' ? <Stethoscope className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
              {role === 'DOCTOR' ? 'Anesteziologický lékař' : 'Sálová sestra'}
            </button>
          ))}
        </div>
      </div>

      {/* Skill Level */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Úroveň dovedností</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {SKILL_LEVEL_OPTIONS.map((level) => {
            const meta = SKILL_LEVELS[level];
            return (
              <button
                key={level}
                onClick={() => setFormData({ ...formData, skill_level: level })}
                className={`px-3 py-2 rounded-lg border font-bold text-xs transition-all ${
                  formData.skill_level === level
                    ? `${meta.bgColor} ${meta.color}`
                    : 'bg-white/[0.03] border-white/10 text-white/40 hover:bg-white/[0.05]'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Availability Slider */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider flex items-center justify-between">
          <span>Dostupnost</span>
          <span className={`text-sm font-bold ${
            (formData.availability ?? 100) === 100 ? 'text-emerald-400' :
            (formData.availability ?? 100) >= 50 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {formData.availability ?? 100}%
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={formData.availability ?? 100}
          onChange={(e) => setFormData({ ...formData, availability: parseInt(e.target.value) })}
          className="w-full mt-2 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FBBF24]"
        />
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Toggle Options */}
      <div className="grid grid-cols-2 gap-3">
        {/* External Toggle */}
        <button
          onClick={() => setFormData({ ...formData, is_external: !formData.is_external })}
          className={`p-4 rounded-xl border transition-all text-left ${
            formData.is_external
              ? 'bg-orange-500/15 border-orange-500/30'
              : 'bg-white/[0.03] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <MapPin className={`w-4 h-4 ${formData.is_external ? 'text-orange-400' : 'text-white/40'}`} />
            <span className={`text-sm font-semibold ${formData.is_external ? 'text-orange-300' : 'text-white/60'}`}>
              Externí
            </span>
          </div>
          <p className="text-[10px] text-white/30 mt-1">Zaměstnanec mimo organizaci</p>
        </button>

        {/* Recommended Toggle */}
        <button
          onClick={() => setFormData({ ...formData, is_recommended: !formData.is_recommended })}
          className={`p-4 rounded-xl border transition-all text-left ${
            formData.is_recommended
              ? 'bg-yellow-500/15 border-yellow-500/30'
              : 'bg-white/[0.03] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${formData.is_recommended ? 'text-yellow-400' : 'text-white/40'}`} />
            <span className={`text-sm font-semibold ${formData.is_recommended ? 'text-yellow-300' : 'text-white/60'}`}>
              Doporučený
            </span>
          </div>
          <p className="text-[10px] text-white/30 mt-1">Prioritně zobrazit při výběru</p>
        </button>
      </div>

      {/* Sick Leave and Vacation Days */}
      <div className="grid grid-cols-2 gap-3">
        {/* PN - Sick Leave Days */}
        <div>
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">PN (Dny)</label>
          <input
            type="number"
            min="0"
            value={formData.sick_leave_days ?? 0}
            onChange={(e) => setFormData({ ...formData, sick_leave_days: parseInt(e.target.value) || 0 })}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-red-500/50 transition-all text-center font-semibold"
            placeholder="0"
          />
          <p className="text-[10px] text-white/30 mt-1">Pracovní neschopnost</p>
        </div>

        {/* D - Vacation Days */}
        <div>
          <label className="text-xs text-white/40 font-bold uppercase tracking-wider">D (Dny)</label>
          <input
            type="number"
            min="0"
            value={formData.vacation_days ?? 0}
            onChange={(e) => setFormData({ ...formData, vacation_days: parseInt(e.target.value) || 0 })}
            className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-blue-500/50 transition-all text-center font-semibold"
            placeholder="0"
          />
          <p className="text-[10px] text-white/30 mt-1">Dovolená</p>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Poznámky</label>
        <textarea
          value={formData.notes ?? ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-[#FBBF24]/50 transition-all resize-none"
          placeholder="Zadejte dodatečné poznámky..."
          rows={3}
        />
      </div>

      {/* Active Status */}
      <button
        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
        className={`w-full p-4 rounded-xl border transition-all flex items-center justify-between ${
          formData.is_active
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${formData.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className={`font-semibold ${formData.is_active ? 'text-emerald-300' : 'text-red-300'}`}>
            {formData.is_active ? 'Aktivní' : 'Neaktivní'}
          </span>
        </div>
        <span className="text-xs text-white/30">Kliknutím změníte</span>
      </button>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onDelete}
          className="px-4 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Smazat
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          className="flex-1 py-3 rounded-xl bg-amber-300 hover:bg-amber-200 text-[#071019] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Uložit změny
        </button>
      </div>
    </div>
  );
}

export default function StaffManager() {
  const confirm = useConfirm();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [saving, setSaving] = useState(false);

  // Fetch staff from database
  useEffect(() => {
    let mounted = true;
    
    async function fetchStaff() {
      if (!isSupabaseConfigured || !supabase) {
        if (mounted) setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .order('name');
        
        if (error) throw error;
        if (mounted) setStaff(data || []);
      } catch (err) {
        console.error('[StaffManager] fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    
    fetchStaff();
    return () => { mounted = false; };
  }, []);

  // Filter staff by category
  const staffByCategory = useMemo(() => {
    if (activeCategory === 'doctors') {
      return staff.filter(s => s.role === 'DOCTOR');
    }
    return staff.filter(s => s.role === 'NURSE');
  }, [staff, activeCategory]);

  // Filter by search
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return staffByCategory;
    return staffByCategory.filter(s => s.name.toLowerCase().includes(q));
  }, [staffByCategory, searchQuery]);

  // Counts for tabs
  const counts = useMemo(() => ({
    doctors: staff.filter(s => s.role === 'DOCTOR').length,
    nurses: staff.filter(s => s.role === 'NURSE').length,
  }), [staff]);

  const stats = useMemo(() => ({
    total: staff.length,
    active: staff.filter(member => member.is_active).length,
    doctors: counts.doctors,
    nurses: counts.nurses,
    available: staff.filter(member => member.is_active && (member.availability ?? 100) > 0).length,
  }), [counts, staff]);

  const categories = [
    { id: 'doctors' as StaffCategory, label: 'Anesteziologové', count: counts.doctors, icon: Stethoscope, role: 'DOCTOR' },
    { id: 'nurses' as StaffCategory, label: 'Sestry', count: counts.nurses, icon: Heart, role: 'NURSE' },
  ];

  const selectedStaff = selectedStaffId ? staff.find(s => s.id === selectedStaffId) : null;

  // Add new staff
  const handleAddStaff = async () => {
    if (!newStaffName.trim() || !supabase) return;
    
    setSaving(true);
    const roleMap: Record<StaffCategory, string> = {
      doctors: 'DOCTOR',
      nurses: 'NURSE',
    };
    
    try {
      const newStaff = {
        id: `staff-${Date.now()}`,
        name: newStaffName.trim(),
        role: roleMap[activeCategory],
        is_active: true,
      };
      
      const { error } = await supabase.from('staff').insert(newStaff);
      if (error) throw error;
      
      setStaff(prev => [...prev, newStaff as StaffMember]);
      setNewStaffName('');
      setIsAddingNew(false);
    } catch (err) {
      console.error('[StaffManager] add error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Delete staff
  const handleDeleteStaff = async (id: string) => {
    if (!supabase) return;
    if (!(await confirm({
      title: 'Smazat zaměstnance?',
      description: 'Tato akce je nevratná.',
      confirmLabel: 'Smazat',
      danger: true,
    }))) return;

    try {
      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;
      
      setStaff(prev => prev.filter(s => s.id !== id));
      setSelectedStaffId(null);
    } catch (err) {
      console.error('[StaffManager] delete error:', err);
    }
  };

  // Save staff detail (all fields)
  const handleSaveStaffDetail = async (updated: StaffMember) => {
    if (!supabase) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('staff')
        .update({
          name: updated.name,
          role: updated.role,
          skill_level: updated.skill_level,
          availability: updated.availability,
          is_external: updated.is_external,
          is_recommended: updated.is_recommended,
          is_active: updated.is_active,
          sick_leave_days: updated.sick_leave_days,
          vacation_days: updated.vacation_days,
          notes: updated.notes,
        })
        .eq('id', updated.id);
      
      if (error) throw error;
      
      setStaff(prev => prev.map(s => s.id === updated.id ? updated : s));
      setSelectedStaffId(null);
    } catch (err) {
      console.error('[StaffManager] save detail error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (member: StaffMember) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      
      if (error) throw error;
      
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err) {
      console.error('[StaffManager] toggle error:', err);
    }
  };

  return (
    <>
      <div className="min-h-full w-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">STAFF DIRECTORY</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Personál <span className="text-white/20">MANAGEMENT</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Správa anesteziologických lékařů, sálových sester a jejich dostupnosti
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            PERSONÁLNÍ ADRESÁŘ AKTIVNÍ
          </div>
        </div>
      </header>

      <section
        className="relative mb-4 overflow-hidden rounded-[26px] p-2.5"
        style={{
          background: 'rgba(255,255,255,0.024)',
          border: '1px solid rgba(125,165,185,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-24 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(54,217,236,0.45), transparent)' }}
        />
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
          {[
            { label: 'Celkem personálu', value: stats.total, suffix: 'osob', color: COLORS.cyan, icon: Users },
            { label: 'Aktivní', value: stats.active, suffix: 'osob', color: COLORS.green, icon: UserRoundCheck },
            { label: 'Anesteziologové', value: stats.doctors, suffix: 'lékařů', color: COLORS.blue, icon: Stethoscope },
            { label: 'Sálové sestry', value: stats.nurses, suffix: 'sester', color: COLORS.amber, icon: Heart },
            { label: 'Dostupní', value: stats.available, suffix: 'osob', color: COLORS.violet, icon: Activity },
          ].map(({ label, value, suffix, color, icon: Icon }, index) => (
            <div
              key={label}
              className={`relative flex min-h-[78px] flex-col justify-between rounded-2xl px-3.5 py-3 ${index === 4 ? 'col-span-2 md:col-span-1' : ''}`}
              style={{ background: `${color}08`, border: `1px solid ${color}17` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</p>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight" style={{ color }}>{value}</span>
                <span className="text-[9px] text-white/25">{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-5 flex flex-col gap-2 rounded-[22px] p-2 xl:flex-row xl:items-center"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {categories.map(cat => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setActiveCategory(cat.id); setSelectedStaffId(null); }}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors"
                style={isActive
                  ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                  : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
                <span className="text-[9px] tabular-nums opacity-60">{cat.count}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden h-7 w-px bg-white/[0.07] xl:block" />

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/28" />
          <input
            type="search"
            aria-label="Hledat v personálu"
            placeholder="Hledat jméno pracovníka…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Přidat pracovníka
        </button>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-300/70" />
          <p className="text-xs text-white/35">Načítám personální adresář…</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[22px] py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.12)' }}
        >
          <Users className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {searchQuery ? `Hledání „${searchQuery}“ nemá žádný výsledek` : 'V této kategorii zatím není žádný personál'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte hledání nebo přidejte nového pracovníka.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filteredStaff.map(member => (
            <StaffCard
              key={member.id}
              member={member}
              onEdit={() => setSelectedStaffId(member.id)}
              onToggleActive={() => void handleToggleActive(member)}
            />
          ))}
        </div>
      )}
      </div>
      {/* ========== SHARED MODALS (desktop + mobile Upravit flow) ========== */}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStaffId(null)}
              className="fixed inset-0 z-50 bg-[#02060a]/88 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            >
              <DetailEditModal
                staff={selectedStaff}
                onClose={() => setSelectedStaffId(null)}
                onSave={handleSaveStaffDetail}
                onDelete={() => handleDeleteStaff(selectedStaff.id)}
                saving={saving}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add New Modal */}
      <AnimatePresence>
        {isAddingNew && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingNew(false); setNewStaffName(''); }}
              className="fixed inset-0 z-50 bg-[#02060a]/88 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            >
              <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-staff-title"
                className="w-full max-w-xl rounded-[26px] p-5 space-y-6 sm:p-6"
                style={{
                  background: 'linear-gradient(145deg, rgba(8,20,30,0.985), rgba(5,12,20,0.985))',
                  border: '1px solid rgba(125,165,185,0.22)',
                  boxShadow: '0 30px 90px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
                      <UserPlus className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-amber-300/70">Nový pracovník</p>
                      <h3 id="add-staff-title" className="mt-1 text-lg font-bold text-white">
                        Přidat {activeCategory === 'doctors' ? 'anesteziologického lékaře' : 'sálovou sestru'}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => { setIsAddingNew(false); setNewStaffName(''); }}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Jméno</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder={activeCategory === 'doctors' ? 'MUDr. Jan Novák' : activeCategory === 'nurses' ? 'Bc. Marie Nováková' : 'MUDr. Pavel Marek'}
                    className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-white/20"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsAddingNew(false); setNewStaffName(''); }}
                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/60 font-semibold transition-all"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleAddStaff}
                    disabled={saving || !newStaffName.trim()}
                    className="flex-1 py-3 rounded-xl bg-amber-300 hover:bg-amber-200 text-[#071019] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Přidat
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
