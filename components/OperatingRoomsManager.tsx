'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OperatingRoom, RoomStatus, WeeklySchedule, DayWorkingHours, DEFAULT_WEEKLY_SCHEDULE } from '../types';
import { updateOperatingRoom, createOperatingRoom, deleteOperatingRoom } from '../lib/db';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import { useHospital } from '../contexts/HospitalContext';
import ModulePageHeading from './ModulePageHeading';
import {
  Plus, Trash2, Edit2, X, Check, AlertCircle, Calendar,
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
  onScheduleUpdate?: (roomId: string, schedule: WeeklySchedule) => void;
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

/* Time Input Component */
const TimeInput: React.FC<{
  label: string;
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  disabled?: boolean;
}> = ({ label, hour, minute, onHourChange, onMinuteChange, disabled }) => (
  <div className={`flex flex-col gap-1 ${disabled ? 'opacity-35' : ''}`}>
    <span className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</span>
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={23}
        value={hour.toString().padStart(2, '0')}
        onChange={(e) => onHourChange(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="h-9 w-[50px] rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-1.5 text-center text-[13.5px] font-semibold tabular-nums text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-colors focus-visible:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/20 disabled:cursor-not-allowed"
      />
      <span className="text-sm font-semibold text-cyan-200/45">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={5}
        value={minute.toString().padStart(2, '0')}
        onChange={(e) => onMinuteChange(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="h-9 w-[50px] rounded-[12px] border border-white/[0.07] bg-white/[0.03] px-1.5 text-center text-[13.5px] font-semibold tabular-nums text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-colors focus-visible:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/20 disabled:cursor-not-allowed"
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

  const cistyCas = (() => {
    const zacatek = schedule.startHour * 60 + schedule.startMinute;
    const konec = schedule.endHour * 60 + schedule.endMinute;
    const hrube = Math.max(0, konec - zacatek);
    const cisty = Math.max(0, hrube - Math.min(breakMinutes, hrube));
    return `${Math.floor(cisty / 60)}h ${cisty % 60}m`;
  })();

  return (
    /* Jeden kompaktní řádek na den místo karty vysoké 260 px. Sedm karet
       nad sebou dělalo z rozvrhu okno na tři obrazovky; v řádku se všechno
       vejde na jednu linku a popisky drží stejné podání jako pás faktů
       v popupu — malé verzálky nad hodnotou. */
    <div
      className={`timeline-popup-card grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors ${
        schedule.enabled ? '' : 'opacity-[0.55]'
      }`}
      style={{
        background: schedule.enabled
          ? 'linear-gradient(135deg, rgba(103,232,249,0.05), rgba(103,232,249,0.01))'
          : 'linear-gradient(135deg, rgba(153,170,244,0.028), rgba(123,99,178,0.008))',
      }}
    >
      <span className={`flex h-9 min-w-10 items-center justify-center rounded-[12px] px-2 text-[10.5px] font-semibold uppercase ${schedule.enabled ? 'border border-cyan-300/25 bg-cyan-300/[0.10] text-cyan-200' : 'border border-white/[0.07] bg-white/[0.025] text-white/28'}`}>
        {day.short}
      </span>

      <div className="min-w-0">
        <p className={`text-[8.5px] font-semibold uppercase tracking-[0.18em] ${schedule.enabled ? 'text-cyan-300/70' : 'text-white/25'}`}>
          {schedule.enabled ? 'V provozu' : 'Mimo provoz'}
        </p>
        <p className={`mt-0.5 truncate text-[14px] font-semibold tracking-[-0.015em] ${schedule.enabled ? 'text-white/95' : 'text-white/35'}`}>{day.label}</p>
      </div>

      <div className="flex items-end gap-2">
        <TimeInput
          label="Od"
          hour={schedule.startHour}
          minute={schedule.startMinute}
          onHourChange={(h) => onChange({ ...schedule, startHour: h })}
          onMinuteChange={(m) => onChange({ ...schedule, startMinute: m })}
          disabled={!schedule.enabled}
        />
        <span className="pb-2.5 text-white/20">—</span>
        <TimeInput
          label="Do"
          hour={schedule.endHour}
          minute={schedule.endMinute}
          onHourChange={(h) => onChange({ ...schedule, endHour: h })}
          onMinuteChange={(m) => onChange({ ...schedule, endMinute: m })}
          disabled={!schedule.enabled}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/40">Přestávka</label>
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
          className={`h-9 w-[68px] rounded-[12px] border px-2 text-center text-[13.5px] font-semibold tabular-nums transition-colors ${
            schedule.enabled
              ? 'border-white/[0.07] bg-white/[0.03] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none focus-visible:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/20'
              : 'cursor-not-allowed border-white/[0.05] bg-white/[0.018] text-white/25'
          }`}
        />
      </div>

      <div className="min-w-[74px] text-right">
        <p className="text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/40">Čistý čas</p>
        <p className={`mt-1 text-[17px] font-light tabular-nums tracking-[-0.03em] ${schedule.enabled ? 'text-cyan-300' : 'text-white/25'}`}>
          {schedule.enabled ? cistyCas : '—'}
        </p>
      </div>

      <button
        onClick={() => onChange({ ...schedule, enabled: !schedule.enabled })}
        aria-label={`${schedule.enabled ? 'Vypnout' : 'Zapnout'} provoz v den ${day.label}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-colors ${
          schedule.enabled
            ? 'border border-cyan-300/28 bg-cyan-300/[0.11] text-cyan-200'
            : 'border border-white/[0.08] bg-white/[0.03] text-white/28'
        }`}
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
      >
        <Power className="h-[15px] w-[15px]" strokeWidth={1.9} />
      </button>
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
  compact: boolean;
}> = ({ room, index, reorderControls, onEdit, onDelete, onScheduleEdit, compact }) => {
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
      data-testid={`operating-room-card-${room.id}`}
      className={`group grid min-w-[1040px] grid-cols-[245px_160px_minmax(445px,1fr)_190px] border-b border-white/[0.055] bg-transparent transition-colors hover:bg-white/[0.018] ${compact ? 'min-h-[76px]' : 'min-h-[104px]'}`}
    >
      <section className="flex min-w-0 items-center gap-3 border-r border-white/[0.055] bg-white/[0.028] px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-200/[0.10] bg-cyan-300/[0.055] text-[9px] font-semibold tabular-nums text-cyan-100/75">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`${compact ? 'text-[12px]' : 'text-[14px]'} min-w-0 break-words font-semibold leading-tight text-white/94`}>{room.name}</h3>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusColor }} />
          </div>
          <p className="mt-1 truncate text-[8px] font-medium uppercase tracking-[0.10em] text-white/32">{room.department || 'Bez oddělení'}</p>
          {!compact && <p className="mt-1.5 truncate text-[8px] font-semibold uppercase tracking-[0.08em]" style={{ color: statusColor }}>{statusLabel}</p>}
        </div>
      </section>

      <section className="flex min-w-0 flex-col justify-center border-r border-white/[0.055] px-4 py-3">
        <p className="text-[7px] font-semibold uppercase tracking-[0.14em] text-white/32">Dnešní provoz</p>
        <p className={`${compact ? 'text-[13px]' : 'text-[15px]'} mt-1 whitespace-nowrap font-semibold tabular-nums tracking-tight text-white/90`}>
          {todaySchedule.enabled
            ? `${pad(todaySchedule.startHour)}:${pad(todaySchedule.startMinute)}–${pad(todaySchedule.endHour)}:${pad(todaySchedule.endMinute)}`
            : 'Mimo provoz'}
        </p>
        <p className="mt-1 text-[7px] font-medium text-white/28">{activeDays}/7 aktivních dnů</p>
      </section>

      <section className="grid min-w-0 grid-cols-7">
        {DAYS.map(day => {
          const daySchedule = schedule[day.key as keyof WeeklySchedule];
          const isToday = day.key === currentDayKey;
          return (
            <div
              key={day.key}
              className={`flex min-w-0 flex-col border-r border-white/[0.055] text-center ${isToday ? 'bg-cyan-300/[0.055]' : 'bg-transparent'}`}
              title={daySchedule.enabled
                ? `${day.label}: ${pad(daySchedule.startHour)}:${pad(daySchedule.startMinute)}–${pad(daySchedule.endHour)}:${pad(daySchedule.endMinute)}`
                : `${day.label}: mimo provoz`}
            >
              <div className="grid h-7 shrink-0 place-items-center border-b border-white/[0.055] bg-white/[0.022] px-1">
                <span className={`text-[8px] font-semibold uppercase tracking-[0.10em] ${isToday ? 'text-cyan-200' : daySchedule.enabled ? 'text-white/58' : 'text-white/25'}`}>
                  {compact ? day.short : day.label}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1.5 py-2">
                <span className={`whitespace-nowrap text-[9px] font-semibold tabular-nums ${daySchedule.enabled ? 'text-white/82' : 'text-white/24'}`}>
                  {daySchedule.enabled
                    ? `${pad(daySchedule.startHour)}:${pad(daySchedule.startMinute)}–${pad(daySchedule.endHour)}:${pad(daySchedule.endMinute)}`
                    : 'Mimo provoz'}
                </span>
                {!compact && <span className="mt-1 h-0.5 w-5 rounded-full" style={{ background: daySchedule.enabled ? '#67E8F9' : 'rgba(255,255,255,0.10)' }} />}
              </div>
            </div>
          );
        })}
      </section>

      <section className="flex min-w-0 flex-col justify-center gap-1.5 px-3 py-2">
        {reorderControls}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <button type="button" onClick={onScheduleEdit} className="flex h-8 items-center justify-center gap-1 rounded-md border border-cyan-200/[0.12] bg-cyan-300/[0.065] px-2 text-[8px] font-semibold uppercase tracking-[0.05em] text-cyan-100/80 hover:bg-cyan-300/[0.10]">
            <Calendar className="h-3 w-3" /> Rozvrh
          </button>
          <button type="button" onClick={onEdit} className="flex h-8 items-center justify-center gap-1 rounded-md border border-white/[0.055] bg-white/[0.018] px-2 text-[8px] font-semibold text-white/52 hover:bg-white/[0.04] hover:text-white">
            <Edit2 className="h-3 w-3" /> Upravit
          </button>
          <button type="button" onClick={onDelete} title="Smazat" aria-label={`Smazat ${room.name}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.055] bg-white/[0.018] text-white/32 hover:bg-red-300/[0.08] hover:text-red-200">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </section>
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
  compact: boolean;
}> = ({ room, index, total, onEdit, onDelete, onScheduleEdit, onMoveUp, onMoveDown, reorderEnabled, compact }) => {
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
          <div className="flex items-center justify-between gap-0.5 rounded-md border border-white/[0.045] bg-black/10 p-0.5">
            <button
              type="button"
              aria-label={`Přetáhnout ${room.name}`}
              {...(reorderEnabled ? attributes : {})}
              {...(reorderEnabled ? listeners : {})}
              disabled={!reorderEnabled}
              className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded px-2 text-[9px] font-semibold text-slate-400 hover:bg-white/[0.04] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <GripVertical className="h-3.5 w-3.5" />
              Přesunout
            </button>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Posunout nahoru"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Posunout dolů"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}
        onEdit={onEdit}
        onDelete={onDelete}
        onScheduleEdit={onScheduleEdit}
        compact={compact}
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
  const { activeHospitalId } = useHospital();
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
  const [compactView, setCompactView] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: '',
    department: '',
  });

  // Initialize roomsList only once on mount, ignore subsequent prop changes from polling
  useEffect(() => {
    if (!hasInitialized.current && initialRooms) {
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
        body: JSON.stringify({ rooms, hospitalId: activeHospitalId })
      });

      if (!response.ok) {
        throw new Error('Nepodařilo se uložit pořadí');
      }
    } catch (err) {
      console.error('Error saving room order:', err);
      setError('Chyba při ukládání pořadí sálů');
    }
  }, [activeHospitalId]);

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
    <div
      data-testid="operating-rooms-manager"
      className="statistics-module min-h-full w-full pb-8 font-sans"
    >
      <header className="mb-7">
        <ModulePageHeading icon={Building2} kicker="OR CONTROL" title="OPERAČNÍ" mutedTitle="SÁLY" />
      </header>

      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {[
            { label: 'Celkem sálů', value: stats.total, suffix: 'sálů', color: COLORS.cyan, icon: Building2 },
            { label: 'Dnes v provozu', value: stats.todayOpen, suffix: 'sálů', color: COLORS.green, icon: CalendarDays },
            { label: 'Aktivní provoz', value: stats.activeOperations, suffix: 'sálů', color: COLORS.blue, icon: Activity },
            { label: 'Uzamčeno', value: stats.locked, suffix: 'sálů', color: COLORS.red, icon: LockKeyhole },
            { label: 'Týdenní pokrytí', value: stats.coverage, suffix: '%', color: COLORS.violet, icon: Calendar },
          ].map(({ label, value, suffix, color, icon: Icon }) => (
            <div
              key={label}
              className="relative flex h-[68px] w-[112px] shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[128px]"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-white/38" title={label}>{label}</p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[22px] font-light leading-none tabular-nums text-white/95">{value}</span>
                    <span className="text-[8px] font-medium text-white/28">{suffix}</span>
                  </div>
                </div>
                <Icon className="h-4 w-4 shrink-0" style={{ color }} strokeWidth={1.5} />
              </div>
            </div>
          ))}

          <div className="ml-1 h-10 w-px shrink-0 bg-white/[0.07]" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
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
                className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[8px] font-semibold uppercase tracking-[0.06em] ${active ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
              >
                <Icon className="h-3 w-3" />
                {label}
                <span className="text-[7px] tabular-nums opacity-55">{count}</span>
              </button>
            );
          })}
          </div>

          <div className="relative w-[220px] shrink-0">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/32" />
          <input
            type="search"
            aria-label="Hledat v operačních sálech"
            placeholder="Hledat název sálu nebo oddělení…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.055] bg-black/10 pl-9 pr-3 text-[9px] font-medium text-white/78 outline-none placeholder:text-white/30 focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
          />
          </div>

          <button
          type="button"
          aria-pressed={compactView}
          aria-label="Přepnout kompaktní zobrazení operačních sálů"
          onClick={() => setCompactView(value => !value)}
          className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3.5 text-[9px] font-semibold ${
            compactView
              ? 'border-cyan-200/[0.20] bg-cyan-300/[0.10] text-cyan-100'
              : 'border-white/[0.06] bg-white/[0.025] text-white/42 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Kompaktní
          </button>

          <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 text-[9px] font-semibold text-[#061724] hover:bg-cyan-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Přidat sál
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-300/15 bg-red-300/[0.045] p-3 text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="text-xs font-medium">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-200/60 hover:text-red-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] py-16 text-center">
          <DoorOpen className="mb-3 h-9 w-9 text-white/32" />
          <p className="text-sm font-semibold text-white/72">
            {roomsList.length === 0 ? 'Zatím nejsou uložené žádné operační sály' : 'Filtru neodpovídá žádný sál'}
          </p>
          <p className="mt-1 text-xs text-white/50">Upravte filtr nebo přidejte nový operační sál.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredRooms.map(room => room.id)} strategy={rectSortingStrategy}>
            <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
              <div className="flex flex-col justify-between gap-2 border-b border-white/[0.055] px-4 py-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-white/95">Správa operačních sálů</h2>
                  <p className="mt-0.5 text-[10px] text-white/50">Provozní režim, pracovní doba a pořadí zobrazení</p>
                </div>
                <span className="text-[8px] font-semibold uppercase tracking-[0.13em] text-white/28">{filteredRooms.length} {filteredRooms.length === 1 ? 'sál' : filteredRooms.length < 5 ? 'sály' : 'sálů'}</span>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[1040px]">
                  <div className="grid h-9 grid-cols-[245px_160px_minmax(445px,1fr)_190px] border-b border-white/[0.055] bg-white/[0.018] text-[7px] font-semibold uppercase tracking-[0.14em] text-white/34">
                    <div className="flex items-center border-r border-white/[0.055] bg-white/[0.022] px-4">Operační sál</div>
                    <div className="flex items-center border-r border-white/[0.055] px-4">Dnešní provoz</div>
                    <div className="flex items-center justify-center border-r border-white/[0.055] px-4">Týdenní provoz</div>
                    <div className="flex items-center px-3">Správa</div>
                  </div>
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
                        compact={compactView}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="timeline-popup-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            onMouseDown={event => {
              if (event.target === event.currentTarget) setIsAddingNew(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="timeline-popup-panel relative my-auto w-full max-w-xl overflow-hidden p-5 sm:p-6"
            >
                            <div className="relative mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-200/[0.12] bg-cyan-300/[0.06] text-cyan-200">
                    <Plus className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/55">Nová konfigurace</p>
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
                    placeholder="např. Sál č. 1"
                    value={newRoomData.name}
                    onChange={event => setNewRoomData({ ...newRoomData, name: event.target.value })}
                    className="h-11 w-full rounded-lg border border-white/[0.07] bg-black/15 px-3 text-sm text-white outline-none placeholder:text-white/20 focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.14em] text-white/38">Oddělení</label>
                  <input
                    type="text"
                    placeholder="TRA, CHIR, ROBOT…"
                    value={newRoomData.department}
                    onChange={event => setNewRoomData({ ...newRoomData, department: event.target.value })}
                    className="h-11 w-full rounded-lg border border-white/[0.07] bg-black/15 px-3 text-sm text-white outline-none placeholder:text-white/20 focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
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
                  className="h-10 rounded-lg border border-white/[0.07] bg-white/[0.018] px-4 text-xs font-semibold text-white/55 hover:text-white"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={handleAddRoom}
                  className="flex h-10 items-center gap-2 rounded-lg bg-cyan-300 px-5 text-xs font-semibold text-[#061724] hover:bg-cyan-200"
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
            className="timeline-popup-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            onClick={() => setScheduleEditRoom(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="timeline-popup-panel relative max-h-[92vh] w-full max-w-4xl overflow-y-auto"
            >
              {/* Modal Header */}
              {/* Hlavička ve stejné skladbě jako popup v časové ose: název,
                  pod ním jeden řádek kontextu. Vlastní velikosti písma tu
                  nejsou — drží je .timeline-popup-header, takže obě okna
                  zůstanou svázaná i po dalších úpravách. */}
              <div className="timeline-popup-header sticky top-0 z-10 flex items-start justify-between gap-4 px-6 pt-5 pb-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-cyan-200/[0.14] bg-cyan-300/[0.07]">
                    <SlidersHorizontal className="h-[18px] w-[18px] text-cyan-200" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate">{scheduleEditRoom.name}</h2>
                    <p className="mt-1 uppercase">Týdenní rozvrh · provozní hodiny a přestávky</p>
                  </div>
                </div>
                <button
                  onClick={() => setScheduleEditRoom(null)}
                  aria-label="Zavřít"
                  className="timeline-popup-close flex h-9 w-9 shrink-0 items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="flex flex-col gap-2 px-6 py-4">
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
              <div className="sticky bottom-0 flex justify-end gap-2.5 border-t border-white/[0.055] px-6 py-4 backdrop-blur-md">
                <button
                  onClick={() => setScheduleEditRoom(null)}
                  className="h-11 rounded-[14px] border border-white/[0.09] bg-white/[0.05] px-5 text-[13px] font-semibold text-white/60 transition-colors hover:text-white"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                >
                  Zrušit
                </button>
                <button
                  onClick={() => {
                    handleUpdateSchedule(scheduleEditRoom.id, scheduleEditRoom.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE);
                    setScheduleEditRoom(null);
                  }}
                  className="flex h-11 items-center gap-2 rounded-[14px] px-6 text-[13px] font-semibold text-[#061725] transition-colors"
                  style={{ background: '#67E8F9' }}
                >
                  <Check className="h-4 w-4" />
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
            className="timeline-popup-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            onClick={() => setEditingRoom(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="timeline-popup-panel relative w-full max-w-md overflow-hidden p-6"
            >
              {/* Tvar drží nasvícená horní hrana panelu, ne barevná linka —
                  stejně jako u popupu v ose. */}
              <div className="timeline-popup-header -mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 px-6 pt-5 pb-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-cyan-200/[0.14] bg-cyan-300/[0.07]">
                    <Edit2 className="h-[17px] w-[17px] text-cyan-200" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate">{editingRoom.name || 'Upravit sál'}</h2>
                    <p className="mt-1 uppercase">Úprava sálu · název a oddělení</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingRoom(null)}
                  aria-label="Zavřít"
                  className="timeline-popup-close flex h-9 w-9 shrink-0 items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              </div>

              <div className="relative space-y-4 mb-6">
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Název</label>
                  <input
                    type="text"
                    value={editingRoom.name}
                    onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                    className="w-full rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Oddělení</label>
                  <input
                    type="text"
                    value={editingRoom.department}
                    onChange={(e) => setEditingRoom({ ...editingRoom, department: e.target.value })}
                    className="w-full rounded-[14px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus:outline-none focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
                  />
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Pořadí zobrazení změníte přímo na kartách sálů — táhnutím za ikonu vlevo nahoře nebo šipkami vpravo nahoře.
                </p>
              </div>

              <div className="relative flex justify-end gap-2.5">
                <button
                  onClick={() => setEditingRoom(null)}
                  className="rounded-[14px] border border-white/[0.09] bg-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white/60 transition-colors hover:text-white"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
                >
                  Zrušit
                </button>
                <button
                  onClick={handleUpdateRoom}
                  className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-[13px] font-semibold text-[#061724] transition-colors"
                  style={{ background: '#67E8F9' }}
                >
                  <Check className="h-4 w-4" />
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
            className="timeline-popup-overlay fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="timeline-popup-panel relative w-full max-w-md overflow-hidden p-6"
            >
                            <div className="relative flex items-start gap-3.5 mb-5">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-white">Smazat operační sál?</h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/50">Opravdu chcete smazat tento operační sál? Tato akce je nevratná.</p>
                </div>
              </div>

              <div className="relative flex justify-end gap-2.5">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-[14px] border border-white/[0.09] bg-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white/60 transition-colors hover:text-white"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => handleDeleteRoom(deleteConfirm)}
                  className="rounded-[14px] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors" style={{ background: 'rgba(229,72,77,0.88)' }}
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
