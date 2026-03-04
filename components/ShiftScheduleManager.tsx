import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, ArrowLeft, Plus, Edit2, Trash2, X } from 'lucide-react';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  staffCount: number;
  description: string;
  color: string;
}

const ShiftScheduleManager: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: '1',
      name: 'Ranní směna',
      startTime: '06:00',
      endTime: '14:00',
      staffCount: 8,
      description: 'Hlavní ranní provoz',
      color: '#818CF8',
    },
    {
      id: '2',
      name: 'Odpolední směna',
      startTime: '14:00',
      endTime: '22:00',
      staffCount: 7,
      description: 'Podvečerní provoz',
      color: '#F97316',
    },
    {
      id: '3',
      name: 'Noční směna',
      startTime: '22:00',
      endTime: '06:00',
      staffCount: 4,
      description: 'Nočný provoz s pohotovostí',
      color: '#06B6D4',
    },
  ]);

  const [isAddingShift, setIsAddingShift] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Shift>({
    id: '',
    name: '',
    startTime: '',
    endTime: '',
    staffCount: 0,
    description: '',
    color: '#818CF8',
  });

  const handleAddShift = () => {
    setIsAddingShift(true);
    setEditingId(null);
    setFormData({
      id: Date.now().toString(),
      name: '',
      startTime: '',
      endTime: '',
      staffCount: 0,
      description: '',
      color: '#818CF8',
    });
  };

  const handleEditShift = (shift: Shift) => {
    setEditingId(shift.id);
    setIsAddingShift(true);
    setFormData(shift);
  };

  const handleDeleteShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const handleSaveShift = () => {
    if (!formData.name || !formData.startTime || !formData.endTime) return;

    if (editingId) {
      setShifts(shifts.map(s => s.id === editingId ? formData : s));
    } else {
      setShifts([...shifts, formData]);
    }

    setIsAddingShift(false);
    setEditingId(null);
    setFormData({
      id: '',
      name: '',
      startTime: '',
      endTime: '',
      staffCount: 0,
      description: '',
      color: '#818CF8',
    });
  };

  const handleCancel = () => {
    setIsAddingShift(false);
    setEditingId(null);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <motion.header
        className="flex items-center justify-between mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2 opacity-60">
            <Calendar className="w-4 h-4 text-[#F97316]" />
            <p className="text-[10px] font-black text-[#F97316] tracking-[0.4em] uppercase">PRACOVNÍ PLÁN</p>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
            Rozpis <span className="text-white/20">Služeb</span>
          </h1>
        </div>

        {!isAddingShift && (
          <motion.button
            onClick={handleAddShift}
            className="px-6 py-3 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 flex items-center gap-2 transition-all backdrop-blur-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold">Přidat službu</span>
          </motion.button>
        )}
      </motion.header>

      {/* Add/Edit Form */}
      {isAddingShift && (
        <motion.div
          className="mb-12 p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Název služby</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="např. Ranní směna"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Počet personálu</label>
              <input
                type="number"
                value={formData.staffCount}
                onChange={(e) => setFormData({ ...formData, staffCount: parseInt(e.target.value) || 0 })}
                placeholder="8"
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Čas začátku</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Čas konce</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/30"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Popis</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Podrobný popis služby..."
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
              rows={3}
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase">Barva služby</label>
            <div className="flex gap-2">
              {['#818CF8', '#F97316', '#06B6D4', '#10B981', '#EC4899', '#8B5CF6'].map((color) => (
                <button
                  key={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    formData.color === color ? 'border-white' : 'border-white/20'
                  }`}
                  style={{ backgroundColor: color, opacity: 0.7 }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button
              onClick={handleSaveShift}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 font-bold transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Uložit
            </motion.button>
            <motion.button
              onClick={handleCancel}
              className="px-6 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-bold transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Zrušit
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Shifts Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
      >
        {shifts.map((shift, idx) => (
          <motion.div
            key={shift.id}
            className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -5 }}
          >
            {/* Color bar */}
            <div
              className="h-1 rounded-full mb-4"
              style={{ backgroundColor: shift.color }}
            />

            <h3 className="text-lg font-bold text-white mb-2">{shift.name}</h3>
            <p className="text-xs text-white/50 mb-4">{shift.description}</p>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: shift.color }} />
                <div>
                  <p className="text-[10px] text-white/40 uppercase">Čas</p>
                  <p className="text-sm font-bold">{shift.startTime} - {shift.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" style={{ color: shift.color }} />
                <div>
                  <p className="text-[10px] text-white/40 uppercase">Personál</p>
                  <p className="text-sm font-bold">{shift.staffCount} osob</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <motion.button
                onClick={() => handleEditShift(shift)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Upravit
              </motion.button>
              <motion.button
                onClick={() => handleDeleteShift(shift.id)}
                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default ShiftScheduleManager;
