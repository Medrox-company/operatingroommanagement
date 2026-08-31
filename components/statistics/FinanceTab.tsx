"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Wallet, Coins, Clock, TrendingUp, AlertTriangle, Check, X,
  Building2, DollarSign, Activity, Hourglass, Pencil,
} from 'lucide-react';
import {
  Card,
  C, DistributionHeader, DistributionRing, formatNumber,
} from './shared';
import { toast } from '@/components/ui/toast';
import { ColumnChart, GlassCalendar, StatSectionLabel } from './AppCharts';
import type { OperatingRoom } from '../../types';
import {
  fetchNotificationsLog,
  fetchStatusHistory,
  updateRoomHourlyOperatingCost,
  type NotificationLogRow,
  type StatusHistoryRow,
} from '../../lib/db';
import { useWorkflowStatusesContext } from '../../contexts/WorkflowStatusesContext';

type Period = 'den' | 'týden' | 'měsíc' | 'rok';

interface FinanceTabProps {
  rooms: OperatingRoom[];
  totalOps: number;
  avgUtilization: number;
  periodLabel: Period;
  /** Samostatný pohled pro záložku se správou hodinových sazeb. */
  view?: 'finance' | 'rates';
  /**
   * Volitelná předpočítaná historie statusů. Pokud není předaná,
   * komponenta si načte vlastní řez podle aktuálního období.
   */
  statusHistory?: StatusHistoryRow[];
  /** Delší databázová historie pro měsíční finanční kalendář. */
  calendarHistory?: StatusHistoryRow[];
  /** Reálné záznamy odeslaných hlášení za zvolené období. */
  notifications?: NotificationLogRow[] | null;
}

interface SpecialtyDepartment {
  id: string;
  name: string;
  accent_color?: string | null;
}

interface SpecialtyAllocation {
  id: string;
  operating_room_id: string;
  department_id: string | null;
  allocation_date: string;
  day_part: 'AM' | 'PM';
  allocation_kind: 'SPECIALTY' | 'CLOSED' | 'SERVICE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Konstanty pro mapování období → časový rozsah a granularita grafu
// ─────────────────────────────────────────────────────────────────────────────
const PERIOD_HOURS: Record<Period, number> = {
  'den':   24,
  'týden': 24 * 7,
  'měsíc': 24 * 30,
  'rok':   24 * 365,
};

const STATS_CARD_CLASS = '!rounded-xl [background:var(--stats-surface)!important] [box-shadow:none!important]';

/**
 * „Sál připraven" je klidový stav mezi výkony — sál nikdo neobsazuje, takže se
 * jeho čas do nákladů provozu nepočítá. Dřív tu byl naopak výčet provozních
 * fází, jenže neodpovídal názvům ve workflow (chyběl v něm i „Chirurgický
 * výkon"), takže se náklady počítaly jen ze zlomku času.
 *
 * Porovnání ignoruje diakritiku a velikost písmen, aby přežilo drobné odchylky
 * v pojmenování statusu.
 */
const isIdlePhaseName = (name: string | null | undefined): boolean => {
  const normalized = (name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '');
  return normalized.includes('sal') && normalized.includes('priprav');
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

/** Počet kalendářních dnů, které dané období pokrývá. */
const PERIOD_DAYS: Record<Period, number> = { 'den': 1, 'týden': 7, 'měsíc': 30, 'rok': 365 };
const LATEST_PROGRAM_START_GRACE_MINUTES = 60;

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const operationalToday = () => {
  const date = new Date();
  if (date.getHours() < 7) date.setDate(date.getDate() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDuration = (minutes: number) => {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
};

/**
 * Kapacita sálu za období = součet jeho pracovní doby přes jednotlivé dny
 * (bez přestávek), ne kalendářní čas. Sál s osmihodinovým provozem, který
 * odslouží šest hodin, má vytížení 75 %, ne 25 % z celého dne.
 */
const roomCapacityHours = (room: OperatingRoom, period: Period, anchorDate = new Date()): number => {
  const days = PERIOD_DAYS[period];
  const today = new Date(anchorDate);
  let minutes = 0;

  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const schedule = room.weeklySchedule?.[DAY_KEYS[date.getDay()]];
    if (!schedule?.enabled) continue;

    const gross = Math.max(
      0,
      (schedule.endHour * 60 + schedule.endMinute) - (schedule.startHour * 60 + schedule.startMinute),
    );
    const breakMinutes = typeof schedule.breakMinutes === 'number' && schedule.breakMinutes > 0
      ? Math.min(schedule.breakMinutes, gross)
      : 0;
    minutes += gross - breakMinutes;
  }

  return minutes / 60;
};

/**
 * Vrátí průnik intervalu s nastavenou pracovní dobou sálu po jednotlivých
 * lokálních dnech. Časy mimo povolené okno se nikdy nezapočítají.
 * `breakMinutes` zde nelze odečíst z konkrétního místa intervalu, protože
 * databáze ukládá jen délku pauzy, ne její začátek a konec.
 */
const roomWorkingOverlapByDay = (
  room: OperatingRoom,
  rawStart: Date,
  rawEnd: Date,
): Array<{ date: string; seconds: number }> => {
  const startMs = rawStart.getTime();
  const endMs = rawEnd.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];

  const overlaps: Array<{ date: string; seconds: number }> = [];
  const cursor = new Date(rawStart);
  cursor.setHours(0, 0, 0, 0);
  const finalDay = new Date(rawEnd);
  finalDay.setHours(0, 0, 0, 0);

  while (cursor <= finalDay) {
    const schedule = room.weeklySchedule?.[DAY_KEYS[cursor.getDay()]];
    if (schedule?.enabled) {
      const workStart = new Date(cursor);
      workStart.setHours(schedule.startHour, schedule.startMinute, 0, 0);
      const workEnd = new Date(cursor);
      workEnd.setHours(schedule.endHour, schedule.endMinute, 0, 0);
      const overlapStart = Math.max(startMs, workStart.getTime());
      const overlapEnd = Math.min(endMs, workEnd.getTime());
      if (overlapEnd > overlapStart) {
        overlaps.push({ date: localDateKey(cursor), seconds: (overlapEnd - overlapStart) / 1_000 });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return overlaps;
};

const roomWorkingOverlapSeconds = (room: OperatingRoom, start: Date, end: Date) =>
  roomWorkingOverlapByDay(room, start, end).reduce((sum, item) => sum + item.seconds, 0);

const isInsideRoomWorkingHours = (room: OperatingRoom, at: Date) => {
  if (!Number.isFinite(at.getTime())) return false;
  const schedule = room.weeklySchedule?.[DAY_KEYS[at.getDay()]];
  if (!schedule?.enabled) return false;
  const minute = at.getHours() * 60 + at.getMinutes();
  const start = schedule.startHour * 60 + schedule.startMinute;
  const end = schedule.endHour * 60 + schedule.endMinute;
  return minute >= start && minute < end;
};

const fmtCZKShort = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)} M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)} k`;
  return `${Math.round(v)}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Prvky ve stylu předlohy — hluboká plocha s barevným nádechem, kruhová ikona
// vpravo nahoře, oddělovač a řádky štítek/hodnota.
//
// Velikosti písma zůstávají shodné se zbytkem aplikace: popisky 10–11 px
// prostrkaně, hlavní hodnota 24 px (text-2xl), doplňky 11 px.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kompaktní karta sálu podle dodané předlohy: modře tónované sklo, dominantní
 * částka a šest rychle čitelných provozních metrik.
 */
const YieldCard: React.FC<{
  value: string;
  unit?: string;
  sub?: string;
  caption?: string;
  color: string;
  onClick?: () => void;
  costLabel?: string;
  rows: Array<{ label: string; value: string }>;
}> = ({ value, unit, sub, caption, color, rows, onClick, costLabel = 'Náklady za období' }) => (
  <div
    className="group relative rounded-xl p-3.5 flex flex-col overflow-hidden w-full text-left transition-colors duration-200"
    style={{
      background: 'var(--stats-surface-2)',
      border: `1px solid ${C.border}`,
    }}
  >
    {onClick && (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Zobrazit rozpad nákladů sálu ${sub ?? 'operační sál'}`}
        className="absolute inset-0 z-10 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{ color }}
      >
        <span className="sr-only">Zobrazit detail nákladů</span>
      </button>
    )}
    <span
      aria-hidden
      className="absolute inset-x-4 top-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${color}cc, transparent)` }}
    />

    <div className="relative flex items-start min-h-[50px]">
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase font-bold tracking-[0.14em]" style={{ color }}>
          Operační sál
        </p>
        <p
          className="text-[15px] sm:text-[16px] font-semibold leading-[1.15] mt-0.5 line-clamp-2"
          style={{ color: C.textHi }}
          title={sub}
        >
          {sub}
        </p>
        {caption && (
          <p className="text-[8px] uppercase tracking-[0.08em] mt-1 truncate" style={{ color: C.muted }} title={caption}>
            {caption}
          </p>
        )}
      </div>
    </div>

    <div className="relative mt-2.5 pt-2.5 flex items-end justify-between gap-3" style={{ borderTop: `1px solid ${color}25` }}>
      <p className="text-[8px] uppercase font-semibold tracking-[0.1em] pb-0.5" style={{ color: C.muted }}>
        {costLabel}
      </p>
      <p className="text-[24px] font-semibold tabular-nums tracking-tight leading-none whitespace-nowrap" style={{ color: C.textHi }}>
        {value}
        {unit && <span className="text-[11px] font-semibold ml-1" style={{ color }}>{unit}</span>}
      </p>
    </div>

    <div className="relative mt-2.5 grid grid-cols-2 gap-1">
      {rows.map(row => (
        <div
          key={row.label}
          className="rounded-md px-2 py-1.5 min-w-0 flex items-center justify-between gap-1.5"
          style={{ background: `${color}0a`, border: `1px solid ${color}1c` }}
        >
          <p className="text-[7px] uppercase font-semibold tracking-[0.06em] truncate" style={{ color: C.muted }}>{row.label}</p>
          <p className="text-[10px] font-semibold tabular-nums truncate shrink-0" style={{ color: C.textHi }} title={row.value}>
            {row.value}
          </p>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Panel se seznamem ve stylu předlohy: tlumená plocha, nahoře pilulka
 * s názvem a vpravo pilulka se souhrnem, pod tím řádky s číslicemi.
 */
const PanelCard: React.FC<{
  title: string;
  badge?: string;
  note?: string;
  footer?: { label: string; value: string };
  icon?: React.ElementType;
  accent?: string;
  children: React.ReactNode;
}> = ({ title, badge, note, footer, icon: Icon = Wallet, accent = C.accent, children }) => (
  <div
    className="relative overflow-hidden rounded-xl p-4 sm:p-5 flex flex-col"
    style={{
      background: 'var(--stats-surface)',
      border: `1px solid ${C.border}`,
    }}
  >
    <span
      aria-hidden
      className="absolute left-8 right-8 top-0 h-px"
      style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
    />
    <div className="flex items-center gap-2">
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}33` }}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-[0.16em]" style={{ color: accent }}>Finance</p>
        <p className="truncate text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>{title}</p>
      </div>
      {badge && (
        <span
          className="ml-auto px-3 py-1.5 rounded-md text-[11px] font-semibold tabular-nums shrink-0"
          style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}2b` }}
        >
          {badge}
        </span>
      )}
    </div>

    {note && <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{note}</p>}

    <div className="mt-4 flex flex-col">{children}</div>

    {footer && (
      <div
        className="mt-4 pt-3.5 flex items-center justify-between px-1"
        style={{ borderTop: `1px solid ${C.border}` }}
      >
        <span className="text-[10px] uppercase tracking-[0.12em] font-semibold" style={{ color: C.faint }}>
          {footer.label}
        </span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.textHi }}>
          {footer.value}
        </span>
      </div>
    )}
  </div>
);

/** Jeden řádek panelu — vlevo popisek, vpravo číslo. */
const PanelRow: React.FC<{
  index?: string;
  label: string;
  value: string;
  dot?: string;
  children?: React.ReactNode;
}> = ({ index, label, value, dot, children }) => (
  <div
    className="flex items-center gap-2 rounded-xl px-3 py-2.5 min-h-11"
    style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.border}` }}
  >
    {index && (
      <span className="text-[10px] font-medium tabular-nums w-5 shrink-0" style={{ color: C.faint }}>
        {index}
      </span>
    )}
    {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />}
    <span className="text-[11px] truncate min-w-0 flex-1" style={{ color: C.muted }} title={label}>
      {label}
    </span>
    {children ?? (
      <span className="text-[12px] font-semibold tabular-nums shrink-0" style={{ color: C.textHi }}>
        {value}
      </span>
    )}
  </div>
);

/** Kompaktní odznak v hlavičce ve stejném jazyce jako ostatní statistické moduly. */
const HeadChip: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <div
    className="rounded-lg px-2.5 py-2 flex items-center gap-2.5"
    style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}
  >
    <span
      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
      style={{ background: `${color}14`, color, border: `1px solid ${color}28` }}
    >
      <Icon className="w-4 h-4" />
    </span>
    <span className="text-[10px] font-medium" style={{ color: C.muted }}>
      {label}<span className="block mt-0.5 text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{value}</span>
    </span>
  </div>
);

/** Pilulková dlaždice s ikonou ve čtverečku — jako pruh metrik na předloze. */
const PillMetric: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
}> = ({ label, value, icon: Icon, color = C.text }) => (
  <div
    className="rounded-xl px-3.5 py-3 flex items-center gap-3"
    style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}
  >
    <span
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: `${color}14`, color, border: `1px solid ${color}28` }}
    >
      <Icon className="w-4 h-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[10px] uppercase font-semibold tracking-[0.12em] truncate" style={{ color: C.muted }}>
        {label}
      </p>
      <p className="text-[15px] font-semibold tabular-nums mt-0.5" style={{ color: C.text }}>{value}</p>
    </div>
  </div>
);

const RateMetric: React.FC<{
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, detail, icon: Icon, color }) => (
  <div className="group relative min-h-[112px] overflow-hidden rounded-xl p-4 text-left" style={{ background: 'var(--stats-surface-2)', border: `1px solid ${C.border}` }}>
    <span className="absolute inset-x-4 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <div className="flex min-h-[44px] items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium" style={{ color: C.textHi }}>{label}</p>
        <p className="mt-1 truncate text-[10px]" style={{ color: C.muted }}>{detail}</p>
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105" style={{ color, border: `1px solid ${color}35`, background: `${color}0e` }}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </div>
    <p className="mt-3 truncate whitespace-nowrap text-[26px] font-light leading-none tabular-nums tracking-tight" style={{ color: C.textHi }}>{value}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FinanceTab — vše počítáno z reálných DB dat
// ─────────────────────────────────────────────────────────────────────────────
export function FinanceTab({
  rooms,
  periodLabel,
  view = 'finance',
  statusHistory: providedHistory,
  calendarHistory,
  notifications: providedNotifications,
}: FinanceTabProps) {
  // Barvy fází bereme z nastavení workflow statusů — graf tak odpovídá tomu,
  // co personál vidí na sále.
  const { workflowStatuses } = useWorkflowStatusesContext();
  const [history, setHistory] = useState<StatusHistoryRow[]>(providedHistory ?? []);
  const [historyLoading, setHistoryLoading] = useState(!providedHistory);
  const [notificationRows, setNotificationRows] = useState<NotificationLogRow[]>(providedNotifications ?? []);
  const [specialtyAllocations, setSpecialtyAllocations] = useState<SpecialtyAllocation[]>([]);
  const [specialtyDepartments, setSpecialtyDepartments] = useState<SpecialtyDepartment[]>([]);
  const [delayDataLoading, setDelayDataLoading] = useState(true);
  const [calendarDay, setCalendarDay] = useState<Date>(() => operationalToday());
  const [calendarSelectionActive, setCalendarSelectionActive] = useState(false);
  const [selectedDayHistory, setSelectedDayHistory] = useState<StatusHistoryRow[]>([]);
  const [selectedDayNotifications, setSelectedDayNotifications] = useState<NotificationLogRow[]>([]);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  // Optimistická lokální mapa hodinových sazeb (do doby než parent rerendruje rooms)
  const [hourlyCostOverride, setHourlyCostOverride] = useState<Record<string, number | null>>({});
  // Editor state
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [selectedCostRoomId, setSelectedCostRoomId] = useState<string | null>(null);

  // Načtení status history pro aktuální období (jen pokud nedostáno odshora)
  useEffect(() => {
    if (providedHistory) {
      setHistory(providedHistory);
      setHistoryLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const fromDate = new Date();
        fromDate.setHours(fromDate.getHours() - PERIOD_HOURS[periodLabel]);
        const data = await fetchStatusHistory({
          fromDate,
          limit: 5000,
        });
        if (!cancelled) setHistory(data ?? []);
      } catch (err) {
        console.error('[FinanceTab] failed to load status history', err);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [periodLabel, providedHistory]);

  useEffect(() => {
    if (providedNotifications) {
      setNotificationRows(providedNotifications);
      return;
    }

    let cancelled = false;
    void (async () => {
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - PERIOD_HOURS[periodLabel] * 60 * 60 * 1_000);
      const rows = await fetchNotificationsLog({ fromDate, toDate, all: true });
      if (!cancelled) setNotificationRows(rows ?? []);
    })();
    return () => { cancelled = true; };
  }, [periodLabel, providedNotifications]);

  const handleCalendarDayChange = useCallback((day: Date) => {
    const normalized = new Date(day);
    normalized.setHours(0, 0, 0, 0);
    setCalendarDay(normalized);
    setCalendarSelectionActive(true);
  }, []);

  // Změna globálního období ruší denní filtr. Samotný klik v kalendáři pak
  // vždy načte přesný lokální kalendářní den přímo z databáze.
  useEffect(() => {
    setCalendarSelectionActive(false);
    setCalendarDay(operationalToday());
  }, [periodLabel]);

  useEffect(() => {
    if (!calendarSelectionActive) return;
    let cancelled = false;
    const fromDate = new Date(calendarDay);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 1);
    toDate.setMilliseconds(-1);

    setSelectedDayLoading(true);
    setSelectedDayHistory([]);
    setSelectedDayNotifications([]);

    void Promise.all([
      fetchStatusHistory({ fromDate, toDate, all: true }),
      fetchNotificationsLog({ fromDate, toDate, all: true }),
    ]).then(([statusRows, notifications]) => {
      if (cancelled) return;
      setSelectedDayHistory(statusRows ?? []);
      setSelectedDayNotifications(notifications ?? []);
    }).catch(error => {
      console.error('[FinanceTab] failed to load selected calendar day', error);
      if (!cancelled) {
        setSelectedDayHistory([]);
        setSelectedDayNotifications([]);
        toast.error('Statistiky vybraného dne se nepodařilo načíst.');
      }
    }).finally(() => {
      if (!cancelled) setSelectedDayLoading(false);
    });

    return () => { cancelled = true; };
  }, [calendarDay, calendarSelectionActive]);

  const calculationHistory = calendarSelectionActive ? selectedDayHistory : history;
  const calculationNotifications = calendarSelectionActive ? selectedDayNotifications : notificationRows;
  const calculationPeriod: Period = calendarSelectionActive ? 'den' : periodLabel;
  const calculationAnchorDate = calendarSelectionActive ? calendarDay : undefined;
  const selectedDayStartMs = useMemo(() => {
    const start = new Date(calendarDay);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, [calendarDay]);

  // Odbornost operatéra je určena výhradně rozpisem sálů v databázi. Rozpis
  // načítáme pro všechny roky, do kterých zvolené období zasahuje.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      setDelayDataLoading(true);
      const now = new Date();
      const from = new Date(now.getTime() - PERIOD_HOURS[periodLabel] * 60 * 60 * 1_000);
      const years = Array.from(new Set([from.getFullYear(), now.getFullYear(), calendarDay.getFullYear()]));

      try {
        const payloads = await Promise.all(years.map(async year => {
          const response = await fetch(`/api/room-specialty-allocations?year=${year}`, {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Rozpis odborností se nepodařilo načíst.');
          return response.json() as Promise<{
            allocations?: SpecialtyAllocation[];
            departments?: SpecialtyDepartment[];
          }>;
        }));

        if (cancelled) return;
        const allocations = payloads.flatMap(payload => payload.allocations ?? []);
        const departments = new Map<string, SpecialtyDepartment>();
        payloads.flatMap(payload => payload.departments ?? []).forEach(department => departments.set(department.id, department));
        setSpecialtyAllocations(allocations);
        setSpecialtyDepartments(Array.from(departments.values()));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[FinanceTab] failed to load specialty schedule', error);
        if (!cancelled) {
          setSpecialtyAllocations([]);
          setSpecialtyDepartments([]);
        }
      } finally {
        if (!cancelled) setDelayDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [calendarDay, periodLabel]);

  // ── Per-room hodiny provozu spočítané z reálných duration_seconds ─────
  const roomBusyHours = useMemo(() => {
    const map = new Map<string, number>();
    const roomById = new Map(rooms.map(room => [room.id, room]));
    rooms.forEach(r => map.set(r.id, 0));
    for (const row of calculationHistory) {
      if (!row.operating_room_id) continue;
      // Doba fáze je uložená jen u přechodu mezi fázemi. Ostatní události
      // (příjezd pacienta, konec výkonu) nesou tutéž hodnotu znovu a jejich
      // započtením by se čas zdvojil.
      if (row.event_type !== 'step_change') continue;
      if (isIdlePhaseName(row.step_name)) continue;
      const seconds = Number(row.duration_seconds ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const room = roomById.get(row.operating_room_id);
      if (!room) continue;
      const end = new Date(row.timestamp);
      const start = new Date(end.getTime() - seconds * 1_000);
      const workingSeconds = roomWorkingOverlapSeconds(room, start, end);
      if (workingSeconds <= 0) continue;
      const prev = map.get(row.operating_room_id) ?? 0;
      map.set(row.operating_room_id, prev + workingSeconds / 3600);
    }
    return map;
  }, [calculationHistory, rooms]);

  // ── Sazba per sál (s lokálním override pro instant feedback) ─────────
  const getRate = useCallback((room: OperatingRoom): number | null => {
    if (room.id in hourlyCostOverride) return hourlyCostOverride[room.id];
    return room.hourlyOperatingCost ?? null;
  }, [hourlyCostOverride]);

  /**
   * Skutečné prostoje a incidenty po sálech.
   *
   * - prostoj = konec operace → následující začátek ve stejný kalendářní den,
   * - pozdní start = první začátek dne po hranici pracovní doba + 60 minut,
   *   ale pouze ve dni, kdy má sál v databázi AM rozpis odbornosti,
   * - personální/pacientské příčiny = počet reálně odeslaných hlášení.
   *
   * Hlášení neobsahují dobu trvání, proto se záměrně nepřevádějí na minuty.
   */
  const roomOperationalMetrics = useMemo(() => {
    type Metric = {
      downtimeMinutes: number;
      downtimeIntervals: number;
      delayedStartMinutes: number;
      delayedStartDays: number;
      scheduledDaysWithOperation: number;
      lateSurgeon: number;
      lateAnesthesiologist: number;
      patientNotReady: number;
      surgeonSpecialties: Map<string, number>;
    };

    const result = new Map<string, Metric>();
    const getMetric = (roomId: string) => {
      const existing = result.get(roomId);
      if (existing) return existing;
      const created: Metric = {
        downtimeMinutes: 0,
        downtimeIntervals: 0,
        delayedStartMinutes: 0,
        delayedStartDays: 0,
        scheduledDaysWithOperation: 0,
        lateSurgeon: 0,
        lateAnesthesiologist: 0,
        patientNotReady: 0,
        surgeonSpecialties: new Map<string, number>(),
      };
      result.set(roomId, created);
      return created;
    };
    rooms.forEach(room => getMetric(room.id));
    const roomById = new Map(rooms.map(room => [room.id, room]));

    const departmentById = new Map(specialtyDepartments.map(department => [department.id, department]));
    const allocationBySlot = new Map(
      specialtyAllocations.map(allocation => [
        `${allocation.operating_room_id}|${allocation.allocation_date}|${allocation.day_part}`,
        allocation,
      ]),
    );
    const analysisFromMs = calendarSelectionActive
      ? selectedDayStartMs
      : Date.now() - PERIOD_HOURS[periodLabel] * 60 * 60 * 1_000;

    const eventsByRoom = new Map<string, StatusHistoryRow[]>();
    for (const event of calculationHistory) {
      if (event.event_type !== 'operation_start' && event.event_type !== 'operation_end') continue;
      const current = eventsByRoom.get(event.operating_room_id) ?? [];
      current.push(event);
      eventsByRoom.set(event.operating_room_id, current);
    }

    for (const room of rooms) {
      const metric = getMetric(room.id);
      const events = (eventsByRoom.get(room.id) ?? [])
        .filter(event => Number.isFinite(new Date(event.timestamp).getTime()))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const firstStartByDay = new Map<string, Date>();
      let lastEnd: Date | null = null;

      for (const event of events) {
        const at = new Date(event.timestamp);
        const dateKey = localDateKey(at);
        if (event.event_type === 'operation_end') {
          lastEnd = at;
          continue;
        }

        const firstStart = firstStartByDay.get(dateKey);
        if (!firstStart || at < firstStart) firstStartByDay.set(dateKey, at);

        if (lastEnd && localDateKey(lastEnd) === dateKey && at > lastEnd) {
          const workingSeconds = roomWorkingOverlapSeconds(room, lastEnd, at);
          if (workingSeconds > 0) {
            metric.downtimeMinutes += workingSeconds / 60;
            metric.downtimeIntervals += 1;
          }
        }
        lastEnd = null;
      }

      for (const [dateKey, firstStart] of firstStartByDay) {
        const allocation = allocationBySlot.get(`${room.id}|${dateKey}|AM`);
        if (!allocation || allocation.allocation_kind !== 'SPECIALTY') continue;

        const schedule = room.weeklySchedule?.[DAY_KEYS[firstStart.getDay()]];
        if (!schedule?.enabled) continue;

        const plannedStart = new Date(firstStart);
        plannedStart.setHours(schedule.startHour, schedule.startMinute, 0, 0);
        // U prvního (částečně zahrnutého) dne období nemusí historie obsahovat
        // skutečný první výkon. Takový den nelze korektně vyhodnotit.
        if (plannedStart.getTime() < analysisFromMs) continue;
        metric.scheduledDaysWithOperation += 1;
        const latestOnTimeStart = new Date(plannedStart);
        latestOnTimeStart.setMinutes(latestOnTimeStart.getMinutes() + LATEST_PROGRAM_START_GRACE_MINUTES);
        const workEnd = new Date(firstStart);
        workEnd.setHours(schedule.endHour, schedule.endMinute, 0, 0);
        const countedUntil = Math.min(firstStart.getTime(), workEnd.getTime());
        const delayMinutes = (countedUntil - latestOnTimeStart.getTime()) / 60_000;
        if (delayMinutes > 0) {
          metric.delayedStartMinutes += delayMinutes;
          metric.delayedStartDays += 1;
        }
      }
    }

    for (const notification of calculationNotifications) {
      if (!notification.room_id) continue;
      const notificationRoom = roomById.get(notification.room_id);
      const notificationAt = new Date(notification.created_at);
      if (!notificationRoom || !isInsideRoomWorkingHours(notificationRoom, notificationAt)) continue;
      const metric = getMetric(notification.room_id);
      if (notification.notification_type === 'notify_late_surgeon') {
        metric.lateSurgeon += 1;
        const slot = notificationAt.getHours() < 12 ? 'AM' : 'PM';
        const allocation = Number.isFinite(notificationAt.getTime())
          ? allocationBySlot.get(`${notification.room_id}|${localDateKey(notificationAt)}|${slot}`)
          : undefined;
        const specialty = allocation?.allocation_kind === 'SPECIALTY' && allocation.department_id
          ? departmentById.get(allocation.department_id)?.name ?? 'Neznámá odbornost v rozpisu'
          : 'Bez odbornosti v rozpisu';
        metric.surgeonSpecialties.set(specialty, (metric.surgeonSpecialties.get(specialty) ?? 0) + 1);
      } else if (notification.notification_type === 'notify_late_anesthesiologist') {
        metric.lateAnesthesiologist += 1;
      } else if (notification.notification_type === 'notify_patient_not_ready') {
        metric.patientNotReady += 1;
      }
    }

    return result;
  }, [calculationHistory, calculationNotifications, calendarSelectionActive, periodLabel, rooms, selectedDayStartMs, specialtyAllocations, specialtyDepartments]);

  // ── Per-room cost analýza ────────────────────────────────────────────
  const roomFinance = useMemo(() => {
    return rooms.map(r => {
      const rate = getRate(r);
      const hours = roomBusyHours.get(r.id) ?? 0;
      const cost = rate !== null && rate >= 0 ? rate * hours : null;
      // Vytížení se poměřuje proti pracovní době sálu, ne proti kalendáři.
      const capacityHours = roomCapacityHours(r, calculationPeriod, calculationAnchorDate);
      const utilizationPct = capacityHours > 0
        ? Math.min(100, (hours / capacityHours) * 100)
        : 0;
      const operational = roomOperationalMetrics.get(r.id);
      const downtimeMinutes = operational?.downtimeMinutes ?? 0;
      const delayedStartMinutes = operational?.delayedStartMinutes ?? 0;
      return {
        id: r.id,
        name: r.name,
        department: r.department,
        rate,
        hours,
        capacityHours,
        cost,
        utilizationPct,
        opsCount: calculationHistory.filter(row =>
          row.operating_room_id === r.id
          && row.event_type === 'operation_start'
          && isInsideRoomWorkingHours(r, new Date(row.timestamp))
        ).length,
        configured: rate !== null && rate >= 0,
        downtimeMinutes,
        downtimeIntervals: operational?.downtimeIntervals ?? 0,
        downtimeCost: rate !== null && rate >= 0 ? (downtimeMinutes / 60) * rate : null,
        delayedStartMinutes,
        delayedStartDays: operational?.delayedStartDays ?? 0,
        scheduledDaysWithOperation: operational?.scheduledDaysWithOperation ?? 0,
        delayedStartCost: rate !== null && rate >= 0 ? (delayedStartMinutes / 60) * rate : null,
        lateSurgeon: operational?.lateSurgeon ?? 0,
        lateAnesthesiologist: operational?.lateAnesthesiologist ?? 0,
        patientNotReady: operational?.patientNotReady ?? 0,
        surgeonSpecialties: Array.from(operational?.surgeonSpecialties.entries() ?? [])
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'cs')),
      };
    });
  }, [rooms, getRate, roomBusyHours, calculationPeriod, calculationAnchorDate, calculationHistory, roomOperationalMetrics]);

  const workingOpsCount = useMemo(
    () => roomFinance.reduce((sum, room) => sum + room.opsCount, 0),
    [roomFinance],
  );
  const workingAvgUtilization = useMemo(
    () => roomFinance.length > 0
      ? roomFinance.reduce((sum, room) => sum + room.utilizationPct, 0) / roomFinance.length
      : 0,
    [roomFinance],
  );

  /** Intenzita dnů v kalendáři = skutečný náklad uvnitř pracovní doby. */
  const financeCalendarHeat = useMemo(() => {
    const source = calendarHistory ?? history;
    const roomById = new Map(rooms.map(room => [room.id, room]));
    const costsByDay = new Map<string, number>();

    for (const row of source) {
      if (row.event_type !== 'step_change' || isIdlePhaseName(row.step_name)) continue;
      const seconds = Number(row.duration_seconds ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const room = roomById.get(row.operating_room_id);
      if (!room) continue;
      const rate = getRate(room);
      if (rate === null || rate < 0) continue;

      const end = new Date(row.timestamp);
      const start = new Date(end.getTime() - seconds * 1_000);
      for (const overlap of roomWorkingOverlapByDay(room, start, end)) {
        const cost = (overlap.seconds / 3600) * rate;
        costsByDay.set(overlap.date, (costsByDay.get(overlap.date) ?? 0) + cost);
      }
    }

    const maximum = Math.max(0, ...costsByDay.values());
    if (maximum <= 0) return {};
    return Object.fromEntries(
      Array.from(costsByDay.entries()).map(([date, cost]) => [date, cost / maximum]),
    );
  }, [calendarHistory, getRate, history, rooms]);

  // ── Souhrnné metriky ─────────────────────────────────────────────────
  const summary = useMemo(() => {
    const configured = roomFinance.filter(r => r.configured);
    const totalCost = configured.reduce((s, r) => s + (r.cost ?? 0), 0);
    const totalHours = configured.reduce((s, r) => s + r.hours, 0);
    const totalConfiguredOps = configured.reduce((s, r) => s + r.opsCount, 0);
    const avgRate = configured.length > 0
      ? configured.reduce((s, r) => s + (r.rate ?? 0), 0) / configured.length
      : 0;
    const costPerOperation = totalConfiguredOps > 0 ? totalCost / totalConfiguredOps : 0;
    const costPerHour = totalHours > 0 ? totalCost / totalHours : 0;
    const unconfiguredCount = roomFinance.length - configured.length;
    return {
      totalCost,
      totalHours,
      avgRate,
      costPerOperation,
      costPerHour,
      configuredCount: configured.length,
      unconfiguredCount,
    };
  }, [roomFinance]);

  // ── Edit handlers ────────────────────────────────────��───────────────
  const startEdit = (room: OperatingRoom) => {
    setEditingRoomId(room.id);
    const rate = getRate(room);
    setEditingValue(rate !== null && rate !== undefined ? String(rate) : '');
  };
  const cancelEdit = () => {
    setEditingRoomId(null);
    setEditingValue('');
  };
  const saveEdit = async (roomId: string) => {
    const trimmed = editingValue.trim();
    let parsed: number | null;
    if (trimmed === '') {
      parsed = null;
    } else {
      const n = Number(trimmed.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0) {
        toast.error('Zadejte platnou nezápornou hodnotu nebo nechte pole prázdné pro zrušení sazby.');
        return;
      }
      parsed = Math.round(n * 100) / 100;
    }
    setSavingRoomId(roomId);
    try {
      const ok = await updateRoomHourlyOperatingCost(roomId, parsed);
      if (!ok) {
        toast.error('Uložení selhalo. Zkuste to prosím znovu.');
        return;
      }
      // Optimisticky aktualizujeme lokální mapu — sazba je nyní uložena v DB
      setHourlyCostOverride(prev => ({ ...prev, [roomId]: parsed }));
      setEditingRoomId(null);
      setEditingValue('');
      toast.success(parsed === null ? 'Sazba zrušena' : 'Sazba uložena');
    } finally {
      setSavingRoomId(null);
    }
  };

  // ── Daily cost time series (pouze pro daily granularitu pokud period >= týden) ──
  const dailySeries = useMemo(() => {
    if (calculationPeriod === 'den') return [];
    const days = calculationPeriod === 'týden' ? 7 : calculationPeriod === 'měsíc' ? 30 : 30;
    const now = new Date();
    const buckets: Array<{ date: string; label: string; hours: number; cost: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: localDateKey(d),
        label: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
        hours: 0,
        cost: 0,
      });
    }
    const bucketMap = new Map(buckets.map((b, idx) => [b.date, idx]));
    const ratesByRoom = new Map<string, number | null>();
    const roomById = new Map(rooms.map(room => [room.id, room]));
    rooms.forEach(r => ratesByRoom.set(r.id, getRate(r)));

    for (const row of calculationHistory) {
      if (!row.operating_room_id) continue;
      // Stejné pravidlo jako u součtu hodin — jen přechody fází a bez
      // klidového stavu „Sál připraven".
      if (row.event_type !== 'step_change') continue;
      if (isIdlePhaseName(row.step_name)) continue;
      const seconds = Number(row.duration_seconds ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const room = roomById.get(row.operating_room_id);
      if (!room) continue;
      const end = new Date(row.timestamp);
      const start = new Date(end.getTime() - seconds * 1_000);
      const rate = ratesByRoom.get(row.operating_room_id) ?? null;
      for (const overlap of roomWorkingOverlapByDay(room, start, end)) {
        const idx = bucketMap.get(overlap.date);
        if (idx === undefined) continue;
        const hours = overlap.seconds / 3600;
        buckets[idx].hours += hours;
        if (rate !== null && rate >= 0) buckets[idx].cost += hours * rate;
      }
    }
    return buckets;
  }, [calculationHistory, calculationPeriod, rooms, getRate]);

  // ── Cost breakdown by department ─────────────────────────────────────
  const departmentBreakdown = useMemo(() => {
    const map = new Map<string, { cost: number; hours: number; ops: number }>();
    roomFinance.forEach(rf => {
      if (!rf.configured || rf.cost === null) return;
      const prev = map.get(rf.department) ?? { cost: 0, hours: 0, ops: 0 };
      prev.cost += rf.cost;
      prev.hours += rf.hours;
      prev.ops += rf.opsCount;
      map.set(rf.department, prev);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({
        label: name,
        value: data.cost,
        hours: data.hours,
        ops: data.ops,
      }))
      .sort((a, b) => b.value - a.value);
  }, [roomFinance]);

  // ── Všechny sály seřazené podle nákladů ─────────────────────────────
  const allRoomsByCost = useMemo(
    () => [...roomFinance].sort((a, b) => {
      if (a.configured !== b.configured) return a.configured ? -1 : 1;
      return (b.cost ?? 0) - (a.cost ?? 0);
    }),
    [roomFinance],
  );
  const topCostly = useMemo(
    () => allRoomsByCost.filter(r => r.configured).slice(0, 5),
    [allRoomsByCost],
  );

  // Barvy oddělení podle pořadí
  const deptPalette = [C.accent, C.purple, C.green, C.orange, C.pink, C.yellow, C.red, C.blue];

  /* Hero panel ve stejném jazyce jako záložka Přehled: velký prstenec vlevo,
     pod ním malé prstence s rozpadem a vpravo panel doporučení. Všechna čísla
     vycházejí ze stejných výpočtů jako zbytek záložky. */
  const costCoverage = rooms.length > 0
    ? Math.round((summary.configuredCount / rooms.length) * 100)
    : 0;

  /** Malé prstence — podíl nákladů pěti nejdražších sálů na celku. */
  /**
   * Náklady rozpadlé na jednotlivé fáze cyklu pro každý sál.
   * Hodiny fáze × hodinová sazba sálu; klidový stav se nezapočítává.
   */
  const allRoomPhaseCosts = useMemo(() => {
    const byRoom = new Map<string, Map<string, number>>();
    const roomById = new Map(rooms.map(room => [room.id, room]));

    for (const row of calculationHistory) {
      if (!row.operating_room_id) continue;
      if (row.event_type !== 'step_change') continue;
      if (isIdlePhaseName(row.step_name)) continue;
      const seconds = Number(row.duration_seconds ?? 0);
      if (!Number.isFinite(seconds) || seconds <= 0) continue;
      const sourceRoom = roomById.get(row.operating_room_id);
      if (!sourceRoom) continue;
      const end = new Date(row.timestamp);
      const start = new Date(end.getTime() - seconds * 1_000);
      const workingSeconds = roomWorkingOverlapSeconds(sourceRoom, start, end);
      if (workingSeconds <= 0) continue;

      const phase = (row.step_name ?? '').trim() || 'Neurčeno';
      const phases = byRoom.get(row.operating_room_id) ?? new Map<string, number>();
      phases.set(phase, (phases.get(phase) ?? 0) + workingSeconds / 3600);
      byRoom.set(row.operating_room_id, phases);
    }

    return roomFinance
      .filter(r => r.configured && (r.cost ?? 0) > 0)
      .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
      .map(room => {
        const rate = room.rate ?? 0;
        const phases = Array.from(byRoom.get(room.id)?.entries() ?? [])
          .map(([name, hours]) => ({ name, hours, cost: hours * rate }))
          .filter(p => p.cost > 0)
          .sort((a, b) => b.cost - a.cost);

        return {
          id: room.id,
          name: room.name,
          cost: room.cost ?? 0,
          share: summary.totalCost > 0 ? Math.round(((room.cost ?? 0) / summary.totalCost) * 100) : 0,
          phases,
        };
      });
  }, [calculationHistory, roomFinance, rooms, summary.totalCost]);

  const roomPhaseCosts = useMemo(() => allRoomPhaseCosts.slice(0, 5), [allRoomPhaseCosts]);

  /**
   * Barva fáze se bere z nastavení workflow statusů, aby graf odpovídal
   * barvám, které vidí personál na sále. Porovnání názvů ignoruje diakritiku
   * i velikost písmen a snese dvojité mezery (např. „Ukončení  výkonu").
   * Když status není nastavený, sáhne se do záložní palety.
   */
  const phaseColors = useMemo(() => {
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
        .replace(/\s+/g, ' ')
        .trim();

    const configured = new Map<string, string>();
    for (const status of workflowStatuses ?? []) {
      const color = status.accent_color || status.color;
      if (!color) continue;
      for (const label of [status.name, status.title]) {
        if (label) configured.set(normalize(label), color);
      }
    }

    const fallback = [C.accent, C.green, C.orange, C.purple, C.cyan, C.pink, C.yellow, C.blue];
    const names = Array.from(
      new Set(allRoomPhaseCosts.flatMap(room => room.phases.map(p => p.name))),
    );

    const map = new Map<string, string>();
    let fallbackIndex = 0;
    for (const name of names) {
      const fromSettings = configured.get(normalize(name));
      map.set(name, fromSettings ?? fallback[fallbackIndex++ % fallback.length]);
    }
    return map;
  }, [allRoomPhaseCosts, workflowStatuses]);

  const selectedCostRoom = useMemo(() => {
    if (!selectedCostRoomId) return null;
    const finance = roomFinance.find(room => room.id === selectedCostRoomId);
    if (!finance) return null;
    const phaseDetail = allRoomPhaseCosts.find(room => room.id === selectedCostRoomId);
    return {
      ...finance,
      share: summary.totalCost > 0 ? Math.round(((finance.cost ?? 0) / summary.totalCost) * 100) : 0,
      phases: phaseDetail?.phases ?? [],
    };
  }, [selectedCostRoomId, roomFinance, allRoomPhaseCosts, summary.totalCost]);
  const selectedPhaseTotal = useMemo(
    () => selectedCostRoom?.phases.reduce((sum, phase) => sum + phase.cost, 0) ?? 0,
    [selectedCostRoom],
  );

  /** Čtyři nejdražší sály do horní řady karet — jako nabídka na předloze. */
  const featuredRooms = useMemo(
    () =>
      roomFinance
        .filter(r => r.configured)
        .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
        .slice(0, 4),
    [roomFinance],
  );
  const roomCostLabel = `Náklady za ${calculationPeriod}`;

  const configuredRates = roomFinance
    .filter(room => room.configured && room.rate !== null)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
  const highestRateRoom = configuredRates[0] ?? null;
  const lowestRateRoom = configuredRates[configuredRates.length - 1] ?? null;
  const medianRate = configuredRates.length > 0
    ? configuredRates.length % 2 === 1
      ? configuredRates[Math.floor(configuredRates.length / 2)].rate ?? 0
      : ((configuredRates[configuredRates.length / 2 - 1].rate ?? 0) + (configuredRates[configuredRates.length / 2].rate ?? 0)) / 2
    : 0;
  const rateSpread = highestRateRoom && lowestRateRoom
    ? Math.max(0, (highestRateRoom.rate ?? 0) - (lowestRateRoom.rate ?? 0))
    : 0;

  const hourlyRatesPanel = (
    <div className="relative overflow-hidden rounded-xl p-4 sm:p-5" style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ color: C.cyan, background: C.ghost, border: `1px solid ${C.border}` }}>
          <DollarSign className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Hodinové sazby operačních sálů</h3>
          <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>{historyLoading ? 'Načítám historii statusů…' : 'Kliknutím na hodnotu sazbu upravíte'}</p>
        </div>
        <span className="ml-auto rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>{summary.configuredCount}/{rooms.length}</span>
      </div>
      <div className="my-4 h-px" style={{ background: C.border }} />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {roomFinance.map((rf, index) => {
          const room = rooms.find(r => r.id === rf.id);
          if (!room) return null;
          const isEditing = editingRoomId === rf.id;
          const isSaving = savingRoomId === rf.id;

          return (
            <div key={rf.id} className="group relative min-h-[126px] overflow-hidden rounded-lg p-3 transition-colors hover:bg-white/[0.035]" style={{ background: isEditing ? `${C.cyan}0c` : C.surface2, border: `1px solid ${isEditing ? `${C.cyan}65` : C.border}` }}>
              <span className="absolute inset-x-3 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${rf.configured ? C.cyan : C.yellow}, transparent)` }} />
              <div className="flex items-start gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[8px] font-mono" style={{ color: rf.configured ? C.cyan : C.yellow, background: rf.configured ? `${C.cyan}12` : `${C.yellow}12`, border: `1px solid ${rf.configured ? `${C.cyan}28` : `${C.yellow}28`}` }}>{String(index + 1).padStart(2, '0')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold" style={{ color: C.textHi }} title={rf.name}>{rf.name}</p>
                  <p className="mt-0.5 truncate text-[9px]" style={{ color: C.muted }}>{rf.department || 'Bez přiřazeného oddělení'}</p>
                </div>
              </div>
              <div className="mt-3 flex min-h-10 items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: C.border }}>
                <span className="text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: C.faint }}>Sazba</span>
              {isEditing ? (
                <span className="ml-auto flex shrink-0 items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    autoFocus
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(rf.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-[112px] rounded-md px-2 py-1 text-right text-[24px] font-light leading-none tabular-nums tracking-tight"
                    style={{ background: 'var(--stats-ghost)', color: C.text, border: `1px solid ${C.cyan}`, outline: 'none' }}
                    placeholder="0"
                    min={0}
                    step={1}
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => saveEdit(rf.id)}
                    aria-label="Uložit sazbu"
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-emerald-400/10 disabled:opacity-50"
                    style={{ background: `${C.green}0d`, color: C.green, border: `1px solid ${C.green}35` }}
                    title="Uložit"
                  >
                    {isSaving ? <Hourglass size={15} /> : <Check size={16} strokeWidth={2.4} />}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={cancelEdit}
                    aria-label="Zrušit úpravu sazby"
                    className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-red-400/10 disabled:opacity-50"
                    style={{ background: `${C.red}0d`, color: C.red, border: `1px solid ${C.red}30` }}
                    title="Zrušit"
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(room)}
                  title="Upravit sazbu"
                  aria-label={`Upravit sazbu sálu ${rf.name}`}
                  className="group/edit flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 tabular-nums transition-colors hover:bg-white/5"
                  style={{
                    background: 'var(--stats-surface)',
                    border: `1px solid ${rf.configured ? `${C.cyan}2b` : C.border}`,
                    color: rf.configured ? C.text : C.faint,
                  }}
                >
                  {rf.configured ? (
                    <>
                      <span className="text-[26px] font-light leading-none tracking-tight" style={{ color: C.textHi }}>{Math.round(rf.rate ?? 0).toLocaleString('cs-CZ')}</span>
                      <span className="text-[10px] font-medium" style={{ color: C.muted }}>Kč/h</span>
                    </>
                  ) : (
                    <span className="text-[13px] font-medium" style={{ color: C.yellow }}>Nenastaveno</span>
                  )}
                  <Pencil className="h-4 w-4 shrink-0 transition-transform group-hover/edit:scale-110" style={{ color: C.cyan }} strokeWidth={2.1} />
                </button>
              )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t px-1 pt-3.5" style={{ borderColor: C.border }}>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: C.faint }}>Průměrná sazba</span>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.textHi }}>{fmtCZKShort(summary.avgRate)} Kč/h</span>
      </div>
    </div>
  );

  if (view === 'rates') {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 xl:order-2">
            <Card className={`relative overflow-hidden p-5 ${STATS_CARD_CLASS}`}>
              <span className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}aa, transparent)` }} />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium" style={{ color: C.muted }}>Sazby</p>
                  <h2 className="mt-1.5 text-2xl font-semibold tracking-tight" style={{ color: C.textHi }}>Hodinové sazby operačních sálů</h2>
                  <p className="mt-1 text-[11px]" style={{ color: C.muted }}>Hodnoty používané ve všech finančních výpočtech aplikace</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>
                  <DollarSign className="h-3.5 w-3.5" style={{ color: C.cyan }} />
                  {fmtCZKShort(summary.avgRate)} Kč/h průměr
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <RateMetric label="Průměrná sazba" value={`${fmtCZKShort(summary.avgRate)} Kč/h`} detail="napříč nastavenými sály" icon={DollarSign} color={C.cyan} />
                <RateMetric label="Nastavené sály" value={`${summary.configuredCount}/${rooms.length}`} detail="zahrnuté do výpočtů" icon={Check} color={C.green} />
                <RateMetric label="Bez sazby" value={String(summary.unconfiguredCount)} detail="vyžadují doplnění" icon={AlertTriangle} color={summary.unconfiguredCount > 0 ? C.yellow : C.green} />
                <RateMetric label="Pokrytí sazeb" value={`${costCoverage} %`} detail="úplnost konfigurace" icon={Activity} color={C.purple} />
              </div>
            </Card>

            {hourlyRatesPanel}
          </div>

          <aside className="flex flex-col gap-4 xl:order-1">
            <Card className={`relative overflow-hidden p-5 ${STATS_CARD_CLASS}`}>
              <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: C.cyan }} />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: C.cyan, background: `${C.cyan}0f`, border: `1px solid ${C.cyan}2f` }}><DollarSign className="h-5 w-5" /></span>
                  <span className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: costCoverage === 100 ? C.green : C.yellow, border: `1px solid ${costCoverage === 100 ? `${C.green}35` : `${C.yellow}35`}` }}>{costCoverage === 100 ? 'kompletní' : 'doplnit sazby'}</span>
                </div>
                <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>Průměrná hodinová sazba</p>
                <p className="mt-1 text-[44px] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ color: C.textHi }}>{Math.round(summary.avgRate).toLocaleString('cs-CZ')}</p>
                <p className="mt-2 text-[11px]" style={{ color: C.muted }}>Kč za hodinu provozu sálu</p>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span style={{ color: C.muted }}>Pokrytí konfigurace</span>
                    <span className="font-semibold tabular-nums" style={{ color: costCoverage === 100 ? C.green : C.cyan }}>{costCoverage} %</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                    <div className="h-full rounded-full" style={{ width: `${costCoverage}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})` }} />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: C.border }}>
                  {[
                    ['Nejvyšší sazba', highestRateRoom ? `${Math.round(highestRateRoom.rate ?? 0).toLocaleString('cs-CZ')} Kč/h` : '–'],
                    ['Medián', `${Math.round(medianRate).toLocaleString('cs-CZ')} Kč/h`],
                    ['Nejnižší sazba', lowestRateRoom ? `${Math.round(lowestRateRoom.rate ?? 0).toLocaleString('cs-CZ')} Kč/h` : '–'],
                    ['Rozpětí', `${Math.round(rateSpread).toLocaleString('cs-CZ')} Kč/h`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-[11px]" style={{ color: C.muted }}>{label}</span>
                      <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className={`p-5 ${STATS_CARD_CLASS}`}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ color: summary.unconfiguredCount > 0 ? C.yellow : C.green, background: C.ghost, border: `1px solid ${C.border}` }}>
                  {summary.unconfiguredCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Stav konfigurace</h3>
                  <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Kontrola připravenosti výpočtů</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] leading-5" style={{ color: C.text }}>
                {summary.unconfiguredCount > 0
                  ? `${summary.unconfiguredCount} ${summary.unconfiguredCount === 1 ? 'sál nemá' : 'sály nemají'} nastavenou sazbu a nejsou zahrnuté do finančních výpočtů.`
                  : 'Všechny operační sály mají nastavenou sazbu a jsou zahrnuté do finančních výpočtů.'}
              </p>
            </Card>
          </aside>
        </div>

      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ══ Hlavní panel — rozvržení podle předlohy: vlevo obsah,
             vpravo úzký sloupec se souhrnem a doporučeními. ══ */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 xl:order-2">
          {/* Hlavička s odznaky */}
          <Card className={`relative overflow-hidden p-5 ${STATS_CARD_CLASS}`}>
            <span className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-medium tracking-[0.15em]" style={{ color: C.accent }}>
                  Finance
                </p>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight" style={{ color: C.textHi }}>
                  {calendarSelectionActive
                    ? `Náklady provozu · ${calendarDay.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : `Náklady provozu za ${periodLabel}`}
                </h2>
                {calendarSelectionActive && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{ color: C.accent, background: `${C.accent}14`, border: `1px solid ${C.accent}30` }}
                      aria-live="polite"
                    >
                      {selectedDayLoading ? 'Načítám vybraný den…' : 'Statistiky vybraného dne'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarSelectionActive(false)}
                      className="text-[10px] font-semibold transition-opacity hover:opacity-80"
                      style={{ color: C.muted }}
                    >
                      Zpět na období: {periodLabel}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                <HeadChip
                  label="Celkové náklady"
                  value={`${fmtCZKShort(summary.totalCost)} Kč`}
                  icon={Wallet}
                  color={C.accent}
                />
                <HeadChip
                  label="Provozní hodiny"
                  value={`${summary.totalHours.toFixed(1)} h`}
                  icon={Clock}
                  color={C.green}
                />
              </div>
            </div>

            {/* Karty nejdražších sálů — částka, reálný průběh, metriky a detail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
              {featuredRooms.length > 0 ? (
                featuredRooms.map(room => {
                  const color = C.blue;
                  return (
                    <YieldCard
                      key={room.id}
                      value={fmtCZKShort(room.cost ?? 0)}
                      unit="Kč"
                      sub={room.name}
                      caption={room.department}
                      color={color}
                      costLabel={roomCostLabel}
                      onClick={() => setSelectedCostRoomId(room.id)}
                      rows={[
                        {
                          label: 'Provoz',
                          value: room.capacityHours > 0
                            ? `${room.hours.toFixed(1)} / ${room.capacityHours.toFixed(0)} h`
                            : `${room.hours.toFixed(1)} h`,
                        },
                        { label: 'Prostoje', value: formatDuration(room.downtimeMinutes) },
                        {
                          label: 'Pozdní start',
                          value: room.scheduledDaysWithOperation > 0
                            ? (room.delayedStartMinutes > 0 ? formatDuration(room.delayedStartMinutes) : 'Včas')
                            : 'Bez rozpisu',
                        },
                        { label: 'Operatér', value: `${room.lateSurgeon}×` },
                        { label: 'Anesteziolog', value: `${room.lateAnesthesiologist}×` },
                        { label: 'Pacient', value: `${room.patientNotReady}×` },
                      ]}
                    />
                  );
                })
              ) : (
                <p className="col-span-full text-[12px] text-center py-6" style={{ color: C.muted }}>
                  Žádný sál zatím nemá nastavenou hodinovou sazbu.
                </p>
              )}
            </div>
          </Card>

          {/* Podíl na nákladech patří přímo pod hlavní finanční přehled. */}
          {roomPhaseCosts.length > 0 && (
            <Card className={`relative overflow-hidden p-5 ${STATS_CARD_CLASS}`}>
              <span className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
              <DistributionHeader
                eyebrow="Finance"
                title="Podíl na nákladech"
                subtitle="Rozdělení nákladů jednotlivých sálů podle fází operačního cyklu"
                badge={`${roomPhaseCosts.length} sálů`}
              />

              <div className="mt-6 grid gap-x-5 gap-y-8 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                {roomPhaseCosts.map(room => (
                  <div key={room.id} className="flex min-w-0 flex-col items-center gap-2.5">
                    <DistributionRing
                      segments={room.phases.map(p => ({
                        name: p.name,
                        cost: p.cost,
                        color: phaseColors.get(p.name) ?? C.accent,
                      }))}
                      centerValue={`${room.share}%`}
                      centerUnit={`${fmtCZKShort(room.cost)} Kč`}
                    />
                    <p className="max-w-full truncate text-center text-[12px] font-semibold" style={{ color: C.text }} title={room.name}>
                      {room.name}
                    </p>
                    <div className="w-full max-w-[170px] space-y-1">
                      {room.phases.slice(0, 4).map(phase => (
                        <div key={phase.name} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: phaseColors.get(phase.name) ?? C.accent }} />
                          <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }} title={phase.name}>{phase.name}</span>
                          <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.text }}>{fmtCZKShort(phase.cost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Boční sloupec ── */}
        <div className="flex flex-col gap-4 xl:order-1">
          <Card className={`relative overflow-hidden p-5 ${STATS_CARD_CLASS}`}>
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: C.accent }} />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: C.accent, background: `${C.accent}0f`, border: `1px solid ${C.accent}2f` }}>
                  <Wallet className="h-5 w-5" />
                </span>
                <span className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: C.accent, border: `1px solid ${C.accent}35` }}>
                  reálná data
                </span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>
                {calendarSelectionActive ? 'Souhrn vybraného dne' : 'Souhrn období'}
              </p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-[52px] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ color: C.textHi }}>{fmtCZKShort(summary.totalCost)}</p>
                <span className="pb-1 text-[11px]" style={{ color: C.muted }}>Kč</span>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: C.muted }}>celkové náklady provozu · {periodLabel}</p>

              {departmentBreakdown.length > 0 && (
                <div className="mt-5">
                  <div className="flex h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                    {departmentBreakdown.map((department, index) => (
                      <span
                        key={department.label}
                        style={{
                          width: `${summary.totalCost > 0 ? (department.value / summary.totalCost) * 100 : 0}%`,
                          background: deptPalette[index % deptPalette.length],
                        }}
                        title={`${department.label}: ${fmtCZKShort(department.value)} Kč`}
                      />
                    ))}
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {departmentBreakdown.slice(0, 3).map((department, index) => (
                      <div key={department.label} className="flex items-center gap-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: deptPalette[index % deptPalette.length] }} />
                        <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>{department.label}</span>
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{fmtCZKShort(department.value)} Kč</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative mt-5 flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: C.border }}>
              {[
                { label: 'Náklad / hodina', value: `${fmtCZKShort(summary.costPerHour)} Kč` },
                { label: 'Náklad / výkon', value: `${fmtCZKShort(summary.costPerOperation)} Kč` },
                { label: 'Průměrná sazba', value: `${fmtCZKShort(summary.avgRate)} Kč/h` },
                { label: 'Výkonů v pracovní době', value: String(workingOpsCount) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: C.muted }}>{row.label}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.text }}>{row.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="print-hide">
            <GlassCalendar
              value={calendarDay}
              onChange={handleCalendarDayChange}
              heat={financeCalendarHeat}
              accent={C.accent}
              today={operationalToday()}
            />
          </div>
        </div>
      </div>

      {/* ─── DENNÍ TREND NÁKLADŮ ────────────────────────────────── */}
      {dailySeries.length > 0 && (
        <Card className={`p-5 ${STATS_CARD_CLASS}`} title="Denní vývoj nákladů" subtitle="Skutečné hodiny × hodinová sazba" icon={TrendingUp} accent={C.accent}>
          {/* Sloupce ve stejném vizuálním jazyce jako Přehled — hodnota nad
              sloupcem, popisek pod ním, žádné osy a mřížky navíc. */}
          <StatSectionLabel>Náklady po dnech</StatSectionLabel>
          <ColumnChart
            items={dailySeries.map(day => ({ label: day.label, value: day.cost, color: C.accent }))}
            height={150}
            format={fmtCZKShort}
            emptyText="Žádné náklady v tomto období."
          />

        </Card>
      )}

      {/* Náklady podle oddělení */}
      <PanelCard
          title="Podle oddělení"
          badge={`${departmentBreakdown.length}`}
          note="Součet přes sály oddělení"
          footer={departmentBreakdown.length > 0
            ? { label: 'Celkem', value: `${fmtCZKShort(summary.totalCost)} Kč` }
            : undefined}
          icon={Building2}
          accent={C.purple}
        >
          {departmentBreakdown.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {departmentBreakdown.map((d, i) => {
                const color = deptPalette[i % deptPalette.length];
                const share = summary.totalCost > 0 ? (d.value / summary.totalCost) * 100 : 0;
                const relativeWidth = departmentBreakdown[0]?.value > 0
                  ? (d.value / departmentBreakdown[0].value) * 100
                  : 0;

                return (
                  <div
                    key={d.label}
                    className="relative overflow-hidden rounded-xl px-3 py-2.5"
                    style={{
                      background: 'var(--stats-surface-2)',
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-mono tabular-nums shrink-0"
                        style={{ background: `${color}16`, color, border: `1px solid ${color}26` }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate" style={{ color: C.textHi }} title={d.label}>
                          {d.label}
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: C.faint }}>
                          {d.hours.toFixed(1)} h · {d.ops} výkonů
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-semibold tabular-nums" style={{ color: C.textHi }}>
                          {fmtCZKShort(d.value)} <span className="text-[9px]" style={{ color }}>Kč</span>
                        </p>
                        <p className="text-[9px] tabular-nums mt-0.5" style={{ color }}>
                          {share.toFixed(share >= 10 ? 0 : 1)} %
                        </p>
                      </div>
                    </div>

                    <div className="absolute inset-x-3 bottom-0 h-px" style={{ background: 'var(--stats-surface)' }}>
                      <div className="h-full" style={{ width: `${relativeWidth}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] py-2 px-1" style={{ color: C.faint }}>
              Žádná oddělení s nastavenými sazbami.
            </p>
          )}
      </PanelCard>

      {/* Náklady podle všech sálů — plná šířka a responzivní mřížka */}
      <PanelCard
          title="Náklady podle všech sálů"
          badge={`${allRoomsByCost.length}`}
          note="Všechny sály se stejnými provozními údaji jako v záložce Sály"
          footer={allRoomsByCost.length > 0
            ? { label: 'Hodin provozu', value: `${summary.totalHours.toFixed(1)} h` }
            : undefined}
          icon={Wallet}
          accent={C.accent}
        >
          {allRoomsByCost.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {allRoomsByCost.map(rf => {
                return (
                  <YieldCard
                    key={rf.id}
                    value={rf.cost !== null ? fmtCZKShort(rf.cost) : '—'}
                    unit={rf.cost !== null ? 'Kč' : undefined}
                    sub={rf.name}
                    caption={rf.department}
                    color={C.blue}
                    costLabel={roomCostLabel}
                    onClick={() => setSelectedCostRoomId(rf.id)}
                    rows={[
                      {
                        label: 'Provoz',
                        value: rf.capacityHours > 0
                          ? `${rf.hours.toFixed(1)} / ${rf.capacityHours.toFixed(0)} h`
                          : `${rf.hours.toFixed(1)} h`,
                      },
                      { label: 'Prostoje', value: formatDuration(rf.downtimeMinutes) },
                      {
                        label: 'Pozdní start',
                        value: rf.scheduledDaysWithOperation > 0
                          ? (rf.delayedStartMinutes > 0 ? formatDuration(rf.delayedStartMinutes) : 'Včas')
                          : 'Bez rozpisu',
                      },
                      { label: 'Operatér', value: `${rf.lateSurgeon}×` },
                      { label: 'Anesteziolog', value: `${rf.lateAnesthesiologist}×` },
                      { label: 'Pacient', value: `${rf.patientNotReady}×` },
                    ]}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] py-2 px-1" style={{ color: C.faint }}>
              Žádné sály k zobrazení.
            </p>
          )}
      </PanelCard>

      {/* ─── EFEKTIVITA NÁKLADŮ ────────────────────────────────── */}
      <Card className={`p-5 ${STATS_CARD_CLASS}`} title="Efektivita nákladů" subtitle="Klíčové indikátory pro řízení sálu" icon={Activity} accent={C.green} headingLevel={2}>
        {/* Pilulkové dlaždice ve stylu předlohy — ikona ve čtverečku vlevo,
            popisek a hodnota vedle sebe. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          <PillMetric label="Výkony v pracovní době" value={formatNumber(workingOpsCount)} icon={Activity} color={C.accent} />
          <PillMetric
            label="Náklad / hodina"
            value={`${fmtCZKShort(summary.costPerHour)} Kč`}
            icon={Clock}
            color={C.cyan}
          />
          <PillMetric
            label="Náklad / výkon"
            value={`${fmtCZKShort(summary.costPerOperation)} Kč`}
            icon={Coins}
            color={C.green}
          />
          <PillMetric
            label="Vytížení"
            value={`${workingAvgUtilization.toFixed(0)}%`}
            icon={TrendingUp}
            color={C.purple}
          />
        </div>
      </Card>

      {selectedCostRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(2, 8, 23, 0.78)', backdropFilter: 'blur(10px)' }}
          role="presentation"
          onClick={() => setSelectedCostRoomId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-room-detail-title"
            className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-[24px] p-5 sm:p-6"
            style={{
              background: 'linear-gradient(145deg, var(--stats-surface-2), var(--stats-surface))',
              border: `1px solid ${C.accent}38`,
              boxShadow: '0 30px 90px rgba(0, 0, 0, 0.45)',
            }}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedCostRoomId(null)}
              aria-label="Zavřít detail nákladů"
              className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'var(--stats-ghost)', color: C.muted, border: `1px solid ${C.border}` }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pr-12">
              <p className="text-[11px] uppercase font-bold tracking-[0.18em]" style={{ color: C.accent }}>
                Podíl na nákladech
              </p>
              <h3 id="finance-room-detail-title" className="text-2xl font-semibold mt-1" style={{ color: C.textHi }}>
                {selectedCostRoom.name}
              </h3>
              <p className="text-[12px] font-medium mt-1" style={{ color: C.muted }}>{selectedCostRoom.department}</p>
            </div>

            {selectedCostRoom.phases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center mt-6">
                <div className="flex justify-center">
                  <DistributionRing
                    size={200}
                    segments={selectedCostRoom.phases.map(phase => ({
                      name: phase.name,
                      cost: phase.cost,
                      color: phaseColors.get(phase.name) ?? C.accent,
                    }))}
                    centerValue={`${selectedCostRoom.share}%`}
                    centerUnit={`${fmtCZKShort(selectedCostRoom.cost ?? 0)} Kč`}
                  />
                </div>

                <div className="flex flex-col gap-2.5">
                  {selectedCostRoom.phases.map(phase => {
                    const color = phaseColors.get(phase.name) ?? C.accent;
                    const phaseShare = selectedPhaseTotal > 0 ? (phase.cost / selectedPhaseTotal) * 100 : 0;
                    return (
                      <div
                        key={phase.name}
                        className="rounded-xl px-3.5 py-3"
                        style={{ background: `${color}12`, border: `1px solid ${color}38` }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-[13px] font-semibold min-w-0 flex-1 leading-tight" style={{ color: C.textHi }} title={phase.name}>
                            {phase.name}
                          </span>
                          <span className="text-[13px] font-semibold tabular-nums shrink-0" style={{ color: C.textHi }}>
                            {fmtCZKShort(phase.cost)} Kč
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums w-10 text-right shrink-0" style={{ color }}>
                            {phaseShare.toFixed(0)} %
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ background: 'var(--stats-ghost)' }}>
                          <div className="h-full rounded-full" style={{ width: `${phaseShare}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl py-10 px-4 text-center mt-6" style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.border}` }}>
                <p className="text-[13px] font-semibold" style={{ color: C.text }}>Pro tento sál nejsou dostupná data fází.</p>
                <p className="text-[11px] mt-1" style={{ color: C.faint }}>Graf se zobrazí po zaznamenání provozu v daném období.</p>
              </div>
            )}

            <div className="mt-7 pt-6" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase font-bold tracking-[0.16em]" style={{ color: C.orange }}>
                    Prostoje a zpoždění
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: C.muted }}>
                    Skutečné události sálu za zvolené období
                  </p>
                </div>
                <span className="text-[10px] font-medium" style={{ color: delayDataLoading ? C.yellow : C.green }}>
                  {delayDataLoading ? 'Načítám rozpis…' : 'Data z databáze'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl p-4" style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.orange}38` }}>
                  <p className="text-[11px] font-semibold" style={{ color: C.textHi }}>Mezi operacemi</p>
                  <p className="text-[26px] font-semibold tabular-nums mt-2 leading-none" style={{ color: C.orange }}>
                    {formatDuration(selectedCostRoom.downtimeMinutes)}
                  </p>
                  <div className="flex items-center justify-between gap-3 mt-3 text-[11px]">
                    <span style={{ color: C.muted }}>{selectedCostRoom.downtimeIntervals} intervalů</span>
                    <span className="font-semibold tabular-nums" style={{ color: C.textHi }}>
                      {selectedCostRoom.downtimeCost !== null
                        ? `${fmtCZKShort(selectedCostRoom.downtimeCost)} Kč`
                        : 'Sazba chybí'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.yellow}38` }}>
                  <p className="text-[11px] font-semibold" style={{ color: C.textHi }}>Pozdní začátek programu</p>
                  <p className="text-[26px] font-semibold tabular-nums mt-2 leading-none" style={{ color: C.yellow }}>
                    {selectedCostRoom.scheduledDaysWithOperation > 0
                      ? formatDuration(selectedCostRoom.delayedStartMinutes)
                      : 'Bez rozpisu'}
                  </p>
                  <div className="flex items-center justify-between gap-3 mt-3 text-[11px]">
                    <span style={{ color: C.muted }}>
                      {selectedCostRoom.scheduledDaysWithOperation > 0
                        ? `${selectedCostRoom.delayedStartDays} z ${selectedCostRoom.scheduledDaysWithOperation} dnů pozdě`
                        : 'Nelze porovnat s plánem'}
                    </span>
                    <span className="font-semibold tabular-nums" style={{ color: C.textHi }}>
                      {selectedCostRoom.scheduledDaysWithOperation === 0
                        ? '—'
                        : selectedCostRoom.delayedStartCost !== null
                          ? `${fmtCZKShort(selectedCostRoom.delayedStartCost)} Kč`
                          : 'Sazba chybí'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="rounded-2xl p-4" style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.purple}30` }}>
                  <p className="text-[11px] font-semibold" style={{ color: C.textHi }}>Pozdní operatér</p>
                  <p className="text-[24px] font-semibold tabular-nums mt-1" style={{ color: C.purple }}>{selectedCostRoom.lateSurgeon}×</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedCostRoom.surgeonSpecialties.length > 0 ? selectedCostRoom.surgeonSpecialties.map(item => (
                      <span
                        key={item.name}
                        className="px-2 py-1 rounded-full text-[9px] font-semibold"
                        style={{ color: C.text, background: `${C.purple}14`, border: `1px solid ${C.purple}28` }}
                        title={item.name}
                      >
                        {item.name} · {item.count}
                      </span>
                    )) : (
                      <span className="text-[10px]" style={{ color: C.faint }}>Bez hlášení</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.cyan}30` }}>
                  <p className="text-[11px] font-semibold" style={{ color: C.textHi }}>Pozdní anesteziolog</p>
                  <p className="text-[24px] font-semibold tabular-nums mt-1" style={{ color: C.cyan }}>{selectedCostRoom.lateAnesthesiologist}×</p>
                  <p className="text-[10px] mt-2" style={{ color: C.faint }}>Odeslaná hlášení</p>
                </div>

                <div className="rounded-2xl p-4" style={{ background: 'var(--stats-ghost)', border: `1px solid ${C.pink}30` }}>
                  <p className="text-[11px] font-semibold" style={{ color: C.textHi }}>Nepřipravený pacient</p>
                  <p className="text-[24px] font-semibold tabular-nums mt-1" style={{ color: C.pink }}>{selectedCostRoom.patientNotReady}×</p>
                  <p className="text-[10px] mt-2" style={{ color: C.faint }}>Odeslaná hlášení</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
