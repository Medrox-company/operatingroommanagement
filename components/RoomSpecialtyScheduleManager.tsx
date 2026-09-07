'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Flag,
  LockKeyhole,
  Layers3,
  Loader2,
  Plus,
  Palette,
  RefreshCw,
  Stethoscope,
  Wrench,
  X,
} from 'lucide-react';
import type { OperatingRoom } from '../types';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import ModulePageHeading from './ModulePageHeading';
import {
  ROOM_SCHEDULE_SYSTEM_OPTIONS,
  roomSpecialtyColor,
  type RoomScheduleAllocationKind,
  type RoomScheduleDayPart,
} from '../lib/room-specialty';
import { getCzechPublicHoliday } from '../lib/czech-public-holidays';

type ViewMode = 'week' | 'month' | 'year';
type RepeatMode = 'single' | 'month' | 'year';

interface Department {
  id: string;
  name: string;
  short_code: string;
  description: string | null;
  accent_color: string | null;
  is_active: boolean;
  sort_order: number;
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

interface SchedulePaintDrag {
  source: Allocation;
  sourceDate: string;
  sourceParts: RoomScheduleDayPart[];
  targets: SelectedCell[];
  previous: Allocation[];
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

function brightenSpecialtyColor(color: string, amount = 0.18) {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) + (255 - ((value >> shift) & 255)) * amount);
  return `#${[channel(16), channel(8), channel(0)].map(item => item.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
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
  const [selectedDayParts, setSelectedDayParts] = useState<RoomScheduleDayPart[]>(['AM', 'PM']);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('single');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [paintPreview, setPaintPreview] = useState<Map<string, Allocation>>(() => new Map());
  const paintDragRef = useRef<SchedulePaintDrag | null>(null);

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

  useEffect(() => {
    if (!selectedCell) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setSelectedCell(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saving, selectedCell]);

  useEffect(() => {
    const refresh = () => { void loadYear(); };
    window.addEventListener('operatingSpecialtiesChanged', refresh);
    return () => window.removeEventListener('operatingSpecialtiesChanged', refresh);
  }, [loadYear]);

  useHospitalRealtime('departments', () => {
    void loadYear();
  });

  const departmentMap = useMemo(() => new Map(departments.map((department, index) => [
    department.id,
    { ...department, color: brightenSpecialtyColor(department.accent_color || roomSpecialtyColor(index)) },
  ])), [departments]);
  const activeDepartments = useMemo(() => departments.filter(department => department.is_active), [departments]);

  const allocationMap = useMemo(() => new Map(
    allocations.map(allocation => [`${allocation.operating_room_id}|${allocation.allocation_date}|${allocation.day_part}`, allocation]),
  ), [allocations]);
  const displayedAllocationMap = useMemo(() => {
    const displayed = new Map(allocationMap);
    paintPreview.forEach((allocation, key) => displayed.set(key, allocation));
    return displayed;
  }, [allocationMap, paintPreview]);

  const beginSchedulePaint = (event: React.PointerEvent<HTMLButtonElement>, roomId: string, date: string, dayPart: RoomScheduleDayPart) => {
    if (event.button !== 2 || saving) return;
    const source = allocationMap.get(`${roomId}|${date}|${dayPart}`);
    if (!source) return;
    event.preventDefault();
    const otherPart: RoomScheduleDayPart = dayPart === 'AM' ? 'PM' : 'AM';
    const paired = allocationMap.get(`${roomId}|${date}|${otherPart}`);
    const sourceParts: RoomScheduleDayPart[] = paired
      && paired.allocation_kind === source.allocation_kind
      && paired.department_id === source.department_id
      ? ['AM', 'PM']
      : [dayPart];
    paintDragRef.current = { source, sourceDate: date, sourceParts, targets: [], previous: allocations };
    setPaintPreview(new Map());
  };

  const extendSchedulePaint = (event: React.PointerEvent<HTMLButtonElement>, roomId: string, targetDate: string) => {
    const drag = paintDragRef.current;
    if (!drag || drag.source.operating_room_id !== roomId || (event.buttons & 2) !== 2) return;
    event.preventDefault();
    const from = new Date(`${drag.sourceDate}T12:00:00`);
    const to = new Date(`${targetDate}T12:00:00`);
    const direction = from <= to ? 1 : -1;
    const targets: SelectedCell[] = [];
    for (let cursor = new Date(from); direction > 0 ? cursor <= to : cursor >= to; cursor = addDays(cursor, direction)) {
      const currentDate = dateKey(cursor);
      if (currentDate === drag.sourceDate) continue;
      drag.sourceParts.forEach(part => targets.push({ roomId, date: currentDate, dayPart: part }));
    }
    drag.targets = targets;
    const preview = new Map<string, Allocation>();
    targets.forEach(target => {
      const key = `${target.roomId}|${target.date}|${target.dayPart}`;
      preview.set(key, {
        ...drag.source,
        id: `paint-${key}`,
        allocation_date: target.date,
        day_part: target.dayPart,
        updated_at: new Date().toISOString(),
      });
    });
    setPaintPreview(preview);
  };

  const finishSchedulePaint = useCallback(async () => {
    const drag = paintDragRef.current;
    paintDragRef.current = null;
    if (!drag || drag.targets.length === 0) {
      setPaintPreview(new Map());
      return;
    }
    const uniqueTargets = Array.from(new Map(drag.targets.map(target => [`${target.roomId}|${target.date}|${target.dayPart}`, target])).values());
    setSaving(true);
    setError(null);
    setAllocations(current => {
      const affected = new Set(uniqueTargets.map(target => `${target.roomId}|${target.date}|${target.dayPart}`));
      const remaining = current.filter(item => !affected.has(`${item.operating_room_id}|${item.allocation_date}|${item.day_part}`));
      const optimistic = uniqueTargets.map(target => ({
        ...drag.source,
        id: `optimistic-paint-${target.roomId}-${target.date}-${target.dayPart}`,
        operating_room_id: target.roomId,
        allocation_date: target.date,
        day_part: target.dayPart,
        updated_at: new Date().toISOString(),
      }));
      return [...remaining, ...optimistic];
    });
    setPaintPreview(new Map());
    try {
      const response = await fetch('/api/room-specialty-allocations', {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: drag.source.department_id,
          allocationKind: drag.source.allocation_kind,
          targets: uniqueTargets,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Rozpis se nepodařilo hromadně uložit.');
      window.dispatchEvent(new CustomEvent('roomSpecialtyScheduleChanged'));
      await loadYear();
    } catch (saveError) {
      setAllocations(drag.previous);
      setError(saveError instanceof Error ? saveError.message : 'Rozpis se nepodařilo hromadně uložit.');
    } finally {
      setSaving(false);
    }
  }, [loadYear]);

  useEffect(() => {
    const finish = () => { void finishSchedulePaint(); };
    window.addEventListener('pointerup', finish);
    window.addEventListener('blur', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('blur', finish);
    };
  }, [finishSchedulePaint]);

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
    setSelectedDayParts(['AM', 'PM']);
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
    const allocation = displayedAllocationMap.get(`${roomId}|${date}|${dayPart}`);
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
    const displayCode = 'short_code' in display ? display.short_code : display.name;
    const displayName = 'short_code' in display ? display.name : null;
    return (
      <div className="flex h-full min-w-0 items-center justify-center" title={display.name}>
        {!compact && (
          <span className="block min-w-0 flex-1 text-center">
            <span className="block break-words text-[14px] font-black uppercase leading-[1.05] tracking-[0.055em] text-white drop-shadow-sm">
              {displayCode}
            </span>
            {displayName && (
              <span className="mt-1 block break-words text-[7px] font-semibold leading-[1.15] text-white/88">
                {displayName}
              </span>
            )}
          </span>
        )}
      </div>
    );
  };

  const departmentForSlot = (roomId: string, date: string, dayPart: RoomScheduleDayPart) => {
    const allocation = displayedAllocationMap.get(`${roomId}|${date}|${dayPart}`);
    if (!allocation) return null;
    if (allocation.allocation_kind !== 'SPECIALTY') return ROOM_SCHEDULE_SYSTEM_OPTIONS[allocation.allocation_kind];
    return allocation.department_id ? departmentMap.get(allocation.department_id) : null;
  };

  const filledSlotStyle = (color: string | undefined, strong = false): React.CSSProperties | undefined => color ? ({
    backgroundColor: `${color}${strong ? '82' : '52'}`,
    boxShadow: strong
      ? `inset 0 0 0 1px ${color}E0, inset 0 1px 0 rgba(255,255,255,0.20)`
      : 'inset 0 0 0 1px rgba(255,255,255,0.13), inset 0 1px 0 rgba(255,255,255,0.11)',
  }) : undefined;

  const selectedCellHoliday = selectedCell
    ? getCzechPublicHoliday(new Date(`${selectedCell.date}T12:00:00`))
    : null;
  const selectedDepartment = selectedDepartmentId ? departmentMap.get(selectedDepartmentId) : null;
  const selectedAssignment = selectedAllocationKind === 'SPECIALTY'
    ? selectedDepartment
    : ROOM_SCHEDULE_SYSTEM_OPTIONS[selectedAllocationKind];
  const selectedAssignmentColor = selectedAssignment?.color ?? '#22D3EE';
  const selectedAssignmentCode = selectedAllocationKind === 'SPECIALTY' ? selectedDepartment?.short_code : null;
  const selectedDayLabel = selectedDayParts.length === 2
    ? 'Celý den'
    : selectedDayParts[0] === 'PM' ? 'Odpoledne' : 'Dopoledne';

  return (
    <div className="statistics-module min-h-full w-full pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={CalendarRange} kicker="OR PLANNING" title="ROZPIS" mutedTitle="SÁLŮ" />
      </header>

      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {[
            { label: 'Operační sály', value: rooms.length, suffix: 'sálů', icon: Building2, color: '#38BDF8' },
            { label: 'Aktivní obory', value: activeDepartments.length, suffix: 'oborů', icon: Layers3, color: '#A78BFA' },
            { label: `Přiřazení ${year}`, value: assignedThisYear, suffix: 'bloků', icon: CalendarDays, color: '#34D399' },
            { label: 'Roční pokrytí', value: coverage, suffix: '%', icon: CalendarRange, color: '#FBBF24' },
          ].map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label} className="relative flex h-[68px] w-[112px] shrink-0 items-center overflow-hidden rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[128px]">
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

          <div className="w-[104px] shrink-0">
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Plánovací období</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Rozpis bloků</p>
          </div>

          <div className="grid shrink-0 grid-cols-3 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
            {(['week', 'month', 'year'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                className={`h-8 rounded-md px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${view === mode ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
              >
                {mode === 'week' ? 'Týden' : mode === 'month' ? 'Měsíc' : 'Rok'}
              </button>
            ))}
          </div>

          <div className="flex h-10 w-[190px] shrink-0 items-center justify-between gap-1 rounded-lg border border-white/[0.055] bg-black/10 p-1">
            <button type="button" onClick={() => movePeriod(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.05] hover:text-white" aria-label="Předchozí období">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="truncate px-2 text-center text-[11px] font-semibold capitalize text-white/88">{periodTitle}</p>
            <button type="button" onClick={() => movePeriod(1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.05] hover:text-white" aria-label="Následující období">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {(view === 'month' || view === 'year') && (
            <select
              value={selectedRoom?.id || ''}
              onChange={event => setSelectedRoomId(event.target.value)}
              className="h-10 w-[180px] shrink-0 rounded-lg border border-white/[0.07] bg-[#10182a] px-3 text-[9px] font-semibold text-white/78 outline-none focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
              aria-label="Vybrat operační sál"
            >
              {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          )}

          <button type="button" onClick={() => setAnchorDate(new Date())} className="h-10 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/52 hover:text-white">
            Dnes
          </button>
          {activeDepartments.length > 0 && (
            <button
              type="button"
              onClick={() => setShowLegend(current => !current)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border ${showLegend ? 'border-cyan-200/[0.20] bg-cyan-300/[0.10] text-cyan-100' : 'border-white/[0.06] bg-white/[0.025] text-white/42 hover:text-white'}`}
              aria-label={showLegend ? 'Skrýt legendu operačních oborů' : 'Zobrazit legendu operačních oborů'}
              aria-expanded={showLegend}
              aria-controls="room-specialty-legend"
              title="Legenda oborů"
            >
              <Palette className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => void loadYear()} disabled={loading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-white/42 hover:text-white disabled:opacity-40" aria-label="Obnovit rozpis">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] p-3.5 text-amber-100/85">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div>
            <p className="text-xs font-semibold">{error}</p>
            {migrationRequired && <p className="mt-1 text-[10px] text-white/48">V Supabase SQL Editoru spusťte databázové migrace rozpisu 14 až 16.</p>}
          </div>
        </div>
      )}

      {activeDepartments.length > 0 && showLegend && (
        <section id="room-specialty-legend" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.13em] text-white/32">Legenda oborů</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-100/70">
            <Flag className="h-3 w-3 text-amber-300" aria-hidden="true" />
            Svátek · den pracovního klidu
          </span>
          {Object.values(ROOM_SCHEDULE_SYSTEM_OPTIONS).map(option => (
            <span key={option.id} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/62">
              <span className="h-2 w-2 rounded-full" style={{ background: option.color }} />
              {option.name}
            </span>
          ))}
          {activeDepartments.map((department, index) => (
            <span key={department.id} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-white/62">
              <span className="h-2 w-2 rounded-full" style={{ background: departmentMap.get(department.id)?.color || roomSpecialtyColor(index) }} />
              {department.name}
            </span>
          ))}
          {uniqueDepartments > 0 && <span className="ml-auto text-[9px] font-semibold text-cyan-100/45">Použito {uniqueDepartments} oborů</span>}
        </section>
      )}

      {error && departments.length === 0 ? null : loading && allocations.length === 0 ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-300/70" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-center">
          <Building2 className="h-8 w-8 text-white/24" />
          <p className="mt-3 text-sm font-semibold text-white/65">Nejprve vytvořte alespoň jeden operační sál.</p>
        </div>
      ) : activeDepartments.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] text-center">
          <Layers3 className="h-8 w-8 text-white/24" />
          <p className="mt-3 text-sm font-semibold text-white/65">Nejsou založené žádné aktivní operační obory.</p>
          <p className="mt-1 text-xs text-white/38">Přidejte nebo aktivujte obor v Nastavení → Operační obory.</p>
        </div>
      ) : view === 'week' ? (
        <section className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <div className="flex flex-col justify-between gap-2 border-b border-white/[0.055] px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white/95">Týdenní rozpis sálů</h2>
              <p className="mt-0.5 text-[10px] text-white/50">Kliknutím na blok upravíte obor nebo provozní stav</p>
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-[0.13em] text-white/28">Pravým tažením kopírovat · DOP / ODP</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[220px_repeat(7,minmax(105px,1fr))] bg-transparent">
                <div className="flex items-end border-b border-r border-white/[0.055] bg-white/[0.035] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/38">Operační sál</div>
                {weekDates.map((date, index) => {
                  const today = dateKey(date) === dateKey(new Date());
                  const holiday = getCzechPublicHoliday(date);
                  return (
                    <div
                      key={dateKey(date)}
                      title={holiday?.name}
                      className={`border-b border-r px-2 py-2.5 text-center ${holiday ? 'border-amber-300/[0.16] bg-amber-300/[0.075]' : today ? 'border-white/[0.055] bg-cyan-300/[0.08]' : 'border-white/[0.055] bg-white/[0.035]'}`}
                    >
                      <p className={`text-[9px] font-semibold tracking-[0.12em] ${holiday ? 'text-amber-200' : today ? 'text-cyan-200' : 'text-white/40'}`}>{WEEKDAYS[index]}</p>
                      <p className={`mt-1 text-[12px] font-semibold tabular-nums ${holiday ? 'text-amber-100' : 'text-white/82'}`}>{date.getDate()}. {date.getMonth() + 1}.</p>
                      {holiday && (
                        <p className="mt-1 flex items-center justify-center gap-1 text-[6px] font-bold uppercase tracking-[0.1em] text-amber-200/70">
                          <Flag className="h-2 w-2" aria-hidden="true" />
                          Svátek
                        </p>
                      )}
                    </div>
                  );
                })}
                {rooms.map((room, roomIndex) => (
                  <React.Fragment key={room.id}>
                    <div className="flex min-w-0 items-center gap-3 border-b border-r border-white/[0.055] bg-white/[0.028] px-4 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-200/[0.10] bg-cyan-300/[0.055] text-[9px] font-semibold tabular-nums text-cyan-100/75">{String(roomIndex + 1).padStart(2, '0')}</span>
                      <div className="min-w-0">
                        <p className="break-words text-[12px] font-semibold leading-tight text-white/92">{room.name}</p>
                        <p className="mt-1 truncate text-[8px] font-medium uppercase tracking-[0.09em] text-white/32">{room.department}</p>
                      </div>
                    </div>
                    {weekDates.map(date => {
                      const key = dateKey(date);
                      const holiday = getCzechPublicHoliday(date);
                      return (
                        <div key={key} title={holiday?.name} className={`grid min-h-[76px] min-w-0 grid-cols-2 border-b border-r border-white/[0.055] ${holiday ? 'bg-amber-300/[0.025]' : 'bg-transparent'}`}>
                          {(['AM', 'PM'] as RoomScheduleDayPart[]).map(part => {
                            const department = departmentForSlot(room.id, key, part);
                            return (
                              <button
                                key={part}
                                type="button"
                                onClick={() => openAssignment(room.id, key, part)}
                                onPointerDown={event => beginSchedulePaint(event, room.id, key, part)}
                                onPointerEnter={event => extendSchedulePaint(event, room.id, key)}
                                onContextMenu={event => event.preventDefault()}
                                aria-label={`Upravit rozpis: ${room.name}, ${DATE_FORMATTER.format(date)}, ${holiday ? `${holiday.name}, ` : ''}${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
                                className={`relative min-w-0 select-none bg-transparent px-1.5 py-2 text-left hover:bg-white/[0.04] hover:brightness-110 ${part === 'AM' ? 'border-r border-white/[0.055]' : ''}`}
                                style={filledSlotStyle(department?.color)}
                              >
                                <span className="absolute right-1 top-1 text-[6px] font-bold uppercase tracking-[0.08em] text-white/45">{part === 'AM' ? 'DOP' : 'ODP'}</span>
                                <div className="h-full px-1 pt-2">{renderAllocation(room.id, key, part)}</div>
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
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/[0.055] px-1 pb-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200/55">Měsíční plán</p>
              <h2 className="mt-1 text-[15px] font-semibold text-white/95">{selectedRoom.name}</h2>
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
              const holiday = getCzechPublicHoliday(date);
              return (
                <div
                  key={key}
                  title={holiday?.name}
                  className={`relative min-h-[94px] overflow-hidden rounded-lg border p-1.5 ${holiday ? 'border-amber-300/[0.22] bg-amber-300/[0.065]' : today ? 'border-cyan-200/[0.20] bg-cyan-300/[0.065]' : 'border-white/[0.055] bg-white/[0.018]'}`}
                >
                  <span className={`px-1 text-[10px] font-bold tabular-nums ${holiday ? 'text-amber-200' : today ? 'text-cyan-200' : 'text-white/45'}`}>{index + 1}</span>
                  {holiday && <Flag className="absolute right-1.5 top-1.5 h-2.5 w-2.5 text-amber-300/80" aria-hidden="true" />}
                  <div className="mt-1 grid h-[60px] grid-cols-2 gap-1">
                    {(['AM', 'PM'] as RoomScheduleDayPart[]).map(part => {
                      const department = departmentForSlot(selectedRoom.id, key, part);
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => openAssignment(selectedRoom.id, key, part)}
                          onPointerDown={event => beginSchedulePaint(event, selectedRoom.id, key, part)}
                          onPointerEnter={event => extendSchedulePaint(event, selectedRoom.id, key)}
                          onContextMenu={event => event.preventDefault()}
                          aria-label={`Upravit rozpis: ${selectedRoom.name}, ${DATE_FORMATTER.format(date)}, ${holiday ? `${holiday.name}, ` : ''}${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
                          className="relative min-w-0 select-none rounded-md bg-black/10 px-1 py-1.5 text-left hover:brightness-110"
                          style={filledSlotStyle(department?.color)}
                        >
                          <span className="absolute right-1 top-1 text-[6px] font-bold text-white/45">{part === 'AM' ? 'DOP' : 'ODP'}</span>
                          <div className="h-full px-0.5 pt-2">{renderAllocation(selectedRoom.id, key, part)}</div>
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
              <div key={month} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                <button type="button" onClick={() => { setAnchorDate(localDate(year, month, 1)); setView('month'); }} className="mb-2.5 flex w-full items-center justify-between rounded-lg border border-white/[0.045] bg-white/[0.018] px-3 py-2 text-left hover:bg-white/[0.04]">
                  <span className="text-[11px] font-semibold capitalize text-white/85">{MONTH_NAME_FORMATTER.format(localDate(year, month, 1))}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/28" />
                </button>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAYS.map(day => <span key={day} className="pb-1 text-center text-[7px] font-bold text-white/25">{day}</span>)}
                  {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
                  {Array.from({ length: count }, (_, index) => {
                    const date = localDate(year, month, index + 1);
                    const key = dateKey(date);
                    const holiday = getCzechPublicHoliday(date);
                    return (
                      <div key={key} title={holiday?.name} className={`relative grid aspect-square min-h-8 grid-cols-2 gap-px overflow-hidden rounded-[7px] ring-1 ring-inset ${holiday ? 'bg-amber-300/[0.10] ring-amber-300/30' : 'bg-white/[0.05] ring-white/[0.04]'}`}>
                        <span className={`pointer-events-none absolute inset-x-0 top-0.5 z-10 text-center text-[6px] font-bold tabular-nums ${holiday ? 'text-amber-100' : 'text-white/75'}`}>{index + 1}</span>
                        {holiday && <span className="pointer-events-none absolute right-1 top-1 z-10 h-1 w-1 rounded-full bg-amber-300" aria-hidden="true" />}
                        {(['AM', 'PM'] as RoomScheduleDayPart[]).map(part => {
                          const department = departmentForSlot(selectedRoom.id, key, part);
                          return (
                            <button
                              key={part}
                              type="button"
                              onClick={() => openAssignment(selectedRoom.id, key, part)}
                              onPointerDown={event => beginSchedulePaint(event, selectedRoom.id, key, part)}
                              onPointerEnter={event => extendSchedulePaint(event, selectedRoom.id, key)}
                              onContextMenu={event => event.preventDefault()}
                              aria-label={`Upravit rozpis: ${selectedRoom.name}, ${DATE_FORMATTER.format(date)}, ${holiday ? `${holiday.name}, ` : ''}${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
                              className="select-none bg-white/[0.018] pt-2 transition-[filter] hover:brightness-110"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
          <button type="button" tabIndex={-1} aria-label="Zavřít rozpis sálu" className="staff-picker-backdrop absolute inset-0 cursor-default" onClick={() => { if (!saving) setSelectedCell(null); }} />
          <div role="dialog" aria-modal="true" aria-labelledby="room-specialty-dialog-title" className="staff-picker-dialog room-schedule-dialog relative flex max-h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl">
            <header className="staff-picker-header flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/[0.08]">
                  <CalendarRange className="h-5 w-5 text-cyan-200/80" strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/65">Přiřazení rozpisu sálu</p>
                  <h2 id="room-specialty-dialog-title" className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">{rooms.find(room => room.id === selectedCell.roomId)?.name}</h2>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedCell(null)} disabled={saving} className="staff-picker-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:opacity-40" aria-label="Zavřít rozpis sálu">
                <X className="h-4 w-4 text-white/65" />
              </button>
            </header>

            <div className="staff-picker-current-bar flex shrink-0 items-center gap-3 px-4 py-3 sm:px-5">
              <div className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-md border px-2 text-[11px] font-black tracking-[0.05em]" style={{ color: selectedAssignmentColor, borderColor: `${selectedAssignmentColor}72`, background: `${selectedAssignmentColor}30` }}>
                {selectedAssignmentCode || <Stethoscope className="h-4 w-4" strokeWidth={1.8} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38">Aktuální volba · {selectedDayLabel}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white/90">{selectedAssignment?.name || 'Vyberte operační obor'}</p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold capitalize text-white/75">{DATE_FORMATTER.format(new Date(`${selectedCell.date}T12:00:00`))}</p>
                <p className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-white/30">Plánovaný provoz</p>
              </div>
            </div>

            <div className="room-schedule-dialog-body min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
              {selectedCellHoliday && (
                <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-300/[0.16] bg-amber-300/[0.055] px-3 py-2 text-[9px] font-semibold leading-relaxed text-amber-100/80">
                  <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                  <span>{selectedCellHoliday.name}<span className="ml-1.5 text-amber-200/45">· {selectedCellHoliday.kind === 'state' ? 'státní svátek' : 'ostatní svátek'}</span></span>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07]">
                    <div className="flex items-center justify-between bg-[#0c1325]/90 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Část dne</p>
                      <p className="text-[8px] text-white/25">Jeden nebo oba bloky</p>
                    </div>
                    <div className="grid grid-cols-3 gap-px">
                      {([
                        { parts: ['AM'] as RoomScheduleDayPart[], title: 'Dopoledne', description: 'DOP' },
                        { parts: ['PM'] as RoomScheduleDayPart[], title: 'Odpoledne', description: 'ODP' },
                        { parts: ['AM', 'PM'] as RoomScheduleDayPart[], title: 'Celý den', description: 'DOP + ODP' },
                      ]).map(option => {
                        const active = option.parts.length === selectedDayParts.length && option.parts.every(part => selectedDayParts.includes(part));
                        return (
                          <button key={option.description} type="button" onClick={() => setSelectedDayParts(option.parts)} className={`min-h-13 px-2.5 py-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/60 ${active ? 'bg-cyan-300/[0.14]' : 'bg-[#0c1325]/90 hover:bg-white/[0.055]'}`}>
                            <span className={`block truncate text-[10px] font-bold ${active ? 'text-cyan-100' : 'text-white/65'}`}>{option.title}</span>
                            <span className="mt-0.5 block text-[8px] font-semibold tracking-[0.12em] text-white/30">{option.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07]">
                    <div className="flex items-center justify-between bg-[#0c1325]/90 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Provozní stav sálu</p>
                      <p className="text-[8px] text-white/25">Mimo běžný provoz</p>
                    </div>
                    <div className="staff-picker-grid grid grid-cols-2 gap-px">
                    {([
                      ['CLOSED', ROOM_SCHEDULE_SYSTEM_OPTIONS.CLOSED, LockKeyhole],
                      ['SERVICE', ROOM_SCHEDULE_SYSTEM_OPTIONS.SERVICE, Wrench],
                    ] as const).map(([kind, option, Icon]) => {
                      const active = selectedAllocationKind === kind;
                      return (
                        <button key={kind} type="button" onClick={() => { setSelectedAllocationKind(kind); setSelectedDepartmentId(null); }} className={`flex min-h-14 items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.055] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/60 ${active ? 'bg-white/[0.055]' : 'bg-[#0c1325]/90'}`}>
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border" style={{ color: option.color, borderColor: `${option.color}58`, background: `${option.color}22` }}><Icon className="h-3.5 w-3.5" /></span>
                          <span className={`min-w-0 truncate text-[10px] font-semibold ${active ? 'text-white' : 'text-white/68'}`}>{option.name}</span>
                          {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0" style={{ color: option.color }} />}
                        </button>
                      );
                    })}
                    </div>
                  </section>
                </div>

                  <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07]">
                    <div className="flex items-center justify-between bg-[#0c1325]/90 px-3 py-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Operační obor</p>
                      <p className="text-[9px] text-white/28">{activeDepartments.length} aktivních</p>
                    </div>
                    {activeDepartments.length > 0 ? (
                      <div role="radiogroup" aria-label="Vybrat operační obor" className="grid grid-cols-2 gap-px bg-white/[0.07] sm:grid-cols-3 lg:grid-cols-5">
                        {activeDepartments.map((department, index) => {
                          const color = departmentMap.get(department.id)?.color || roomSpecialtyColor(index);
                          const active = selectedAllocationKind === 'SPECIALTY' && selectedDepartmentId === department.id;
                          return (
                            <button
                              key={department.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              aria-label={`${department.short_code} — ${department.name}`}
                              title={`${department.name}${department.description ? ` · ${department.description}` : ''}`}
                              onClick={() => { setSelectedAllocationKind('SPECIALTY'); setSelectedDepartmentId(department.id); }}
                              className="group relative min-h-[52px] min-w-0 px-2.5 py-2 text-left transition-[filter,box-shadow,background-color] hover:brightness-110 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70"
                              style={{
                                backgroundColor: `${color}${active ? '82' : '52'}`,
                                boxShadow: active
                                  ? `inset 0 0 0 1px ${color}E0, inset 0 1px 0 rgba(255,255,255,0.20)`
                                  : 'inset 0 1px 0 rgba(255,255,255,0.13)',
                              }}
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="block min-w-0">
                                  <span className="block text-[10px] font-black uppercase leading-none tracking-[0.08em] text-white">
                                    {department.short_code}
                                  </span>
                                  <span className="mt-1 block whitespace-normal break-words text-[9px] font-semibold leading-[1.25] text-white/90">
                                    {department.name}
                                  </span>
                                </span>
                                <span
                                  aria-hidden="true"
                                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors ${active ? 'border-white/80 bg-white text-slate-900' : 'border-white/40 bg-white/10 text-transparent group-hover:border-white/65'}`}
                                >
                                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-14 items-center justify-center bg-[#0c1325]/90 text-[9px] font-semibold text-white/35">Nejsou dostupné žádné aktivní obory</div>
                    )}
                  </section>

                  <section className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.07]">
                    <div className="bg-[#0c1325]/90 px-3 py-2"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/40">Platnost přiřazení</p></div>
                    <div className="grid grid-cols-3 gap-px">
                      {([
                        ['single', 'Tento den', 'Jednorázově'],
                        ['month', 'Do konce měsíce', 'Každý týden'],
                        ['year', 'Do konce roku', 'Každý týden'],
                      ] as const).map(([mode, title, description]) => (
                        <button key={mode} type="button" onClick={() => setRepeatMode(mode)} className={`min-h-14 px-2.5 py-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-300/60 ${repeatMode === mode ? 'bg-violet-300/[0.14]' : 'bg-[#0c1325]/90 hover:bg-white/[0.055]'}`}><span className={`block text-[10px] font-bold leading-tight ${repeatMode === mode ? 'text-violet-100' : 'text-white/65'}`}>{title}</span><span className="mt-0.5 block text-[8px] text-white/30">{description}</span></button>
                      ))}
                    </div>
                  </section>
              </div>
            </div>

            <footer className="staff-picker-footer flex shrink-0 flex-col-reverse gap-2 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <button type="button" onClick={() => void saveAssignment(null)} disabled={saving || !selectedDayParts.some(part => allocationMap.has(`${selectedCell.roomId}|${selectedCell.date}|${part}`))} className="h-10 rounded-md border border-red-500/15 px-4 text-[9px] font-semibold uppercase tracking-[0.1em] text-red-300/65 transition-colors hover:bg-red-500/[0.07] disabled:cursor-not-allowed disabled:opacity-25">Odebrat přiřazení</button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedCell(null)} disabled={saving} className="h-10 flex-1 rounded-md px-4 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/45 transition-colors hover:bg-white/5 hover:text-white/75 sm:flex-none">Zrušit</button>
                <button type="button" onClick={() => void saveAssignment(selectedAllocationKind, selectedDepartmentId)} disabled={saving || (selectedAllocationKind === 'SPECIALTY' && !selectedDepartmentId)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-cyan-300 px-5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#061724] transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Uložit rozpis</button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSpecialtyScheduleManager;
