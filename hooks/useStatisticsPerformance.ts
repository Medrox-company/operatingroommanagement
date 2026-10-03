'use client';

import { useCallback, useSyncExternalStore } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useHospital } from '../contexts/HospitalContext';
import { fetchStatusHistory, type StatusHistoryProgress, type StatusHistoryRow } from '../lib/db';

const EMPTY_HISTORY: StatusHistoryRow[] = [];
const INITIAL_PROGRESS: StatusHistoryProgress = { loaded: 0, total: null, complete: false };

interface ProgressEntry {
  request: symbol;
  progress: StatusHistoryProgress;
}

interface ProgressStore {
  entries: Map<string, ProgressEntry>;
  listeners: Map<string, Set<() => void>>;
}

// Share progress just like SWR shares its in-flight request. Reopening the tab
// must subscribe to the existing request, not invent a new percentage at zero.
// Provider scoping also prevents progress leaking across separate SWR caches.
const progressStores = new WeakMap<object, ProgressStore>();
function getProgressStore(cache: object): ProgressStore {
  let store = progressStores.get(cache);
  if (!store) {
    store = { entries: new Map(), listeners: new Map() };
    progressStores.set(cache, store);
  }
  return store;
}

function publishProgress(store: ProgressStore, hospitalId: string, request: symbol, progress: StatusHistoryProgress) {
  if (store.entries.get(hospitalId)?.request !== request) return;
  store.entries.set(hospitalId, { request, progress });
  store.listeners.get(hospitalId)?.forEach(listener => listener());
}

/**
 * Výkonnost má vlastní dlouhé okno. Globální přepínač Den/Týden/Měsíc/Rok
 * ovládá ostatní záložky a nesmí měsíční trend omezit na posledních 30 dní.
 * Překryv několika dnů na začátku filtruje až model podle Europe/Prague.
 */
const FETCH_DAYS = 370;
const PERFORMANCE_EVENT_TYPES = [
  'step_change',
  'operation_start',
  'operation_end',
  'operation_completed',
];

interface PerformanceHistorySnapshot {
  hospitalId: string;
  history: StatusHistoryRow[];
  loadedAt: string;
}

export function useStatisticsPerformance(enabled: boolean) {
  const { activeHospitalId } = useHospital();
  const { cache } = useSWRConfig();
  const progressStore = getProgressStore(cache);
  const progressHospitalId = enabled ? activeHospitalId : null;
  const subscribe = useCallback((listener: () => void) => {
    if (!progressHospitalId) return () => {};
    let listeners = progressStore.listeners.get(progressHospitalId);
    if (!listeners) {
      listeners = new Set();
      progressStore.listeners.set(progressHospitalId, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) progressStore.listeners.delete(progressHospitalId);
    };
  }, [progressHospitalId, progressStore]);
  const getProgress = useCallback(() => (
    progressHospitalId ? progressStore.entries.get(progressHospitalId)?.progress ?? INITIAL_PROGRESS : INITIAL_PROGRESS
  ), [progressHospitalId, progressStore]);
  const progress = useSyncExternalStore(subscribe, getProgress, () => INITIAL_PROGRESS);
  const { data, error, isLoading, isValidating, mutate } = useSWR<PerformanceHistorySnapshot>(
    enabled && activeHospitalId ? ['statistics-performance', activeHospitalId] : null,
    async ([, hospitalId]: [string, string]) => {
      const request = Symbol('performance-history');
      progressStore.entries.set(hospitalId, { request, progress: INITIAL_PROGRESS });
      publishProgress(progressStore, hospitalId, request, INITIAL_PROGRESS);
      const now = new Date();
      const fromDate = new Date(now.getTime() - FETCH_DAYS * 24 * 60 * 60 * 1000);
      const history = await fetchStatusHistory({
        fromDate,
        toDate: now,
        eventTypes: PERFORMANCE_EVENT_TYPES,
        all: true,
        onProgress: update => publishProgress(progressStore, hospitalId, request, update),
      });
      if (history === null) throw new Error('Historii pro měsíční výkonnost se nepodařilo načíst.');
      return { hospitalId, history, loadedAt: now.toISOString() };
    },
    { revalidateOnFocus: true, revalidateOnReconnect: true, dedupingInterval: 60_000 },
  );

  const matchesHospital = Boolean(activeHospitalId && data?.hospitalId === activeHospitalId);
  return {
    history: matchesHospital ? data!.history : EMPTY_HISTORY,
    progress,
    isLoading: enabled && (!error || isValidating) && (isLoading || !matchesHospital),
    isRefreshing: isValidating && matchesHospital,
    error: isValidating ? null : error instanceof Error ? error.message : error ? 'Měsíční výkonnost se nepodařilo načíst.' : null,
    loadedAt: matchesHospital ? data?.loadedAt ?? null : null,
    refresh: () => mutate(),
  };
}
