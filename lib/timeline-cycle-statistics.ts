import type { OperatingRoom } from '../types';

export type CompletedTimelineCycle = NonNullable<OperatingRoom['completedOperations']>[number];

/** A cycle selection never depends on the phase that was clicked. */
export function completedCycleSnapshot(room: OperatingRoom, cycle: CompletedTimelineCycle): OperatingRoom {
  const lastPhase = cycle.statusHistory.at(-1);
  return {
    ...room,
    id: `${room.id}:cycle:${cycle.startedAt}:${cycle.endedAt}`,
    operationStartedAt: cycle.startedAt,
    phaseStartedAt: lastPhase?.startedAt ?? cycle.startedAt,
    currentStepIndex: lastPhase?.stepIndex ?? 0,
    estimatedEndTime: cycle.endedAt,
    statusHistory: cycle.statusHistory,
    isPaused: false,
    pausedAt: null,
  };
}

/** Keep measured intervals inside the selected cycle/window; never use estimates. */
export function cyclePhaseMinutes(
  history: OperatingRoom['statusHistory'], startMs: number, endMs: number,
): Record<number, number> {
  const minutes: Record<number, number> = {};
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return minutes;
  const entries = (history ?? [])
    .map(entry => ({ ...entry, time: new Date(entry.startedAt).getTime() }))
    .filter(entry => Number.isFinite(entry.time))
    .sort((a, b) => a.time - b.time);
  entries.forEach((entry, index) => {
    const start = Math.max(startMs, entry.time);
    const end = Math.min(endMs, entries[index + 1]?.time ?? endMs);
    if (end > start) minutes[entry.stepIndex] = (minutes[entry.stepIndex] ?? 0) + (end - start) / 60_000;
  });
  return minutes;
}

/** Daily activity is independent of opening hours (including emergency/weekend work). */
export function dailyCycleStatistics(room: OperatingRoom, now: Date) {
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const startMs = dayStart.getTime();
  const endMs = Math.min(dayEnd.getTime(), now.getTime());
  let operations = 0;
  let durationMs = 0;
  let pausedMs = 0;
  const phaseMs: Record<number, number> = {};
  const add = (start: string, end: number, history: OperatingRoom['statusHistory']) => {
    const s = Math.max(startMs, new Date(start).getTime());
    const e = Math.min(endMs, end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;
    operations += 1;
    durationMs += e - s;
    for (const [index, minutes] of Object.entries(cyclePhaseMinutes(history, s, e))) {
      phaseMs[Number(index)] = (phaseMs[Number(index)] ?? 0) + minutes * 60_000;
    }
  };
  for (const cycle of room.completedOperations ?? []) {
    add(cycle.startedAt, new Date(cycle.endedAt).getTime(), cycle.statusHistory);
  }
  const isRunning = room.currentStepIndex > 0 && !room.isLocked;
  if (isRunning && room.operationStartedAt) {
    const pause = room.isPaused && room.pausedAt ? new Date(room.pausedAt).getTime() : NaN;
    add(room.operationStartedAt, Number.isFinite(pause) ? Math.min(endMs, pause) : endMs, room.statusHistory);
    if (Number.isFinite(pause)) pausedMs = Math.max(0, endMs - Math.max(startMs, pause));
  }
  return { operations, durationMs, phaseMs, pausedMs, isRunning };
}
