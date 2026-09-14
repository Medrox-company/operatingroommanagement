'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import {
  buildCompletedOperationsFromEvents,
  fetchDevices,
  fetchNotificationsLog,
  fetchStatusHistory,
  type DeviceRow,
  type NotificationLogRow,
  type RoomStatistics,
  type StatusHistoryRow,
} from '../lib/db';

export type StatisticsPeriod = 'den' | 'týden' | 'měsíc' | 'rok';
const EMPTY_HISTORY: StatusHistoryRow[] = [];

type StatisticsReportSource = 'statusHistory' | 'notifications' | 'devices' | 'dayHistory';
export type StatisticsReportSourceErrors = Record<StatisticsReportSource, string | null>;

interface StatisticsData {
  statusHistory: StatusHistoryRow[];
  notifications: NotificationLogRow[];
  devices: DeviceRow[];
  hospitalId: string;
  period: StatisticsPeriod;
  reportSourceErrors: Omit<StatisticsReportSourceErrors, 'dayHistory'>;
}

interface DayHistoryData {
  statusHistory: StatusHistoryRow[];
  hospitalId: string;
  coverageStart: string;
  coverageEnd: string;
  reportError: string | null;
}

const DAY_HISTORY_DAYS = 31;

function periodStart(period: StatisticsPeriod, now: Date) {
  const days = period === 'den' ? 1 : period === 'týden' ? 7 : period === 'měsíc' ? 30 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index === -1) return [item, ...items];
  const next = [...items];
  next[index] = { ...next[index], ...item };
  return next;
}

export function aggregateRoomStatistics(history: StatusHistoryRow[]): RoomStatistics {
  const emergencyCount = history.filter((event) => event.event_type === 'emergency_on').length;
  const operationsByRoom: Record<string, number> = {};
  const operationsByDay: Record<string, number> = {};
  const stepDurations: Record<string, number[]> = {};
  const eventsByRoom = new Map<string, StatusHistoryRow[]>();

  history.forEach((event) => {
    const roomEvents = eventsByRoom.get(event.operating_room_id);
    if (roomEvents) roomEvents.push(event);
    else eventsByRoom.set(event.operating_room_id, [event]);
  });

  const completedOperations = [...eventsByRoom.entries()].flatMap(([roomId, events]) => (
    buildCompletedOperationsFromEvents(events).map((operation) => ({ roomId, operation }))
  ));

  completedOperations.forEach(({ roomId, operation }) => {
    operationsByRoom[roomId] = (operationsByRoom[roomId] || 0) + 1;
    const day = operation.startedAt.slice(0, 10);
    operationsByDay[day] = (operationsByDay[day] || 0) + 1;
  });
  history.forEach((event) => {
    if (event.event_type !== 'step_change' || !event.step_name || !event.duration_seconds) return;
    (stepDurations[event.step_name] ??= []).push(event.duration_seconds);
  });

  const operationDurations = completedOperations
    .map(({ operation }) => (
      new Date(operation.endedAt).getTime() - new Date(operation.startedAt).getTime()
    ))
    .filter((duration) => Number.isFinite(duration) && duration > 0);
  const averageStepDurations = Object.fromEntries(Object.entries(stepDurations).map(([name, durations]) => [
    name,
    Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 60),
  ]));

  return {
    totalOperations: completedOperations.length,
    averageOperationDuration: operationDurations.length
      ? Math.round(operationDurations.reduce((sum, duration) => sum + duration, 0) / operationDurations.length / 60_000)
      : 0,
    averageStepDurations,
    emergencyCount,
    utilizationRate: 0,
    operationsByRoom,
    operationsByDay,
  };
}

export function useStatisticsData(period: StatisticsPeriod) {
  const { activeHospitalId } = useHospital();
  const { data, error, isLoading, mutate } = useSWR<StatisticsData>(
    activeHospitalId ? ['statistics-data', activeHospitalId, period] : null,
    async () => {
      const now = new Date();
      const fromDate = periodStart(period, now);
      const [history, notifications, devices] = await Promise.all([
        fetchStatusHistory({ fromDate, toDate: now, all: true }),
        fetchNotificationsLog({ fromDate, toDate: now, all: true }),
        fetchDevices(),
      ]);
      return {
        statusHistory: history ?? [],
        notifications: notifications ?? [],
        devices: devices ?? [],
        hospitalId: activeHospitalId!,
        period,
        // Null is the existing DB helper's failure signal; keep the UI arrays
        // while ensuring report consumers cannot mistake failures for zeroes.
        reportSourceErrors: {
          statusHistory: history === null ? 'Historii stavů se nepodařilo načíst.' : null,
          notifications: notifications === null ? 'Notifikace se nepodařilo načíst.' : null,
          devices: devices === null ? 'Evidenci zařízení se nepodařilo načíst.' : null,
        },
      };
    },
    { revalidateOnFocus: false, dedupingInterval: 20_000, keepPreviousData: true },
  );

  // Samostatné 31denní okno pro kalendářní/provozní den. Je v SWR cache,
  // takže se mezi renderovacími cykly nenačítá znovu, a dostává stejné
  // realtime změny jako hlavní statistická historie.
  const {
    data: dayHistoryData,
    error: dayHistoryError,
    isLoading: isDayHistoryLoading,
    mutate: mutateDayHistory,
  } = useSWR<DayHistoryData | StatusHistoryRow[]>(
    activeHospitalId ? ['statistics-day-history', activeHospitalId, DAY_HISTORY_DAYS] : null,
    async () => {
      const now = new Date();
      const fromDate = new Date(now.getTime() - DAY_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      const history = await fetchStatusHistory({ fromDate, toDate: now, all: true });
      return {
        statusHistory: history ?? [],
        hospitalId: activeHospitalId!,
        coverageStart: fromDate.toISOString(),
        coverageEnd: now.toISOString(),
        reportError: history === null ? 'Denní historii stavů se nepodařilo načíst.' : null,
      };
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 20_000,
      keepPreviousData: true,
    },
  );

  useHospitalRealtime('room_status_history', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id) return;
    const applyHistoryEvent = (current: StatusHistoryRow[] | undefined) => {
      if (!current) return current;
      return payload.eventType === 'DELETE'
        ? current.filter((event) => event.id !== id)
        : upsertById(current, payload.new as unknown as StatusHistoryRow);
    };

    void mutate((current) => {
      if (!current) return current;
      return {
        ...current,
        statusHistory: applyHistoryEvent(current.statusHistory) ?? current.statusHistory,
      };
    }, { revalidate: false });
    void mutateDayHistory((current) => {
      if (!current) return current;
      // Preserve an already-populated array cache during a hot code update.
      // It remains ineligible for reports until a normal refresh adds bounds.
      if (Array.isArray(current)) return applyHistoryEvent(current);
      return {
        ...current,
        statusHistory: applyHistoryEvent(current.statusHistory) ?? current.statusHistory,
      };
    }, { revalidate: false });
  });

  useHospitalRealtime('notifications_log', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id) return;
    void mutate((current) => {
      if (!current) return current;
      return {
        ...current,
        notifications: payload.eventType === 'DELETE'
          ? current.notifications.filter((item) => item.id !== id)
          : upsertById(current.notifications, payload.new as unknown as NotificationLogRow),
      };
    }, { revalidate: false });
  });

  useHospitalRealtime('devices', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id) return;
    void mutate((current) => {
      if (!current) return current;
      return {
        ...current,
        devices: payload.eventType === 'DELETE'
          ? current.devices.filter((item) => item.id !== id)
          : upsertById(current.devices, payload.new as unknown as DeviceRow),
      };
    }, { revalidate: false });
  });

  const statusHistory = data?.statusHistory ?? EMPTY_HISTORY;
  const dbStats = useMemo(() => aggregateRoomStatistics(statusHistory), [statusHistory]);
  const dayHistorySnapshot = Array.isArray(dayHistoryData) ? undefined : dayHistoryData;
  const reportSourceErrors = useMemo<StatisticsReportSourceErrors>(() => ({
    statusHistory: error ? 'Historii stavů se nepodařilo načíst.' : data?.reportSourceErrors?.statusHistory ?? null,
    notifications: error ? 'Notifikace se nepodařilo načíst.' : data?.reportSourceErrors?.notifications ?? null,
    devices: error ? 'Evidenci zařízení se nepodařilo načíst.' : data?.reportSourceErrors?.devices ?? null,
    dayHistory: dayHistoryError ? 'Denní historii stavů se nepodařilo načíst.' : dayHistorySnapshot?.reportError ?? null,
  }), [data, error, dayHistorySnapshot, dayHistoryError]);
  const reportError = Object.values(reportSourceErrors).filter(Boolean).join(' ') || null;
  const periodScopeMatches = Boolean(data && data.hospitalId === activeHospitalId && data.period === period);
  const dayScopeMatches = Boolean(dayHistorySnapshot && dayHistorySnapshot.hospitalId === activeHospitalId);
  const isReportLoading = !activeHospitalId
    || (!error && (isLoading || !periodScopeMatches))
    || (!dayHistoryError && (isDayHistoryLoading || !dayScopeMatches));
  const dayHistoryCoverageAvailable = dayScopeMatches && !reportSourceErrors.dayHistory;

  return {
    statusHistory,
    dayHistory: Array.isArray(dayHistoryData) ? dayHistoryData : dayHistorySnapshot?.statusHistory ?? EMPTY_HISTORY,
    notifications: data ? data.notifications : null,
    devices: data ? data.devices : null,
    dbStats,
    isLoading: isLoading || isDayHistoryLoading,
    error: error ?? dayHistoryError,
    reportSourceErrors,
    reportError,
    isReportLoading,
    // Bounds belong to the successful fetch, even when it returned no rows.
    // Realtime upserts never turn a failed/incomplete load into full coverage.
    dayHistoryCoverageStart: dayHistoryCoverageAvailable ? dayHistorySnapshot?.coverageStart ?? null : null,
    dayHistoryCoverageEnd: dayHistoryCoverageAvailable ? dayHistorySnapshot?.coverageEnd ?? null : null,
  };
}
