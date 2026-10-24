import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/liberec-campus-directory.ts', import.meta.url), 'utf8');
const directory = {};
new Function('exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(directory);
const { CAMPUS_DIRECTORY, CAMPUS_DIRECTORY_SOURCE, CAMPUS_DIRECTORY_ALIASES, getCampusDirectoryEntry } = directory;

// Each count corresponds to an h3/department-list pair in the public building modal,
// in source order. Empty source floors deliberately stay present.
const publishedDepartmentCounts = {
  A: [25, 3, 1, 4, 2, 1],
  B: [3, 3, 4, 9, 12, 5, 5, 27, 6, 33, 3],
  C: [1, 1, 2, 1], D: [13, 1, 1, 6, 9], E: [2, 1, 1], F: [2, 1],
  N: [2], G: [16, 1, 1, 2, 3], I: [3, 1, 1], J: [1, 2, 5, 1],
  K: [1, 10, 3, 2], L: [2], O: [3, 2], P: [5, 4], Q: [3, 3, 6, 9, 1, 1],
  R: [1, 2, 1], S: [2], T: [2, 8, 3], U: [6, 5], V: [1, 0, 2],
  HELIPORT: [1, 1, 1], UA: [1, 0, 1, 1], UB: [1, 0, 2, 1],
};

test('complete public directory snapshot retains all 25 details and every published floor entry', () => {
  assert.equal(CAMPUS_DIRECTORY.length, 25);
  assert.equal(new Set(CAMPUS_DIRECTORY.map(entry => entry.id)).size, 25);
  assert.deepEqual(CAMPUS_DIRECTORY.filter(entry => entry.floors).map(entry => entry.id), Object.keys(publishedDepartmentCounts));
  for (const [id, counts] of Object.entries(publishedDepartmentCounts)) {
    assert.deepEqual(getCampusDirectoryEntry(id).floors.map(floor => floor.departments.length), counts, id);
  }
  const floors = CAMPUS_DIRECTORY.flatMap(entry => entry.floors ?? []);
  assert.equal(floors.length, 82);
  assert.equal(floors.reduce((sum, floor) => sum + floor.departments.length, 0), 325);
  assert.equal(CAMPUS_DIRECTORY.flatMap(entry => entry.information ?? []).length, 2);
});

test('directory identifies source date and does not claim live operational or physical inventory data', () => {
  assert.equal(CAMPUS_DIRECTORY_SOURCE.url, 'https://www.nemlib.cz/mapa/');
  assert.equal(CAMPUS_DIRECTORY_SOURCE.interactionScriptUrl, 'https://www.nemlib.cz/assets/themes/nemlib/js/map.js?ver=5');
  assert.equal(CAMPUS_DIRECTORY_SOURCE.retrievedAt, '2026-10-24');
  assert.match(CAMPUS_DIRECTORY_SOURCE.limitations, /Statický snímek veřejného adresáře/);
  assert.match(CAMPUS_DIRECTORY_SOURCE.limitations, /neuvádí počty nebo skutečné rozmístění lůžek a operačních sálů/);
  assert.match(CAMPUS_DIRECTORY_SOURCE.modeledScope, /21 budov.*76.*319/);
  for (const entry of CAMPUS_DIRECTORY) {
    assert.equal(entry.sourceUrl, `https://www.nemlib.cz/mapa/#b-${entry.id.toLowerCase()}`);
    assert.equal(Boolean(entry.floors), !Boolean(entry.information));
    assert.ok(Object.keys(entry).every(key => ['id', 'name', 'sourceUrl', 'floors', 'information'].includes(key)));
  }
  assert.doesNotMatch(source, /\b(?:fetch|localStorage|supabase|patientId|staffId|roomId|bedCount|roomCount)\b/);
});

test('PD follows the official parking alias without inventing parking floors', () => {
  assert.deepEqual(CAMPUS_DIRECTORY_ALIASES, { PD: 'PARKING' });
  const entry = getCampusDirectoryEntry('pd');
  assert.equal(entry.id, 'PARKING');
  assert.equal(entry.floors, undefined);
  assert.deepEqual(entry.information, [{
    label: 'Informace o parkování',
    title: 'Parkovací plochy',
    url: 'https://www.nemlib.cz/mapa/parkovaci-plochy/',
  }]);
  assert.equal(getCampusDirectoryEntry('UZAVERA').floors, undefined);
  assert.equal(getCampusDirectoryEntry('UNKNOWN'), undefined);
});

test('empty public floors stay empty, repeated names and original languages are not silently discarded', () => {
  const at = (id, label) => getCampusDirectoryEntry(id).floors.find(floor => floor.label === label).departments;
  assert.deepEqual(at('UA', '2. patro'), []);
  assert.deepEqual(at('UB', '2. patro'), []);
  assert.deepEqual(at('V', '1. podlaží'), []);
  assert.equal(at('A', 'Přízemí').filter(name => name === 'Poradna pro léčbu chronické rány').length, 2);
  assert.equal(at('G', 'Přízemí').filter(name => name === 'Onkogynekologická poradna').length, 2);
  assert.equal(at('B', '7. podlaží').filter(name => name === 'Denní stacionář neurologie').length, 2);
  assert.ok(at('B', '7. podlaží').includes('Neurophysiology Lab (SSEP, MEP, BAEP)'));
  assert.ok(at('Q', '6. podlaží').includes('Konferenční místnosti, Oddělení řízení lidských zdrojů (OŘLZ)'));
});

test('department names are plain text rather than executable source HTML', () => {
  for (const entry of CAMPUS_DIRECTORY) {
    assert.ok(entry.name.trim().length > 0);
    for (const floor of entry.floors ?? []) {
      assert.deepEqual(Object.keys(floor).sort(), ['departments', 'label']);
      assert.ok(floor.label.trim().length > 0);
      for (const name of floor.departments) {
        assert.equal(typeof name, 'string');
        assert.equal(name, name.trim());
        assert.ok(name.length > 0);
        assert.doesNotMatch(name, /<[^>]+>|&(?:nbsp|amp|quot|#\d+);/);
      }
    }
  }
  assert.ok(getCampusDirectoryEntry('U').floors[1].departments.includes('Manažer komunikace, Amelie'));
  assert.equal(getCampusDirectoryEntry('UA').floors[0].departments[0], 'Mateřská škola KNofLík');
});
