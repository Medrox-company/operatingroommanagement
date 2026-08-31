/**
 * NotificationsTab — Přehled odeslaných notifikací
 *
 * Reálná data z tabulky `notifications_log`:
 *   • notification_type (typ notifikace)
 *   • room_id, room_name (odkaz na sál)
 *   • recipient_count (počet příjemců)
 *   • custom_reason (vlastní důvod)
 *   • created_at (čas odeslání)
 */
'use client';

import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, AlertTriangle, Clock, Users, Mail, TrendingUp, Calendar,
  MessageSquare, MapPin, ChevronDown, Calculator, X, Building2,
} from 'lucide-react';
import {
  C, Card, DistributionHeader, DistributionRing, formatNumber,
} from './shared';
import { GlassCalendar } from './AppCharts';
import {
  fetchNotificationsLog, fetchStatusHistory,
  type NotificationLogRow, type StatusHistoryRow,
} from '../../lib/db';
import type { OperatingRoom } from '../../types';

interface NotificationsTabProps {
  notifications: NotificationLogRow[] | null;
  statusHistory?: StatusHistoryRow[];
  rooms: OperatingRoom[];
  periodLabel: string;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const NOTIFICATION_COLORS: Record<string, string> = {
  emergencies: '#EF4444',
  emergency: '#EF4444',
  late_surgeon: '#F97316',
  late_anesthesiologist: '#FBBF24',
  late_arrival: '#A78BFA',
  patient_not_ready: '#EC4899',
  infectious_patient: '#14B8A6',
  daily_report: '#06B6D4',
  daily_reports: '#06B6D4',
  statistics: '#10B981',
  other: '#6B7280',
};

const NOTIFICATION_LABELS: Record<string, string> = {
  emergencies: 'Stav nouze',
  emergency: 'Stav nouze',
  late_surgeon: 'Pozdní příchod operatéra',
  late_anesthesiologist: 'Pozdní příchod anesteziologa',
  late_arrival: 'Pozdní příjezd na sál',
  patient_not_ready: 'Nepřipravený pacient',
  infectious_patient: 'Infekční pacient',
  daily_reports: 'Denní provozní report',
  daily_report: 'Denní provozní report',
  statistics: 'Statistický přehled',
  other: 'Jiný důvod',
};

const DEPARTMENT_COLORS = ['#3B82F6', '#06B6D4', '#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899'];
const SHAD_CARD_CLASS = '!rounded-xl [background:var(--stats-surface)!important] [box-shadow:none!important]';

function normalizeNotificationType(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/^notify[\s_-]+/, '')
    .replace(/[\s-]+/g, '_') || 'other';
}

function getNotificationColor(type: string): string {
  return NOTIFICATION_COLORS[normalizeNotificationType(type)] ?? C.blue;
}

function getNotificationLabel(type: string): string {
  const normalized = normalizeNotificationType(type);
  const knownLabel = NOTIFICATION_LABELS[normalized];
  if (knownLabel) return knownLabel;

  const readable = normalized.replace(/_/g, ' ');
  return readable.charAt(0).toLocaleUpperCase('cs-CZ') + readable.slice(1);
}

function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function roomWorkingOverlapSeconds(room: OperatingRoom, start: Date, end: Date): number {
  if (end <= start) return 0;
  let seconds = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const lastDay = new Date(end);
  lastDay.setHours(0, 0, 0, 0);

  while (cursor <= lastDay) {
    const schedule = room.weeklySchedule?.[DAY_KEYS[cursor.getDay()]];
    if (schedule?.enabled) {
      const workStart = new Date(cursor);
      workStart.setHours(schedule.startHour, schedule.startMinute, 0, 0);
      const workEnd = new Date(cursor);
      workEnd.setHours(schedule.endHour, schedule.endMinute, 0, 0);
      const overlapStart = Math.max(start.getTime(), workStart.getTime());
      const overlapEnd = Math.min(end.getTime(), workEnd.getTime());
      if (overlapEnd > overlapStart) seconds += (overlapEnd - overlapStart) / 1_000;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return seconds;
}

function formatLossDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

const NotificationMetric: React.FC<{
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  color?: string;
}> = ({ label, value, detail, icon: Icon, color = C.blue }) => (
  <div
    className="group relative min-h-[112px] overflow-hidden rounded-xl p-4 text-left"
    style={{
      background: 'var(--stats-surface-2)',
      border: `1px solid ${C.border}`,
    }}
  >
    <span className="absolute inset-x-4 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
    <div className="flex min-h-[44px] items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium" style={{ color: C.textHi }}>{label}</p>
        <p className="mt-1 text-[10px]" style={{ color: C.muted }}>{detail}</p>
      </div>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-105" style={{ color, border: `1px solid ${color}35`, background: `${color}0e` }}>
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </div>
    <p className="mt-3 whitespace-nowrap text-[26px] font-light leading-none tabular-nums tracking-tight" style={{ color: C.textHi }}>{value}</p>
  </div>
);

const CompactColumnChart: React.FC<{
  items: Array<{ label: string; value: number; dimmed?: boolean }>;
  color?: string;
  height?: number;
}> = ({ items, color = C.blue, height = 142 }) => {
  const max = Math.max(...items.map(item => item.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {items.map((item, index) => {
        const barHeight = Math.max(item.value > 0 ? 7 : 2, (item.value / max) * (height - 39));
        return (
          <div key={`${item.label}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${item.label}: ${item.value}`}>
            <span className="mb-1 text-[8px] font-semibold tabular-nums" style={{ color: C.text }}>{item.value || ''}</span>
            <div
              className="w-full max-w-5 rounded-t-sm transition-[height] duration-300"
              style={{
                height: barHeight,
                background: item.dimmed ? C.ghost : color,
                opacity: item.dimmed ? 0.7 : 0.9,
              }}
            />
            <span className="mt-2 h-3 max-w-full truncate text-[8px]" style={{ color: C.faint }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export const NotificationsTab: React.FC<NotificationsTabProps> = memo(({
  notifications, statusHistory = [], rooms, periodLabel,
}) => {
  const [calendarDay, setCalendarDay] = useState(() => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    return day;
  });
  const [calendarSelectionActive, setCalendarSelectionActive] = useState(false);
  const [selectedDayNotifications, setSelectedDayNotifications] = useState<NotificationLogRow[]>([]);
  const [calendarNotifications, setCalendarNotifications] = useState<NotificationLogRow[]>([]);
  const [selectedDayStatusHistory, setSelectedDayStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedNotificationId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedNotificationId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [expandedNotificationId]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCalendarDay(today);
    setCalendarSelectionActive(false);
    setSelectedDayNotifications([]);
    setSelectedDayStatusHistory([]);
    setExpandedNotificationId(null);
  }, [periodLabel]);

  useEffect(() => {
    let cancelled = false;
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - 89);

    void fetchNotificationsLog({ fromDate, toDate, all: true }).then(rows => {
      if (!cancelled) setCalendarNotifications(rows ?? []);
    }).catch(error => {
      console.error('[NotificationsTab] Nepodařilo se načíst data kalendáře', error);
      if (!cancelled) setCalendarNotifications([]);
    });

    return () => { cancelled = true; };
  }, []);

  const handleCalendarDayChange = useCallback((day: Date) => {
    const normalized = new Date(day);
    normalized.setHours(0, 0, 0, 0);
    setCalendarDay(normalized);
    setCalendarSelectionActive(true);
  }, []);

  useEffect(() => {
    if (!calendarSelectionActive) return;
    let cancelled = false;
    const fromDate = new Date(calendarDay);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + 1);
    toDate.setMilliseconds(-1);

    setSelectedDayLoading(true);
    setSelectedDayNotifications([]);
    setSelectedDayStatusHistory([]);
    void Promise.all([
      fetchNotificationsLog({ fromDate, toDate, all: true }),
      fetchStatusHistory({ fromDate, toDate, all: true }),
    ]).then(([rows, history]) => {
      if (!cancelled) {
        setSelectedDayNotifications(rows ?? []);
        setSelectedDayStatusHistory(history ?? []);
      }
    }).catch(error => {
      console.error('[NotificationsTab] Nepodařilo se načíst notifikace vybraného dne', error);
      if (!cancelled) {
        setSelectedDayNotifications([]);
        setSelectedDayStatusHistory([]);
      }
    }).finally(() => {
      if (!cancelled) setSelectedDayLoading(false);
    });

    return () => { cancelled = true; };
  }, [calendarDay, calendarSelectionActive]);

  const displayedNotifications = calendarSelectionActive ? selectedDayNotifications : notifications;
  const displayedStatusHistory = calendarSelectionActive ? selectedDayStatusHistory : statusHistory;

  const calendarHeat = useMemo(() => {
    const counts = new Map<string, number>();
    for (const notification of calendarNotifications) {
      const key = localDateKey(notification.created_at);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const maximum = Math.max(0, ...counts.values());
    if (maximum === 0) return {};
    return Object.fromEntries(Array.from(counts.entries()).map(([key, count]) => [key, count / maximum]));
  }, [calendarNotifications]);

  const notificationImpacts = useMemo(() => {
    const result = new Map<string, {
      durationSeconds: number | null;
      loss: number | null;
      rate: number | null;
      basis: string;
      endAt: string | null;
    }>();
    const roomById = new Map(rooms.map(room => [room.id, room]));
    const historyByRoom = new Map<string, StatusHistoryRow[]>();
    for (const event of displayedStatusHistory) {
      const list = historyByRoom.get(event.operating_room_id) ?? [];
      list.push(event);
      historyByRoom.set(event.operating_room_id, list);
    }
    for (const list of historyByRoom.values()) {
      list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    for (const notification of displayedNotifications ?? []) {
      const room = notification.room_id ? roomById.get(notification.room_id) : undefined;
      const type = normalizeNotificationType(notification.notification_type ?? 'other');
      const start = new Date(notification.created_at);
      const eventTypes = type === 'infectious_patient'
        ? ['enhanced_hygiene_off']
        : ['emergency', 'emergencies'].includes(type)
          ? ['emergency_off']
          : type === 'late_arrival'
            ? ['patient_arrival', 'patient_arrived', 'operation_start']
            : ['late_surgeon', 'late_anesthesiologist', 'patient_not_ready'].includes(type)
              ? ['operation_start']
              : [];
      const basis = type === 'infectious_patient'
        ? 'Od aktivace infekčního režimu do jeho ukončení'
        : ['emergency', 'emergencies'].includes(type)
          ? 'Od vyhlášení nouze do jejího ukončení'
          : type === 'late_arrival'
            ? 'Od hlášení do evidovaného příjezdu nebo začátku výkonu'
            : ['late_surgeon', 'late_anesthesiologist', 'patient_not_ready'].includes(type)
              ? 'Od hlášení do následujícího evidovaného začátku výkonu'
              : 'Databáze pro tento typ neukládá měřitelný konec zdržení';

      if (!room || !Number.isFinite(start.getTime()) || eventTypes.length === 0) {
        result.set(notification.id, { durationSeconds: null, loss: null, rate: room?.hourlyOperatingCost ?? null, basis, endAt: null });
        continue;
      }

      const endEvent = (historyByRoom.get(room.id) ?? []).find(event => {
        const at = new Date(event.timestamp);
        return eventTypes.includes(event.event_type)
          && at > start
          && localDateKey(at) === localDateKey(start);
      });
      if (!endEvent) {
        result.set(notification.id, { durationSeconds: null, loss: null, rate: room.hourlyOperatingCost ?? null, basis, endAt: null });
        continue;
      }

      const end = new Date(endEvent.timestamp);
      const durationSeconds = roomWorkingOverlapSeconds(room, start, end);
      const rate = room.hourlyOperatingCost ?? null;
      result.set(notification.id, {
        durationSeconds,
        loss: rate !== null && rate >= 0 ? durationSeconds / 3_600 * rate : null,
        rate,
        basis,
        endAt: endEvent.timestamp,
      });
    }
    return result;
  }, [displayedNotifications, displayedStatusHistory, rooms]);

  const stats = useMemo(() => {
    if (!displayedNotifications) return null;

    const total = displayedNotifications.length;
    const totalRecipients = displayedNotifications.reduce((sum, n) => sum + (n.recipient_count || 0), 0);
    const avgRecipients = total > 0 ? totalRecipients / total : 0;

    // By type
    const typeCounts = new Map<string, { count: number; recipients: number }>();
    for (const n of displayedNotifications) {
      const t = normalizeNotificationType(n.notification_type ?? 'other');
      const cur = typeCounts.get(t) ?? { count: 0, recipients: 0 };
      cur.count++;
      cur.recipients += n.recipient_count || 0;
      typeCounts.set(t, cur);
    }
    const byType = Array.from(typeCounts.entries())
      .map(([type, c]) => ({
        type,
        label: getNotificationLabel(type),
        count: c.count,
        recipients: c.recipients,
        color: getNotificationColor(type),
        pct: total > 0 ? (c.count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Emergency count (kritické)
    const emergencyCount = displayedNotifications.filter(
      n => ['emergency', 'emergencies'].includes(normalizeNotificationType(n.notification_type ?? 'other'))
    ).length;
    const emergencyPct = total > 0 ? (emergencyCount / total) * 100 : 0;

    // By room
    const roomMap = new Map(rooms.map(r => [r.id, r.name]));
    const roomCounts = new Map<string, number>();
    for (const n of displayedNotifications) {
      if (n.room_id) {
        const name = roomMap.get(n.room_id) ?? n.room_name ?? n.room_id;
        roomCounts.set(name, (roomCounts.get(name) ?? 0) + 1);
      }
    }
    const byRoom = Array.from(roomCounts.entries())
      .map(([room, count]) => ({ room, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Podle oboru/oddělení přiřazeného operačnímu sálu
    const departmentCounts = new Map<string, { count: number; recipients: number }>();
    const roomById = new Map(rooms.map(room => [room.id, room]));
    const roomByName = new Map(rooms.map(room => [room.name, room]));
    for (const notification of displayedNotifications) {
      const room = (notification.room_id ? roomById.get(notification.room_id) : undefined)
        ?? (notification.room_name ? roomByName.get(notification.room_name) : undefined);
      const department = room?.department?.trim() || 'Bez přiřazeného oboru';
      const current = departmentCounts.get(department) ?? { count: 0, recipients: 0 };
      current.count += 1;
      current.recipients += notification.recipient_count || 0;
      departmentCounts.set(department, current);
    }
    const byDepartment = Array.from(departmentCounts.entries())
      .map(([department, values]) => ({
        department,
        count: values.count,
        recipients: values.recipients,
        share: total > 0 ? values.count / total * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department, 'cs'));

    // By hour of day
    const hourCounts: number[] = new Array(24).fill(0);
    for (const n of displayedNotifications) {
      const hour = new Date(n.created_at).getHours();
      hourCounts[hour]++;
    }
    const byHour = hourCounts.map((count, hour) => ({
      hour: `${hour}:00`,
      count,
      isWorkHour: hour >= 7 && hour < 19,
    }));

    // By day of week
    const dayCounts: number[] = new Array(7).fill(0);
    const dayLabels = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
    for (const n of displayedNotifications) {
      const day = new Date(n.created_at).getDay();
      dayCounts[day]++;
    }
    const byDay = dayCounts.map((count, day) => ({
      day: dayLabels[day],
      count,
      isWeekend: day === 0 || day === 6,
    }));

    // Trend over time (last 14 days)
    const now = calendarSelectionActive ? calendarDay.getTime() : Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dailyCounts: { date: string; dateKey: string; weekday: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * dayMs);
      const dateStr = localDateKey(d);
      const count = displayedNotifications.filter(n => localDateKey(n.created_at) === dateStr).length;
      dailyCounts.push({
        date: `${d.getDate()}.${d.getMonth() + 1}`,
        dateKey: localDateKey(d),
        weekday: d.toLocaleDateString('cs-CZ', { weekday: 'short' }).replace('.', ''),
        count,
      });
    }

    return {
      total,
      totalRecipients,
      avgRecipients,
      emergencyCount,
      emergencyPct,
      byType,
      byRoom,
      byDepartment,
      byHour,
      byDay,
      dailyCounts,
    };
  }, [calendarDay, calendarSelectionActive, displayedNotifications, rooms]);

  if (!notifications) {
    return (
      <Card className={SHAD_CARD_CLASS}>
        <div className="flex items-center gap-3 py-6 px-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${C.muted}1a` }}>
            <Clock size={16} color={C.muted} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: C.text }}>Načítání dat…</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.muted }}>
              Načítá se z tabulky <code>notifications_log</code>.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const activePeriodLabel = calendarSelectionActive
    ? calendarDay.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
    : periodLabel;

  const selectedNotification = displayedNotifications?.find(item => item.id === expandedNotificationId) ?? null;
  const selectedImpact = selectedNotification ? notificationImpacts.get(selectedNotification.id) : null;
  const selectedRoom = selectedNotification
    ? rooms.find(room => room.id === selectedNotification.room_id)
    : undefined;

  const evidencePanel = (
    <div
      className="relative overflow-hidden rounded-xl p-4 sm:p-5"
      style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ color: C.blue, background: C.ghost, border: `1px solid ${C.border}` }}>
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Evidence jednotlivých notifikací</h3>
          <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Kliknutím na řádek zobrazíte podrobnosti a finanční dopad</p>
        </div>
        <span className="ml-auto rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>
          {stats.total}
        </span>
      </div>
      <div className="my-4 h-px" style={{ background: C.border }} />
      {displayedNotifications && displayedNotifications.length > 0 ? (
        <>
          <div className="grid max-h-[440px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {displayedNotifications.map((notification, index) => {
              const type = normalizeNotificationType(notification.notification_type ?? 'other');
              const color = getNotificationColor(type);
              const timestamp = new Date(notification.created_at);
              const roomName = notification.room_name
                ?? rooms.find(room => room.id === notification.room_id)?.name
                ?? 'Sál neuveden';
              const isOpen = expandedNotificationId === notification.id;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => setExpandedNotificationId(isOpen ? null : notification.id)}
                  aria-expanded={isOpen}
                  className="group relative min-h-[96px] min-w-0 overflow-hidden rounded-lg p-3 text-left transition-colors hover:bg-white/[0.035]"
                  style={{
                    background: isOpen ? `${color}0d` : C.surface2,
                    border: `1px solid ${isOpen ? `${color}70` : C.border}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md" style={{ color, background: `${color}12`, border: `1px solid ${color}25` }}>
                      <Bell className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: C.faint }}>Notifikace {String(index + 1).padStart(2, '0')}</p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold" style={{ color: C.textHi }} title={getNotificationLabel(type)}>
                        {getNotificationLabel(type)}
                      </p>
                    </div>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors group-hover:bg-white/5" style={{ color }}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t pt-2.5" style={{ borderColor: `${color}20` }}>
                    <MapPin className="h-3 w-3 shrink-0" style={{ color }} />
                    <span className="min-w-0 flex-1 truncate text-[10px] font-semibold" style={{ color: C.text }}>{roomName}</span>
                    <span className="shrink-0 rounded-md px-1.5 py-1 text-[9px] font-semibold tabular-nums" style={{ color, background: `${color}10` }}>
                      {timestamp.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })} · {timestamp.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </>
      ) : (
        <p className="py-6 text-center text-[11px]" style={{ color: C.muted }}>Pro vybraný den nejsou žádné záznamy.</p>
      )}
    </div>
  );

  const notificationCountPanel = (
    <Card className={`p-5 ${SHAD_CARD_CLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Počet notifikací</h3>
          <p className="mt-1 text-[10px]" style={{ color: C.muted }}>Kliknutím na den zobrazíte jeho statistiky</p>
        </div>
        <span className="rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>{stats.total} celkem</span>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-2 xl:grid-cols-14">
        {stats.dailyCounts.map(day => {
          const maximum = Math.max(...stats.dailyCounts.map(item => item.count), 1);
          const intensity = day.count / maximum;
          const isSelected = calendarSelectionActive && day.dateKey === localDateKey(calendarDay);
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => {
                const [year, month, date] = day.dateKey.split('-').map(Number);
                handleCalendarDayChange(new Date(year, month - 1, date));
              }}
              aria-label={`Zobrazit notifikace dne ${day.date}, počet ${day.count}`}
              className="group relative min-h-[70px] min-w-0 overflow-hidden rounded-xl px-1 py-3 text-center transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: isSelected
                  ? `linear-gradient(160deg, ${C.cyan}36, ${C.blue}18)`
                  : day.count > 0
                    ? `linear-gradient(160deg, ${C.blue}${intensity > 0.65 ? '28' : '18'}, ${C.purple}${intensity > 0.65 ? '1c' : '0b'})`
                    : C.surface2,
                border: `1px solid ${isSelected ? `${C.cyan}80` : day.count > 0 ? `${C.blue}38` : C.border}`,
                boxShadow: isSelected ? `inset 0 0 24px ${C.cyan}0d` : 'none',
                opacity: day.count > 0 ? 1 : 0.5,
              }}
            >
              <span className="block text-[17px] font-light leading-none tabular-nums" style={{ color: day.count > 0 ? C.textHi : C.faint }}>{day.count}</span>
              <span className="mt-1.5 block truncate text-[8px] font-semibold uppercase" style={{ color: isSelected ? C.blue : C.muted }}>{day.weekday}</span>
              <span className="mt-0.5 block truncate text-[8px] tabular-nums" style={{ color: C.faint }}>{day.date}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );

  const detailsModal = selectedNotification && selectedImpact && typeof document !== 'undefined'
    ? createPortal(
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail notifikace ${getNotificationLabel(selectedNotification.notification_type)}`}
        onMouseDown={event => {
          if (event.target === event.currentTarget) setExpandedNotificationId(null);
        }}
      >
        <div
          className="relative w-full max-w-[700px] overflow-hidden rounded-xl p-5 shadow-2xl sm:p-6"
          style={{
            background: 'var(--stats-surface)',
            border: `1px solid ${C.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => setExpandedNotificationId(null)}
            aria-label="Zavřít detail notifikace"
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-white/10"
            style={{ color: C.muted, border: `1px solid ${C.border}` }}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4 pr-11">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: getNotificationColor(selectedNotification.notification_type) }}>Detail notifikace</p>
              <h3 className="mt-1.5 text-lg font-semibold" style={{ color: C.textHi }}>{getNotificationLabel(selectedNotification.notification_type)}</h3>
              <p className="mt-1 text-[10px]" style={{ color: C.muted }}>
                {selectedNotification.room_name ?? selectedRoom?.name ?? 'Sál neuveden'} · {new Date(selectedNotification.created_at).toLocaleString('cs-CZ')}
              </p>
            </div>
            <div className="rounded-lg px-3 py-2 text-right" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
              <p className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: C.faint }}>Finanční ztráta</p>
              <p className="mt-1 text-xl font-semibold tabular-nums" style={{ color: getNotificationColor(selectedNotification.notification_type) }}>
                {selectedImpact.loss !== null ? `${Math.round(selectedImpact.loss).toLocaleString('cs-CZ')} Kč` : 'Nevyčíslitelná'}
              </p>
            </div>
          </div>

          {selectedNotification.custom_reason && (
            <p className="mt-4 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed" style={{ color: C.text, background: C.surface2, border: `1px solid ${C.border}` }}>
              {selectedNotification.custom_reason}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Měřený interval', selectedImpact.durationSeconds !== null ? formatLossDuration(selectedImpact.durationSeconds) : 'Není uložen'],
              ['Hodinová sazba', selectedImpact.rate !== null ? `${selectedImpact.rate.toLocaleString('cs-CZ')} Kč/h` : 'Není nastavena'],
              ['Konec intervalu', selectedImpact.endAt ? new Date(selectedImpact.endAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Není evidován'],
              ['Příjemci', `${selectedNotification.recipient_count} osob`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg px-3 py-2.5" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
                <p className="text-[8px] uppercase tracking-[0.12em]" style={{ color: C.faint }}>{label}</p>
                <p className="mt-1 text-[10px] font-semibold" style={{ color: C.textHi }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 border-t pt-4 text-[9px] leading-relaxed" style={{ color: C.muted, borderColor: C.border }}>
            <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: C.blue }} />
            <span>{selectedImpact.basis}. Výpočet zahrnuje pouze průnik s nastavenou pracovní dobou sálu a používá jeho databázovou hodinovou sazbu.</span>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[310px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 xl:order-2">
          <Card className={`relative overflow-hidden p-5 ${SHAD_CARD_CLASS}`}>
            <span className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.cyan}aa, transparent)` }} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-medium" style={{ color: C.muted }}>
                  Notifikace
                </p>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight" style={{ color: C.textHi }}>
                  Přehled notifikací za {activePeriodLabel}
                </h2>
                <p className="mt-1 text-[11px]" style={{ color: C.muted }}>
                  Odeslané události a skutečný počet příjemců
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {calendarSelectionActive && (
                  <button
                    type="button"
                    onClick={() => setCalendarSelectionActive(false)}
                    className="inline-flex items-center rounded-md px-3 py-2 text-[11px] font-medium transition-colors hover:bg-white/5"
                    style={{ color: C.text, border: `1px solid ${C.border}` }}
                  >
                    Zobrazit celé období
                  </button>
                )}
                <span
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium tabular-nums"
                  style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}
                >
                  <Bell className="h-3.5 w-3.5" style={{ color: C.blue }} />
                  {formatNumber(stats.total)} odesláno
                </span>
                <span
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium tabular-nums"
                  style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}
                >
                  <Users className="h-3.5 w-3.5" style={{ color: C.cyan }} />
                  {formatNumber(stats.totalRecipients)} příjemců
                </span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <NotificationMetric label="Celkem odesláno" value={formatNumber(stats.total)} detail={calendarSelectionActive ? 'notifikací ve vybraný den' : 'notifikací v období'} icon={Mail} />
              <NotificationMetric label="Příjemci" value={formatNumber(stats.totalRecipients)} detail="celkem doručení" icon={Users} color={C.cyan} />
              <NotificationMetric label="Průměr" value={stats.avgRecipients.toFixed(1)} detail="příjemce / notifikace" icon={TrendingUp} color={C.purple} />
              <NotificationMetric label="Nouzové" value={formatNumber(stats.emergencyCount)} detail={`${stats.emergencyPct.toFixed(1)} % ze všech`} icon={AlertTriangle} color={stats.emergencyCount > 0 ? C.red : C.blue} />
            </div>
          </Card>

          {selectedDayLoading && (
            <Card className={`p-5 ${SHAD_CARD_CLASS}`}>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 animate-pulse" style={{ color: C.blue }} />
                <p className="text-[11px]" style={{ color: C.text }}>Načítám notifikace vybraného dne…</p>
              </div>
            </Card>
          )}

          {!selectedDayLoading && stats.total === 0 && (
            <Card className={`p-5 ${SHAD_CARD_CLASS}`}>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${C.yellow}15` }}>
                  <AlertTriangle className="h-4 w-4" style={{ color: C.yellow }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: C.text }}>V tomto dni nejsou evidovány žádné notifikace</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Vyberte v kalendáři jiný den nebo zobrazte celé období.</p>
                </div>
              </div>
            </Card>
          )}

          {stats.byType.length > 0 && <Card className={`relative overflow-hidden p-5 ${SHAD_CARD_CLASS}`}>
            <span className="absolute inset-x-8 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
            <DistributionHeader
              eyebrow="Notifikace"
              title="Podíl podle typu"
              subtitle="Rozložení odeslaných hlášení podle jejich typu"
              badge={`${stats.byType.length} kategorií`}
            />
            <div className="mt-6 grid gap-x-5 gap-y-8 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              {stats.byType.map(type => (
                <div key={type.type} className="flex min-w-0 flex-col items-center gap-2.5">
                  <DistributionRing
                    segments={[{ name: type.label, cost: type.pct, color: type.color }]}
                    totalValue={100}
                    centerValue={`${Math.round(type.pct)}%`}
                    centerUnit={`${type.count}×`}
                  />
                  <p className="max-w-full truncate text-center text-[12px] font-semibold" style={{ color: C.text }} title={type.label}>{type.label}</p>
                  <div className="w-full max-w-[170px] space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: type.color }} />
                      <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>Odesláno</span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.text }}>{type.count}×</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.cyan }} />
                      <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>Příjemci</span>
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.text }}>{type.recipients}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>}

          {notificationCountPanel}
        </div>

        <div className="flex flex-col gap-4 xl:order-1">
          <Card className={`relative overflow-hidden p-5 ${SHAD_CARD_CLASS}`}>
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl" style={{ background: C.blue }} />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ color: C.cyan, background: `${C.cyan}0f`, border: `1px solid ${C.cyan}2f` }}>
                  <Bell className="h-5 w-5" />
                </span>
                <span className="rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.13em]" style={{ color: C.cyan, border: `1px solid ${C.cyan}35` }}>
                  živá data
                </span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.muted }}>
                {calendarSelectionActive ? 'Vybraný den' : 'Notifikační provoz'}
              </p>
              <p className="mt-1 text-[52px] font-light leading-none tracking-[-0.05em] tabular-nums" style={{ color: C.textHi }}>
                {formatNumber(stats.total)}
              </p>
              <p className="mt-2 text-[11px]" style={{ color: C.muted }}>odeslaných událostí · {activePeriodLabel}</p>

              {stats.byType.length > 0 && (
                <div className="mt-5">
                  <div className="flex h-2 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                    {stats.byType.map(type => (
                      <span key={type.type} style={{ width: `${type.pct}%`, background: type.color }} title={`${type.label}: ${type.pct.toFixed(1)} %`} />
                    ))}
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {stats.byType.slice(0, 3).map(type => (
                      <div key={type.type} className="flex items-center gap-2.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: type.color }} />
                        <span className="min-w-0 flex-1 truncate text-[10px]" style={{ color: C.muted }}>{type.label}</span>
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{type.count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative mt-5 flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: C.border }}>
              {[
                ['Příjemců celkem', formatNumber(stats.totalRecipients)],
                ['Průměr příjemců', stats.avgRecipients.toFixed(1)],
                ['Nouzové události', `${stats.emergencyCount}×`],
                ['Aktivní sály', String(stats.byRoom.length)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="text-[11px]" style={{ color: C.muted }}>{label}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="print-hide">
            <GlassCalendar
              value={calendarDay}
              onChange={handleCalendarDayChange}
              heat={calendarHeat}
              accent={C.blue}
            />
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className={`p-5 ${SHAD_CARD_CLASS}`} icon={TrendingUp} title="Vývoj notifikací" subtitle="Posledních 14 dní" accent={C.blue}>
          <div className="mt-3 rounded-lg px-3 pb-2 pt-4" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
            <CompactColumnChart
              items={stats.dailyCounts.map(item => ({ label: item.date, value: item.count }))}
              height={158}
            />
          </div>
        </Card>

        <Card className={`p-5 ${SHAD_CARD_CLASS}`} icon={Clock} title="Distribuce podle hodiny" subtitle="Pracovní doba je zvýrazněna" accent={C.blue}>
          <div className="mt-3 rounded-lg px-3 pb-2 pt-4" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
            <CompactColumnChart
              items={stats.byHour.map((item, index) => ({
                label: index % 3 === 0 ? item.hour.replace(':00', ' h') : '',
                value: item.count,
                dimmed: !item.isWorkHour,
              }))}
              height={158}
            />
          </div>
        </Card>

        <Card className={`p-5 ${SHAD_CARD_CLASS}`} icon={Bell} title="Nejčastější události" subtitle="Pořadí podle počtu hlášení" accent={C.purple}>
          <div className="mt-4 space-y-3">
            {stats.byType.slice(0, 5).map((type, index) => (
              <div key={type.type} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[9px] font-semibold tabular-nums" style={{ color: type.color, background: `${type.color}12`, border: `1px solid ${type.color}30` }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[10px] font-medium" style={{ color: C.text }}>{type.label}</span>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: C.textHi }}>{type.count}×</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                    <div className="h-full rounded-full" style={{ width: `${type.pct}%`, background: type.color }} />
                  </div>
                </div>
              </div>
            ))}
            {stats.byType.length === 0 && (
              <p className="py-12 text-center text-[10px]" style={{ color: C.muted }}>Bez zaznamenaných událostí</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {stats.byRoom.length > 0 && (
        <div
          className="relative overflow-hidden rounded-xl p-4 sm:p-5"
          style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ color: C.blue, background: C.ghost, border: `1px solid ${C.border}` }}>
              <Calendar className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Podle operačního sálu</h3>
              <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Sály s nejvyšším počtem odeslaných hlášení</p>
            </div>
            <span className="ml-auto rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>
              {stats.byRoom.length}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-5 sm:grid-cols-2">
            {stats.byRoom.map((room, index) => {
              const max = stats.byRoom[0]?.count || 1;
              return (
                <div key={room.room} className="border-t py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-mono" style={{ color: C.blue, background: `${C.blue}14`, border: `1px solid ${C.blue}24` }}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[11px] font-semibold" style={{ color: C.textHi }} title={room.room}>{room.room}</span>
                        <span className="shrink-0 text-[11px] font-semibold tabular-nums" style={{ color: C.blue }}>{room.count}×</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: C.ghost }}>
                        <div className="h-full rounded-full" style={{ width: `${(room.count / max) * 100}%`, background: C.blue, opacity: 0.85 }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t px-1 pt-3.5" style={{ borderColor: C.border }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: C.faint }}>Celkem</span>
            <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.textHi }}>{stats.total} notifikací</span>
          </div>
        </div>
      )}

      {stats.byDepartment.length > 0 && (
        <div
          className="relative overflow-hidden rounded-xl p-4 sm:p-5"
          style={{ background: 'var(--stats-surface)', border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md" style={{ color: C.purple, background: C.ghost, border: `1px solid ${C.border}` }}>
              <Building2 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold tracking-tight" style={{ color: C.textHi }}>Podle oborů</h3>
              <p className="mt-0.5 text-[10px]" style={{ color: C.muted }}>Souhrn podle oboru přiřazeného operačnímu sálu</p>
            </div>
            <span className="ml-auto rounded-md px-2.5 py-1 text-[10px] font-medium tabular-nums" style={{ color: C.text, background: C.ghost, border: `1px solid ${C.border}` }}>
              {stats.byDepartment.length}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg" style={{ border: `1px solid ${C.border}` }}>
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr style={{ background: C.ghost }}>
                  {['Obor', 'Notifikace', 'Příjemci', 'Podíl'].map(label => (
                    <th key={label} className="px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: C.faint }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.byDepartment.map((department, index) => {
                  const color = DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
                  return (
                    <tr key={department.department} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[9px] font-mono" style={{ color, background: `${color}14`, border: `1px solid ${color}28` }}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold" style={{ color: C.textHi }} title={department.department}>{department.department}</p>
                            <div className="mt-1.5 h-1 max-w-[240px] overflow-hidden rounded-full" style={{ background: C.ghost }}>
                              <div className="h-full rounded-full" style={{ width: `${department.share}%`, background: color }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[11px] font-semibold tabular-nums" style={{ color }}>{department.count}×</td>
                      <td className="px-3 py-3 text-[11px] font-semibold tabular-nums" style={{ color: C.text }}>{department.recipients}</td>
                      <td className="px-3 py-3 text-[11px] font-semibold tabular-nums" style={{ color: C.textHi }}>{department.share.toFixed(1)} %</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {evidencePanel}

      {detailsModal}

    </div>
  );
});

NotificationsTab.displayName = 'NotificationsTab';
