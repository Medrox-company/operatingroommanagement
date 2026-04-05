import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Stethoscope, Heart, Search, Plus, Edit2, Trash2, X, Check,
  Shield, Activity, UserPlus, Loader2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Types from database
interface StaffMember {
  id: string;
  name: string;
  role: 'DOCTOR' | 'NURSE' | 'ANESTHESIOLOGIST';
  is_active: boolean;
}

type StaffCategory = 'doctors' | 'nurses';

// Role metadata
const ROLE_META: Record<string, { label: string; badge: string; badgeClass: string; iconBg: string; iconColor: string; dbRole: string }> = {
  DOCTOR: {
    label: 'Lékař',
    badge: 'MUDr.',
    badgeClass: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    dbRole: 'DOCTOR',
  },
  NURSE: {
    label: 'Sestra',
    badge: 'Sestra',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    dbRole: 'NURSE',
  },
};

function RoleIcon({ role, size = 'md' }: { role: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const meta = ROLE_META[role] || ROLE_META['NURSE'];
  if (role === 'DOCTOR') return <Stethoscope className={`${sz} ${meta.iconColor}`} />;
  return <Heart className={`${sz} ${meta.iconColor}`} />;
}

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<StaffCategory>('doctors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
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

  // Update staff
  const handleUpdateStaff = async () => {
    if (!editingStaff || !supabase) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('staff')
        .update({ name: editingStaff.name, is_active: editingStaff.is_active })
        .eq('id', editingStaff.id);
      
      if (error) throw error;
      
      setStaff(prev => prev.map(s => s.id === editingStaff.id ? editingStaff : s));
      setIsEditing(false);
      setEditingStaff(null);
    } catch (err) {
      console.error('[StaffManager] update error:', err);
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
    <div className="w-full space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">PERSONÁL CONTROL</p>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
            PERSONÁL <span className="text-white/20">MANAGEMENT</span>
          </h1>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-2 p-2 bg-white/[0.04] border border-white/10 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-x-auto">
          {[
            { label: 'LÉKAŘI', value: counts.doctors, icon: Stethoscope, color: 'text-violet-400' },
            { label: 'SESTRY', value: counts.nurses, icon: Heart, color: 'text-emerald-400' },
            { label: 'CELKEM', value: staff.length, icon: Users, color: 'text-[#00D8C1]' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center px-6 md:px-10 py-4 rounded-2xl hover:bg-white/5 transition-all min-w-[100px]">
              <div className="flex items-center gap-2 mb-2 opacity-50">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <p className="text-[9px] font-black uppercase tracking-[0.15em]">{stat.label}</p>
              </div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
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
              className={`flex items-center gap-2 pb-4 px-4 -mb-4 transition-all whitespace-nowrap ${isActive ? 'text-white border-b-2 border-[#00D8C1]' : 'text-white/40 hover:text-white/60'}`}
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
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] font-semibold transition-all"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStaff.map((member) => {
            const meta = ROLE_META[member.role] || ROLE_META['NURSE'];
            const isSelected = selectedStaffId === member.id;
            
            return (
              <motion.button
                key={member.id}
                onClick={() => setSelectedStaffId(member.id)}
                className={`p-4 rounded-2xl border transition-all text-left group ${
                  isSelected
                    ? 'bg-[#00D8C1]/10 border-[#00D8C1]/40'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                } ${!member.is_active ? 'opacity-50' : ''}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.iconBg}`}>
                    <RoleIcon role={member.role} size="lg" />
                  </div>
                  
                  {/* Name + Badge */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isSelected ? 'text-[#00D8C1]' : 'text-white'}`}>
                      {member.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                        {meta.badge}
                      </span>
                      {!member.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          Neaktivní
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className={`w-3 h-3 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
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
              <div 
                className="w-full max-w-md rounded-2xl p-6 space-y-6"
                style={{
                  background: 'rgba(10,10,18,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${ROLE_META[selectedStaff.role]?.iconBg}`}>
                      <RoleIcon role={selectedStaff.role} size="lg" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{selectedStaff.name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_META[selectedStaff.role]?.badgeClass}`}>
                        {ROLE_META[selectedStaff.role]?.badge} - {ROLE_META[selectedStaff.role]?.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <span className="text-sm text-white/60">Status</span>
                  <button
                    onClick={() => handleToggleActive(selectedStaff)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm transition-all ${
                      selectedStaff.is_active
                        ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selectedStaff.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {selectedStaff.is_active ? 'Aktivní' : 'Neaktivní'}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditingStaff({ ...selectedStaff });
                      setIsEditing(true);
                      setSelectedStaffId(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(selectedStaff.id)}
                    className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Smazat
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && editingStaff && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsEditing(false); setEditingStaff(null); }}
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
                  <h3 className="text-lg font-bold text-white">Upravit personál</h3>
                  <button
                    onClick={() => { setIsEditing(false); setEditingStaff(null); }}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Jméno</label>
                    <input
                      type="text"
                      value={editingStaff.name}
                      onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                      className="w-full mt-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsEditing(false); setEditingStaff(null); }}
                    className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white/60 font-semibold transition-all"
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleUpdateStaff}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Uložit
                  </button>
                </div>
              </div>
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
                    <UserPlus className="w-5 h-5 text-[#00D8C1]" />
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
                    className="flex-1 py-3 rounded-xl bg-[#00D8C1]/20 hover:bg-[#00D8C1]/30 text-[#00D8C1] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
    </div>
  );
}
