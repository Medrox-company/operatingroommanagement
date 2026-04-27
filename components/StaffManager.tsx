import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Trash2, X, Check,
  Shield, Activity, UserPlus, Loader2, Star, MapPin, Percent
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SkillLevel } from '../types';
import MobileStaffView from './mobile/MobileStaffView';

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
      className="w-full max-w-lg rounded-2xl p-6 space-y-5"
      style={{
        background: 'rgba(10,10,18,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.role === 'DOCTOR' ? 'bg-violet-500/15' : 'bg-emerald-500/15'}`}>
            {formData.role === 'DOCTOR' ? <Stethoscope className="w-5 h-5 text-violet-400" /> : <Heart className="w-5 h-5 text-emerald-400" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Upravit personál</h3>
            <p className="text-xs text-white/40">Upravte údaje a uložte změny</p>
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
              {role === 'DOCTOR' ? 'Lékař' : 'Sestra'}
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
          className="flex-1 py-3 rounded-xl bg-[#FBBF24]/20 hover:bg-[#FBBF24]/30 text-[#FBBF24] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Uložit změny
        </button>
      </div>
    </div>
  );
}

export default function StaffManager() {
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

  const categories = [
    { id: 'doctors' as StaffCategory, label: 'Lékaři', count: counts.doctors, icon: Stethoscope, role: 'DOCTOR' },
    { id: 'nurses' as StaffCategory, label: 'Sestry', count: counts.nurses, icon: Heart, role: 'NURSE' },
  ];

  const selectedStaff = selectedStaffId ? filteredStaff.find(s => s.id === selectedStaffId) : null;

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
    if (!supabase || !confirm('Opravdu chcete smazat tohoto zaměstnance?')) return;
    
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
      {/* ========== MOBILE (md:hidden) ========== */}
      <MobileStaffView
        staffAll={staff}
        filteredStaff={filteredStaff}
        activeCategory={activeCategory}
        onCategoryChange={(c) => { setActiveCategory(c); setSelectedStaffId(null); }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        onEditStaff={(id) => setSelectedStaffId(id)}
        onDeleteStaff={handleDeleteStaff}
        onAddNew={() => setIsAddingNew(true)}
      />

      {/* ========== DESKTOP (hidden md:block) ========== */}
      <div className="hidden md:block w-full space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#FBBF24]" />
            <p className="text-[10px] font-bold text-[#FBBF24] tracking-[0.4em] uppercase">PERSONÁL CONTROL</p>
          </div>
          <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
            PERSONÁL <span className="text-white/20">MANAGEMENT</span>
          </h1>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-2 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-x-auto">
          {[
            { label: 'LÉKAŘI', value: counts.doctors, icon: Stethoscope, color: 'text-violet-400' },
            { label: 'SESTRY', value: counts.nurses, icon: Heart, color: 'text-emerald-400' },
            { label: 'CELKEM', value: staff.length, icon: Users, color: 'text-[#FBBF24]' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-6 md:px-10 py-4 rounded-2xl hover:bg-white/5 transition-all min-w-[100px]">
              <div className="flex items-center gap-2 mb-2 opacity-50">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-[9px] font-bold uppercase tracking-[0.15em]">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-4 overflow-x-auto">
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setSelectedStaffId(null); }}
              className={`flex items-center gap-2 pb-4 px-4 -mb-4 transition-all whitespace-nowrap ${isActive ? 'text-white border-b-2 border-[#FBBF24]' : 'text-white/40 hover:text-white/60'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-semibold">{cat.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Add Button */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Hledat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all text-sm"
          />
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FBBF24]/20 hover:bg-[#FBBF24]/30 text-[#FBBF24] font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Přidat</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
        </div>
      ) : (
        /* Staff Grid */
        <div className="grid grid-cols-2 gap-2">
          {filteredStaff.map((member) => {
            const skillLevel = member.skill_level as SkillLevel | undefined;
            const skillMeta = skillLevel ? SKILL_LEVELS[skillLevel] : null;
            const isSelected = selectedStaffId === member.id;

            // Unified icon box style
            const iconBox = "w-7 h-7 rounded-lg border backdrop-blur-sm flex items-center justify-center flex-shrink-0";
            const iconSize = "w-3.5 h-3.5";

            return (
              <motion.button
                key={member.id}
                onClick={() => setSelectedStaffId(member.id)}
                className={`px-3 py-3 rounded-xl border transition-all text-left group ${
                  isSelected
                    ? 'bg-[#FBBF24]/10 border-[#FBBF24]/30'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]'
                } ${!member.is_active ? 'opacity-40' : ''}`}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                {/* Single row: Role icon + Name + capability icons + active status */}
                <div className="flex items-center gap-2">
                  {/* Role icon */}
                  <div className={`${iconBox} ${
                    member.role === 'DOCTOR'
                      ? 'bg-violet-500/10 border-violet-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    {member.role === 'DOCTOR'
                      ? <Stethoscope className={`${iconSize} text-violet-400`} />
                      : <Heart className={`${iconSize} text-emerald-400`} />}
                  </div>

                  {/* Name + role label */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate leading-tight ${isSelected ? 'text-[#FBBF24]' : 'text-white/90'}`}>
                      {member.name}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wide leading-tight">
                      {member.role === 'DOCTOR' ? 'Lékař' : 'Sestra'}
                    </p>
                  </div>

                  {/* Capability icons - same row as name */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Skill Level */}
                    {skillMeta && (
                      <div className={`${iconBox} ${skillMeta.bgColor}`} title={`Uroven: ${skillMeta.label}`}>
                        <span className={`text-[9px] font-bold leading-none ${skillMeta.color}`}>{skillMeta.label}</span>
                      </div>
                    )}

                    {/* Recommended */}
                    {member.is_recommended && (
                      <div className={`${iconBox} bg-yellow-500/10 border-yellow-500/20`} title="Doporuceny">
                        <Star className={`${iconSize} text-yellow-400`} />
                      </div>
                    )}

                    {/* External */}
                    {member.is_external && (
                      <div className={`${iconBox} bg-orange-500/10 border-orange-500/20`} title="Externi">
                        <MapPin className={`${iconSize} text-orange-400`} />
                      </div>
                    )}

                    {/* Availability < 100% */}
                    {member.availability !== undefined && member.availability < 100 && (
                      <div className={`${iconBox} ${
                        member.availability >= 50 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'
                      }`} title={`Dostupnost: ${member.availability}%`}>
                        <Percent className={`${iconSize} ${member.availability >= 50 ? 'text-yellow-400' : 'text-red-400'}`} />
                      </div>
                    )}

                    {/* Sick Leave */}
                    {member.sick_leave_days !== undefined && member.sick_leave_days > 0 && (
                      <div className={`${iconBox} bg-red-500/10 border-red-500/20`} title={`PN: ${member.sick_leave_days} dni`}>
                        <Activity className={`${iconSize} text-red-400`} />
                      </div>
                    )}

                    {/* Vacation */}
                    {member.vacation_days !== undefined && member.vacation_days > 0 && (
                      <div className={`${iconBox} bg-blue-500/10 border-blue-500/20`} title={`Dovolena: ${member.vacation_days} dni`}>
                        <UserPlus className={`${iconSize} text-blue-400`} />
                      </div>
                    )}

                    {/* Active/Inactive status */}
                    <div className={`${iconBox} ${
                      member.is_active
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`} title={member.is_active ? 'Aktivni' : 'Neaktivni'}>
                      <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
          
          {filteredStaff.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-white/15" />
              <p className="text-sm text-white/30">
                {searchQuery ? `Žádný personál pro "${searchQuery}"` : 'Žádný personál v této kategorii'}
              </p>
            </div>
          )}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div 
                className="w-full max-w-md rounded-2xl p-6 space-y-6"
                style={{
                  background: 'rgba(10,10,18,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-[#FBBF24]" />
                    <h3 className="text-lg font-bold text-white">
                      Přidat {activeCategory === 'doctors' ? 'lékaře' : activeCategory === 'nurses' ? 'sestru' : 'anesteziologa'}
                    </h3>
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
                    className="flex-1 py-3 rounded-xl bg-[#FBBF24]/20 hover:bg-[#FBBF24]/30 text-[#FBBF24] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
