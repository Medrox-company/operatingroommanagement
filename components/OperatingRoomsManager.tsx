import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus, WeeklySchedule, DayWorkingHours, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_WORKING_HOURS } from '../types';
import { MOCK_ROOMS } from '../constants';
import { updateOperatingRoom, createOperatingRoom, deleteOperatingRoom } from '../lib/db';
import { 
  Plus, Trash2, Edit2, X, Check, AlertCircle, Clock, Calendar, 
  Building2, ChevronDown, ChevronUp, Settings, Power, ArrowLeft
} from 'lucide-react';

interface OperatingRoomsManagerProps {
  rooms?: OperatingRoom[];
  onRoomsChange?: (rooms: OperatingRoom[]) => void;
  onScheduleUpdate?: (roomId: string, schedule: Record<string, any>) => void;
}

const DAYS = [
  { key: 'monday', label: 'Pondělí', short: 'Po' },
  { key: 'tuesday', label: 'Úterý', short: 'Út' },
  { key: 'wednesday', label: 'Středa', short: 'St' },
  { key: 'thursday', label: 'Čtvrtek', short: 'Čt' },
  { key: 'friday', label: 'Pátek', short: 'Pá' },
  { key: 'saturday', label: 'Sobota', short: 'So' },
  { key: 'sunday', label: 'Neděle', short: 'Ne' },
] as const;

const deptColors: Record<string, string> = {
  TRA: '#00D8C1',
  CHIR: '#7C3AED',
  ROBOT: '#06B6D4',
  URO: '#EC4899',
  ORL: '#3B82F6',
  'CEVNI': '#F59E0B',
  'HPB + PLICNI': '#8B5CF6',
  DETSKE: '#06B6D4',
  MAMMO: '#EC4899',
};

const getDeptColor = (dept: string) => deptColors[dept] || '#64748B';

/* Time Input Component */
const TimeInput: React.FC<{
  label: string;
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  disabled?: boolean;
}> = ({ label, hour, minute, onHourChange, onMinuteChange, disabled }) => (
  <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-40' : ''}`}>
    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">{label}</span>
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={23}
        value={hour.toString().padStart(2, '0')}
        onChange={(e) => onHourChange(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="w-12 px-2 py-2 rounded-lg border border-border-default bg-surface-1 text-text-primary text-center text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:cursor-not-allowed transition-all"
      />
      <span className="text-text-muted">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={5}
        value={minute.toString().padStart(2, '0')}
        onChange={(e) => onMinuteChange(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="w-12 px-2 py-2 rounded-lg border border-border-default bg-surface-1 text-text-primary text-center text-sm font-mono focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:cursor-not-allowed transition-all"
      />
    </div>
  </div>
);

/* Day Schedule Row */
const DayScheduleRow: React.FC<{
  day: typeof DAYS[number];
  schedule: DayWorkingHours;
  onChange: (schedule: DayWorkingHours) => void;
}> = ({ day, schedule, onChange }) => (
  <div 
    className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 ${
      schedule.enabled 
        ? 'bg-surface-2 border border-border-default' 
        : 'bg-surface-1 border border-border-subtle'
    }`}
  >
    {/* Day Toggle */}
    <button
      onClick={() => onChange({ ...schedule, enabled: !schedule.enabled })}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 ${
        schedule.enabled 
          ? 'bg-accent/15 border border-accent/40 text-accent' 
          : 'bg-surface-2 border border-border-subtle text-text-muted hover:text-text-secondary'
      }`}
    >
      <Power className="w-4 h-4" />
    </button>
    
    {/* Day Name */}
    <div className="w-20 shrink-0">
      <p className={`text-sm font-medium ${schedule.enabled ? 'text-text-primary' : 'text-text-muted'}`}>
        {day.label}
      </p>
      <p className="text-[9px] text-text-muted uppercase tracking-wide">{schedule.enabled ? 'Aktivni' : 'Neaktivni'}</p>
    </div>
    
    {/* Time Inputs */}
    <div className="flex items-center gap-4 flex-1">
      <TimeInput
        label="Od"
        hour={schedule.startHour}
        minute={schedule.startMinute}
        onHourChange={(h) => onChange({ ...schedule, startHour: h })}
        onMinuteChange={(m) => onChange({ ...schedule, startMinute: m })}
        disabled={!schedule.enabled}
      />
      <div className="text-white/20 text-lg">—</div>
      <TimeInput
        label="Do"
        hour={schedule.endHour}
        minute={schedule.endMinute}
        onHourChange={(h) => onChange({ ...schedule, endHour: h })}
        onMinuteChange={(m) => onChange({ ...schedule, endMinute: m })}
        disabled={!schedule.enabled}
      />
    </div>
    
    {/* Duration */}
    {schedule.enabled && (
      <div className="text-right shrink-0">
        <p className="text-xs text-white/40">Delka</p>
        <p className="text-sm font-mono text-cyan-400">
          {(() => {
            const startMins = schedule.startHour * 60 + schedule.startMinute;
            const endMins = schedule.endHour * 60 + schedule.endMinute;
            const duration = endMins - startMins;
            const hours = Math.floor(duration / 60);
            const mins = duration % 60;
            return `${hours}h ${mins}m`;
          })()}
        </p>
      </div>
    )}
  </div>
);

/* Room Card */
const RoomCard: React.FC<{
  room: OperatingRoom;
  onEdit: () => void;
  onDelete: () => void;
  onScheduleEdit: () => void;
}> = ({ room, onEdit, onDelete, onScheduleEdit }) => {
  const color = getDeptColor(room.department);
  const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
  
  // Count active days
  const activeDays = DAYS.filter(d => schedule[d.key as keyof WeeklySchedule].enabled).length;
  
  // Get today's schedule
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key as keyof WeeklySchedule;
  const todaySchedule = schedule[todayKey];
  
  return (
    <motion.div
      className="relative group overflow-hidden rounded-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      {/* Card Content */}
      <div 
        className="relative rounded-xl border backdrop-blur-sm overflow-hidden transition-all duration-300"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          borderColor: 'rgba(255,255,255,0.08)'
        }}
      >
        {/* Content */}
        <div className="p-6 flex flex-col h-full">
          {/* Top Row: Name and Status */}
          <div className="flex items-start justify-between mb-5 pb-5 border-b border-white/5">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-1">{room.department}</p>
              <h3 className="text-lg font-bold text-white truncate">{room.name}</h3>
            </div>
            
            {/* Status Badge */}
            <div 
              className="ml-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0"
              style={{ 
                background: room.status === RoomStatus.FREE ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: room.status === RoomStatus.FREE ? '#22C55E' : '#EF4444',
                border: `1px solid ${room.status === RoomStatus.FREE ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              {room.status === RoomStatus.FREE ? 'Volný' : 'Obsazeno'}
            </div>
          </div>
          
          {/* Middle: Schedule Info */}
          <div className="flex-1 mb-5">
            {/* Days Strip */}
            <div className="flex items-center gap-1 mb-4">
              {DAYS.map(day => {
                const daySchedule = schedule[day.key as keyof WeeklySchedule];
                return (
                  <div 
                    key={day.key}
                    className={`flex-1 h-7 rounded-md flex items-center justify-center text-[9px] font-bold transition-all ${
                      daySchedule.enabled 
                        ? 'text-white' 
                        : 'text-white/30'
                    }`}
                    style={{
                      background: daySchedule.enabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}
                  >
                    {day.short}
                  </div>
                );
              })}
            </div>
            
            {/* Today's Hours and Stats */}
            <div className="grid grid-cols-3 gap-3">
              {/* Today's Hours */}
              <div 
                className="col-span-2 p-3 rounded-lg"
                style={{ 
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <p className="text-[9px] text-white/40 uppercase tracking-wide mb-1">Dnes</p>
                {todaySchedule.enabled ? (
                  <p className="text-sm font-mono text-white">
                    {todaySchedule.startHour.toString().padStart(2, '0')}:{todaySchedule.startMinute.toString().padStart(2, '0')} — {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                  </p>
                ) : (
                  <p className="text-sm text-white/30">Neaktivní</p>
                )}
              </div>
              
              {/* Active Days Count */}
              <div 
                className="p-3 rounded-lg text-center"
                style={{ 
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <p className="text-[9px] text-white/40 uppercase tracking-wide mb-1">Dny</p>
                <p className="text-lg font-bold text-white">{activeDays}</p>
              </div>
            </div>
          </div>
          
          {/* Bottom: Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/5">
            <button
              onClick={onScheduleEdit}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
              Rozvrh
            </button>
            <button
              onClick={onEdit}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              title="Upravit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-red-500/5 border border-red-500/20 text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
              title="Smazat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* Main Component */
const OperatingRoomsManager: React.FC<OperatingRoomsManagerProps> = ({
  rooms: initialRooms,
  onRoomsChange,
  onScheduleUpdate,
}) => {
  const [roomsList, setRoomsList] = useState<OperatingRoom[]>(
    (initialRooms || MOCK_ROOMS).map(room => ({
      ...room,
      weeklySchedule: room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE
    })).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  );
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingRoom, setEditingRoom] = useState<OperatingRoom | null>(null);
  const [scheduleEditRoom, setScheduleEditRoom] = useState<OperatingRoom | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
  });

  const saveRoomOrder = useCallback(async (rooms: OperatingRoom[]) => {
    try {
      const response = await fetch('/api/operating-rooms/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms })
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se uložit pořadí');
      }
    } catch (err) {
      console.error('Error saving room order:', err);
      setError('Chyba při ukládání pořadí sálů');
    }
  }, []);

  const handleAddRoom = async () => {
    if (!newRoomData.name || !newRoomData.department) {
      setError('Vyplňte prosím všechna povinná pole');
      return;
    }

    const newRoom: OperatingRoom = {
      id: `room-${Date.now()}`,
      name: newRoomData.name,
      department: newRoomData.department,
      status: RoomStatus.FREE,
      queueCount: 0,
      operations24h: 0,
      currentStepIndex: 6,
      isEmergency: false,
      isLocked: false,
      weeklySchedule: { ...DEFAULT_WEEKLY_SCHEDULE },
      sort_order: roomsList.length,
      staff: {
        doctor: { name: null, role: 'DOCTOR' },
        nurse: { name: null, role: 'NURSE' },
      },
    };

    // Save to database first
    const success = await createOperatingRoom({
      id: newRoom.id,
      name: newRoom.name,
      department: newRoom.department,
      status: 'FREE',
      queue_count: 0,
      operations_24h: 0,
      current_step_index: 6,
      is_emergency: false,
      is_locked: false,
      is_paused: false,
      is_septic: false,
      sort_order: roomsList.length,
    });

    if (!success) {
      setError('Nepodařilo se uložit sál do databáze');
      return;
    }

    const updatedRooms = [...roomsList, newRoom];
    setRoomsList(updatedRooms);
    saveRoomOrder(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setNewRoomData({ name: '', department: '' });
    setIsAddingNew(false);
    setError(null);
  };

  const handleDeleteRoom = async (id: string) => {
    // Delete from database first
    const success = await deleteOperatingRoom(id);
    if (!success) {
      setError('Nepodařilo se smazat sál z databáze');
      setDeleteConfirm(null);
      return;
    }
    
    const updatedRooms = roomsList.filter(r => r.id !== id);
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setDeleteConfirm(null);
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    
    // Update in database
    await updateOperatingRoom(editingRoom.id, {
      name: editingRoom.name,
      department: editingRoom.department,
    });
    
    const updatedRooms = roomsList.map(r =>
      r.id === editingRoom.id ? editingRoom : r
    );
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setEditingRoom(null);
  };

  const handleUpdateSchedule = (roomId: string, newSchedule: WeeklySchedule) => {
    const updatedRooms = roomsList.map(r =>
      r.id === roomId ? { ...r, weeklySchedule: newSchedule } : r
    );
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    // Notify parent of schedule update for database persistence
    onScheduleUpdate?.(roomId, newSchedule);
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-16">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Building2 className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERAČNÍ SÁLY MANAGEMENT</p>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter uppercase leading-none">
            OPERAČNÍ <span className="text-white/20">SÁLY</span>
          </h1>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Add New Room Form */}
      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div 
              className="p-6 rounded-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(0, 216, 193, 0.08) 0%, rgba(0, 216, 193, 0.02) 100%)',
                border: '1px solid rgba(0, 216, 193, 0.2)'
              }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Přidat nový operační sál
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Název sálu</label>
                  <input
                    type="text"
                    placeholder="např. Sál č. 1"
                    value={newRoomData.name}
                    onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Oddeleni</label>
                  <input
                    type="text"
                    placeholder="TRA, CHIR, atd."
                    value={newRoomData.department}
                    onChange={(e) => setNewRoomData({ ...newRoomData, department: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddRoom}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Přidat sál
                </button>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewRoomData({ name: '', department: '' });
                    setError(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrusit
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Button */}
      {!isAddingNew && (
        <button
          onClick={() => setIsAddingNew(true)}
          className="mb-8 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 text-cyan-300 font-semibold hover:from-cyan-500/30 hover:to-emerald-500/30 transition-all flex items-center gap-2 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Přidat nový sál
        </button>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roomsList.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onEdit={() => setEditingRoom(room)}
            onDelete={() => setDeleteConfirm(room.id)}
            onScheduleEdit={() => setScheduleEditRoom(room)}
          />
        ))}
      </div>

      {/* Empty State */}
      {roomsList.length === 0 && (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 mx-auto text-white/10 mb-4" />
          <p className="text-white/40 text-lg">Zadne operacni saly</p>
          <p className="text-white/20 text-sm">Kliknete na tlacitko vyse pro pridani noveho salu</p>
        </div>
      )}

      {/* Schedule Edit Modal */}
      <AnimatePresence>
        {scheduleEditRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setScheduleEditRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
              style={{ 
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 p-6 border-b border-white/10 backdrop-blur-xl" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setScheduleEditRoom(null)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <ArrowLeft className="w-5 h-5 text-white/60" />
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-white">{scheduleEditRoom.name}</h2>
                    <p className="text-sm text-white/40">Nastaveni pracovni doby</p>
                  </div>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 space-y-3">
                {DAYS.map(day => {
                  const schedule = scheduleEditRoom.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
                  const daySchedule = schedule[day.key as keyof WeeklySchedule];
                  return (
                    <DayScheduleRow
                      key={day.key}
                      day={day}
                      schedule={daySchedule}
                      onChange={(newDaySchedule) => {
                        const newSchedule = {
                          ...schedule,
                          [day.key]: newDaySchedule
                        };
                        setScheduleEditRoom({
                          ...scheduleEditRoom,
                          weeklySchedule: newSchedule
                        });
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Modal Footer */}
              <div className="sticky bottom-0 p-6 border-t border-white/10 backdrop-blur-xl flex gap-3" style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                <button
                  onClick={() => {
                    handleUpdateSchedule(scheduleEditRoom.id, scheduleEditRoom.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE);
                    setScheduleEditRoom(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Ulozit zmeny
                </button>
                <button
                  onClick={() => setScheduleEditRoom(null)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrusit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Room Modal */}
      <AnimatePresence>
        {editingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditingRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ 
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-cyan-400" />
                Upravit sal
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Nazev</label>
                  <input
                    type="text"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Oddeleni</label>
                  <input
                    type="text"
                    value={editingRoom.department}
                    onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Pořadí zobrazení</label>
                  <input
                    type="number"
                    min={1}
                    value={(editingRoom.sort_order ?? 0) + 1}
                    onChange={(e) => setEditingRoom({ ...editingRoom, sort_order: Math.max(0, parseInt(e.target.value) || 1) - 1 })}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateRoom}
                  className="flex-1 px-6 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/30 transition-all"
                >
                  Ulozit
                </button>
                <button
                  onClick={() => setEditingRoom(null)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
                >
                  Zrusit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{ 
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
            >
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Potvrdit smazani
              </h2>
              <p className="text-white/60 mb-6">Opravdu chcete smazat tento operacni sal? Tato akce je nevratna.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteRoom(deleteConfirm)}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-semibold hover:bg-red-500/30 transition-all"
                >
                  Smazat
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/[0.08] transition-all"
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

export default OperatingRoomsManager;
