import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const holidays = { exports: {} };
new Function('exports', compile('../../lib/czech-public-holidays.ts'))(holidays.exports);
const printer = { exports: {} };
new Function('exports', 'require', compile('../../lib/room-schedule-print.ts'))(printer.exports, name => {
  if (name === './statistics-print') return { OPERATINGROOM_REPORT_LOGO: 'data:image/png;base64,AAAA' };
  if (name === './czech-public-holidays') return holidays.exports;
  throw new Error(`Unexpected dependency ${name}`);
});
const { buildRoomSchedulePrintHtml, ROOM_SCHEDULE_PRINT_SYSTEM_CODES } = printer.exports;

const rooms = [
  { id: 'r1', name: 'Sál 1', department: 'Centrální sály' },
  { id: 'r2', name: 'Sál 2 <b>', department: null },
  { id: 'r3', name: 'Sál 3', department: 'Ortopedie' },
];
const CHIR = { code: 'CHIR', name: 'Chirurgie', color: '#06B6D4' };
const ORT = { code: 'ORT', name: 'Ortopedie & traumatologie', color: '#7C3AED' };

function source(overrides = {}) {
  const calls = [];
  return {
    calls,
    input: {
      hospitalName: 'Krajská nemocnice Liberec',
      view: 'week', scope: 'all', anchor: new Date(2026, 9, 21, 12), loadedYear: 2026,
      rooms, selectedRoomId: 'r1', generatedAt: new Date(2026, 9, 24, 9, 5),
      slot: (roomId, date, part) => {
        calls.push(`${roomId}|${date}|${part}`);
        if (roomId === 'r1' && part === 'AM') return CHIR;
        if (roomId === 'r3' && date === '2026-10-22') return ORT;
        if (roomId === 'r2' && date === '2026-10-23' && part === 'PM') return { code: ROOM_SCHEDULE_PRINT_SYSTEM_CODES.CLOSED, name: 'Sál uzavřen', color: '#64748B' };
        return null;
      },
      ...overrides,
    },
  };
}

test('týden: všechny sály, sedm dnů, oba bloky s kódem i názvem a skutečný souhrn', () => {
  const { input, calls } = source();
  const html = buildRoomSchedulePrintHtml(input);
  assert.match(html, /@page \{ size: A4 landscape/);
  assert.match(html, /<title>Rozpis sálů – 19\. října 2026 – 25\. října 2026<\/title>/);
  assert.equal((html.match(/<th scope="row" class="room">/g) ?? []).length, 3);
  // Sál 3 má 22. 10. ortopedii dopoledne i odpoledne: tiskne se jako jeden celodenní blok.
  assert.equal((html.match(/<div class="slot/g) ?? []).length, 3 * 7 * 2 - 1);
  assert.equal((html.match(/<span class="part">CELÝ DEN<\/span><b>ORT<\/b>/g) ?? []).length, 1);
  assert.equal(calls.length, 3 * 7 * 2);
  assert.ok(html.includes('Krajská nemocnice Liberec'));
  assert.ok(html.includes('<b>CHIR</b><small>Chirurgie</small>'));
  assert.ok(html.includes('Ortopedie &amp; traumatologie'));
  assert.ok(html.includes('Sál 2 &lt;b&gt;'), 'název sálu se escapuje');
  // 7 dopolední bloky sálu 1, 2 bloky ORT, 1 uzavřený blok.
  assert.match(html, /<dd>10 z 42 půldenních bloků \(24 %\)<\/dd>/);
  assert.match(html, /<span>Chirurgie<\/span><b>7×<\/b>/);
  assert.match(html, /<span>Sál uzavřen<\/span><b>1×<\/b>/);
  assert.ok(html.indexOf('Chirurgie</span><b>7×') < html.indexOf('Ortopedie &amp; traumatologie</span><b>2×'), 'legenda je seřazená podle počtu');
  assert.doesNotMatch(html, /nenačteno|Mimo načtený rok/);
});

test('svátek se vyznačí v hlavičce dne i v legendě', () => {
  const { input } = source({ anchor: new Date(2026, 9, 28, 12) });
  const html = buildRoomSchedulePrintHtml(input);
  assert.match(html, /<th scope="col" class="holiday"><span>ST<\/span><strong>28\. 10\.<\/strong><em>Den vzniku samostatného československého státu<\/em>/);
  assert.ok(html.includes('Svátek · den pracovního klidu'));
});

test('týden přes přelom roku nevydává nenačtené dny za volné bloky', () => {
  const { input, calls } = source({ anchor: new Date(2026, 11, 31, 12) });
  const html = buildRoomSchedulePrintHtml(input);
  assert.equal(calls.filter(call => call.includes('|2027-')).length, 0, 'data jiného roku se nečtou');
  assert.equal((html.match(/class="slot slot--na slot--full"/g) ?? []).length, 3 * 3, 'nenačtený den je jeden celodenní blok');
  assert.ok(html.includes('Mimo načtený rok 2026'));
  assert.match(html, /z 24 půldenních bloků/);
});

test('měsíc pro všechny sály: řádky sály, sloupce všechny dny měsíce', () => {
  const { input } = source({ view: 'month' });
  const html = buildRoomSchedulePrintHtml(input);
  assert.match(html, /class="matrix matrix--month"/);
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((body.match(/<tr>/g) ?? []).length, 3);
  assert.equal((body.match(/<td/g) ?? []).length, 3 * 31);
  assert.equal((body.match(/class="mini/g) ?? []).length, 3 * 31 * 2);
  assert.match(html, /Rozpis sálů <span>Měsíc · říjen 2026<\/span>/);
  assert.match(html, /<dd>Všechny sály \(3\)<\/dd>/);
});

test('měsíc pro jeden sál: kalendář od pondělí jen pro vybraný sál', () => {
  const { input, calls } = source({ view: 'month', scope: 'selected', selectedRoomId: 'r3' });
  const html = buildRoomSchedulePrintHtml(input);
  assert.match(html, /class="calendar"/);
  assert.ok(calls.every(call => call.startsWith('r3|')));
  // Říjen 2026 začíná čtvrtkem: tři prázdná pole před 1. říjnem.
  const firstWeek = html.match(/<tbody><tr>([\s\S]*?)<\/tr>/)[1];
  assert.equal((firstWeek.match(/class="void"/g) ?? []).length, 3);
  assert.match(html, /<dd>Sál 3<\/dd>/);
});

test('rok: dvanáct měsíců, neexistující dny šedě, při všech sálech každý sál na nové stránce', () => {
  const single = buildRoomSchedulePrintHtml(source({ view: 'year', scope: 'selected' }).input);
  const body = single.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((body.match(/<tr>/g) ?? []).length, 12);
  assert.equal((body.match(/class="void"/g) ?? []).length, 12 * 31 - 365);
  assert.match(single, /<dd>\d+ z 730 půldenních bloků/);
  const all = buildRoomSchedulePrintHtml(source({ view: 'year', scope: 'all' }).input);
  assert.equal((all.match(/class="matrix matrix--year"/g) ?? []).length, 3);
  assert.equal((all.match(/class="sheet page-break"/g) ?? []).length, 2);
});

test('do tisku se nedostane skript, externí zdroj ani podvržená barva', () => {
  const { input } = source({
    hospitalName: '<script>alert(1)</script>',
    slot: () => ({ code: '"><img src=x onerror=alert(1)>', name: 'X', color: 'red;background:url(https://evil.example/x)' }),
  });
  const html = buildRoomSchedulePrintHtml(input);
  assert.doesNotMatch(html, /<script|<img src=x|url\(|https?:\/\//);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('#94A3B8'), 'neplatná barva se nahradí výchozí');
  for (const banned of ['Náhled v Claude', 'rozpis-operativy.html', 'V ostré verzi aplikace', 'fonts.googleapis.com']) {
    assert.ok(!html.includes(banned), banned);
  }
});

test('prázdné období to řekne, místo aby tisklo nuly jako data', () => {
  const html = buildRoomSchedulePrintHtml(source({ slot: () => null }).input);
  assert.ok(html.includes('V tištěném období není přiřazen žádný blok.'));
  assert.throws(() => buildRoomSchedulePrintHtml(source({ rooms: [] }).input), /žádný operační sál/);
});

test('Společný rozpis sálů tiskne uložená data a načítá celý rok po stránkách', () => {
  const component = readFileSync(new URL('../../components/RoomSpecialtyScheduleManager.tsx', import.meta.url), 'utf8');
  assert.match(component, /loadOperativityPlanningYear\(year, controller\.signal\)/);
  assert.doesNotMatch(component, /fetch\(`\/api\/room-specialty-allocations\?year=/, 'jediný požadavek by vrátil jen prvních 1000 bloků');
  // Každé načtení zruší předchozí, takže pozdní stránky starého roku nepřepíší nový.
  const loadYear = component.match(/const loadYear = useCallback\(async \(\) => \{([\s\S]*?)\n  \}, \[activeHospitalId, year\]\);/)?.[1];
  assert.ok(loadYear, 'loadYear nenalezen');
  assert.ok(loadYear.indexOf('loadControllerRef.current?.abort()') < loadYear.indexOf('loadOperativityPlanningYear('));
  assert.match(loadYear, /if \(controller\.signal\.aborted\) return;\s*setMigrationRequired\(false\)/);
  assert.match(loadYear, /catch \(loadError\) \{\s*if \(controller\.signal\.aborted\) return;[\s\S]*?setLoadedYear\(null\)/);
  assert.match(component, /return \(\) => loadControllerRef\.current\?\.abort\(\);/);
  assert.match(component, /const printSlot = [\s\S]*?allocationMap\.get\(/, 'tisk nečte náhled rozpracovaného tažení');
  // Tiskne se jen úspěšně načtený rok; aktivní obory nejsou podmínkou.
  assert.match(component, /const canPrint = !loading && !saving && loadedYear === year && rooms\.length > 0;/);
  assert.match(component, /openOperativityPrintWindow\(html\)/);
  assert.match(component, /printOperativityDocumentInFrame\(html\)/);
  assert.match(component, />\s*Tisk \/ PDF\s*</);
  const client = readFileSync(new URL('../../lib/operativity-planning-client.ts', import.meta.url), 'utf8');
  assert.match(client, /migrationRequired: payload\?\.migrationRequired === true/);
});
