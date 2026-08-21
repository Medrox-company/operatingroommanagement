"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Wallet, Coins, Clock, TrendingUp, AlertTriangle, Check, X,
  Building2, DollarSign, Activity, Hourglass,
} from 'lucide-react';
import {
  Card,
  C, formatNumber,
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
    className="group relative rounded-[18px] p-3.5 flex flex-col overflow-hidden w-full text-left transition-all duration-200 hover:-translate-y-0.5"
    style={{
      background: `radial-gradient(circle at 88% 8%, ${color}30 0%, transparent 43%), linear-gradient(145deg, ${color}18 0%, var(--stats-surface-2) 47%, var(--stats-surface) 100%)`,
      border: `1px solid ${color}42`,
      boxShadow: `inset 0 1px 0 ${color}1f, 0 14px 32px rgba(0, 0, 0, 0.14)`,
    }}
  >
    {onClick && (
      <button
        type="button"
        onClick={onClick}
        aria-label={`Zobrazit rozpad nákladů sálu ${sub ?? 'operační sál'}`}
        className="absolute inset-0 z-10 rounded-[18px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
        style={{ color }}
      >
        <span className="sr-only">Zobrazit detail nákladů</span>
      </button>
    )}
    <span
      aria-hidden
      className="absolute -left-10 -top-12 w-32 h-32 rounded-full blur-3xl opacity-20"
      style={{ background: color }}
    />
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
    className="relative overflow-hidden rounded-[24px] p-4 sm:p-5 flex flex-col"
    style={{
      background: 'linear-gradient(145deg, var(--stats-surface-2), var(--stats-surface))',
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
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}33` }}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-bold tracking-[0.16em]" style={{ color: accent }}>Finance</p>
        <p className="text-[15px] font-semibold truncate" style={{ color: C.textHi }}>{title}</p>
      </div>
      {badge && (
        <span
          className="ml-auto px-3 py-1.5 rounded-full text-[11px] font-semibold tabular-nums shrink-0"
          style={{ background: `${accent}14`, color: accent, border: `1px solid ${accent}2b` }}
        >
          {badge}
        </span>
      )}
    </div>

    {note && <p className="text-[11px] mt-2.5" style={{ color: C.muted }}>{note}</p>}

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

/**
 * Prstenec rozdělený na fáze cyklu. Každý výsek odpovídá podílu fáze na
 * nákladech daného sálu, uprostřed je celková částka sálu.
 */
const PhaseRing: React.FC<{
  segments: Array<{ name: string; cost: number; color: string }>;
  centerValue: string;
  centerUnit?: string;
  size?: number;
}> = ({ segments, centerValue, centerUnit, size = 132 }) => {
  const total = segments.reduce((sum, s) => sum + s.cost, 0);
  const R = 46;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 108 108" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="54" cy="54" r={R} fill="none" stroke="var(--stats-ghost)" strokeWidth="11" />
        {total > 0 &&
          segments.map(segment => {
            const fraction = segment.cost / total;
            const dash = fraction * CIRC;
            const el = (
              <circle
                key={segment.name}
                cx="54"
                cy="54"
                r={R}
                fill="none"
                stroke={segment.color}
                strokeWidth="11"
                strokeDasharray={`${Math.max(dash - 1.5, 0)} ${CIRC}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-semibold tabular-nums leading-none"
          style={{ color: C.textHi, fontSize: size >= 180 ? 21 : 15 }}
        >
          {centerValue}
        </span>
        {centerUnit && (
          <span className="mt-1 font-medium" style={{ color: C.muted, fontSize: size >= 180 ? 12 : 10 }}>{centerUnit}</span>
        )}
      </div>
    </div>
  );
};

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

/** Odznak v hlavičce — popisek a hodnota v pilulce s kruhovou ikonou. */
const HeadChip: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <div
    className="rounded-full pl-1.5 pr-4 py-1.5 flex items-center gap-2.5"
    style={{ background: 'var(--stats-surface)', border: `1px solid ${color}33` }}
  >
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ background: `${color}26`, color }}
    >
      <Icon className="w-4 h-4" />
    </span>
    <span className="text-[12px] font-medium" style={{ color: C.muted }}>
      {label} <span className="font-semibold tabular-nums" style={{ color }}>({value})</span>
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
    className="rounded-2xl px-3.5 py-3 flex items-center gap-3"
    style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}
  >
    <span
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `${color}1F`, color }}
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

  const hourlyRatesPanel = (
    <PanelCard
      title="Hodinové sazby"
      badge={`${summary.configuredCount}/${rooms.length}`}
      note={historyLoading ? 'Načítám historii statusů…' : 'Kliknutím na sazbu ji upravíte'}
      footer={{ label: 'Průměrná sazba', value: `${fmtCZKShort(summary.avgRate)} Kč/h` }}
      icon={DollarSign}
      accent={C.cyan}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        {roomFinance.map(rf => {
          const room = rooms.find(r => r.id === rf.id);
          if (!room) return null;
          const isEditing = editingRoomId === rf.id;
          const isSaving = savingRoomId === rf.id;

          return (
            <PanelRow key={rf.id} label={rf.name} value="">
              {isEditing ? (
                <span className="flex items-center gap-1 shrink-0">
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
                    className="w-20 px-2 py-1 rounded-full text-right text-[11px] tabular-nums"
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
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--stats-ghost)', color: C.green }}
                    title="Uložit"
                  >
                    {isSaving ? <Hourglass size={11} /> : <Check size={11} />}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={cancelEdit}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--stats-ghost)', color: C.muted }}
                    title="Zrušit"
                  >
                    <X size={11} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(room)}
                  title="Upravit sazbu"
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums shrink-0 transition-colors"
                  style={{
                    background: 'var(--stats-surface)',
                    border: `1px solid ${rf.configured ? `${C.cyan}2b` : C.border}`,
                    color: rf.configured ? C.text : C.faint,
                  }}
                >
                  {rf.configured ? `${Math.round(rf.rate ?? 0).toLocaleString('cs-CZ')} Kč/h` : 'nenastaveno'}
                </button>
              )}
            </PanelRow>
          );
        })}
      </div>
    </PanelCard>
  );

  if (view === 'rates') {
    return (
      <div className="flex flex-col gap-4">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          <span
            aria-hidden
            className="absolute inset-x-12 top-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)` }}
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] uppercase font-bold tracking-[0.18em]" style={{ color: C.cyan }}>
                Správa nákladů
              </p>
              <p className="text-2xl font-semibold mt-1.5" style={{ color: C.textHi }}>
                Hodinové sazby sálů
              </p>
              <p className="text-[12px] mt-1.5 max-w-2xl" style={{ color: C.muted }}>
                Jednotné místo pro nastavení sazeb používaných ve všech finančních výpočtech.
              </p>
            </div>
            <HeadChip
              label="Průměrná sazba"
              value={`${fmtCZKShort(summary.avgRate)} Kč/h`}
              icon={DollarSign}
              color={C.cyan}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5">
            <PillMetric label="Nastavené sály" value={`${summary.configuredCount}/${rooms.length}`} icon={Check} color={C.green} />
            <PillMetric label="Bez sazby" value={String(summary.unconfiguredCount)} icon={AlertTriangle} color={summary.unconfiguredCount > 0 ? C.yellow : C.green} />
            <PillMetric label="Pokrytí sazeb" value={`${costCoverage}%`} icon={Activity} color={C.cyan} />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${costCoverage}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.cyan})` }}
              />
            </div>
            <span className="text-[11px] font-semibold shrink-0" style={{ color: costCoverage === 100 ? C.green : C.yellow }}>
              {costCoverage === 100 ? 'Kompletní' : `${summary.unconfiguredCount} doplnit`}
            </span>
          </div>
        </Card>

        {summary.unconfiguredCount > 0 && (
          <div
            className="flex items-start gap-2 rounded-xl p-3.5"
            style={{ background: `${C.yellow}10`, border: `1px solid ${C.yellow}40` }}
          >
            <AlertTriangle size={15} color={C.yellow} className="shrink-0 mt-px" />
            <p className="text-[11px]" style={{ color: C.text }}>
              <strong>{summary.unconfiguredCount}</strong> {summary.unconfiguredCount === 1 ? 'sál nemá' : 'sály nemají'} nastavenou sazbu a nejsou zahrnuté do finančních výpočtů.
            </p>
          </div>
        )}

        {hourlyRatesPanel}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* ══ Hlavní panel — rozvržení podle předlohy: vlevo obsah,
             vpravo úzký sloupec se souhrnem a doporučeními. ══ */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,330px)] items-start">
        <div className="flex flex-col gap-4">
          {/* Hlavička s odznaky */}
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase font-bold tracking-[0.18em]" style={{ color: C.muted }}>
                  Finance
                </p>
                <p className="text-2xl font-semibold mt-1.5" style={{ color: C.text }}>
                  {calendarSelectionActive
                    ? `Náklady provozu · ${calendarDay.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : `Náklady provozu za ${periodLabel}`}
                </p>
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

          {/* Rozpad nákladů — prstenec za každý sál, výseky jsou fáze cyklu. */}
          {roomPhaseCosts.length > 0 && (
            <Card className="p-6 lg:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
                <StatSectionLabel>Podíl na nákladech</StatSectionLabel>
                <span className="text-[11px]" style={{ color: C.faint }}>
                  Výseky odpovídají fázím operačního cyklu
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-x-7 gap-y-8">
                {roomPhaseCosts.map(room => (
                  <div key={room.id} className="flex flex-col items-center gap-2.5" style={{ width: 148 }}>
                    <PhaseRing
                      segments={room.phases.map(p => ({
                        name: p.name,
                        cost: p.cost,
                        color: phaseColors.get(p.name) ?? C.accent,
                      }))}
                      centerValue={`${room.share}%`}
                      centerUnit={`${fmtCZKShort(room.cost)} Kč`}
                    />
                    <p
                      className="text-[12px] font-semibold text-center truncate max-w-full"
                      style={{ color: C.text }}
                      title={room.name}
                    >
                      {room.name}
                    </p>

                    {/* Fáze s částkami pod prstencem */}
                    <div className="w-full flex flex-col gap-1">
                      {room.phases.slice(0, 4).map(phase => (
                        <div key={phase.name} className="flex items-center gap-1.5">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: phaseColors.get(phase.name) ?? C.accent }}
                          />
                          <span className="text-[10px] truncate min-w-0 flex-1" style={{ color: C.muted }} title={phase.name}>
                            {phase.name}
                          </span>
                          <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ color: C.text }}>
                            {fmtCZKShort(phase.cost)}
                          </span>
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
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <p className="text-[13px] font-semibold" style={{ color: C.text }}>
              {calendarSelectionActive ? 'Souhrn vybraného dne' : 'Souhrn období'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>Celkové náklady provozu</p>
            <p className="text-3xl font-semibold tabular-nums mt-3" style={{ color: C.accent }}>
              {fmtCZKShort(summary.totalCost)}
              <span className="text-base font-medium ml-1.5" style={{ color: C.muted }}>Kč</span>
            </p>

            <div className="mt-4 pt-4 flex flex-col gap-2.5" style={{ borderTop: `1px solid ${C.border}` }}>
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
        <Card title="Denní vývoj nákladů" subtitle="Skutečné hodiny × hodinová sazba" icon={TrendingUp} accent={C.accent}>
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
      <Card title="Efektivita nákladů" subtitle="Klíčové indikátory pro řízení sálu" icon={Activity} accent={C.green} headingLevel={2}>
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
                  <PhaseRing
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
