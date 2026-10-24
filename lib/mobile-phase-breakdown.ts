import type { OperatingRoom } from '../types';
import type { MobileTimelineStatus } from './mobile-timeline';

export type PhaseTimeRow = {
  key: string; stepIndex: number; name: string; color: string;
  startMs: number; endMs: number; live: boolean;
};

/** Recorded intervals only. Preserve repeated phases and clip to the selected cycle. */
export function mobilePhaseBreakdown(
  history: OperatingRoom['statusHistory'], statuses: MobileTimelineStatus[],
  startMs: number, endMs: number, live: boolean,
): PhaseTimeRow[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return [];
  const entries = (history ?? []).map(entry => ({ ...entry, time: Date.parse(entry.startedAt) }))
    .filter(entry => Number.isFinite(entry.time) && entry.time <= endMs)
    .sort((a, b) => a.time - b.time);
  return entries.flatMap((entry, index) => {
    const start = Math.max(startMs, entry.time);
    const end = Math.min(endMs, entries[index + 1]?.time ?? endMs);
    if (end < start || (end === start && index < entries.length - 1)) return [];
    const status = statuses[entry.stepIndex];
    return [{ key: `${entry.time}-${index}`, stepIndex: entry.stepIndex,
      name: entry.stepName || status?.name || status?.title || 'Nezaznamenaná fáze',
      color: entry.color || status?.accent_color || status?.color || '#c1bff1',
      startMs: start, endMs: end, live: live && index === entries.length - 1 }];
  });
}

export function phaseDurationLabel(durationMs: number): string {
  if (durationMs < 60_000) return '< 1 min';
  const minutes = Math.floor(durationMs / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
