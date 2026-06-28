'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDot,
  HeartPulse,
  Loader2,
  Lock,
  Radio,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { fetchAllStaff, StaffRow } from '../lib/db';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface RoomWithStaff {
  id: string;
  name: string;
  department: string | null;
  current_step_index: number | null;
  is_locked: boolean | null;
  is_paused: boolean | null;
  nurse: StaffRow | null;
  anesthesiologist: StaffRow | null;
  isActive: boolean;
}

type FilterMode = 'all' | 'active' | 'gaps';
type StaffRole = 'anesthesiologist' | 'nurse';

const COLORS = {
  cyan: '#36D9EC',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#FB7185',
  blue: '#38BDF8',
};

const roleMeta: Record<StaffRole, {
  label: string;
  shortLabel: string;
  color: string;
  icon: typeof Wind;
}> = {
  anesthesiologist: {
    label: 'Anesteziologický lékař',
    shortLabel: 'ANESTEZIOLOG',
    color: COLORS.cyan,
    icon: Wind,
  },
  nurse: {
    label: 'Sálová sestra',
    shortLabel: 'SESTRA',
    color: COLORS.amber,
    icon: HeartPulse,
  },
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const roleForStaff = (staff: StaffRow): StaffRole =>
  staff.role === 'NURSE' ? 'nurse' : 'anesthesiologist';

const roomNumber = (name: string) => name.match(/\d+/)?.[0] || name.slice(0, 2).toUpperCase();

const roomState = (room: RoomWithStaff) => {
  if (room.is_locked) return { label: 'Uzamčeno', color: COLORS.amber, icon: Lock };
  if (room.is_paused) return { label: 'Pozastaveno', color: COLORS.blue, icon: CircleDot };
  if (room.isActive) return { label: 'Výkon probíhá', color: COLORS.cyan, icon: Activity };
  return { label: 'Připraveno', color: COLORS.green, icon: CheckCircle2 };
};

const StaffNode: React.FC<{
  role: StaffRole;
  staff: StaffRow | null;
  isRoomActive: boolean;
}> = ({ role, staff, isRoomActive }) => {
  const meta = roleMeta[role];
  const Icon = meta.icon;

  return (
    <div
      className="relative min-w-0 rounded-2xl px-3 py-2.5 flex items-center gap-2.5 overflow-hidden font-sans"
      style={{
        background: staff ? `${meta.color}0D` : 'rgba(251,113,133,0.055)',
        border: `1px solid ${staff ? `${meta.color}26` : 'rgba(251,113,133,0.18)'}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold"
        style={{
          color: staff ? meta.color : 'rgba(251,113,133,0.8)',
          background: staff ? `${meta.color}1A` : 'rgba(251,113,133,0.1)',
        }}
      >
        {staff ? initials(staff.name) : <Icon className="w-3.5 h-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] leading-none font-medium text-white/40 truncate">
          {meta.shortLabel}
        </p>
        <p className={`mt-1 text-sm leading-tight truncate ${staff ? 'font-bold text-white' : 'font-semibold text-rose-300/75'}`}>
          {staff?.name || 'NEOBSAZENO'}
        </p>
      </div>
      {staff && isRoomActive && (
        <span className="w-1.5 h-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
      )}
    </div>
  );
};

const RoomNetworkCard: React.FC<{
  room: RoomWithStaff;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ room, isSelected, onSelect }) => {
  const state = roomState(room);
  const StateIcon = state.icon;
  const missing = [
    room.anesthesiologist,
    room.nurse,
  ].filter(staff => !staff).length;
  const accent = missing > 0 ? COLORS.red : state.color;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="group relative w-full min-h-[154px] rounded-[22px] p-3 text-left overflow-hidden font-sans focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
      style={{
        background: isSelected
          ? `linear-gradient(125deg, ${accent}16 0%, rgba(54,217,236,0.035) 55%, rgba(251,191,36,0.025) 100%)`
          : 'linear-gradient(125deg, rgba(54,217,236,0.035) 0%, rgba(255,255,255,0.018) 52%, rgba(251,191,36,0.018) 100%)',
        border: `1px solid ${isSelected ? `${accent}52` : 'rgba(125,165,185,0.16)'}`,
        boxShadow: isSelected ? `0 18px 55px ${accent}0D, inset 0 1px 0 rgba(255,255,255,0.04)` : 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}70, transparent)` }}
      />
      <div
        aria-hidden
        className="absolute -left-16 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"
        style={{ background: accent }}
      />

      <div className="relative h-full grid grid-cols-[136px_1fr] sm:grid-cols-[150px_1fr] gap-4 items-stretch">
        <div className="relative flex flex-col justify-between rounded-2xl px-3 py-3 overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${accent}38 0%, ${accent}22 62%, ${accent}14 100%)`,
            border: `1px solid ${accent}66`,
            boxShadow: `inset 0 1px 0 ${accent}55, 0 18px 34px -28px ${accent}`,
          }}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-medium text-white/40">Sál</span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: accent }}>
              {2 - missing}/2
            </span>
          </div>
          <div className="mt-1">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white tabular-nums"
              style={{ background: accent, boxShadow: `0 0 14px ${accent}35` }}
            >
              {roomNumber(room.name)}
            </div>
            <p className="text-sm font-bold text-white leading-tight mt-2">{room.name}</p>
            <p className="text-[11px] text-white/50 leading-tight mt-0.5">{room.department || 'Bez oddělení'}</p>
          </div>
          <div className="text-[11px] tabular-nums flex items-center gap-1.5 min-w-0" style={{ color: state.color }}>
            <StateIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">{state.label}</span>
          </div>
        </div>

        <div className="relative grid grid-rows-2 gap-2.5 py-1">
          <div
            aria-hidden
            className="absolute -left-4 top-1/2 w-4 h-px"
            style={{ background: `linear-gradient(90deg, ${accent}22, ${accent}88)` }}
          />
          <div
            aria-hidden
            className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
          />
          <div
            aria-hidden
            className="absolute left-0 top-[22%] bottom-[22%] w-px"
            style={{ background: `linear-gradient(180deg, transparent, ${accent}75 18%, ${accent}75 82%, transparent)` }}
          />

          {([
            ['anesthesiologist', room.anesthesiologist],
            ['nurse', room.nurse],
          ] as const).map(([role, staff]) => (
            <div key={role} className="relative pl-2">
              <span
                aria-hidden
                className="absolute left-0 top-1/2 w-2 h-px"
                style={{ background: `${roleMeta[role].color}70` }}
              />
              <StaffNode role={role} staff={staff} isRoomActive={room.isActive} />
            </div>
          ))}
        </div>
      </div>

    </motion.button>
  );
};

const AvailablePerson: React.FC<{ staff: StaffRow }> = ({ staff }) => {
  const role = roleForStaff(staff);
  const meta = roleMeta[role];
  const Icon = meta.icon;
  const availability = Math.max(0, Math.min(100, staff.availability ?? 100));

  return (
    <motion.div
      className="rounded-xl p-2.5 flex items-center gap-2.5 font-sans"
      style={{
        background: 'rgba(255,255,255,0.023)',
        border: '1px solid rgba(255,255,255,0.055)',
      }}
    >
      <div
        className="relative w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[9px] font-bold"
        style={{ background: `${meta.color}14`, color: meta.color }}
      >
        {initials(staff.name)}
        <span
          className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 border-[#071019]"
          style={{ background: COLORS.green }}
        >
          <Icon className="w-2 h-2 text-[#071019]" strokeWidth={3} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-white truncate">{staff.name}</p>
          {staff.is_external && (
            <span className="text-[7px] font-bold tracking-wider px-1 py-0.5 rounded text-amber-300 bg-amber-300/10">EXT</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] font-medium" style={{ color: meta.color }}>
            {meta.shortLabel}
          </span>
          {staff.skill_level && <span className="text-[11px] text-white/35">• {staff.skill_level}</span>}
          <span className="ml-auto text-[11px] tabular-nums text-white/40">{availability}%</span>
        </div>
        <div className="h-px bg-white/[0.06] mt-1.5 overflow-hidden">
          <div className="h-full" style={{ width: `${availability}%`, background: meta.color }} />
        </div>
      </div>
    </motion.div>
  );
};

const StaffOverviewModule: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [rooms, setRooms] = useState<RoomWithStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [department, setDepartment] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const staffData = await fetchAllStaff();
      const { data: roomsData } = await supabase
        .from('operating_rooms')
        .select('id, name, department, current_step_index, doctor_id, nurse_id, anesthesiologist_id, is_locked, is_paused')
        .order('sort_order', { ascending: true });

      const staffMap = new Map(staffData?.map(staff => [staff.id, staff]) || []);
      const roomsWithStaff: RoomWithStaff[] = (roomsData || []).map(room => {
        // Po sloučení rolí se anesteziolog v detailu sálu ukládá do doctor_id.
        // anesthesiologist_id ponecháváme jako fallback pro starší záznamy.
        const anesthesiologistId = room.doctor_id || room.anesthesiologist_id;
        return {
          id: room.id,
          name: room.name,
          department: room.department,
          current_step_index: room.current_step_index,
          is_locked: room.is_locked,
          is_paused: room.is_paused,
          nurse: room.nurse_id ? staffMap.get(room.nurse_id) || null : null,
          anesthesiologist: anesthesiologistId ? staffMap.get(anesthesiologistId) || null : null,
          isActive: room.current_step_index !== null
            && room.current_step_index >= 0
            && room.current_step_index < 6
            && !room.is_locked,
        };
      });

      setStaffList(staffData || []);
      setRooms(roomsWithStaff);
    } catch (error) {
      console.error('[StaffOverview] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('staff-overview-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchData)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'operating_rooms' }, fetchData)
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }
  }, []);

  const assignedIds = useMemo(() => {
    const ids = new Set<string>();
    rooms.forEach(room => {
      if (room.nurse) ids.add(room.nurse.id);
      if (room.anesthesiologist) ids.add(room.anesthesiologist.id);
    });
    return ids;
  }, [rooms]);

  const availableStaff = useMemo(
    () => staffList
      .filter(staff =>
        staff.is_active
        && (staff.role === 'DOCTOR' || staff.role === 'ANESTHESIOLOGIST' || staff.role === 'NURSE')
        && !assignedIds.has(staff.id))
      .sort((a, b) => (b.availability ?? 100) - (a.availability ?? 100) || a.name.localeCompare(b.name, 'cs')),
    [assignedIds, staffList],
  );

  const stats = useMemo(() => {
    const activeRooms = rooms.filter(room => room.isActive);
    const missingSlots = rooms.reduce((total, room) =>
      total + [room.anesthesiologist, room.nurse].filter(staff => !staff).length, 0);
    const totalSlots = rooms.length * 2;
    const filledSlots = Math.max(0, totalSlots - missingSlots);
    const coverage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
    const activeStaffIds = new Set<string>();
    activeRooms.forEach(room => {
      if (room.nurse) activeStaffIds.add(room.nurse.id);
      if (room.anesthesiologist) activeStaffIds.add(room.anesthesiologist.id);
    });

    return {
      activeRooms: activeRooms.length,
      activeStaff: activeStaffIds.size,
      available: availableStaff.length,
      missingSlots,
      coverage,
    };
  }, [availableStaff.length, rooms]);

  const departments = useMemo(
    () => [...new Set(rooms.map(room => room.department).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'cs')),
    [rooms],
  );

  const filteredRooms = useMemo(() => {
    const query = search.toLocaleLowerCase('cs').trim();
    return rooms.filter(room => {
      const missing = !room.anesthesiologist || !room.nurse;
      const matchesFilter =
        filter === 'all'
        || (filter === 'active' && room.isActive)
        || (filter === 'gaps' && missing);
      const matchesDepartment = department === 'all' || room.department === department;
      const haystack = [
        room.name,
        room.department,
        room.anesthesiologist?.name,
        room.nurse?.name,
      ].filter(Boolean).join(' ').toLocaleLowerCase('cs');
      return matchesFilter && matchesDepartment && (!query || haystack.includes(query));
    });
  }, [department, filter, rooms, search]);

  const availableByRole = useMemo(() => ({
    anesthesiologist: availableStaff.filter(staff => roleForStaff(staff) === 'anesthesiologist').length,
    nurse: availableStaff.filter(staff => roleForStaff(staff) === 'nurse').length,
  }), [availableStaff]);

  return (
    <div className="w-full min-h-full pb-8 font-sans">
      <header className="mb-7 space-y-3">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-[#FBBF24]" />
          <p className="text-[10px] font-bold text-[#FBBF24] tracking-[0.4em] uppercase">REAL-TIME OVERVIEW</p>
        </div>
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-bold tracking-tight uppercase leading-none">
          Přehled <span className="text-white/20">PERSONÁLU</span>
        </h1>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <p className="text-white/40 text-sm font-medium">
            Živá mapa týmů, obsazení sálů a okamžité dostupnosti
          </p>
          <div className="inline-flex items-center gap-2 text-[9px] tracking-[0.16em] font-bold text-emerald-300/75">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-50" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            DATA V REÁLNÉM ČASE
          </div>
        </div>
      </header>

      <section
        className="relative rounded-[26px] p-2.5 mb-4 overflow-hidden"
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
          {[
            { label: 'V provozu', value: stats.activeRooms, suffix: 'sálů', color: COLORS.cyan, icon: Activity },
            { label: 'Na sálech', value: stats.activeStaff, suffix: 'osob', color: COLORS.cyan, icon: Users },
            { label: 'Dostupní', value: stats.available, suffix: 'osob', color: COLORS.green, icon: Zap },
            { label: 'Chybí obsadit', value: stats.missingSlots, suffix: 'pozic', color: stats.missingSlots ? COLORS.red : COLORS.green, icon: AlertTriangle },
            { label: 'Pokrytí směny', value: stats.coverage, suffix: '%', color: stats.coverage >= 90 ? COLORS.green : COLORS.amber, icon: ShieldCheck },
          ].map(({ label, value, suffix, color, icon: Icon }, index) => (
            <div
              key={label}
              className={`relative rounded-2xl px-3.5 py-3 min-h-[78px] flex flex-col justify-between ${index === 4 ? 'col-span-2 md:col-span-1' : ''}`}
              style={{ background: `${color}08`, border: `1px solid ${color}17` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-bold tracking-[0.16em] text-white/38 uppercase">{label}</p>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-semibold tracking-tight tabular-nums" style={{ color }}>{value}</span>
                <span className="text-[9px] text-white/25">{suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="rounded-[22px] p-2 mb-5 flex flex-col xl:flex-row xl:items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.14)' }}
      >
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {([
            ['all', 'Všechny sály', Building2],
            ['active', 'V provozu', Radio],
            ['gaps', 'Chybí personál', AlertTriangle],
          ] as const).map(([id, label, Icon]) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold whitespace-nowrap transition-colors"
                style={active
                  ? { background: 'rgba(54,217,236,0.12)', color: COLORS.cyan, border: '1px solid rgba(54,217,236,0.22)' }
                  : { color: 'rgba(255,255,255,0.42)', border: '1px solid transparent' }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        <div className="hidden xl:block w-px h-7 bg-white/[0.07]" />

        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          {departments.length > 1 && (
            <select
              value={department}
              onChange={event => setDepartment(event.target.value)}
              aria-label="Filtrovat podle oddělení"
              className="h-9 min-w-[160px] px-3 rounded-xl bg-white/[0.025] border border-white/[0.07] text-xs font-semibold text-white/60 focus:outline-none focus:border-cyan-300/35"
            >
              <option value="all" className="bg-slate-950">Všechna oddělení</option>
              {departments.map(item => (
                <option key={item} value={item} className="bg-slate-950">{item}</option>
              ))}
            </select>
          )}
          <label className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/28" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Hledat sál nebo člena týmu…"
              className="w-full h-9 pl-10 pr-10 rounded-xl bg-white/[0.025] border border-white/[0.07] text-xs font-semibold text-white/85 placeholder:text-white/24 focus:outline-none focus:border-cyan-300/35"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Vymazat hledání"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        <span className="px-3 text-[9px] font-semibold text-white/28 whitespace-nowrap">
          {filteredRooms.length} / {rooms.length} SÁLŮ
        </span>
      </section>

      {loading ? (
        <div className="min-h-[320px] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-cyan-300/70 animate-spin" />
          <p className="text-[10px] tracking-[0.2em] font-bold text-white/28">SYNCHRONIZUJI TÝMY</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="min-h-[320px] rounded-[26px] border border-white/[0.07] bg-white/[0.018] flex flex-col items-center justify-center text-center p-8">
          <Users className="w-9 h-9 text-white/20 mb-4" />
          <h2 className="text-base font-semibold text-white/75">Personální data nejsou dostupná</h2>
          <p className="text-xs text-white/32 mt-2 max-w-md">
            Jakmile se připojí databáze a načtou sály, živá personální síť se zobrazí zde.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_290px] gap-5 items-start">
          <section
            className="relative rounded-[28px] p-3 sm:p-4 overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(5,16,25,0.56) 0%, rgba(5,11,18,0.32) 100%)',
              border: '1px solid rgba(125,165,185,0.15)',
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.055] pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(54,217,236,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(54,217,236,0.35) 1px, transparent 1px)',
                backgroundSize: '42px 42px',
                maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
              }}
            />
            <div className="relative flex items-center justify-between gap-3 mb-4 px-1">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5" style={{ color: COLORS.cyan }} />
                  <h2 className="text-[11px] font-bold tracking-[0.16em] text-white/78 uppercase">Personální síť sálů</h2>
                </div>
                <p className="text-[9px] text-white/28 mt-1 ml-5.5">Kliknutím zvýrazníte konkrétní tým</p>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-[8px] font-semibold tracking-wider text-white/28">
                <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-300" /> VÝKON</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-300" /> PŘIPRAVENO</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-300" /> NEOBSAZENO</span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredRooms.length > 0 ? (
                <motion.div layout className="relative grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredRooms.map(room => (
                    <RoomNetworkCard
                      key={room.id}
                      room={room}
                      isSelected={selectedRoomId === room.id}
                      onSelect={() => setSelectedRoomId(current => current === room.id ? null : room.id)}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative min-h-[280px] flex flex-col items-center justify-center text-center"
                >
                  <Search className="w-7 h-7 text-white/16 mb-3" />
                  <p className="text-sm font-medium text-white/55">Žádný sál neodpovídá filtru</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                      setDepartment('all');
                    }}
                    className="mt-3 text-[10px] font-semibold text-cyan-300/75 hover:text-cyan-200"
                  >
                    Zobrazit všechny sály
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <aside className="xl:sticky xl:top-4 space-y-4">
            <section
              className="rounded-[26px] p-4 overflow-hidden"
              style={{
                background: 'linear-gradient(155deg, rgba(54,217,236,0.08), rgba(255,255,255,0.018) 48%, rgba(251,191,36,0.045))',
                border: '1px solid rgba(54,217,236,0.17)',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-300" />
                    <h2 className="text-[11px] font-bold tracking-[0.15em] text-white/78 uppercase">Pohotovostní tým</h2>
                  </div>
                  <p className="text-[9px] text-white/30 mt-1">Připraven k okamžitému nasazení</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-emerald-300 tabular-nums leading-none">{availableStaff.length}</p>
                  <p className="text-[7px] tracking-widest text-white/25 mt-1">DOSTUPNÝCH</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 my-4">
                {([
                  ['anesthesiologist', availableByRole.anesthesiologist],
                  ['nurse', availableByRole.nurse],
                ] as const).map(([role, count]) => {
                  const meta = roleMeta[role];
                  const Icon = meta.icon;
                  return (
                    <div key={role} className="rounded-xl py-2 px-1 text-center bg-black/10 border border-white/[0.045]">
                      <Icon className="w-3 h-3 mx-auto" style={{ color: meta.color }} />
                      <p className="text-base font-semibold mt-1 tabular-nums" style={{ color: meta.color }}>{count}</p>
                      <p className="text-[7px] text-white/26 tracking-wider">{meta.shortLabel}</p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5 max-h-[420px] overflow-y-auto hide-scrollbar pr-0.5">
                {availableStaff.length > 0 ? (
                  availableStaff.map(staff => (
                    <AvailablePerson key={staff.id} staff={staff} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-8 px-4 text-center">
                    <UserRound className="w-6 h-6 text-white/18 mx-auto mb-2" />
                    <p className="text-[10px] font-medium text-white/40">Všichni jsou právě přiřazeni</p>
                  </div>
                )}
              </div>
            </section>

            <section
              className="rounded-[22px] p-4"
              style={{ background: 'rgba(255,255,255,0.018)', border: '1px solid rgba(125,165,185,0.13)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: stats.coverage >= 90 ? COLORS.green : COLORS.amber }} />
                <h3 className="text-[10px] font-bold tracking-[0.14em] text-white/65 uppercase">Integrita směny</h3>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: `conic-gradient(${stats.coverage >= 90 ? COLORS.green : COLORS.amber} ${stats.coverage * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                  }}
                >
                  <div className="absolute inset-[5px] rounded-full bg-[#08121a]" />
                  <span className="relative text-sm font-semibold text-white/82 tabular-nums">{stats.coverage}%</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white/75">
                    {stats.missingSlots === 0 ? 'Všechny týmy kompletní' : `${stats.missingSlots} neobsazených pozic`}
                  </p>
                  <p className="text-[9px] text-white/30 mt-1 leading-relaxed">
                    {stats.missingSlots === 0
                      ? 'Směna je personálně připravena.'
                      : 'Filtr „Chybí personál“ ukáže kritická místa.'}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};

export default StaffOverviewModule;
