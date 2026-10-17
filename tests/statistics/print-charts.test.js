import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Pure HTML contracts only. Browser pagination and native PDF rendering are
// separate visual QA; these tests do not claim to exercise a print dialog.
const source = readFileSync(new URL('../../lib/statistics-print.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'statistics-print.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const moduleStub = { exports: {} };
new Function('exports', 'module', outputText)(moduleStub.exports, moduleStub);
const { buildStatisticsPrintHtml, OPERATINGROOM_REPORT_LOGO } = moduleStub.exports;
function withoutTrustedLogo(html) {
  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  assert.equal(images.length, 1, 'Charts may include only the supplied static report logo');
  assert.ok(images[0].includes(`src="${OPERATINGROOM_REPORT_LOGO}"`));
  assert.match(images[0], /class="report-logo"/);
  assert.doesNotMatch(images[0], /\son[a-z]+\s*=/i);
  return html.replace(images[0], '');
}
const metadata = {
  tabLabel: 'Historické statistiky za období', periodLabel: '1. 7. - 15. 7. 2026',
  hospitalName: 'Testovací zařízení', generatedAt: new Date('2026-07-16T08:00:00Z'), filename: 'Statistiky.pdf',
};
function chartReport(chart, rest = {}) {
  return {
    presentation: 'compact', metrics: [],
    sections: [{ title: 'Vytížení operačních sálů', columns: [], rows: [], chart }],
    ...rest,
  };
}

test('compact table and metric numbers use Czech separators without changing strings or default reports', () => {
  const report = { presentation: 'compact', metrics: [{ label: 'Počet', value: 12345 }], sections: [{
    title: 'Časy', columns: [{ label: 'Hodiny' }], rows: [[3.929], [80300], ['3.929']],
  }] };
  const compact = buildStatisticsPrintHtml(report, metadata);
  assert.ok(compact.includes('3,929'));
  assert.ok(compact.includes('80\u00a0300'));
  assert.ok(compact.includes('12\u00a0345'));
  assert.ok(compact.includes('>3.929</td>'), 'Preformatted text is not reinterpreted');
  const original = buildStatisticsPrintHtml({ ...report, presentation: undefined }, metadata);
  assert.ok(original.includes('>3.929</td>'));
  assert.ok(original.includes('>80300</td>'));
});

test('compact bars show every actual room, time detail and value without a redundant empty table', () => {
  const html = buildStatisticsPrintHtml(chartReport({
    kind: 'bars', unit: '%', maxValue: 100, description: 'Podle uloženého rozpisu.',
    points: [
      { label: 'TRAUMATOLOGIE - 1', value: 46.25, color: '#3B82F6', detail: '37,0 h / 80,0 h · 12 cyklů · 2 upozornění' },
      { label: 'DaVinci', value: 0, detail: '0,0 h / 80,0 h · 0 cyklů · 0 upozornění' },
      { label: 'Archivovaný sál', value: null, detail: 'Rozpis není dostupný.' },
    ],
  }), metadata);
  assert.match(html, /<article aria-label="Statistický report" class="compact-report">/);
  assert.equal((html.match(/class="chart-bar-row"/g) ?? []).length, 3);
  assert.ok(html.includes('37,0 h / 80,0 h · 12 cyklů · 2 upozornění'));
  assert.ok(html.includes('46,3 %'));
  assert.ok(html.includes('0 %'));
  assert.ok(html.includes('Bez rozpisu'));
  assert.ok(html.includes('width="462.500"'));
  assert.ok(html.includes('width="0.000"'));
  assert.ok(html.includes('fill="#3B82F6"'));
  assert.doesNotMatch(html, /<table>|Pro vybraný filtr nejsou/);
  assert.match(html, /chart-bar-row\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(html, /chart-bar-detail\s*\{[^}]*font-size:\s*8pt/);
});

test('large bar reports keep all rows and complete names with per-row page-break protection', () => {
  const points = Array.from({ length: 77 }, (_, index) => ({
    label: `Dlouhý úplný název operačního sálu ${index + 1}`,
    value: index, detail: `Podrobný zaznamenaný čas sálu ${index + 1}`,
  }));
  const html = buildStatisticsPrintHtml(chartReport({ kind: 'bars', unit: '%', points }), metadata);
  assert.equal((html.match(/class="chart-bar-row"/g) ?? []).length, 77);
  for (const point of points) {
    assert.ok(html.includes(point.label));
    assert.ok(html.includes(point.detail));
  }
  assert.match(html, /chart-bar-label\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(html, /chart-bar-row\s*\{[^}]*page-break-inside:\s*avoid/);
});

test('only finite non-negative values and legal hex colors reach SVG geometry', () => {
  const html = buildStatisticsPrintHtml(chartReport({
    kind: 'bars', unit: '%', maxValue: Infinity,
    points: [
      { label: 'NaN', value: NaN, color: 'url(javascript:alert(1))' },
      { label: 'Infinity', value: Infinity, color: '#123456" onload="alert(1)' },
      { label: 'Negativní', value: -1 },
      { label: 'Nad 100 %', value: 150, color: '#abc' },
      { label: 'Normální', value: 75, color: '#bad-color' },
    ],
  }), metadata);
  assert.equal((html.match(/>Bez rozpisu<\/strong>/g) ?? []).length, 3);
  assert.ok(html.includes('Stupnice 0 - 150 %'));
  assert.ok(html.includes('150 %'));
  assert.ok(html.includes('width="500.000"'));
  assert.ok(html.includes('fill="#abc"'));
  assert.ok(html.includes('fill="#0e7490"'));
  assert.doesNotMatch(html, /(?:width|height|cx|cy)="(?:NaN|Infinity|-)/);
  assert.doesNotMatch(html, /url\(|javascript:|onload="/i);
});

test('chart labels, details, captions and SVG titles escape untrusted source text', () => {
  const attack = '"><svg onload="alert(1)"><script>alert(2)</script>&';
  const escaped = '&quot;&gt;&lt;svg onload=&quot;alert(1)&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&amp;';
  for (const kind of ['bars', 'line']) {
    const payload = chartReport({ kind, unit: 'h', description: attack, points: [{ label: attack, value: 2, color: attack, detail: attack }] });
    payload.sections[0].title = attack;
    const html = buildStatisticsPrintHtml(payload, metadata);
    assert.ok(html.includes(escaped));
    assert.equal(html.includes(attack), false);
    assert.doesNotMatch(html, /<script\b|<[^>]+\sonload\s*=\s*["']/i);
    assert.doesNotMatch(withoutTrustedLogo(html), /<(?:img|link|iframe|canvas)\b/i);
    assert.doesNotMatch(html, /@import\b|url\s*\(/i);
  }
});

test('line charts keep missing-data gaps, all chronological values, zero and readable units', () => {
  const html = buildStatisticsPrintHtml(chartReport({
    kind: 'line', unit: '%', points: [
      { label: '1. 7.', value: 40 }, { label: '2. 7.', value: 50 },
      { label: '3. 7.', value: null }, { label: '4. 7.', value: 0 }, { label: '5. 7.', value: 60 },
    ],
  }), metadata);
  assert.equal((html.match(/<polyline /g) ?? []).length, 2);
  assert.equal((html.match(/<circle /g) ?? []).length, 4);
  assert.ok(html.includes('<span class="chart-point-label">3. 7.</span><strong class="chart-missing">Bez rozpisu</strong>'));
  assert.ok(html.includes('<span class="chart-point-label">4. 7.</span><strong>0 %</strong>'));
  for (let day = 1; day <= 5; day++) assert.ok(html.includes(`<span class="chart-point-label">${day}. 7.</span>`));
  assert.ok(html.includes('role="img" aria-label="Vytížení operačních sálů"'));
  assert.match(html, /chart-point-values\s*\{[^}]*font-size:\s*8pt/);
});

test('one-point and empty charts are explicit and never manufacture a line or table', () => {
  const one = buildStatisticsPrintHtml(chartReport({ kind: 'line', unit: 'h', points: [{ label: 'Vybraný den', value: .004 }] }), metadata);
  assert.equal((one.match(/<circle /g) ?? []).length, 1);
  assert.doesNotMatch(one, /<polyline /);
  assert.ok(one.includes('cx="365.500"'));
  assert.ok(one.includes('text-anchor="middle"'));
  assert.ok(one.includes('&lt;0,01 h'));
  const empty = buildStatisticsPrintHtml(chartReport({ kind: 'bars', unit: '%', points: [] }), metadata);
  assert.ok(empty.includes('Pro vybrané období nejsou k dispozici údaje pro graf.'));
  assert.doesNotMatch(empty, /<table>|<rect|<polyline/);
});

test('graphs can accompany a real table while compact presentation stays opt-in', () => {
  const payload = chartReport({ kind: 'bars', unit: '', points: [{ label: 'Pozdní příchod operatéra', value: 2 }] }, { presentation: undefined });
  payload.sections[0].columns = [{ label: 'Typ' }, { label: 'Počet', align: 'right' }];
  payload.sections[0].rows = [['Pozdní příchod operatéra', 2]];
  const html = buildStatisticsPrintHtml(payload, metadata);
  assert.ok(html.includes('<article aria-label="Statistický report">'));
  assert.equal((html.match(/<table>/g) ?? []).length, 1);
  assert.ok(html.includes('<td>Pozdní příchod operatéra</td><td class="numeric">2</td>'));
  assert.equal(html.includes('.compact-report h1'), false);
});

test('compact five and six-metric overviews use three readable columns with complete divider rows', () => {
  for (const count of [5, 6]) {
    const metrics = Array.from({ length: count }, (_, index) => ({
      label: `Ukazatel ${index + 1}`, value: `${index + 1} h`, detail: `Popis ${index + 1}`,
    }));
    const html = buildStatisticsPrintHtml({ presentation: 'compact', metrics, sections: [] }, metadata);
    assert.ok(html.includes('<div class="metrics metrics--three-columns">'));
    assert.equal((html.match(/<div class="metric">/g) ?? []).length, count);
    assert.match(html, /\.compact-report \.metrics--three-columns\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(html, /\.metrics--three-columns \.metric:nth-child\(3n\)\s*\{\s*border-right:\s*0/);
    assert.match(html, /\.metrics--three-columns \.metric:nth-child\(-n\+3\)\s*\{\s*border-bottom:\s*1px solid/);
    for (const metric of metrics) {
      assert.ok(html.includes(metric.label));
      assert.ok(html.includes(metric.value));
      assert.ok(html.includes(metric.detail));
    }
  }
});

test('expanded compact overview uses two screen columns below 700px but three A4 print columns', () => {
  const metrics = Array.from({ length: 6 }, (_, index) => ({ label: `Metrika ${index}`, value: index }));
  const html = buildStatisticsPrintHtml({ presentation: 'compact', metrics, sections: [] }, metadata);
  const screen = html.slice(html.indexOf('@media screen and (max-width: 700px)'), html.indexOf('@media (max-width: 700px)'));
  assert.match(screen, /\.metrics--three-columns\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(screen, /\.metric:nth-child\(2n\),[^}]+\.metric:last-child\s*\{\s*border-right:\s*0/);
  assert.match(screen, /\.metric:nth-child\(n\+5\)\s*\{\s*border-bottom:\s*0/);
  const print = html.slice(html.indexOf('@media print'));
  assert.match(print, /\.compact-report \.metrics--three-columns\s*\{\s*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(print, /metrics--three-columns[^}]*repeat\(2/);
});

test('four compact metrics and default reports retain the original single-row print contract', () => {
  for (const [presentation, count] of [['compact', 4], [undefined, 4], [undefined, 6]]) {
    const metrics = Array.from({ length: count }, (_, index) => ({ label: `Metrika ${index}`, value: index }));
    const html = buildStatisticsPrintHtml({ presentation, metrics, sections: [] }, metadata);
    assert.ok(html.includes('<div class="metrics">'));
    assert.doesNotMatch(html, /metrics--three-columns/);
    assert.match(html.slice(html.indexOf('@media print')), /\.metrics\s*\{\s*grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/);
  }
});

test('a section page break is opt-in, paper-only and keeps all six UPS table columns', () => {
  const report = {
    presentation: 'compact', metrics: [], sections: [{
      title: 'ÚPS - operační provoz', startNewPage: true,
      columns: ['Sál', 'Provoz v ÚPS (h)', 'Kapacita ÚPS (h)', 'Vytížení ÚPS', 'Podíl ÚPS', 'Podle rozpisu (h)'].map(label => ({ label })),
      rows: [['TRAUMATOLOGIE - 1', 3, 16, '18,8 %', '27,3 %', 8]],
    }],
  };
  const html = buildStatisticsPrintHtml(report, metadata);
  assert.ok(html.includes('<section class="report-section report-new-page">'));
  const printIndex = html.indexOf('@media print');
  assert.doesNotMatch(html.slice(0, printIndex), /\.report-new-page/);
  assert.match(html.slice(printIndex), /\.report-new-page\s*\{\s*break-before:\s*page;\s*page-break-before:\s*always;/);
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, 6);
  assert.equal((html.match(/<td>/g) ?? []).length, 6);
  for (const column of report.sections[0].columns) assert.ok(html.includes(column.label));
  const original = buildStatisticsPrintHtml({ ...report, sections: [{ ...report.sections[0], startNewPage: false }] }, metadata);
  assert.doesNotMatch(original, /report-new-page/);
});
