import type { StatusHistoryRow } from './db';
import type { StatisticsWindow } from './statistics-room-scope';

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .trim().toLowerCase().replace(/\s+/g, ' ');

/** Measured phase intervals only; a closed schedule never erases actual activity. */
export function roomDetailPhaseDistribution(
  history: StatusHistoryRow[], roomId: string,
  steps: Array<{ title: string; color: string }>, window: StatisticsWindow,
) {
  const totals = new Map<string, number>();
  for (const event of history) {
    if (event.operating_room_id !== roomId || event.event_type !== 'step_change' || !event.step_name) continue;
    const seconds = event.duration_seconds;
    const end = Date.parse(event.timestamp);
    if (!Number.isFinite(end) || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) continue;
    const overlap = Math.max(0, Math.min(end, window.end.getTime())
      - Math.max(end - seconds * 1000, window.start.getTime()));
    const name = normalized(event.step_name);
    totals.set(name, (totals.get(name) ?? 0) + overlap / 60000);
  }
  const phases = steps.filter(step => normalized(step.title) !== 'sal pripraven')
    .map(step => ({ ...step, min: totals.get(normalized(step.title)) ?? 0 }));
  const totalMinutes = phases.reduce((sum, phase) => sum + phase.min, 0);
  return phases.map(phase => ({ ...phase, pct: totalMinutes > 0 ? phase.min / totalMinutes * 100 : 0 }));
}

/** Counts, not percentages; all hours remain visible, including unscheduled activity. */
export function roomDetailHourlyEvents(history: StatusHistoryRow[], roomId: string, window: StatisticsWindow) {
  const bins = Array.from({ length: 24 }, (_, hour) => ({ t: `${String(hour).padStart(2, '0')}:00`, v: 0 }));
  for (const event of history) {
    if (event.operating_room_id !== roomId || !['step_change', 'operation_start'].includes(event.event_type)) continue;
    const at = new Date(event.timestamp);
    if (Number.isFinite(at.getTime()) && at >= window.start && at < window.end) bins[at.getHours()].v++;
  }
  return bins;
}
