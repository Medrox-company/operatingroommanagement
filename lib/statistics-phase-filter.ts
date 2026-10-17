import type { StatusHistoryRow } from './db';

/** A quality filter for phase measurements, never a deletion of clinical events. */
export function isShortStatisticsPhase(event: StatusHistoryRow): boolean {
  return event.event_type === 'step_change'
    && typeof event.duration_seconds === 'number'
    && Number.isFinite(event.duration_seconds)
    && event.duration_seconds >= 0
    && event.duration_seconds < 60;
}

export function filterStatisticsPhaseDurations(history: StatusHistoryRow[], excludeShortPhases: boolean): StatusHistoryRow[] {
  if (!excludeShortPhases) return history;
  // Keep timestamps, transition indices and every start/end/reset marker. Null
  // means an excluded measurement, not zero minutes or an absent clinical phase.
  return history.map(event => isShortStatisticsPhase(event)
    ? { ...event, duration_seconds: null }
    : event);
}

export const statisticsPhaseFilterNote = (excluded: boolean) => excluded
  ? 'Filtr měření: fáze kratší než 1 minuta jsou vynechány. Počty výkonů a párování celých cyklů se nemění.'
  : 'Filtr měření: zahrnuty jsou všechny doložené délky fází, včetně fází kratších než 1 minuta.';
