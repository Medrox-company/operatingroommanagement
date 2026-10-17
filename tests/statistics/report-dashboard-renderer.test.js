import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// These contracts cover the real, offline HTML renderer with synthetic values.
// CSS structure is not proof of A4 pagination: rendered PDF pages require their
// own visual QA. Charts must never invent values or drop the detailed appendix.
const source = readFileSync(new URL('../../lib/statistics-print.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'statistics-print.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const moduleStub = { exports: {} };
new Function('exports', 'module', outputText)(moduleStub.exports, moduleStub);
const { buildStatisticsPrintHtml, OPERATINGROOM_REPORT_LOGO } = moduleStub.exports;

const metadata = {
  tabLabel: 'Historické statistiky za období', periodLabel: '13. 10. 2026',
  hospitalName: 'Testovací zařízení', generatedAt: new Date('2026-10-14T00:30:00Z'), filename: 'Statistiky.pdf',
};
const chartSection = (title, kind = 'bars', points = [{ label: 'Úplný název sálu', value: 12 }], unit = '') => ({
  title, columns: [], rows: [], chart: { kind, points, unit },
});
const report = (dashboard, rest = {}) => ({ layout: 'dashboard', metrics: [], sections: [], dashboard, ...rest });
const bodyOf = html => html.slice(html.indexOf('<article'));
const styleOf = html => html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
const count = (text, needle) => text.split(needle).length - 1;
const render = value => buildStatisticsPrintHtml(value, metadata);

test('dashboard is opt-in: a supplied dashboard array alone does not change a default report', () => {
  const sections = [chartSection('Standardní přehled')];
  const original = { metrics: [], sections };
  assert.equal(render({ ...original, dashboard: [chartSection('Ignorovaný návrh')] }), render(original));
  for (const dashboard of [undefined, []]) {
    const html = render({ ...original, layout: 'dashboard', dashboard });
    assert.ok(bodyOf(html).includes('Standardní přehled'));
    assert.doesNotMatch(bodyOf(html), /class="(?:report-dashboard|report-details)"/);
  }
});

test('the dashboard uses independent two-card and three-card columns with continuations below', () => {
  const titles = ['Vytížení podle rozpisu', 'Fáze cyklů', 'Dokončené cykly', 'Provoz v ÚPS', 'Provozní upozornění', 'Pokračování sálů'];
  const html = render(report(titles.map((title, index) => chartSection(title, index === 1 ? 'donut' : 'bars'))));
  const body = bodyOf(html);
  assert.equal(count(body, 'class="report-dashboard"'), 1);
  assert.equal(count(body, 'class="dashboard-primary"'), 1);
  assert.equal(count(body, 'class="dashboard-left"'), 1);
  assert.equal(count(body, 'class="dashboard-side"'), 1);
  assert.equal(count(body, 'class="dashboard-secondary"'), 1);
  assert.equal(count(body, 'class="dashboard-card dashboard-utilization"'), 1);
  assert.equal(count(body, 'class="dashboard-card"'), 5);
  const leftStart = body.indexOf('<div class="dashboard-left">');
  const sideStart = body.indexOf('<div class="dashboard-side">');
  const secondaryStart = body.indexOf('<div class="dashboard-secondary">');
  for (const index of [0, 3]) {
    assert.ok(body.indexOf(`<h2>${titles[index]}</h2>`) > leftStart);
    assert.ok(body.indexOf(`<h2>${titles[index]}</h2>`) < sideStart);
  }
  for (const index of [1, 2, 4]) {
    const title = titles[index];
    assert.ok(body.indexOf(`<h2>${title}</h2>`) > sideStart);
    assert.ok(body.indexOf(`<h2>${title}</h2>`) < secondaryStart);
  }
  assert.ok(body.indexOf(`<h2>${titles[5]}</h2>`) > secondaryStart);
  const css = styleOf(html);
  for (const name of ['dashboard-primary', 'dashboard-secondary']) {
    assert.match(css, new RegExp(`\\.${name}\\s*\\{[^}]*display:\\s*grid;[^}]*grid-template-columns:\\s*repeat\\(2, minmax\\(0, 1fr\\)\\)`));
  }
  assert.match(css, /\.dashboard-left\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.dashboard-side\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.dashboard-card\s*\{[^}]*min-width:\s*0[^}]*break-inside:\s*avoid/);
  const fiveCards = bodyOf(render(report(titles.slice(0, 5).map(title => chartSection(title)))));
  assert.doesNotMatch(fiveCards, /class="dashboard-secondary"/);
});

test('all original table rows remain in a clearly separated detailed appendix', () => {
  const chart = chartSection('Souhrnný graf');
  const rows = Array.from({ length: 78 }, (_, index) => [`Celý název sálu ${index + 1}`, index, '7,5 h']);
  const table = {
    title: 'Úplné hodnoty operačních sálů', description: 'Kapacita podle skutečného rozpisu.',
    columns: [{ label: 'Sál' }, { label: 'Cykly', align: 'right' }, { label: 'Čas' }], rows,
  };
  const html = render(report([chart], { sections: [chart, table] }));
  const body = bodyOf(html);
  assert.equal(count(body, '<h2>Souhrnný graf</h2>'), 1, 'The same chart-only object must not print twice');
  assert.equal(count(body, 'class="report-details"'), 1);
  const appendix = body.slice(body.indexOf('class="report-details"'));
  assert.ok(appendix.includes('Podrobné tabulky a metodika'));
  assert.ok(appendix.includes(table.description));
  assert.equal(count(appendix, '<td'), rows.length * table.columns.length);
  for (const row of rows) assert.ok(appendix.includes(`<td>${row[0]}</td>`));
  assert.doesNotMatch(styleOf(html).slice(styleOf(html).indexOf('@media print')), /\.report-details\s*\{[^}]*break-before:\s*page/,
    'The appendix flows after the last chart rather than wasting a page after a continued dashboard card');
});

test('only the identical chart-only source is deduplicated, never charts with real table rows', () => {
  const overview = chartSection('Stejný graf');
  const clone = { ...overview, title: 'Samostatný graf', chart: { ...overview.chart } };
  const withTable = {
    ...overview, title: 'Graf i skutečná tabulka', columns: [{ label: 'Sál' }, { label: 'Cykly' }],
    rows: [['Název, který musí zůstat', 12]],
  };
  const html = bodyOf(render(report([overview], { sections: [overview, clone, withTable] })));
  assert.equal(count(html, '<figure'), 3);
  assert.ok(html.includes('Samostatný graf'));
  assert.ok(html.includes('Graf i skutečná tabulka'));
  assert.ok(html.includes('<td>Název, který musí zůstat</td><td>12</td>'));
});

test('compact shared bar details survive as exact three-column appendix lookup tables', () => {
  const source = chartSection('Vytížení operačních sálů', 'bars', [
    { label: 'TRAUMATOLOGIE - 1', value: 61.25, detail: '4,9 h / 8 h · 2 cykly · 0 upozornění' },
    { label: 'DaVinci', value: 0, detail: '0 h / 10 h · 0 cyklů · 0 upozornění' },
    { label: 'EXTERNÍ ANESTEZIE', value: null, detail: 'Bez plánované kapacity · zaznamenáno 0 h' },
    { label: 'Sál bez doplňující poznámky', value: 25 },
  ], '%');
  source.description = 'Průkazná data podle uloženého rozpisu.';
  const original = structuredClone(source);
  const html = render(report([source], { sections: [source] }));
  const body = bodyOf(html);
  const dashboard = body.slice(0, body.indexOf('class="report-details"'));
  const appendix = body.slice(body.indexOf('class="report-details"'));
  assert.equal(count(body, '<figure'), 1, 'The compact summary chart must not be plotted again');
  assert.equal(count(dashboard, 'class="chart-bar-detail"'), 3, 'Existing bar evidence remains in the HTML summary');
  assert.match(styleOf(html), /\.report-dashboard \.dashboard-card \.chart-bar-detail\s*\{\s*display:\s*none/);
  assert.equal(count(appendix, '<th scope="col"'), 3);
  assert.ok(appendix.includes('Ukazatel / sál'));
  assert.ok(appendix.includes('Hodnota'));
  assert.ok(appendix.includes('Podrobnosti'));
  assert.ok(appendix.includes(source.description));
  assert.ok(appendix.includes('<td>TRAUMATOLOGIE - 1</td><td class="numeric">61,3 %</td><td>4,9 h / 8 h · 2 cykly · 0 upozornění</td>'));
  assert.ok(appendix.includes('<td>DaVinci</td><td class="numeric">0 %</td><td>0 h / 10 h · 0 cyklů · 0 upozornění</td>'));
  assert.ok(appendix.includes('<td>EXTERNÍ ANESTEZIE</td><td class="numeric">Bez rozpisu</td><td>Bez plánované kapacity · zaznamenáno 0 h</td>'));
  assert.ok(appendix.includes('<td>Sál bez doplňující poznámky</td><td class="numeric">25 %</td><td></td>'));
  assert.deepEqual(source, original, 'Appendix projection cannot mutate the source chart object');
});

test('shared chart lookup preserves escaped evidence and zero or missing hours without creating measured data', () => {
  const label = 'Úplný název <sálu> & oddělení';
  const detail = '<script>původní poznámka</script> & podklad';
  const source = chartSection('Zaznamenaná doba', 'bars', [
    { label, value: 0, detail }, { label: 'Nedoložený čas', value: null, detail: 'Čas není dostupný' },
  ], 'h');
  const body = bodyOf(render(report([source], { sections: [source] })));
  const appendix = body.slice(body.indexOf('class="report-details"'));
  assert.ok(appendix.includes('<td>Úplný název &lt;sálu&gt; &amp; oddělení</td><td class="numeric">0 h</td><td>&lt;script&gt;původní poznámka&lt;/script&gt; &amp; podklad</td>'));
  assert.ok(appendix.includes('<td>Nedoložený čas</td><td class="numeric">Není údaj</td><td>Čas není dostupný</td>'));
  assert.doesNotMatch(body, /<script\b/);
});

test('large dashboard series continue in bounded cards without omitting names or values', () => {
  const points = Array.from({ length: 47 }, (_, index) => ({ label: `Úplný operační sál ${index + 1}`, value: index + 1 }));
  for (const kind of ['bars', 'columns']) {
    const html = bodyOf(render(report([chartSection('Všechny operační sály', kind, points)])));
    assert.equal(count(html, 'class="dashboard-card'), 3);
    assert.ok(html.includes('(1–18)'));
    assert.ok(html.includes('(19–36)'));
    assert.ok(html.includes('(37–47)'));
    for (const point of points) assert.ok(html.includes(point.label));
    assert.equal(count(html, kind === 'bars' ? 'class="chart-bar-row"' : 'class="chart-column-index"'), points.length);
  }
});

test('donuts show actual totals, all named segments and a text legend without fabricated percentages', () => {
  const html = bodyOf(render(report([chartSection('Provoz v rozpisu a ÚPS', 'donut', [
    { label: 'V rozpisu', value: 49.98, color: '#0e7490', detail: 'Podle uložené pracovní doby' },
    { label: 'ÚPS', value: 15.55, color: '#2563eb', detail: 'Mimo rozpis' },
  ], 'h')])));
  assert.ok(html.includes('viewBox="0 0 180 180" role="img" aria-label="Provoz v rozpisu a ÚPS"'));
  assert.ok(html.includes('65,53 h'));
  assert.ok(html.includes('CELKEM'));
  assert.ok(html.includes('<span class="chart-legend-label">V rozpisu</span><strong>49,98 h</strong>'));
  assert.ok(html.includes('<span class="chart-legend-label">ÚPS</span><strong>15,55 h</strong>'));
  assert.ok(html.includes('<small>Podle uložené pracovní doby</small>'));
  assert.ok(html.includes('<small>Mimo rozpis</small>'));
  assert.equal(count(html, 'stroke-dasharray='), 2);
  assert.doesNotMatch(html, /100 %|canvas|<script\b/);
});

test('zero, missing, invalid and partial donut totals remain distinct and explicit', () => {
  for (const points of [
    [{ label: 'Nula', value: 0 }],
    [{ label: 'Chybějící', value: null }],
    [{ label: 'Neplatné', value: NaN }, { label: 'Záporné', value: -1 }, { label: 'Nekonečné', value: Infinity }],
  ]) {
    const body = bodyOf(render(report([chartSection('Prázdný souhrn', 'donut', points, 'h')])));
    assert.ok(body.includes('BEZ NAMĚŘENÝCH DAT'));
    assert.doesNotMatch(body, /stroke-dasharray=|100 %/);
    for (const point of points) assert.ok(body.includes(point.label));
  }
  const zero = bodyOf(render(report([chartSection('Prázdný souhrn', 'donut', [{ label: 'Nula', value: 0 }], 'h')])));
  assert.ok(zero.includes('<strong>0 h</strong>'));
  const missing = bodyOf(render(report([chartSection('Prázdný souhrn', 'donut', [{ label: 'Chybějící', value: null }], 'h')])));
  assert.ok(missing.includes('<strong>Není údaj</strong>'));
  const partial = bodyOf(render(report([chartSection('Částečný souhrn', 'donut', [
    { label: 'Známé', value: 8 }, { label: 'Chybějící', value: null },
  ], 'h')])));
  assert.ok(partial.includes('ZNÁMÉ HODNOTY'));
  assert.ok(partial.includes('>8 h</text>'));
  assert.doesNotMatch(partial, /100 %/);
});

test('busy donut compositions use complete labelled bars instead of grouping away categories', () => {
  const points = Array.from({ length: 11 }, (_, index) => ({ label: `Původní fáze ${index + 1}`, value: index }));
  const html = bodyOf(render(report([chartSection('Fáze', 'donut', points, 'h')])));
  assert.doesNotMatch(html, /class="chart-donut-mark"/);
  assert.equal(count(html, 'class="chart-bar-row"'), points.length);
  for (const point of points) assert.ok(html.includes(point.label));
});

test('columns retain every room name and exact visible value; displayed ordinals are not room IDs', () => {
  const points = [
    { label: 'TRAUMATOLOGIE - 1', value: 2, color: '#2563eb', id: 'internal-room-id-never-printed' },
    { label: 'GYNEKOLOGIE ZÁKROKOVÝ', value: 0, color: '#abc' },
    { label: 'EXTERNÍ ANESTEZIE', value: null },
  ];
  const html = bodyOf(render(report([chartSection('Dokončené cykly', 'columns', points)])));
  assert.ok(html.includes('viewBox="0 0 430 150" role="img" aria-label="Dokončené cykly"'));
  assert.equal(count(html, '<rect '), 2, 'Zero has a real zero-height mark; missing data has no mark');
  assert.equal(count(html, 'class="chart-column-index"'), points.length);
  assert.ok(html.includes('<span>TRAUMATOLOGIE - 1</span><strong>2</strong>'));
  assert.ok(html.includes('<span>GYNEKOLOGIE ZÁKROKOVÝ</span><strong>0</strong>'));
  assert.ok(html.includes('<span>EXTERNÍ ANESTEZIE</span><strong>Není údaj</strong>'));
  assert.doesNotMatch(html, /internal-room-id-never-printed|undefined|NaN|Infinity/);
});

test('new chart geometry stays finite and constrained; untrusted colors never become attributes or URLs', () => {
  for (const kind of ['donut', 'columns']) {
    const html = render(report([chartSection('Bezpečný graf', kind, [
      { label: 'Chybějící A', value: NaN, color: 'url(javascript:alert(1))' },
      { label: 'Chybějící B', value: Infinity, color: '#123456" onload="alert(1)' },
      { label: 'Chybějící C', value: -1 },
      { label: 'Platný sál', value: 75, color: '#abc' },
      { label: 'Jiný platný sál', value: 25, color: 'red;position:fixed' },
    ], '%') ]));
    assert.doesNotMatch(html, /url\(|javascript:|position:fixed|onload="/i);
    assert.doesNotMatch(html, /(?:width|height|r|cx|cy|x|y|stroke-dasharray|stroke-dashoffset)="[^"]*(?:NaN|Infinity)/);
    assert.doesNotMatch(html, /(?:width|height|r|cx|cy)="-/);
    assert.ok(html.includes('#abc'));
    assert.ok(html.includes('#0e7490'));
    assert.equal(count(bodyOf(html), '>Bez rozpisu</strong>'), 3);
  }
});

test('new chart labels, captions and titles escape source text while the document remains offline', () => {
  const attack = '"><svg onload="alert(1)"><script>alert(2)</script>&';
  const escaped = '&quot;&gt;&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&amp;';
  for (const kind of ['donut', 'columns']) {
    const section = chartSection(attack, kind, [{ label: attack, value: 2, color: attack, detail: attack }], 'h');
    section.chart.description = attack;
    section.description = attack;
    const html = render(report([section]));
    assert.ok(html.includes(escaped));
    assert.equal(html.includes(attack), false);
    assert.doesNotMatch(html, /<script\b|<[^>]+\sonload\s*=\s*["']/i);
    const logo = html.match(/<img\b[^>]*>/gi) ?? [];
    assert.equal(logo.length, 1);
    assert.ok(logo[0].includes(`src="${OPERATINGROOM_REPORT_LOGO}"`));
    const withoutLogo = html.replace(logo[0], '');
    assert.doesNotMatch(withoutLogo, /<(?:img|iframe|link|object|embed|canvas)\b|(?:src|href)\s*=/i);
    assert.doesNotMatch(html, /@import\b|@font-face\b|url\s*\(/i);
  }
});

test('empty new charts use an explicit state rather than fake graphical data', () => {
  for (const kind of ['donut', 'columns']) {
    const body = bodyOf(render(report([chartSection('Žádná data', kind, [])])));
    assert.ok(body.includes('Pro vybrané období nejsou k dispozici údaje pro graf.'));
    assert.doesNotMatch(body, /<svg\b|<rect\b|<circle\b|<table>/);
  }
});
