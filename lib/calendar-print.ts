import { OPERATINGROOM_REPORT_LOGO } from './statistics-print';

interface CalendarPrintCell {
  label: string;
  color: string;
  textColor?: string;
  colspan?: number;
  fontSize?: 'xs' | 'sm' | 'base' | 'lg';
}

export interface CalendarPrintInput {
  monthName: string;
  year: number;
  days: Array<{
    day: number;
    weekday: string;
    weekend: boolean;
    holiday: boolean;
    special?: { label: string; color: string };
  }>;
  rows: Array<{ name: string; color: string; cells: Array<CalendarPrintCell | undefined> }>;
  quickValues: Array<{ label: string; color: string; desc: string }>;
  generatedAt: Date;
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

/** Print CSS accepts configured hexadecimal colors, never arbitrary CSS. */
function printColor(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value) ? value : fallback;
}

/** Pick the higher-contrast automatic heading ink, compositing alpha on paper. */
function headingForeground(background: string): '#17233f' | '#fff' {
  const value = background.slice(1);
  const hex = value.length <= 4 ? [...value].map(character => character.repeat(2)).join('') : value;
  const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  const luminance = (channels: number[]) => channels.reduce((sum, channel, index) => {
    const normalized = channel / 255;
    const linear = normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
    return sum + linear * [.2126, .7152, .0722][index];
  }, 0);
  const paperColor = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) * alpha + 255 * (1 - alpha));
  const lightness = luminance(paperColor);
  const navy = luminance([23, 35, 63]);
  const darkContrast = (Math.max(lightness, navy) + .05) / (Math.min(lightness, navy) + .05);
  const whiteContrast = 1.05 / (lightness + .05);
  return darkContrast >= whiteContrast ? '#17233f' : '#fff';
}

/** A paper-only projection of the supplied month. No calendar mutation or fetch. */
export function buildCalendarPrintHtml(input: CalendarPrintInput): string {
  const text = escapeHtml;
  const headerCells = input.days.map(day => {
    const marked = Boolean(day.special || day.holiday);
    const background = day.special ? printColor(day.special.color, '#64748b') : day.holiday ? '#EAB308' : day.weekend ? '#eef2f6' : '#f8fafc';
    return `<th scope="col" class="day-heading" style="background:${background};color:${marked ? headingForeground(background) : '#475569'}"><span>${text(day.weekday)}</span><strong>${text(day.day)}</strong>${day.special ? `<span class="special-day-label">${text(day.special.label)}</span>` : ''}</th>`;
  }).join('');

  const bodyRows = input.rows.map(row => {
    let skipUntil = 0;
    const cells: string[] = [];
    input.days.forEach((day, index) => {
      if (index < skipUntil) return;
      const cell = row.cells[index];
      const background = cell ? printColor(cell.color, '#64748b') : day.weekend ? '#f1f5f9' : '#fff';
      const foreground = cell ? printColor(cell.textColor, '#fff') : '#17233f';
      const configuredSpan = cell?.colspan;
      const span = typeof configuredSpan === 'number' && Number.isInteger(configuredSpan) ? Math.max(1, Math.min(configuredSpan, input.days.length - index)) : 1;
      if (span > 1) skipUntil = index + span;
      const fontSize = cell?.fontSize === 'xs' ? '8px' : cell?.fontSize === 'lg' ? '12px' : cell?.fontSize === 'base' ? '11px' : '10px';
      cells.push(`<td${span > 1 ? ` colspan="${span}"` : ''} style="background:${background};color:${foreground};font-size:${fontSize}">${text(cell?.label || '')}</td>`);
    });
    return `<tr><th scope="row" class="room-name" style="border-left-color:${printColor(row.color, '#dce3eb')}">${text(row.name)}</th>${cells.join('')}</tr>`;
  }).join('');

  const legend = input.quickValues.length ? `<section class="legend" aria-label="Legenda">${input.quickValues.map(value => `<div class="legend-item"><span class="legend-dot" style="background:${printColor(value.color, '#64748b')}"></span><strong>${text(value.label)}</strong>${value.desc ? `<span>${text(value.desc)}</span>` : ''}</div>`).join('')}</section>` : '';

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <title>Kalendář - ${text(input.monthName)} ${text(input.year)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html { color-scheme: light; background: #f5f7fa; }
    body { font-family: Arial, sans-serif; background: #fff; color: #17233f; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    article { border-top: 4px solid #149b91; padding-top: 12px; }
    .report-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #dce3eb; padding-bottom: 12px; margin-bottom: 14px; }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .report-logo { width: 40px; height: 50px; object-fit: contain; flex: 0 0 auto; }
    .eyebrow { font-size: 8px; color: #14796f; letter-spacing: 1.2px; font-weight: 700; text-transform: uppercase; margin: 0 0 6px; }
    h1 { font-size: 23px; line-height: 1.15; font-weight: 700; letter-spacing: -.5px; margin: 0; color: #17233f; }
    h1 span { color: #64748b; font-weight: 400; }
    .report-meta { font-size: 9px; line-height: 1.7; color: #64748b; text-align: right; flex: 0 0 auto; }
    .report-meta strong { display: block; color: #17233f; font-size: 11px; }
    .section-title { font-size: 9px; letter-spacing: .8px; text-transform: uppercase; margin: 0 0 8px; }
    .section-title span { color: #149b91; margin-right: 7px; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 9px; }
    thead { display: table-header-group; }
    th, td { padding: 6px 2px; border: 1px solid #dce3eb; overflow-wrap: anywhere; }
    tr { break-inside: avoid; }
    .name-heading { background: #f8fafc; text-align: left; padding: 6px 8px; color: #475569; font-size: 8px; letter-spacing: .6px; }
    .day-heading { text-align: center; font-size: 8px; font-weight: 400; vertical-align: top; }
    .day-heading > span, .day-heading > strong { display: block; }
    .day-heading strong { font-size: 11px; margin-top: 3px; }
    .special-day-label { font-size: 7px; line-height: 1.2; margin-top: 3px; }
    .room-name { padding: 6px 8px; font-size: 9px; font-weight: 600; color: #17233f; text-align: left; background: #f8fafc; border-left-width: 3px; white-space: normal; }
    td { text-align: center; font-weight: 700; white-space: pre-line; }
    .legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; border: 1px solid #dce3eb; background: #f8fafc; padding: 8px 10px; break-inside: avoid; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 9px; color: #475569; }
    .legend-item strong { color: #17233f; }
    .legend-dot { width: 8px; height: 8px; flex: 0 0 auto; }
    footer { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid #dce3eb; margin-top: 12px; padding-top: 7px; font-size: 8px; color: #64748b; }
    @media screen { body { max-width: 1120px; margin: 24px auto; padding: 32px; box-shadow: 0 8px 28px #17233f12; } }
    @media print { html, body { height: auto; overflow: visible; background: #fff; } article { max-width: none; } }
  </style>
</head>
<body>
  <article aria-label="Kalendářní report">
    <header class="report-heading">
      <div class="brand"><img class="report-logo" src="${OPERATINGROOM_REPORT_LOGO}" alt="Operatingroom Management System" width="40" height="50"><div><p class="eyebrow">Operatingroom Management System</p><h1>Kalendář <span>${text(input.monthName)} ${text(input.year)}</span></h1></div></div>
      <div class="report-meta">Provozní přehled<strong>${text(input.monthName)} ${text(input.year)}</strong>${text(input.rows.length)} oddělení / ${text(input.days.length)} dnů</div>
    </header>
    <h2 class="section-title"><span>01</span>Měsíční přehled</h2>
    <table>
      <colgroup><col style="width:140px">${input.days.map(() => '<col>').join('')}</colgroup>
      <thead><tr><th scope="col" class="name-heading">ODDĚLENÍ</th>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${legend}
    <footer><span>Operatingroom Management System</span><span>Vytištěno: ${text(input.generatedAt.toLocaleString('cs-CZ'))}</span></footer>
  </article>
  <script>window.onload=async()=>{await Promise.allSettled([document.fonts?.ready??Promise.resolve(),...Array.from(document.images).map(image=>image.decode?image.decode():Promise.resolve())]);window.onafterprint=()=>window.close();window.print();};<\/script>
</body>
</html>`;
}
