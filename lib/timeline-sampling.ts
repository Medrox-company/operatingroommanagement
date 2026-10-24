// Chart resolution is a rendering budget, never a limit on clinical dates.
export const MAX_FORECAST_SAMPLES = 481;
export const MAX_FORECAST_MARKERS = 25;
export const MAX_ARO_MARKERS = 97;

/** Keep the normal cadence, coarsening it for long ranges before allocating. */
export function boundedTimelineTicks(
  start: number,
  end: number,
  preferredStep: number,
  maxPoints: number,
): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start
    || !Number.isFinite(preferredStep) || preferredStep <= 0
    || !Number.isInteger(maxPoints) || maxPoints < 2 || maxPoints > MAX_FORECAST_SAMPLES) {
    return [];
  }
  const span = end - start;
  if (!Number.isFinite(span)) return [];
  const stride = preferredStep * Math.max(1, Math.ceil(span / preferredStep / (maxPoints - 1)));
  if (!Number.isFinite(stride)) return [];
  const ticks: number[] = [];
  for (let index = 0; index < maxPoints; index++) {
    const time = start + index * stride;
    if (time > end) break;
    ticks.push(time);
  }
  return ticks;
}
