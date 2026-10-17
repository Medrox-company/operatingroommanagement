import type { OperatingRoom } from '../types';
import type { NotificationLogRow, StatusHistoryProgress, StatusHistoryRow } from './db';
import { buildMonthlyPerformance, PERFORMANCE_METRICS } from './statistics-performance';
import { buildStatisticsExportUtilization } from './statistics-export-utilization';
import { statisticsExportNotificationLabel, summarizeStatisticsExportNotifications } from './statistics-export-notifications';
import type { StatisticsReport, StatisticsReportMetadata, StatisticsReportSection } from './statistics-print';

export const STATISTICS_EXPORT_TIMEZONE = 'Europe/Prague' as const;
export type StatisticsExportPreset = 'day' | 'week' | 'month' | 'year' | 'custom';
export interface StatisticsExportRange {
  from: string;
  to: string;
  start: Date;
  /** Exclusive endpoint: 07:00 Prague on the day after the inclusive final date. */
  end: Date;
  days: string[];
}

const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: STATISTICS_EXPORT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function localParts(instant: number) {
  return Object.fromEntries(parts.formatToParts(new Date(instant)).filter(part => part.type !== 'literal')
    .map(part => [part.type, Number(part.value)]));
}
function calendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Vyberte platné datum.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError('Vyberte platné datum.');
  return date;
}
function addDate(value: string, days: number): string {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function dayStart(value: string): Date {
  const date = calendarDate(value);
  const desired = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 7);
  let instant = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = localParts(instant);
    instant += desired - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  }
  return new Date(instant);
}
export function statisticsExportOperationalDate(now = new Date()): string {
  const local = localParts(now.getTime());
  const date = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
  return local.hour < 7 ? addDate(date, -1) : date;
}

/** Calendar arithmetic, independent of the user's device timezone and DST. */
export function exportDateRange(preset: StatisticsExportPreset, anchor: string, customFrom = anchor, customTo = anchor): StatisticsExportRange {
  if (!['day', 'week', 'month', 'year', 'custom'].includes(preset)) throw new RangeError('Vyberte podporovaný rozsah exportu.');
  const date = calendarDate(anchor);
  let from = anchor, to = anchor;
  if (preset === 'week') {
    from = addDate(anchor, -((date.getUTCDay() + 6) % 7));
    to = addDate(from, 6);
  } else if (preset === 'month') {
    from = `${anchor.slice(0, 7)}-01`;
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
    to = last.toISOString().slice(0, 10);
  } else if (preset === 'year') {
    from = `${anchor.slice(0, 4)}-01-01`;
    to = `${anchor.slice(0, 4)}-12-31`;
  } else if (preset === 'custom') {
    from = customFrom;
    to = customTo;
  }
  calendarDate(from); calendarDate(to);
  if (from > to) throw new RangeError('Datum od musí být stejné nebo dřívější než datum do.');
  const days: string[] = [];
  for (let day = from; day <= to; day = addDate(day, 1)) days.push(day);
  return { from, to, start: dayStart(from), end: dayStart(addDate(to, 1)), days };
}

export function statisticsExportProgress(history: StatusHistoryProgress, notifications: StatusHistoryProgress, ready = false) {
  const loaded = history.loaded + notifications.loaded;
  const total = history.total !== null && notifications.total !== null ? history.total + notifications.total : null;
  const percent = ready ? 100 : total !== null && total > 0 ? Math.min(99, Math.floor(loaded / total * 100)) : null;
  return { loaded, total, percent, complete: ready };
}

const safeString = (value: unknown): string | null => typeof value === 'string' ? value : null;
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
/** Free-text reasons, personnel/patients, arbitrary metadata and transport fields never leave the export. */
export function sanitizeStatisticsHistory(row: StatusHistoryRow) {
  const metadata: Record<string, string | number | boolean> = {};
  for (const key of ['previous_step', 'next_step', 'completed_step']) {
    const value = safeString(row.metadata?.[key]);
    if (value !== null) metadata[key] = value;
  }
  for (const key of ['startedAt', 'endedAt']) {
    const value = safeString(row.metadata?.[key]);
    if (value !== null && Number.isFinite(Date.parse(value))) metadata[key] = new Date(value).toISOString();
  }
  for (const key of ['previous_step_index', 'next_step_index']) {
    const value = finite(row.metadata?.[key]);
    if (value !== null && Number.isInteger(value) && value >= 0) metadata[key] = value;
  }
  if (row.metadata?.synthetic === true || row.metadata?.synthetic === 'true') metadata.synthetic = true;
  if (row.metadata?.source === 'app_review_seed') metadata.source = 'app_review_seed';
  return {
    id: safeString(row.id), operating_room_id: safeString(row.operating_room_id),
    event_type: safeString(row.event_type), step_index: finite(row.step_index),
    // Legacy imported completions may put a patient/procedure label in step_name.
    step_name: row.event_type === 'operation_completed' ? null : safeString(row.step_name),
    duration_seconds: finite(row.duration_seconds), timestamp: safeString(row.timestamp), created_at: safeString(row.created_at), metadata,
  };
}
export function sanitizeStatisticsNotification(row: NotificationLogRow) {
  return { id: safeString(row.id), notification_type: safeString(row.notification_type),
    room_id: safeString(row.room_id), room_name: safeString(row.room_name),
    recipient_count: finite(row.recipient_count), created_at: safeString(row.created_at) };
}
function isSynthetic(row: StatusHistoryRow) {
  return row.metadata?.synthetic === true || row.metadata?.synthetic === 'true' || row.metadata?.source === 'app_review_seed';
}
function historicalPhaseName(row: StatusHistoryRow): string {
  return typeof row.metadata?.previous_step === 'string' ? row.metadata.previous_step : row.step_name || 'Nezaznamenaný název';
}
/** Ready is idle; a measured preparation phase is not. */
function isIdlePhase(row: StatusHistoryRow): boolean {
  const name = historicalPhaseName(row).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  return ['sal pripraven', 'pripraveny sal', 'pripraveny operacni sal', 'operacni sal pripraven'].includes(name);
}
function uniqueHistory(rows: StatusHistoryRow[]) {
  const ids = new Set<string>();
  return rows.filter(row => {
    if (!row.id) return true;
    if (ids.has(row.id)) return false;
    ids.add(row.id); return true;
  }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    || (a.event_type === 'operation_start' ? -1 : b.event_type === 'operation_start' ? 1 : a.id.localeCompare(b.id)));
}
export interface StatisticsExportCycle { roomId: string; start: string; end: string; seconds: number; overlapSeconds: number; evidence: string }
export function statisticsExportCycles(history: StatusHistoryRow[], range: StatisticsExportRange): StatisticsExportCycle[] {
  const pending = new Map<string, number>();
  const cycles: StatisticsExportCycle[] = [];
  const starts = new Map<string, StatisticsExportCycle[]>();
  for (const row of uniqueHistory(history)) {
    const at = Date.parse(row.timestamp);
    if (!Number.isFinite(at)) continue;
    if (isSynthetic(row)) { pending.delete(row.operating_room_id); continue; }
    if (row.event_type === 'operation_start') {
      pending.set(row.operating_room_id, at); continue;
    }
    if (row.event_type !== 'operation_end' && row.event_type !== 'operation_completed') continue;
    let start = pending.get(row.operating_room_id);
    let end = at;
    let evidence = 'operation_start + operation_end/completed';
    if (start === undefined) {
      start = Date.parse(typeof row.metadata?.startedAt === 'string' ? row.metadata.startedAt : '');
      const recordedEnd = Date.parse(typeof row.metadata?.endedAt === 'string' ? row.metadata.endedAt : '');
      if (Number.isFinite(recordedEnd)) end = recordedEnd;
      evidence = 'archivované startedAt + endedAt';
      // operation_end.duration_seconds is the final PHASE, not the whole cycle.
      if (row.event_type === 'operation_completed' && !Number.isFinite(start)
        && finite(row.duration_seconds) !== null && row.duration_seconds! > 0) {
        start = end - row.duration_seconds! * 1000;
        evidence = 'zaznamenaný konec a duration_seconds';
      }
    }
    pending.delete(row.operating_room_id);
    if (!Number.isFinite(start) || end <= start! || end < range.start.getTime() || end >= range.end.getTime()) continue;
    const second = Math.floor(start! / 1000);
    const candidates = [-2, -1, 0, 1, 2].flatMap(offset => starts.get(`${row.operating_room_id}:${second + offset}`) ?? []);
    if (candidates.some(cycle => Math.abs(Date.parse(cycle.start) - start!) <= 1001
      && Math.abs(Date.parse(cycle.end) - end) <= 1001)) continue;
    const cycle = { roomId: row.operating_room_id, start: new Date(start!).toISOString(), end: new Date(end).toISOString(),
      seconds: (end - start!) / 1000, overlapSeconds: Math.max(0, end - Math.max(start!, range.start.getTime())) / 1000, evidence };
    cycles.push(cycle);
    const key = `${row.operating_room_id}:${second}`;
    starts.set(key, [...(starts.get(key) ?? []), cycle]);
  }
  return cycles;
}
function section(title: string, columns: string[], rows: Array<Array<string | number>>, description?: string): StatisticsReportSection {
  return { title, description, columns: columns.map(label => ({ label })), rows, emptyMessage: 'Ve vybraném období nejsou zaznamenána data.' };
}
const number = (value: number | null) => value === null ? '—' : Number(value.toFixed(3));
const hours = (seconds: number) => seconds > 0 && seconds / 3600 < 0.0005 ? '< 0,001' : number(seconds / 3600);
const hoursText = (seconds: number) => seconds > 0 && seconds / 3600 < 0.005 ? '< 0,01 h' : `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 }).format(seconds / 3600)} h`;
const percentText = (value: number | null) => value === null ? 'Bez rozpisu' : value > 0 && value < 0.05 ? '< 0,1 %' : `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 1 }).format(value)} %`;
const upsPercentText = (value: number | null) => value === null ? '—' : percentText(value);
const counted = (count: number, singular: string, few: string, many: string) => `${count} ${count === 1 ? singular : count >= 2 && count <= 4 ? few : many}`;
function visibleRoomName(value: string | null | undefined, id?: string | null): string | null {
  const text = value?.trim();
  return !text || text === id || /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(text) ? null : text;
}
const spreadsheetText = (value: string | number): string | number => typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;

export function buildStatisticsPeriodExport(input: {
  history: StatusHistoryRow[]; notifications: NotificationLogRow[]; rooms: OperatingRoom[]; range: StatisticsExportRange;
  hospitalId: string; hospitalName?: string; excludeShortPhases: boolean; generatedAt?: Date;
}) {
  const { history, notifications, range } = input;
  const generatedAt = input.generatedAt ?? new Date();
  const inRange = (time: string) => Date.parse(time) >= range.start.getTime() && Date.parse(time) < range.end.getTime();
  const sourceHistory = history.filter(row => inRange(row.timestamp));
  const sourceNotifications = notifications.filter(row => inRange(row.created_at));
  const supportingBefore = history.filter(row => Date.parse(row.timestamp) < range.start.getTime());
  const supportingAfter = history.filter(row => Date.parse(row.timestamp) >= range.end.getTime()
    && Date.parse(row.timestamp) <= generatedAt.getTime());
  const historicalRoomIds = new Set([...sourceHistory.map(row => row.operating_room_id), ...sourceNotifications.map(row => row.room_id).filter((id): id is string => !!id)]);
  const names = new Map(input.rooms.map(room => [room.id, visibleRoomName(room.name, room.id)]));
  const missingName = 'Archivovaný sál — název nedostupný';
  for (const row of sourceNotifications) if (row.room_id && !names.get(row.room_id) && visibleRoomName(row.room_name, row.room_id)) names.set(row.room_id, visibleRoomName(row.room_name, row.room_id));
  const name = (id: string) => names.get(id) || missingName;
  const utilization = buildStatisticsExportUtilization({ rooms: input.rooms, history, range, generatedAt });
  const notificationSummary = summarizeStatisticsExportNotifications(sourceNotifications,
    (id, historicalName) => id ? names.get(id) || visibleRoomName(historicalName, id) || missingName : visibleRoomName(historicalName) || 'Bez přiřazení sálu');
  const measured = uniqueHistory(sourceHistory).filter(row => !isSynthetic(row) && row.event_type === 'step_change');
  const activeMeasured = measured.filter(row => !isIdlePhase(row));
  const positive = activeMeasured.filter(row => finite(row.duration_seconds) !== null && row.duration_seconds! > 0);
  const qualified = positive.filter(row => !input.excludeShortPhases || row.duration_seconds! >= 60);
  const cycles = statisticsExportCycles(history, range);
  const phases = new Map<string, { count: number; seconds: number; rawCount: number; rawSeconds: number }>();
  for (const row of positive) {
    const phase = historicalPhaseName(row);
    const value = phases.get(phase) ?? { count: 0, seconds: 0, rawCount: 0, rawSeconds: 0 };
    value.rawCount += 1; value.rawSeconds += row.duration_seconds!;
    if (!input.excludeShortPhases || row.duration_seconds! >= 60) { value.count += 1; value.seconds += row.duration_seconds!; }
    phases.set(phase, value);
  }
  // Closing evidence outside the interval can prove a KPI endpoint inside it,
  // including rooms with no transition row timestamped inside the interval.
  const performanceRoomIds = new Set([...historicalRoomIds, ...history.map(row => row.operating_room_id)]);
  const performanceRooms = [...performanceRoomIds].map(id => ({ id, name: name(id) }) as OperatingRoom);
  const performance = buildMonthlyPerformance(history, performanceRooms, generatedAt, {
    anesthesiaStartEnabled: false, anesthesiaEndEnabled: false, endpointRange: { from: range.start, to: range.end },
  });
  for (const [id, metrics] of Object.entries(performance.totalsByRoom)) {
    if (PERFORMANCE_METRICS.some(kind => kind !== 'turnover' && metrics[kind].observed > 0)) historicalRoomIds.add(id);
  }
  const metricNames = { aroStart: 'ARO úvod', surgery: 'Chirurgický výkon', aroEnd: 'ARO závěr', cleanup: 'Úklid' };
  const performanceRows = PERFORMANCE_METRICS.filter(kind => kind !== 'turnover').map(kind => {
    const value = performance.totals[kind];
    return [metricNames[kind as keyof typeof metricNames], input.excludeShortPhases ? value.count : value.rawCount,
      number((input.excludeShortPhases ? value.averageMinutes : value.rawAverageMinutes) === null ? null : (input.excludeShortPhases ? value.averageMinutes! : value.rawAverageMinutes!) / 60),
      number((input.excludeShortPhases ? value.medianMinutes : value.rawMedianMinutes) === null ? null : (input.excludeShortPhases ? value.medianMinutes! : value.rawMedianMinutes!) / 60),
      number((input.excludeShortPhases ? value.p90Minutes : value.rawP90Minutes) === null ? null : (input.excludeShortPhases ? value.p90Minutes! : value.rawP90Minutes!) / 60), value.observed,
      value.quality.missingDuration, value.quality.nonPositive, value.quality.underOneMinute];
  });
  type Totals = { events: number; phases: number; phaseSeconds: number; cycles: number; cycleSeconds: number; notifications: number };
  const emptyTotals = (): Totals => ({ events: 0, phases: 0, phaseSeconds: 0, cycles: 0, cycleSeconds: 0, notifications: 0 });
  const roomTotals = new Map<string, Totals>();
  const dayTotals = new Map<string, Totals>();
  const facilityDays = range.days.map(emptyTotals);
  const boundaries = [...range.days.map(day => dayStart(day).getTime()), range.end.getTime()];
  const dayIndex = (at: number) => {
    let low = 0, high = range.days.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (at < boundaries[middle]) high = middle - 1;
      else if (at >= boundaries[middle + 1]) low = middle + 1;
      else return middle;
    }
    return -1;
  };
  const roomBucket = (id: string) => { const value = roomTotals.get(id) ?? emptyTotals(); roomTotals.set(id, value); return value; };
  const dayBucket = (id: string, index: number) => {
    const key = `${index}:${id}`;
    const value = dayTotals.get(key) ?? emptyTotals(); dayTotals.set(key, value); return value;
  };
  // Index each source once. Year exports must not rescan every row for every
  // day/room (hundreds of millions of comparisons on a busy hospital).
  for (const row of sourceHistory) {
    const index = dayIndex(Date.parse(row.timestamp));
    roomBucket(row.operating_room_id).events += 1;
    dayBucket(row.operating_room_id, index).events += 1; facilityDays[index].events += 1;
  }
  for (const row of qualified) {
    const index = dayIndex(Date.parse(row.timestamp));
    for (const value of [roomBucket(row.operating_room_id), dayBucket(row.operating_room_id, index), facilityDays[index]]) {
      value.phases += 1; value.phaseSeconds += row.duration_seconds!;
    }
  }
  for (const row of sourceNotifications) {
    const index = dayIndex(Date.parse(row.created_at));
    facilityDays[index].notifications += 1;
    if (row.room_id) { roomBucket(row.room_id).notifications += 1; dayBucket(row.room_id, index).notifications += 1; }
  }
  for (const cycle of cycles) {
    const start = Math.max(range.start.getTime(), Date.parse(cycle.start)), end = Date.parse(cycle.end);
    const index = dayIndex(end);
    roomBucket(cycle.roomId).cycles += 1; roomBucket(cycle.roomId).cycleSeconds += cycle.overlapSeconds;
    dayBucket(cycle.roomId, index).cycles += 1; facilityDays[index].cycles += 1;
    for (let day = dayIndex(start); day >= 0 && day < range.days.length && boundaries[day] < end; day += 1) {
      const seconds = Math.max(0, Math.min(end, boundaries[day + 1]) - Math.max(start, boundaries[day])) / 1000;
      dayBucket(cycle.roomId, day).cycleSeconds += seconds; facilityDays[day].cycleSeconds += seconds;
    }
  }
  const values = (value: Totals) => [value.events, value.phases, hours(value.phaseSeconds), value.cycles, hours(value.cycleSeconds), value.notifications];
  const orderedRooms = [...historicalRoomIds].sort((a, b) => name(a).localeCompare(name(b), 'cs'));
  const perRoom = orderedRooms.map(id => [name(id), ...values(roomTotals.get(id) ?? emptyTotals())]);
  const daily = range.days.flatMap((day, index) => orderedRooms.map(id => [day, name(id), ...values(dayTotals.get(`${index}:${id}`) ?? emptyTotals())]));
  const facilityDaily = range.days.map((day, index) => [day, ...values(facilityDays[index])]);
  const currentRates = new Map(input.rooms.map(room => [room.id, room.hourlyOperatingCost]));
  const financialReference = orderedRooms.map(id => {
    const phaseTotals = roomTotals.get(id) ?? emptyTotals();
    const rate = finite(currentRates.get(id));
    const currentRateCzkPerHour = rate !== null && rate >= 0 ? rate : null;
    return { roomId: id, roomName: name(id), recordedPhaseCount: phaseTotals.phases,
      recordedPhaseSeconds: phaseTotals.phaseSeconds, currentRateCzkPerHour,
      referenceCostCzk: currentRateCzkPerHour === null ? null : phaseTotals.phaseSeconds / 3600 * currentRateCzkPerHour };
  });
  const financialBasis = 'Referenční výpočet: celé kladné zaznamenané délky operačních fází ukončených v období × současná hodinová sazba sálu (Kč/h) / 3600. Klidový stav Sál připraven se nezahrnuje; jeho zdrojové záznamy zůstávají zachovány. Respektuje filtr ≥ 1 min pouze v souhrnu. Čas není oříznut podle pracovní doby ani podle hranice období; přiřazuje se podle konce fáze. Sazba je současná konfigurace poskytnutá aplikací při přípravě exportu, nikoli sazba platná v minulosti. Chybějící či neplatná sazba znamená neznámý náklad; výslovná sazba 0 je známá nula. Nejde o historické účetnictví ani tabulku Finance přepočtenou podle dnešního rozvrhu.';
  const provenance = [
    ['room_status_history', 'timestamp', sourceHistory.length, supportingBefore.length + supportingAfter.length,
      `Všechny stránky do ${generatedAt.toISOString()}; podpůrné před obdobím: ${supportingBefore.length}, po období: ${supportingAfter.length}`],
    ['notifications_log', 'created_at', sourceNotifications.length, 0, 'Všechny stránky ve zvoleném období'],
    ['Sály', 'aktuální číselník', input.rooms.length, 0, 'ID a název; žádný současný klinický stav'],
    ['operating_rooms.hourly_operating_cost', 'současná konfigurace', financialReference.length, 0, 'Pouze referenční finanční výpočet; není historická sazba'],
  ];
  const limitations = 'Rozpis a sazby jsou současná uložená konfigurace, nikoli archivovaná historická konfigurace. Vytížení je poměr doloženého času uzavřených cyklů v pracovní době a plánované kapacity, vážený kapacitou sálů. Přestávka bez přesného času se odečte poměrně. Budoucí provozní dny se do vytížení nezahrnují; probíhající den používá celý denní rozpis a pouze již doložený provoz. Sály bez rozpisu nemají procento vytížení. Otevřené cykly se neodhadují. Fáze a referenční náklady se přiřazují podle zaznamenaného konce a celé naměřené délky; Sál připraven je vyloučen. Výkonnost používá skutečný endpoint fáze; pozdější podpůrné záznamy mohou doložit jeho délku. Dokončené cykly se počítají podle konce a jejich čas se ořízne na období. Filtr krátkých fází nemění kapacitu, párování cyklů, notifikace ani surové záznamy. Notifikace jsou evidované události, nikoli potvrzení doručených e-mailů nebo naměřené délky zpoždění.';
  const scheduleNote = 'Doložený provoz / kapacita podle uloženého rozpisu. Dřívější změny rozpisu nejsou archivované; budoucí dny se nezapočítávají. Neuzavřené cykly nejsou odhadovány.';
  const context = `Časy v hodinách · provozní den 07:00–07:00 (Europe/Prague) · filtr fází ≥ 1 min ${input.excludeShortPhases ? 'zapnutý' : 'vypnutý'}.`;
  const roomUtilizationRows = utilization.rooms.map(row => [name(row.roomId), number(row.utilizationPercent), hours(row.activeSeconds),
    hours(row.capacitySeconds), (roomTotals.get(row.roomId) ?? emptyTotals()).cycles,
    (roomTotals.get(row.roomId) ?? emptyTotals()).notifications]);
  const upsRows = utilization.rooms.map(row => [name(row.roomId), row.upsBasisComplete ? hours(row.scheduledRecordedSeconds) : '—',
    row.upsSeconds === null ? '—' : hours(row.upsSeconds), number(row.upsSharePercent),
    number(row.upsUtilizationPercent), row.upsAvailableSeconds === null ? '—' : hours(row.upsAvailableSeconds)]);
  const knownUpsRooms = utilization.rooms.filter(row => row.upsBasisComplete).length;
  const upsCoverage = utilization.unknownScheduleRoomCount > 0
    ? ` ÚPS je vyčísleno pouze za sály s úplným rozpisem pro uplynulou část období; ${counted(utilization.unknownScheduleRoomCount, 'sál nelze zařadit', 'sály nelze zařadit', 'sálů nelze zařadit')}${utilization.unknownScheduleRecordedSeconds > 0 ? ` (${hoursText(utilization.unknownScheduleRecordedSeconds)} zaznamenaného času)` : ''}.` : '';
  const upsDescription = `ÚPS = doložený čas celých cyklů mimo uložený rozpis, nikoli jen chirurgická fáze. Podíl ÚPS = čas ÚPS / veškerý doložený čas cyklů. Vytížení ÚPS = čas ÚPS / uplynulý čas mimo rozpis; nejde o personální kapacitu služby. Přestávka uvnitř směny není ÚPS.${upsCoverage}`;
  const upsSection: StatisticsReportSection = { ...section('Provoz v rozpisu a ÚPS', ['Sál', 'V rozpisu (h)', 'ÚPS (h)', 'Podíl ÚPS (%)', 'Vytížení ÚPS (%)', 'Časové okno ÚPS (h)'], upsRows,
    `${upsDescription} Časy cyklů v této tabulce jsou naměřené, bez poměrného odpočtu přestávek.`), startNewPage: true };
  const trendGroups = new Map<string, { capacitySeconds: number; activeSeconds: number }>();
  const monthlyTrend = range.days.length > 35;
  for (const day of utilization.daily) {
    const key = monthlyTrend ? day.date.slice(0, 7) : day.date;
    const totals = trendGroups.get(key) ?? { capacitySeconds: 0, activeSeconds: 0 };
    totals.capacitySeconds += day.capacitySeconds; totals.activeSeconds += day.activeSeconds; trendGroups.set(key, totals);
  }
  const trendRows = [...trendGroups].map(([date, value]) => [date,
    value.capacitySeconds > 0 ? number(value.activeSeconds / value.capacitySeconds * 100) : '—',
    hours(value.activeSeconds), hours(value.capacitySeconds)]);
  const phaseSeconds = [...phases.values()].reduce((total, value) => total + value.seconds, 0);
  const phaseRows = [...phases].sort((a, b) => b[1].seconds - a[1].seconds).map(([phase, value]) => [phase, value.count,
    hours(value.seconds), value.count ? hours(value.seconds / value.count) : '—', phaseSeconds > 0 ? number(value.seconds / phaseSeconds * 100) : '—']);
  const notificationRows = notificationSummary.types.map(row => [row.label, row.count, number(row.sharePercent)]);
  const notificationRoomRows = notificationSummary.rooms.map(row => [row.roomName, row.count, row.lateSurgeon,
    row.lateAnesthesiologist, row.lateArrival, row.patientNotReady, row.emergency, row.other]);
  const qualitySection = section('Kvalita záznamů', ['Kontrola', 'Počet'], [
      ['Operační fáze bez kladné konečné délky', activeMeasured.length - positive.length],
      ['Měřené fáze pod 1 min (zachované ve zdroji)', positive.filter(row => row.duration_seconds! < 60).length],
      ['Syntetické záznamy (zdroj zachován, souhrny vyloučeny)', sourceHistory.filter(isSynthetic).length],
      ['Opakovaná ID historie (zdroj zachován)', sourceHistory.length - uniqueHistory(sourceHistory).length],
      ['Klidové fáze Sál připraven (zdroj zachován, souhrny vyloučeny)', measured.length - activeMeasured.length],
    ]);
  const referenceSection = section('Náklady zaznamenaných fází podle současné sazby (referenční výpočet)',
    ['Sál', 'Fáze', 'Naměřeno (h)', 'Sazba (Kč/h)', 'Referenční náklad (Kč)'],
    financialReference.map(row => [row.roomName, row.recordedPhaseCount, hours(row.recordedPhaseSeconds), number(row.currentRateCzkPerHour), number(row.referenceCostCzk)]),
    'Podle současné sazby, nikoli sazba platná v minulosti. Naměřený čas není oříznut podle pracovní doby. Nejde o historické účetnictví.');
  const roomUtilizationSection: StatisticsReportSection = {
    ...section('Vytížení operačních sálů podle rozpisu', [], [], scheduleNote), chart: { kind: 'bars', unit: '%', maxValue: 100,
      points: utilization.rooms.map(row => ({ label: name(row.roomId), value: row.utilizationPercent, color: '#0891b2',
        detail: `${row.capacitySeconds > 0 ? `${hoursText(row.activeSeconds)} / ${hoursText(row.capacitySeconds)}`
          : `Bez plánované kapacity · zaznamenáno ${hoursText(row.recordedSeconds)}`} · ${counted((roomTotals.get(row.roomId) ?? emptyTotals()).cycles, 'cyklus', 'cykly', 'cyklů')} · ${(roomTotals.get(row.roomId) ?? emptyTotals()).notifications} upozornění` })) },
  };
  const notificationSection: StatisticsReportSection = {
    ...section('Notifikace a provozní upozornění', [], [], 'Včetně pozdních příchodů a událostí zaznamenaných bez e-mailového příjemce. Počet událostí, nikoli délka zpoždění.'),
    chart: { kind: 'bars', unit: '', points: notificationSummary.types.map(row => ({ label: row.label, value: row.count, color: row.color,
      detail: `${percentText(row.sharePercent)} všech upozornění` })) },
  };
  const sections: StatisticsReportSection[] = [
    roomUtilizationSection,
    upsSection,
    { ...section('Vývoj vytížení', [], [], monthlyTrend ? 'Měsíční souhrny vážené plánovanou kapacitou.' : 'Denní vytížení podle plánované kapacity.'),
      chart: { kind: 'line', unit: '%', maxValue: 100, points: [...trendGroups].map(([date, value]) => ({
        label: monthlyTrend ? date : `${date.slice(8, 10)}.${date.slice(5, 7)}.`, value: value.capacitySeconds > 0 ? value.activeSeconds / value.capacitySeconds * 100 : null,
      })) } },
    section('Fáze', ['Fáze cyklu', 'Počet', 'Celkem (h)', 'Průměr (h)', 'Podíl (%)'], phaseRows,
      'Podíl na naměřených operačních fázích; bez stavu Sál připraven.'),
    section('Výkonnost z historických fází', ['Metrika', 'Počet', 'Průměr (h)', 'Medián (h)', 'P90 (h)'],
      performanceRows.map(row => row.slice(0, 5))),
    notificationSection,
    section('Upozornění podle sálu', ['Sál', 'Celkem', 'Operatér pozdě', 'ARO pozdě', 'Příjezd pozdě', 'Pacient nepřipraven', 'Nouze', 'Ostatní'], notificationRoomRows),
    ...(financialReference.some(row => row.recordedPhaseCount > 0) ? [referenceSection] : []),
  ];
  // The paper overview compares actual room values and measured composition;
  // exact tables and all source evidence remain in the existing detail export.
  // Keep shared chart identities so print can avoid repeating these two charts.
  const phasePalette = ['#0891b2', '#2563eb', '#0d9488', '#d97706', '#6366f1', '#64748b'];
  const knownScheduleRooms = utilization.rooms.filter(row => row.upsBasisComplete);
  const knownScheduledSeconds = knownScheduleRooms.reduce((total, row) => total + row.scheduledRecordedSeconds, 0);
  const knownUpsSeconds = knownScheduleRooms.reduce((total, row) => total + (row.upsSeconds ?? 0), 0);
  const dashboard: StatisticsReportSection[] = [
    roomUtilizationSection,
    { ...section('Zastoupení operačních fází', [], [],
      `Podíl z ${hoursText(phaseSeconds)} naměřených fází; bez klidového stavu Sál připraven. Respektuje filtr krátkých fází.`),
      chart: { kind: 'donut', unit: 'h', points: [...phases].filter(([, value]) => value.seconds > 0)
        .sort((a, b) => b[1].seconds - a[1].seconds).map(([phase, value], index) => ({
          label: phase, value: value.seconds / 3600, color: phasePalette[index % phasePalette.length],
          detail: counted(value.count, 'měření', 'měření', 'měření'),
        })) } },
    { ...section('Dokončené cykly podle sálu', [], [],
      'Počet dokončených cyklů podle konce ve vybraném období. Zahrnuty jsou i sály bez dokončeného cyklu.'),
      chart: { kind: 'columns', unit: '', points: utilization.rooms.map(row => ({
        label: name(row.roomId), value: (roomTotals.get(row.roomId) ?? emptyTotals()).cycles, color: '#0891b2',
      })) } },
    { ...section('Provoz v rozpisu a ÚPS — podíl času', [], [], knownScheduleRooms.length
      ? `Naměřený čas uzavřených cyklů, bez poměrného odpočtu přestávek.${utilization.unknownScheduleRoomCount > 0
        ? ` Jen sály s úplným rozpisem; ${hoursText(utilization.unknownScheduleRecordedSeconds)} bez doloženého rozpisu se nezahrnuje.` : ''}`
      : 'Rozpis není doložen; čas nelze bezpečně rozdělit na provoz v rozpisu a ÚPS.'),
      chart: { kind: 'donut', unit: 'h', points: knownScheduleRooms.length ? [
        { label: 'V rozpisu', value: knownScheduledSeconds / 3600, color: '#0891b2' },
        { label: 'ÚPS', value: knownUpsSeconds / 3600, color: '#d97706' },
      ] : [] } },
    notificationSection,
  ];
  const report: StatisticsReport = { presentation: 'compact', layout: 'dashboard', dashboard, context, metrics: [
    { label: 'Vytížení dle rozpisu', value: percentText(utilization.utilizationPercent), detail: 'Vážené kapacitou sálů' },
    { label: 'Provoz / plán (h)', value: `${hoursText(utilization.totalActiveSeconds).replace(/ h$/, '')} / ${hoursText(utilization.totalCapacitySeconds).replace(/ h$/, '')}`,
      detail: counted(utilization.measuredDays.length, 'provozní den', 'provozní dny', 'provozních dnů') },
    { label: 'Provoz cyklů v ÚPS', value: knownUpsRooms ? hoursText(utilization.totalUpsSeconds) : '—',
      detail: `Podíl: ${upsPercentText(utilization.upsSharePercent)}${utilization.unknownScheduleRoomCount > 0 ? ' · jen doložené rozpisy' : ''}` },
    { label: 'Vytížení času ÚPS', value: upsPercentText(utilization.upsUtilizationPercent),
      detail: knownUpsRooms ? `Z ${hoursText(utilization.totalUpsAvailableSeconds)} mimo rozpis${utilization.unknownScheduleRoomCount > 0 ? ' · jen doložené rozpisy' : ''}` : 'Rozpis není doložen' },
    { label: 'Dokončené cykly', value: cycles.length }, { label: 'Provozní upozornění', value: sourceNotifications.length },
  ], sections };
  const safeHistory = sourceHistory.map(sanitizeStatisticsHistory);
  const safeNotifications = sourceNotifications.map(sanitizeStatisticsNotification);
  const detailedSections = [
    section('Vytížení operačních sálů podle rozpisu', ['Sál', 'Vytížení (%)', 'Provoz dle rozpisu (h)', 'Kapacita (h)', 'Dokončené cykly', 'Upozornění'], roomUtilizationRows, scheduleNote),
    upsSection,
    section('ÚPS v provozních dnech', ['Provozní den', 'V rozpisu (h)', 'ÚPS (h)', 'Podíl ÚPS (%)', 'Vytížení ÚPS (%)', 'Časové okno ÚPS (h)'],
      utilization.daily.map(day => [day.date, hours(day.scheduledRecordedSeconds), day.upsSeconds === null ? '—' : hours(day.upsSeconds),
        number(day.upsSharePercent), number(day.upsUtilizationPercent), day.upsAvailableSeconds === null ? '—' : hours(day.upsAvailableSeconds)]), upsDescription),
    section('Vývoj vytížení', ['Období', 'Vytížení (%)', 'Provoz dle rozpisu (h)', 'Kapacita (h)'], trendRows),
    section('Sály za období', ['Sál', 'Události', 'Měřené fáze', 'Hodiny fází', 'Dokončené cykly', 'Hodiny cyklů v období', 'Notifikace'], perRoom),
    section('Provozní dny zařízení', ['Provozní den', 'Události', 'Měřené fáze', 'Hodiny fází', 'Dokončené cykly', 'Hodiny cyklů', 'Notifikace'], facilityDaily),
    section('Provozní dny a sály', ['Provozní den', 'Sál', 'Události', 'Měřené fáze', 'Hodiny fází', 'Dokončené cykly', 'Hodiny cyklů', 'Notifikace'], daily),
    section('Fáze', ['Historický název', 'Počet po filtru', 'Hodiny po filtru', 'Průměr (h)', 'Surový počet', 'Surové hodiny'],
      [...phases].map(([phase, value]) => [phase, value.count, hours(value.seconds), value.count ? hours(value.seconds / value.count) : '—', value.rawCount, hours(value.rawSeconds)])),
    section('Dokončené cykly', ['Sál', 'Začátek UTC', 'Konec UTC', 'Celá délka (h)', 'Překryv období (h)'],
      cycles.map(cycle => [name(cycle.roomId), cycle.start, cycle.end, hours(cycle.seconds), hours(cycle.overlapSeconds)])),
    section('Výkonnost z historických fází', ['Metrika', 'Počet', 'Průměr (h)', 'Medián (h)', 'P90 (h)', 'Pozorováno', 'Chybějící', 'Neplatná délka', 'Pod 1 min'], performanceRows),
    section('Notifikace podle typu', ['Upozornění', 'Počet', 'Podíl (%)'], notificationRows),
    section('Upozornění podle sálu', ['Sál', 'Celkem', 'Operatér pozdě', 'ARO pozdě', 'Příjezd pozdě', 'Pacient nepřipraven', 'Nouze', 'Ostatní'], notificationRoomRows),
    referenceSection, qualitySection,
  ];
  const csvReport: StatisticsReport = { ...report, sections: [...detailedSections,
    section('Zdrojové řádky room_status_history', ['ID záznamu', 'Sál', 'Typ', 'Index', 'Historický název', 'Délka (h)', 'Čas UTC', 'Zapsáno UTC', 'Bezpečná metadata'],
      safeHistory.map(row => [row.id || '', row.operating_room_id ? name(row.operating_room_id) : 'Bez přiřazení sálu', row.event_type || '', row.step_index ?? '', row.step_name || '', row.duration_seconds === null ? '' : hours(row.duration_seconds), row.timestamp || '', row.created_at || '', JSON.stringify(row.metadata)])),
    section('Zdrojové řádky notifications_log', ['ID záznamu', 'Typ', 'Sál', 'Počet příjemců', 'Čas UTC'],
      safeNotifications.map(row => [row.id || '', statisticsExportNotificationLabel(row.notification_type || ''), row.room_id ? name(row.room_id) : visibleRoomName(row.room_name) || 'Bez přiřazení sálu', row.recipient_count ?? '', row.created_at || ''])),
  ].map(value => ({ ...value, rows: value.rows.map(row => row.map(spreadsheetText)) })) };
  const metadata: StatisticsReportMetadata = {
    tabLabel: 'Historické statistiky za období', periodLabel: `${range.from} – ${range.to} včetně · Europe/Prague · 07:00–07:00`,
    hospitalName: input.hospitalName, generatedAt, filename: `statistiky-${range.from}-${range.to}`,
  };
  const json = {
    version: 3, hospitalId: input.hospitalId, hospitalName: input.hospitalName, generatedAt: generatedAt.toISOString(),
    units: { displayedDurations: 'hours', sourceDurations: 'seconds', utilization: 'percent' },
    range: { from: range.from, to: range.to, start: range.start.toISOString(), endExclusive: range.end.toISOString(), timezone: STATISTICS_EXPORT_TIMEZONE, operationalDayStartsAt: '07:00', inclusiveDates: true },
    filter: { excludeShortPhasesInSummaries: input.excludeShortPhases, idlePhasesExcludedFromSummaries: true, rawRecordsFiltered: false },
    provenance, limitations, summaries: report, performance, completedCycles: cycles,
    utilization, notifications: notificationSummary,
    phaseSummaries: [...phases].map(([phase, value]) => ({ phase, ...value })),
    daily: { facility: range.days.map((date, index) => ({ date, ...facilityDays[index] })),
      rooms: range.days.flatMap((date, index) => orderedRooms.map(roomId => ({ date, roomId, roomName: name(roomId), ...(dayTotals.get(`${index}:${roomId}`) ?? emptyTotals()) }))) },
    quality: qualitySection.rows,
    financialReference: { basis: financialBasis, currency: 'CZK', historicalRates: false,
      rateConfigurationObservedAt: generatedAt.toISOString(), rooms: financialReference },
    sourceRows: { room_status_history: safeHistory, notifications_log: safeNotifications },
    supportingRows: { beforeRange: { room_status_history: supportingBefore.map(sanitizeStatisticsHistory) },
      afterRange: { room_status_history: supportingAfter.map(sanitizeStatisticsHistory) } },
    omittedFields: ['arbitrary metadata', 'notification custom_reason', 'legacy completion labels', 'personnel/patient identities', 'current room state', 'credentials'],
  };
  return { report, csvReport, metadata, json, sourceHistoryCount: sourceHistory.length, sourceNotificationCount: sourceNotifications.length };
}
