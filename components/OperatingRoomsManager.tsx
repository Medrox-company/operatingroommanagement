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
  <div className={`flex flex-col gap-1.5 ${disabled ? 'opacity-35' : ''}`}>
    <span className="text-[11px] font-semibold text-white/45">{label}</span>
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        max={23}
        value={hour.toString().padStart(2, '0')}
        onChange={(e) => onHourChange(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="h-11 w-14 rounded-xl border border-cyan-300/15 bg-[#071a2d]/80 px-2 text-center text-[15px] font-bold tabular-nums text-white outline-none transition-colors focus:border-cyan-300/45 disabled:cursor-not-allowed"
      />
      <span className="text-sm font-bold text-cyan-200/55">:</span>
      <input
        type="number"
        min={0}
        max={59}
        step={5}
        value={minute.toString().padStart(2, '0')}
        onChange={(e) => onMinuteChange(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
        disabled={disabled}
        className="h-11 w-14 rounded-xl border border-cyan-300/15 bg-[#071a2d]/80 px-2 text-center text-[15px] font-bold tabular-nums text-white outline-none transition-colors focus:border-cyan-300/45 disabled:cursor-not-allowed"
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
      className={`flex min-h-[260px] flex-col rounded-[22px] p-5 transition-colors ${day.key === 'sunday' ? 'md:col-span-2' : ''} ${
        schedule.enabled
          ? 'border border-cyan-300/22 bg-gradient-to-br from-[#0e304e]/88 to-[#091f36]/88'
          : 'border border-white/[0.06] bg-[#091a2c]/58'
      }`}
    >
      {/* Den + zapnutí provozu */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 min-w-11 items-center justify-center rounded-xl px-2 text-[11px] font-bold uppercase ${schedule.enabled ? 'border border-cyan-300/20 bg-cyan-300/10 text-cyan-200' : 'border border-white/[0.05] bg-white/[0.02] text-white/25'}`}>
            {day.short}
          </span>
          <div className="min-w-0">
            <p className={`truncate text-[17px] font-bold ${schedule.enabled ? 'text-white' : 'text-white/30'}`}>{day.label}</p>
            <p className={`mt-0.5 text-[11px] font-semibold ${schedule.enabled ? 'text-cyan-300/65' : 'text-white/20'}`}>
              {schedule.enabled ? 'V provozu' : 'Mimo provoz'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange({ ...schedule, enabled: !schedule.enabled })}
          aria-label={`${schedule.enabled ? 'Vypnout' : 'Zapnout'} provoz v den ${day.label}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] transition-colors ${
            schedule.enabled
              ? 'border border-cyan-300/35 bg-cyan-300/14 text-cyan-200'
              : 'border border-white/[0.08] bg-white/[0.025] text-white/25'
          }`}
        >
          <Power className="h-4 w-4" />
        </button>
      </div>

      {/* Provozní doba pod názvem dne */}
      <div className="py-4">
        <p className="mb-2.5 text-[11px] font-semibold text-white/45">Provozní doba</p>
        <div className="flex min-w-0 items-center gap-3">
          <TimeInput
            label="Od"
            hour={schedule.startHour}
            minute={schedule.startMinute}
            onHourChange={(h) => onChange({ ...schedule, startHour: h })}
            onMinuteChange={(m) => onChange({ ...schedule, startMinute: m })}
            disabled={!schedule.enabled}
          />
          <div className="pt-5 text-lg text-white/20">—</div>
          <TimeInput
            label="Do"
            hour={schedule.endHour}
            minute={schedule.endMinute}
            onHourChange={(h) => onChange({ ...schedule, endHour: h })}
            onMinuteChange={(m) => onChange({ ...schedule, endMinute: m })}
            disabled={!schedule.enabled}
          />
        </div>
      </div>

      {/* Přestávka a čistý čas */}
      <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/[0.07] pt-4">
        <div className="flex shrink-0 flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-white/45">Přestávka v minutách</label>
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
            className={`h-11 w-[92px] rounded-xl border px-2 text-center text-[15px] font-bold tabular-nums transition-colors ${
              schedule.enabled
                ? 'border-cyan-300/15 bg-[#071a2d]/80 text-white outline-none focus:border-cyan-300/45'
                : 'cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-white/25'
            }`}
          />
        </div>
        {schedule.enabled && (
          <div className="min-w-[88px] shrink-0 pb-1 text-right">
            <p className="text-[11px] font-semibold text-white/40">Čistý čas</p>
            <p className="mt-1 text-[16px] font-bold tabular-nums text-cyan-300">
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

  if (compact) {
    return (
      <article
        data-testid={`operating-room-card-${room.id}`}
        className="overflow-hidden rounded-[18px] border border-cyan-200/[0.15] bg-[#091f35]/65 p-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
      >
        <div className="grid min-w-0 grid-cols-1 gap-2.5 xl:grid-cols-[minmax(230px,0.8fr)_minmax(165px,0.55fr)_minmax(0,2.65fr)] xl:items-stretch">
          <section className="flex min-w-0 items-center gap-3 rounded-[12px] bg-white/[0.025] px-3.5 py-2.5 ring-1 ring-inset ring-white/[0.06]">
            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-[9px] bg-cyan-300/[0.09] text-[10px] font-bold tabular-nums text-cyan-100 ring-1 ring-inset ring-cyan-200/[0.13]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <h3 className="break-words text-[15px] font-bold leading-tight text-white">{room.name}</h3>
              <p className="mt-1 break-words text-[9px] font-semibold uppercase tracking-[0.10em] text-slate-400">
                {room.department || 'Bez oddělení'}
              </p>
            </div>
          </section>

          <section className="flex min-w-0 flex-col justify-center rounded-[12px] bg-cyan-300/[0.055] px-3.5 py-2.5 ring-1 ring-inset ring-cyan-200/[0.10]">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-cyan-200/55">Dnešní provoz</p>
            <p className="mt-1 whitespace-nowrap text-[15px] font-bold tabular-nums tracking-tight text-white">
              {todaySchedule.enabled
                ? `${pad(todaySchedule.startHour)}:${pad(todaySchedule.startMinute)}–${pad(todaySchedule.endHour)}:${pad(todaySchedule.endMinute)}`
                : 'Mimo provoz'}
            </p>
          </section>

          <section className="min-w-0 overflow-x-auto rounded-[12px] bg-black/[0.08] p-1 [scrollbar-width:thin] [scrollbar-color:rgba(103,232,249,0.22)_transparent]">
            <div className="grid min-h-[74px] min-w-[650px] grid-cols-7 grid-rows-2 gap-1">
              {DAYS.map(day => {
                const daySchedule = schedule[day.key as keyof WeeklySchedule];
                const isToday = day.key === currentDayKey;
                return (
                  <div
                    key={`${day.key}-compact-name`}
                    className="flex items-center justify-center rounded-[8px] text-center"
                    style={{
                      background: daySchedule.enabled
                        ? isToday ? 'rgba(34,211,238,0.24)' : 'rgba(30,110,153,0.28)'
                        : 'rgba(255,255,255,0.025)',
                      boxShadow: isToday ? 'inset 0 0 0 1px rgba(103,232,249,0.34)' : 'inset 0 0 0 1px rgba(255,255,255,0.045)',
                    }}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${daySchedule.enabled ? 'text-cyan-50' : 'text-white/30'}`}>
                      {day.short}
                    </span>
                  </div>
                );
              })}
              {DAYS.map(day => {
                const daySchedule = schedule[day.key as keyof WeeklySchedule];
                const isToday = day.key === currentDayKey;
                return (
                  <div
                    key={`${day.key}-compact-time`}
                    className="flex items-center justify-center rounded-[8px] px-1 text-center"
                    style={{
                      background: daySchedule.enabled
                        ? isToday ? 'rgba(10,102,139,0.32)' : 'rgba(10,55,86,0.34)'
                        : 'rgba(255,255,255,0.015)',
                      boxShadow: isToday ? 'inset 0 0 0 1px rgba(103,232,249,0.20)' : 'inset 0 0 0 1px rgba(255,255,255,0.035)',
                    }}
                  >
                    <span className={`whitespace-nowrap text-[10px] font-bold tabular-nums ${daySchedule.enabled ? 'text-white/90' : 'text-white/24'}`}>
                      {daySchedule.enabled
                        ? `${pad(daySchedule.startHour)}:${pad(daySchedule.startMinute)}–${pad(daySchedule.endHour)}:${pad(daySchedule.endMinute)}`
                        : 'Mimo provoz'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid={`operating-room-card-${room.id}`}
      className="group relative flex min-h-[148px] flex-col overflow-hidden rounded-[22px] transition-[border-color,background-color] duration-150 hover:border-cyan-200/30"
      style={{
        background: 'linear-gradient(135deg, rgba(15,43,69,0.66) 0%, rgba(8,28,49,0.63) 52%, rgba(5,21,38,0.68) 100%)',
        border: '1px solid rgba(104,183,230,0.20)',
        boxShadow: '0 12px 30px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.055)',
      }}
    >
      <div className="relative flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-[minmax(205px,0.78fr)_minmax(150px,0.54fr)_minmax(0,2.55fr)_minmax(160px,0.58fr)] xl:items-stretch">
          {/* Identita sálu */}
          <section className="flex min-w-0 flex-col justify-center rounded-[14px] bg-[#0d2943]/48 px-3.5 py-3 ring-1 ring-inset ring-cyan-100/[0.08]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/62">
                Operační sál · {String(index + 1).padStart(2, '0')}
              </span>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusColor }} />
            </div>
            <h3 className="break-words text-[18px] font-bold leading-tight tracking-[-0.02em] text-white">{room.name}</h3>
            <p className="mt-1 break-words text-[10px] font-semibold uppercase tracking-[0.10em] text-slate-400">
              {room.department || 'Bez oddělení'}
            </p>
            <div className="mt-2 flex min-h-7 w-full max-w-full items-center gap-2 rounded-[9px] px-2.5" style={{ background: `${statusColor}12` }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: statusColor }} />
              <p className="truncate text-[9px] font-bold uppercase tracking-[0.08em] text-white/90">{statusLabel}</p>
            </div>
          </section>

          {/* Dnešní provoz */}
          <section className="flex min-w-0 flex-col justify-center overflow-hidden rounded-[14px] bg-cyan-300/[0.055] px-3.5 py-3 ring-1 ring-inset ring-cyan-200/[0.12]">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-200/58">Dnešní provoz</p>
            <p className="mt-1 whitespace-nowrap text-[17px] font-bold tabular-nums tracking-[-0.02em] text-white">
              {todaySchedule.enabled
                ? `${pad(todaySchedule.startHour)}:${pad(todaySchedule.startMinute)}–${pad(todaySchedule.endHour)}:${pad(todaySchedule.endMinute)}`
                : 'Mimo provoz'}
            </p>
            <div className="mt-2.5 flex gap-1.5" aria-label={`Aktivní ${activeDays} ze 7 dnů`}>
              {DAYS.map(day => (
                <span
                  key={day.key}
                  className="h-[3px] flex-1 rounded-full"
                  style={{ background: schedule[day.key as keyof WeeklySchedule].enabled ? '#67E8F9' : 'rgba(255,255,255,0.10)' }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[9px] font-medium text-slate-500">
              <span>Týdenní režim</span>
              <span className="font-bold tabular-nums text-cyan-100/70">{activeDays}/7 dní</span>
            </div>
          </section>

          {/* Kompaktní dvouřádková provozní matice: dny nahoře, odpovídající časy dole */}
          <section
            className="min-w-0 overflow-hidden rounded-[14px] p-1.5"
            style={{
              background: 'linear-gradient(145deg, rgba(17,53,82,0.30), rgba(7,27,47,0.22))',
              boxShadow: 'inset 0 0 0 1px rgba(103,190,239,0.11)',
            }}
          >
            <div className="h-full overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgba(103,232,249,0.25)_transparent]">
              <div className="grid h-full min-h-[102px] min-w-[650px] grid-cols-7 grid-rows-2 gap-1.5">
                {DAYS.map(day => {
                  const daySchedule = schedule[day.key as keyof WeeklySchedule];
                  const isToday = day.key === currentDayKey;
                  return (
                    <div
                      key={`${day.key}-name`}
                      className="relative flex min-w-0 items-center justify-center rounded-[9px] px-2 text-center"
                      style={{
                        background: isToday
                          ? 'linear-gradient(145deg, rgba(27,156,191,0.50), rgba(16,104,151,0.40))'
                          : daySchedule.enabled
                            ? 'linear-gradient(145deg, rgba(31,83,120,0.46), rgba(19,57,88,0.38))'
                            : 'rgba(13,35,57,0.30)',
                        boxShadow: isToday
                          ? 'inset 0 0 0 1px rgba(103,232,249,0.45)'
                          : 'inset 0 0 0 1px rgba(125,189,228,0.11)',
                      }}
                    >
                      <span
                        className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full"
                        style={{ background: daySchedule.enabled ? '#67E8F9' : 'rgba(255,255,255,0.14)' }}
                      />
                      {isToday && (
                        <span className="absolute right-1.5 top-1.5 rounded-md bg-cyan-100/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.08em] text-cyan-50">
                          Dnes
                        </span>
                      )}
                      <p className={`truncate text-[11px] font-bold ${daySchedule.enabled ? 'text-white' : 'text-white/40'}`}>
                        {day.label}
                      </p>
                    </div>
                  );
                })}

                {DAYS.map(day => {
                  const daySchedule = schedule[day.key as keyof WeeklySchedule];
                  const isToday = day.key === currentDayKey;
                  return (
                    <div
                      key={`${day.key}-hours`}
                      className="flex min-w-0 flex-col items-center justify-center rounded-[9px] px-1.5 text-center"
                      style={{
                        background: isToday
                          ? 'linear-gradient(145deg, rgba(13,103,139,0.45), rgba(10,67,105,0.39))'
                          : daySchedule.enabled
                            ? 'linear-gradient(145deg, rgba(12,55,85,0.48), rgba(9,40,67,0.42))'
                            : 'rgba(7,25,43,0.28)',
                        boxShadow: isToday
                          ? 'inset 0 0 0 1px rgba(103,232,249,0.27)'
                          : 'inset 0 0 0 1px rgba(125,189,228,0.08)',
                      }}
                      title={daySchedule.enabled
                        ? `${day.label}: ${pad(daySchedule.startHour)}:${pad(daySchedule.startMinute)}–${pad(daySchedule.endHour)}:${pad(daySchedule.endMinute)}`
                        : `${day.label}: mimo provoz`}
                    >
                      <p className="mb-0.5 text-[7px] font-semibold uppercase tracking-[0.08em] text-white/38">Provozní doba</p>
                      <p className={`whitespace-nowrap text-[11px] font-bold tabular-nums tracking-tight ${daySchedule.enabled ? 'text-cyan-50' : 'text-white/34'}`}>
                        {daySchedule.enabled
                          ? `${pad(daySchedule.startHour)}:${pad(daySchedule.startMinute)}–${pad(daySchedule.endHour)}:${pad(daySchedule.endMinute)}`
                          : 'Mimo provoz'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Správa sálu v pravém boxu */}
          <section className="flex min-w-0 flex-col justify-center rounded-[14px] bg-[#0a2239]/46 p-2.5 ring-1 ring-inset ring-white/[0.075]">
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">Správa sálu</p>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/55" />
            </div>
            <div className="mb-1.5">{reorderControls}</div>
            <button
              type="button"
              onClick={onScheduleEdit}
              className="flex h-8 w-full items-center justify-center gap-2 rounded-[9px] bg-cyan-300/[0.10] px-2.5 text-[9px] font-bold uppercase tracking-[0.07em] text-cyan-50 ring-1 ring-inset ring-cyan-200/[0.15] transition-colors hover:bg-cyan-300/[0.15]"
            >
              <Calendar className="h-3.5 w-3.5" /> Rozvrh
            </button>
            <div className="mt-1.5 grid grid-cols-[1fr_auto] gap-1.5">
              <button
                type="button"
                onClick={onEdit}
                className="flex h-8 items-center justify-center gap-1.5 rounded-[9px] bg-white/[0.035] px-2 text-[9px] font-semibold text-white/65 transition-colors hover:bg-white/[0.07] hover:text-white"
              >
                <Edit2 className="h-3.5 w-3.5" /> Upravit
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Smazat"
                className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/[0.025] text-white/35 transition-colors hover:bg-red-300/[0.10] hover:text-red-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
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
          <div className="flex items-center justify-between gap-0.5 rounded-[9px] bg-black/10 p-0.5 ring-1 ring-inset ring-white/[0.045]">
            <button
              type="button"
              aria-label={`Přetáhnout ${room.name}`}
              {...(reorderEnabled ? attributes : {})}
              {...(reorderEnabled ? listeners : {})}
              disabled={!reorderEnabled}
              className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-[7px] px-2 text-[9px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.055] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <GripVertical className="h-3.5 w-3.5" />
              Přesunout
            </button>
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              aria-label="Posunout nahoru"
              className="flex h-7 w-7 items-center justify-center rounded-[7px] text-slate-400 transition-colors hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              aria-label="Posunout dolů"
              className="flex h-7 w-7 items-center justify-center rounded-[7px] text-slate-400 transition-colors hover:bg-white/[0.055] hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
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
      className="min-h-full w-full pb-8 font-sans"
      style={{
        backgroundImage: 'radial-gradient(rgba(90,153,198,0.075) 0.7px, transparent 0.7px)',
        backgroundSize: '20px 20px',
      }}
    >
      <header className="mb-7">
        <ModulePageHeading icon={Building2} kicker="OR CONTROL" title="OPERAČNÍ" mutedTitle="SÁLY" />
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <p className="text-sm font-medium text-white/64">
            Konfigurace sálů, provozních režimů a týdenních rozvrhů
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-emerald-300/75">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            PROVOZNÍ KONFIGURACE AKTIVNÍ
          </div>
        </div>
      </header>

      <section className="mb-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Celkem sálů', value: stats.total, suffix: 'sálů', color: COLORS.cyan, icon: Building2 },
            { label: 'Dnes v provozu', value: stats.todayOpen, suffix: 'sálů', color: COLORS.green, icon: CalendarDays },
            { label: 'Aktivní provoz', value: stats.activeOperations, suffix: 'sálů', color: COLORS.blue, icon: Activity },
            { label: 'Uzamčeno', value: stats.locked, suffix: 'sálů', color: COLORS.red, icon: LockKeyhole },
            { label: 'Týdenní pokrytí', value: stats.coverage, suffix: '%', color: COLORS.violet, icon: Calendar },
          ].map(({ label, value, suffix, color, icon: Icon }, index) => (
            <div
              key={label}
              className={`relative flex min-h-[100px] items-center gap-4 rounded-[20px] px-4 py-3.5 ${index === 4 ? 'sm:col-span-2 xl:col-span-1' : ''}`}
              style={{
                background: 'linear-gradient(145deg, rgba(18,47,74,0.56), rgba(7,24,42,0.60))',
                border: '1px solid rgba(77,154,211,0.22)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.035)',
              }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                style={{ color, background: `${color}15`, border: `1px solid ${color}2e` }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-400">{label}</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold tabular-nums tracking-tight text-white">{value}</span>
                  <span className="text-[12px] font-medium text-slate-400">{suffix}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="mb-5 flex flex-col gap-2 rounded-[22px] p-2 xl:flex-row xl:items-center"
        style={{
          background: 'rgba(10,31,51,0.58)',
          border: '1px solid rgba(151,184,204,0.20)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
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
                  : { color: 'rgba(255,255,255,0.70)', border: '1px solid transparent' }}
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
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/55" />
          <input
            type="search"
            aria-label="Hledat v operačních sálech"
            placeholder="Hledat název sálu nebo oddělení…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="h-9 w-full rounded-xl border border-white/[0.13] bg-black/20 pl-9 pr-3 text-xs font-medium text-white outline-none transition-colors placeholder:text-white/45 focus:border-cyan-300/40"
          />
        </div>

        <button
          type="button"
          aria-pressed={compactView}
          aria-label="Přepnout kompaktní zobrazení operačních sálů"
          onClick={() => setCompactView(value => !value)}
          className={`flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-[10px] font-bold transition-colors ${
            compactView
              ? 'bg-cyan-300/[0.14] text-cyan-100 ring-1 ring-inset ring-cyan-200/[0.25]'
              : 'bg-white/[0.035] text-white/60 ring-1 ring-inset ring-white/[0.08] hover:bg-white/[0.065] hover:text-white'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Kompaktní
        </button>

        <button
          type="button"
          onClick={() => setIsAddingNew(true)}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-cyan-200 to-cyan-400 px-5 text-xs font-bold text-[#05131c] shadow-[0_8px_22px_rgba(34,211,238,0.18)] transition-colors hover:from-cyan-100 hover:to-cyan-300"
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
          style={{ background: 'rgba(10,23,36,0.94)', border: '1px solid rgba(151,184,204,0.20)' }}
        >
          <DoorOpen className="mb-3 h-9 w-9 text-white/32" />
          <p className="text-sm font-semibold text-white/72">
            {roomsList.length === 0 ? 'Zatím nejsou uložené žádné operační sály' : 'Filtru neodpovídá žádný sál'}
          </p>
          <p className="mt-1 text-xs text-white/50">Upravte filtr nebo přidejte nový operační sál.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredRooms.map(room => room.id)} strategy={rectSortingStrategy}>
            <div className={`grid grid-cols-1 ${compactView ? 'gap-2.5' : 'gap-4'}`}>
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
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {isAddingNew && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020914]/72 p-3 backdrop-blur-sm sm:p-5"
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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#020914]/72 p-3 backdrop-blur-sm sm:p-5"
            onClick={() => setScheduleEditRoom(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-cyan-300/20"
              style={{
                background: 'linear-gradient(160deg, rgba(16,43,69,0.82) 0%, rgba(10,30,52,0.80) 45%, rgba(7,21,38,0.84) 100%)',
                backdropFilter: 'blur(22px) saturate(120%)',
                WebkitBackdropFilter: 'blur(22px) saturate(120%)',
                boxShadow: '0 28px 72px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Modal Header */}
              <div
                className="sticky top-0 z-10 overflow-hidden border-b border-cyan-300/15 p-5 sm:p-6"
                style={{ background: 'rgba(8,25,43,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
              >
                <div className="relative flex items-center gap-4">
                  <div
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[15px]"
                    style={{ background: 'linear-gradient(145deg, rgba(56,189,248,0.24), rgba(34,211,238,0.10))', border: '1px solid rgba(56,189,248,0.28)' }}
                  >
                    <SlidersHorizontal className="relative h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300/65">Týdenní rozvrh</p>
                    <h2 className="truncate text-xl font-bold uppercase tracking-tight text-white">{scheduleEditRoom.name}</h2>
                    <p className="mt-1 text-xs text-white/45">Nastavení provozních hodin a přestávek</p>
                  </div>
                  <button
                    onClick={() => setScheduleEditRoom(null)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-white/55 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 sm:p-6">
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
              <div
                className="sticky bottom-0 flex justify-end gap-2.5 border-t border-cyan-300/15 p-4 sm:p-6"
                style={{ background: 'rgba(8,25,43,0.72)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
              >
                <button
                  onClick={() => setScheduleEditRoom(null)}
                  className="h-11 rounded-xl border border-white/[0.10] bg-white/[0.035] px-5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => {
                    handleUpdateSchedule(scheduleEditRoom.id, scheduleEditRoom.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE);
                    setScheduleEditRoom(null);
                  }}
                  className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-b from-cyan-200 to-cyan-400 px-6 text-sm font-bold text-[#061725] shadow-[0_10px_24px_rgba(34,211,238,0.16)] transition-colors hover:from-cyan-100 hover:to-cyan-300"
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
