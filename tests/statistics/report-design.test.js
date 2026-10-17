import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Source bytes supplied by the user; the test suite must never require access
// to that user's Desktop, a network service, or a remote brand asset.
const SUPPLIED_LOGO_SHA256 = '6b4a09b8778e4189731b67a9513a3b60ec0c2da4c85bc3a0fa14b69fba6cabf5';
const source = readFileSync(new URL('../../lib/statistics-print.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'statistics-print.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const moduleStub = { exports: {} };
new Function('exports', 'module', outputText)(moduleStub.exports, moduleStub);
const { buildStatisticsPrintHtml, OPERATINGROOM_REPORT_LOGO } = moduleStub.exports;
const metadata = {
  tabLabel: 'Historické statistiky za období', periodLabel: '1. 7. – 15. 7. 2026',
  hospitalName: 'Testovací zařízení', generatedAt: new Date('2026-07-16T08:00:00Z'), filename: 'Statistiky.pdf',
};
const sample = (rest = {}) => ({ metrics: [], sections: [], ...rest });
const styleOf = html => html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

test('every report embeds the exact supplied SVG once, at a small stable accessible size', () => {
  assert.match(OPERATINGROOM_REPORT_LOGO, /^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+=*$/);
  const bytes = Buffer.from(OPERATINGROOM_REPORT_LOGO.split(',')[1], 'base64');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), SUPPLIED_LOGO_SHA256);
  const svg = bytes.toString('utf8');
  assert.match(svg, /viewBox="0 0 830 1030"/);
  assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\son[a-z]+\s*=|(?:href|src)\s*=|@import|url\s*\(/i);
  for (const tabLabel of ['Přehled', 'Finance', 'Sazby', 'Sály', 'Fáze', 'Výkonnost', 'Notifikace', 'Zařízení', metadata.tabLabel]) {
    const html = buildStatisticsPrintHtml(sample(), { ...metadata, tabLabel });
    const images = html.match(/<img\b[^>]*>/gi) ?? [];
    assert.equal(images.length, 1);
    assert.ok(images[0].includes(`src="${OPERATINGROOM_REPORT_LOGO}"`));
    assert.match(images[0], /class="report-logo"/);
    assert.match(images[0], /alt="Operatingroom Management System"/);
    assert.match(images[0], /width="40"/);
    assert.match(images[0], /height="50"/);
    const header = html.match(/<header class="report-header">([\s\S]*?)<\/header>/)?.[1] ?? '';
    assert.ok(header.includes(images[0]), 'The logo belongs in the document header, not a repeated data row');
  }
});

test('editorial reports are offline self-contained light documents with a restrained brand accent', () => {
  const html = buildStatisticsPrintHtml(sample(), metadata);
  const remaining = html.replace(/<img\b[^>]*>/gi, '');
  assert.doesNotMatch(remaining, /<(?:script|link|iframe|object|embed|video|audio)\b|(?:src|href)\s*=/i);
  assert.doesNotMatch(html, /@import\b|@font-face\b|url\s*\(|var\(--(?:stats|m)-|https?:\/\//i);
  const css = styleOf(html);
  assert.match(css, /#f7f9fc/i);
  assert.match(css, /#fff(?:fff)?\b/i);
  assert.match(css, /#0e7490/i);
  assert.match(css, /(?:^|\n)\s*h1\s*\{[^}]*font-size:\s*(?:18|19|20)pt/);
  assert.match(css, /\.report-pair\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.report-section\s*\{[^}]*border:/);
  assert.doesNotMatch(css, /backdrop-filter|text-shadow|animation\s*:|(?:filter\s*:\s*blur)/i);
});

test('one to six metric cards retain exact labels, values and details in both presentations', () => {
  for (const presentation of [undefined, 'compact']) {
    for (let count = 1; count <= 6; count++) {
      const metrics = Array.from({ length: count }, (_, index) => ({
        label: `Ukazatel ${index + 1}`, value: index === 0 ? 0 : `${index},5 h`, detail: `Podklad ${index + 1}`,
      }));
      const html = buildStatisticsPrintHtml(sample({ presentation, metrics }), metadata);
      assert.equal((html.match(/<div class="metric">/g) ?? []).length, count);
      for (const metric of metrics) {
        assert.ok(html.includes(`>${metric.label}</span>`));
        assert.ok(html.includes(`>${metric.value}</strong>`));
        assert.ok(html.includes(`>${metric.detail}</span>`));
      }
      const css = styleOf(html);
      assert.match(css, /\.metrics\s*\{[^}]*break-inside:\s*avoid/);
      assert.doesNotMatch(css, /\.metric(?:-value)?\s*\{[^}]*(?:text-overflow:\s*ellipsis|line-clamp|(?:^|[;{])\s*(?:max-)?height:\s*\d)/);
    }
  }
});

test('large and wide tables keep all data, repeated headers and explicit fresh-page sections', () => {
  const labels = ['Operační sál', 'Provoz v rozpisu (h)', 'ÚPS (h)', 'Podíl ÚPS (%)', 'Vytížení ÚPS (%)', 'Časové okno ÚPS (h)'];
  const rows = Array.from({ length: 180 }, (_, index) => [`Úplný název operačního sálu ${index + 1}`, index, 0, '—', '12,5 %', 16]);
  const report = sample({ presentation: 'compact', sections: [{
    title: 'Provoz v rozpisu a ÚPS', startNewPage: true,
    columns: labels.map((label, index) => ({ label, ...(index ? { align: 'right' } : {}) })), rows,
  }] });
  const html = buildStatisticsPrintHtml(report, metadata);
  assert.equal((html.match(/<th scope="col"/g) ?? []).length, labels.length);
  assert.equal((html.match(/<td(?: class="numeric")?>/g) ?? []).length, rows.length * labels.length);
  for (const [name] of rows) assert.ok(html.includes(name));
  const css = styleOf(html);
  assert.match(css, /thead\s*\{[^}]*display:\s*table-header-group/);
  assert.match(css, /tr\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(css, /td\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /counter\(page\)[\s\S]*counter\(pages\)/);
  assert.match(css.slice(css.indexOf('@media print')), /\.report-new-page\s*\{[^}]*break-before:\s*page/);
  assert.doesNotMatch(css, /\.report-section\s*\{[^}]*(?:overflow:\s*hidden|(?:max-)?height:\s*\d)/);
  assert.doesNotMatch(html.match(/<section class="([^"]+)"/)?.[1] ?? '', /report-section--half/, 'A large six-column section must use the full page width');
});

test('only bounded adjacent summaries share two columns; wide, long and fresh-page sections remain full width', () => {
  const short = title => ({ title, columns: [{ label: 'Sál' }, { label: 'Výkony', align: 'right' }], rows: [['TRA 1', 2], ['DaVinci', 0]] });
  const report = sample({ sections: [
    short('Počet výkonů'), short('Časový souhrn'),
    { ...short('Dlouhý přehled'), rows: Array.from({ length: 8 }, (_, index) => [`Sál ${index + 1}`, index]) },
    { ...short('ÚPS samostatně'), startNewPage: true },
  ] });
  const html = buildStatisticsPrintHtml(report, metadata);
  assert.equal((html.match(/class="report-pair"/g) ?? []).length, 1);
  assert.equal((html.match(/<section class="report-section report-section--half">/g) ?? []).length, 2);
  assert.equal((html.match(/<section class="report-section">/g) ?? []).length, 1);
  assert.ok(html.includes('<section class="report-section report-new-page">'));
  for (const title of ['Počet výkonů', 'Časový souhrn', 'Dlouhý přehled', 'ÚPS samostatně']) assert.ok(html.includes(title));
  const css = styleOf(html);
  assert.match(css, /\.report-pair\s*\{[^}]*break-inside:\s*avoid/);
  assert.doesNotMatch(css, /\.report-section\s*\{[^}]*break-inside:\s*avoid/);
});

test('long chart text stays full width rather than turning a short series into an oversized paired panel', () => {
  const short = { title: 'Souhrn', columns: [], rows: [], chart: { kind: 'bars', unit: '%', points: [{ label: 'Sál', value: 50 }] } };
  for (const changed of [
    { ...short, title: 'Dlouhý název '.repeat(12) },
    { ...short, chart: { ...short.chart, description: 'Vysvětlení '.repeat(25) } },
    { ...short, chart: { ...short.chart, points: [{ label: 'Úplný název sálu '.repeat(8), value: 50 }] } },
    { ...short, chart: { ...short.chart, points: [{ label: 'Sál', value: 50, detail: 'Podrobný popis '.repeat(15) }] } },
    { ...short, chart: { ...short.chart, kind: 'line', points: [{ label: 'Delší popisek časové osy', value: 50 }] } },
    { ...short, columns: [{ label: 'Sál' }], rows: [['Sál s grafem i tabulkou']] },
    { title: 'Dlouhé hlavičky', columns: [{ label: 'Podrobná hlavička '.repeat(5) }], rows: [['Sál']] },
  ]) {
    const html = buildStatisticsPrintHtml(sample({ sections: [short, changed] }), metadata);
    assert.doesNotMatch(html, /class="report-pair"|report-section--half">/);
  }
});
