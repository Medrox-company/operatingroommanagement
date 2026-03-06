import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Users, Plus, Edit2, Trash2, X, AlertCircle, Check } from 'lucide-react';

interface Shift {
  id: string;
  shiftType: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  staffName?: string;
}

const MOCK_SHIFTS: Shift[] = [
  { id: '1', shiftType: 'morning', shiftDate: '2026-03-06', startTime: '06:00', endTime: '14:00', staffName: 'MUDr. Novak' },
  { id: '2', shiftType: 'afternoon', shiftDate: '2026-03-06', startTime: '14:00', endTime: '22:00', staffName: 'Bc. Vesela' },
  { id: '3', shiftType: 'night', shiftDate: '2026-03-06', startTime: '22:00', endTime: '06:00', staffName: 'MUDr. Jelinek' },
];

const ShiftScheduleManager: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);
  const [isAddingShift, setIsAddingShift] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shiftType: 'morning',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '06:00',
    endTime: '14:00',
    staffName: '',
  });

  const shiftTypes = [
    { value: 'morning', label: 'Ranni smena', startTime: '06:00', endTime: '14:00' },
    { value: 'afternoon', label: 'Odpoledni smena', startTime: '14:00', endTime: '22:00' },
    { value: 'night', label: 'Nocni smena', startTime: '22:00', endTime: '06:00' },
  ];

  const handleShiftTypeChange = (type: string) => {
    const shiftType = shiftTypes.find(s => s.value === type);
    if (shiftType) {
      setFormData({
        ...formData,
        shiftType: type,
        startTime: shiftType.startTime,
        endTime: shiftType.endTime,
      });
    }
  };

  const handleSubmit = () => {
    if (editingId) {
      setShifts(shifts.map(s =>
        s.id === editingId ? { ...s, ...formData } : s
      ));
      setEditingId(null);
    } else {
      const newShift: Shift = {
        id: `shift-${Date.now()}`,
        ...formData,
      };
      setShifts([...shifts, newShift]);
    }
    setIsAddingShift(false);
    setFormData({
      shiftType: 'morning',
      shiftDate: new Date().toISOString().split('T')[0],
      startTime: '06:00',
      endTime: '14:00',
      staffName: '',
    });
  };

  const handleEdit = (shift: Shift) => {
    setFormData({
      shiftType: shift.shiftType,
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      staffName: shift.staffName || '',
    });
    setEditingId(shift.id);
    setIsAddingShift(true);
  };

  const handleDelete = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const getShiftTypeLabel = (type: string) => {
    return shiftTypes.find(s => s.value === type)?.label || type;
  };

  const getShiftColor = (type: string) => {
    switch (type) {
      case 'morning': return '#00D8C1';
      case 'afternoon': return '#F59E0B';
      case 'night': return '#8B5CF6';
      default: return '#64748B';
    }
  };

  return (
    <div className="w-full">
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Calendar className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">SHIFT SCHEDULE MANAGEMENT</p>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
            ROZVRH <span className="text-white/20">SMEN</span>
          </h1>
        </div>
      </header>

      <AnimatePresence>
        {isAddingShift && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 rounded-2xl border border-white/10 bg-white/[0.03]"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Upravit smenu' : 'Nova smena'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <select
                value={formData.shiftType}
                onChange={(e) => handleShiftTypeChange(e.target.value)}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
              >
                {shiftTypes.map(type => (
                  <option key={type.value} value={type.value} className="bg-slate-900">
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={formData.shiftDate}
                onChange={(e) => setFormData({ ...formData, shiftDate: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
              />
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white focus:outline-none focus:border-white/20"
              />
              <input
                type="text"
                placeholder="Jmeno personalu"
                value={formData.staffName}
                onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                className="px-4 py-3 rounded-lg border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-300 font-semibold hover:bg-blue-500/30 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingId ? 'Ulozit' : 'Pridat'}
              </button>
              <button
                onClick={() => {
                  setIsAddingShift(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
              >
                Zrusit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isAddingShift && (
        <button
          onClick={() => setIsAddingShift(true)}
          className="mb-8 px-6 py-3 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-semibold hover:bg-green-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Pridat novou smenu
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shifts.map((shift) => (
          <motion.div
            key={shift.id}
            className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getShiftColor(shift.shiftType) }}
                />
                <span className="font-medium text-white">{getShiftTypeLabel(shift.shiftType)}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{shift.shiftDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{shift.startTime} - {shift.endTime}</span>
              </div>
              {shift.staffName && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-white">{shift.staffName}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(shift)}
                className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Upravit
              </button>
              <button
                onClick={() => setDeleteConfirm(shift.id)}
                className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-all flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Smazat
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold text-white mb-4">Potvrdit smazani</h2>
              <p className="text-white/70 mb-6">Opravdu chcete smazat tuto smenu?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 hover:bg-red-500/30 transition-all"
                >
                  Smazat
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrusit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShiftScheduleManager;
