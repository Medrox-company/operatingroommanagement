'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime } from '../contexts/RealtimeContext';
import {
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

interface StatisticsData {
  statusHistory: StatusHistoryRow[];
  notifications: NotificationLogRow[];
  devices: DeviceRow[];
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
  const operationEnds = history.filter((event) => event.event_type === 'operation_end');
  const emergencyCount = history.filter((event) => event.event_type === 'emergency_on').length;
  const operationsByRoom: Record<string, number> = {};
  const operationsByDay: Record<string, number> = {};
  const stepDurations: Record<string, number[]> = {};

  operationEnds.forEach((event) => {
    operationsByRoom[event.operating_room_id] = (operationsByRoom[event.operating_room_id] || 0) + 1;
    const day = event.timestamp.slice(0, 10);
    operationsByDay[day] = (operationsByDay[day] || 0) + 1;
  });
  history.forEach((event) => {
    if (event.event_type !== 'step_change' || !event.step_name || !event.duration_seconds) return;
    (stepDurations[event.step_name] ??= []).push(event.duration_seconds);
  });

  const operationDurations = operationEnds
    .map((event) => event.duration_seconds)
    .filter((duration): duration is number => typeof duration === 'number');
  const averageStepDurations = Object.fromEntries(Object.entries(stepDurations).map(([name, durations]) => [
    name,
    Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length / 60),
  ]));

  return {
    totalOperations: operationEnds.length,
    averageOperationDuration: operationDurations.length
      ? Math.round(operationDurations.reduce((sum, duration) => sum + duration, 0) / operationDurations.length / 60)
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
        fetchStatusHistory({ fromDate, toDate: now, limit: 5_000 }),
        fetchNotificationsLog({ fromDate, toDate: now, limit: 1_000 }),
        fetchDevices(),
      ]);
      return {
        statusHistory: history ?? [],
        notifications: notifications ?? [],
        devices: devices ?? [],
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
  } = useSWR<StatusHistoryRow[]>(
    activeHospitalId ? ['statistics-day-history', activeHospitalId, DAY_HISTORY_DAYS] : null,
    async () => {
      const now = new Date();
      const fromDate = new Date(now.getTime() - DAY_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      return (await fetchStatusHistory({ fromDate, toDate: now, limit: 5_000 })) ?? [];
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
    void mutateDayHistory(applyHistoryEvent, { revalidate: false });
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
  return {
    statusHistory,
    dayHistory: dayHistoryData ?? EMPTY_HISTORY,
    notifications: data ? data.notifications : null,
    devices: data ? data.devices : null,
    dbStats,
    isLoading: isLoading || isDayHistoryLoading,
    error: error ?? dayHistoryError,
  };
}
