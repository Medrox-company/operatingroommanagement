import type { StatusHistoryProgress } from './db';

export const INITIAL_STATISTICS_PROGRESS: StatusHistoryProgress = { loaded: 0, total: null, complete: false };

interface ProgressEntry {
  request: symbol;
  progress: StatusHistoryProgress;
}

export interface StatisticsProgressStore {
  entries: Map<string, ProgressEntry>;
  listeners: Map<string, Set<() => void>>;
}

// A shared SWR request needs shared progress, scoped to that SWR provider.
const stores = new WeakMap<object, StatisticsProgressStore>();

export function getStatisticsProgressStore(cache: object): StatisticsProgressStore {
  let store = stores.get(cache);
  if (!store) {
    store = { entries: new Map(), listeners: new Map() };
    stores.set(cache, store);
  }
  return store;
}

export function publishStatisticsProgress(store: StatisticsProgressStore, key: string, request: symbol, progress: StatusHistoryProgress) {
  if (store.entries.get(key)?.request !== request) return;
  store.entries.set(key, { request, progress });
  store.listeners.get(key)?.forEach(listener => {
    try { listener(); } catch { /* UI observers never interrupt a source request. */ }
  });
}

export function beginStatisticsProgress(store: StatisticsProgressStore, key: string): symbol {
  const request = Symbol(key);
  store.entries.set(key, { request, progress: INITIAL_STATISTICS_PROGRESS });
  publishStatisticsProgress(store, key, request, INITIAL_STATISTICS_PROGRESS);
  return request;
}

export function statisticsProgressPercent(progress?: StatusHistoryProgress): number | null {
  if (progress?.complete === true) return 100;
  if (!progress || !Number.isFinite(progress.total) || progress.total === null || progress.total <= 0) return null;
  const total = Math.floor(progress.total);
  if (total === 0) return null;
  const loaded = Number.isFinite(progress.loaded) ? Math.max(0, Math.floor(progress.loaded)) : 0;
  return Math.min(99, Math.floor(loaded / total * 100));
}

/** Combine actual record counts only; an unknown source never gets a guessed weight. */
export function aggregateStatisticsProgress(progress: readonly StatusHistoryProgress[]): StatusHistoryProgress {
  if (!progress.length) return INITIAL_STATISTICS_PROGRESS;
  const loaded = progress.reduce((sum, item) => sum + (Number.isFinite(item.loaded) ? Math.max(0, Math.floor(item.loaded)) : 0), 0);
  const complete = progress.every(item => item.complete === true);
  const knownTotals = progress.every(item => item.total !== null && Number.isFinite(item.total) && item.total >= 0);
  const total = knownTotals ? progress.reduce((sum, item) => sum + Math.floor(item.total!), 0) : complete ? loaded : null;
  return { loaded, total, complete };
}
