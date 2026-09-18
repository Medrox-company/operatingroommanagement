'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDot,
  HeartPulse,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Radio,
  Search,
  ShieldCheck,
  Users,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import type { StaffRow } from '../lib/db';
import type { OperatingRoom } from '../types';
import { useStaffData } from '../hooks/useStaffData';
import { MobileHeaderMetrics, MobileModuleHeader } from './mobile/MobileShell';
import { useIsMobileDark } from '../hooks/useIsMobileDark';
import { useWorkflowStatusesContext } from '../contexts/WorkflowStatusesContext';
import ModulePageHeading from './ModulePageHeading';
import StaffPickerModal from './StaffPickerModal';
import './mobile/mobile-statistics.css';

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
  /** Skutečný workflow status sálu z databáze — název a jeho barva. */
  statusName: string | null;
  statusColor: string | null;
  /** Pozice v sekvenci aktivních statusů a jejich celkový počet. */
  stepIndex: number;
  stepCount: number;
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

const roomNumber = (name: string) => name.match(/\d+/)?.[0] || name.slice(0, 2).toUpperCase();

/** Stav sálu vychází z reálného workflow statusu uloženého u sálu.
    Zámek a pauza mají přednost, protože přebíjejí běžící krok. */
const roomState = (room: RoomWithStaff) => {
  if (room.is_locked) return { label: 'Uzamčeno', color: COLORS.amber, icon: Lock, running: false };
  if (room.is_paused) return { label: 'Pozastaveno', color: COLORS.blue, icon: CircleDot, running: false };
  if (room.isActive) {
    return {
      label: room.statusName || 'V provozu',
      color: room.statusColor || COLORS.cyan,
      icon: Activity,
      running: true,
    };
  }
  return { label: 'Mimo provoz', color: COLORS.green, icon: CheckCircle2, running: false };
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

/** Dlaždice jednoho člověka nebo neobsazené pozice.
    Nástěnka pracuje s lidmi, ne se sály — proto je atomem karty člověk. */
type BoardTone = 'gap' | 'working' | 'free';

const PersonTile: React.FC<{
  tone: BoardTone;
  name: string;
  role: StaffRole;
  /** Kde je — název sálu, nebo popis dostupnosti. */
  place: string;
  /** Barva sálu u nasazených, zelená u volných, červená u díry v rozpisu. */
  accent: string;
  badge?: string;
  onClick?: () => void;
}> = ({ tone, name, role, place, accent, badge, onClick }) => {
  const meta = roleMeta[role];
  const isGap = tone === 'gap';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`m-unified-card mobile-staff-person-card relative flex w-full items-center gap-2.5 overflow-hidden rounded-xl border py-2 pl-3.5 pr-2.5 text-left font-sans transition-colors ${onClick ? 'hover:bg-white/[0.045]' : 'cursor-default'} focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60`}
      style={{
        background: isGap ? `${COLORS.red}0B` : 'rgba(255,255,255,0.025)',
        borderColor: isGap ? `${COLORS.red}2E` : 'rgba(255,255,255,0.06)',
        borderStyle: isGap ? 'dashed' : 'solid',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <span className="mobile-staff-card-stripe absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${accent}${isGap ? 'AA' : '88'}` }} />

      <span
        className="mobile-staff-avatar grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[9px] font-black"
        style={{
          color: isGap ? COLORS.red : meta.color,
          background: isGap ? `${COLORS.red}12` : `${meta.color}16`,
          borderColor: isGap ? `${COLORS.red}45` : `${meta.color}40`,
        }}
      >
        {isGap ? '—' : initials(name)}
      </span>

      <span className="mobile-staff-card-copy min-w-0 flex-1">
        <span
          className="m-unified-card-title block truncate text-[12.5px] font-semibold leading-tight"
          style={{ color: isGap ? COLORS.red : 'rgba(255,255,255,0.9)' }}
        >
          {name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[9.5px] leading-tight">
          <span className="shrink-0 font-semibold" style={{ color: `${meta.color}B0` }}>{meta.shortLabel}</span>
          <span className="text-white/16">·</span>
          <span className="mobile-staff-place truncate" style={{ color: tone === 'working' ? `${accent}D0` : 'rgba(255,255,255,0.42)' }}>
            {place}
          </span>
        </span>
      </span>

      {badge && (
        <span
          className="mobile-staff-card-meta shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
          style={{
            borderColor: `${accent}30`,
            background: `${accent}12`,
            color: accent,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

/** Nadpis sekce nástěnky — název, počet a vlasová linka přes zbytek řádku. */
const BoardSectionHeading: React.FC<{
  title: string;
  count: number;
  color: string;
  hint?: string;
}> = ({ title, count, color, hint }) => (
  <div className="mb-2.5 flex items-center gap-3">
    <span className="inline-flex shrink-0 items-center gap-2">
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{title}</span>
      <span className="text-[13px] font-light tabular-nums text-white/85">{count}</span>
    </span>
    {hint && <span className="shrink-0 text-[9px] text-white/26">{hint}</span>}
    <span className="h-px flex-1 bg-white/[0.07]" />
  </div>
);

/** Karta sálu ve stejném jazyce jako karty v modulu Operační obory.
    Je stavěná tak, aby se četla i ve třech sloupcích vedle sebe. */
const RoomNetworkCard: React.FC<{
  room: RoomWithStaff;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ room, isSelected, onSelect }) => {
  const state = roomState(room);
  const StateIcon = state.icon;
  const roles = [
    { role: 'anesthesiologist' as StaffRole, staff: room.anesthesiologist },
    { role: 'nurse' as StaffRole, staff: room.nurse },
  ];
  const filled = roles.filter(item => item.staff).length;
  const missing = roles.length - filled;
  const accent = state.color;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${room.name} — ${state.running ? 'v provozu' : 'mimo provoz'}, ${state.label}, obsazeno ${filled} z ${roles.length}`}
      className={`m-unified-card mobile-staff-room-card relative flex h-full w-full flex-col overflow-hidden rounded-xl border py-3 pl-4 pr-3 text-left font-sans transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 ${state.running ? '' : 'opacity-[0.72] hover:opacity-95'}`}
      style={{
        background: isSelected ? `${accent}10` : 'rgba(255,255,255,0.025)',
        borderColor: isSelected ? `${accent}45` : 'rgba(255,255,255,0.06)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.025)',
      }}
    >
      <span className="mobile-staff-card-stripe absolute inset-y-0 left-0 w-[3px]" style={{ backgroundColor: `${accent}88` }} />

      <div className="m-unified-card-header flex items-center gap-2.5">
        {/* Pevná velikost dlaždice — jednomístné i víceznakové číslo sálu
            zabírá stejné místo, takže sloupec drží linku. */}
        <span
          className="mobile-staff-avatar flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border px-1 text-[11px] font-black leading-none"
          style={{ borderColor: `${accent}58`, backgroundColor: `${accent}1f`, color: accent }}
        >
          <span className="truncate">{roomNumber(room.name)}</span>
        </span>

        <div className="mobile-staff-card-copy min-w-0 flex-1">
          <h3 className="m-unified-card-title truncate text-[13.5px] font-bold leading-tight text-white/90">{room.name}</h3>
          {/* Ve třech sloupcích se nevejde dlouhý řetěz metadat, proto zůstal
              jen provoz a název statusu; oddělení je o řádek níž. */}
          <p className="mt-0.5 flex items-center gap-1.5 text-[9.5px] leading-tight">
            <span
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${state.running ? 'staff-orb-pulse-dot' : ''}`}
              style={{ backgroundColor: state.running ? accent : 'rgba(255,255,255,0.22)' }}
            />
            <StateIcon className="h-2.5 w-2.5 shrink-0" style={{ color: state.color }} />
            <span className="truncate font-semibold" style={{ color: state.running ? accent : 'rgba(255,255,255,0.38)' }}>
              {state.running ? state.label : 'Mimo provoz'}
            </span>
          </p>
        </div>

        <span
          className="mobile-staff-card-meta inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
          style={{
            borderColor: missing > 0 ? `${COLORS.red}30` : `${accent}30`,
            backgroundColor: missing > 0 ? `${COLORS.red}12` : `${accent}12`,
            color: missing > 0 ? COLORS.red : accent,
          }}
        >
          <Users className="h-2.5 w-2.5" />
          {filled}/{roles.length}
        </span>
      </div>

      {/* Kdo je na sále — dvě pozice pod sebou, ať se jména nezkracují. */}
      <div className="mt-2.5 grid gap-1 border-t border-white/[0.055] pt-2">
        {roles.map(({ role, staff }) => (
          <div key={role} className="flex min-w-0 items-baseline gap-2">
            <span
              className="w-[82px] shrink-0 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.12em]"
              style={{ color: `${roleMeta[role].color}99` }}
            >
              {roleMeta[role].shortLabel}
            </span>
            <span
              className="mobile-staff-assigned-name min-w-0 flex-1 truncate text-[11.5px] font-semibold leading-[15px]"
              style={{ color: staff ? 'rgba(255,255,255,0.88)' : COLORS.red }}
              title={staff ? staff.name : 'Neobsazeno'}
            >
              {staff ? staff.name : 'Neobsazeno'}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 truncate text-[8.5px] uppercase tracking-[0.14em] text-white/22">
        {room.department || 'Bez oddělení'}
      </p>
    </button>
  );
};

interface StaffOverviewModuleProps {
  rooms: OperatingRoom[];
  /** Stejná cesta k uložení jako z detailu sálu (App → updateOperatingRoom). */
  onStaffChange?: (roomId: string, role: 'doctor' | 'nurse' | 'anesthesiologist', staffId: string, staffName: string) => void;
}

const StaffOverviewModule: React.FC<StaffOverviewModuleProps> = ({ rooms: operatingRooms, onStaffChange }) => {
  const isMobileDark = useIsMobileDark();
  const { staff: staffList, loading } = useStaffData();
  const { activeStatuses } = useWorkflowStatusesContext();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [department, setDepartment] = useState('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [overviewView, setOverviewView] = useState<'cards' | 'list'>('cards');
  /** Otevřený výběr personálu — který sál a která pozice se obsazuje. */
  const [picker, setPicker] = useState<{ roomId: string; role: StaffRole } | null>(null);

  /** Přepínač zobrazení — stejná velikost ikon jako v levém postranním menu. */
  const overviewViewToggle = (
    <div className="flex items-center gap-1">
      {([
        ['cards', 'Nástěnku směny', LayoutGrid],
        ['list', 'Seznam', List],
      ] as const).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          onClick={() => setOverviewView(value)}
          aria-pressed={overviewView === value}
          title={`Zobrazit jako ${label.toLocaleLowerCase('cs')}`}
          aria-label={`Zobrazit jako ${label.toLocaleLowerCase('cs')}`}
          className={`grid h-[clamp(2.5rem,7vh,4rem)] w-[clamp(2.5rem,7vh,4rem)] place-items-center rounded-[clamp(0.75rem,1.8vh,1rem)] transition-colors duration-200 ${overviewView === value ? 'bg-white/[0.15] text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
        >
          <Icon
            className="h-[clamp(1.1rem,2.7vh,1.5rem)] w-[clamp(1.1rem,2.7vh,1.5rem)] transition-colors duration-200"
            strokeWidth={overviewView === value ? 2.5 : 2}
          />
        </button>
      ))}
    </div>
  );

  const rooms = useMemo<RoomWithStaff[]>(() => {
    const staffMap = new Map(staffList.map((staff) => [staff.id, staff]));
    const stepCount = activeStatuses.length;
    return operatingRooms.map((room) => {
      // Přiřazení se čte jen z polí, do kterých aplikace opravdu zapisuje —
      // doctor_id a nurse_id. Sloupec anesthesiologist_id je pozůstatek
      // starších dat a drží jména lidí, kteří na sále dávno nejsou; dřív se
      // z něj brala záloha, a přehled proto hlásil obsazené sály, které
      // obsazené nejsou.
      const anesthesiologistId = room.staff.doctor.id;
      const nurseId = room.staff.nurse.id;
      // currentStepIndex je pozice v seznamu AKTIVNÍCH statusů, ne order_index
      // přes všechny záznamy. Dřív se sahalo i po vypnutých statusech, takže
      // sál hlásil krok, který je v nastavení deaktivovaný.
      const safeIndex = stepCount > 0
        ? Math.min(Math.max(0, room.currentStepIndex ?? 0), stepCount - 1)
        : 0;
      const step = stepCount > 0 ? activeStatuses[safeIndex] ?? null : null;
      return {
        id: room.id,
        name: room.name,
        department: room.department,
        current_step_index: room.currentStepIndex,
        is_locked: room.isLocked,
        is_paused: room.isPaused,
        nurse: nurseId ? staffMap.get(nurseId) || null : null,
        anesthesiologist: anesthesiologistId ? staffMap.get(anesthesiologistId) || null : null,
        // Sál je v provozu, pokud je na některém z reálných workflow kroků
        // a není uzamčený. Dřív tu byla natvrdo napsaná šestka.
        isActive: room.currentStepIndex >= 0
          && (stepCount === 0 || room.currentStepIndex < stepCount)
          && !room.isLocked,
        statusName: step?.title || step?.name || null,
        statusColor: step?.accent_color || step?.color || null,
        stepIndex: safeIndex,
        stepCount,
      };
    });
  }, [activeStatuses, operatingRooms, staffList]);

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

  /** Podklad pro nástěnku směny: díry v rozpisu, nasazení lidé a lavička. */
  const board = useMemo(() => {
    const gaps: { roomId: string; roomName: string; roomNumber: string; role: StaffRole }[] = [];
    const working: {
      id: string;
      name: string;
      role: StaffRole;
      roomId: string;
      roomNumber: string;
      place: string;
      accent: string;
    }[] = [];

    filteredRooms.forEach(room => {
      const state = roomState(room);
      ([
        ['anesthesiologist', room.anesthesiologist],
        ['nurse', room.nurse],
      ] as const).forEach(([role, staff]) => {
        if (staff) {
          working.push({
            id: `${room.id}-${role}`,
            name: staff.name,
            role,
            roomId: room.id,
            roomNumber: roomNumber(room.name),
            place: `${room.name} · ${state.label}`,
            accent: state.color,
          });
        } else {
          gaps.push({
            roomId: room.id,
            roomName: room.name,
            roomNumber: roomNumber(room.name),
            role,
          });
        }
      });
    });

    const query = search.toLocaleLowerCase('cs').trim();
    const free = availableStaff
      .filter(person => !query || person.name.toLocaleLowerCase('cs').includes(query))
      .map(person => ({
        id: person.id,
        name: person.name,
        role: (person.role === 'NURSE' ? 'nurse' : 'anesthesiologist') as StaffRole,
      }));

    return { gaps, working, free };
  }, [availableStaff, filteredRooms, search]);

  return (
    <div
      className={`mobile-staff-overview mobile-unified-staff ${isMobileDark ? 'is-dark' : 'is-light'} relative w-full min-h-full pb-10 font-sans`}
      style={{ zIndex: 1 }}
    >
      <div
        aria-hidden
        className="mobile-theme-surface fixed inset-0 md:hidden pointer-events-none"
        style={{ zIndex: -1 }}
      />
      <div className="md:hidden mb-3">
        <MobileModuleHeader kicker="Živý operační program" title="Přehled personálu">
          <MobileHeaderMetrics
            items={[
              {
                label: 'V provozu',
                value: stats.activeRooms,
                suffix: 'sálů',
                color: COLORS.cyan,
                icon: <Activity className="w-5 h-5" strokeWidth={2.2} />,
              },
              {
                label: 'Chybí obsadit',
                value: stats.missingSlots,
                suffix: 'pozic',
                color: stats.missingSlots ? COLORS.red : COLORS.green,
                icon: <AlertTriangle className="w-5 h-5" strokeWidth={2.2} />,
              },
            ]}
          />
        </MobileModuleHeader>
      </div>

      <header className="hidden md:block mb-7">
        <ModulePageHeading
          icon={Users}
          kicker="REAL-TIME OVERVIEW"
          title="PŘEHLED"
          mutedTitle="PERSONÁLU"
          actions={overviewViewToggle}
        />
      </header>

      {/* Lišta i menu ve stejné skladbě a velikostech jako v modulu Nastavení. */}
      <section className="hide-scrollbar mb-4 hidden overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 md:block">
        <div className="flex min-w-max items-center gap-2.5">
          {([
            { label: 'V provozu', value: stats.activeRooms, suffix: 'sálů', icon: Activity, color: COLORS.cyan },
            { label: 'Na sálech', value: stats.activeStaff, suffix: 'osob', icon: Users, color: COLORS.blue },
            { label: 'Dostupní', value: stats.available, suffix: 'osob', icon: Zap, color: COLORS.green },
            { label: 'Chybí obsadit', value: stats.missingSlots, suffix: 'pozic', icon: AlertTriangle, color: stats.missingSlots ? COLORS.red : COLORS.green },
            { label: 'Pokrytí směny', value: stats.coverage, suffix: '%', icon: ShieldCheck, color: stats.coverage >= 90 ? COLORS.green : COLORS.amber },
          ] as const).map(({ label, value, suffix, icon: Icon, color }) => (
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
            <h2 className="text-[11px] font-semibold leading-tight text-white/92">Personální síť</h2>
            <p className="mt-1 text-[8px] leading-tight text-white/38">Živé obsazení sálů</p>
          </div>

          <div className="grid shrink-0 grid-cols-3 rounded-lg border border-white/[0.055] bg-white/[0.025] p-0.5">
            {([['all', 'Všechny'], ['active', 'V provozu'], ['gaps', 'Chybí']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                aria-pressed={filter === id}
                className={`h-8 rounded-md px-3 text-[8px] font-semibold uppercase tracking-[0.08em] ${filter === id ? 'bg-white/[0.09] text-cyan-200' : 'text-white/38 hover:text-white/70'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {departments.length > 1 && (
            <select
              value={department}
              onChange={event => setDepartment(event.target.value)}
              aria-label="Filtrovat podle oddělení"
              className="h-10 w-[180px] shrink-0 rounded-lg border border-white/[0.07] bg-[#10182a] px-3 text-[9px] font-semibold text-white/78 outline-none focus-visible:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300/20"
            >
              <option value="all">Všechna oddělení</option>
              {departments.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          )}

          <label className="flex h-10 w-[190px] shrink-0 items-center gap-2 rounded-lg border border-white/[0.055] bg-black/10 px-3">
            <Search className="h-4 w-4 shrink-0 text-white/30" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Hledat sál nebo tým"
              aria-label="Hledat sál nebo člena týmu"
              className="min-w-0 flex-1 bg-transparent text-[11px] font-semibold text-white/88 outline-none placeholder:font-normal placeholder:text-white/28"
            />
          </label>

          <span className="shrink-0 px-1 text-[9px] font-semibold tabular-nums text-white/28">
            {filteredRooms.length} / {rooms.length} SÁLŮ
          </span>
        </div>
      </section>

      <section
        className="m-unified-card mobile-staff-panel mobile-staff-filters p-4 mb-3 flex flex-col gap-3 md:hidden"
      >
        <div className="m-unified-card-header">
          <h2 className="m-unified-card-title">Personální síť</h2>
          <span className="text-[13px] tabular-nums" style={{ color: 'var(--m-muted)' }}>
            {filteredRooms.length} / {rooms.length} sálů
          </span>
        </div>
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
                aria-pressed={active}
                className="h-11 px-3 rounded-xl flex items-center gap-2 text-[13px] font-semibold whitespace-nowrap transition-colors"
                style={active
                  ? { background: 'var(--m-accent-soft)', color: 'var(--m-accent)', border: '1px solid var(--m-border)' }
                  : { color: 'var(--m-muted)', border: '1px solid transparent' }}
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
              className="h-11 min-w-0 px-3 rounded-xl border text-[16px] focus:outline-none focus:border-cyan-300/35"
              style={{ background: 'var(--m-card-2)', borderColor: 'var(--m-border)', color: 'var(--m-text)' }}
            >
              <option value="all" style={{ background: 'var(--m-card-solid)' }}>Všechna oddělení</option>
              {departments.map(item => (
                <option key={item} value={item} style={{ background: 'var(--m-card-solid)' }}>{item}</option>
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
              aria-label="Hledat sál nebo člena týmu"
              className="w-full h-11 pl-10 pr-12 rounded-xl border text-[16px] placeholder:text-white/24 focus:outline-none focus:border-cyan-300/35"
              style={{ background: 'var(--m-card-2)', borderColor: 'var(--m-border)', color: 'var(--m-text)' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Vymazat hledání"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

      </section>

      {loading ? (
        <section className="m-unified-card mobile-staff-panel flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025]">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-300/70" />
          <p className="text-[10px] font-bold tracking-[0.2em] text-white/28">SYNCHRONIZUJI TÝMY</p>
        </section>
      ) : rooms.length === 0 ? (
        <section className="m-unified-card mobile-staff-panel flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.025] px-6 text-center">
          <Users className="mb-4 h-9 w-9 text-white/20" strokeWidth={1.4} />
          <h2 className="m-unified-card-title text-sm font-semibold text-white/65">Personální data nejsou dostupná</h2>
          <p className="mt-2 max-w-md text-xs text-white/35">
            Jakmile se připojí databáze a načtou sály, živá personální síť se zobrazí zde.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 items-start">
          {/* Panel v jazyce modulu Nastavení — bez přechodů a rastru na pozadí. */}
          <section className="m-unified-card mobile-staff-panel relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:p-4">
            <div className="m-unified-card-header relative mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="m-unified-card-title text-[11px] font-semibold leading-tight text-white/92">Kdo pracuje a kdo je volný</h2>
                <p className="mt-1 text-[8px] leading-tight text-white/38">Vlevo volný personál · vpravo obsazení sálů</p>
              </div>
              <div className="hidden items-center gap-3 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/28 sm:flex">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'linear-gradient(90deg, #36D9EC, #A78BFA)' }} />
                  Barva = aktuální status sálu
                </span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-white/25" /> Mimo provoz</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-300" /> Neobsazená pozice</span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredRooms.length > 0 ? (
                overviewView === 'cards' ? (
                  /* Nástěnka směny — atomem je člověk, ne sál. Nejdřív díry
                     v rozpisu, pak kdo na kterém sále je, nakonec lavička. */
                  <motion.div layout className="relative">
                    {board.gaps.length > 0 && (
                      <section className="mb-5">
                        <BoardSectionHeading
                          title="Chybí obsadit"
                          count={board.gaps.length}
                          color={COLORS.red}
                          hint="kliknutím přiřadíte personál"
                        />
                        <div className="mobile-staff-card-grid grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                          {board.gaps.map(item => (
                            <PersonTile
                              key={`${item.roomId}-${item.role}`}
                              tone="gap"
                              name="Neobsazeno"
                              role={item.role}
                              place={item.roomName}
                              accent={COLORS.red}
                              badge={item.roomNumber}
                              onClick={onStaffChange ? () => setPicker({ roomId: item.roomId, role: item.role }) : undefined}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="mb-5">
                      <BoardSectionHeading
                        title="Na sálech"
                        count={board.working.length}
                        color={COLORS.cyan}
                        hint="kliknutím změníte přiřazení"
                      />
                      {board.working.length === 0 ? (
                        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[11px] text-white/32">
                          Na žádném sále není přiřazený personál.
                        </p>
                      ) : (
                        <div className="mobile-staff-card-grid grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                          {board.working.map(item => (
                            <PersonTile
                              key={item.id}
                              tone="working"
                              name={item.name}
                              role={item.role}
                              place={item.place}
                              accent={item.accent}
                              badge={item.roomNumber}
                              onClick={onStaffChange ? () => setPicker({ roomId: item.roomId, role: item.role }) : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </section>

                    <section>
                      <BoardSectionHeading
                        title="Volní"
                        count={board.free.length}
                        color={COLORS.green}
                        hint="k dispozici pro nasazení"
                      />
                      {board.free.length === 0 ? (
                        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[11px] text-white/32">
                          Nikdo není volný — celý aktivní personál je nasazený.
                        </p>
                      ) : (
                        <div className="mobile-staff-card-grid grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                          {board.free.map(item => (
                            <PersonTile
                              key={item.id}
                              tone="free"
                              name={item.name}
                              role={item.role}
                              place="K dispozici"
                              accent={COLORS.green}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  </motion.div>
                ) : (
                  <motion.div layout className="mobile-staff-card-grid relative grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
                    {filteredRooms.map(room => (
                      <RoomNetworkCard
                        key={room.id}
                        room={room}
                        isSelected={selectedRoomId === room.id}
                        onSelect={() => setSelectedRoomId(current => current === room.id ? null : room.id)}
                      />
                    ))}
                  </motion.div>
                )
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative flex min-h-[320px] flex-col items-center justify-center text-center"
                >
                  <Search className="mb-3 h-9 w-9 text-white/20" strokeWidth={1.4} />
                  <p className="text-sm font-semibold text-white/65">Žádný sál neodpovídá filtru</p>
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
        </div>
      )}

      {/* Výběr personálu — tentýž modal jako v detailu sálu, včetně uložení
          přes App → updateOperatingRoom, takže se zapíše do databáze. */}
      {picker && (() => {
        const room = rooms.find(item => item.id === picker.roomId);
        const current = picker.role === 'nurse' ? room?.nurse : room?.anesthesiologist;
        const dbRole = picker.role === 'nurse' ? 'nurse' : 'doctor';
        return (
          <StaffPickerModal
            isOpen
            onClose={() => setPicker(null)}
            onSelect={(staffId, staffName) => {
              onStaffChange?.(picker.roomId, dbRole, staffId, staffName);
              setPicker(null);
            }}
            onUnassign={() => {
              onStaffChange?.(picker.roomId, dbRole, '', '');
              setPicker(null);
            }}
            currentStaffId={current?.id ?? null}
            currentStaffName={current?.name ?? null}
            filterRole={picker.role === 'nurse' ? 'NURSE' : 'DOCTOR'}
            title={picker.role === 'nurse' ? 'Sestra — výběr a správa' : 'Lékař — výběr a správa'}
            allRooms={operatingRooms}
            currentRoomId={picker.roomId}
          />
        );
      })()}
    </div>
  );
};

export default StaffOverviewModule;
