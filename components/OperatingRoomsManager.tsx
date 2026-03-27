import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus, WeeklySchedule, DayWorkingHours, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_WORKING_HOURS } from '../types';
import { MOCK_ROOMS } from '../constants';
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
  { key: 'monday', label: 'Pondeli', short: 'Po' },
  { key: 'tuesday', label: 'Utery', short: 'Ut' },
  { key: 'wednesday', label: 'Streda', short: 'St' },
  { key: 'thursday', label: 'Ctvrtek', short: 'Ct' },
  { key: 'friday', label: 'Patek', short: 'Pa' },
  { key: 'saturday', label: 'Sobota', short: 'So' },
  { key: 'sunday', label: 'Nedele', short: 'Ne' },
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
  <div className={`flex flex-col gap-1 ${disabled ? 'opacity-40' : ''}`}>
    <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={23}
        value={hour.toString().padStart(2, '0')}
        onChange={(e) => onHourChange(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="w-12 px-2 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white text-center text-sm font-mono focus:outline-none focus:border-cyan-500/50 disabled:cursor-not-allowed"
      />
      <span className="text-white/40">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={5}
        value={minute.toString().padStart(2, '0')}
        onChange={(e) => onMinuteChange(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="w-12 px-2 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-white text-center text-sm font-mono focus:outline-none focus:border-cyan-500/50 disabled:cursor-not-allowed"
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
    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
      schedule.enabled 
        ? 'bg-white/[0.03] border border-white/10' 
        : 'bg-white/[0.01] border border-white/5'
    }`}
  >
    {/* Day Toggle */}
    <button
      onClick={() => onChange({ ...schedule, enabled: !schedule.enabled })}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0 ${
        schedule.enabled 
          ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400' 
          : 'bg-white/5 border border-white/10 text-white/30'
      }`}
    >
      <Power className="w-4 h-4" />
    </button>
    
    {/* Day Name */}
    <div className="w-20 shrink-0">
      <p className={`text-sm font-semibold ${schedule.enabled ? 'text-white' : 'text-white/30'}`}>
        {day.label}
      </p>
      <p className="text-[9px] text-white/30 uppercase">{schedule.enabled ? 'Aktivni' : 'Neaktivni'}</p>
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
      className="relative group overflow-hidden rounded-[1.5rem]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background Glow */}
      <div 
        className="absolute inset-0 opacity-20 blur-3xl transition-opacity group-hover:opacity-30"
        style={{ background: color }}
      />
      
      {/* Card Content */}
      <div 
        className="relative rounded-[1.5rem] border backdrop-blur-xl overflow-hidden transition-all duration-300"
        style={{ 
          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
          borderColor: 'rgba(255,255,255,0.08)'
        }}
      >
        {/* Top Accent Line */}
        <div 
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}50)` }}
        />
        
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                  border: `1px solid ${color}40`
                }}
              >
                <Building2 className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{room.name}</h3>
                <p className="text-xs font-medium" style={{ color }}>{room.department}</p>
              </div>
            </div>
            
            {/* Status indicator */}
            <div 
              className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ 
                background: room.status === RoomStatus.FREE ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: room.status === RoomStatus.FREE ? '#22C55E' : '#EF4444',
                border: `1px solid ${room.status === RoomStatus.FREE ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}
            >
              {room.status === RoomStatus.FREE ? 'Volny' : 'Obsazeno'}
            </div>
          </div>
        </div>
        
        {/* Schedule Preview */}
        <div className="p-5">
          {/* Days Strip */}
          <div className="flex items-center gap-1 mb-4">
            {DAYS.map(day => {
              const daySchedule = schedule[day.key as keyof WeeklySchedule];
              return (
                <div 
                  key={day.key}
                  className={`flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                    daySchedule.enabled 
                      ? 'text-white' 
                      : 'text-white/20'
                  }`}
                  style={{
                    background: daySchedule.enabled ? `${color}25` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${daySchedule.enabled ? `${color}40` : 'rgba(255,255,255,0.05)'}`
                  }}
                >
                  {day.short}
                </div>
              );
            })}
          </div>
          
          {/* Today's Hours */}
          <div 
            className="p-3 rounded-xl mb-4"
            style={{ 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-xs text-white/40">Dnes</span>
              </div>
              {todaySchedule.enabled ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white">
                    {todaySchedule.startHour.toString().padStart(2, '0')}:{todaySchedule.startMinute.toString().padStart(2, '0')}
                  </span>
                  <span className="text-white/30">—</span>
                  <span className="text-sm font-mono font-bold" style={{ color }}>
                    {todaySchedule.endHour.toString().padStart(2, '0')}:{todaySchedule.endMinute.toString().padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-white/30">Neaktivni</span>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="flex-1 p-2 rounded-lg text-center"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-[10px] text-white/30 uppercase">Aktivni dny</p>
              <p className="text-lg font-bold text-white">{activeDays}</p>
            </div>
            <div 
              className="flex-1 p-2 rounded-lg text-center"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-[10px] text-white/30 uppercase">Operaci 24h</p>
              <p className="text-lg font-bold text-white">{room.operations24h || 0}</p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-5 pb-5">
          <div className="flex gap-2">
            <button
              onClick={onScheduleEdit}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
              style={{ 
                background: `${color}20`,
                border: `1px solid ${color}40`,
                color
              }}
            >
              <Calendar className="w-4 h-4" />
              Rozvrh
            </button>
            <button
              onClick={onEdit}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
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
    }))
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

  const handleAddRoom = () => {
    if (!newRoomData.name || !newRoomData.department) {
      setError('Vyplnte prosim vsechna povinna pole');
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
      staff: {
        doctor: { name: null, role: 'DOCTOR' },
        nurse: { name: null, role: 'NURSE' },
      },
    };

    const updatedRooms = [...roomsList, newRoom];
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setNewRoomData({ name: '', department: '' });
    setIsAddingNew(false);
    setError(null);
  };

  const handleDeleteRoom = (id: string) => {
    const updatedRooms = roomsList.filter(r => r.id !== id);
    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setDeleteConfirm(null);
  };

  const handleUpdateRoom = () => {
    if (!editingRoom) return;
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
      <header className="flex flex-col items-center lg:items-start justify-between gap-6 mb-10">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-2 opacity-60">
            <Building2 className="w-4 h-4 text-[#00D8C1]" />
            <p className="text-[10px] font-black text-[#00D8C1] tracking-[0.4em] uppercase">OPERATINGROOM CONTROL</p>
          </div>
          <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
            OPERAČNÍ <span className="text-white/20">SÁLY</span>
          </h1>
        </div>
        <p className="text-white/40 text-sm max-w-xl">
          Spravujte operacni saly, jejich pracovni dobu a rozvrh. Kazdy sal muze mit individualni nastaveni pracovni doby pro jednotlive dny v tydnu.
        </p>
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
                Pridat novy operacni sal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Nazev salu</label>
                  <input
                    type="text"
                    placeholder="napr. Sal c. 1"
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
                  Pridat sal
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
          Pridat novy sal
        </button>
      )}

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
