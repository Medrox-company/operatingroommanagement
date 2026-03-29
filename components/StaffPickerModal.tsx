import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Stethoscope, Heart, User, Check } from 'lucide-react';
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
  filterRole?: StaffRole; // Pre-filter by role (DOCTOR or NURSE)
  title?: string;
}

export default function StaffPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentStaffId,
  filterRole,
  title = 'Vybrat personál'
}: StaffPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'DOCTOR' | 'NURSE'>(filterRole === 'NURSE' ? 'NURSE' : 'DOCTOR');

  // Fetch staff from database
  useEffect(() => {
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
      } catch (error) {
        console.error('[StaffPickerModal] Failed to fetch staff:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchStaff();
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter staff by search query and role
  const filteredStaff = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    // Use filterRole if provided, otherwise use activeTab
    const effectiveRole = filterRole || activeTab;
    
    return staff.filter(member => {
      // Filter by role
      const roleMatch = effectiveRole === 'DOCTOR' 
        ? member.role === 'DOCTOR' || member.role === 'ANESTHESIOLOGIST'
        : member.role === 'NURSE';
      
      if (!roleMatch) return false;
      
      // Filter by search query
      if (query && !member.name.toLowerCase().includes(query)) {
        return false;
      }
      
      return true;
    });
  }, [staff, searchQuery, activeTab, filterRole]);

  // Count by role
  const doctorCount = useMemo(() => 
    staff.filter(s => s.role === 'DOCTOR' || s.role === 'ANESTHESIOLOGIST').length,
    [staff]
  );
  
  const nurseCount = useMemo(() => 
    staff.filter(s => s.role === 'NURSE').length,
    [staff]
  );

  // Handle selection
  const handleSelect = (member: StaffMember) => {
    onSelect(member.id, member.name);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-lg mx-4 max-h-[80vh] flex flex-col bg-[#0a0a0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Search Input - Centered with rounded design */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-white/30" />
              </div>
              <input
                type="text"
                placeholder="Hledat podle jména..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#00D8C1]/50 focus:bg-white/[0.07] transition-all text-base"
              />
            </div>

            {/* Role Tabs */}
            {!filterRole && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('DOCTOR')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                    activeTab === 'DOCTOR'
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span className="font-medium">Lékaři</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === 'DOCTOR' ? 'bg-violet-500/30' : 'bg-white/10'
                  }`}>
                    {doctorCount}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('NURSE')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                    activeTab === 'NURSE'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  <span className="font-medium">Sestry</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === 'NURSE' ? 'bg-emerald-500/30' : 'bg-white/10'
                  }`}>
                    {nurseCount}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Staff List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#00D8C1] rounded-full animate-spin" />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/40">
                <User className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">
                  {searchQuery ? 'Žádný personál nenalezen' : 'Žádný personál v databázi'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStaff.map((member) => {
                  const isSelected = member.id === currentStaffId;
                  const isDoctor = member.role === 'DOCTOR' || member.role === 'ANESTHESIOLOGIST';
                  
                  return (
                    <motion.button
                      key={member.id}
                      onClick={() => handleSelect(member)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#00D8C1]/15 border-[#00D8C1]/50'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isDoctor ? 'bg-violet-500/20' : 'bg-emerald-500/20'
                      }`}>
                        {isDoctor ? (
                          <Stethoscope className="w-6 h-6 text-violet-400" />
                        ) : (
                          <Heart className="w-6 h-6 text-emerald-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <p className={`font-semibold ${isSelected ? 'text-[#00D8C1]' : 'text-white'}`}>
                          {member.name}
                        </p>
                        <p className="text-xs text-white/40">
                          {member.role === 'DOCTOR' && 'Lékař'}
                          {member.role === 'NURSE' && 'Sestra'}
                          {member.role === 'ANESTHESIOLOGIST' && 'Anesteziolog'}
                        </p>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-[#00D8C1]/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-[#00D8C1]" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02]">
            <p className="text-xs text-white/30 text-center">
              Vyberte personál kliknutím na jméno
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
