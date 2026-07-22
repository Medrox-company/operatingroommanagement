'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LockKeyhole,
  Layers3,
  Loader2,
  Plus,
  Palette,
  RefreshCw,
  Wrench,
  X,
} from 'lucide-react';
import type { OperatingRoom } from '../types';
import { useHospital } from '../contexts/HospitalContext';
import {
  ROOM_SCHEDULE_SYSTEM_OPTIONS,
  roomSpecialtyColor,
  type RoomScheduleAllocationKind,
  type RoomScheduleDayPart,
} from '../lib/room-specialty';

type ViewMode = 'week' | 'month' | 'year';
type RepeatMode = 'single' | 'month' | 'year';

interface Department {
  id: string;
  name: string;
  accent_color: string | null;
}

interface Allocation {
  id: string;
  operating_room_id: string;
  department_id: string | null;
  allocation_date: string;
  day_part: RoomScheduleDayPart;
  allocation_kind: RoomScheduleAllocationKind;
  updated_at: string;
}

interface SelectedCell {
  roomId: string;
  date: string;
  dayPart: RoomScheduleDayPart;
}

const WEEKDAYS = ['PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO', 'NE'];
const DATE_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { month: 'long' });

function localDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function mondayOffset(year: number, month: number) {
  const day = localDate(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function repeatedDateKeys(startKey: string, repeat: RepeatMode) {
  const [year, month, day] = startKey.split('-').map(Number);
  const start = localDate(year, month - 1, day);
  if (repeat === 'single') return [startKey];
  const end = repeat === 'month'
    ? localDate(year, month, 0)
    : localDate(year, 11, 31);
  const keys: string[] = [];
  for (let cursor = start; cursor <= end && keys.length < 54; cursor = addDays(cursor, 7)) {
    keys.push(dateKey(cursor));
  }
  return keys;
}

const RoomSpecialtyScheduleManager: React.FC<{ rooms: OperatingRoom[] }> = ({ rooms }) => {
  const { activeHospitalId } = useHospital();
  const [view, setView] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedAllocationKind, setSelectedAllocationKind] = useState<RoomScheduleAllocationKind>('SPECIALTY');
  const [selectedDayParts, setSelectedDayParts] = useState<RoomScheduleDayPart[]>(['AM']);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('single');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const year = anchorDate.getFullYear();
  const selectedRoom = rooms.find(room => room.id === selectedRoomId) || rooms[0] || null;

  useEffect(() => {
    if (!selectedRoomId && rooms[0]) setSelectedRoomId(rooms[0].id);
    if (selectedRoomId && !rooms.some(room => room.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0]?.id || '');
    }
  }, [rooms, selectedRoomId]);

  const loadYear = useCallback(async (signal?: AbortSignal) => {
    if (!activeHospitalId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/room-specialty-allocations?year=${year}`, {
        credentials: 'include',
        cache: 'no-store',
        signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMigrationRequired(Boolean(payload.migrationRequired));
        throw new Error(payload.error || 'Rozpis se nepodařilo načíst.');
      }
      setMigrationRequired(false);
      setDepartments(Array.isArray(payload.departments) ? payload.departments : []);
      setAllocations(Array.isArray(payload.allocations) ? payload.allocations : []);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(loadError instanceof Error ? loadError.message : 'Rozpis se nepodařilo načíst.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [activeHospitalId, year]);

  useEffect(() => {
    const controller = new AbortController();
    void loadYear(controller.signal);
    return () => controller.abort();
  }, [loadYear]);

  const departmentMap = useMemo(() => new Map(departments.map((department, index) => [
    department.id,
    { ...department, color: roomSpecialtyColor(index) },
  ])), [departments]);

  const allocationMap = useMemo(() => new Map(
    allocations.map(allocation => [`${allocation.operating_room_id}|${allocation.allocation_date}|${allocation.day_part}`, allocation]),
  ), [allocations]);

  const assignedThisYear = allocations.length;
  const uniqueDepartments = new Set(allocations.map(item => item.department_id).filter(Boolean)).size;
  const coverage = rooms.length > 0
    ? Math.min(100, Math.round((allocations.length / (rooms.length * 365 * 2)) * 100))
    : 0;

  const weekStart = startOfWeek(anchorDate);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthDays = daysInMonth(year, anchorDate.getMonth());

  const openAssignment = (roomId: string, date: string, dayPart: RoomScheduleDayPart) => {
    const current = allocationMap.get(`${roomId}|${date}|${dayPart}`);
    setSelectedCell({ roomId, date, dayPart });
    setSelectedDepartmentId(current?.department_id || null);
    setSelectedAllocationKind(current?.allocation_kind || 'SPECIALTY');
    setSelectedDayParts([dayPart]);
    setRepeatMode('single');
  };

  const saveAssignment = async (allocationKind: RoomScheduleAllocationKind | null, departmentId: string | null = null) => {
    if (!selectedCell || saving) return;
    setSaving(true);
    setError(null);
    const affectedDates = repeatedDateKeys(selectedCell.date, repeatMode);
    const affectedParts = selectedDayParts.length > 0 ? selectedDayParts : [selectedCell.dayPart];
    const previous = allocations;
    setAllocations(current => {
      const affected = new Set(affectedDates.flatMap(date => affectedParts.map(part => `${selectedCell.roomId}|${date}|${part}`)));
      const remaining = current.filter(item => !affected.has(`${item.operating_room_id}|${item.allocation_date}|${item.day_part}`));
      if (!allocationKind) return remaining;
      const optimistic = affectedDates.flatMap(date => affectedParts.map(dayPart => ({
        id: `optimistic-${selectedCell.roomId}-${date}-${dayPart}`,
        operating_room_id: selectedCell.roomId,
        department_id: allocationKind === 'SPECIALTY' ? departmentId : null,
        allocation_date: date,
        day_part: dayPart,
        allocation_kind: allocationKind,
        updated_at: new Date().toISOString(),
      })));
      return [...remaining, ...optimistic];
    });
    try {
      const response = await fetch('/api/room-specialty-allocations', {
        method: 'PUT',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedCell.roomId,
          departmentId,
          allocationKind,
          clear: allocationKind === null,
          date: selectedCell.date,
          dayParts: affectedParts,
          repeat: repeatMode,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Rozpis se nepodařilo uložit.');
      setSelectedCell(null);
      window.dispatchEvent(new CustomEvent('roomSpecialtyScheduleChanged'));
      await loadYear();
    } catch (saveError) {
      setAllocations(previous);
      setError(saveError instanceof Error ? saveError.message : 'Rozpis se nepodařilo uložit.');
    } finally {
      setSaving(false);
    }
  };

  const movePeriod = (direction: -1 | 1) => {
    setAnchorDate(current => {
      if (view === 'week') return addDays(current, direction * 7);
      if (view === 'month') return localDate(current.getFullYear(), current.getMonth() + direction, 1);
      return localDate(current.getFullYear() + direction, current.getMonth(), 1);
    });
  };

  const periodTitle = view === 'week'
    ? `${DATE_FORMATTER.format(weekDates[0])} – ${DATE_FORMATTER.format(weekDates[6])}`
    : view === 'month'
      ? MONTH_FORMATTER.format(anchorDate)
      : String(year);

  const renderAllocation = (roomId: string, date: string, dayPart: RoomScheduleDayPart, compact = false) => {
    const allocation = allocationMap.get(`${roomId}|${date}|${dayPart}`);
    const display = allocation
      ? allocation.allocation_kind === 'SPECIALTY'
        ? allocation.department_id ? departmentMap.get(allocation.department_id) : null
        : ROOM_SCHEDULE_SYSTEM_OPTIONS[allocation.allocation_kind]
      : null;
    if (!display) {
      return (
        <div className="flex h-full min-h-0 items-center justify-center text-white/22">
          <Plus className={compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
        </div>
      );
    }
    return (
      <div className="flex h-full min-w-0 items-center gap-1.5" title={display.name}>
        <span className={`shrink-0 rounded-full bg-white/85 ${compact ? 'h-1.5 w-1.5' : 'h-2 w-2'}`} />
        {!compact && <span className="truncate text-[9px] font-bold text-white/95">{display.name}</span>}
      </div>
    );
  };

  const departmentForSlot = (roomId: string, date: string, dayPart: RoomScheduleDayPart) => {
    const allocation = allocationMap.get(`${roomId}|${date}|${dayPart}`);
    if (!allocation) return null;
    if (allocation.allocation_kind !== 'SPECIALTY') return ROOM_SCHEDULE_SYSTEM_OPTIONS[allocation.allocation_kind];
    return allocation.department_id ? departmentMap.get(allocation.department_id) : null;
  };

  const filledSlotStyle = (color: string | undefined, strong = false): React.CSSProperties | undefined => color ? ({
    background: `linear-gradient(135deg, ${color}${strong ? '92' : '78'}, ${color}${strong ? '58' : '3d'})`,
    boxShadow: `inset 0 0 0 1px ${color}${strong ? 'b5' : '96'}`,
  }) : undefined;

  return (
    <div className="min-h-full w-full pb-10 font-sans">
      <header className="mb-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-300/80">OR PLANNING</p>
        </div>
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold uppercase leading-none tracking-tight">
              Rozpis <span className="text-white">sálů</span>
            </h1>
            <p className="mt-3 text-sm font-medium text-white/58">Roční plán operačních oborů podle sálů a kalendářních dnů</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/72">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Odděleno pro aktuální zařízení
          </div>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Operační sály', value: rooms.length, suffix: 'sálů', icon: Building2, color: '#38BDF8' },
          { label: 'Aktivní obory', value: departments.length, suffix: 'oborů', icon: Layers3, color: '#A78BFA' },
          { label: `Přiřazení ${year}`, value: assignedThisYear, suffix: 'bloků', icon: CalendarDays, color: '#34D399' },
          { label: 'Roční pokrytí', value: coverage, suffix: '%', icon: CalendarRange, color: '#FBBF24' },
        ].map(({ label, value, suffix, icon: Icon, color }) => (
          <div key={label} className="flex min-h-[86px] items-center gap-3 rounded-[18px] border border-cyan-100/[0.10] bg-[#0b2944]/55 px-4 py-3 shadow-[0_10px_26px_rgba(0,0,0,0.14)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-slate-400">{label}</p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[23px] font-bold tabular-nums text-white">{value}</span>
                <span className="text-[10px] font-medium text-slate-500">{suffix}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="mb-4 rounded-[20px] border border-white/[0.09] bg-[#081f35]/65 p-2.5">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center">
          <div className="grid grid-cols-3 rounded-[12px] bg-black/15 p-1">
            {(['week', 'month', 'year'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                className={`h-9 rounded-[9px] px-4 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors ${view === mode ? 'bg-cyan-300/[0.14] text-cyan-100 ring-1 ring-inset ring-cyan-200/[0.20]' : 'text-white/40 hover:text-white/70'}`}
              >
                {mode === 'week' ? 'Týden' : mode === 'month' ? 'Měsíc' : 'Rok'}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[12px] bg-white/[0.025] p-1 ring-1 ring-inset ring-white/[0.055]">
            <button type="button" onClick={() => movePeriod(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-white/50 hover:bg-white/[0.06] hover:text-white" aria-label="Předchozí období">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="truncate px-2 text-center text-[12px] font-bold capitalize text-white/90">{periodTitle}</p>
            <button type="button" onClick={() => movePeriod(1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-white/50 hover:bg-white/[0.06] hover:text-white" aria-label="Následující období">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {(view === 'month' || view === 'year') && (
            <select
              value={selectedRoom?.id || ''}
              onChange={event => setSelectedRoomId(event.target.value)}
              className="h-11 min-w-[220px] rounded-[12px] border border-white/[0.08] bg-[#0b263f] px-3 text-[11px] font-semibold text-white outline-none focus:border-cyan-300/30"
              aria-label="Vybrat operační sál"
            >
              {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          )}

          <button type="button" onClick={() => setAnchorDate(new Date())} className="h-11 rounded-[12px] bg-white/[0.035] px-4 text-[10px] font-bold text-white/60 ring-1 ring-inset ring-white/[0.07] hover:text-white">
            Dnes
          </button>
          {departments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLegend(current => !current)}
              className={`flex h-11 w-11 items-center justify-center rounded-[12px] ring-1 ring-inset transition-colors ${showLegend ? 'bg-cyan-300/[0.14] text-cyan-100 ring-cyan-200/[0.24]' : 'bg-white/[0.035] text-white/45 ring-white/[0.07] hover:text-white'}`}
              aria-label={showLegend ? 'Skrýt legendu operačních oborů' : 'Zobrazit legendu operačních oborů'}
              aria-expanded={showLegend}
              aria-controls="room-specialty-legend"
              title="Legenda oborů"
            >
              <Palette className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => void loadYear()} disabled={loading} className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/[0.035] text-white/45 ring-1 ring-inset ring-white/[0.07] hover:text-white disabled:opacity-40" aria-label="Obnovit rozpis">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-[16px] border border-amber-300/15 bg-amber-300/[0.055] p-3.5 text-amber-100/85">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-semibold">{error}</p>
            {migrationRequired && <p className="mt-1 text-[10px] text-white/48">V Supabase SQL Editoru spusťte databázové migrace rozpisu 14 až 16.</p>}
          </div>
        </div>
      )}

      {departments.length > 0 && showLegend && (
        <section id="room-specialty-legend" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[16px] border border-white/[0.06] bg-black/[0.08] px-4 py-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-white/32">Legenda oborů</span>
          {Object.values(ROOM_SCHEDULE_SYSTEM_OPTIONS).map(option => (
            <span key={option.id} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/62">
              <span className="h-2 w-2 rounded-full" style={{ background: option.color }} />
              {option.name}
            </span>
          ))}
          {departments.map((department, index) => (
            <span key={department.id} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/62">
              <span className="h-2 w-2 rounded-full" style={{ background: departmentMap.get(department.id)?.color || roomSpecialtyColor(index) }} />
              {department.name}
            </span>
          ))}
          {uniqueDepartments > 0 && <span className="ml-auto text-[9px] font-semibold text-cyan-100/45">Použito {uniqueDepartments} oborů</span>}
        </section>
      )}

      {error && departments.length === 0 ? null : loading && allocations.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-[22px] border border-white/[0.07] bg-[#071b2e]/60">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300/70" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[22px] border border-white/[0.07] bg-[#071b2e]/60 text-center">
          <Building2 className="h-8 w-8 text-white/24" />
          <p className="mt-3 text-sm font-semibold text-white/65">Nejprve vytvořte alespoň jeden operační sál.</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[22px] border border-white/[0.07] bg-[#071b2e]/60 text-center">
          <Layers3 className="h-8 w-8 text-white/24" />
          <p className="mt-3 text-sm font-semibold text-white/65">Nejsou založené žádné aktivní operační obory.</p>
          <p className="mt-1 text-xs text-white/38">Obory jsou načítány z databázové tabulky departments.</p>
        </div>
      ) : view === 'week' ? (
        <section className="overflow-hidden rounded-[22px] border border-cyan-100/[0.11] bg-[#071c30]/70 shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[220px_repeat(7,minmax(105px,1fr))] gap-px bg-white/[0.055]">
                <div className="flex items-end bg-[#0a2944] px-4 py-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/38">Operační sál</div>
                {weekDates.map((date, index) => {
                  const today = dateKey(date) === dateKey(new Date());
                  return (
                    <div key={dateKey(date)} className={`bg-[#0a2944] px-2 py-3 text-center ${today ? 'bg-cyan-300/[0.10]' : ''}`}>
                      <p className={`text-[9px] font-bold tracking-[0.12em] ${today ? 'text-cyan-200' : 'text-white/40'}`}>{WEEKDAYS[index]}</p>
                      <p className="mt-1 text-[12px] font-bold tabular-nums text-white/85">{date.getDate()}. {date.getMonth() + 1}.</p>
                    </div>
                  );
                })}
                {rooms.map((room, roomIndex) => (
                  <React.Fragment key={room.id}>
                    <div className="flex min-w-0 items-center gap-3 bg-[#09243c] px-4 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-cyan-300/[0.08] text-[9px] font-bold tabular-nums text-cyan-100/80">{String(roomIndex + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <p className="break-words text-[12px] font-bold leading-tight text-white">{room.name}</p>
                        <p className="mt-1 truncate text-[8px] font-semibold uppercase tracking-[0.09em] text-white/35">{room.department}</p>
                      </div>
                    </div>
                    {weekDates.map(date => {
                      const key = dateKey(date);
                      return (
                        <div key={key} className="grid min-h-[76px] min-w-0 grid-cols-2 gap-px bg-white/[0.08]">
                          {(['AM', 'PM'] as RoomScheduleDayPart[]).map(part => {
                            const department = departmentForSlot(room.id, key, part);
                            return (
                              <button
                                key={part}
                                type="button"
                                onClick={() => openAssignment(room.id, key, part)}
                                aria-label={`Upravit rozpis: ${room.name}, ${DATE_FORMATTER.format(date)}, ${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
                                className="relative min-w-0 bg-[#071d31] px-1.5 py-2 text-left transition-[filter,background-color] hover:brightness-110"
                                style={filledSlotStyle(department?.color)}
                              >
                                <span className="absolute right-1 top-1 text-[6px] font-bold uppercase tracking-[0.08em] text-white/45">{part === 'AM' ? 'DOP' : 'ODP'}</span>
                                <div className="h-full pt-2">{renderAllocation(room.id, key, part)}</div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : view === 'month' && selectedRoom ? (
        <section className="rounded-[22px] border border-cyan-100/[0.11] bg-[#071c30]/70 p-3 shadow-[0_16px_34px_rgba(0,0,0,0.16)] sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-[14px] bg-white/[0.025] px-4 py-3 ring-1 ring-inset ring-white/[0.055]">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200/55">Měsíční plán</p>
              <h2 className="mt-1 text-base font-bold text-white">{selectedRoom.name}</h2>
            </div>
            <span className="text-[10px] font-semibold capitalize text-white/42">{MONTH_FORMATTER.format(anchorDate)}</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map(day => <div key={day} className="py-2 text-center text-[9px] font-bold tracking-[0.12em] text-white/35">{day}</div>)}
            {Array.from({ length: mondayOffset(year, anchorDate.getMonth()) }, (_, index) => <div key={`empty-${index}`} />)}
            {Array.from({ length: monthDays }, (_, index) => {
              const date = localDate(year, anchorDate.getMonth(), index + 1);
              const key = dateKey(date);
              const today = key === dateKey(new Date());
              return (
                <div
                  key={key}
                  className={`min-h-[94px] overflow-hidden rounded-[12px] p-1.5 ring-1 ring-inset ${today ? 'bg-cyan-300/[0.08] ring-cyan-200/[0.22]' : 'bg-white/[0.022] ring-white/[0.055]'}`}
                >
                  <span className={`px-1 text-[10px] font-bold tabular-nums ${today ? 'text-cyan-200' : 'text-white/45'}`}>{index + 1}</span>
                  <div className="mt-1 grid h-[60px] grid-cols-2 gap-1">
                    {(['AM', 'PM'] as RoomScheduleDayPart[]).map(part => {
                      const department = departmentForSlot(selectedRoom.id, key, part);
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => openAssignment(selectedRoom.id, key, part)}
                          aria-label={`Upravit rozpis: ${selectedRoom.name}, ${DATE_FORMATTER.format(date)}, ${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
                          className="relative min-w-0 rounded-[8px] bg-black/[0.12] px-1 py-1.5 text-left transition-[filter] hover:brightness-110"
                          style={filledSlotStyle(department?.color)}
                        >
                          <span className="absolute right-1 top-1 text-[6px] font-bold text-white/45">{part === 'AM' ? 'DOP' : 'ODP'}</span>
                          <div className="h-full pt-2">{renderAllocation(selectedRoom.id, key, part)}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : view === 'year' && selectedRoom ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 12 }, (_, month) => {
            const count = daysInMonth(year, month);
            const offset = mondayOffset(year, month);
            return (
              <div key={month} className="rounded-[18px] border border-cyan-100/[0.10] bg-[#071c30]/68 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
                <button type="button" onClick={() => { setAnchorDate(localDate(year, month, 1)); setView('month'); }} className="mb-2.5 flex w-full items-center justify-between rounded-[10px] bg-white/[0.025] px-3 py-2 text-left hover:bg-white/[0.05]">
                  <span className="text-[11px] font-bold capitalize text-white/85">{MONTH_NAME_FORMATTER.format(localDate(year, month, 1))}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/28" />
                </button>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map(day => <span key={day} className="pb-1 text-center text-[7px] font-bold text-white/25">{day}</span>)}
                  {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
                  {Array.from({ length: count }, (_, index) => {
                    const date = localDate(year, month, index + 1);
                    const key = dateKey(date);
                    return (
                      <div key={key} className="relative grid aspect-square min-h-8 grid-cols-2 gap-px overflow-hidden rounded-[7px] bg-white/[0.05] ring-1 ring-inset ring-white/[0.04]">
                        <span className="pointer-events-none absolute inset-x-0 top-0.5 z-10 text-center text-[6px] font-bold tabular-nums text-white/75">{index + 1}</span>
                        {(['AM', 'PM'] as RoomScheduleDayPart[]).map(part => {
                          const department = departmentForSlot(selectedRoom.id, key, part);
                          return (
                            <button
                              key={part}
                              type="button"
                              onClick={() => openAssignment(selectedRoom.id, key, part)}
                              aria-label={`Upravit rozpis: ${selectedRoom.name}, ${DATE_FORMATTER.format(date)}, ${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
                              className="bg-white/[0.018] pt-2 transition-[filter] hover:brightness-110"
                              style={filledSlotStyle(department?.color, true)}
                              title={department ? `${department.name} · ${part === 'AM' ? 'dopoledne' : 'odpoledne'}` : undefined}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020914]/78 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setSelectedCell(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="room-specialty-dialog-title" className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-cyan-100/[0.13] bg-gradient-to-b from-[#0d2a45] to-[#071a2c] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.42)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/55">Přiřazení rozpisu sálu</p>
                <h2 id="room-specialty-dialog-title" className="mt-1.5 text-xl font-bold text-white">{rooms.find(room => room.id === selectedCell.roomId)?.name}</h2>
                <p className="mt-1 text-xs font-medium capitalize text-white/45">{DATE_FORMATTER.format(new Date(`${selectedCell.date}T12:00:00`))}</p>
              </div>
              <button type="button" onClick={() => setSelectedCell(null)} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.035] text-white/45 hover:text-white disabled:opacity-40" aria-label="Zavřít">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Část dne</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { parts: ['AM'] as RoomScheduleDayPart[], title: 'Dopoledne', description: 'DOP' },
                  { parts: ['PM'] as RoomScheduleDayPart[], title: 'Odpoledne', description: 'ODP' },
                  { parts: ['AM', 'PM'] as RoomScheduleDayPart[], title: 'Celý den', description: 'DOP + ODP' },
                ]).map((option) => {
                  const active = option.parts.length === selectedDayParts.length
                    && option.parts.every(part => selectedDayParts.includes(part));
                  return (
                    <button
                      key={option.description}
                      type="button"
                      onClick={() => setSelectedDayParts(option.parts)}
                      className={`rounded-[12px] px-3 py-2.5 text-left ring-1 ring-inset transition-colors ${active ? 'bg-cyan-300/[0.13] ring-cyan-200/[0.28]' : 'bg-white/[0.022] ring-white/[0.055]'}`}
                    >
                      <p className={`text-[10px] font-bold ${active ? 'text-cyan-100' : 'text-white/62'}`}>{option.title}</p>
                      <p className="mt-0.5 text-[8px] font-semibold tracking-[0.12em] text-white/32">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Provozní stav sálu</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['CLOSED', ROOM_SCHEDULE_SYSTEM_OPTIONS.CLOSED, LockKeyhole],
                  ['SERVICE', ROOM_SCHEDULE_SYSTEM_OPTIONS.SERVICE, Wrench],
                ] as const).map(([kind, option, Icon]) => {
                  const active = selectedAllocationKind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => { setSelectedAllocationKind(kind); setSelectedDepartmentId(null); }}
                      className="flex min-h-12 items-center gap-2.5 rounded-[12px] px-3 text-left transition-[filter] hover:brightness-110"
                      style={{
                        background: `linear-gradient(135deg, ${option.color}${active ? '8a' : '54'}, ${option.color}${active ? '52' : '2d'})`,
                        boxShadow: `inset 0 0 0 1px ${option.color}${active ? 'b5' : '70'}`,
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-white/85" />
                      <span className={`min-w-0 flex-1 text-[10px] font-bold ${active ? 'text-white' : 'text-white/65'}`}>{option.name}</span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Operační obor</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {departments.map((department, index) => {
                  const color = departmentMap.get(department.id)?.color || roomSpecialtyColor(index);
                  const active = selectedAllocationKind === 'SPECIALTY' && selectedDepartmentId === department.id;
                  return (
                    <button key={department.id} type="button" onClick={() => { setSelectedAllocationKind('SPECIALTY'); setSelectedDepartmentId(department.id); }} className="flex min-h-12 items-center gap-2.5 rounded-[12px] px-3 text-left transition-[filter] hover:brightness-110" style={{ background: `linear-gradient(135deg, ${color}${active ? '8a' : '54'}, ${color}${active ? '52' : '2d'})`, boxShadow: `inset 0 0 0 1px ${color}${active ? 'b5' : '70'}` }}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/85" />
                      <span className={`min-w-0 flex-1 break-words text-[10px] font-bold ${active ? 'text-white' : 'text-white/58'}`}>{department.name}</span>
                      {active && <Check className="h-3.5 w-3.5 shrink-0" style={{ color }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">Platnost přiřazení</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {([
                  ['single', 'Pouze tento den', 'Jednorázová změna'],
                  ['month', 'Do konce měsíce', 'Opakovat každý týden'],
                  ['year', 'Do konce roku', 'Opakovat každý týden'],
                ] as const).map(([mode, title, description]) => (
                  <button key={mode} type="button" onClick={() => setRepeatMode(mode)} className={`rounded-[12px] px-3 py-2.5 text-left ring-1 ring-inset transition-colors ${repeatMode === mode ? 'bg-violet-300/[0.12] ring-violet-200/[0.25]' : 'bg-white/[0.022] ring-white/[0.055]'}`}>
                    <p className={`text-[10px] font-bold ${repeatMode === mode ? 'text-violet-100' : 'text-white/62'}`}>{title}</p>
                    <p className="mt-0.5 text-[8px] text-white/32">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => void saveAssignment(null)} disabled={saving || !selectedDayParts.some(part => allocationMap.has(`${selectedCell.roomId}|${selectedCell.date}|${part}`))} className="h-10 rounded-[11px] px-4 text-[10px] font-bold text-red-200/65 ring-1 ring-inset ring-red-200/[0.10] hover:bg-red-300/[0.07] disabled:cursor-not-allowed disabled:opacity-25">
                Odebrat přiřazení
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedCell(null)} disabled={saving} className="h-10 flex-1 rounded-[11px] px-4 text-[10px] font-bold text-white/50 ring-1 ring-inset ring-white/[0.07] hover:text-white sm:flex-none">Zrušit</button>
                <button type="button" onClick={() => void saveAssignment(selectedAllocationKind, selectedDepartmentId)} disabled={saving || (selectedAllocationKind === 'SPECIALTY' && !selectedDepartmentId)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[11px] bg-cyan-300 px-5 text-[10px] font-bold text-[#061724] hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Uložit rozpis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSpecialtyScheduleManager;
