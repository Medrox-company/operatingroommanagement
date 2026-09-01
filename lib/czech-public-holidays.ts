export type CzechPublicHolidayKind = 'state' | 'other';

export interface CzechPublicHoliday {
  name: string;
  kind: CzechPublicHolidayKind;
}

const FIXED_HOLIDAYS = new Map<string, CzechPublicHoliday>([
  ['01-01', { name: 'Nový rok · Den obnovy samostatného českého státu', kind: 'state' }],
  ['05-01', { name: 'Svátek práce', kind: 'other' }],
  ['05-08', { name: 'Den vítězství', kind: 'state' }],
  ['07-05', { name: 'Den slovanských věrozvěstů Cyrila a Metoděje', kind: 'state' }],
  ['07-06', { name: 'Den upálení mistra Jana Husa', kind: 'state' }],
  ['09-28', { name: 'Den české státnosti', kind: 'state' }],
  ['10-28', { name: 'Den vzniku samostatného československého státu', kind: 'state' }],
  ['11-17', { name: 'Den boje za svobodu a demokracii a Mezinárodní den studentstva', kind: 'state' }],
  ['12-24', { name: 'Štědrý den', kind: 'other' }],
  ['12-25', { name: '1. svátek vánoční', kind: 'other' }],
  ['12-26', { name: '2. svátek vánoční', kind: 'other' }],
]);

function localDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

// Meeus/Jones/Butcher algorithm for Gregorian Easter Sunday.
function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return localDate(year, month - 1, day);
}

export function getCzechPublicHoliday(date: Date): CzechPublicHoliday | null {
  const fixedKey = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const fixedHoliday = FIXED_HOLIDAYS.get(fixedKey);
  if (fixedHoliday) return fixedHoliday;

  const easter = easterSunday(date.getFullYear());
  const key = dateKey(date);
  if (key === dateKey(addDays(easter, -2))) return { name: 'Velký pátek', kind: 'other' };
  if (key === dateKey(addDays(easter, 1))) return { name: 'Velikonoční pondělí', kind: 'other' };
  return null;
}
