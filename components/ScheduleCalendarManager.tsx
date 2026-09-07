'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Flag,
  Layers3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { OperatingRoom } from '../types';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import {
  ROOM_SCHEDULE_SYSTEM_OPTIONS,
  roomSpecialtyColor,
  type RoomScheduleAllocationKind,
  type RoomScheduleDayPart,
} from '../lib/room-specialty';
import { getCzechPublicHoliday } from '../lib/czech-public-holidays';
import ModulePageHeading from './ModulePageHeading';

interface Department {
  id: string;
  name: string;
  short_code: string;
  accent_color: string | null;
  is_active: boolean;
}

interface Allocation {
  id: string;
  operating_room_id: string;
  department_id: string | null;
  allocation_date: string;
  day_part: RoomScheduleDayPart;
  allocation_kind: RoomScheduleAllocationKind;
}

interface ScheduleDisplay {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface DayRoomSchedule {
  room: OperatingRoom;
  slots: Partial<Record<RoomScheduleDayPart, Allocation>>;
}

interface ScheduleCalendarManagerProps {
  rooms: OperatingRoom[];
}

const WEEKDAYS = ['PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO', 'NE'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
const DATE_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function localDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mondayOffset(year: number, month: number) {
  return (localDate(year, month, 1).getDay() + 6) % 7;
}

function shortSystemCode(kind: RoomScheduleAllocationKind) {
  if (kind === 'CLOSED') return 'UZAVŘENO';
  if (kind === 'SERVICE') return 'SERVIS';
  return '';
}

const ScheduleCalendarManager: React.FC<ScheduleCalendarManagerProps> = ({ rooms }) => {
  const now = useMemo(() => new Date(), []);
  const { activeHospitalId } = useHospital();
  const [cursor, setCursor] = useState(() => localDate(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(now));
  const [selectedRoomId, setSelectedRoomId] = useState('all');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const loadSchedule = useCallback(async () => {
    if (!activeHospitalId) {
      setAllocations([]);
      setDepartments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/room-specialty-allocations?year=${year}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Kalendář rozpisu se nepodařilo načíst.');
      setAllocations(Array.isArray(payload.allocations) ? payload.allocations : []);
      setDepartments(Array.isArray(payload.departments) ? payload.departments : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Kalendář rozpisu se nepodařilo načíst.');
    } finally {
      setLoading(false);
    }
  }, [activeHospitalId, year]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    const refresh = () => { void loadSchedule(); };
    window.addEventListener('roomSpecialtyScheduleChanged', refresh);
    window.addEventListener('operatingSpecialtiesChanged', refresh);
    return () => {
      window.removeEventListener('roomSpecialtyScheduleChanged', refresh);
      window.removeEventListener('operatingSpecialtiesChanged', refresh);
    };
  }, [loadSchedule]);

  useHospitalRealtime('room_specialty_allocations', () => { void loadSchedule(); });
  useHospitalRealtime('departments', () => { void loadSchedule(); });

  const departmentMap = useMemo(() => new Map(departments.map((department, index) => [department.id, {
    ...department,
    color: department.accent_color || roomSpecialtyColor(index),
  }])), [departments]);

  const displayForAllocation = useCallback((allocation: Allocation): ScheduleDisplay | null => {
    if (allocation.allocation_kind === 'SPECIALTY') {
      if (!allocation.department_id) return null;
      const department = departmentMap.get(allocation.department_id);
      if (!department) return null;
      return {
        id: department.id,
        name: department.name,
        code: department.short_code || department.name.slice(0, 8).toLocaleUpperCase('cs'),
        color: department.color,
      };
    }

    const option = ROOM_SCHEDULE_SYSTEM_OPTIONS[allocation.allocation_kind];
    return { id: option.id, name: option.name, code: shortSystemCode(allocation.allocation_kind), color: option.color };
  }, [departmentMap]);

  const monthAllocations = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
    return allocations.filter(allocation => allocation.allocation_date.startsWith(prefix));
  }, [allocations, month, year]);

  const allocationsByDate = useMemo(() => {
    const result = new Map<string, Allocation[]>();
    monthAllocations.forEach(allocation => {
      if (selectedRoomId !== 'all' && allocation.operating_room_id !== selectedRoomId) return;
      const current = result.get(allocation.allocation_date) ?? [];
      current.push(allocation);
      result.set(allocation.allocation_date, current);
    });
    return result;
  }, [monthAllocations, selectedRoomId]);

  const selectedDayAllocations = useMemo(
    () => monthAllocations.filter(allocation => allocation.allocation_date === selectedDate),
    [monthAllocations, selectedDate],
  );

  const selectedDayByRoom = useMemo(() => {
    const result = new Map<string, Partial<Record<RoomScheduleDayPart, Allocation>>>();
    selectedDayAllocations.forEach(allocation => {
      const slots = result.get(allocation.operating_room_id) ?? {};
      slots[allocation.day_part] = allocation;
      result.set(allocation.operating_room_id, slots);
    });
    return result;
  }, [selectedDayAllocations]);

  const plannedRoomIds = useMemo(() => new Set(monthAllocations.map(allocation => allocation.operating_room_id)), [monthAllocations]);
  const usedDepartmentIds = useMemo(() => new Set(monthAllocations.map(allocation => allocation.department_id).filter(Boolean)), [monthAllocations]);
  const selectedDayRoomCount = selectedDayByRoom.size;
  const monthDays = new Date(year, month + 1, 0).getDate();
  const calendarCells = useMemo(() => {
    const cells: Array<Date | null> = Array.from({ length: mondayOffset(year, month) }, () => null);
    for (let day = 1; day <= monthDays; day += 1) cells.push(localDate(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month, monthDays, year]);

  const moveMonth = (direction: number) => {
    const next = localDate(year, month + direction, 1);
    setCursor(next);
    setSelectedDate(dateKey(next));
  };

  const goToday = () => {
    const today = new Date();
    setCursor(localDate(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  const dayRoomSchedules = (key: string): DayRoomSchedule[] => {
    const dayAllocations = allocationsByDate.get(key) ?? [];
    const byRoom = new Map<string, Partial<Record<RoomScheduleDayPart, Allocation>>>();
    dayAllocations.forEach(allocation => {
      const slots = byRoom.get(allocation.operating_room_id) ?? {};
      slots[allocation.day_part] = allocation;
      byRoom.set(allocation.operating_room_id, slots);
    });

    return rooms
      .filter(room => byRoom.has(room.id) && (selectedRoomId === 'all' || room.id === selectedRoomId))
      .map(room => ({ room, slots: byRoom.get(room.id) ?? {} }));
  };

  const renderCalendarSlot = (allocation: Allocation | undefined, merged = false) => {
    const display = allocation ? displayForAllocation(allocation) : null;
    if (!display) return <span className="grid min-w-0 place-items-center text-[7px] font-medium text-white/15">—</span>;
    return (
      <span
        className={`relative flex min-w-0 items-center justify-center overflow-hidden rounded-[3px] border border-white/[0.06] px-1 ${merged ? 'col-span-2' : ''}`}
        style={{ backgroundColor: `color-mix(in srgb, ${display.color} 17%, transparent)` }}
        title={`${display.name}${merged ? ' · celý den' : ''}`}
      >
        <span className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: display.color }} aria-hidden="true" />
        <span className="truncate text-[7px] font-bold uppercase tracking-[0.04em] text-white/82">{display.code}</span>
      </span>
    );
  };

  const renderSlot = (allocation: Allocation | undefined, part: RoomScheduleDayPart) => {
    const display = allocation ? displayForAllocation(allocation) : null;
    if (!display) {
      return (
        <div className="flex min-h-11 items-center justify-between gap-2 px-3 py-2 text-white/25">
          <span className="text-[8px] font-bold uppercase tracking-[0.12em]">{part === 'AM' ? 'DOP' : 'ODP'}</span>
          <span className="text-[9px] font-medium">Bez rozpisu</span>
        </div>
      );
    }
    return (
      <div
        className="relative flex min-h-11 min-w-0 items-center gap-2 overflow-hidden px-3 py-2"
        style={{ backgroundColor: `color-mix(in srgb, ${display.color} 15%, transparent)` }}
        title={`${display.name} · ${part === 'AM' ? 'dopoledne' : 'odpoledne'}`}
      >
        <span className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: display.color }} aria-hidden="true" />
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/45">{part === 'AM' ? 'DOP' : 'ODP'}</span>
        <span className="min-w-0 flex-1 truncate text-right text-[10px] font-bold uppercase tracking-[0.05em] text-white/85">{display.code}</span>
      </div>
    );
  };

  return (
    <div className="statistics-module h-full min-h-0 w-full overflow-y-auto pb-10 font-sans">
      <header className="mb-7">
        <ModulePageHeading icon={CalendarRange} kicker="OR CALENDAR" title="KALENDÁŘ" mutedTitle="SÁLŮ" />
      </header>

      <section className="hide-scrollbar mb-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex min-w-max items-center gap-2.5">
          {[
            { label: 'Sály v plánu', value: plannedRoomIds.size, suffix: `z ${rooms.length}`, icon: Building2, color: '#38BDF8' },
            { label: 'Přiřazené bloky', value: monthAllocations.length, suffix: 'bloků', icon: CalendarDays, color: '#34D399' },
            { label: 'Použité obory', value: usedDepartmentIds.size, suffix: 'oborů', icon: Layers3, color: '#A78BFA' },
            { label: 'Vybraný den', value: selectedDayRoomCount, suffix: 'sálů', icon: CalendarRange, color: '#FBBF24' },
          ].map(({ label, value, suffix, icon: Icon, color }) => (
            <div key={label} className="flex h-[68px] w-[122px] shrink-0 items-center rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2.5 2xl:w-[136px]">
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
          <div className="w-[88px] shrink-0">
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Období</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Měsíční přehled</p>
          </div>
          <div className="flex h-10 w-[210px] shrink-0 items-center justify-between gap-1 rounded-lg border border-white/[0.055] bg-black/10 p-1">
            <button type="button" onClick={() => moveMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.05] hover:text-white" aria-label="Předchozí měsíc"><ChevronLeft className="h-4 w-4" /></button>
            <p className="truncate px-2 text-center text-[11px] font-semibold capitalize text-white/88">{MONTH_FORMATTER.format(cursor)}</p>
            <button type="button" onClick={() => moveMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.05] hover:text-white" aria-label="Následující měsíc"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <select value={selectedRoomId} onChange={event => setSelectedRoomId(event.target.value)} className="h-10 w-[190px] shrink-0 rounded-lg border border-white/[0.07] bg-[#10182a] px-3 text-[9px] font-semibold text-white/78 outline-none focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20" aria-label="Filtrovat podle operačního sálu">
            <option value="all">Všechny operační sály</option>
            {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
          <button type="button" onClick={goToday} className="h-10 rounded-lg border border-white/[0.06] bg-white/[0.025] px-4 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/52 hover:text-white">Dnes</button>
          <button type="button" onClick={() => void loadSchedule()} disabled={loading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-white/42 hover:text-white disabled:opacity-40" aria-label="Obnovit kalendář"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </section>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.045] p-3.5 text-amber-100/85">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-4 py-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight text-white/95">Měsíční provozní kalendář</h2>
              <p className="mt-0.5 text-[10px] text-white/50">Každý sál zobrazuje samostatný rozpis dopoledne a odpoledne</p>
            </div>
            <span className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/28">Kliknutím zobrazíte den</span>
          </div>

          {loading && allocations.length === 0 ? (
            <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300/70" /></div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1060px]">
                <div className="grid grid-cols-7 border-b border-white/[0.055] bg-white/[0.02]">
                  {WEEKDAYS.map(day => <div key={day} className="border-r border-white/[0.055] py-2.5 text-center text-[9px] font-bold tracking-[0.14em] text-white/38">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 bg-black/[0.14]">
                  {calendarCells.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} className="min-h-[138px] border-b border-r border-white/[0.04] bg-black/[0.07]" />;
                    const key = dateKey(date);
                    const holiday = getCzechPublicHoliday(date);
                    const today = key === dateKey(now);
                    const selected = key === selectedDate;
                    const dayRooms = dayRoomSchedules(key);
                    const totalRooms = dayRooms.length;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(key)}
                        aria-pressed={selected}
                        aria-label={`${DATE_FORMATTER.format(date)}, ${totalRooms} naplánovaných sálů`}
                        className={`relative min-h-[138px] min-w-0 border-b border-r p-2 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/45 ${selected ? 'border-cyan-200/[0.22] bg-cyan-300/[0.075]' : holiday ? 'border-amber-300/[0.13] bg-amber-300/[0.035]' : 'border-white/[0.05] bg-transparent hover:bg-white/[0.028]'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[11px] font-bold tabular-nums ${selected || today ? 'text-cyan-100' : holiday ? 'text-amber-200' : 'text-white/54'}`}>{date.getDate()}</span>
                          {holiday ? <Flag className="h-3 w-3 text-amber-300/75" aria-hidden="true" /> : totalRooms > 0 ? <span className="text-[7px] font-bold uppercase tracking-[0.08em] text-white/28">{totalRooms} sálů</span> : null}
                        </div>
                        {holiday && <p className="mt-1 truncate text-[7px] font-semibold text-amber-200/60" title={holiday.name}>{holiday.name}</p>}
                        <div className="mt-1.5 space-y-1">
                          {dayRooms.length > 0 && (
                            <div className="grid grid-cols-[minmax(42px,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0.5 px-0.5 text-[5px] font-bold uppercase tracking-[0.08em] text-white/24">
                              <span>Sál</span><span className="text-center">DOP</span><span className="text-center">ODP</span>
                            </div>
                          )}
                          {dayRooms.slice(0, 4).map(({ room, slots }) => {
                            const sameAllDay = Boolean(
                              slots.AM
                              && slots.PM
                              && slots.AM.allocation_kind === slots.PM.allocation_kind
                              && slots.AM.department_id === slots.PM.department_id,
                            );
                            return (
                              <div key={room.id} className="grid h-[18px] min-w-0 grid-cols-[minmax(42px,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0.5">
                                <span className="truncate self-center pr-1 text-[6px] font-semibold uppercase tracking-[0.02em] text-white/42" title={room.name}>{room.name}</span>
                                {sameAllDay ? renderCalendarSlot(slots.AM, true) : <>{renderCalendarSlot(slots.AM)}{renderCalendarSlot(slots.PM)}</>}
                              </div>
                            );
                          })}
                          {dayRooms.length > 4 && <p className="px-1 text-[7px] font-semibold text-white/30">+ {dayRooms.length - 4} další sály</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <div className="border-b border-white/[0.055] px-4 py-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200/55">Vybraný den</p>
            <h2 className="mt-1 text-[15px] font-semibold capitalize text-white/95">{DATE_FORMATTER.format(new Date(`${selectedDate}T12:00:00`))}</h2>
            {getCzechPublicHoliday(new Date(`${selectedDate}T12:00:00`)) && <p className="mt-1 text-[9px] font-semibold text-amber-200/65">{getCzechPublicHoliday(new Date(`${selectedDate}T12:00:00`))?.name}</p>}
          </div>
          <div className="grid grid-cols-[minmax(120px,1fr)_88px_88px] border-b border-white/[0.055] bg-white/[0.02] px-3 py-2 text-[8px] font-bold uppercase tracking-[0.12em] text-white/32">
            <span>Operační sál</span><span className="text-center">Dopoledne</span><span className="text-center">Odpoledne</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rooms.map(room => {
              const slots = selectedDayByRoom.get(room.id) ?? {};
              return (
                <div key={room.id} className="grid grid-cols-[minmax(120px,1fr)_88px_88px] border-b border-white/[0.05] transition-colors hover:bg-white/[0.02]">
                  <div className="min-w-0 px-3 py-2.5">
                    <p className="truncate text-[10px] font-semibold text-white/82" title={room.name}>{room.name}</p>
                    <p className="mt-0.5 truncate text-[7px] font-medium uppercase tracking-[0.08em] text-white/27">{room.department}</p>
                  </div>
                  <div className="border-l border-white/[0.05]">{renderSlot(slots.AM, 'AM')}</div>
                  <div className="border-l border-white/[0.05]">{renderSlot(slots.PM, 'PM')}</div>
                </div>
              );
            })}
            {rooms.length === 0 && <div className="px-4 py-12 text-center text-xs text-white/35">Nejsou vytvořené žádné operační sály.</div>}
          </div>
          <div className="border-t border-white/[0.055] px-4 py-3 text-[8px] leading-relaxed text-white/32">
            Změny se provádějí v modulu <span className="font-semibold text-white/55">Rozpis sálů</span> a zde se automaticky aktualizují.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ScheduleCalendarManager;
