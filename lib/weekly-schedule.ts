import type { DayWorkingHours, WeeklySchedule } from '../types';

const DAYS = [
  ['monday', 'Pondělí'],
  ['tuesday', 'Úterý'],
  ['wednesday', 'Středa'],
  ['thursday', 'Čtvrtek'],
  ['friday', 'Pátek'],
  ['saturday', 'Sobota'],
  ['sunday', 'Neděle'],
] as const;

type ScheduleParseResult =
  | { schedule: WeeklySchedule; error: null }
  | { schedule: null; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

/** Validate the numeric schedule used by the editor, without coercing closed days open. */
export function parseWeeklySchedule(value: unknown): ScheduleParseResult {
  if (!isRecord(value)) {
    return { schedule: null, error: 'Neplatný týdenní rozvrh sálu.' };
  }

  const schedule = {} as WeeklySchedule;
  for (const [key, label] of DAYS) {
    const day = value[key];
    if (!isRecord(day) || typeof day.enabled !== 'boolean') {
      return { schedule: null, error: `${label}: chybí platné nastavení provozu.` };
    }
    if (!isIntegerInRange(day.startHour, 23) || !isIntegerInRange(day.endHour, 23)
      || !isIntegerInRange(day.startMinute, 59) || !isIntegerInRange(day.endMinute, 59)) {
      return { schedule: null, error: `${label}: zadejte hodiny 0–23 a minuty 0–59.` };
    }
    if (day.breakMinutes !== undefined && !isIntegerInRange(day.breakMinutes, 480)) {
      return { schedule: null, error: `${label}: přestávka musí být celé číslo od 0 do 480 minut.` };
    }
    if (day.enabled && day.endHour * 60 + day.endMinute <= day.startHour * 60 + day.startMinute) {
      return { schedule: null, error: `${label}: konec provozu musí být později než začátek ve stejném dni.` };
    }

    // Persist only the supported schedule fields, not arbitrary request properties.
    const hours: DayWorkingHours = {
      enabled: day.enabled,
      startHour: day.startHour,
      startMinute: day.startMinute,
      endHour: day.endHour,
      endMinute: day.endMinute,
      ...(typeof day.breakMinutes === 'number' ? { breakMinutes: day.breakMinutes } : {}),
    };
    schedule[key] = hours;
  }
  return { schedule, error: null };
}
