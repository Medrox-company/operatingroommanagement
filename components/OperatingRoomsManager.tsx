'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus, WeeklySchedule, DayWorkingHours, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { updateOperatingRoom, createOperatingRoom, deleteOperatingRoom } from '../lib/db';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import {
  Plus, Trash2, Edit2, X, Check, AlertCircle, Clock, Calendar,
  Building2, ChevronDown, ChevronUp, Power, GripVertical, Search,
  DoorOpen, Activity, LockKeyhole, CalendarDays, SlidersHorizontal,
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

type RoomFilter = 'all' | 'today' | 'locked';

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
  'CÉVNÍ': '#F59E0B',
  'HPB + PLICNI': '#8B5CF6',
  'HPB + PLICNÍ': '#8B5CF6',
  DETSKE: '#06B6D4',
  'DĚTSKÉ': '#06B6D4',
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

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
  violet: '#A78BFA',
};

const todayKey = () =>
  DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].key as keyof WeeklySchedule;

/* Room Card */
const RoomCard: React.FC<{
  room: OperatingRoom;
  index: number;
  reorderControls: React.ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  onScheduleEdit: () => void;
}> = ({ room, index, reorderControls, onEdit, onDelete, onScheduleEdit }) => {
  const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
  const activeDays = DAYS.filter(d => schedule[d.key as keyof WeeklySchedule].enabled).length;
  const currentDayKey = todayKey();
  const todaySchedule = schedule[currentDayKey];
  const pad = (n: number) => n.toString().padStart(2, '0');

  const { workflowStatuses } = useWorkflowStatusesContext();
  const activeStatuses = workflowStatuses || [];
  const totalSteps = activeStatuses.length > 0 ? activeStatuses.length : 1;
  const safeIndex = Math.min(Math.max(0, room.currentStepIndex || 0), totalSteps - 1);
  const step = activeStatuses[safeIndex] || null;
  const stepName = step?.name || '';
  const stepColor = step?.accent_color || step?.color || '#34D399';

  let statusLabel = stepName || 'Volný';
  let statusColor = stepColor;
  if (room.isEmergency) { statusLabel = 'Stav nouze'; statusColor = '#F87171'; }
  else if (room.isLocked) { statusLabel = 'Uzamčeno'; statusColor = '#FBBF24'; }
  else if (room.isPaused) { statusLabel = 'Pauza'; statusColor = '#22D3EE'; }

  return (
    <article
      className="group relative overflow-hidden rounded-[22px]"
      style={{
        background: 'rgba(255,255,255,0.022)',
        border: '1px solid rgba(125,165,185,0.14)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-y-8 left-0 w-px"
        style={{ background: `linear-gradient(to bottom, transparent, ${statusColor}80, transparent)` }}
      />
      <div className="grid min-h-[218px] grid-cols-1 sm:grid-cols-[minmax(180px,0.78fr)_minmax(0,1.22fr)]">
        <div
          className="relative flex min-w-0 flex-col justify-between overflow-hidden border-b border-white/[0.07] p-4 sm:border-b-0 sm:border-r"
          style={{
            borderRightColor: `${getDeptColor(room.department)}20`,
            background: `linear-gradient(145deg, ${getDeptColor(room.department)}12 0%, rgba(255,255,255,0.012) 68%)`,
          }}
        >
          <div
            aria-hidden
            className="absolute -left-14 -top-16 h-44 w-44 rounded-full blur-[70px]"
            style={{ backgroundColor: getDeptColor(room.department), opacity: 0.12 }}
          />
          <div className="relative flex items-start justify-between gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold tabular-nums"
              style={{
                color: getDeptColor(room.department),
                background: `${getDeptColor(room.department)}12`,
                border: `1px solid ${getDeptColor(room.department)}24`,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>
            <div
              className="inline-flex max-w-[115px] items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-semibold"
              style={{ color: statusColor, background: `${statusColor}12`, border: `1px solid ${statusColor}24` }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusColor }} />
              <span className="truncate">{statusLabel}</span>
            </div>
          </div>

          <div className="relative my-5">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/28">Operační sál</p>
            <h3 className="line-clamp-2 text-xl font-bold leading-tight tracking-tight text-white/90">{room.name}</h3>
            <p
              className="mt-2 inline-flex rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em]"
              style={{ color: getDeptColor(room.department), background: `${getDeptColor(room.department)}0d` }}
            >
              {room.department}
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-[9px] font-semibold text-white/34">
            <CalendarDays className="h-3 w-3" style={{ color: getDeptColor(room.department) }} />
            {activeDays} {activeDays === 1 ? 'provozní den' : activeDays < 5 ? 'provozní dny' : 'provozních dní'} v týdnu
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex min-h-[54px] items-center gap-2.5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.035] px-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/[0.09] text-cyan-300">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium text-white/32">Dnešní provoz</p>
                <p className="truncate text-xs font-semibold tabular-nums text-white/72">
                  {todaySchedule.enabled
                    ? `${pad(todaySchedule.startHour)}:${pad(todaySchedule.startMinute)}–${pad(todaySchedule.endHour)}:${pad(todaySchedule.endMinute)}`
                    : 'Mimo provoz'}
                </p>
              </div>
            </div>
            <div className="flex min-h-[54px] items-center gap-2.5 rounded-2xl border border-violet-300/10 bg-violet-300/[0.03] px-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-300/[0.08] text-violet-300">
                <Activity className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium text-white/32">Výkony / 24 h</p>
                <p className="text-xs font-semibold tabular-nums text-white/72">{room.operations24h || 0}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.065] bg-black/10">
            <div className="grid grid-cols-7 divide-x divide-white/[0.055]">
              {DAYS.map(day => {
                const daySchedule = schedule[day.key as keyof WeeklySchedule];
                const isToday = day.key === currentDayKey;
                return (
                  <div
                    key={day.key}
                    className="px-0.5 py-2 text-center"
                    style={{ background: isToday ? 'rgba(54,217,236,0.07)' : undefined }}
                  >
                    <p className={`text-[8px] font-bold uppercase ${isToday ? 'text-cyan-200' : 'text-white/32'}`}>{day.short}</p>
                    <span
                      className="mx-auto mt-1.5 block h-1.5 w-1.5 rounded-full"
                      style={{ background: daySchedule.enabled ? COLORS.green : 'rgba(255,255,255,0.12)' }}
                    />
                    <p className={`mt-1 text-[8px] tabular-nums ${daySchedule.enabled ? 'text-white/48' : 'text-white/18'}`}>
                      {daySchedule.enabled ? `${pad(daySchedule.endHour)}:${pad(daySchedule.endMinute)}` : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-0.5">
            {reorderControls}
          <button
            onClick={onScheduleEdit}
              className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-2.5 text-[9px] font-bold uppercase tracking-[0.08em] text-cyan-200/75 transition-colors hover:border-cyan-300/30 hover:text-cyan-100"
          >
              <Calendar className="h-3 w-3" /> Rozvrh
          </button>
          <button
            onClick={onEdit}
            title="Upravit"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/42 transition-colors hover:border-amber-300/25 hover:text-amber-200"
          >
              <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            title="Smazat"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-300/10 bg-red-300/[0.03] text-red-300/48 transition-colors hover:border-red-300/25 hover:text-red-200"
          >
              <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
      </div>
    </article>
  );
};

/* Sortable wrapper around RoomCard */
const SortableRoomCard: React.FC<{
  room: OperatingRoom;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onScheduleEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  reorderEnabled: boolean;
}> = ({ room, index, total, onEdit, onDelete, onScheduleEdit, onMoveUp, onMoveDown, reorderEnabled }) => {
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

  const canMoveUp = reorderEnabled && index > 0;
  const canMoveDown = reorderEnabled && index < total - 1;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'cursor-grabbing' : ''}>
      <RoomCard
        room={room}
        index={index}
        reorderControls={(
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`Přetáhnout ${room.name}`}
              {...(reorderEnabled ? attributes : {})}
              {...(reorderEnabled ? listeners : {})}
              disabled={!reorderEnabled}
              className="flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 text-[9px] font-semibold text-white/38 transition-colors hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <GripVertical className="h-3 w-3" />
              Pořadí
            </button>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Posunout nahoru"
              className="flex h-8 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/38 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Posunout dolů"
              className="flex h-8 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/38 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<RoomFilter>('all');
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

  const stats = useMemo(() => {
    const currentDay = todayKey();
    const todayOpen = roomsList.filter(room =>
      (room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE)[currentDay].enabled
    ).length;
    const activeOperations = roomsList.filter(room =>
      room.status !== RoomStatus.FREE && !room.isLocked && !room.isPaused && !room.isEmergency
    ).length;
    const locked = roomsList.filter(room => room.isLocked).length;
    const activeDays = roomsList.reduce((total, room) => {
      const schedule = room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE;
      return total + DAYS.filter(day => schedule[day.key as keyof WeeklySchedule].enabled).length;
    }, 0);
    const coverage = roomsList.length > 0 ? Math.round((activeDays / (roomsList.length * 7)) * 100) : 0;
    return { total: roomsList.length, todayOpen, activeOperations, locked, coverage };
  }, [roomsList]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('cs');
    const currentDay = todayKey();
    return roomsList.filter(room => {
      const matchesFilter =
        filter === 'all'
        || (filter === 'today' && (room.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE)[currentDay].enabled)
        || (filter === 'locked' && room.isLocked);
      const matchesQuery = !query
        || `${room.name} ${room.department}`.toLocaleLowerCase('cs').includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [roomsList, filter, searchQuery]);

  const reorderEnabled = filter === 'all' && searchQuery.trim() === '';

  return (
    <div className="min-h-full w-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <DoorOpen className="h-4 w-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#FBBF24]">OPERATING ROOM CONTROL</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
          Operační <span className="text-white/20">SÁLY</span>
        </h1>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/40">
            Konfigurace sálů, provozních režimů a týdenních rozvrhů
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            PROVOZNÍ KONFIGURACE AKTIVNÍ
          </div>
        </div>
      </header>

      <section
        className="relative mb-4 overflow-hidden rounded-[26px] p-2.5"
        style={{
          background: 'rgba(255,255,255,0.024)',
          border: '1px solid rgba(125,165,185,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-24 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(54,217,236,0.45), transparent)' }}
        />
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
          {[
            { label: 'Celkem sálů', value: stats.total, suffix: 'sálů', color: COLORS.cyan, icon: Building2 },
            { label: 'Dnes v provozu', value: stats.todayOpen, suffix: 'sálů', color: COLORS.green, icon: CalendarDays },
            { label: 'Aktivní provoz', value: stats.activeOperations, suffix: 'sálů', color: COLORS.blue, icon: Activity },
            { label: 'Uzamčeno', value: stats.locked, suffix: 'sálů', color: COLORS.red, icon: LockKeyhole },
            { label: 'Týdenní pokrytí', value: stats.coverage, suffix: '%', color: COLORS.violet, icon: Calendar },
          ].map(({ label, value, suffix, color, icon: Icon }, index) => (
            <div
              key={label}
              className={`relative flex min-h-[78px] flex-col justify-between rounded-2xl px-3.5 py-3 ${index === 4 ? 'col-span-2 md:col-span-1' : ''}`}
              style={{ background: `${color}08`, border: `1px solid ${color}17` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/38">{label}</p>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold tabular-nums tracking-tight" style={{ color }}>{value}</span>
                <span className="text-[9px] text-white/25">{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-5 flex flex-col gap-2 rounded-[22px] p-2 xl:flex-row xl:items-center"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {([
            ['all', 'Všechny sály', Building2, stats.total],
            ['today', 'Dnes v provozu', CalendarDays, stats.todayOpen],
            ['locked', 'Uzamčené', LockKeyhole, stats.locked],
          ] as const).map(([id, label, Icon, count]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="flex h-9 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition-colors"
                style={active
                  ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                  : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="text-[9px] tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden h-7 w-px bg-white/[0.07] xl:block" />

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/28" />
          <input
            type="search"
            aria-label="Hledat v operačních sálech"
            placeholder="Hledat název sálu nebo oddělení…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-white/[0.07] bg-black/10 pl-9 pr-3 text-xs text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-xs font-bold text-[#071019] transition-colors hover:bg-amber-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Přidat sál
        </button>
      </section>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-3 text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-200/60 hover:text-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filteredRooms.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[22px] py-16 text-center"
          style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.12)' }}
        >
          <DoorOpen className="mb-3 h-9 w-9 text-white/16" />
          <p className="text-sm font-semibold text-white/45">
            {roomsList.length === 0 ? 'Zatím nejsou uložené žádné operační sály' : 'Filtru neodpovídá žádný sál'}
          </p>
          <p className="mt-1 text-xs text-white/25">Upravte filtr nebo přidejte nový operační sál.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredRooms.map(room => room.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredRooms.map(room => {
                const index = roomsList.findIndex(item => item.id === room.id);
                return (
              <SortableRoomCard
                key={room.id}
                room={room}
                      index={index}
                total={roomsList.length}
                onEdit={() => setEditingRoom(room)}
                onDelete={() => setDeleteConfirm(room.id)}
                onScheduleEdit={() => setScheduleEditRoom(room)}
                onMoveUp={() => moveRoom(room.id, 'up')}
                onMoveDown={() => moveRoom(room.id, 'down')}
                      reorderEnabled={reorderEnabled}
              />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onMouseDown={event => {
              if (event.target === event.currentTarget) setIsAddingNew(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="relative my-auto w-full max-w-xl overflow-hidden rounded-[26px] border border-white/[0.1] bg-gradient-to-b from-[#101a24] to-[#080e14] p-5 shadow-2xl sm:p-6"
            >
              <div aria-hidden className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
              <div className="relative mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300/70">Nová konfigurace</p>
                    <h2 className="mt-1 text-lg font-bold text-white">Přidat operační sál</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setIsAddingNew(false)} className="rounded-lg p-2 text-white/38 hover:bg-white/[0.06] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/38">Název sálu</label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="např. Sál č. 1"
                    value={newRoomData.name}
                    onChange={event => setNewRoomData({ ...newRoomData, name: event.target.value })}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/15 px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-cyan-300/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/38">Oddělení</label>
                  <input
                    type="text"
                    placeholder="TRA, CHIR, ROBOT…"
                    value={newRoomData.department}
                    onChange={event => setNewRoomData({ ...newRoomData, department: event.target.value })}
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/15 px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-cyan-300/30"
                  />
                </div>
              </div>

              <div className="relative mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewRoomData({ name: '', department: '' });
                    setError(null);
                  }}
                  className="h-10 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 text-xs font-semibold text-white/55 hover:text-white"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={handleAddRoom}
                  className="flex h-10 items-center gap-2 rounded-xl bg-amber-300 px-5 text-xs font-bold text-[#071019] hover:bg-amber-200"
                >
                  <Check className="h-3.5 w-3.5" />
                  Přidat sál
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schedule Edit Modal */}
      <AnimatePresence>
        {scheduleEditRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onClick={() => setScheduleEditRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[26px] border border-white/[0.1]"
              style={{ background: 'linear-gradient(180deg, #101a24 0%, #080e14 100%)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
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
                    <SlidersHorizontal className="relative w-5 h-5 text-white drop-shadow" />
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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onClick={() => setEditingRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/[0.1] p-6"
              style={{ background: 'linear-gradient(180deg, #101a24 0%, #080e14 100%)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#02060a]/88 p-3 backdrop-blur-md sm:p-5"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-white/[0.1] p-6"
              style={{ background: 'linear-gradient(180deg, #101a24 0%, #080e14 100%)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
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
