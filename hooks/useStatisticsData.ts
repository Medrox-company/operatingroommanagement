'use client';

import useSWR, { useSWRConfig } from 'swr';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import {
  buildCompletedOperationsFromEvents,
  fetchDevices,
  fetchNotificationsLog,
  fetchStatusHistory,
  getDatabaseHospitalId,
  type DeviceRow,
  type NotificationLogRow,
  type RoomStatistics,
  type StatusHistoryRow,
  type StatusHistoryProgress,
} from '../lib/db';
import {
  beginStatisticsProgress, getStatisticsProgressStore, INITIAL_STATISTICS_PROGRESS,
  publishStatisticsProgress, type StatisticsProgressStore,
} from '../lib/statistics-loading-progress';

export type StatisticsPeriod = 'den' | 'týden' | 'měsíc' | 'rok';
const EMPTY_HISTORY: StatusHistoryRow[] = [];

export type StatisticsReportSource = 'statusHistory' | 'notifications' | 'devices' | 'dayHistory';
export type StatisticsReportSourceErrors = Record<StatisticsReportSource, string | null>;
export type StatisticsProgressBySource = Record<StatisticsReportSource, StatusHistoryProgress>;

interface SourceSnapshot<T> {
  data: T[];
  hospitalId: string;
  period: StatisticsPeriod | null;
  coverageStart?: string;
  coverageEnd?: string;
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

const SOURCE_ERRORS: Record<StatisticsReportSource, string> = {
  statusHistory: 'Historii stavů se nepodařilo načíst.',
  dayHistory: 'Denní historii stavů se nepodařilo načíst.',
  notifications: 'Notifikace se nepodařilo načíst.',
  devices: 'Evidenci zařízení se nepodařilo načíst.',
};

type SourceKey = readonly [string, string, StatisticsReportSource, StatisticsPeriod | number | 'all'];

function useStatisticsSource<T>(source: StatisticsReportSource, hospitalId: string | null, hospitalLoading: boolean,
  period: StatisticsPeriod, store: StatisticsProgressStore) {
  const scopePeriod = source === 'statusHistory' || source === 'notifications' ? period : null;
  const key: SourceKey | null = hospitalId && !hospitalLoading
    ? ['statistics-source', hospitalId, source, scopePeriod ?? (source === 'dayHistory' ? DAY_HISTORY_DAYS : 'all')]
    : null;
  const progressKey = key ? JSON.stringify(key) : null;
  const subscribe = useCallback((listener: () => void) => {
    if (!progressKey) return () => {};
    let listeners = store.listeners.get(progressKey);
    if (!listeners) { listeners = new Set(); store.listeners.set(progressKey, listeners); }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) store.listeners.delete(progressKey);
    };
  }, [store, progressKey]);
  const getProgress = useCallback(() => progressKey
    ? store.entries.get(progressKey)?.progress ?? INITIAL_STATISTICS_PROGRESS
    : INITIAL_STATISTICS_PROGRESS, [store, progressKey]);
  const observedProgress = useSyncExternalStore(subscribe, getProgress, () => INITIAL_STATISTICS_PROGRESS);

  const { data, error, isLoading, isValidating, mutate } = useSWR<SourceSnapshot<T>>(key,
    async (requestKey: SourceKey) => {
      const requestedHospital = requestKey[1];
      const requestedPeriod = source === 'statusHistory' || source === 'notifications' ? requestKey[3] as StatisticsPeriod : null;
      const requestProgressKey = JSON.stringify(requestKey);
      const request = beginStatisticsProgress(store, requestProgressKey);
      const publish = (progress: StatusHistoryProgress) => publishStatisticsProgress(store, requestProgressKey, request, progress);
      try {
        // A deferred fetcher must never label another hospital's rows as this key.
        if (getDatabaseHospitalId() !== requestedHospital) throw new Error('Zdravotnické zařízení se změnilo. Obnovte statistiky.');
        const now = new Date();
        const fromDate = source === 'dayHistory'
          ? new Date(now.getTime() - DAY_HISTORY_DAYS * 86_400_000)
          : periodStart(requestedPeriod ?? period, now);
        const result = source === 'statusHistory' || source === 'dayHistory'
          ? await fetchStatusHistory({ fromDate, toDate: now, all: true, onProgress: publish })
          : source === 'notifications'
            ? await fetchNotificationsLog({ fromDate, toDate: now, all: true, onProgress: publish })
            : await fetchDevices();
        if (result !== null) publish({ loaded: result.length, total: result.length, complete: true });
        else publish({ ...(store.entries.get(requestProgressKey)?.progress ?? INITIAL_STATISTICS_PROGRESS), complete: false });
        return {
          data: (result ?? []) as T[], hospitalId: requestedHospital, period: requestedPeriod,
          reportError: result === null ? SOURCE_ERRORS[source] : null,
          ...(source === 'dayHistory' ? { coverageStart: fromDate.toISOString(), coverageEnd: now.toISOString() } : {}),
        };
      } catch (cause) {
        publish({ ...(store.entries.get(requestProgressKey)?.progress ?? INITIAL_STATISTICS_PROGRESS), complete: false });
        throw cause;
      }
    }, {
      revalidateOnFocus: source === 'dayHistory',
      revalidateOnReconnect: source === 'dayHistory',
      dedupingInterval: 20_000,
      keepPreviousData: false,
    });

  const matches = Boolean(!hospitalLoading && hospitalId && data?.hospitalId === hospitalId && data.period === scopePeriod);
  const snapshot = matches ? data : undefined;
  const reportError = key && error ? error instanceof Error ? error.message : SOURCE_ERRORS[source] : snapshot?.reportError ?? null;
  const ready = Boolean(snapshot && !reportError && !isLoading && !isValidating);
  // A callback may finish a page before SWR publishes the complete snapshot.
  // Cached successes remain complete; a new/failed request can never show 100%.
  const progress = ready
    ? { loaded: snapshot!.data.length, total: snapshot!.data.length, complete: true }
    : { ...observedProgress, complete: false };
  return {
    snapshot, error, reportError, progress, mutate,
    loading: hospitalLoading || !hospitalId || (!reportError && (!matches || Boolean(isLoading))),
    refreshing: Boolean(matches && isValidating),
  };
}

export function aggregateRoomStatistics(history: StatusHistoryRow[]): RoomStatistics {
  const emergencyCount = history.filter((event) => event.event_type === 'emergency_on').length;
  const operationsByRoom: Record<string, number> = {};
  const operationsByDay: Record<string, number> = {};
  const stepDurations: Record<string, number[]> = Object.create(null);
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
  const { activeHospitalId, loading: hospitalLoading } = useHospital();
  const { cache } = useSWRConfig();
  const store = getStatisticsProgressStore(cache);
  const status = useStatisticsSource<StatusHistoryRow>('statusHistory', activeHospitalId, Boolean(hospitalLoading), period, store);
  const day = useStatisticsSource<StatusHistoryRow>('dayHistory', activeHospitalId, Boolean(hospitalLoading), period, store);
  const notification = useStatisticsSource<NotificationLogRow>('notifications', activeHospitalId, Boolean(hospitalLoading), period, store);
  const device = useStatisticsSource<DeviceRow>('devices', activeHospitalId, Boolean(hospitalLoading), period, store);

  const belongsToHospital = (row: Record<string, unknown> | null | undefined) => (
    !row || !row.hospital_id || row.hospital_id === activeHospitalId
  );
  useHospitalRealtime('room_status_history', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id || !belongsToHospital(raw)) return;
    const updateHistory = (current: SourceSnapshot<StatusHistoryRow> | undefined, expectedPeriod: StatisticsPeriod | null) => {
      if (!current || current.hospitalId !== activeHospitalId || current.period !== expectedPeriod) return current;
      return {
        ...current,
        data: payload.eventType === 'DELETE'
          ? current.data.filter(event => event.id !== id)
          : upsertById(current.data, payload.new as unknown as StatusHistoryRow),
      };
    };
    void status.mutate(current => updateHistory(current, period), { revalidate: false });
    void day.mutate(current => updateHistory(current, null), { revalidate: false });
  });
  useHospitalRealtime('notifications_log', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id || !belongsToHospital(raw)) return;
    void notification.mutate(current => {
      if (!current || current.hospitalId !== activeHospitalId || current.period !== period) return current;
      return {
        ...current,
        data: payload.eventType === 'DELETE'
          ? current.data.filter(item => item.id !== id)
          : upsertById(current.data, payload.new as unknown as NotificationLogRow),
      };
    }, { revalidate: false });
  });
  useHospitalRealtime('devices', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    if (!id || !belongsToHospital(raw)) return;
    void device.mutate(current => {
      if (!current || current.hospitalId !== activeHospitalId) return current;
      return {
        ...current,
        data: payload.eventType === 'DELETE'
          ? current.data.filter(item => item.id !== id)
          : upsertById(current.data, payload.new as unknown as DeviceRow),
      };
    }, { revalidate: false });
  });

  const statusHistory = status.snapshot?.data ?? EMPTY_HISTORY;
  const dbStats = useMemo(() => aggregateRoomStatistics(statusHistory), [statusHistory]);
  const reportSourceErrors = useMemo<StatisticsReportSourceErrors>(() => ({
    statusHistory: status.reportError,
    dayHistory: day.reportError,
    notifications: notification.reportError,
    devices: device.reportError,
  }), [status.reportError, day.reportError, notification.reportError, device.reportError]);
  const reportSourceLoading: Record<StatisticsReportSource, boolean> = {
    statusHistory: status.loading, dayHistory: day.loading,
    notifications: notification.loading, devices: device.loading,
  };
  const reportSourceRefreshing: Record<StatisticsReportSource, boolean> = {
    statusHistory: status.refreshing, dayHistory: day.refreshing,
    notifications: notification.refreshing, devices: device.refreshing,
  };
  const progressBySource: StatisticsProgressBySource = {
    statusHistory: status.progress, dayHistory: day.progress,
    notifications: notification.progress, devices: device.progress,
  };
  const isReportLoading = Object.values(reportSourceLoading).some(Boolean);
  const dayCoverageAvailable = day.snapshot && !day.reportError;

  return {
    statusHistory,
    dayHistory: day.snapshot?.data ?? EMPTY_HISTORY,
    notifications: notification.snapshot?.data ?? null,
    devices: device.snapshot?.data ?? null,
    dbStats,
    isLoading: isReportLoading,
    error: status.error ?? day.error ?? notification.error ?? device.error,
    reportSourceErrors,
    reportError: Object.values(reportSourceErrors).filter(Boolean).join(' ') || null,
    isReportLoading,
    reportSourceLoading,
    reportSourceRefreshing,
    progressBySource,
    dayHistoryCoverageStart: dayCoverageAvailable ? day.snapshot?.coverageStart ?? null : null,
    dayHistoryCoverageEnd: dayCoverageAvailable ? day.snapshot?.coverageEnd ?? null : null,
    refresh: () => Promise.all([status.mutate(), day.mutate(), notification.mutate(), device.mutate()]),
  };
}
