'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { logger } from '../lib/logger';
import { getHospitalRealtimeClient, isSupabaseConfigured } from '../lib/supabase';
import { useHospital } from './HospitalContext';

export const REALTIME_TABLES = [
  'operating_rooms',
  'room_status_history',
  'staff',
  'devices',
  'notifications_log',
  'workflow_statuses',
  'app_settings',
] as const;

// `operating_rooms` is guaranteed by scripts/enable-realtime.sql to be part of
// the Supabase publication. Do not mix optional/unpublished tables into this
// critical binding: Realtime can report SUBSCRIBED while omitting all events
// when a binding set contains tables missing from the publication.
const PUBLISHED_REALTIME_TABLES = ['operating_rooms'] as const;

export type RealtimeTable = typeof REALTIME_TABLES[number];
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface HospitalRealtimePayload {
  eventType: RealtimeEventType;
  table: RealtimeTable;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

type RealtimeListener = (payload: HospitalRealtimePayload) => void;

interface RealtimeContextValue {
  connected: boolean;
  subscribe: (table: RealtimeTable, listener: RealtimeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { activeHospitalId } = useHospital();
  const listenersRef = useRef(new Map<RealtimeTable, Set<RealtimeListener>>());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((table: RealtimeTable, listener: RealtimeListener) => {
    let listeners = listenersRef.current.get(table);
    if (!listeners) {
      listeners = new Set<RealtimeListener>();
      listenersRef.current.set(table, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) listenersRef.current.delete(table);
    };
  }, []);

  useEffect(() => {
    if (!activeHospitalId || !isSupabaseConfigured) {
      setConnected(false);
      return;
    }

    setConnected(false);
    let disposed = false;
    let realtimeClient: Awaited<ReturnType<typeof getHospitalRealtimeClient>> = null;
    let channel: ReturnType<NonNullable<typeof realtimeClient>['channel']> | null = null;

    const connect = async () => {
      try {
        realtimeClient = await getHospitalRealtimeClient();
        if (disposed || !realtimeClient) return;

        channel = realtimeClient.channel(`hospital-realtime:${activeHospitalId}`);

        PUBLISHED_REALTIME_TABLES.forEach((table) => {
          channel = channel!.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              filter: `hospital_id=eq.${activeHospitalId}`,
            },
            (rawPayload) => {
              const nextRecord = Object.keys(rawPayload.new ?? {}).length > 0
                ? rawPayload.new as Record<string, unknown>
                : null;
              const oldRecord = Object.keys(rawPayload.old ?? {}).length > 0
                ? rawPayload.old as Record<string, unknown>
                : null;
              const recordHospitalId = nextRecord?.hospital_id ?? oldRecord?.hospital_id;

              // The database filter and RLS are the primary tenant barriers.
              // Keep a client-side guard too, so a stale event can never cross
              // into the newly selected hospital during channel teardown.
              if (recordHospitalId && recordHospitalId !== activeHospitalId) return;

              const payload: HospitalRealtimePayload = {
                eventType: rawPayload.eventType as RealtimeEventType,
                table,
                new: nextRecord,
                old: oldRecord,
              };
              logger.debug('[Realtime] Hospital event:', table, payload.eventType);
              listenersRef.current.get(table)?.forEach((listener) => listener(payload));
            },
          );
        });

        channel.subscribe((status, error) => {
          if (disposed) return;
          const isConnected = status === 'SUBSCRIBED';
          setConnected(isConnected);
          if (error) {
            logger.error('[Realtime] Central hospital channel error:', error);
          } else {
            logger.debug('[Realtime] Central hospital channel:', status);
          }
        });
      } catch (error) {
        if (disposed) return;
        setConnected(false);
        logger.error('[Realtime] Failed to authorize hospital channel:', error);
      }
    };

    void connect();

    return () => {
      disposed = true;
      setConnected(false);
      if (channel && realtimeClient) void realtimeClient.removeChannel(channel);
    };
  }, [activeHospitalId]);

  const value = useMemo<RealtimeContextValue>(() => ({ connected, subscribe }), [connected, subscribe]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtimeContext must be used within RealtimeProvider');
  return context;
}

export function useHospitalRealtime(table: RealtimeTable, listener: RealtimeListener) {
  const { subscribe } = useRealtimeContext();
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(
    () => subscribe(table, (payload) => listenerRef.current(payload)),
    [subscribe, table],
  );
}
