import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus, WeeklySchedule, DayWorkingHours, DEFAULT_WEEKLY_SCHEDULE, DEFAULT_WORKING_HOURS } from '../types';
import { MOCK_ROOMS } from '../constants';
import { updateOperatingRoom, createOperatingRoom, deleteOperatingRoom } from '../lib/db';
import {
  Plus, Trash2, Edit2, X, Check, AlertCircle, Clock, Calendar,
  Building2, ChevronDown, ChevronUp, Settings, Power, ArrowLeft, GripVertical,
} from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
}> = ({ day, schedule, onChange }) => {
  const breakMinutes = typeof schedule.breakMinutes === 'number' && schedule.breakMinutes >= 0
    ? schedule.breakMinutes
    : 30;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 p-3 rounded-xl transition-all ${
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
        <p className="text-[9px] text-white/30 uppercase">{schedule.enabled ? 'Aktivní' : 'Neaktivní'}</p>
      </div>

      {/* Time Inputs */}
      <div className="flex items-center gap-4 flex-1 min-w-[260px]">
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

      {/* Break Input */}
      <div className="flex flex-col gap-1 shrink-0">
        <label className="text-[9px] text-white/40 uppercase tracking-wider">Přestávka (min)</label>
        <input
          type="number"
          min={0}
          max={480}
          step={5}
          value={breakMinutes}
          disabled={!schedule.enabled}
          onChange={(e) => {
            const raw = parseInt(e.target.value, 10);
            const next = isNaN(raw) ? 0 : Math.max(0, Math.min(480, raw));
            onChange({ ...schedule, breakMinutes: next });
          }}
          className={`w-20 px-2 py-1.5 rounded-lg text-sm font-mono text-center border transition-all ${
            schedule.enabled
              ? 'bg-white/[0.05] border-white/10 text-white focus:outline-none focus:border-cyan-500/50'
              : 'bg-white/[0.02] border-white/5 text-white/30 cursor-not-allowed'
          }`}
        />
      </div>

      {/* Duration */}
      {schedule.enabled && (
        <div className="text-right shrink-0 min-w-[90px]">
          <p className="text-xs text-white/40">Čistý čas</p>
          <p className="text-sm font-mono text-cyan-400">
            {(() => {
              const startMins = schedule.startHour * 60 + schedule.startMinute;
              const endMins = schedule.endHour * 60 + schedule.endMinute;
              const gross = Math.max(0, endMins - startMins);
              const net = Math.max(0, gross - Math.min(breakMinutes, gross));
              const hours = Math.floor(net / 60);
              const mins = net % 60;
              return `${hours}h ${mins}m`;
            })()}
          </p>
        </div>
      )}
    </div>
  );
};

/* Room Card */
const RoomCard: React.FC<{
  room: OperatingRoom;
  onEdit: () => void;
  onDelete: () => void;
  onScheduleEdit: () => void;
}> = ({ room, onEdit, onDelete, onScheduleEdit }) => {
  const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
  
  // Count active days
  const activeDays = DAYS.filter(d => schedule[d.key as keyof WeeklySchedule].enabled).length;
  
  // Get today's schedule
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key as keyof WeeklySchedule;
  const todaySchedule = schedule[todayKey];
  const accent = getDeptColor(room.department);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const isFree = room.status === RoomStatus.FREE;
  const circumference = 2 * Math.PI * 48;
  const dashoffset = circumference * (1 - activeDays / 7);

  return (
    <div className="relative group h-[260px] sm:h-[340px] rounded-[1.75rem] sm:rounded-[2.5rem] transition-all duration-300 hover:-translate-y-1.5">
      {/* Hlavní kontejner — stejný jako dashboard */}
      <div className="absolute inset-0 z-0 rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/5 shadow-[0_15px_35px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-[60px] transition-all duration-500 bg-white/[0.03] group-hover:bg-white/[0.06] group-hover:border-white/10 group-hover:shadow-[0_28px_55px_-12px_rgba(0,0,0,0.65)]">
        <div
          className="absolute inset-x-10 top-0 h-[2px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] pointer-events-none"
          style={{ backgroundColor: accent, opacity: 0.15 }}
        />
      </div>

      {/* Obsah */}
      <div className="relative h-full w-full z-10 p-4 sm:p-6 flex flex-col">
        {/* Header — vystředěný */}
        <div className="w-full flex flex-col items-center text-center shrink-0">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: isFree ? '#34D399' : '#F87171', boxShadow: isFree ? '0 0 6px #34D39988' : '0 0 6px #F8717188' }} />
            <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase leading-none truncate max-w-full" style={{ color: accent }}>
              {room.department}
            </p>
          </div>
          <h3 className="text-base sm:text-xl font-bold tracking-tight uppercase leading-none truncate max-w-full text-white/90 group-hover:text-white transition-colors">
            {room.name}
          </h3>
        </div>

        {/* Střed — kruhový indikátor aktivních dnů */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="relative flex items-center justify-center">
            <div className="absolute rounded-full blur-[40px]" style={{ width: 80, height: 80, backgroundColor: accent, opacity: 0.25 }} />
            <svg viewBox="0 0 112 112" className="w-20 h-20 sm:w-28 sm:h-28 overflow-visible select-none" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="56" cy="56" r="48" fill="none" stroke="white" strokeWidth="1.5" className="opacity-[0.05]" />
              <circle
                cx="56" cy="56" r="48" fill="none"
                stroke={accent} strokeWidth="5" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                style={{ filter: `drop-shadow(0 0 6px ${accent}99)`, transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-white leading-none" style={{ letterSpacing: '-0.04em' }}>{activeDays}</span>
              <span className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-wide mt-0.5">/ 7 dní</span>
            </div>
          </div>
        </div>

        {/* Spodní info — dnešní hodiny + akce */}
        <div className="w-full space-y-2 sm:space-y-2.5 shrink-0">
          <p
            className="text-[9px] sm:text-[10px] font-bold tracking-[0.12em] uppercase truncate py-1.5 px-3 rounded-full border block w-full text-center"
            style={todaySchedule.enabled
              ? { backgroundColor: `${accent}1a`, borderColor: `${accent}40`, color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
          >
            {todaySchedule.enabled
              ? `Dnes ${pad(todaySchedule.startHour)}:${pad(todaySchedule.startMinute)} – ${pad(todaySchedule.endHour)}:${pad(todaySchedule.endMinute)}`
              : 'Dnes zavřeno'}
          </p>

          <div className="flex items-center gap-1.5 pt-2 sm:pt-2.5 border-t border-white/5">
            <button
              onClick={onScheduleEdit}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            >
              <Calendar className="w-3.5 h-3.5" /> Rozvrh
            </button>
            <button
              onClick={onEdit}
              title="Upravit"
              className="p-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              title="Smazat"
              className="p-2 rounded-xl text-red-400/70 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Sortable wrapper around RoomCard — adds drag handle + up/down arrows */
const SortableRoomCard: React.FC<{
  room: OperatingRoom;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onScheduleEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}> = ({ room, index, total, onEdit, onDelete, onScheduleEdit, onMoveUp, onMoveDown }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: room.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.85 : 1,
  };

  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'cursor-grabbing' : ''}>
      {/* Reorder controls bar */}
      <div className="flex items-center justify-between gap-2 px-1 mb-1.5">
        {/* Drag handle */}
        <button
          type="button"
          aria-label={`Přetáhnout ${room.name}`}
          {...attributes}
          {...listeners}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-white/40 hover:text-cyan-300 hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-wider">
            #{index + 1}
          </span>
        </button>

        {/* Arrow buttons */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Posunout nahoru"
            title="Posunout nahoru"
            className="p-1.5 rounded-md transition-all bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-25 disabled:hover:bg-white/[0.03] disabled:hover:text-white/60 disabled:cursor-not-allowed"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Posunout dolů"
            title="Posunout dolů"
            className="p-1.5 rounded-md transition-all bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.08] hover:text-white disabled:opacity-25 disabled:hover:bg-white/[0.03] disabled:hover:text-white/60 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <RoomCard
        room={room}
        onEdit={onEdit}
        onDelete={onDelete}
        onScheduleEdit={onScheduleEdit}
      />
    </div>
  );
};

/* Main Component */
const OperatingRoomsManager: React.FC<OperatingRoomsManagerProps> = ({
  rooms: initialRooms,
  onRoomsChange,
  onScheduleUpdate,
}) => {
  // Use ref to track if we've done initial load - prevents re-sync from polling
  const hasInitialized = useRef(false);
  const [roomsList, setRoomsList] = useState<OperatingRoom[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingRoom, setEditingRoom] = useState<OperatingRoom | null>(null);
  const [scheduleEditRoom, setScheduleEditRoom] = useState<OperatingRoom | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
  });

  // Initialize roomsList only once on mount, ignore subsequent prop changes from polling
  useEffect(() => {
    if (!hasInitialized.current && initialRooms && initialRooms.length > 0) {
      hasInitialized.current = true;
      const sorted = initialRooms.map(room => ({
        ...room,
        weeklySchedule: room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE
      })).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setRoomsList(sorted);
    }
  }, [initialRooms]);

  const saveRoomOrder = useCallback(async (rooms: OperatingRoom[]) => {
    try {
      const response = await fetch('/api/operating-rooms/reorder', {
        method: 'POST',
        credentials: 'include',
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

    await updateOperatingRoom(editingRoom.id, {
      name: editingRoom.name,
      department: editingRoom.department,
    });

    const original = roomsList.find(r => r.id === editingRoom.id);
    const originalOrder = original?.sort_order ?? 0;

    const updatedRooms = roomsList.map(r =>
      r.id === editingRoom.id
        ? { ...editingRoom, sort_order: originalOrder }
        : r
    );

    setRoomsList(updatedRooms);
    onRoomsChange?.(updatedRooms);
    setEditingRoom(null);
  };

  /**
   * Reorder a room by a single step (used by ↑/↓ arrows on each card).
   * Re-stamps sort_order to match array index and persists to DB.
   */
  const moveRoom = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setRoomsList(prev => {
        const idx = prev.findIndex(r => r.id === id);
        if (idx < 0) return prev;
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= prev.length) return prev;

        const next = arrayMove(prev, idx, target).map((r, i) => ({
          ...r,
          sort_order: i,
        }));

        onRoomsChange?.(next);
        saveRoomOrder(next);
        return next;
      });
    },
    [onRoomsChange, saveRoomOrder]
  );

  /**
   * Drag-and-drop reorder. Same persistence pipeline as moveRoom().
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setRoomsList(prev => {
        const oldIndex = prev.findIndex(r => r.id === active.id);
        const newIndex = prev.findIndex(r => r.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return prev;

        const next = arrayMove(prev, oldIndex, newIndex).map((r, i) => ({
          ...r,
          sort_order: i,
        }));

        onRoomsChange?.(next);
        saveRoomOrder(next);
        return next;
      });
    },
    [onRoomsChange, saveRoomOrder]
  );

  // Sensors: small activation distance prevents drag triggering on plain clicks
  // (so the inner ↑/↓ + edit/delete buttons keep working).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
    <div className="max-w-[2400px] mx-auto w-full">
      {/* Header — sjednocený s dashboardem */}
      <header className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-3 md:gap-6 mb-4 md:mb-10 lg:mb-12">
        <div className="text-center lg:text-left min-w-0 w-full lg:w-auto">
          <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-1 sm:mb-2 opacity-60">
            <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-[#22D3EE]" />
            <p className="text-[9px] sm:text-[10px] font-bold text-[#22D3EE] tracking-[0.3em] sm:tracking-[0.4em] uppercase">SPRÁVA OPERAČNÍCH SÁLŮ</p>
          </div>
          <h1 className="text-[clamp(1.75rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none truncate flex items-center gap-3 sm:gap-4 justify-center lg:justify-start">
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: '#22D3EE' }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3" style={{ background: '#22D3EE', boxShadow: '0 0 10px #22D3EE88' }} />
            </span>
            <span>OPERAČNÍ <span className="text-white/20">SÁLY</span></span>
          </h1>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add New Room Form */}
      {isAddingNew && (
        <div className="mb-8">
          <div 
            className="p-6 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0.02) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.2)'
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
                <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Oddělení</label>
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
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Rooms Grid — drag & drop reordering */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={roomsList.map(r => r.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 sm:gap-x-5 md:gap-x-6 gap-y-4 sm:gap-y-6 md:gap-y-8">
            {roomsList.map((room, idx) => (
              <SortableRoomCard
                key={room.id}
                room={room}
                index={idx}
                total={roomsList.length}
                onEdit={() => setEditingRoom(room)}
                onDelete={() => setDeleteConfirm(room.id)}
                onScheduleEdit={() => setScheduleEditRoom(room)}
                onMoveUp={() => moveRoom(room.id, 'up')}
                onMoveDown={() => moveRoom(room.id, 'down')}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setScheduleEditRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10"
              style={{ background: 'rgba(13,19,32,0.98)', backdropFilter: 'blur(40px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 p-6 border-b border-white/10 overflow-hidden" style={{ background: 'rgba(13,19,32,0.96)', backdropFilter: 'blur(40px)' }}>
                <div aria-hidden className="absolute inset-x-10 top-0 h-[2px] rounded-full" style={{ background: `linear-gradient(to right, transparent, ${'#22D3EE'}, transparent)` }} />
                <div className="relative flex items-center gap-3">
                  <div
                    className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${'#22D3EE'}, ${'#22D3EE'}aa)`, boxShadow: `0 6px 16px -4px ${'#22D3EE'}99` }}
                  >
                    <div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent opacity-50" />
                    <Calendar className="relative w-5 h-5 text-white drop-shadow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">{scheduleEditRoom.name}</h2>
                    <p className="text-xs text-white/40">Nastavení pracovní doby</p>
                  </div>
                  <button
                    onClick={() => setScheduleEditRoom(null)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
              <div className="sticky bottom-0 p-6 border-t border-white/10 flex justify-end gap-2.5" style={{ background: 'rgba(13,19,32,0.96)', backdropFilter: 'blur(40px)' }}>
                <button
                  onClick={() => setScheduleEditRoom(null)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/80 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => {
                    handleUpdateSchedule(scheduleEditRoom.id, scheduleEditRoom.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE);
                    setScheduleEditRoom(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-opacity hover:opacity-90 flex items-center gap-2"
                  style={{ background: '#22D3EE', boxShadow: `0 8px 20px -6px ${'#22D3EE'}88` }}
                >
                  <Check className="w-4 h-4" />
                  Uložit změny
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditingRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border border-white/10 p-6 overflow-hidden"
              style={{ background: 'rgba(13,19,32,0.98)', backdropFilter: 'blur(40px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            >
              <div aria-hidden className="absolute inset-x-10 top-0 h-[2px] rounded-full" style={{ background: `linear-gradient(to right, transparent, ${'#22D3EE'}, transparent)` }} />
              <div aria-hidden className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-[90px] pointer-events-none" style={{ backgroundColor: '#22D3EE', opacity: 0.14 }} />

              <div className="relative flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${'#22D3EE'}, ${'#22D3EE'}aa)`, boxShadow: `0 6px 16px -4px ${'#22D3EE'}99` }}
                  >
                    <div aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent opacity-50" />
                    <Edit2 className="relative w-4 h-4 text-white drop-shadow" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white truncate">Upravit sál</h2>
                    <p className="text-xs text-white/40 mt-0.5">Název a oddělení</p>
                  </div>
                </div>
                <button onClick={() => setEditingRoom(null)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5">Název</label>
                  <input
                    type="text"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-1.5">Oddělení</label>
                  <input
                    type="text"
                    value={editingRoom.department}
                    onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Pořadí zobrazení změníte přímo na kartách sálů — táhnutím za ikonu vlevo nahoře nebo šipkami vpravo nahoře.
                </p>
              </div>

              <div className="relative flex justify-end gap-2.5">
                <button
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/80 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleUpdateRoom}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl text-white transition-opacity hover:opacity-90 flex items-center gap-2"
                  style={{ background: '#22D3EE', boxShadow: `0 8px 20px -6px ${'#22D3EE'}88` }}
                >
                  <Check className="w-4 h-4" />
                  Uložit
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border border-white/10 p-6 overflow-hidden"
              style={{ background: 'rgba(13,19,32,0.98)', backdropFilter: 'blur(40px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
            >
              <div aria-hidden className="absolute inset-x-10 top-0 h-[2px] rounded-full" style={{ background: 'linear-gradient(to right, transparent, #EF4444, transparent)' }} />
              <div aria-hidden className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-[90px] pointer-events-none" style={{ backgroundColor: '#EF4444', opacity: 0.12 }} />

              <div className="relative flex items-start gap-3.5 mb-5">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-white">Smazat operační sál?</h2>
                  <p className="mt-1.5 text-sm text-white/60 leading-relaxed">Opravdu chcete smazat tento operační sál? Tato akce je nevratná.</p>
                </div>
              </div>

              <div className="relative flex justify-end gap-2.5">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/80 transition-colors"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => handleDeleteRoom(deleteConfirm)}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-red-500/90 hover:bg-red-500 transition-colors"
                >
                  Smazat
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
