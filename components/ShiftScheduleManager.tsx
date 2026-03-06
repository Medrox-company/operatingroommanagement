import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Users, Plus, Edit2, Trash2, X, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchShiftSchedules, createShiftSchedule, updateShiftSchedule, deleteShiftSchedule } from '../lib/db';

interface Shift {
  id: string;
  staff_id: string | null;
  operating_room_id: string | null;
  shift_type: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

const ShiftScheduleManager: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Shift, 'id' | 'created_at' | 'updated_at'>>({
    staff_id: null,
    operating_room_id: null,
    shift_type: 'morning',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '06:00',
    end_time: '14:00',
    is_available: true,
  });

  const shiftTypes = [
    { value: 'morning', label: 'Ranní směna', startTime: '06:00', endTime: '14:00' },
    { value: 'afternoon', label: 'Odpolední směna', startTime: '14:00', endTime: '22:00' },
    { value: 'night', label: 'Noční směna', startTime: '22:00', endTime: '06:00' },
  ];

  useEffect(() => {
    loadShifts();
    setupRealtimeSubscription();
  }, []);

  const loadShifts = async () => {
    try {
      setIsLoading(true);
      const data = await fetchShiftSchedules();
      setShifts(data);
      setError(null);
    } catch (err) {
      console.error('Error loading shifts:', err);
      setError('Chyba při načítání směn');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('shift_schedules_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_schedules' },
        () => loadShifts()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleAddShift = () => {
    setIsAddingShift(true);
    setEditingId(null);
    setFormData({
      staff_id: null,
      operating_room_id: null,
      shift_type: 'morning',
      shift_date: new Date().toISOString().split('T')[0],
      start_time: '06:00',
      end_time: '14:00',
      is_available: true,
    });
  };

  const handleEditShift = (shift: Shift) => {
    setEditingId(shift.id);
    setIsAddingShift(true);
    setFormData({
      staff_id: shift.staff_id,
      operating_room_id: shift.operating_room_id,
      shift_type: shift.shift_type,
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      is_available: shift.is_available,
    });
  };

  const handleSaveShift = async () => {
    try {
      if (editingId) {
        await updateShiftSchedule(editingId, formData);
      } else {
        await createShiftSchedule(formData);
      }
      setIsAddingShift(false);
      setEditingId(null);
      setError(null);
      await loadShifts();
    } catch (err) {
      console.error('Error saving shift:', err);
      setError('Chyba při ukládání směny');
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteShiftSchedule(id);
      setError(null);
      await loadShifts();
    } catch (err) {
      console.error('Error deleting shift:', err);
      setError('Chyba při mazání směny');
    }
  };

  const handleShiftTypeChange = (type: string) => {
    const selected = shiftTypes.find(st => st.value === type);
    if (selected) {
      setFormData({
        ...formData,
        shift_type: type,
        start_time: selected.startTime,
        end_time: selected.endTime,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16 flex-shrink-0">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Calendar className="w-4 h-4 text-[#06B6D4]" />
            <p className="text-[10px] font-black text-[#06B6D4] tracking-[0.4em] uppercase">SHIFT MANAGEMENT</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            SMĚNY <span className="text-white/20">PLÁN</span>
          </h1>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      {/* Add Button */}
      {!isAddingShift && (
        <motion.button
          onClick={handleAddShift}
          className="mb-8 px-6 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-semibold hover:bg-green-500/30 transition-all flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
        >
          <Plus className="w-4 h-4" />
          Přidat novou směnu
        </motion.button>
      )}

      {/* Add/Edit Form */}
      <AnimatePresence>
        {isAddingShift && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-[60px]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Typ směny</label>
                <select
                  value={formData.shift_type}
                  onChange={(e) => handleShiftTypeChange(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
                >
                  {shiftTypes.map(st => (
                    <option key={st.value} value={st.value} className="bg-slate-900">
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Datum</label>
                <input
                  type="date"
                  value={formData.shift_date}
                  onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Čas začátku</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Čas konce</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-white/80">Dostupná</span>
              </label>
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={handleSaveShift}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all"
                whileHover={{ scale: 1.05 }}
              >
                Uložit
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsAddingShift(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                whileHover={{ scale: 1.05 }}
              >
                Zrušit
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {shifts.map((shift) => (
            <motion.div
              key={shift.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white capitalize">{shift.shift_type}</h3>
                  <p className="text-sm text-white/60">{shift.shift_date}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${shift.is_available ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {shift.is_available ? 'Dostupná' : 'Nedostupná'}
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm text-white/60">
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {shift.start_time} - {shift.end_time}
                </p>
              </div>

              <div className="flex gap-2">
                <motion.button
                  onClick={() => handleEditShift(shift)}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <Edit2 className="w-3 h-3" />
                  Upravit
                </motion.button>
                <motion.button
                  onClick={() => handleDeleteShift(shift.id)}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-1"
                  whileHover={{ scale: 1.05 }}
                >
                  <Trash2 className="w-3 h-3" />
                  Smazat
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {shifts.length === 0 && !isAddingShift && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-white/50">Zatím žádné směny. Přidejte novou!</p>
        </motion.div>
      )}
    </div>
  );
};

export default ShiftScheduleManager;
