import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Trash2, X, Check,
  Shield, Activity, UserPlus, Loader2, Star, MapPin,
  UserRoundCheck, UserRoundX, SlidersHorizontal
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SkillLevel } from '../types';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useHospital } from '../contexts/HospitalContext';
import ModulePageHeading from './ModulePageHeading';

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

const StaffRow: React.FC<{
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

  const availabilityColor = availability >= 70 ? COLORS.green : availability >= 40 ? COLORS.amber : COLORS.red;

  return (
    <article className={`grid min-h-[70px] grid-cols-[minmax(230px,1.5fr)_minmax(185px,1.15fr)_minmax(130px,.8fr)_minmax(170px,1fr)_minmax(140px,.85fr)_112px_112px] items-center border-b border-white/[0.055] px-4 transition-colors last:border-b-0 hover:bg-white/[0.028] ${member.is_active ? '' : 'opacity-55'}`}>
      <div className="flex min-w-0 items-center gap-3 pr-4">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-[10px] font-bold tracking-[0.06em]"
          style={{ color: accent, background: `${accent}0d`, borderColor: `${accent}26` }}
        >
          {staffInitials(member.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-white/88">{member.name}</p>
          <p className="mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.15em] text-white/28">
            {isDoctor ? 'Anesteziologie' : 'Sálová péče'}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2.5 pr-4">
        <RoleIcon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
        <span className="truncate text-[10px] font-medium text-white/60">
          {isDoctor ? 'Anesteziologický lékař' : 'Sálová sestra'}
        </span>
      </div>

      <div className="pr-5">
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold tabular-nums text-white/70">
          <span>{availability}%</span>
          <span className="text-[8px] font-medium text-white/25">kapacita</span>
        </div>
        <div className="mt-1.5 h-px overflow-hidden bg-white/[0.08]">
          <div className="h-full" style={{ width: `${availability}%`, background: availabilityColor }} />
        </div>
      </div>

      <p className={`truncate pr-4 text-[10px] font-medium ${absenceDays > 0 ? 'text-amber-200/70' : 'text-white/34'}`}>
        {absenceDays > 0 ? `PN ${member.sick_leave_days ?? 0} · Dovolená ${member.vacation_days ?? 0}` : 'Bez absence'}
      </p>

      <div className="flex min-w-0 items-center gap-1.5 pr-3">
        {skillMeta && <span className={`rounded-md border px-2 py-1 text-[8px] font-bold ${skillMeta.bgColor} ${skillMeta.color}`}>{skillMeta.label}</span>}
        {member.is_recommended && <span title="Doporučený"><Star className="h-3 w-3 text-amber-300/75" /></span>}
        {member.is_external && <span title="Externí pracovník"><MapPin className="h-3 w-3 text-orange-300/75" /></span>}
        {!skillMeta && !member.is_recommended && !member.is_external && <span className="text-[9px] text-white/24">Standardní</span>}
      </div>

      <button
        type="button"
        onClick={onToggleActive}
        className={`inline-flex h-8 w-[92px] items-center justify-center gap-1.5 rounded-md border text-[8px] font-bold uppercase tracking-[0.08em] transition-colors ${member.is_active ? 'border-emerald-300/15 bg-emerald-300/[0.045] text-emerald-200/70 hover:bg-emerald-300/[0.08]' : 'border-white/[0.07] bg-white/[0.025] text-white/35 hover:bg-white/[0.05]'}`}
      >
        {member.is_active ? <UserRoundCheck className="h-3 w-3" /> : <UserRoundX className="h-3 w-3" />}
        {member.is_active ? 'Aktivní' : 'Zapnout'}
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="inline-flex h-8 w-[96px] items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.025] text-[8px] font-bold uppercase tracking-[0.09em] text-white/48 transition-colors hover:border-cyan-300/22 hover:bg-white/[0.045] hover:text-cyan-100"
      >
        <SlidersHorizontal className="h-3 w-3" />
        Upravit
      </button>
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
      className="staff-picker-dialog max-h-[calc(100dvh-1rem)] w-full max-w-3xl space-y-4 overflow-y-auto rounded-xl p-4 font-sans sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${formData.role === 'DOCTOR' ? 'border-cyan-300/20 bg-cyan-300/[0.08]' : 'border-amber-300/20 bg-amber-300/[0.08]'}`}>
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
          className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-black/10 px-3 text-sm text-white transition-colors focus:outline-none focus:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/25"
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
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all ${
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
              : 'bg-black/10 border-white/[0.08]'
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
              : 'bg-black/10 border-white/[0.08]'
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
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-black/10 px-3 text-center font-semibold text-white transition-colors focus:outline-none focus:border-red-500/40 focus-visible:ring-2 focus-visible:ring-red-300/25"
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
            className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-black/10 px-3 text-center font-semibold text-white transition-colors focus:outline-none focus:border-blue-500/40 focus-visible:ring-2 focus-visible:ring-blue-300/25"
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
          className="mt-2 w-full resize-none rounded-lg border border-white/[0.08] bg-black/10 px-3 py-2.5 text-white transition-colors focus:outline-none focus:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/25"
          placeholder="Zadejte dodatečné poznámky..."
          rows={3}
        />
      </div>

      {/* Active Status */}
      <button
        onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
        className={`flex w-full items-center justify-between rounded-lg border p-3 transition-all ${
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
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-red-500/15 px-4 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-300/65 transition-colors hover:bg-red-500/[0.07]"
        >
          <Trash2 className="w-4 h-4" />
          Smazat
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#061724] transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Uložit změny
        </button>
      </div>
    </div>
  );
}

export default function StaffManager() {
  const { activeHospitalId } = useHospital();
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
          .eq('hospital_id', activeHospitalId || 'default')
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
  }, [activeHospitalId]);

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
        hospital_id: activeHospitalId || 'default',
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
      const { error } = await supabase.from('staff').delete().eq('id', id).eq('hospital_id', activeHospitalId || 'default');
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
        .eq('id', updated.id)
        .eq('hospital_id', activeHospitalId || 'default');
      
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
        .eq('id', member.id)
        .eq('hospital_id', activeHospitalId || 'default');
      
      if (error) throw error;
      
      setStaff(prev => prev.map(s => s.id === member.id ? { ...s, is_active: !s.is_active } : s));
    } catch (err) {
      console.error('[StaffManager] toggle error:', err);
    }
  };

  return (
    <>
      <div className="min-h-full w-full pb-8 font-sans">
        <header className="mb-7">
          <ModulePageHeading icon={Shield} kicker="STAFF MANAGEMENT" title="PERSONÁLNÍ" mutedTitle="MANAGEMENT" />
        </header>

        <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="flex min-w-max items-center gap-2.5">
            {[
              { label: 'Celkem', value: stats.total, color: COLORS.cyan, icon: Users },
              { label: 'Aktivní', value: stats.active, color: COLORS.green, icon: UserRoundCheck },
              { label: 'Lékaři', value: stats.doctors, color: COLORS.blue, icon: Stethoscope },
              { label: 'Sestry', value: stats.nurses, color: COLORS.amber, icon: Heart },
              { label: 'Dostupní', value: stats.available, color: COLORS.violet, icon: Activity },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="flex h-[68px] w-[112px] items-center gap-2.5 rounded-lg border border-white/[0.05] bg-black/10 px-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border" style={{ color, background: `${color}0c`, borderColor: `${color}20` }}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/30">{label}</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-white/88">{value}</p>
                </div>
              </div>
            ))}

            <div className="mx-0.5 h-9 w-px bg-white/[0.07]" />

            <div className="flex h-9 items-center rounded-lg border border-white/[0.06] bg-black/10 p-1">
              {categories.map(cat => {
                const isActive = activeCategory === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setActiveCategory(cat.id); setSelectedStaffId(null); }}
                    className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-[9px] font-semibold transition-colors ${isActive ? 'bg-cyan-300/[0.13] text-cyan-100' : 'text-white/38 hover:bg-white/[0.04] hover:text-white/65'}`}
                  >
                    <Icon className="h-3 w-3" />
                    {cat.label}
                    <span className="tabular-nums opacity-55">{cat.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-[220px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
              <input
                type="search"
                aria-label="Hledat v personálu"
                placeholder="Hledat pracovníka…"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="h-9 w-full rounded-lg border border-white/[0.06] bg-black/10 pl-9 pr-3 text-[10px] text-white outline-none transition-colors placeholder:text-white/24 focus:border-cyan-300/25 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
              />
            </div>

            <button type="button" onClick={() => setIsAddingNew(true)} className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-[9px] font-bold uppercase tracking-[0.08em] text-[#061724] transition-colors hover:bg-cyan-200">
              <Plus className="h-3.5 w-3.5" />
              Přidat pracovníka
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300/60">Personální adresář</p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-white/90">
                {activeCategory === 'doctors' ? 'Anesteziologičtí lékaři' : 'Sálové sestry'}
              </h2>
            </div>
            <p className="text-[9px] font-medium text-white/30">{filteredStaff.length} zobrazených</p>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-300/70" />
              <p className="text-[10px] text-white/32">Načítám personální adresář…</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
              <Users className="mb-3 h-8 w-8 text-white/14" />
              <p className="text-xs font-semibold text-white/45">{searchQuery ? `Hledání „${searchQuery}“ nemá žádný výsledek` : 'V této kategorii zatím není žádný personál'}</p>
              <p className="mt-1 text-[10px] text-white/24">Upravte hledání nebo přidejte nového pracovníka.</p>
            </div>
          ) : (
            <div className="hide-scrollbar overflow-x-auto">
              <div className="min-w-[1080px]">
                <div className="grid h-9 grid-cols-[minmax(230px,1.5fr)_minmax(185px,1.15fr)_minmax(130px,.8fr)_minmax(170px,1fr)_minmax(140px,.85fr)_112px_112px] items-center border-b border-white/[0.06] bg-black/10 px-4 text-[7px] font-semibold uppercase tracking-[0.16em] text-white/27">
                  <span>Pracovník</span>
                  <span>Role</span>
                  <span>Dostupnost</span>
                  <span>Absence</span>
                  <span>Zařazení</span>
                  <span>Stav</span>
                  <span>Akce</span>
                </div>
                {filteredStaff.map(member => (
                  <StaffRow key={member.id} member={member} onEdit={() => setSelectedStaffId(member.id)} onToggleActive={() => void handleToggleActive(member)} />
                ))}
              </div>
            </div>
          )}
        </section>
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
              className="staff-picker-backdrop fixed inset-0 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-5"
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
              className="staff-picker-backdrop fixed inset-0 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 sm:p-5"
            >
              <div 
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-staff-title"
                className="staff-picker-dialog w-full max-w-xl space-y-5 rounded-xl p-5 sm:p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
                      <UserPlus className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300/70">Nový pracovník</p>
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
                    className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-black/10 px-3 text-white placeholder-white/20 focus:outline-none focus:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/25"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsAddingNew(false); setNewStaffName(''); }}
                    className="h-10 flex-1 rounded-md px-4 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45 transition-colors hover:bg-white/5 hover:text-white/75"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleAddStaff}
                    disabled={saving || !newStaffName.trim()}
                    className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#061724] transition-colors hover:bg-cyan-200 disabled:opacity-50"
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
