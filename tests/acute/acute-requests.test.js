import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Doménová logika akutních požadavků — čisté funkce, žádný React ani databáze.
// Test je spouští přeložené, takže jakákoli náhodná runtime závislost spadne.
const source = readFileSync(new URL('../../lib/acute-requests.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: 'acute-requests.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
new Function('require', 'exports', 'module', outputText)(name => {
  assert.fail(`Doménová logika nesmí nic importovat: ${name}`);
}, module.exports, module);

const {
  URGENCY_LEVELS, DEFAULT_URGENCY_WINDOWS, urgencyRank, urgencyLevel,
  clinicalOrder, operationalOrder, clinicalDrift, windowState, waitingMinutes,
  nextOrder, moveRequest, setUrgency, summarize, formatDuration,
  moveReasonLabel, isWaiting, isOpen,
} = module.exports;

const T0 = Date.parse('2026-10-07T08:00:00.000Z');
const at = minutes => new Date(T0 + minutes * 60_000).toISOString();

const request = (id, urgency, createdMinutes, order, extra = {}) => ({
  id, urgency, procedure: `výkon ${id}`, departmentId: 'chir',
  patientSurname: 'Novák', patientWard: '3B', estimatedMinutes: 60,
  createdAt: at(createdMinutes), state: 'zadan', order, ...extra,
});

test('stupně jsou tři, mají česká jména a rostoucí okna', () => {
  assert.deepEqual(URGENCY_LEVELS.map(level => level.id), ['neodkladny', 'urgentni', 'odkladny']);
  assert.deepEqual(URGENCY_LEVELS.map(level => level.label), ['Neodkladný', 'Urgentní', 'Odkladný']);
  // Pořadí stupňů musí odpovídat době, kterou výkon snese — jinak by řazení lhalo.
  const windows = URGENCY_LEVELS.map(level => level.defaultWindowMinutes);
  assert.deepEqual(windows, [...windows].sort((a, b) => a - b));
  assert.equal(urgencyRank('neodkladny'), 0);
  assert.ok(urgencyRank('neodkladny') < urgencyRank('urgentni'));
  assert.ok(urgencyRank('urgentni') < urgencyRank('odkladny'));
  // Každý stupeň vysvětluje, co znamená; bez toho se „urgentní" a „akutní" plete.
  for (const level of URGENCY_LEVELS) assert.ok(level.meaning.length > 20, level.id);
});

test('neznámý stupeň nespadne, ale ani se nevydává za neodkladný', () => {
  assert.equal(urgencyLevel('nesmysl').id, 'urgentni');
  assert.equal(urgencyRank('nesmysl'), URGENCY_LEVELS.length);
});

test('klinický sled řadí podle stupně, při shodě podle času zadání', () => {
  const queue = [
    request('c', 'odkladny', 0, 1),
    request('a', 'neodkladny', 30, 2),
    request('b2', 'urgentni', 20, 3),
    request('b1', 'urgentni', 10, 4),
  ];
  assert.deepEqual(clinicalOrder(queue).map(item => item.id), ['a', 'b1', 'b2', 'c']);
  // Provozní sled je nezávislý — drží se pole order.
  assert.deepEqual(operationalOrder(queue).map(item => item.id), ['c', 'a', 'b2', 'b1']);
});

test('posun pořadí přečísluje frontu a zapíše odkud, kam a proč', () => {
  const queue = [
    request('a', 'neodkladny', 0, 1),
    request('b', 'urgentni', 10, 2),
    request('c', 'urgentni', 20, 3),
  ];
  const moved = moveRequest(queue, 'c', 1, 'sal-obsazen', at(40));
  assert.deepEqual(operationalOrder(moved).map(item => item.id), ['c', 'a', 'b']);
  // Pořadí bez mezer, od jedničky.
  assert.deepEqual(operationalOrder(moved).map(item => item.order), [1, 2, 3]);

  const record = moved.find(item => item.id === 'c').move;
  assert.equal(record.fromPosition, 3, 'stopa drží pozici před posunem');
  assert.equal(record.toPosition, 1);
  assert.equal(record.reason, 'sal-obsazen');
  assert.equal(record.at, at(40));
  // Nepřesunuté položky stopu nedostanou — jinak by nebylo poznat, kdo se hýbal.
  assert.equal(moved.find(item => item.id === 'a').move, undefined);
  assert.equal(moved.find(item => item.id === 'b').move, undefined);
});

test('posun na vlastní pozici a na neznámé id frontu nemění', () => {
  const queue = [request('a', 'urgentni', 0, 1), request('b', 'urgentni', 10, 2)];
  assert.equal(moveRequest(queue, 'a', 1, 'jine'), queue);
  assert.equal(moveRequest(queue, 'neexistuje', 2, 'jine'), queue);
});

test('posun za hranice fronty se zarazí u krajní pozice', () => {
  const queue = [request('a', 'urgentni', 0, 1), request('b', 'urgentni', 10, 2), request('c', 'urgentni', 20, 3)];
  assert.deepEqual(operationalOrder(moveRequest(queue, 'a', 99, 'jine')).map(item => item.id), ['b', 'c', 'a']);
  assert.deepEqual(operationalOrder(moveRequest(queue, 'c', -5, 'jine')).map(item => item.id), ['c', 'a', 'b']);
});

test('odchylka od klinického sledu se pozná i bez zápisu o posunu', () => {
  // Urgentní výkon stojí za odkladným, aniž by ho někdo ručně posouval.
  const queue = [request('odkladny', 'odkladny', 0, 1), request('urgentni', 'urgentni', 10, 2)];
  assert.equal(clinicalDrift(queue, 'urgentni'), 1);
  assert.equal(clinicalDrift(queue, 'odkladny'), -1);
  assert.equal(clinicalDrift(queue, 'neexistuje'), 0);
});

test('okno do sálu má tři stavy a poslední čtvrtina hlásí, že se krátí', () => {
  const urgent = request('u', 'urgentni', 0, 1); // okno 360 minut
  assert.equal(windowState(urgent, DEFAULT_URGENCY_WINDOWS, T0).status, 'v-okne');
  assert.equal(windowState(urgent, DEFAULT_URGENCY_WINDOWS, T0 + 200 * 60_000).status, 'v-okne');
  assert.equal(windowState(urgent, DEFAULT_URGENCY_WINDOWS, T0 + 280 * 60_000).status, 'krati-se');
  const expired = windowState(urgent, DEFAULT_URGENCY_WINDOWS, T0 + 400 * 60_000);
  assert.equal(expired.status, 'vyprselo');
  assert.ok(expired.remainingMinutes < 0, 'přesah se hlásí negativním zbytkem');
  // Zařízení si okna nastavuje samo; kratší okno vyprší dřív.
  assert.equal(windowState(urgent, { ...DEFAULT_URGENCY_WINDOWS, urgentni: 60 }, T0 + 90 * 60_000).status, 'vyprselo');
});

test('čekání se nikdy nepočítá dozadu', () => {
  const item = request('a', 'urgentni', 60, 1);
  assert.equal(waitingMinutes(item, T0 + 90 * 60_000), 30);
  assert.equal(waitingMinutes(item, T0), 0, 'hodiny napřed nesmí dát negativní čekání');
});

test('souhrn počítá jen čekající a odděluje nulu od nedostupnosti', () => {
  const queue = [
    request('a', 'neodkladny', 0, 1),
    request('b', 'urgentni', 0, 2),
    request('c', 'urgentni', 0, 3, { state: 'prevzat' }),
    request('d', 'odkladny', 0, 4, { state: 'dokoncen' }),
  ];
  const summary = summarize(queue, DEFAULT_URGENCY_WINDOWS, T0 + 10 * 60_000);
  assert.equal(summary.waiting, 2, 'převzaté ani dokončené už na sál nečekají');
  assert.deepEqual(summary.byUrgency, { neodkladny: 1, urgentni: 1, odkladny: 0 });
  assert.equal(summary.overdue, 0);
  assert.equal(typeof summary.nextDeadlineMs, 'number');

  // Prázdná fronta nesmí předstírat termín.
  assert.equal(summarize([], DEFAULT_URGENCY_WINDOWS, T0).nextDeadlineMs, null);

  // Po vypršení neodkladného okna se požadavek počítá jako po termínu
  // a do nejbližšího termínu už nevstupuje.
  const late = summarize(queue, DEFAULT_URGENCY_WINDOWS, T0 + 60 * 60_000);
  assert.equal(late.overdue, 1);
});

test('pořadí nového požadavku navazuje za frontu', () => {
  assert.equal(nextOrder([]), 1);
  assert.equal(nextOrder([request('a', 'urgentni', 0, 4), request('b', 'urgentni', 0, 2)]), 5);
});

test('změna stupně je zaznamenaná jako klinické rozhodnutí', () => {
  const queue = [request('a', 'odkladny', 0, 1)];
  const changed = setUrgency(queue, 'a', 'neodkladny', at(5));
  assert.equal(changed[0].urgency, 'neodkladny');
  assert.equal(changed[0].move.reason, 'zmena-stupne');
  assert.equal(changed[0].move.at, at(5));
  // Pořadí se změnou stupně samo nepřeskládá — to je rozhodnutí člověka.
  assert.equal(changed[0].order, 1);
});

test('stavy se dělí na čekající a otevřené', () => {
  assert.equal(isWaiting(request('a', 'urgentni', 0, 1)), true);
  assert.equal(isWaiting(request('a', 'urgentni', 0, 1, { state: 'prevzat' })), false);
  for (const state of ['zadan', 'prevzat', 'probiha']) {
    assert.equal(isOpen(request('a', 'urgentni', 0, 1, { state })), true, state);
  }
  for (const state of ['dokoncen', 'zrusen', 'presunut']) {
    assert.equal(isOpen(request('a', 'urgentni', 0, 1, { state })), false, state);
  }
});

test('trvání se formátuje česky a bez záporných hodnot', () => {
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(60), '1 h');
  assert.equal(formatDuration(95), '1 h 35 min');
  assert.equal(formatDuration(1440), '24 h');
  assert.equal(formatDuration(-30), '30 min', 'přesah se formátuje jako velikost, znaménko řeší rozhraní');
});

test('důvod posunu má vždy čitelný popis', () => {
  assert.equal(moveReasonLabel('sal-obsazen'), 'Sál obsazen');
  assert.equal(moveReasonLabel(undefined), 'Neuvedeno');
  assert.equal(moveReasonLabel('neznamy'), 'Neuvedeno');
});
