import { OPERATINGROOM_REPORT_LOGO } from './statistics-print';
import { getCzechPublicHoliday } from './czech-public-holidays';
import type { RoomScheduleDayPart } from './room-specialty';

/**
 * Tisková podoba Společného rozpisu sálů (A4 na šířku, světlé barvy).
 *
 * Dokument vzniká jen z dat, která má rozpis načtená. Dny mimo načtený rok
 * se označí jako nenačtené, nikdy se nevydávají za volné bloky. Všechny texty
 * se escapují a barvy přijímají jen hexadecimální zápis, ne libovolné CSS.
 */

export type RoomSchedulePrintView = 'week' | 'month' | 'year';
export type RoomSchedulePrintScope = 'all' | 'selected';

export interface RoomSchedulePrintSlot {
  /** Zkratka do úzké buňky (zkratka oboru nebo provozního stavu). */
  code: string;
  /** Úplný název do legendy a širokých buněk. */
  name: string;
  color: string;
}

export interface RoomSchedulePrintSource {
  hospitalName: string;
  view: RoomSchedulePrintView;
  scope: RoomSchedulePrintScope;
  anchor: Date;
  /** Rok, jehož rozpis je v aplikaci načtený. */
  loadedYear: number;
  rooms: Array<{ id: string; name: string; department?: string | null }>;
  selectedRoomId: string;
  slot: (roomId: string, date: string, part: RoomScheduleDayPart) => RoomSchedulePrintSlot | null;
  generatedAt: Date;
}

/** Zkratky provozních stavů pro úzké buňky; legenda je vypisuje celé. */
export const ROOM_SCHEDULE_PRINT_SYSTEM_CODES = { CLOSED: 'UZAV', SERVICE: 'SERV' } as const;

const WEEKDAYS = ['PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO', 'NE'];
const PARTS: RoomScheduleDayPart[] = ['AM', 'PM'];
const PART_LABEL: Record<RoomScheduleDayPart, string> = { AM: 'DOP', PM: 'ODP' };
const DATE_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
const MONTH_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' });
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { month: 'long' });
const GENERATED_FORMATTER = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const FALLBACK_COLOR = '#94A3B8';

interface PrintDay {
  key: string;
  date: Date;
  weekday: string;
  weekend: boolean;
  holiday: string | null;
  loaded: boolean;
}

interface PrintSummary {
  used: Map<string, { slot: RoomSchedulePrintSlot; count: number }>;
  assigned: number;
  total: number;
  unloaded: number;
  holidays: boolean;
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

/** Šestimístný hex nebo náhradní barva; do stylu se nikdy nedostane jiný zápis. */
function printColor(value: string): string {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) return FALLBACK_COLOR;
  const hex = match[1].length === 3 ? [...match[1]].map(character => character.repeat(2)).join('') : match[1];
  return `#${hex.toUpperCase()}`;
}

/** Barva smíchaná s bílým papírem, aby kód zůstal čitelný i na černobílé tiskárně. */
function tint(color: string, strength: number): string {
  const hex = printColor(color).slice(1);
  const channel = (index: number) => Math.round(parseInt(hex.slice(index, index + 2), 16) * strength + 255 * (1 - strength));
  return `#${[0, 2, 4].map(index => channel(index).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function localDate(year: number, month: number, day: number) {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  return addDays(localDate(date.getFullYear(), date.getMonth(), date.getDate()), day === 0 ? -6 : 1 - day);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function printDay(date: Date, loadedYear: number): PrintDay {
  const index = (date.getDay() + 6) % 7;
  return {
    key: dateKey(date),
    date,
    weekday: WEEKDAYS[index],
    weekend: index > 4,
    holiday: getCzechPublicHoliday(date)?.name ?? null,
    loaded: date.getFullYear() === loadedYear,
  };
}

function monthDays(year: number, month: number, loadedYear: number) {
  return Array.from({ length: daysInMonth(year, month) }, (_, index) => printDay(localDate(year, month, index + 1), loadedYear));
}

function dayClass(day: PrintDay) {
  return [day.weekend ? 'weekend' : '', day.holiday ? 'holiday' : ''].filter(Boolean).join(' ');
}

function classAttribute(value: string) {
  return value ? ` class="${value}"` : '';
}

/** Vytvoří samostatný tiskový dokument pro zvolené období a sály. */
export function buildRoomSchedulePrintHtml(source: RoomSchedulePrintSource): string {
  const text = escapeHtml;
  const selectedRoom = source.rooms.find(room => room.id === source.selectedRoomId) ?? source.rooms[0];
  if (!selectedRoom) throw new Error('Rozpis nemá žádný operační sál k tisku.');
  const rooms = source.scope === 'all' ? source.rooms : [selectedRoom];
  const year = source.anchor.getFullYear();
  const month = source.anchor.getMonth();

  const summary: PrintSummary = { used: new Map(), assigned: 0, total: 0, unloaded: 0, holidays: false };
  const read = (roomId: string, day: PrintDay, part: RoomScheduleDayPart) => {
    if (day.holiday) summary.holidays = true;
    if (!day.loaded) {
      summary.unloaded += 1;
      return { loaded: false as const, slot: null };
    }
    summary.total += 1;
    const slot = source.slot(roomId, day.key, part);
    if (slot) {
      summary.assigned += 1;
      const normalized = { code: String(slot.code || slot.name || '?'), name: String(slot.name || slot.code || ''), color: printColor(slot.color) };
      const key = `${normalized.code}|${normalized.name}|${normalized.color}`;
      const entry = summary.used.get(key);
      if (entry) entry.count += 1;
      else summary.used.set(key, { slot: normalized, count: 1 });
      return { loaded: true as const, slot: normalized };
    }
    return { loaded: true as const, slot: null };
  };

  const detailSlot = (value: ReturnType<typeof read>, partLabel: string, full = false) => {
    const label = `<span class="part">${partLabel}</span>`;
    const span = full ? ' slot--full' : '';
    if (!value.loaded) return `<div class="slot slot--na${span}">${label}<small>nenačteno</small></div>`;
    if (!value.slot) return `<div class="slot slot--empty">${label}</div>`;
    const { code, name, color } = value.slot;
    return `<div class="slot${span}" style="background:${tint(color, .3)};border-left-color:${color}">${label}<b>${text(code)}</b>${name && name !== code ? `<small>${text(name)}</small>` : ''}</div>`;
  };
  /** Stejné přiřazení dopoledne i odpoledne se tiskne jako jeden celodenní blok. */
  const detailDay = (roomId: string, day: PrintDay) => {
    const [am, pm] = PARTS.map(part => read(roomId, day, part));
    const same = (!am.loaded && !pm.loaded)
      || (am.slot && pm.slot && am.slot.code === pm.slot.code && am.slot.name === pm.slot.name && am.slot.color === pm.slot.color);
    return `<div class="pair">${same ? detailSlot(am, am.loaded ? 'CELÝ DEN' : '', true) : `${detailSlot(am, PART_LABEL.AM)}${detailSlot(pm, PART_LABEL.PM)}`}</div>`;
  };

  const miniSlot = (roomId: string, day: PrintDay, part: RoomScheduleDayPart) => {
    const value = read(roomId, day, part);
    if (!value.loaded) return '<span class="mini mini--na"></span>';
    if (!value.slot) return '<span class="mini mini--empty"></span>';
    return `<span class="mini" style="background:${tint(value.slot.color, .38)}" title="${text(value.slot.name)}">${text(value.slot.code)}</span>`;
  };

  const roomHeading = (room: { name: string; department?: string | null }) =>
    `<th scope="row" class="room"><b>${text(room.name)}</b>${room.department ? `<small>${text(room.department)}</small>` : ''}</th>`;

  const sections: string[] = [];
  let periodLabel: string;
  let viewLabel: string;

  if (source.view === 'week') {
    const days = Array.from({ length: 7 }, (_, index) => printDay(addDays(startOfWeek(source.anchor), index), source.loadedYear));
    periodLabel = `${DATE_FORMATTER.format(days[0].date)} – ${DATE_FORMATTER.format(days[6].date)}`;
    viewLabel = 'Týden';
    const head = days.map(day => `<th scope="col"${classAttribute(dayClass(day))}><span>${day.weekday}</span><strong>${day.date.getDate()}. ${day.date.getMonth() + 1}.</strong>${day.holiday ? `<em>${text(day.holiday)}</em>` : ''}</th>`).join('');
    const body = rooms.map(room => `<tr>${roomHeading(room)}${days.map(day => `<td${classAttribute(dayClass(day))}>${detailDay(room.id, day)}</td>`).join('')}</tr>`).join('');
    sections.push(`<section class="sheet"><h2 class="section-title"><span>01</span>Týdenní rozpis · ${text(periodLabel)}</h2><table class="week"><colgroup><col class="room-col">${days.map(day => `<col${classAttribute(day.weekend ? 'weekend-col' : '')}>`).join('')}</colgroup><thead><tr><th scope="col" class="corner">Operační sál</th>${head}</tr></thead><tbody>${body}</tbody></table></section>`);
  } else if (source.view === 'month') {
    const days = monthDays(year, month, source.loadedYear);
    periodLabel = MONTH_FORMATTER.format(localDate(year, month, 1));
    viewLabel = 'Měsíc';
    if (source.scope === 'all') {
      const head = days.map(day => `<th scope="col"${classAttribute(dayClass(day))} title="${text(day.holiday || '')}"><span>${day.weekday}</span><strong>${day.date.getDate()}</strong></th>`).join('');
      const body = rooms.map(room => `<tr>${roomHeading(room)}${days.map(day => `<td${classAttribute(dayClass(day))}>${PARTS.map(part => miniSlot(room.id, day, part)).join('')}</td>`).join('')}</tr>`).join('');
      sections.push(`<section class="sheet"><h2 class="section-title"><span>01</span>Měsíční přehled všech sálů · ${text(periodLabel)}</h2><p class="hint">Každý den: horní pole dopoledne (DOP), dolní odpoledne (ODP).</p><table class="matrix matrix--month"><colgroup><col class="room-col">${days.map(() => '<col>').join('')}</colgroup><thead><tr><th scope="col" class="corner">Operační sál</th>${head}</tr></thead><tbody>${body}</tbody></table></section>`);
    } else {
      const offset = (localDate(year, month, 1).getDay() + 6) % 7;
      const cells: Array<PrintDay | null> = [...Array.from({ length: offset }, () => null), ...days];
      while (cells.length % 7) cells.push(null);
      const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
      const body = weeks.map(week => `<tr>${week.map(day => day
        ? `<td${classAttribute(dayClass(day))}><div class="cal-head"><strong>${day.date.getDate()}.</strong>${day.holiday ? `<em>${text(day.holiday)}</em>` : ''}</div>${detailDay(selectedRoom.id, day)}</td>`
        : '<td class="void"></td>').join('')}</tr>`).join('');
      sections.push(`<section class="sheet"><h2 class="section-title"><span>01</span>${text(selectedRoom.name)} · ${text(periodLabel)}</h2><table class="calendar"><thead><tr>${WEEKDAYS.map((day, index) => `<th scope="col"${classAttribute(index > 4 ? 'weekend' : '')}>${day}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></section>`);
    }
  } else {
    periodLabel = String(year);
    viewLabel = 'Rok';
    const months = Array.from({ length: 12 }, (_, index) => monthDays(year, index, source.loadedYear));
    const head = Array.from({ length: 31 }, (_, index) => `<th scope="col"><strong>${index + 1}</strong></th>`).join('');
    rooms.forEach((room, roomIndex) => {
      const body = months.map((days, index) => `<tr><th scope="row" class="room"><b>${text(MONTH_NAME_FORMATTER.format(localDate(year, index, 1)))}</b></th>${Array.from({ length: 31 }, (_, dayIndex) => {
        const day = days[dayIndex];
        return day ? `<td${classAttribute(dayClass(day))} title="${text(`${day.weekday} ${day.date.getDate()}. ${index + 1}.${day.holiday ? ` · ${day.holiday}` : ''}`)}">${PARTS.map(part => miniSlot(room.id, day, part)).join('')}</td>` : '<td class="void"></td>';
      }).join('')}</tr>`).join('');
      const number = String(roomIndex + 1).padStart(2, '0');
      sections.push(`<section class="sheet${roomIndex > 0 ? ' page-break' : ''}"><h2 class="section-title"><span>${number}</span>${text(room.name)}${room.department ? ` · ${text(room.department)}` : ''} · rok ${year}</h2><p class="hint">Každý den: horní pole dopoledne (DOP), dolní odpoledne (ODP). Šedě jsou soboty a neděle, žlutě svátky.</p><table class="matrix matrix--year"><colgroup><col class="month-col">${Array.from({ length: 31 }, () => '<col>').join('')}</colgroup><thead><tr><th scope="col" class="corner">Měsíc</th>${head}</tr></thead><tbody>${body}</tbody></table></section>`);
    });
  }

  const scopeLabel = source.scope === 'all' ? `Všechny sály (${rooms.length})` : selectedRoom.name;
  const coverage = summary.total > 0 ? `${Math.round((summary.assigned / summary.total) * 100)} %` : '—';
  const generated = GENERATED_FORMATTER.format(source.generatedAt);
  const used = Array.from(summary.used.values()).sort((a, b) => b.count - a.count || a.slot.name.localeCompare(b.slot.name, 'cs'));
  const legendItems = [
    ...used.map(({ slot, count }) => `<li><span class="key" style="background:${tint(slot.color, .38)};border-left-color:${slot.color}">${text(slot.code)}</span><span>${text(slot.name)}</span><b>${count}×</b></li>`),
    '<li><span class="key key--empty"></span><span>Bez přiřazení</span></li>',
    summary.holidays ? '<li><span class="key key--holiday"></span><span>Svátek · den pracovního klidu</span></li>' : '',
    summary.unloaded ? `<li><span class="key key--na"></span><span>Mimo načtený rok ${source.loadedYear}: rozpis těchto dnů zobrazíte přepnutím na jejich rok</span></li>` : '',
  ].filter(Boolean).join('');
  const legend = `<section class="legend" aria-label="Legenda"><h2>Legenda</h2>${used.length ? '' : '<p class="legend-empty">V tištěném období není přiřazen žádný blok.</p>'}<ul>${legendItems}</ul><p>DOP = dopoledne, ODP = odpoledne, CELÝ DEN = stejné přiřazení dopoledne i odpoledne. Číslo u oboru je počet půldenních bloků v tištěném období.</p></section>`;

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>${text(`Rozpis sálů – ${periodLabel}`)}</title>
<style>
  @page { size: A4 landscape; margin: 9mm 9mm 11mm; @bottom-left { content: "Operatingroom Management System · Rozpis sálů"; font: 8px Arial, Helvetica, sans-serif; color: #64748b; } @bottom-right { content: "Strana " counter(page) " / " counter(pages); font: 8px Arial, Helvetica, sans-serif; color: #64748b; } }
  * { box-sizing: border-box; }
  html { color-scheme: light; background: #eef2f6; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #17233f; background: #eef2f6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-toolbar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 12px 24px; background: #17233f; color: #fff; font-size: 13px; }
  .print-toolbar p { margin: 0; }
  .print-toolbar small { display: block; margin-top: 3px; color: #cbd5e1; font-size: 12px; }
  .print-actions { display: flex; gap: 8px; }
  .print-actions button { min-height: 44px; padding: 0 18px; border: 1px solid #64748b; border-radius: 8px; background: transparent; color: #fff; font: 600 13px Arial, Helvetica, sans-serif; cursor: pointer; }
  .print-actions button.primary { border-color: #0f766e; background: #0f766e; }
  .print-actions button:focus-visible { outline: 2px solid #5eead4; outline-offset: 2px; }
  main { background: #fff; }
  .report-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; border-top: 4px solid #149b91; padding: 8px 0; border-bottom: 1px solid #dce3eb; margin-bottom: 8px; }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .report-logo { width: 40px; height: 36px; object-fit: contain; flex: none; }
  .eyebrow { margin: 0 0 4px; font-size: 9px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase; color: #14796f; }
  h1 { margin: 0; font-size: 22px; line-height: 1.15; letter-spacing: -.4px; }
  h1 span { color: #64748b; font-weight: 400; }
  .report-meta { display: grid; grid-template-columns: auto auto; gap: 2px 12px; margin: 0; font-size: 9.5px; color: #64748b; flex: none; }
  .report-meta dt { margin: 0; }
  .report-meta dd { margin: 0; color: #17233f; font-weight: 700; }
  .section-title { margin: 0 0 6px; font-size: 10px; letter-spacing: .7px; text-transform: uppercase; }
  .section-title span { color: #149b91; margin-right: 6px; }
  .hint { margin: -2px 0 6px; font-size: 9px; color: #64748b; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 1px solid #dce3eb; padding: 0; vertical-align: top; }
  thead th { padding: 4px 2px; background: #f8fafc; color: #475569; font-size: 9px; font-weight: 400; text-align: center; }
  thead th span, thead th strong, thead th em { display: block; }
  thead th strong { margin-top: 2px; color: #17233f; font-size: 11px; }
  thead th em { margin-top: 2px; font-style: normal; font-size: 8px; line-height: 1.15; color: #854d0e; }
  th.weekend, td.weekend { background: #f1f5f9; }
  th.holiday { background: #fef3c7; }
  td.holiday { background: #fffbeb; }
  td.void { background: #e9eef4; }
  .corner { padding-left: 8px; text-align: left; font-size: 8.5px; letter-spacing: .6px; text-transform: uppercase; vertical-align: bottom; }
  .room { padding: 5px 7px; background: #f8fafc; text-align: left; vertical-align: middle; }
  .room b { display: block; font-size: 10.5px; line-height: 1.2; overflow-wrap: anywhere; }
  .room small { display: block; margin-top: 2px; color: #64748b; font-size: 8.5px; letter-spacing: .3px; text-transform: uppercase; overflow-wrap: anywhere; }
  .room-col { width: 38mm; }
  .month-col { width: 21mm; }
  .week .weekend-col { width: 22mm; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; min-height: 34px; padding: 2px; }
  .slot { position: relative; min-width: 0; padding: 10px 3px 3px 4px; border-left: 3px solid transparent; background: #fff; }
  .slot--full { grid-column: 1 / -1; }
  .slot .part { position: absolute; top: 2px; right: 3px; color: #64748b; font-size: 7.5px; font-weight: 700; letter-spacing: .4px; }
  .slot b { display: block; font-size: 10px; line-height: 1.1; letter-spacing: .3px; overflow-wrap: anywhere; }
  .slot small { display: block; margin-top: 2px; color: #334155; font-size: 8px; line-height: 1.15; overflow-wrap: anywhere; }
  .slot--empty { border-left-color: #e2e8f0; background: transparent; }
  .slot--na, .mini--na, .key--na { background: repeating-linear-gradient(135deg, #f1f5f9 0 4px, #dfe5ec 4px 5px); }
  .slot--na { border-left-color: #cbd5e1; }
  .slot--na small { color: #475569; }
  .matrix thead th { padding: 3px 0; font-size: 8px; }
  .matrix thead th strong { font-size: 9.5px; }
  .matrix td { padding: 1px; }
  .matrix .room { padding: 3px 5px; }
  .matrix .room b { font-size: 9.5px; }
  .matrix--month .room-col { width: 34mm; }
  .mini { display: flex; align-items: center; justify-content: center; height: 13px; overflow: hidden; color: #17233f; font-size: 8.5px; font-weight: 700; letter-spacing: -.2px; line-height: 1; white-space: nowrap; }
  .mini + .mini { margin-top: 1px; }
  .mini--empty { background: transparent; }
  .matrix--year .mini { height: 15px; }
  .calendar thead th { font-size: 9px; font-weight: 700; letter-spacing: .8px; }
  .calendar td { padding: 2px; }
  .cal-head { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; padding: 1px 2px; font-size: 10px; }
  .cal-head em { font-style: normal; font-size: 7.5px; line-height: 1.1; color: #854d0e; text-align: right; }
  .calendar .pair { min-height: 40px; }
  .legend { margin-top: 8px; padding: 6px 10px; border: 1px solid #dce3eb; background: #f8fafc; break-inside: avoid; page-break-inside: avoid; }
  .legend h2 { margin: 0 0 6px; font-size: 9px; letter-spacing: .7px; text-transform: uppercase; }
  .legend ul { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 0; padding: 0; list-style: none; }
  .legend li { display: flex; align-items: center; gap: 6px; color: #334155; font-size: 9.5px; }
  .legend li b { color: #17233f; }
  .key { display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 15px; padding: 0 4px; border-left: 3px solid transparent; color: #17233f; font-size: 8.5px; font-weight: 700; }
  .key--empty { border: 1px solid #dce3eb; background: #fff; }
  .key--holiday { background: #fef3c7; border-left-color: #eab308; }
  .legend p { margin: 6px 0 0; color: #64748b; font-size: 8.5px; }
  .legend .legend-empty { margin: 0 0 6px; color: #17233f; font-size: 9.5px; font-weight: 700; }
  .page-break { break-before: page; page-break-before: always; }
  @media screen { main { max-width: 1180px; margin: 24px auto; padding: 24px 32px 28px; box-shadow: 0 8px 28px #17233f14; } }
  @media screen and (max-width: 700px) { main { margin: 0; padding: 16px; overflow-x: auto; } .report-heading { flex-wrap: wrap; } }
  @media print { html, body { background: #fff; } .print-toolbar { display: none !important; } main { margin: 0; padding: 0; box-shadow: none; } }
</style>
</head>
<body>
<div class="print-toolbar"><p><strong>Náhled tisku – Rozpis sálů</strong><small>A4 na šířku · pro PDF zvolte v dialogu tisku „Uložit jako PDF“</small></p><div class="print-actions"><button type="button" data-print-action="close">Zavřít</button><button type="button" class="primary" data-print-action="print">Tisk / Uložit PDF</button></div></div>
<main aria-label="Rozpis sálů">
  <header class="report-heading">
    <div class="brand"><img class="report-logo" src="${OPERATINGROOM_REPORT_LOGO}" alt="" width="40" height="36"><div><p class="eyebrow">${text(source.hospitalName)}</p><h1>Rozpis sálů <span>${text(viewLabel)} · ${text(periodLabel)}</span></h1></div></div>
    <dl class="report-meta"><dt>Sály</dt><dd>${text(scopeLabel)}</dd><dt>Přiřazeno</dt><dd>${summary.assigned} z ${summary.total} půldenních bloků (${coverage})</dd><dt>Vytištěno</dt><dd>${text(generated)}</dd></dl>
  </header>
  ${sections.join('\n  ')}
  ${legend}
</main>
</body>
</html>`;
}
