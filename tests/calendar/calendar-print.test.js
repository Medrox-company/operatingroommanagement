import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/calendar-print.ts', import.meta.url), 'utf8');
const calendarSource = readFileSync(new URL('../../components/CalendarManager.tsx', import.meta.url), 'utf8');
const sharedPrintSource = readFileSync(new URL('../../lib/statistics-print.ts', import.meta.url), 'utf8');
const logo = sharedPrintSource.match(/export const OPERATINGROOM_REPORT_LOGO = '([^']+)'/)?.[1];
assert.ok(logo, 'The actual supplied report logo must exist');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const moduleStub = { exports: {} };
new Function('exports', 'require', outputText)(moduleStub.exports, name => {
  assert.equal(name, './statistics-print');
  return { OPERATINGROOM_REPORT_LOGO: logo };
});
const { buildCalendarPrintHtml } = moduleStub.exports;

function fixture() {
  return {
    monthName: 'Říjen', year: 2026,
    days: Array.from({ length: 31 }, (_, index) => ({
      day: index + 1, weekday: ['PO', 'ÚT', 'ST', 'ČT', 'PÁ', 'SO', 'NE'][index % 7],
      weekend: index % 7 > 4, holiday: index === 27,
      special: index === 6 ? { label: 'Mimořádný provoz', color: '#A855F7' } : undefined,
    })),
    rows: Array.from({ length: 18 }, (_, index) => ({
      name: `Oddělení ${index + 1} - úplný název`, color: '#06B6D4',
      cells: Array.from({ length: 31 }, (_, day) => day === 0 ? { label: `Výkon ${index + 1}`, color: '#22C55E', textColor: '#000000' } : undefined),
    })),
    quickValues: [{ label: 'CH', desc: 'Chirurgie', color: '#3B82F6' }],
    generatedAt: new Date('2026-10-14T10:15:00Z'),
  };
}

test('calendar paper keeps the complete supplied month, sorted rows and legend', () => {
  const html = buildCalendarPrintHtml(fixture());
  assert.equal((html.match(/class="day-heading"/g) ?? []).length, 31);
  assert.equal((html.match(/scope="row"/g) ?? []).length, 18);
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  assert.equal((body.match(/<td(?: |>|\n)/g) ?? []).length, 31 * 18);
  for (let index = 1; index <= 18; index++) {
    assert.ok(body.includes(`Oddělení ${index} - úplný název`));
    assert.ok(body.includes(`Výkon ${index}`));
  }
  assert.ok(html.indexOf('Oddělení 1 -') < html.indexOf('Oddělení 18 -'));
  assert.ok(html.includes('Mimořádný provoz'));
  assert.ok(html.includes('Chirurgie'));
  assert.match(html, /18 oddělení \/ 31 dnů/);
});

test('light paper uses a small offline supplied logo, fine rules and repeating landscape calendar headers', () => {
  const html = buildCalendarPrintHtml(fixture());
  assert.match(html, /<html lang="cs">/);
  assert.match(html, /@page\s*\{\s*size: A4 landscape; margin: 10mm/);
  assert.match(html, /body\s*\{[^}]*background: #fff; color: #17233f/);
  assert.match(html, /border-top: 4px solid #149b91/);
  assert.match(html, /thead\s*\{ display: table-header-group/);
  assert.match(html, /tr\s*\{ break-inside: avoid/);
  assert.match(html, /overflow-wrap: anywhere/);
  assert.doesNotMatch(html, /writing-mode|max-height|overflow: hidden|background: #0a0a14/);
  const images = html.match(/<img\b[^>]*>/g) ?? [];
  assert.equal(images.length, 1);
  assert.ok(images[0].includes(`src="${logo}"`));
  assert.match(images[0], /width="40" height="36"/);
  assert.doesNotMatch(html, /<link|@import|url\s*\(|https?:\/\//i);
});

test('configured cell text, font sizes, colors and valid horizontal merged cells stay intact', () => {
  const input = fixture();
  input.rows[0].cells[0] = { label: 'Sloučené\nbuňky', color: '#aB34', textColor: '#FFEEDDCC', colspan: 3, fontSize: 'lg' };
  input.rows[0].cells[1] = { label: 'Překryté', color: '#fff' };
  const html = buildCalendarPrintHtml(input);
  assert.match(html, /colspan="3" style="background:#aB34;color:#FFEEDDCC;font-size:12px">Sloučené\nbuňky/);
  assert.doesNotMatch(html, /Překryté/);
  assert.match(html, /background:#22C55E;color:#000000/);
  assert.match(html, /background:#A855F7;color:#fff/);
  assert.match(html, /background:#EAB308;color:#17233f/);
  assert.match(html, /background:#f1f5f9;color:#17233f/);
});

test('automatic holiday and special-day headings use readable ink without changing configured backgrounds or cell ink', () => {
  const input = fixture();
  input.days[0].special = { label: 'Tmavý den', color: '#17233f' };
  input.days[1].special = { label: 'Světlý den', color: '#fff' };
  input.days[2].special = { label: 'Průsvitný den', color: '#ff08' };
  input.days[3].special = { label: 'Průsvitný světlý den', color: '#FFFF0080' };
  input.rows[0].cells[0] = { label: 'Nastavená barva textu', color: '#EAB308', textColor: '#fff' };
  const html = buildCalendarPrintHtml(input);
  const header = html.match(/<thead>([\s\S]*?)<\/thead>/)?.[1];
  assert.match(header, /background:#EAB308;color:#17233f/);
  assert.match(header, /background:#17233f;color:#fff/);
  assert.match(header, /background:#fff;color:#17233f/);
  assert.match(header, /background:#ff08;color:#17233f/);
  assert.match(header, /background:#FFFF0080;color:#17233f/);
  assert.match(html, /background:#EAB308;color:#fff;font-size:10px">Nastavená barva textu/);
});

test('all user-authored text and title contexts are escaped before interpolation', () => {
  const attack = '</title><img src=x onerror="alert(1)"><script>alert(2)</script>&\'';
  const escaped = '&lt;/title&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&amp;&#39;';
  const input = fixture();
  input.monthName = `month:${attack}`;
  input.days[0].weekday = `weekday:${attack}`;
  input.days[0].special = { label: `special:${attack}`, color: '#fff' };
  input.rows[0].name = `row:${attack}`;
  input.rows[0].cells[0].label = `cell:${attack}`;
  input.quickValues[0].label = `legend-label:${attack}`;
  input.quickValues[0].desc = `legend-description:${attack}`;
  const html = buildCalendarPrintHtml(input);
  for (const field of ['month', 'weekday', 'special', 'row', 'cell', 'legend-label', 'legend-description']) assert.ok(html.includes(`${field}:${escaped}`), field);
  assert.equal((html.match(/<script>/g) ?? []).length, 1, 'Only the fixed print-ready callback may execute');
  assert.equal((html.match(/<img\b/g) ?? []).length, 1, 'Only the fixed supplied logo may render');
  assert.doesNotMatch(html, /<[^>]+\son(?:error|mouseover)=/i);
});

test('CSS injection and invalid colspan cannot leave validated presentation bounds', () => {
  const input = fixture();
  const attack = '#fff; background:url(https://example.invalid);" onmouseover="bad';
  input.days[0].special = { label: 'Den', color: attack };
  input.rows[0].color = attack;
  input.rows[0].cells[0] = { label: 'Bezpečná buňka', color: attack, textColor: attack, colspan: '2" onclick="bad' };
  input.rows[1].cells[30] = { label: 'Konec měsíce', color: '#abc', colspan: 500 };
  input.quickValues[0].color = attack;
  const html = buildCalendarPrintHtml(input);
  assert.doesNotMatch(html, /example\.invalid|onmouseover|onclick|colspan="500"/);
  assert.match(html, /background:#64748b;color:#fff;font-size:10px">Bezpečná buňka/);
  assert.match(html, /style="border-left-color:#dce3eb"/);
  assert.match(html, /background:#abc;color:#fff;font-size:10px">Konec měsíce/);
});

test('native print waits for logo decoding and fonts and keeps the original after-print close behavior', async () => {
  const html = buildCalendarPrintHtml(fixture());
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  let resolveImage;
  let resolveFonts;
  const calls = [];
  const windowStub = { print: () => calls.push('print'), close: () => calls.push('close') };
  const documentStub = {
    fonts: { ready: new Promise(resolve => { resolveFonts = resolve; }) },
    images: [{ decode: () => new Promise(resolve => { resolveImage = resolve; }) }],
  };
  new Function('window', 'document', script)(windowStub, documentStub);
  const ready = windowStub.onload();
  assert.deepEqual(calls, []);
  resolveFonts();
  await Promise.resolve();
  assert.deepEqual(calls, []);
  resolveImage();
  await ready;
  assert.deepEqual(calls, ['print']);
  windowStub.onafterprint();
  assert.deepEqual(calls, ['print', 'close']);
});

test('CalendarManager wires the exact existing visible rows, month cells and holidays into print only', () => {
  assert.match(calendarSource, /import \{ buildCalendarPrintHtml \} from '\.\.\/lib\/calendar-print'/);
  const print = calendarSource.slice(calendarSource.indexOf('const printCalendar ='), calendarSource.indexOf('const exportCSV ='));
  assert.match(print, /rows: sortedRows\.map\(row => \(\{ \.\.\.row, cells: days\.map\(day => cells\[ck\(row\.id, day\)\]\) \}\)\)/);
  assert.match(print, /holiday: holidays\.some\(holiday => holiday\.month === month && holiday\.day === day\)/);
  assert.match(print, /special: specialDays\.find\(special => special\.day === day\)/);
  assert.match(print, /printWindow\.document\.write\(html\)/);
  assert.doesNotMatch(print, /setCells|setRows|setSpecialDays|fetch\(/);
});
