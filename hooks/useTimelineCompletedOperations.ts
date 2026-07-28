'use client';

import { useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import { useHospitalRealtime, useRealtimeContext } from '../contexts/RealtimeContext';
import {
  buildCompletedOperationsFromEvents,
  fetchStatusHistory,
  type CompletedOperation,
  type StatusHistoryRow,
} from '../lib/db';

const EMPTY_HISTORY: StatusHistoryRow[] = [];
const RELEVANT_EVENT_TYPES = new Set([
  'operation_start',
  'operation_end',
  'operation_completed',
  'step_change',
]);

function getOperationalWindow(now: Date) {
  const start = new Date(now);
  if (start.getHours() < 7) start.setDate(start.getDate() - 1);
  start.setHours(7, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(7, 0, 0, 0);
  return { start, end };
}

function upsertEvent(events: StatusHistoryRow[], event: StatusHistoryRow) {
  const index = events.findIndex((current) => current.id === event.id);
  if (index === -1) return [...events, event];
  const next = [...events];
  next[index] = { ...next[index], ...event };
  return next;
}

export function useTimelineCompletedOperations() {
  const { activeHospitalId } = useHospital();
  const { connected } = useRealtimeContext();
  const wasConnectedRef = useRef(false);
  // Klíč se při nepřetržitém otevření aplikace automaticky změní v 7:00,
  // protože Timeline sama aktualizuje čas. Nemusíme kvůli tomu zakládat další
  // interval ani zatěžovat starší klientské stanice.
  const operationalDayKey = getOperationalWindow(new Date()).start.toISOString();
  const operationalWindow = useMemo(
    () => getOperationalWindow(new Date(operationalDayKey)),
    [activeHospitalId, operationalDayKey],
  );

  const { data, mutate } = useSWR<StatusHistoryRow[]>(
    activeHospitalId
      ? ['timeline-completed-operations', activeHospitalId, operationalWindow.start.toISOString()]
      : null,
    async () => {
      // Přesah dozadu dovolí správně spárovat výkon, který začal před 7:00
      // a skončil až v aktuálním provozním dni.
      const fromDate = new Date(operationalWindow.start.getTime() - 24 * 60 * 60 * 1_000);
      return (await fetchStatusHistory({
        eventTypes: [...RELEVANT_EVENT_TYPES],
        fromDate,
        toDate: new Date(),
        limit: 5_000,
      })) ?? [];
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 15_000,
      errorRetryCount: 4,
    },
  );

  useHospitalRealtime('room_status_history', (payload) => {
    const raw = payload.new ?? payload.old;
    const id = typeof raw?.id === 'string' ? raw.id : null;
    const eventType = typeof raw?.event_type === 'string' ? raw.event_type : null;
    if (!id || !eventType || !RELEVANT_EVENT_TYPES.has(eventType)) return;

    void mutate((current = EMPTY_HISTORY) => {
      if (payload.eventType === 'DELETE') {
        return current.filter((event) => event.id !== id);
      }
      return upsertEvent(current, payload.new as unknown as StatusHistoryRow);
    }, { revalidate: false });
  });

  // Centrální realtime kanál může při výpadku sítě několik událostí minout.
  // Po jeho obnovení proto provedeme jediný lehký kontrolní dotaz na log,
  // nikoliv nové načtení všech sálů a jejich těžkých JSON polí.
  useEffect(() => {
    const wasConnected = wasConnectedRef.current;
    wasConnectedRef.current = connected;
    if (connected && !wasConnected && data !== undefined) void mutate();
  }, [connected, data, mutate]);

  const completedOperationsByRoom = useMemo(() => {
    const grouped = new Map<string, StatusHistoryRow[]>();
    for (const event of data ?? EMPTY_HISTORY) {
      const events = grouped.get(event.operating_room_id);
      if (events) events.push(event);
      else grouped.set(event.operating_room_id, [event]);
    }

    const result = new Map<string, CompletedOperation[]>();
    for (const [roomId, events] of grouped) {
      const operations = buildCompletedOperationsFromEvents(events).filter((operation) => {
        const startedAt = new Date(operation.startedAt).getTime();
        const endedAt = new Date(operation.endedAt).getTime();
        return startedAt < operationalWindow.end.getTime()
          && endedAt >= operationalWindow.start.getTime();
      });
      if (operations.length > 0) result.set(roomId, operations);
    }
    return result;
  }, [data, operationalWindow.end, operationalWindow.start]);

  return {
    completedOperationsByRoom,
    refreshCompletedOperations: mutate,
  };
}
