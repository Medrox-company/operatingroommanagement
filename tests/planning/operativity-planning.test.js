import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../../lib/operativity-planning.ts', import.meta.url), 'utf8');
const specialty = readFileSync(new URL('../../lib/room-specialty.ts', import.meta.url), 'utf8');
function moduleOf(text, require = () => { throw new Error('Unexpected import'); }) {
  const module = { exports: {} };
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('module', 'exports', 'require', js)(module, module.exports, require);
  return module.exports;
}
const { buildOperativityPlanningSeed: build, mergeOperativityPlanningDraft: merge } = moduleOf(source, path => {
  assert.equal(path, './room-specialty');
  return moduleOf(specialty);
});
const clone = data => JSON.parse(JSON.stringify(data));
const room = (id, extra = {}) => ({ id, name: `Sál ${id}`, department: 'Hlavní sály', ...extra });
const department = (id, color = '#A100D2') => ({ id, name: `Obor ${id}`, accent_color: color });
const allocation = (part, extra = {}) => ({ operating_room_id: 'r1', department_id: 's1', allocation_date: '2026-10-26', day_part: part, allocation_kind: 'SPECIALTY', ...extra });
const snapshot = (extra = {}) => ({ hospitalId: 'hospital-1', hospitalName: 'Nemocnice', year: 2026, rooms: [room('r1')], departments: [department('s1')], allocations: [], ...extra });

test('snapshot uses actual hospital rooms/specialty colors and omits clinical records and demonstration programs', () => {
  const input = snapshot({ rooms: [room('r1', { currentPatient: { name: 'Private patient' }, staff: { doctor: { name: 'Doctor secret' } }, isEmergency: true, noticeMessage: 'private message' })] });
  const { data, sites, years, warnings } = build(input);
  assert.deepEqual(sites, [{ id: 'hospital-1', name: 'Nemocnice', sub: 'Operační sály' }]);
  assert.deepEqual(years, [2026, 2027]);
  assert.equal(data.rooms.length, 1);
  assert.equal(data.rooms[0].id, 'r1');
  assert.equal(data.rooms[0].name, 'Sál r1');
  assert.equal(data.specs[0].c, '#A100D2');
  assert.equal(data.groups[0].name, 'Hlavní sály');
  assert.deepEqual(data.template, {});
  assert.deepEqual(data.requests, []);
  assert.deepEqual(data.wait, {});
  assert.equal(data.flags.wait, true);
  assert.equal(data.flags.reqStatus, true);
  assert.equal(data.flags.cosgyn, true);
  assert.equal(data.staff.cap['hospital-1'].doc, 0);
  assert.equal(data.staff.norm.CA.doc, 0);
  assert.match(warnings.join(' '), /pouze předpoklad/);
  assert.match(warnings.join(' '), /nevyplněné údaje/);
  assert.doesNotMatch(JSON.stringify(data), /Private patient|Doctor secret|private message|currentPatient|isEmergency/);
});

test('v33 multi-building layouts and transport settings survive a local draft round trip', () => {
  const { data } = build(snapshot());
  const draft = clone(data);
  draft.map['hospital-1'] = { W:48,H:28,floors:[{lv:0,name:'Přízemí'}],items:[],pos:{x:30,y:40},
    blds:[{id:'b1',name:'Vlastní budova',pos:{x:100,y:40},W:20,H:15,floors:[{lv:0,name:'Přízemí'}],items:[]}],
    heli:[{id:'h1',name:'Modelový heliport',pos:{x:10,y:10},sz:12,alt:16}],
    amb:[{id:'a1',a:'main',b:'b1',pts:[[30,40],[100,40]]}],
    links:[{id:'l1',a:{p:'h1'},b:{p:'main',lv:0}}] };
  draft.mapCfg = {...draft.mapCfg,amb:20,ambLoad:300,heliLand:180};
  draft.flags = {};
  const result = merge(data, draft);
  assert.deepEqual(result.map, draft.map);
  assert.deepEqual(result.mapCfg, draft.mapCfg);
  assert.deepEqual(result.rooms, data.rooms);
  assert.equal(result.flags.cosgyn, true);
});

test('specialties remain exact even when names repeat; invalid colors get the existing application palette', () => {
  const { data } = build(snapshot({ departments: [department('s1'), { ...department('s2', 'url(https://example.test)'), name: 'Obor s1' }, department('s1', '#000000')] }));
  assert.equal(data.specs.length, 2);
  assert.equal(data.specs[0].c, '#A100D2');
  assert.equal(data.specs[1].c, '#2563EB');
});

test('one-sided AM/PM allocations never expand into a full day, and closure/service restrictions retain their half', () => {
  const { data } = build(snapshot({ allocations: [
    allocation('AM'),
    allocation('PM', { department_id: null, allocation_kind: 'SERVICE' }),
    allocation('AM', { allocation_date: '2026-10-27', department_id: null, allocation_kind: 'CLOSED' }),
    allocation('PM', { allocation_date: '2026-10-27', department_id: null, allocation_kind: 'CLOSED' }),
    allocation('PM', { allocation_date: '2026-10-28' }),
  ] }));
  assert.deepEqual(data.overrides['r1|2026-10-26'], { split: true, a: { s: 's1', an: 'CA' }, b: null });
  assert.equal(data.blocks[0].part, 'pm');
  assert.equal(data.blocks[0].type, 'Servis / údržba');
  assert.equal(data.blocks[1].part, 'full');
  assert.deepEqual(data.blocks[1].roomIds, ['r1']);
  assert.equal(data.overrides['r1|2026-10-27'], null);
  assert.deepEqual(data.overrides['r1|2026-10-28'], { split: true, a: null, b: { s: 's1', an: 'CA' } });
});

test('invalid dates, stale room/department references and allocations beyond two loaded years are ignored', () => {
  const { data, warnings } = build(snapshot({ departments: [department('s1'), department('s2')], allocations: [
    allocation('AM', { allocation_date: '2026-02-30' }),
    allocation('AM', { operating_room_id: 'foreign-room' }),
    allocation('AM', { department_id: 'foreign-spec' }),
    allocation('AM', { allocation_date: '2028-01-01' }),
    allocation('AM', { updated_at: '2026-01-02T00:00:00Z', department_id: 's2' }),
    allocation('AM', { updated_at: '2026-01-01T00:00:00Z' }),
  ] }));
  assert.equal(Object.keys(data.overrides).length, 1);
  assert.equal(data.overrides['r1|2026-10-26'].a.s, 's2');
  assert.match(warnings.join(' '), /4 přiřazení/);
});

test('actual weekly working hours expand only through two years including leap days, with disabled days marked closed', () => {
  const weeklySchedule = Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => [day, { enabled: day === 'monday', startHour: 8, startMinute: 15, endHour: 14, endMinute: 45 }]));
  const { data } = build(snapshot({ year: 2028, rooms: [room('r1', { weeklySchedule })] }));
  assert.deepEqual(data.dayHours['r1|2028-01-03'], { from: '08:15', split: '12:00', to: '14:45' });
  assert.equal(data._medrox.closedDays['r1|2028-02-29'], true);
  assert.equal(Object.keys(data.dayHours).length + Object.keys(data._medrox.closedDays).length, 731);
  assert.equal(data.dayHours['r1|2030-01-01'], undefined);
  assert.equal(data._medrox.closedDays['r1|2030-01-01'], undefined);
  assert.throws(() => build(snapshot({ year: 2100 })), /rok/);
  assert.throws(() => build(snapshot({ hospitalId: '../other' })), /zařízení/);
});

test('drafts are scoped to their hospital; invalid envelopes and circular/oversized input return an independent seed copy', () => {
  const { data } = build(snapshot());
  const wrongHospital = clone(data); wrongHospital._medrox.hospitalId = 'other'; wrongHospital.rooms[0].name = 'Other';
  const circular = {}; circular.self = circular;
  for (const invalid of [wrongHospital, null, [], { v: 2 }, circular, { ...data, notes: { huge: 'x'.repeat(8_000_001) } }]) {
    const result = merge(data, invalid);
    assert.deepEqual(result, data);
    assert.notEqual(result, data);
    assert.notEqual(result.rooms[0], data.rooms[0]);
  }
});

test('draft planning edits survive refresh while host room names, specialties, status colors and references remain authoritative', () => {
  const { data } = build(snapshot({ allocations: [allocation('AM')] }));
  const draft = clone(data);
  draft.rooms[0] = { ...draft.rooms[0], name: 'Forged master name', site: 'other', isEmergency: true, currentPatient: { name: 'Private' }, hours: { from: '08:00', split: '12:00', to: '17:00' }, group: 'draft-group' };
  draft.rooms.push(room('foreign-room'));
  draft.specs[0] = { id: 's1', name: 'Forged specialty', c: '#000000' };
  draft.groups.push({ id: 'draft-group', name: 'Návrhová skupina', site: 'other' });
  draft.overrides['r1|2026-10-26'] = { split: true, a: null, b: { s: 's1', an: 'LA' } };
  draft.overrides['foreign-room|2026-10-26'] = { split: false, a: { s: 's1', an: 'CA' } };
  draft.overrides['r1|2026-10-27'] = { split: true, a: { s: 'foreign-spec', an: 'CA' }, b: null };
  draft.notes['r1|2026-10-26'] = 'Pouze lokální poznámka';
  draft.requests.push({ id: 'req1', specId: 's1', from: '2026-11-01', to: '2026-11-02', site: 'other', status: 'pending' });
  draft.claims.push({ id: 'claim1', specId: 's1', roomId: 'foreign-room', d: '2026-10-26' });
  draft.staff.cap['hospital-1'].doc = 12;
  draft.staff.cap.other = { doc: 100 };
  draft.wait.s1 = { n: 5, min: 40, inflow: 1 };
  draft.map['hospital-1'] = { items: [] };
  const result = merge(data, draft);
  assert.equal(result.rooms.length, 1);
  assert.equal(result.rooms[0].name, 'Sál r1');
  assert.equal(result.rooms[0].site, 'hospital-1');
  assert.equal(result.rooms[0].group, 'draft-group');
  assert.equal(result.groups.find(group => group.id === 'draft-group').site, 'hospital-1');
  assert.deepEqual(result.rooms[0].hours, { from: '08:00', split: '12:00', to: '17:00' });
  assert.equal(result.rooms[0].isEmergency, undefined);
  assert.equal(result.rooms[0].currentPatient, undefined);
  assert.equal(result.specs[0].name, 'Obor s1');
  assert.equal(result.specs[0].c, '#A100D2');
  assert.equal(result.overrides['r1|2026-10-26'].b.an, 'LA');
  assert.equal(result.overrides['foreign-room|2026-10-26'], undefined);
  assert.equal(result.overrides['r1|2026-10-27'].a, null);
  assert.equal(result.notes['r1|2026-10-26'], 'Pouze lokální poznámka');
  assert.equal(result.requests[0].site, 'hospital-1');
  assert.equal(result.claims.length, 0);
  assert.equal(result.staff.cap['hospital-1'].doc, 12);
  assert.equal(result.staff.cap.other, undefined);
  assert.deepEqual(result.wait.s1, { n: 5, min: 40, inflow: 1 });
  assert.deepEqual(data.staff.cap['hospital-1'].doc, 0);
});

test('prototype keys and clinical data cannot be retained in nested draft objects', () => {
  const { data } = build(snapshot());
  const draft = JSON.parse(JSON.stringify(data));
  draft.map = JSON.parse('{"hospital-1":{"__proto__":{"polluted":true},"items":[],"currentPatient":{"name":"Private"},"access_token":"secret"}}');
  const result = merge(data, draft);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(result.map['hospital-1'], '__proto__'), false);
  assert.equal(result.map['hospital-1'].currentPatient, undefined);
  assert.equal(result.map['hospital-1'].access_token, undefined);
});

test('v28 replacement links and deferred proposals survive reload within the same hospital and period', () => {
  const { data } = build(snapshot({ rooms: [room('r1'), room('r2')], departments: [department('s1'), department('s2')] }));
  const draft = clone(data);
  draft.links = {
    'r2|2026-10-26|1': { src: 'blk', id: 'block-1', from: 'r1', s: 's1', od: '2026-10-26', oi: 0, ts: 123, currentPatient: { name: 'Private' } },
    // Keep a valid orphan so the planner can offer its explicit consistency check.
    'r1|2027-01-05|0': { src: 'req', id: 'removed-request', from: 'r1', s: 's2', s0: 's1', ts: 456 },
    'r1|2026-10-26|2': { src: 'req', id: 'req-1', from: 'r1', s: 's1' },
    'foreign|2026-10-26|0': { src: 'req', id: 'req-1', from: 'r1', s: 's1' },
    'r1|2028-10-26|0': { src: 'req', id: 'req-1', from: 'r1', s: 's1' },
    'r1|2026-10-27|0': { src: 'req', id: 'req-1', from: 'foreign', s: 's1' },
    'r1|2026-10-27|1': { src: 'req', id: 'req-1', from: 'r1', s: 'foreign' },
  };
  draft.planSkip = { 'b|r1|2026-10-26|0': 1, 'r|r2|2027-01-05|1': 1, 'b|foreign|2026-10-26|0': 1, 'x|r1|2026-10-26|0': 1, 'b|r1|2028-10-26|0': 1, 'r|r1|2026-10-26|1': '1' };
  const result = merge(data, draft);
  assert.deepEqual(result.links, {
    'r2|2026-10-26|1': { src: 'blk', id: 'block-1', from: 'r1', s: 's1', od: '2026-10-26', oi: 0, ts: 123 },
    'r1|2027-01-05|0': { src: 'req', id: 'removed-request', from: 'r1', s: 's2', s0: 's1', ts: 456 },
  });
  assert.deepEqual(result.planSkip, { 'b|r1|2026-10-26|0': 1, 'r|r2|2027-01-05|1': 1 });
  assert.deepEqual(merge(data, result), result, 'a second canonicalization cannot lose valid planning metadata');
  const legacy = clone(draft);
  delete legacy.links;
  delete legacy.planSkip;
  legacy.notes['r1|2026-10-26'] = 'Starší místní návrh';
  const restored = merge(data, legacy);
  assert.deepEqual(restored.links, {});
  assert.deepEqual(restored.planSkip, {});
  assert.equal(restored.notes['r1|2026-10-26'], 'Starší místní návrh');
});

test('v28 scoped specialty requests retain only actual room references and bounded room counts', () => {
  const { data } = build(snapshot({ rooms: [room('r1'), room('r2')] }));
  const draft = clone(data);
  const request = { id: 'req-1', specId: 's1', from: '2026-10-26', to: '2026-10-27', part: 'full', status: 'ok' };
  draft.requests = [
    { ...request, scope: 'rooms', rooms: ['r2', 'foreign', 'r2'], site: 'foreign' },
    { ...request, id: 'req-2', scope: 'cnt', cnt: 9000 },
    { ...request, id: 'req-3', scope: 'unknown', cnt: -5 },
    request,
    { ...request, id: 'req-4', scope: 'rooms', rooms: { invalid: true } },
  ];
  const result = merge(data, draft);
  assert.deepEqual(result.requests[0].rooms, ['r2']);
  assert.equal(result.requests[0].site, 'hospital-1');
  assert.equal(result.requests[1].cnt, 2);
  assert.equal(result.requests[2].scope, 'all');
  assert.equal(result.requests[2].cnt, 1);
  assert.equal(result.requests[3].scope, undefined, 'legacy all-specialty request semantics are unchanged');
  assert.deepEqual(result.requests[4].rooms, [], 'invalid imported selectors cannot crash the room picker');
});
