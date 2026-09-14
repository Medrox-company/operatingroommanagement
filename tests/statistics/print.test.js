import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// These inspect generated HTML and invoke mocked window callbacks. They do not
// claim to verify browser pagination, native print dialogs, or PDF rendering.
const source = readFileSync(new URL('../../lib/statistics-print.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'statistics-print.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadHelper(windowStub = {}) {
  const moduleStub = { exports: {} };
  new Function('exports', 'module', 'window', outputText)(moduleStub.exports, moduleStub, windowStub);
  return moduleStub.exports;
}
const { buildStatisticsPrintHtml } = loadHelper();
const labels = ['Přehled', 'Finance', 'Sazby', 'Sály', 'Fáze', 'Notifikace', 'Zařízení'];
const metadata = (tabLabel = 'Přehled') => ({
  tabLabel,
  periodLabel: '1.–14. září 2026',
  hospitalName: 'Nemocnice Žďár nad Sázavou',
  generatedAt: new Date('2026-09-14T10:15:00Z'),
  filename: `Statistiky-${tabLabel}-2026-09-14.pdf`,
});
const report = (marker = 'AKTIVNÍ ŘÁDEK') => ({
  context: 'Vybraný den: 14. září 2026; všechny načtené záznamy.',
  metrics: [{ label: 'Počet výkonů', value: 0, detail: 'Ve vybraném filtru' }],
  sections: [{
    title: 'Podrobný přehled',
    description: 'Hodnoty odpovídají aktuálnímu filtru.',
    columns: [{ label: 'Operační sál' }, { label: 'Počet', align: 'right' }],
    rows: [[marker, 0]],
  }],
});

test('all seven Czech tab titles render only the supplied active report payload', () => {
  const reports = labels.map((_, index) => report(`ŘÁDEK ZÁLOŽKY ${index}`));
  for (const [index, label] of labels.entries()) {
    const html = buildStatisticsPrintHtml(reports[index], metadata(label));
    assert.ok(html.includes(`<h1>${label}</h1>`));
    assert.ok(html.includes(`<title>Statistiky-${label}-2026-09-14.pdf</title>`));
    assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.equal((html.match(/<table>/g) ?? []).length, 1);
    for (let other = 0; other < reports.length; other++) {
      assert.equal(html.includes(`ŘÁDEK ZÁLOŽKY ${other}`), other === index);
    }
  }
});

test('long Czech text and enough rows for multiple pages are retained without slicing', () => {
  const payload = report();
  const longText = 'Příliš žluťoučký kůň úpěl ďábelské ódy; operační sál a čekání na anesteziologa. '.repeat(14);
  payload.sections[0].rows = Array.from({ length: 180 }, (_, index) => [`Záznam ${index + 1}\n${longText}`, index]);
  const html = buildStatisticsPrintHtml(payload, metadata());
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1];
  assert.ok(body);
  assert.equal((body.match(/<tr>/g) ?? []).length, 180);
  assert.equal((body.match(/<td(?: class="numeric")?>/g) ?? []).length, 360);
  for (let index = 1; index <= 180; index++) assert.ok(body.includes(`Záznam ${index}\n${longText}`));
  assert.ok(body.includes('<td class="numeric">179</td>'));
  assert.ok(html.includes('<html lang="cs">'));
  assert.ok(html.includes('<meta charset="utf-8">'));
});

test('all dynamic text contexts escape markup and event-handler payloads', () => {
  const attack = '</title><img src=x onerror="alert(1)"><script>alert(2)</script>&\'';
  const escaped = '&lt;/title&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;&amp;&#39;';
  const payload = {
    context: `context:${attack}`,
    metrics: [{ label: `metric-label:${attack}`, value: `metric-value:${attack}`, detail: `metric-detail:${attack}` }],
    sections: [{
      title: `section-title:${attack}`,
      description: `section-description:${attack}`,
      columns: [{ label: `column:${attack}`, width: '\" onmouseover=\"alert(3)' }],
      rows: [[`cell:${attack}`]],
    }, {
      title: 'Prázdná tabulka', columns: [{ label: 'Prázdné' }], rows: [], emptyMessage: `empty:${attack}`,
    }],
  };
  const meta = {
    ...metadata(), tabLabel: `tab:${attack}`, periodLabel: `period:${attack}`,
    hospitalName: `hospital:${attack}`, filename: `filename:${attack}`,
  };
  const html = buildStatisticsPrintHtml(payload, meta);
  for (const field of ['context', 'metric-label', 'metric-value', 'metric-detail', 'section-title', 'section-description', 'column', 'cell', 'empty', 'tab', 'period', 'hospital', 'filename']) {
    assert.ok(html.includes(`${field}:${escaped}`), `Unescaped or missing ${field}`);
  }
  assert.equal(html.includes(attack), false);
  assert.doesNotMatch(html, /<(?:script|img)\b/i);
  assert.doesNotMatch(html, /<[^>]+\son(?:error|mouseover)=/i);
});

test('the document is self-contained and uses no charts, external assets, or app tokens', () => {
  const html = buildStatisticsPrintHtml(report(), metadata());
  assert.doesNotMatch(html, /<(?:script|link|img|iframe|object|embed|video|audio|svg|canvas)\b/i);
  assert.doesNotMatch(html, /@import\b|url\s*\(|var\(--(?:stats|m)-/i);
  assert.doesNotMatch(html, /(?:src|href)\s*=/i);
  assert.ok(html.includes('<article aria-label="Statistický report">'));
  assert.ok(html.includes('Nemocnice Žďár nad Sázavou'));
});

test('zero values survive while empty tables retain explicit messages and column span', () => {
  const payload = report();
  payload.sections[0].rows = [[0, 0], ['Chybějící hodnota']];
  payload.sections.push({ title: 'Prázdná', columns: [{ label: 'Sál' }, { label: 'Stav' }], rows: [], emptyMessage: 'Pro tento den nejsou žádné záznamy.' });
  const html = buildStatisticsPrintHtml(payload, metadata());
  assert.ok(html.includes('<strong class="metric-value">0</strong>'));
  assert.ok(html.includes('<td>0</td><td class="numeric">0</td>'));
  assert.ok(html.includes('<td>Chybějící hodnota</td><td class="numeric"></td>'));
  assert.ok(html.includes('<td colspan="2" class="empty">Pro tento den nejsou žádné záznamy.</td>'));
  const noMetrics = buildStatisticsPrintHtml({ metrics: [], sections: [] }, metadata());
  assert.equal(noMetrics.includes('<div class="metrics">'), false);
});

test('print styles preserve repeated scoped column headers, page numbering, and visible tables', () => {
  const html = buildStatisticsPrintHtml(report(), metadata());
  assert.ok(html.includes('<th scope="col">Operační sál</th>'));
  assert.ok(html.includes('<th scope="col" class="numeric">Počet</th>'));
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  assert.ok(css);
  assert.match(css, /thead\s*\{[^}]*display:\s*table-header-group/);
  assert.match(css, /tr\s*\{[^}]*break-inside:\s*avoid/);
  assert.match(css, /td\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /td\s*\{[^}]*white-space:\s*pre-line/);
  assert.match(css, /@page\s*\{[^}]*size:\s*A4 portrait/);
  assert.match(css, /counter\(page\)[\s\S]*counter\(pages\)/);
  const printCss = css.slice(css.indexOf('@media print'));
  assert.match(printCss, /html, body\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible/);
  assert.match(printCss, /\.report-toolbar\s*\{[^}]*display:\s*none\s*!important/);
  assert.match(printCss, /article\s*\{[^}]*max-width:\s*none/);
  assert.doesNotMatch(printCss, /(?:table|tbody|\.report-section)\s*\{[^}]*display:\s*none/);
});

function popupFixture() {
  let resolveFonts;
  let rejectFonts;
  const ready = new Promise((resolve, reject) => { resolveFonts = resolve; rejectFonts = reject; });
  const frames = [];
  const listeners = new Map();
  const elements = new Map();
  const writes = [];
  const calls = [];
  const preview = {
    opener: { owner: true }, closed: false, printCount: 0, closeCount: 0,
    document: {
      fonts: { ready },
      open: () => calls.push('document.open'),
      write: html => { writes.push(html); calls.push('document.write'); },
      close: () => calls.push('document.close'),
      getElementById: id => {
        if (!elements.has(id)) elements.set(id, { textContent: '', addEventListener: (event, callback) => listeners.set(`${id}:${event}`, callback) });
        return elements.get(id);
      },
    },
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    print() { this.printCount += 1; },
    close() { this.closeCount += 1; this.closed = true; },
  };
  const windowStub = {
    open: (...args) => { assert.deepEqual(args, ['', '_blank']); calls.push('window.open'); return preview; },
    get document() { assert.fail('The source application document must remain untouched'); },
    print: () => assert.fail('Only the report window may print'),
  };
  const helper = loadHelper(windowStub);
  return { helper, preview, frames, listeners, elements, writes, calls, resolveFonts, rejectFonts };
}

test('blocked popups produce a Czech actionable error without accessing the app document', () => {
  const helper = loadHelper({
    open: () => null,
    get document() { assert.fail('The source document must not be modified'); },
  });
  assert.throws(() => helper.openStatisticsPrintReport(report(), metadata()), /Prohlížeč zablokoval náhled\. Povolte otevírání oken/);
});

test('successful popup writes the standalone report and prints after font readiness and layout frames', async () => {
  const fixture = popupFixture();
  fixture.helper.openStatisticsPrintReport(report('JEN AKTIVNÍ ZÁLOŽKA'), metadata('Finance'));
  assert.equal(fixture.preview.opener, null);
  assert.deepEqual(fixture.calls, ['window.open', 'document.open', 'document.write', 'document.close']);
  assert.equal(fixture.writes.length, 1);
  assert.ok(fixture.writes[0].includes('<h1>Finance</h1>'));
  assert.ok(fixture.writes[0].includes('JEN AKTIVNÍ ZÁLOŽKA'));
  assert.equal(fixture.preview.printCount, 0);
  assert.equal(fixture.frames.length, 0);
  fixture.resolveFonts();
  await Promise.resolve();
  assert.equal(fixture.frames.length, 1);
  fixture.frames.shift()();
  assert.equal(fixture.preview.printCount, 0);
  fixture.frames.shift()();
  assert.equal(fixture.preview.printCount, 1);
  assert.equal(fixture.preview.closed, false);
});

test('returning from a print dialog keeps the preview available for retry or explicit close', async () => {
  const fixture = popupFixture();
  fixture.helper.openStatisticsPrintReport(report(), metadata());
  fixture.resolveFonts();
  await Promise.resolve();
  while (fixture.frames.length) fixture.frames.shift()();
  // A returning native print() cannot distinguish printing from cancellation.
  // Neither outcome should auto-close the preview or require app cleanup.
  assert.equal(fixture.preview.printCount, 1);
  assert.equal(fixture.preview.closeCount, 0);
  fixture.listeners.get('report-print:click')();
  assert.equal(fixture.preview.printCount, 2);
  assert.equal(fixture.preview.closeCount, 0);
  fixture.listeners.get('report-close:click')();
  assert.equal(fixture.preview.closed, true);
  assert.equal(fixture.preview.closeCount, 1);
});

test('closing the preview at any deferred stage prevents a late automatic print', async () => {
  for (const stage of ['fonts', 'first-frame', 'second-frame']) {
    const fixture = popupFixture();
    fixture.helper.openStatisticsPrintReport(report(), metadata());
    if (stage === 'fonts') fixture.listeners.get('report-close:click')();
    fixture.resolveFonts();
    await Promise.resolve();
    if (stage === 'first-frame') fixture.listeners.get('report-close:click')();
    if (stage === 'second-frame') {
      fixture.frames.shift()();
      fixture.listeners.get('report-close:click')();
    }
    while (fixture.frames.length) fixture.frames.shift()();
    assert.equal(fixture.preview.printCount, 0, `A closed preview printed during ${stage}`);
    assert.equal(fixture.preview.closeCount, 1);
  }
});

test('font-readiness rejection still attempts the self-contained report without touching the app', async () => {
  const fixture = popupFixture();
  fixture.helper.openStatisticsPrintReport(report(), metadata());
  fixture.rejectFonts(new Error('Font readiness unavailable'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.preview.printCount, 1);
  assert.equal(fixture.frames.length, 0);
  assert.equal(fixture.preview.closed, false);
});

test('automatic print exceptions leave actionable help and a working manual retry', async () => {
  const fixture = popupFixture();
  fixture.preview.print = () => { throw new Error('Native print is temporarily unavailable'); };
  fixture.helper.openStatisticsPrintReport(report(), metadata());
  fixture.resolveFonts();
  await Promise.resolve();
  while (fixture.frames.length) assert.doesNotThrow(() => fixture.frames.shift()());
  assert.match(fixture.elements.get('report-help').textContent, /Automatický tisk není.*Použijte tlačítko Tisk \/ Uložit PDF/);
  assert.equal(fixture.preview.closed, false);
  fixture.preview.print = () => { fixture.preview.printCount += 1; };
  fixture.listeners.get('report-print:click')();
  assert.equal(fixture.preview.printCount, 1);
  assert.equal(fixture.preview.closeCount, 0);
});
